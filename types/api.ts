export interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error?: string | string[];
  status?: number;
}

export interface SingleListingResponse {
  id: string;
  title: string;
  description: string;
  price: number;
  category: {
    mainCategory: string;
    subCategory: string;
  };
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
    profilePicture: string | null;
  };
  images: Array<{
    id: string;
    url: string;
    order: number;
  }>;
  favorites: Array<{
    id: string;
    userId: string;
    listingId: string;
    createdAt: Date;
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
}
