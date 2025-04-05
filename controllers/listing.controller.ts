import { Request, Response } from "express";
import { ListingStatus, ListingAction, Prisma, NotificationType } from "@prisma/client";
import prisma from "../lib/prismaClient.js";
import { uploadToR2, deleteFromR2 } from "../config/cloudflareR2.js";
import fs from "fs";
import { AuthRequest } from "../middleware/auth.middleware";
import { createNotification } from '../utils/notification.utils';
import { NotificationType } from '../types/enums';

interface ListingResponse {
  id: string;
  title: string;
  description: string;
  price: number;
  mainCategory: string;
  subCategory: string;
  location: string;
  condition?: string;
  status: string;
  listingAction?: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  user: {
    id: string;
    username: string;
    profilePicture?: string;
  };
  images: Array<{
    id: string;
    url: string;
    order: number;
    listingId: string;
  }>;
  vehicleDetails?: {
    id: string;
    vehicleType: string;
    make: string;
    model: string;
    year: string;
    mileage?: string;
    fuelType?: string;
    transmissionType?: string;
    color?: string;
    condition?: string;
    listingId: string;
  } | null;
  realEstateDetails?: {
    id: string;
    propertyType: string;
    size?: string;
    yearBuilt?: string;
    bedrooms?: string;
    bathrooms?: string;
    condition?: string;
    listingId: string;
  } | null;
  favorites: Array<{
    id: string;
    createdAt: Date;
    userId: string;
    listingId: string;
  }>;
  attributes: Array<{
    id: string;
    name: string;
    value: string;
    listingId: string;
  }>;
  features: Array<{
    id: string;
    name: string;
    listingId: string;
  }>;
}

type ListingCreateInput = Prisma.ListingUncheckedCreateInput;
type NotificationCreateInput = Prisma.NotificationUncheckedCreateInput;

type ListingWithRelations = Prisma.ListingGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        username: true;
        profilePicture: true;
      };
    };
    images: true;
    vehicleDetails: true;
    realEstateDetails: true;
    favorites: true;
    attributes: true;
    features: true;
  };
}>;

const formatListingResponse = (listing: ListingWithRelations): ListingResponse => {
  if (!listing) {
    throw new Error('Cannot format null listing');
  }

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description || "",
    price: listing.price,
    mainCategory: listing.mainCategory,
    subCategory: listing.subCategory,
    location: listing.location,
    condition: listing.condition || undefined,
    status: listing.status,
    listingAction: listing.listingAction || undefined,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    userId: listing.userId,
    user: {
      id: listing.user.id,
      username: listing.user.username,
      profilePicture: listing.user.profilePicture || undefined,
    },
    images: listing.images.map(img => ({
      id: img.id,
      url: img.url,
      order: img.order,
      listingId: img.listingId,
    })),
    vehicleDetails: listing.vehicleDetails ? {
      ...listing.vehicleDetails,
      mileage: listing.vehicleDetails.mileage || undefined,
      fuelType: listing.vehicleDetails.fuelType || undefined,
      transmissionType: listing.vehicleDetails.transmissionType || undefined,
      color: listing.vehicleDetails.color || undefined,
      condition: listing.vehicleDetails.condition || undefined,
    } : null,
    realEstateDetails: listing.realEstateDetails ? {
      ...listing.realEstateDetails,
      size: listing.realEstateDetails.size || undefined,
      yearBuilt: listing.realEstateDetails.yearBuilt || undefined,
      bedrooms: listing.realEstateDetails.bedrooms || undefined,
      bathrooms: listing.realEstateDetails.bathrooms || undefined,
      condition: listing.realEstateDetails.condition || undefined,
    } : null,
    favorites: listing.favorites,
    attributes: listing.attributes,
    features: listing.features,
  };
};

