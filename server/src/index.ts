import express, { Request, Response } from 'express';
import cors from 'cors';
import { pool, toCamelCase } from './db';
import { dbService } from './dbService';
import { initialProperties, initialLeases, initialInventory, initialExpenses, initialMarketComps, initialDocuments } from './initialData';
import { NehnutelnostiService } from './services/nehnutelnostiService';
import { ComparatorEngine, TargetPropertyCriteria } from './services/comparatorEngine';
import { BookingScraperService } from './services/bookingScraperService';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Helper for extracting active user ID (defaults to demo user if not supplied)
function getUserId(req: Request): string {
  return (req.headers['x-user-id'] as string) || 'user_demo_landlord';
}

async function initDb() {
  try {
    await pool.query(`
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS base_rent NUMERIC(10, 2);
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS utilities_amount NUMERIC(10, 2);
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_type VARCHAR(64) DEFAULT 'apartment';
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS has_ac BOOLEAN DEFAULT false;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS has_balcony BOOLEAN DEFAULT false;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS furnishing_status VARCHAR(32) DEFAULT 'furnished';
      ALTER TABLE leases ADD COLUMN IF NOT EXISTS base_rent NUMERIC(10, 2);
      ALTER TABLE leases ADD COLUMN IF NOT EXISTS utilities_amount NUMERIC(10, 2);
      ALTER TABLE leases ADD COLUMN IF NOT EXISTS move_in_photos TEXT[] DEFAULT '{}';
      ALTER TABLE leases ADD COLUMN IF NOT EXISTS lease_type VARCHAR(32) DEFAULT 'standard';
      ALTER TABLE leases ADD COLUMN IF NOT EXISTS operator_company VARCHAR(255);
      ALTER TABLE inventory_items ALTER COLUMN purchase_date DROP NOT NULL;
      ALTER TABLE inventory_items ALTER COLUMN cost DROP NOT NULL;
      ALTER TABLE properties ALTER COLUMN neighborhood DROP NOT NULL;
      UPDATE properties SET neighborhood = '' WHERE neighborhood = 'Central';
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS hotel_revenue (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        property_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        lease_id VARCHAR(64) NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
        month VARCHAR(7) NOT NULL,
        revenue_amount NUMERIC(10, 2) NOT NULL,
        occupancy_percent NUMERIC(5, 2),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(lease_id, month)
      );
      CREATE INDEX IF NOT EXISTS idx_hotel_revenue_lease ON hotel_revenue(lease_id);
      CREATE INDEX IF NOT EXISTS idx_hotel_revenue_property ON hotel_revenue(property_id);
    `);

    console.log('PostgreSQL schema verified: columns are available.');
  } catch (err: any) {
    console.warn('DB schema check notice (using Supabase Cloud fallback if PostgreSQL is offline):', err.message);
  }

  // Seed default data if cloud database is empty
  await dbService.seedInitialDataIfEmpty(
    'user_demo_landlord',
    initialProperties,
    initialLeases,
    initialInventory,
    initialExpenses,
    initialMarketComps,
    initialDocuments
  );
}
initDb().catch((err) => {
  console.warn('[DB] initDb warning during bootstrap:', err?.message || err);
});

// ----------------------------------------------------
// Health Check & DB Status
// ----------------------------------------------------
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const health = await dbService.getHealth();
    res.json(health);
  } catch (error: any) {
    res.status(500).json({
      status: 'degraded',
      database: 'disconnected',
      error: error.message,
    });
  }
});

