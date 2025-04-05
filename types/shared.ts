import { Request } from "express";
import { ListingStatus } from "@prisma/client";

// Request types
export interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
  files?: Express.Multer.File[];
  file?: Express.Multer.File;
  processedImages?: ProcessedImage[];
}

export interface ProcessedImage {
  url: string;
  order: number;
}

// Listing types
export interface ListingCreateInput {
  title: string;
  description: string;
  price: number;
  category: {
    mainCategory: ListingCategory;
    subCategory: VehicleType | PropertyType;
  };
  location: string;
  images: string[];
  details: ListingDetails;
  listingAction?: 'sell' | 'rent';
}

export interface ListingUpdateInput extends Partial<Omit<ListingCreateInput, 'id'>> {}

// Enums
export enum ListingCategory {
  VEHICLES = 'VEHICLES',
  REAL_ESTATE = 'REAL_ESTATE',
}

export enum VehicleType {
  CAR = 'CAR',
  TRUCK = 'TRUCK',
  MOTORCYCLE = 'MOTORCYCLE',
  RV = 'RV',
  OTHER = 'OTHER',
}

export enum PropertyType {
  HOUSE = 'HOUSE',
  APARTMENT = 'APARTMENT',
  CONDO = 'CONDO',
  LAND = 'LAND',
  COMMERCIAL = 'COMMERCIAL',
  OTHER = 'OTHER',
}

// Location type
export interface Location {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

// Details types
export interface ListingDetails {
  vehicles?: VehicleDetails;
  realEstate?: RealEstateDetails;
}

export interface VehicleDetails {
  vehicleType: VehicleType;
  make: string;
  model: string;
  year: string;
  mileage?: string;
  fuelType?: string;
  transmissionType?: string;
  color?: string;
  condition?: string;
  features?: string[];
}

export interface RealEstateDetails {
  propertyType: PropertyType;
  size?: string;
  yearBuilt?: string;
  bedrooms?: string;
  bathrooms?: string;
  condition?: string;
  features?: string[];
}

// Base listing type
export interface ListingBase {
  id: string;
  title: string;
  description: string;
  price: number;
  category: {
    mainCategory: ListingCategory;
    subCategory: VehicleType | PropertyType;
  };
  location: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  details: ListingDetails;
  listingAction?: 'sell' | 'rent';
  status: ListingStatus;
}

// Listing with relations
export interface ListingWithRelations extends ListingBase {
  seller?: {
    id: string;
    username: string;
    profilePicture: string | null;
  };
  savedBy?: {
    id: string;
    userId: string;
  }[];
}

// API response types
export interface APIResponse<T = any> {
  success: boolean;
  data: T | null;
  error?: string;
  status: number;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> extends APIResponse<PaginatedData<T>> {}
