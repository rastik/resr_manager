import { Property, Lease, InventoryItem, Expense, MarketComp, VaultDocument, PortfolioAnalytics, UserProfile } from '../types';

export const initialUser: UserProfile = {
  id: 'user_demo_landlord',
  email: 'admin@resr.sk',
  name: 'Správca',
  role: 'landlord',
};

export const initialProperties: Property[] = [
  {
    id: 'prop_1789904376801',
    userId: 'user_demo_landlord',
    name: 'PRIKLAD Arboria',
    unitNumber: '100',
    address: 'Veterna 44',
    postalCode: '',
    city: 'Trnava',
    neighborhood: '',
    sizeSqm: 62,
    floor: 4,
    bedrooms: 2,
    bathrooms: 1,
    rentAmount: 750,
    baseRent: 600,
    utilitiesAmount: 150,
    status: 'occupied',
    activeLeaseId: 'lease_1789922265004',
    imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
    hasCellar: true,
    cellarAreaSqm: 10,
    cellarNumber: 'k',
    hasParking: true,
    parkingSpotNumber: '',
    hasAC: true,
    hasBalcony: true,
    furnishingStatus: 'furnished',
    propertyType: 'flat',
    notes: '',
    photos: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
    ],
    createdAt: '2026-09-20T11:39:35.909Z',
    tenantName: 'asa',
    tenantEmail: '',
    tenantPhone: '',
    leaseEndDate: '2027-09-20',
  },
];

export const initialLeases: Lease[] = [
  {
    id: 'lease_1789922265004',
    userId: 'user_demo_landlord',
    propertyId: 'prop_1789904376801',
    tenantName: 'asa',
    tenantEmail: '',
    tenantPhone: '',
    rentAmount: 750,
    baseRent: 600,
    utilitiesAmount: 150,
    depositAmount: 1500,
    startDate: '2026-09-20',
    endDate: '2027-09-20',
    status: 'active',
    propertyName: 'PRIKLAD Arboria',
    propertyUnit: '100',
  },
];

export const initialInventory: InventoryItem[] = [];

export const initialExpenses: Expense[] = [];

export const initialMarketComps: MarketComp[] = [
  {
    id: 'comp_1',
    neighborhood: 'Mitte',
    avgRentPerSqm: 24.8,
    propertyType: 'Apartment',
    lastUpdated: '2026-09-01',
    historicalTrendPercent: 4.2,
  },
  {
    id: 'comp_2',
    neighborhood: 'Prenzlauer Berg',
    avgRentPerSqm: 23.5,
    propertyType: 'Loft / Altbau',
    lastUpdated: '2026-09-01',
    historicalTrendPercent: 5.1,
  },
  {
    id: 'comp_3',
    neighborhood: 'Neukölln',
    avgRentPerSqm: 21.2,
    propertyType: 'Studio / 2-Room',
    lastUpdated: '2026-09-01',
    historicalTrendPercent: 6.8,
  },
  {
    id: 'comp_4',
    neighborhood: 'Charlottenburg',
    avgRentPerSqm: 25.5,
    propertyType: 'Luxury Penthouse',
    lastUpdated: '2026-09-01',
    historicalTrendPercent: 3.4,
  },
  {
    id: 'comp_5',
    neighborhood: 'Friedrichshain',
    avgRentPerSqm: 22.9,
    propertyType: 'Modern Flat',
    lastUpdated: '2026-09-01',
    historicalTrendPercent: 4.9,
  },
  {
    id: 'comp_6',
    neighborhood: 'Kreuzberg',
    avgRentPerSqm: 23.9,
    propertyType: 'Altbau High Ceilings',
    lastUpdated: '2026-09-01',
    historicalTrendPercent: 5.5,
  },
];

export const initialDocuments: VaultDocument[] = [];
