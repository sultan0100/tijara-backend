import express, { Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import prisma from "../src/lib/prismaClient";
import { Prisma } from "@prisma/client";
import { VehicleType, FuelType, TransmissionType, Condition } from "../types/enums";
import {
  upload,
  processImagesMiddleware,
  processImage,
} from "../middleware/upload.middleware";

// Extend Request type for authenticated requests
interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
  processedImages?: Array<{
    url: string;
    order: number;
  }>;
}

// Type for sorting options
type SortOrder = 'asc' | 'desc';

// Define valid sort fields
const validSortFields = ['price', 'createdAt', 'favorites'] as const;
type SortField = typeof validSortFields[number];

// Helper function to build orderBy object
const buildOrderBy = (sortBy?: string, sortOrder?: string): Prisma.ListingOrderByWithRelationInput => {
  const order: SortOrder = (sortOrder?.toLowerCase() === 'desc') ? 'desc' : 'asc';
  
  if (sortBy === 'favorites') {
    return {
      favorites: {
        _count: order
      }
    };
  }
  
  if (sortBy === 'price') {
    return { price: order };
  }
  
  // Default sort by createdAt
  return { createdAt: 'desc' };
};

// Helper function to validate request user
const validateUser = (req: AuthRequest): string => {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error('Unauthorized: User not found');
  }
  return userId;
};

import {
  ListingCreateInput,
  ListingUpdateInput,
  ListingWithRelations,
  ListingBase,
  ListingDetails,
} from "../types/shared";

const router = express.Router();

const formatListingResponse = (listing: any): ListingBase | null => {
  if (!listing) return null;

  const details: ListingDetails = {
    vehicles: listing.vehicleDetails ? {
      vehicleType: listing.vehicleDetails.vehicleType,
      make: listing.vehicleDetails.make,
      model: listing.vehicleDetails.model,
      year: listing.vehicleDetails.year,
      // Add other vehicle-specific fields
    } : undefined,
    realEstate: listing.realEstateDetails ? {
      propertyType: listing.realEstateDetails.propertyType,
      size: listing.realEstateDetails.size,
      bedrooms: listing.realEstateDetails.bedrooms,
      // Add other real estate-specific fields
    } : undefined,
  };

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    category: {
      mainCategory: listing.mainCategory,
      subCategory: listing.subCategory,
    },
    location: listing.location,
    images: listing.images?.map((img: any) => img.url) || [],
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    userId: listing.userId,
    details,
    listingAction: listing.listingAction,
    status: listing.status,
  };
};

// Public Routes
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { mainCategory, subCategory, sortBy, sortOrder, page = 1, limit = 10 } = req.query;

    // Build where clause for filtering
    const where: Prisma.ListingWhereInput = {};
    if (mainCategory) {
      where.mainCategory = mainCategory as string;
    }
    if (subCategory) {
      where.subCategory = subCategory as string;
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Get total count for pagination
    const total = await prisma.listing.count({ where });

    // Get listings with pagination, sorting, and filtering
    const listings = await prisma.listing.findMany({
      where,
      take: Number(limit),
      skip,
      orderBy: buildOrderBy(sortBy as string, sortOrder as string),
      include: {
        images: true,
        user: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
        favorites: true,
        vehicleDetails: true,
        realEstateDetails: true,
      },
    });

    // Format listings for response
    const formattedListings = listings.map((listing) =>
      formatListingResponse(listing),
    );

    res.json({
      success: true,
      data: {
        items: formattedListings,
        total,
        page: Number(page),
        limit: Number(limit),
        hasMore: total > (Number(page) * Number(limit)),
      },
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching listings:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch listings",
      status: 500,
      data: null,
    });
  }
});

router.get("/search", async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, category, minPrice, maxPrice } = req.query;

    const where: Prisma.ListingWhereInput = {
      status: "ACTIVE",
      ...(query &&
        typeof query === "string" && {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        }),
      ...(category && typeof category === "string" && { category }),
      ...(minPrice || maxPrice
        ? {
            price: {
              ...(minPrice &&
                typeof minPrice === "string" && { gte: parseFloat(minPrice) }),
              ...(maxPrice &&
                typeof maxPrice === "string" && { lte: parseFloat(maxPrice) }),
            },
          }
        : {}),
    };

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
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
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items: listings.map((listing) => formatListingResponse(listing)),
        total,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        hasMore: total > (parseInt(req.query.limit as string) || 10),
      },
      status: 200,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Error searching listings",
      status: 500,
      data: null,
    });
  }
});

router.get("/trending", async (_req: Request, res: Response): Promise<void> => {
  try {
    const trendingListings = await prisma.listing.findMany({
      where: { status: "ACTIVE" },
      include: {
        images: true,
        _count: {
          select: { favorites: true }
        }
      },
      orderBy: {
        favorites: {
          _count: "desc",
        },
      },
      take: 10,
    });

    res.json({
      success: true,
      data: { items: trendingListings },
      status: 200,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      success: false,
      error: errorMessage,
      status: 500,
      data: null,
    });
  }
});

