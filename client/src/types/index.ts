export type PropertyStatus = 'occupied' | 'vacant';

export interface Property {
  id: string;
  userId: string;
  name: string;
  unitNumber: string;
  address: string;
  postalCode?: string;
  city: string;
  neighborhood?: string;
  sizeSqm: number;
  bedrooms: number;
  bathrooms?: number;
  rentAmount: number;
  baseRent?: number;
  utilitiesAmount?: number;
  status: PropertyStatus;
  propertyType?: 'apartment' | 'flat';
  activeLeaseId?: string;
  imageUrl?: string;
  hasCellar?: boolean;
  cellarAreaSqm?: number;
  cellarNumber?: string;
  hasParking?: boolean;
  parkingSpotNumber?: string;
  photos?: string[];
  notes?: string;
  createdAt: string;
  // Joined fields
  tenantName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  leaseEndDate?: string;
}

export type LeaseStatus = 'active' | 'expired' | 'draft';

export interface Lease {
  id: string;
  userId: string;
  propertyId: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  rentAmount: number;
  baseRent?: number;
  utilitiesAmount?: number;
  depositAmount: number;
  startDate: string;
  endDate: string;
  status: LeaseStatus;
  contractFileName?: string;
  contractFileUrl?: string;
  moveInPhotos?: string[];
  createdAt?: string;
  propertyName?: string;
  propertyUnit?: string;
}

export type InventoryCategory = 'appliance' | 'furniture' | 'fixture';

export interface InventoryItem {
  id: string;
  userId: string;
  propertyId: string;
  name: string;
  category: InventoryCategory;
  brandModel: string;
  serialNumber: string;
  purchaseDate: string;
  replacedDate?: string;
  warrantyExpiresAt?: string;
  lifespanYears: number;
  cost: number;
  notes: string;
  createdAt?: string;
  propertyName?: string;
  propertyUnit?: string;
}

export type ExpenseCategory = 'replacement' | 'service' | 'cleaning' | 'repair' | 'utility' | 'tax';

export interface Expense {
  id: string;
  userId: string;
  propertyId: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  createdAt?: string;
  propertyName?: string;
  propertyUnit?: string;
}

export interface MarketComp {
  id: string;
  neighborhood: string;
  avgRentPerSqm: number;
  propertyType: string;
  lastUpdated: string;
  historicalTrendPercent: number;
}

export type DocumentCategory = 'tenancy' | 'inspection' | 'invoice' | 'other';

export interface VaultDocument {
  id: string;
  userId: string;
  propertyId?: string;
  leaseId?: string;
  name: string;
  category: DocumentCategory;
  fileSize: string;
  uploadDate: string;
  expiryDate?: string;
  fileUrl: string;
  notes?: string;
  createdAt?: string;
  propertyName?: string;
  propertyUnit?: string;
  tenantName?: string;
}

export interface CashFlowMonth {
  month: string;
  income: number;
  expenses: number;
  netCashflow: number;
}

export interface PortfolioAnalytics {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  maintenanceUnits: number;
  occupancyRate: number;
  monthlyGrossRent: number;
  totalExpenses: number;
  expiringIn30DaysCount: number;
  expiringIn60DaysCount: number;
  expiringIn90DaysCount: number;
  upcomingLeases: Lease[];
  cashFlowData: CashFlowMonth[];
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface MarketMatchBreakdown {
  roomsScore: number;
  roomsMax: number;
  roomsLabel: string;
  sizeScore: number;
  sizeMax: number;
  sizeLabel: string;
  locationScore: number;
  locationMax: number;
  locationLabel: string;
  amenitiesScore: number;
  amenitiesMax: number;
  amenitiesLabel: string;
}

export interface MarketComparableItem {
  id: string;
  title: string;
  location: string;
  district?: string;
  totalRentPrice: number;
  baseRent: number;
  utilitiesAmount: number | null;
  isUtilitiesInclusive: boolean;
  priceBreakdownText: string;
  rentPrice: number; // For backward compatibility
  sizeSqm: number | null;
  rooms: number | null;
  hasParking: boolean;
  hasBalcony: boolean;
  hasCellar: boolean;
  isFurnished: boolean;
  hasAC: boolean;
  photoUrl: string | null;
  detailUrl: string;
  confidenceScore: number;
  confidenceTier: 'high' | 'good' | 'moderate';
  pricePerSqm: number | null;
  deltaAmount: number;
  deltaPercent: number;
  furnishingStatus?: 'furnished' | 'partially' | 'unfurnished';
  buildingCondition?: 'new_building' | 'reconstructed' | 'original';
  sourceAI?: 'jev' | 'rules';
  breakdown: MarketMatchBreakdown;
}

export interface MarketSummaryStats {
  comparablesCount: number;
  hasJevAI?: boolean;
  medianRent: number;
  avgRent: number;
  avgRentPerSqm: number;
  minRent: number;
  maxRent: number;
  targetCurrentRent: number;
  targetEstimatedMarketRent: number;
  deltaMarketRent: number;
  deltaMarketPercent: number;
  recommendation: string;
}

export interface MarketComparisonResponse {
  target: {
    id?: string;
    name?: string;
    unitNumber?: string;
    sizeSqm: number;
    bedrooms: number;
    bathrooms?: number;
    rentAmount: number;
    baseRent?: number | null;
    utilitiesAmount?: number | null;
    city: string;
    neighborhood?: string;
    hasParking?: boolean;
    hasCellar?: boolean;
  };
  stats: MarketSummaryStats;
  comparables: MarketComparableItem[];
}

