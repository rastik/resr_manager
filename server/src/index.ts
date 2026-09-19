import express, { Request, Response } from 'express';
import cors from 'cors';
import { pool, toCamelCase } from './db';
import { NehnutelnostiService } from './services/nehnutelnostiService';
import { ComparatorEngine, TargetPropertyCriteria } from './services/comparatorEngine';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Helper for extracting active user ID (defaults to demo user if not supplied)
function getUserId(req: Request): string {
  return (req.headers['x-user-id'] as string) || 'user_demo_landlord';
}

// Auto-migration to ensure columns exist and expired leases are synced
async function syncExpiredLeases() {
  try {
    // 1. Mark active leases whose end_date < CURRENT_DATE as 'expired'
    await pool.query(`
      UPDATE leases 
      SET status = 'expired' 
      WHERE status = 'active' AND end_date IS NOT NULL AND end_date < CURRENT_DATE
    `);

    // 2. For properties whose active_lease_id is expired, clear or switch
    await pool.query(`
      UPDATE properties p
      SET active_lease_id = NULL,
          status = 'vacant',
          rent_amount = 0,
          base_rent = NULL,
          utilities_amount = NULL
      WHERE p.active_lease_id IN (
        SELECT id FROM leases WHERE end_date IS NOT NULL AND end_date < CURRENT_DATE
      )
      AND NOT EXISTS (
        SELECT 1 FROM leases l2 
        WHERE l2.property_id = p.id 
          AND l2.status = 'active' 
          AND (l2.end_date IS NULL OR l2.end_date >= CURRENT_DATE)
      )
    `);

    // 3. For properties marked 'occupied' but with no active non-expired lease
    await pool.query(`
      UPDATE properties p
      SET active_lease_id = NULL,
          status = 'vacant',
          rent_amount = 0,
          base_rent = NULL,
          utilities_amount = NULL
      WHERE p.status = 'occupied'
      AND NOT EXISTS (
        SELECT 1 FROM leases l2 
        WHERE l2.property_id = p.id 
          AND l2.status = 'active' 
          AND (l2.end_date IS NULL OR l2.end_date >= CURRENT_DATE)
      )
    `);
  } catch (err: any) {
    console.error('Error syncing expired leases:', err.message);
  }
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
    await syncExpiredLeases();
  } catch (err: any) {
    console.warn('DB schema check notice:', err.message);
  }
}
initDb();