// Protected Routes
router.use(authenticate);

// Helper function to handle authenticated routes
const handleAuthRoute = (handler: (req: AuthRequest, res: Response) => Promise<void>) => {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      // Cast request to AuthRequest since it's been authenticated
      const authReq = req as AuthRequest;
      await handler(authReq, res);
    } catch (error) {
      console.error("Auth route error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "An unknown error occurred",
        status: 500,
        data: null,
      });
    }
  };
};

router.get("/saved", handleAuthRoute(async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = validateUser(req);
    const savedListings = await prisma.favorite.findMany({
      where: {
        userId,
      },
      include: {
        listing: {
          include: {
            images: true,
            user: {
              select: {
                id: true,
                username: true,
                profilePicture: true,
              },
            },
            favorites: true,
          },
        },
      },
    });

    const formattedListings = savedListings.map((favorite) =>
      formatListingResponse(favorite.listing),
    );

    res.json({
      success: true,
      data: { items: formattedListings },
      status: 200,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
      status: 500,
      data: null,
    });
  }
}));

router.post(
  "/",
  upload.array("images", 10),
  processImagesMiddleware,
  handleAuthRoute(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = validateUser(req);
      const { title, description, price, mainCategory, subCategory, location = "", listingAction, details } = req.body;

      // Validate required fields
      if (!title || !description || !price || !location || !mainCategory || !subCategory) {
        res.status(400).json({
          success: false,
          error: "Missing required fields",
          status: 400,
          data: null,
        });
        return;
      }

      // Get processed image URLs
      const imageUrls = req.processedImages?.map(img => img.url) || [];

      // Parse details
      const parsedDetails = JSON.parse(typeof details === 'string' ? details : JSON.stringify(details));

      // Create listing with images
      const listing = await prisma.listing.create({
        data: {
          title,
          description,
          price: Number(price),
          location,
          category: mainCategory, // For backwards compatibility
          mainCategory,
          subCategory,
          images: {
            create: imageUrls.map((url, index) => ({
              url,
              order: index,
            })),
          },
          userId,
          listingAction,
          vehicleDetails: parsedDetails.vehicles ? {
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
          realEstateDetails: parsedDetails.realEstate ? {
            create: {
              propertyType: parsedDetails.realEstate.propertyType,
              size: parsedDetails.realEstate.size,
              yearBuilt: parsedDetails.realEstate.yearBuilt,
              bedrooms: parsedDetails.realEstate.bedrooms,
              bathrooms: parsedDetails.realEstate.bathrooms,
              condition: parsedDetails.realEstate.condition,
            }
          } : undefined,
        },
        include: {
          images: true,
          user: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
            },
          },
          favorites: true,
          vehicleDetails: true,
          realEstateDetails: true,
        },
      });

      res.status(201).json({
        success: true,
        data: formatListingResponse(listing),
        status: 201,
      });
    } catch (error) {
      console.error("Error creating listing:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create listing",
        status: 500,
        data: null,
      });
    }
  })
);

router.get("/user", handleAuthRoute(async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const userId = validateUser(req);

    const listings = await prisma.listing.findMany({
      where: {
        userId,
      },
      include: {
        user: true,
        images: true,
        favorites: true,
      },
      skip,
      take: Number(limit),
      orderBy: {
        createdAt: "desc",
      },
    });

    const total = await prisma.listing.count({
      where: {
        userId,
      },
    });

    res.json({
      success: true,
      data: {
        listings: listings.map((listing) => formatListingResponse(listing)),
        total,
        page: Number(page),
        limit: Number(limit),
        hasMore: total > (Number(page) * Number(limit)),
      },
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching user listings:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "An error occurred while fetching user listings",
      },
    });
  }
}));

router.get("/favorites", handleAuthRoute(async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = validateUser(req);
    const favorites = await prisma.favorite.findMany({
      where: {
        userId,
      },
      include: {
        listing: {
          include: {
            images: true,
            user: true,
            favorites: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        favorites: favorites.map((fav) => ({
          ...formatListingResponse(fav.listing),
          favorite: true,
        })),
      },
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching favorite listings:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "An error occurred while fetching favorite listings",
      },
    });
  }
}));

router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: {
        images: true,
        user: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
        favorites: true,
        vehicleDetails: true,
        realEstateDetails: true,
      },
    });

    if (!listing) {
      res.status(404).json({
        success: false,
        error: "Listing not found",
        status: 404,
        data: null,
      });
      return;
    }

    const formattedListing = formatListingResponse(listing);
    res.json({
      success: true,
      data: formattedListing,
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching listing:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch listing",
      status: 500,
      data: null,
    });
  }
});