const validateListingData = (data: any): string[] => {
  const errors: string[] = [];

  if (!data.title) {
    errors.push("Title is required");
  }

  if (!data.description) {
    errors.push("Description is required");
  }

  if (!data.price || isNaN(parseFloat(data.price))) {
    errors.push("Valid price is required");
  }

  if (!data.mainCategory) {
    errors.push("Main category is required");
  }

  if (!data.subCategory) {
    errors.push("Sub category is required");
  }

  if (!data.location) {
    errors.push("Location is required");
  }

  return errors;
};

export const createListing = async (req: AuthRequest, res: Response) => {
  const prismaClient = prisma;
  try {
    const {
      title,
      description,
      price,
      mainCategory,
      subCategory,
      location,
      condition,
      attributes,
      features,
      details,
      listingAction,
    } = req.body;

    // Parse details if it's a string
    const parsedDetails = typeof details === 'string' ? JSON.parse(details) : details;

    const errors = validateListingData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        errors,
        status: 400,
        data: null,
      });
    }

    // Start transaction
    const result = await prismaClient.$transaction(async (tx) => {
      // Create listing data
      const listingData: ListingCreateInput = {
        title,
        description,
        price: parseFloat(price),
        mainCategory,
        subCategory,
        category: JSON.stringify({ mainCategory, subCategory }),
        location,
        condition,
        status: ListingStatus.ACTIVE,
        listingAction: listingAction || ListingAction.SELL,
        userId: req.user.id,
        images: {
          create: req.processedImages?.map((img) => ({
            url: img.url,
            order: img.order,
          })) || [],
        },
        vehicleDetails: parsedDetails?.vehicles ? {
          create: {
            vehicleType: parsedDetails.vehicles.vehicleType,
            make: parsedDetails.vehicles.make,
            model: parsedDetails.vehicles.model,
            year: parsedDetails.vehicles.year,
            mileage: parsedDetails.vehicles.mileage,
            fuelType: parsedDetails.vehicles.fuelType,
            transmissionType: parsedDetails.vehicles.transmissionType,
            color: parsedDetails.vehicles.color,
            condition: parsedDetails.vehicles.condition,
          }
        } : undefined,
        realEstateDetails: parsedDetails?.realEstate ? {
          create: {
            propertyType: parsedDetails.realEstate.propertyType,
            size: parsedDetails.realEstate.size,
            yearBuilt: parsedDetails.realEstate.yearBuilt,
            bedrooms: parsedDetails.realEstate.bedrooms,
            bathrooms: parsedDetails.realEstate.bathrooms,
            condition: parsedDetails.realEstate.condition,
          }
        } : undefined,
        attributes: attributes ? {
          create: attributes,
        } : undefined,
        features: features ? {
          create: features,
        } : undefined,
      };

      // Create listing
      const listing = await tx.listing.create({
        data: listingData,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
            },
          },
          images: true,
          vehicleDetails: true,
          realEstateDetails: true,
          favorites: true,
          attributes: true,
          features: true,
        },
      });

      // Create notification
      const notificationData: NotificationCreateInput = {
        type: NotificationType.LISTING_CREATED,
        userId: req.user.id,
        content: `Your listing "${listing.title}" has been successfully created.`,
        relatedListingId: listing.id
      };

      await tx.notification.create({
        data: notificationData,
      });

      return listing;
    });

    // Format and send response
    const formattedListing = formatListingResponse(result);

    // Send response
    res.status(201).json({
      success: true,
      data: formattedListing,
      status: 201,
    });
  } catch (error) {
    console.error('Error creating listing:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create listing',
      status: 500,
      data: null,
    });
  }
};

