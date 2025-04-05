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

export enum FuelType {
  GASOLINE = 'gasoline',
  DIESEL = 'diesel',
  ELECTRIC = 'electric',
  HYBRID = 'hybrid',
  PLUGIN_HYBRID = 'pluginHybrid',
  LPG = 'lpg',
  CNG = 'cng',
  OTHER = 'other'
}

export enum TransmissionType {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
  SEMI_AUTOMATIC = 'semiAutomatic',
  CONTINUOUSLY_VARIABLE = 'continuouslyVariable',
  DUAL_CLUTCH = 'dualClutch',
  OTHER = 'other'
}

export enum Condition {
  NEW = 'new',
  LIKE_NEW = 'likeNew',
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  SALVAGE = 'salvage'
}

export enum NotificationType {
  NEW_MESSAGE = 'NEW_MESSAGE',
  LISTING_INTEREST = 'LISTING_INTEREST',
  PRICE_UPDATE = 'PRICE_UPDATE',
  LISTING_SOLD = 'LISTING_SOLD',
  SYSTEM_NOTICE = 'SYSTEM_NOTICE',
  LISTING_CREATED = 'LISTING_CREATED'
}