router.put(
  "/:id",
  upload.array("images"),
  processImagesMiddleware,
  handleAuthRoute(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        title,
        description,
        price,
        mainCategory,
        subCategory,
        location = "",
        features = [],
        vehicleDetails,
        realEstateDetails,
        listingAction,
        sellDescription,
        rentDescription
      } = req.body;

      const newImages = req.processedImages || [];
      const existingImages = req.body.existingImages || [];

      // First, delete removed images
      await prisma.image.deleteMany({
        where: {
          listingId: req.params.id,
          url: { notIn: existingImages },
        },
      });

      // Update the listing
      const listing = await prisma.listing.update({
        where: { id: req.params.id },
        data: {
          title,
          description,
          price: parseFloat(price),
          mainCategory,
          subCategory,
          location,
          listingAction,
          images: {
            create: newImages.map((image: any, index: number) => ({
              url: image.url,
              order: existingImages.length + index,
            })),
          },
          features: {
            deleteMany: {},
            create: features.map((feature: string) => ({
              name: feature,
              value: true
            })),
          },
          vehicleDetails: vehicleDetails ? {
            upsert: {
              create: {
                make: vehicleDetails.make,
                model: vehicleDetails.model,
                year: vehicleDetails.year,
                mileage: vehicleDetails.mileage,
                vehicleType: (vehicleDetails.vehicleType as VehicleType) || VehicleType.OTHER,
                fuelType: vehicleDetails.fuelType ? (vehicleDetails.fuelType as FuelType) : null,
                transmissionType: vehicleDetails.transmissionType ? (vehicleDetails.transmissionType as TransmissionType) : null,
                color: vehicleDetails.color,
                condition: vehicleDetails.condition ? (vehicleDetails.condition as Condition) : null
              },
              update: {
                make: vehicleDetails.make,
                model: vehicleDetails.model,
                year: vehicleDetails.year,
                mileage: vehicleDetails.mileage,
                vehicleType: (vehicleDetails.vehicleType as VehicleType) || VehicleType.OTHER,
                fuelType: vehicleDetails.fuelType ? (vehicleDetails.fuelType as FuelType) : null,
                transmissionType: vehicleDetails.transmissionType ? (vehicleDetails.transmissionType as TransmissionType) : null,
                color: vehicleDetails.color,
                condition: vehicleDetails.condition ? (vehicleDetails.condition as Condition) : null
              }
            }
          } : undefined,
          realEstateDetails: realEstateDetails ? {
            upsert: {
              create: {
                propertyType: realEstateDetails.propertyType || 'OTHER',
                size: realEstateDetails.size,
                yearBuilt: realEstateDetails.yearBuilt,
                bedrooms: realEstateDetails.bedrooms,
                bathrooms: realEstateDetails.bathrooms,
                condition: realEstateDetails.condition ? (realEstateDetails.condition as Condition) : null
              },
              update: {
                propertyType: realEstateDetails.propertyType || 'OTHER',
                size: realEstateDetails.size,
                yearBuilt: realEstateDetails.yearBuilt,
                bedrooms: realEstateDetails.bedrooms,
                bathrooms: realEstateDetails.bathrooms,
                condition: realEstateDetails.condition ? (realEstateDetails.condition as Condition) : null
              }
            }
          } : undefined,
        },
        include: {
          images: true,
          user: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
            },
          },
          favorites: true,
        },
      });

      res.json({
        success: true,
        data: formatListingResponse(listing),
        status: 200,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        status: 500,
        data: null,
      });
    }
  }),
);

router.delete("/:id", handleAuthRoute(async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = validateUser(req);
    
    // Find listing
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: {
        images: true,
        favorites: true,
        vehicleDetails: true,
        realEstateDetails: true,
      },
    });

    // Check if listing exists and belongs to user
    if (!listing) {
      res.status(404).json({
        success: false,
        error: "Listing not found",
        status: 404,
        data: null,
      });
      return;
    }

    if (listing.userId !== userId) {
      res.status(403).json({
        success: false,
        error: "Not authorized to delete this listing",
        status: 403,
        data: null,
      });
      return;
    }

    // Delete in a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Delete vehicle details if they exist
      if (listing.vehicleDetails) {
        await tx.vehicleDetails.delete({
          where: { listingId: listing.id },
        });
      }

      // Delete real estate details if they exist
      if (listing.realEstateDetails) {
        await tx.realEstateDetails.delete({
          where: { listingId: listing.id },
        });
      }

      // Delete favorites
      await tx.favorite.deleteMany({
        where: { listingId: listing.id },
      });

      // Delete images
      await tx.image.deleteMany({
        where: { listingId: listing.id },
      });

      // Delete the listing itself
      await tx.listing.delete({
        where: { id: listing.id },
      });
    });

    res.json({
      success: true,
      data: null,
      status: 200,
    });
  } catch (error) {
    console.error("Error deleting listing:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete listing",
      status: 500,
      data: null,
    });
  }
}));

export default router;