export const getListings = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 12),
    );
    const search = (req.query.search as string) || "";
    const category = (req.query.category as string) || "";
    const minPrice = parseFloat(req.query.minPrice as string) || 0;
    const maxPrice =
      parseFloat(req.query.maxPrice as string) || Number.MAX_SAFE_INTEGER;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder =
      (req.query.sortOrder as string)?.toLowerCase() === "asc" ? "asc" : "desc";

    const where: Prisma.ListingWhereInput = {
      OR: search
        ? [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
      mainCategory: category || undefined,
      price: {
        gte: minPrice,
        lte: maxPrice,
      },
      status: ListingStatus.ACTIVE,
    };

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
            },
          },
          images: true,
          favorites: true,
          attributes: true,
          features: true,
        },
      }),
      prisma.listing.count({ where }),
    ]);

    const formattedListings = listings.map((listing) =>
      formatListingResponse(listing as ListingWithRelations),
    );

    res.json({
      success: true,
      data: {
        listings: formattedListings,
        total,
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error getting listings:", error);
    res.status(500).json({
      success: false,
      message: "Error getting listings",
    });
  }
};

export const getListing = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
        images: true,
        favorites: true,
        attributes: true,
        features: true,
        vehicleDetails: true,
        realEstateDetails: true,
      },
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // Create view notification if viewer is not the seller
    if (req.user && req.user.id !== listing.userId) {
      await createNotification(
        req.app.get("io"),
        listing.userId,
        "LISTING_INTEREST",
        listing.id,
        `${req.user.username} viewed your listing "${listing.title}"`,
      );
    }

    res.json({
      success: true,
      data: formatListingResponse(listing as ListingWithRelations),
    });
  } catch (error) {
    console.error("Error getting listing:", error);
    res.status(500).json({
      success: false,
      message: "Error getting listing",
    });
  }
};

export const updateListing = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      price,
      mainCategory,
      subCategory,
      location,
      condition,
      attributes,
      features,
    } = req.body;

    const listing = await prisma.listing.update({
      where: { id },
      data: {
        title,
        description,
        price: parseFloat(price),
        mainCategory,
        subCategory,
        location,
        condition,
        attributes: attributes
          ? {
              deleteMany: {},
              create: attributes,
            }
          : undefined,
        features: features
          ? {
              deleteMany: {},
              create: features,
            }
          : undefined,
        images: req.processedImages
          ? {
              deleteMany: {},
              create: req.processedImages.map((img) => ({
                url: img.url,
                order: img.order,
              })),
            }
          : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
        images: true,
        favorites: true,
        attributes: true,
        features: true,
      },
    });

    res.json({
      success: true,
      data: formatListingResponse(listing as ListingWithRelations),
      status: 200,
    });
  } catch (error) {
    console.error("Error updating listing:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Error updating listing",
      status: 500,
      data: null,
    });
  }
};

export const deleteListing = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (listing.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this listing",
      });
    }

    // Delete images from storage
    for (const image of listing.images) {
      await deleteFromR2(image.url);
    }

    await prisma.listing.delete({ where: { id } });

    res.json({
      success: true,
      message: "Listing deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting listing:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting listing",
    });
  }
};

export const toggleSaveListing = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
        images: {
          select: {
            id: true,
            url: true,
          },
        },
        favorites: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    const existingFavorite = await prisma.favorite.findFirst({
      where: {
        listingId: id,
        userId: req.user.id,
      },
    });

    if (existingFavorite) {
      await prisma.favorite.delete({
        where: { id: existingFavorite.id },
      });
    } else {
      await prisma.favorite.create({
        data: {
          listingId: id,
          userId: req.user.id,
        },
      });

      // Create save notification
      if (req.user.id !== listing.userId) {
        await createNotification(
          req.app.get("io"),
          listing.userId,
          "LISTING_INTEREST",
          listing.id,
          `${req.user.username} saved your listing "${listing.title}"`,
        );
      }
    }

    const updatedListing = await prisma.listing.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
        images: true,
        favorites: true,
        attributes: true,
        features: true,
      },
    });

    res.json({
      success: true,
      data: formatListingResponse(updatedListing as ListingWithRelations),
    });
  } catch (error) {
    console.error("Error toggling save listing:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling save listing",
    });
  }
};