// ----------------------------------------------------
// Authentication / User endpoints
// ----------------------------------------------------
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const targetEmail = email || 'alex.vance@resr.sk';
    let user = await dbService.findUserByEmail(targetEmail);
    if (!user) {
      const newId = 'user_' + Date.now();
      const userName = email ? email.split('@')[0] : 'Landlord';
      user = await dbService.createUser({
        id: newId,
        email: targetEmail,
        name: userName,
        role: 'landlord',
      });
    }
    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  try {
    const user = await dbService.findUserById(userId);
    if (user) {
      res.json({ user });
    } else {
      res.json({
        user: {
          id: userId,
          email: 'alex.vance@resr.sk',
          name: 'Alex Vance (Portfolio Owner)',
          role: 'landlord',
        },
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Properties CRUD
// ----------------------------------------------------
app.get('/api/properties', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  try {
    const properties = await dbService.getProperties(userId);
    res.json(properties);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/properties/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    const details = await dbService.getPropertyDetails(id, userId);
    if (!details) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json(details);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/properties', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const {
    name,
    unitNumber,
    address,
    postalCode,
    city,
    neighborhood,
    sizeSqm,
    bedrooms,
    bathrooms,
    rentAmount,
    baseRent,
    utilitiesAmount,
    status = 'vacant',
    imageUrl = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
    hasCellar = false,
    cellarAreaSqm,
    cellarNumber,
    hasParking = false,
    parkingSpotNumber,
    photos = [],
    notes = '',
    propertyType = 'apartment',
    hasAC = false,
    hasBalcony = false,
    furnishingStatus = 'furnished',
  } = req.body;

  const id = 'prop_' + Date.now();
  const initialPhotos = photos && photos.length > 0 ? photos : (imageUrl ? [imageUrl] : []);

  const numBase = baseRent !== undefined && baseRent !== null && !isNaN(Number(baseRent)) ? Number(baseRent) : null;
  const numUtils = utilitiesAmount !== undefined && utilitiesAmount !== null && !isNaN(Number(utilitiesAmount)) ? Number(utilitiesAmount) : null;
  const numRent = rentAmount !== undefined && rentAmount !== null && !isNaN(Number(rentAmount))
    ? Number(rentAmount)
    : ((numBase || 0) + (numUtils || 0));

  try {
    const created = await dbService.createProperty({
      id,
      userId,
      name,
      unitNumber,
      address,
      postalCode: postalCode || '',
      city: city || 'Bratislava',
      neighborhood: neighborhood || '',
      sizeSqm: Number(sizeSqm) || 50,
      bedrooms: Number(bedrooms) || 1,
      bathrooms: Number(bathrooms) || 1,
      rentAmount: numRent,
      status,
      imageUrl,
      hasCellar: Boolean(hasCellar),
      cellarAreaSqm: cellarAreaSqm !== undefined && cellarAreaSqm !== '' ? Number(cellarAreaSqm) : null,
      cellarNumber: cellarNumber || null,
      hasParking: Boolean(hasParking),
      parkingSpotNumber: parkingSpotNumber || null,
      photos: initialPhotos,
      notes: notes || '',
      propertyType: propertyType || 'apartment',
      baseRent: numBase,
      utilitiesAmount: numUtils,
      hasAC: Boolean(hasAC),
      hasBalcony: Boolean(hasBalcony),
      furnishingStatus: furnishingStatus || 'furnished',
    });
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/properties/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    const updated = await dbService.updateProperty(id, userId, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/properties/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    await dbService.deleteProperty(id, userId);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Leases CRUD
// ----------------------------------------------------
app.get('/api/leases', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { propertyId } = req.query;
  try {
    const leases = await dbService.getLeases(userId, propertyId as string);
    res.json(leases);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/leases', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const {
    propertyId,
    leaseType = 'standard',
    tenantName,
    tenantEmail,
    tenantPhone,
    operatorCompany,
    rentAmount,
    baseRent,
    utilitiesAmount,
    depositAmount,
    startDate,
    endDate,
    status = 'active',
    contractFileName = 'Lease_Agreement.pdf',
    contractFileUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    moveInPhotos = [],
  } = req.body;

  const id = 'lease_' + Date.now();
  const numBase = baseRent !== undefined && baseRent !== null && !isNaN(Number(baseRent)) ? Number(baseRent) : null;
  const numUtils = utilitiesAmount !== undefined && utilitiesAmount !== null && !isNaN(Number(utilitiesAmount)) ? Number(utilitiesAmount) : null;
  const numRent = rentAmount !== undefined && rentAmount !== null && !isNaN(Number(rentAmount))
    ? Number(rentAmount)
    : ((numBase || 0) + (numUtils || 0));

  const cleanStartDate = startDate ? String(startDate).split('T')[0] : null;
  const cleanEndDate = endDate ? String(endDate).split('T')[0] : null;

  const todayStr = new Date().toISOString().split('T')[0];
  let computedStatus = status;
  if (cleanEndDate && cleanEndDate < todayStr) {
    computedStatus = 'expired';
  }

  try {
    const created = await dbService.createLease({
      id,
      userId,
      propertyId,
      leaseType: leaseType || 'standard',
      operatorCompany: operatorCompany || null,
      tenantName,
      tenantEmail,
      tenantPhone,
      rentAmount: numRent,
      baseRent: numBase,
      utilitiesAmount: numUtils,
      depositAmount: Number(depositAmount) || 0,
      startDate: cleanStartDate,
      endDate: cleanEndDate,
      status: computedStatus,
      contractFileName,
      contractFileUrl,
      moveInPhotos: moveInPhotos || [],
    });

    if (computedStatus === 'active') {
      await dbService.updateProperty(propertyId, userId, {
        activeLeaseId: id,
        status: 'occupied',
        rentAmount: numRent,
        baseRent: numBase,
        utilitiesAmount: numUtils,
      });
    }

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/leases/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    const updated = await dbService.updateLease(id, userId, req.body);
    if (updated && updated.status === 'active') {
      await dbService.updateProperty(updated.propertyId, userId, {
        activeLeaseId: id,
        status: 'occupied',
        rentAmount: updated.rentAmount,
        baseRent: updated.baseRent,
        utilitiesAmount: updated.utilitiesAmount,
      });
    } else if (updated && updated.status === 'expired') {
      const remaining = (await dbService.getLeases(userId, updated.propertyId))
        .filter((l: any) => l.status === 'active' && (!l.endDate || l.endDate >= new Date().toISOString().split('T')[0]));
      if (remaining.length > 0) {
        const nextL = remaining[0];
        await dbService.updateProperty(updated.propertyId, userId, {
          activeLeaseId: nextL.id,
          status: 'occupied',
          rentAmount: nextL.rentAmount,
          baseRent: nextL.baseRent,
          utilitiesAmount: nextL.utilitiesAmount,
        });
      } else {
        await dbService.updateProperty(updated.propertyId, userId, {
          activeLeaseId: null,
          status: 'vacant',
          rentAmount: 0,
          baseRent: null,
          utilitiesAmount: null,
        });
      }
    }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/leases/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    await dbService.deleteLease(id, userId);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Inventory Items CRUD
// ----------------------------------------------------
app.get('/api/inventory', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { propertyId } = req.query;
  try {
    const items = await dbService.getInventory(userId, propertyId as string);
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const {
    propertyId,
    name,
    category,
    brandModel,
    serialNumber,
    purchaseDate,
    replacedDate,
    warrantyExpiresAt,
    lifespanYears = 8,
    cost = 0,
    notes,
  } = req.body;

  const id = 'inv_' + Date.now();
  const cleanPurchaseDate = purchaseDate ? String(purchaseDate).split('T')[0] : null;
  const cleanWarranty = warrantyExpiresAt ? String(warrantyExpiresAt).split('T')[0] : null;
  const numCost = cost !== undefined && cost !== null && cost !== '' && !isNaN(Number(cost)) ? Number(cost) : 0;

  try {
    const created = await dbService.createInventory({
      id,
      userId,
      propertyId,
      name,
      category,
      brandModel: brandModel || '',
      serialNumber: serialNumber || '',
      purchaseDate: cleanPurchaseDate,
      replacedDate: replacedDate || null,
      warrantyExpiresAt: cleanWarranty,
      lifespanYears: Number(lifespanYears) || 8,
      cost: numCost,
      notes: notes || '',
    });
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/inventory/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    const updated = await dbService.updateInventory(id, userId, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/inventory/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    await dbService.deleteInventory(id, userId);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Expenses CRUD
// ----------------------------------------------------
app.get('/api/expenses', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { propertyId } = req.query;
  try {
    const expenses = await dbService.getExpenses(userId, propertyId as string);
    res.json(expenses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/expenses', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { propertyId, category, amount, date, description } = req.body;
  const id = 'exp_' + Date.now();

  try {
    const created = await dbService.createExpense({
      id,
      userId,
      propertyId,
      category,
      amount: Number(amount) || 0,
      date,
      description,
    });
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/expenses/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    await dbService.deleteExpense(id, userId);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Market Comps
// ----------------------------------------------------
app.get('/api/market-comps', async (req: Request, res: Response) => {
  try {
    const comps = await dbService.getMarketComps();
    res.json(comps);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/market/comparables', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { propertyId, city, neighborhood, rooms, sizeSqm, rentAmount } = req.query;

  try {
    let targetCriteria: TargetPropertyCriteria = {
      sizeSqm: Number(sizeSqm) || 60,
      bedrooms: Number(rooms) || 2,
      rentAmount: rentAmount !== undefined && rentAmount !== null && !isNaN(Number(rentAmount)) ? Number(rentAmount) : 0,
      city: (city as string) || 'Bratislava',
      neighborhood: (neighborhood as string) || 'Staré Mesto',
      hasParking: true,
      hasCellar: true,
    };

    if (propertyId) {
      const details = await dbService.getPropertyDetails(propertyId as string, userId);
      if (details?.property) {
        const p = details.property;
        const notesAndName = `${p.notes || ''} ${p.name || ''}`.toLowerCase();
        const hasAC = p.hasAc !== undefined && p.hasAc !== null ? Boolean(p.hasAc) : /klimatiz|kl[ií]m/i.test(notesAndName);
        const hasBalcony = p.hasBalcony !== undefined && p.hasBalcony !== null ? Boolean(p.hasBalcony) : /balk[oó]n|lod[zž]i|teras/i.test(notesAndName);
        const isNewBuilding = /novostavb|arboria|rezidenc|urban/i.test(notesAndName);
        const furnishingStatus = p.furnishingStatus || (/nezariaden/i.test(notesAndName) ? 'unfurnished' : 'furnished');

        let cleanCity = p.city || (city as string) || 'Trnava';
        if (cleanCity === 'Central') cleanCity = 'Trnava';

        let cleanNeighborhood = p.neighborhood || (neighborhood as string) || '';
        if (cleanNeighborhood.toLowerCase() === 'central') {
          cleanNeighborhood = '';
        }

        targetCriteria = {
          id: p.id,
          name: p.name,
          unitNumber: p.unitNumber,
          sizeSqm: Number(p.sizeSqm) || 60,
          bedrooms: Number(p.bedrooms) || 2,
          bathrooms: Number(p.bathrooms) || 1,
          rentAmount: p.rentAmount !== undefined && p.rentAmount !== null && !isNaN(Number(p.rentAmount)) ? Number(p.rentAmount) : 0,
          baseRent: p.baseRent !== undefined && p.baseRent !== null ? Number(p.baseRent) : null,
          utilitiesAmount: p.utilitiesAmount !== undefined && p.utilitiesAmount !== null ? Number(p.utilitiesAmount) : null,
          city: cleanCity,
          neighborhood: cleanNeighborhood,
          hasParking: Boolean(p.hasParking),
          hasCellar: Boolean(p.hasCellar),
          hasAC,
          hasBalcony,
          furnishingStatus,
          buildingCondition: isNewBuilding ? 'new_building' : 'reconstructed',
        };
      }
    }

    const searchCity = targetCriteria.city || (city as string) || 'Trnava';
    const searchRooms = rooms ? Number(rooms) : targetCriteria.bedrooms;

    const listings = await NehnutelnostiService.getListings(searchCity, searchRooms);
    const comparisonResult = ComparatorEngine.compare(targetCriteria, listings);

    res.json(comparisonResult);
  } catch (error: any) {
    console.error('Error fetching market comparables:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Booking.com Monitor (Apartmán Deluxe)
// ----------------------------------------------------
app.get('/api/booking-monitor', async (req: Request, res: Response) => {
  const { propertyId, operatorPayoutAvg } = req.query;
  try {
    const propId = (propertyId as string) || 'prop_ovruc_deluxe';
    const payoutAvg = operatorPayoutAvg ? Number(operatorPayoutAvg) : 1450;
    const comparison = await BookingScraperService.getComparison(propId, payoutAvg);
    res.json(comparison);
  } catch (error: any) {
    console.error('Error fetching booking monitor data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Vercel Cron (HTTP GET) and manual trigger endpoint
app.get('/api/booking-monitor/sync', async (req: Request, res: Response) => {
  const { propertyId, operatorPayoutAvg } = req.query;
  try {
    const propId = (propertyId as string) || 'prop_ovruc_deluxe';
    const payoutAvg = operatorPayoutAvg ? Number(operatorPayoutAvg) : 1450;
    console.log('[CRON/GET] Running Booking.com sync for:', propId);
    await BookingScraperService.syncBookingPrice(propId);
    const comparison = await BookingScraperService.getComparison(propId, payoutAvg);
    res.json(comparison);
  } catch (error: any) {
    console.error('Error syncing booking price (cron/get):', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/booking-monitor/sync', async (req: Request, res: Response) => {
  const { propertyId, operatorPayoutAvg } = req.body;
  try {
    const propId = propertyId || 'prop_ovruc_deluxe';
    const payoutAvg = operatorPayoutAvg ? Number(operatorPayoutAvg) : 1450;
    await BookingScraperService.syncBookingPrice(propId);
    const comparison = await BookingScraperService.getComparison(propId, payoutAvg);
    res.json(comparison);
  } catch (error: any) {
    console.error('Error syncing booking price:', error);
    res.status(500).json({ error: error.message });
  }
});

// Automated daily background sync (every 24 hours) for long-running Node processes (skip in serverless/Vercel)
if (!process.env.VERCEL) {
  setInterval(async () => {
    try {
      console.log('[SCHEDULER] Daily automatic sync for Booking.com Apartmán Deluxe...');
      await BookingScraperService.syncBookingPrice('prop_ovruc_deluxe');
    } catch (err) {
      console.warn('[SCHEDULER] Daily Booking sync failed:', err);
    }
  }, 24 * 60 * 60 * 1000);
}

// ----------------------------------------------------
// Vault Documents CRUD
// ----------------------------------------------------
app.get('/api/documents', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { propertyId } = req.query;
  try {
    const docs = await dbService.getDocuments(userId, propertyId as string);
    res.json(docs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/documents', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const {
    propertyId,
    leaseId,
    name,
    category = 'tenancy',
    fileSize = '1.8 MB',
    uploadDate = new Date().toISOString().split('T')[0],
    expiryDate,
    fileUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    notes = '',
  } = req.body;

  const id = 'doc_' + Date.now();

  try {
    const created = await dbService.createDocument({
      id,
      userId,
      propertyId: propertyId || null,
      leaseId: leaseId || null,
      name,
      category,
      fileSize,
      uploadDate,
      expiryDate: expiryDate || null,
      fileUrl,
      notes,
    });
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/documents/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    const updated = await dbService.updateDocument(id, userId, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/documents/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    await dbService.deleteDocument(id, userId);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Analytics Endpoint
// ----------------------------------------------------
app.get('/api/analytics', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  try {
    const analytics = await dbService.getAnalytics(userId);
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Hotel Revenue API
// ----------------------------------------------------
app.get('/api/hotel-revenue', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { leaseId, propertyId } = req.query;
  try {
    const records = await dbService.getHotelRevenue(userId, leaseId as string, propertyId as string);
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hotel-revenue', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { leaseId, propertyId, month, revenueAmount, occupancyPercent, notes } = req.body;
  const id = 'hrev_' + Date.now();
  try {
    const upserted = await dbService.upsertHotelRevenue({
      id,
      userId,
      propertyId,
      leaseId,
      month,
      revenueAmount: Number(revenueAmount),
      occupancyPercent: occupancyPercent ? Number(occupancyPercent) : null,
      notes: notes || null,
    });
    res.status(201).json(upserted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/hotel-revenue/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { leaseId, propertyId, month, revenueAmount, occupancyPercent, notes } = req.body;
  try {
    const updated = await dbService.upsertHotelRevenue({
      id,
      userId,
      propertyId,
      leaseId,
      month,
      revenueAmount: Number(revenueAmount),
      occupancyPercent: occupancyPercent ? Number(occupancyPercent) : null,
      notes: notes || null,
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/hotel-revenue/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    await dbService.deleteHotelRevenue(id, userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`RESR, s.r.o. Server running on port ${PORT}`);
  });
}

export default app;
export { app };