// ----------------------------------------------------
// Health Check & DB Status
// ----------------------------------------------------
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, COUNT(*)::int as property_count FROM properties');
    res.json({
      status: 'healthy',
      database: 'connected (PostgreSQL)',
      currentTime: result.rows[0].current_time,
      propertyCount: result.rows[0].property_count,
    });
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
    let result = await pool.query('SELECT * FROM users WHERE email = $1', [email || 'alex.vance@resr.sk']);
    if (result.rows.length === 0) {
      // Auto-create user for frictionless onboarding
      const newId = 'user_' + Date.now();
      const userName = email ? email.split('@')[0] : 'Landlord';
      result = await pool.query(
        'INSERT INTO users (id, email, name, role) VALUES ($1, $2, $3, $4) RETURNING *',
        [newId, email || 'demo@resr.sk', userName, 'landlord']
      );
    }
    res.json({ user: toCamelCase(result.rows[0]) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length > 0) {
      res.json({ user: toCamelCase(result.rows[0]) });
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
    await syncExpiredLeases();
    const result = await pool.query(
      `SELECT p.*, l.tenant_name, l.tenant_email, l.tenant_phone, l.end_date as lease_end_date 
       FROM properties p
       LEFT JOIN leases l ON p.active_lease_id = l.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );
    res.json(toCamelCase(result.rows));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/properties/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    const propResult = await pool.query(
      'SELECT * FROM properties WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (propResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const leaseResult = await pool.query(
      'SELECT * FROM leases WHERE property_id = $1 ORDER BY start_date DESC',
      [id]
    );

    const invResult = await pool.query(
      'SELECT * FROM inventory_items WHERE property_id = $1 ORDER BY purchase_date DESC',
      [id]
    );

    const expResult = await pool.query(
      'SELECT * FROM expenses WHERE property_id = $1 ORDER BY date DESC',
      [id]
    );

    const docResult = await pool.query(
      'SELECT * FROM vault_documents WHERE property_id = $1 ORDER BY upload_date DESC',
      [id]
    );

    res.json({
      property: toCamelCase(propResult.rows[0]),
      leases: toCamelCase(leaseResult.rows),
      inventory: toCamelCase(invResult.rows),
      expenses: toCamelCase(expResult.rows),
      documents: toCamelCase(docResult.rows),
    });
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
    const result = await pool.query(
      `INSERT INTO properties 
       (id, user_id, name, unit_number, address, postal_code, city, neighborhood, size_sqm, bedrooms, bathrooms, rent_amount, status, image_url, has_cellar, cellar_area_sqm, cellar_number, has_parking, parking_spot_number, photos, notes, property_type, base_rent, utilities_amount, has_ac, has_balcony, furnishing_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
       RETURNING *`,
      [
        id,
        userId,
        name,
        unitNumber,
        address,
        postalCode,
        city,
        neighborhood || '',
        Number(sizeSqm) || 50,
        Number(bedrooms) || 1,
        Number(bathrooms) || 1,
        numRent,
        status,
        imageUrl,
        Boolean(hasCellar),
        cellarAreaSqm !== undefined && cellarAreaSqm !== '' ? Number(cellarAreaSqm) : null,
        cellarNumber || null,
        Boolean(hasParking),
        parkingSpotNumber || null,
        initialPhotos,
        notes || '',
        propertyType || 'apartment',
        numBase,
        numUtils,
        Boolean(hasAC),
        Boolean(hasBalcony),
        furnishingStatus || 'furnished',
      ]
    );
    res.status(201).json(toCamelCase(result.rows[0]));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/properties/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
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
    status,
    activeLeaseId,
    imageUrl,
    hasCellar,
    cellarAreaSqm,
    cellarNumber,
    hasParking,
    parkingSpotNumber,
    photos,
    notes,
    propertyType,
    hasAC,
    hasBalcony,
    furnishingStatus,
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE properties
       SET name = COALESCE($1, name),
           unit_number = COALESCE($2, unit_number),
           address = COALESCE($3, address),
           postal_code = COALESCE($4, postal_code),
           city = COALESCE($5, city),
           neighborhood = COALESCE($6, neighborhood),
           size_sqm = COALESCE($7, size_sqm),
           bedrooms = COALESCE($8, bedrooms),
           bathrooms = COALESCE($9, bathrooms),
           rent_amount = COALESCE($10, rent_amount),
           status = COALESCE($11, status),
           active_lease_id = COALESCE($12, active_lease_id),
           image_url = COALESCE($13, image_url),
           has_cellar = COALESCE($14, has_cellar),
           cellar_area_sqm = COALESCE($15, cellar_area_sqm),
           cellar_number = COALESCE($16, cellar_number),
           has_parking = COALESCE($17, has_parking),
           parking_spot_number = COALESCE($18, parking_spot_number),
           photos = COALESCE($19, photos),
           notes = COALESCE($20, notes),
           property_type = COALESCE($21, property_type),
           base_rent = COALESCE($22, base_rent),
           utilities_amount = COALESCE($23, utilities_amount),
           has_ac = COALESCE($24, has_ac),
           has_balcony = COALESCE($25, has_balcony),
           furnishing_status = COALESCE($26, furnishing_status)
       WHERE id = $27 AND user_id = $28
       RETURNING *`,
      [
        name,
        unitNumber,
        address,
        postalCode,
        city,
        neighborhood,
        sizeSqm !== undefined ? Number(sizeSqm) : null,
        bedrooms !== undefined ? Number(bedrooms) : null,
        bathrooms !== undefined ? Number(bathrooms) : null,
        rentAmount !== undefined ? Number(rentAmount) : null,
        status,
        activeLeaseId,
        imageUrl,
        hasCellar !== undefined ? Boolean(hasCellar) : null,
        cellarAreaSqm !== undefined ? (cellarAreaSqm !== '' ? Number(cellarAreaSqm) : null) : null,
        cellarNumber,
        hasParking !== undefined ? Boolean(hasParking) : null,
        parkingSpotNumber,
        photos,
        notes,
        propertyType,
        baseRent !== undefined ? Number(baseRent) : null,
        utilitiesAmount !== undefined ? Number(utilitiesAmount) : null,
        hasAC !== undefined ? Boolean(hasAC) : null,
        hasBalcony !== undefined ? Boolean(hasBalcony) : null,
        furnishingStatus,
        id,
        userId,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json(toCamelCase(result.rows[0]));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/properties/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM properties WHERE id = $1 AND user_id = $2', [id, userId]);
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
    await syncExpiredLeases();
    let query = 'SELECT * FROM leases WHERE user_id = $1';
    const params: any[] = [userId];
    if (propertyId) {
      params.push(propertyId);
      query += ' AND property_id = $2';
    }
    query += ' ORDER BY start_date DESC';
    const result = await pool.query(query, params);
    res.json(toCamelCase(result.rows));
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
    const result = await pool.query(
      `INSERT INTO leases
       (id, user_id, property_id, lease_type, operator_company, tenant_name, tenant_email, tenant_phone, rent_amount, base_rent, utilities_amount, deposit_amount, start_date, end_date, status, contract_file_name, contract_file_url, move_in_photos)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        id,
        userId,
        propertyId,
        leaseType || 'standard',
        operatorCompany || null,
        tenantName,
        tenantEmail,
        tenantPhone,
        numRent,
        numBase,
        numUtils,
        Number(depositAmount) || 0,
        cleanStartDate,
        cleanEndDate,
        computedStatus,
        contractFileName,
        contractFileUrl,
        moveInPhotos || [],
      ]
    );

    // If active and not expired, update property activeLeaseId and status to 'occupied' and save rent amounts
    if (computedStatus === 'active') {
      await pool.query(
        `UPDATE properties 
         SET active_lease_id = $1, status = 'occupied', rent_amount = $2, base_rent = $3, utilities_amount = $4 
         WHERE id = $5`,
        [id, numRent, numBase, numUtils, propertyId]
      );
    }

    res.status(201).json(toCamelCase(result.rows[0]));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/leases/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const {
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
    status,
    contractFileName,
    contractFileUrl,
    moveInPhotos,
  } = req.body;

  try {
    const numBase = baseRent !== undefined && baseRent !== null && !isNaN(Number(baseRent)) ? Number(baseRent) : null;
    const numUtils = utilitiesAmount !== undefined && utilitiesAmount !== null && !isNaN(Number(utilitiesAmount)) ? Number(utilitiesAmount) : null;
    const numRent = rentAmount !== undefined && rentAmount !== null && !isNaN(Number(rentAmount))
      ? Number(rentAmount)
      : (numBase !== null || numUtils !== null ? (numBase || 0) + (numUtils || 0) : null);

    const cleanStartDate = startDate ? String(startDate).split('T')[0] : null;
    const cleanEndDate = endDate ? String(endDate).split('T')[0] : null;

    const todayStr = new Date().toISOString().split('T')[0];
    let computedStatus = status;
    if (cleanEndDate) {
      if (cleanEndDate < todayStr) {
        computedStatus = 'expired';
      } else if (!status || status === 'expired') {
        computedStatus = 'active';
      }
    }

    const hasContractName = contractFileName !== undefined;
    const hasContractUrl = contractFileUrl !== undefined;
    const hasMoveInPhotos = moveInPhotos !== undefined;
    const hasOperatorCompany = operatorCompany !== undefined;

    const result = await pool.query(
      `UPDATE leases
       SET tenant_name = COALESCE($1, tenant_name),
           tenant_email = COALESCE($2, tenant_email),
           tenant_phone = COALESCE($3, tenant_phone),
           rent_amount = COALESCE($4, rent_amount),
           deposit_amount = COALESCE($5, deposit_amount),
           start_date = COALESCE($6, start_date),
           end_date = COALESCE($7, end_date),
           status = COALESCE($8, status),
           base_rent = COALESCE($9, base_rent),
           utilities_amount = COALESCE($10, utilities_amount),
           contract_file_name = CASE WHEN $13 = true THEN $14 ELSE contract_file_name END,
           contract_file_url = CASE WHEN $15 = true THEN $16 ELSE contract_file_url END,
           move_in_photos = CASE WHEN $17 = true THEN $18 ELSE move_in_photos END,
           operator_company = CASE WHEN $19 = true THEN $20 ELSE operator_company END
       WHERE id = $11 AND user_id = $12
       RETURNING *`,
      [
        tenantName,
        tenantEmail,
        tenantPhone,
        numRent,
        depositAmount !== undefined ? Number(depositAmount) : null,
        cleanStartDate,
        cleanEndDate,
        computedStatus,
        numBase,
        numUtils,
        id,
        userId,
        hasContractName,
        contractFileName || null,
        hasContractUrl,
        contractFileUrl || null,
        hasMoveInPhotos,
        moveInPhotos || [],
        hasOperatorCompany,
        operatorCompany || null,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lease not found' });
    }
    const updatedLease = result.rows[0];
    if (updatedLease.status === 'active') {
      await pool.query(
        `UPDATE properties 
         SET active_lease_id = $1, status = 'occupied', rent_amount = $2, base_rent = $3, utilities_amount = $4 
         WHERE id = $5`,
        [updatedLease.id, updatedLease.rent_amount, updatedLease.base_rent, updatedLease.utilities_amount, updatedLease.property_id]
      );
    } else if (updatedLease.status === 'expired') {
      const propCheck = await pool.query('SELECT active_lease_id FROM properties WHERE id = $1', [updatedLease.property_id]);
      if (propCheck.rows.length > 0 && propCheck.rows[0].active_lease_id === id) {
        const remaining = await pool.query(
          `SELECT * FROM leases WHERE property_id = $1 AND status = 'active' AND (end_date IS NULL OR end_date >= CURRENT_DATE) ORDER BY start_date DESC LIMIT 1`,
          [updatedLease.property_id]
        );
        if (remaining.rows.length > 0) {
          const nextL = remaining.rows[0];
          await pool.query(
            `UPDATE properties SET active_lease_id = $1, status = 'occupied', rent_amount = $2, base_rent = $3, utilities_amount = $4 WHERE id = $5`,
            [nextL.id, nextL.rent_amount, nextL.base_rent, nextL.utilities_amount, updatedLease.property_id]
          );
        } else {
          await pool.query(
            `UPDATE properties SET active_lease_id = NULL, status = 'vacant', rent_amount = 0, base_rent = NULL, utilities_amount = NULL WHERE id = $1`,
            [updatedLease.property_id]
          );
        }
      }
    }
    res.json(toCamelCase(updatedLease));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/leases/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    const leaseRes = await pool.query('SELECT * FROM leases WHERE id = $1 AND user_id = $2', [id, userId]);
    if (leaseRes.rows.length === 0) {
      return res.status(404).json({ error: 'Lease not found' });
    }
    const lease = leaseRes.rows[0];

    // Delete the lease
    await pool.query('DELETE FROM leases WHERE id = $1 AND user_id = $2', [id, userId]);

    // Check if the property was linked to this lease as active_lease_id
    const propRes = await pool.query('SELECT * FROM properties WHERE id = $1 AND user_id = $2', [lease.property_id, userId]);
    if (propRes.rows.length > 0 && propRes.rows[0].active_lease_id === id) {
      // Find remaining active leases if any
      const remainingLeases = await pool.query(
        `SELECT * FROM leases WHERE property_id = $1 AND user_id = $2 AND status = 'active' ORDER BY start_date DESC LIMIT 1`,
        [lease.property_id, userId]
      );
      if (remainingLeases.rows.length > 0) {
        const nextL = remainingLeases.rows[0];
        await pool.query(
          `UPDATE properties SET active_lease_id = $1, status = 'occupied', rent_amount = $2, base_rent = $3, utilities_amount = $4 WHERE id = $5`,
          [nextL.id, nextL.rent_amount, nextL.base_rent, nextL.utilities_amount, lease.property_id]
        );
      } else {
        await pool.query(
          `UPDATE properties SET active_lease_id = NULL, status = 'vacant', rent_amount = 0, base_rent = NULL, utilities_amount = NULL WHERE id = $1`,
          [lease.property_id]
        );
      }
    }

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
    let query = `
      SELECT i.*, p.name as property_name, p.unit_number as property_unit
      FROM inventory_items i
      JOIN properties p ON i.property_id = p.id
      WHERE i.user_id = $1
    `;
    const params: any[] = [userId];
    if (propertyId) {
      params.push(propertyId);
      query += ' AND i.property_id = $2';
    }
    query += ' ORDER BY i.warranty_expires_at ASC';
    const result = await pool.query(query, params);
    res.json(toCamelCase(result.rows));
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
    const result = await pool.query(
      `INSERT INTO inventory_items
       (id, user_id, property_id, name, category, brand_model, serial_number, purchase_date, replaced_date, warranty_expires_at, lifespan_years, cost, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        id,
        userId,
        propertyId,
        name,
        category,
        brandModel || '',
        serialNumber || '',
        cleanPurchaseDate,
        replacedDate || null,
        cleanWarranty,
        Number(lifespanYears) || 8,
        numCost,
        notes || '',
      ]
    );
    res.status(201).json(toCamelCase(result.rows[0]));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/inventory/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM inventory_items WHERE id = $1 AND user_id = $2', [id, userId]);
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
    let query = `
      SELECT e.*, p.name as property_name, p.unit_number as property_unit
      FROM expenses e
      JOIN properties p ON e.property_id = p.id
      WHERE e.user_id = $1
    `;
    const params: any[] = [userId];
    if (propertyId) {
      params.push(propertyId);
      query += ' AND e.property_id = $2';
    }
    query += ' ORDER BY e.date DESC';
    const result = await pool.query(query, params);
    res.json(toCamelCase(result.rows));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/expenses', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { propertyId, category, amount, date, description } = req.body;
  const id = 'exp_' + Date.now();

  try {
    const result = await pool.query(
      `INSERT INTO expenses (id, user_id, property_id, category, amount, date, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, userId, propertyId, category, Number(amount), date, description]
    );
    res.status(201).json(toCamelCase(result.rows[0]));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/expenses/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [id, userId]);
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
    const result = await pool.query('SELECT * FROM market_comps ORDER BY neighborhood ASC');
    res.json(toCamelCase(result.rows));
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
      const propResult = await pool.query(
        'SELECT * FROM properties WHERE id = $1 AND user_id = $2',
        [propertyId, userId]
      );
      if (propResult.rows.length > 0) {
        const p = toCamelCase(propResult.rows[0]);
        const notesAndName = `${p.notes || ''} ${p.name || ''}`.toLowerCase();
        const hasAC = p.hasAc !== undefined && p.hasAc !== null ? Boolean(p.hasAc) : /klimatiz|kl[ií]m/i.test(notesAndName);
        const hasBalcony = p.hasBalcony !== undefined && p.hasBalcony !== null ? Boolean(p.hasBalcony) : /balk[oó]n|lod[zž]i|teras/i.test(notesAndName);
        const isNewBuilding = /novostavb|arboria|rezidenc|urban/i.test(notesAndName);
        const furnishingStatus = p.furnishingStatus || (/nezariaden/i.test(notesAndName) ? 'unfurnished' : 'furnished');

        // Clean city: only convert actual foreign test strings, do not convert valid Slovak cities
        let cleanCity = (city as string) || p.city || 'Trnava';
        if (cleanCity === 'Central') cleanCity = 'Trnava';

        // Clean neighborhood: do not default to Staré Mesto for Trnava or other cities
        let cleanNeighborhood = (neighborhood as string) || p.neighborhood || '';
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

    const searchCity = (city as string) || targetCriteria.city || 'Bratislava';
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
// Vault Documents CRUD
// ----------------------------------------------------
app.get('/api/documents', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { propertyId } = req.query;
  try {
    let query = `
      SELECT d.*, p.name as property_name, p.unit_number as property_unit, l.tenant_name
      FROM vault_documents d
      LEFT JOIN properties p ON d.property_id = p.id
      LEFT JOIN leases l ON d.lease_id = l.id
      WHERE d.user_id = $1
    `;
    const params: any[] = [userId];
    if (propertyId) {
      params.push(propertyId);
      query += ' AND d.property_id = $2';
    }
    query += ' ORDER BY d.upload_date DESC';
    const result = await pool.query(query, params);
    res.json(toCamelCase(result.rows));
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
    const result = await pool.query(
      `INSERT INTO vault_documents
       (id, user_id, property_id, lease_id, name, category, file_size, upload_date, expiry_date, file_url, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        id,
        userId,
        propertyId || null,
        leaseId || null,
        name,
        category,
        fileSize,
        uploadDate,
        expiryDate || null,
        fileUrl,
        notes,
      ]
    );
    res.status(201).json(toCamelCase(result.rows[0]));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/documents/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM vault_documents WHERE id = $1 AND user_id = $2', [id, userId]);
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
    // 1. Property counts
    const props = await pool.query(
      'SELECT id, status, rent_amount, size_sqm FROM properties WHERE user_id = $1',
      [userId]
    );

    const totalUnits = props.rows.length;
    const occupiedUnits = props.rows.filter(p => p.status === 'occupied').length;
    const vacantUnits = props.rows.filter(p => p.status === 'vacant').length;
    const maintenanceUnits = 0;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

    // Monthly gross rental income from occupied units
    const monthlyGrossRent = props.rows
      .filter(p => p.status === 'occupied')
      .reduce((sum, p) => sum + Number(p.rent_amount), 0);

    // Total expenses
    const expResult = await pool.query(
      'SELECT SUM(amount)::numeric as total_expenses FROM expenses WHERE user_id = $1',
      [userId]
    );
    const totalExpenses = Number(expResult.rows[0]?.total_expenses || 0);

    // Upcoming lease expirations
    const now = new Date();
    const day30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const day60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const day90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    const leasesResult = await pool.query(
      `SELECT l.*, p.name as property_name, p.unit_number as property_unit
       FROM leases l
       JOIN properties p ON l.property_id = p.id
       WHERE l.user_id = $1 AND l.status = 'active' AND l.end_date >= $2
       ORDER BY l.end_date ASC`,
      [userId, todayStr]
    );

    const upcomingLeases = leasesResult.rows.map(toCamelCase);
    const expiringIn30Days = upcomingLeases.filter(l => l.endDate <= day30);
    const expiringIn60Days = upcomingLeases.filter(l => l.endDate <= day60);
    const expiringIn90Days = upcomingLeases.filter(l => l.endDate <= day90);

    // Cash flow chart data (Last 6 months)
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    const cashFlowData = months.map((m, idx) => {
      // simulate historical trends with actual current month base
      const rentFactor = 0.9 + idx * 0.02;
      const gross = Math.round(monthlyGrossRent * rentFactor);
      const expense = Math.round(totalExpenses * (0.15 + (idx % 3) * 0.05));
      return {
        month: m,
        income: gross,
        expenses: expense,
        netCashflow: gross - expense,
      };
    });

    res.json({
      totalUnits,
      occupiedUnits,
      vacantUnits,
      maintenanceUnits,
      occupancyRate,
      monthlyGrossRent,
      totalExpenses,
      expiringIn30DaysCount: expiringIn30Days.length,
      expiringIn60DaysCount: expiringIn60Days.length,
      expiringIn90DaysCount: expiringIn90Days.length,
      upcomingLeases,
      cashFlowData,
    });
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
    let query = 'SELECT * FROM hotel_revenue WHERE user_id = $1';
    const params: any[] = [userId];
    if (leaseId) {
      params.push(leaseId);
      query += ` AND lease_id = $${params.length}`;
    }
    if (propertyId) {
      params.push(propertyId);
      query += ` AND property_id = $${params.length}`;
    }
    query += ' ORDER BY month DESC';
    const result = await pool.query(query, params);
    res.json(toCamelCase(result.rows));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hotel-revenue', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { leaseId, propertyId, month, revenueAmount, occupancyPercent, notes } = req.body;
  const id = 'hrev_' + Date.now();
  try {
    const result = await pool.query(
      `INSERT INTO hotel_revenue (id, user_id, property_id, lease_id, month, revenue_amount, occupancy_percent, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (lease_id, month) DO UPDATE SET
         revenue_amount = EXCLUDED.revenue_amount,
         occupancy_percent = EXCLUDED.occupancy_percent,
         notes = EXCLUDED.notes
       RETURNING *`,
      [id, userId, propertyId, leaseId, month, Number(revenueAmount), occupancyPercent ? Number(occupancyPercent) : null, notes || null]
    );
    res.status(201).json(toCamelCase(result.rows[0]));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/hotel-revenue/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { revenueAmount, occupancyPercent, notes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE hotel_revenue
       SET revenue_amount = COALESCE($1, revenue_amount),
           occupancy_percent = $2,
           notes = COALESCE($3, notes)
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [revenueAmount !== undefined ? Number(revenueAmount) : null, occupancyPercent !== undefined ? Number(occupancyPercent) : null, notes, id, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(toCamelCase(result.rows[0]));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/hotel-revenue/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM hotel_revenue WHERE id = $1 AND user_id = $2', [id, userId]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`RESR, s.r.o. Server running on port ${PORT}`);
});
