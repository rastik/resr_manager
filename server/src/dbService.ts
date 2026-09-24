import { pool, toCamelCase, toSnakeCase, supabase } from './db';

// Helpers to transparently pack and unpack extra property attributes (floor, balconyAreaSqm) into notes field
function packPropertyNotes(record: any): string {
  let existingNotes = typeof record.notes === 'string' ? record.notes : '';
  const meta: Record<string, any> = {};

  if (record.floor !== undefined && record.floor !== null && record.floor !== '') {
    meta.floor = Number(record.floor);
  }
  if (record.balconyAreaSqm !== undefined && record.balconyAreaSqm !== null && record.balconyAreaSqm !== '') {
    meta.balconyAreaSqm = Number(record.balconyAreaSqm);
  } else if (record.balcony_area_sqm !== undefined && record.balcony_area_sqm !== null && record.balcony_area_sqm !== '') {
    meta.balconyAreaSqm = Number(record.balcony_area_sqm);
  }

  // Remove existing __META__ block if present
  existingNotes = existingNotes.replace(/\n*<!--__META__:.*?-->/gs, '').trim();

  if (Object.keys(meta).length > 0) {
    const metaTag = `<!--__META__:${JSON.stringify(meta)}-->`;
    return existingNotes ? `${existingNotes}\n${metaTag}` : metaTag;
  }
  return existingNotes;
}

function unpackPropertyNotes(prop: any): any {
  if (!prop) return prop;
  let rawNotes = prop.notes || '';
  const match = rawNotes.match(/<!--__META__:(.*?)-->/s);
  if (match) {
    try {
      const meta = JSON.parse(match[1]);
      if (meta.floor !== undefined && (prop.floor === undefined || prop.floor === null)) {
        prop.floor = meta.floor;
      }
      if (meta.balconyAreaSqm !== undefined && (prop.balconyAreaSqm === undefined || prop.balconyAreaSqm === null || prop.balcony_area_sqm === undefined || prop.balcony_area_sqm === null)) {
        prop.balconyAreaSqm = meta.balconyAreaSqm;
        prop.balcony_area_sqm = meta.balconyAreaSqm;
      }
      prop.notes = rawNotes.replace(/\n*<!--__META__:.*?-->/gs, '').trim();
    } catch {}
  }
  return prop;
}

// Quick check if local Postgres is connected
let isPostgresAvailable = false;
let lastCheckTime = 0;

export async function checkPostgresConnection(): Promise<boolean> {
  const now = Date.now();
  if (now - lastCheckTime < 10000) {
    return isPostgresAvailable;
  }
  lastCheckTime = now;
  try {
    const res = await pool.query('SELECT 1');
    isPostgresAvailable = res.rowCount !== null;
  } catch {
    isPostgresAvailable = false;
  }
  return isPostgresAvailable;
}

export const dbService = {
  // Health
  async getHealth() {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        const result = await pool.query('SELECT NOW() as current_time, COUNT(*)::int as property_count FROM properties');
        return {
          status: 'healthy',
          database: 'connected (PostgreSQL Docker)',
          currentTime: result.rows[0].current_time,
          propertyCount: result.rows[0].property_count,
        };
      } catch {}
    }

    // Supabase Cloud fallback
    const { count, error } = await supabase.from('properties').select('id', { count: 'exact', head: true });
    if (!error) {
      return {
        status: 'healthy',
        database: 'connected (Supabase Cloud)',
        currentTime: new Date().toISOString(),
        propertyCount: count || 0,
      };
    }

    throw new Error('All database connections failed');
  },

  // Auth / Users
  async findUserByEmail(email: string) {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        return res.rows[0] ? toCamelCase(res.rows[0]) : null;
      } catch {}
    }
    const { data } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    return data ? toCamelCase(data) : null;
  },

  async findUserById(id: string) {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        return res.rows[0] ? toCamelCase(res.rows[0]) : null;
      } catch {}
    }
    const { data } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
    return data ? toCamelCase(data) : null;
  },

  async createUser(user: { id: string; email: string; name: string; role: string }) {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        const res = await pool.query(
          'INSERT INTO users (id, email, name, role) VALUES ($1, $2, $3, $4) RETURNING *',
          [user.id, user.email, user.name, user.role]
        );
        return toCamelCase(res.rows[0]);
      } catch {}
    }
    const { data, error } = await supabase.from('users').insert(user).select().single();
    if (error) throw error;
    return toCamelCase(data);
  },

  // Properties
  async getProperties(userId: string) {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        const result = await pool.query(
          `SELECT p.*, l.tenant_name, l.tenant_email, l.tenant_phone, l.end_date as lease_end_date 
           FROM properties p
           LEFT JOIN leases l ON p.active_lease_id = l.id
           WHERE p.user_id = $1
           ORDER BY p.created_at DESC`,
          [userId]
        );
        return toCamelCase(result.rows);
      } catch {}
    }

    const { data: props, error } = await supabase
      .from('properties')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Join active lease if needed
    const activeLeaseIds = (props || []).map((p: any) => p.active_lease_id).filter(Boolean);
    let leasesMap: Record<string, any> = {};
    if (activeLeaseIds.length > 0) {
      const { data: leases } = await supabase.from('leases').select('*').in('id', activeLeaseIds);
      if (leases) {
        leases.forEach((l: any) => { leasesMap[l.id] = l; });
      }
    }

    const enriched = (props || []).map((p: any) => {
      const l = p.active_lease_id ? leasesMap[p.active_lease_id] : null;
      const unpacked = unpackPropertyNotes(p);
      return {
        ...unpacked,
        tenant_name: l?.tenant_name || null,
        tenant_email: l?.tenant_email || null,
        tenant_phone: l?.tenant_phone || null,
        lease_end_date: l?.end_date || null,
      };
    });

    return toCamelCase(enriched);
  },

  async getPropertyDetails(id: string, userId: string) {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        const propResult = await pool.query('SELECT * FROM properties WHERE id = $1 AND user_id = $2', [id, userId]);
        if (propResult.rows.length > 0) {
          const leaseResult = await pool.query('SELECT * FROM leases WHERE property_id = $1 ORDER BY start_date DESC', [id]);
          const invResult = await pool.query('SELECT * FROM inventory_items WHERE property_id = $1 ORDER BY purchase_date DESC', [id]);
          const expResult = await pool.query('SELECT * FROM expenses WHERE property_id = $1 ORDER BY date DESC', [id]);
          const docResult = await pool.query('SELECT * FROM vault_documents WHERE property_id = $1 ORDER BY upload_date DESC', [id]);
          return {
            property: toCamelCase(unpackPropertyNotes(propResult.rows[0])),
            leases: toCamelCase(leaseResult.rows),
            inventory: toCamelCase(invResult.rows),
            expenses: toCamelCase(expResult.rows),
            documents: toCamelCase(docResult.rows),
          };
        }
      } catch {}
    }

    const { data: prop, error: ep } = await supabase.from('properties').select('*').eq('id', id).eq('user_id', userId).single();
    if (ep || !prop) return null;

    const [leases, inventory, expenses, documents] = await Promise.all([
      supabase.from('leases').select('*').eq('property_id', id).order('start_date', { ascending: false }),
      supabase.from('inventory_items').select('*').eq('property_id', id).order('purchase_date', { ascending: false }),
      supabase.from('expenses').select('*').eq('property_id', id).order('date', { ascending: false }),
      supabase.from('vault_documents').select('*').eq('property_id', id).order('upload_date', { ascending: false }),
    ]);

    return {
      property: toCamelCase(unpackPropertyNotes(prop)),
      leases: toCamelCase(leases.data || []),
      inventory: toCamelCase(inventory.data || []),
      expenses: toCamelCase(expenses.data || []),
      documents: toCamelCase(documents.data || []),
    };
  },

  async createProperty(record: any) {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        const snake = toSnakeCase(record);
        const keys = Object.keys(snake);
        const values = Object.values(snake);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const query = `INSERT INTO properties (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        const res = await pool.query(query, values);
        return toCamelCase(unpackPropertyNotes(res.rows[0]));
      } catch {}
    }

    // Prepare record with packed notes for fallback cloud compatibility
    const packedRecord = { ...record };
    packedRecord.notes = packPropertyNotes(record);

    let snake = toSnakeCase(packedRecord);
    try {
      const { data, error } = await supabase.from('properties').insert(snake).select().single();
      if (error) throw error;
      return toCamelCase(unpackPropertyNotes(data));
    } catch (err: any) {
      // If error is about missing floor or balcony_area_sqm column, strip them and retry
      if (err?.code === 'PGRST204' || /floor|balcony_area_sqm/i.test(err?.message || '')) {
        delete snake.floor;
        delete snake.balcony_area_sqm;
        const { data, error } = await supabase.from('properties').insert(snake).select().single();
        if (error) throw error;
        return toCamelCase(unpackPropertyNotes(data));
      }
      throw err;
    }
  },

  async updateProperty(id: string, userId: string, updateData: any) {
    // If updateData contains floor or balconyAreaSqm, pack it into notes
    const packedUpdate = { ...updateData };
    if (updateData.floor !== undefined || updateData.balconyAreaSqm !== undefined || updateData.balcony_area_sqm !== undefined) {
      // First fetch current notes if not provided in updateData
      let currentNotes = updateData.notes;
      if (currentNotes === undefined) {
        try {
          const { data: cur } = await supabase.from('properties').select('notes, floor, balcony_area_sqm').eq('id', id).single();
          currentNotes = cur?.notes || '';
          if (packedUpdate.floor === undefined && cur?.floor !== undefined) packedUpdate.floor = cur.floor;
          if (packedUpdate.balconyAreaSqm === undefined && packedUpdate.balcony_area_sqm === undefined) {
            packedUpdate.balconyAreaSqm = cur?.balcony_area_sqm;
          }
        } catch {}
      }
      packedUpdate.notes = packPropertyNotes({ ...packedUpdate, notes: currentNotes });
    }

    const snake = toSnakeCase(packedUpdate);
    delete snake.id;
    delete snake.user_id;

    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        const keys = Object.keys(snake);
        const values = Object.values(snake);
        const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
        values.push(id, userId);
        const res = await pool.query(
          `UPDATE properties SET ${setClauses} WHERE id = $${values.length - 1} AND user_id = $${values.length} RETURNING *`,
          values
        );
        if (res.rows.length > 0) return toCamelCase(unpackPropertyNotes(res.rows[0]));
      } catch {}
    }

    try {
      const { data, error } = await supabase
        .from('properties')
        .update(snake)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return toCamelCase(unpackPropertyNotes(data));
    } catch (err: any) {
      // If error is about missing schema columns, strip them and retry
      if (err?.code === 'PGRST204' || /floor|balcony_area_sqm/i.test(err?.message || '')) {
        delete snake.floor;
        delete snake.balcony_area_sqm;
        const { data, error } = await supabase
          .from('properties')
          .update(snake)
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();
        if (error) throw error;
        return toCamelCase(unpackPropertyNotes(data));
      }
      throw err;
    }
  },

  async deleteProperty(id: string, userId: string) {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        await pool.query('DELETE FROM properties WHERE id = $1 AND user_id = $2', [id, userId]);
        return true;
      } catch {}
    }
    const { error } = await supabase.from('properties').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    return true;
  },

  // Leases
  async getLeases(userId: string, propertyId?: string) {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        let query = `
          SELECT l.*, p.name as property_name, p.unit_number as property_unit
          FROM leases l
          LEFT JOIN properties p ON l.property_id = p.id
          WHERE l.user_id = $1
        `;
        const params: any[] = [userId];
        if (propertyId) {
          params.push(propertyId);
          query += ' AND l.property_id = $2';
        }
        query += ' ORDER BY l.start_date DESC';
        const res = await pool.query(query, params);
        return toCamelCase(res.rows);
      } catch {}
    }

    let q = supabase
      .from('leases')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });
    if (propertyId) {
      q = q.eq('property_id', propertyId);
    }
    const { data: rawLeases, error } = await q;
    if (error) throw error;

    const propIds = Array.from(new Set((rawLeases || []).map((l: any) => l.property_id).filter(Boolean)));
    let propsMap: Record<string, any> = {};
    if (propIds.length > 0) {
      const { data: pData } = await supabase.from('properties').select('id, name, unit_number').in('id', propIds);
      if (pData) {
        pData.forEach((p: any) => { propsMap[p.id] = p; });
      }
    }

    const formatted = (rawLeases || []).map((lease: any) => {
      const p = propsMap[lease.property_id];
      return {
        ...lease,
        property_name: p?.name || '',
        property_unit: p?.unit_number || '',
      };
    });
    return toCamelCase(formatted);
  },

  async createLease(record: any) {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        const snake = toSnakeCase(record);
        const keys = Object.keys(snake);
        const values = Object.values(snake);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const query = `INSERT INTO leases (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        const res = await pool.query(query, values);
        return toCamelCase(res.rows[0]);
      } catch {}
    }

    const snake = toSnakeCase(record);
    const { data, error } = await supabase.from('leases').insert(snake).select().single();
    if (error) throw error;
    return toCamelCase(data);
  },

  async updateLease(id: string, userId: string, updateData: any) {
    const snake = toSnakeCase(updateData);
    delete snake.id;
    delete snake.user_id;

    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        const keys = Object.keys(snake);
        const values = Object.values(snake);
        const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
        values.push(id, userId);
        const res = await pool.query(
          `UPDATE leases SET ${setClauses} WHERE id = $${values.length - 1} AND user_id = $${values.length} RETURNING *`,
          values
        );
        if (res.rows.length > 0) return toCamelCase(res.rows[0]);
      } catch {}
    }

    const { data, error } = await supabase
      .from('leases')
      .update(snake)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return toCamelCase(data);
  },

  async deleteLease(id: string, userId: string) {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        const leaseRes = await pool.query('SELECT * FROM leases WHERE id = $1 AND user_id = $2', [id, userId]);
        if (leaseRes.rows.length > 0) {
          const lease = leaseRes.rows[0];
          await pool.query('DELETE FROM leases WHERE id = $1 AND user_id = $2', [id, userId]);
          await pool.query(
            `UPDATE properties SET active_lease_id = NULL, status = 'vacant', rent_amount = 0, base_rent = NULL, utilities_amount = NULL WHERE id = $1 AND active_lease_id = $2`,
            [lease.property_id, id]
          );
          return true;
        }
      } catch {}
    }

    const { data: lease } = await supabase.from('leases').select('*').eq('id', id).eq('user_id', userId).single();
    if (lease) {
      await supabase.from('leases').delete().eq('id', id).eq('user_id', userId);
      await supabase
        .from('properties')
        .update({ active_lease_id: null, status: 'vacant', rent_amount: 0, base_rent: null, utilities_amount: null })
        .eq('id', lease.property_id)
        .eq('active_lease_id', id);
    }
    return true;
  },

  // Inventory
  async getInventory(userId: string, propertyId?: string) {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
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
        const res = await pool.query(query, params);
        return toCamelCase(res.rows);
      } catch {}
    }

    let q = supabase
      .from('inventory_items')
      .select('*, properties(name, unit_number)')
      .eq('user_id', userId)
      .order('warranty_expires_at', { ascending: true });
    if (propertyId) {
      q = q.eq('property_id', propertyId);
    }
    const { data, error } = await q;
    if (error) throw error;
    const formatted = (data || []).map((item: any) => ({
      ...item,
      property_name: item.properties?.name || '',
      property_unit: item.properties?.unit_number || '',
      properties: undefined,
    }));
    return toCamelCase(formatted);
  },

  async createInventory(record: any) {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        const snake = toSnakeCase(record);
        const keys = Object.keys(snake);
        const values = Object.values(snake);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const res = await pool.query(`INSERT INTO inventory_items (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`, values);
        return toCamelCase(res.rows[0]);
      } catch {}
    }

    const snake = toSnakeCase(record);
    const { data, error } = await supabase.from('inventory_items').insert(snake).select().single();
    if (error) throw error;
    return toCamelCase(data);
  },

  async updateInventory(id: string, userId: string, data: any) {
    const pgOk = await checkPostgresConnection();
    const snake = toSnakeCase(data);
    delete snake.id;
    delete snake.user_id;

    if (pgOk) {
      try {
        const keys = Object.keys(snake);
        const values = Object.values(snake);
        const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
        values.push(id, userId);
        const res = await pool.query(
          `UPDATE inventory_items SET ${setClauses} WHERE id = $${values.length - 1} AND user_id = $${values.length} RETURNING *`,
          values
        );
        if (res.rows.length > 0) return toCamelCase(res.rows[0]);
      } catch {}
    }

    const { data: updated, error } = await supabase
      .from('inventory_items')
      .update(snake)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return toCamelCase(updated);
  },

  async deleteInventory(id: string, userId: string) {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        await pool.query('DELETE FROM inventory_items WHERE id = $1 AND user_id = $2', [id, userId]);
        return true;
      } catch {}
    }
    const { error } = await supabase.from('inventory_items').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    return true;
  },

  // Expenses
  async getExpenses(userId: string, propertyId?: string) {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
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
        const res = await pool.query(query, params);
        return toCamelCase(res.rows);
      } catch {}
    }

    let q = supabase
      .from('expenses')
      .select('*, properties(name, unit_number)')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (propertyId) {
      q = q.eq('property_id', propertyId);
    }
    const { data, error } = await q;
    if (error) throw error;
    const formatted = (data || []).map((exp: any) => ({
      ...exp,
      property_name: exp.properties?.name || '',
      property_unit: exp.properties?.unit_number || '',
      properties: undefined,
    }));
    return toCamelCase(formatted);
  },

  async createExpense(record: any) {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        const snake = toSnakeCase(record);
        const keys = Object.keys(snake);
        const values = Object.values(snake);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const res = await pool.query(`INSERT INTO expenses (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`, values);
        return toCamelCase(res.rows[0]);
      } catch {}
    }

    const snake = toSnakeCase(record);
    const { data, error } = await supabase.from('expenses').insert(snake).select().single();
    if (error) throw error;
    return toCamelCase(data);
  },

  async deleteExpense(id: string, userId: string) {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [id, userId]);
        return true;
      } catch {}
    }
    const { error } = await supabase.from('expenses').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    return true;
  },

  // Market Comps
  async getMarketComps() {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        const res = await pool.query('SELECT * FROM market_comps ORDER BY neighborhood ASC');
        return toCamelCase(res.rows);
      } catch {}
    }
    const { data, error } = await supabase.from('market_comps').select('*').order('neighborhood', { ascending: true });
    if (error) throw error;
    return toCamelCase(data || []);
  },

  // Vault Documents
  async getDocuments(userId: string, propertyId?: string) {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
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
        const res = await pool.query(query, params);
        return toCamelCase(res.rows);
      } catch {}
    }

    let q = supabase
      .from('vault_documents')
      .select('*, properties(name, unit_number), leases(tenant_name)')
      .eq('user_id', userId)
      .order('upload_date', { ascending: false });
    if (propertyId) {
      q = q.eq('property_id', propertyId);
    }
    const { data, error } = await q;
    if (error) throw error;
    const formatted = (data || []).map((doc: any) => ({
      ...doc,
      property_name: doc.properties?.name || null,
      property_unit: doc.properties?.unit_number || null,
      tenant_name: doc.leases?.tenant_name || null,
      properties: undefined,
      leases: undefined,
    }));
    return toCamelCase(formatted);
  },

  async createDocument(record: any) {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        const snake = toSnakeCase(record);
        const keys = Object.keys(snake);
        const values = Object.values(snake);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const res = await pool.query(`INSERT INTO vault_documents (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`, values);
        return toCamelCase(res.rows[0]);
      } catch {}
    }

    const snake = toSnakeCase(record);
    const { data, error } = await supabase.from('vault_documents').insert(snake).select().single();
    if (error) throw error;
    return toCamelCase(data);
  },

  async updateDocument(id: string, userId: string, data: any) {
    const pgOk = await checkPostgresConnection();
    const snake = toSnakeCase(data);
    delete snake.id;
    delete snake.user_id;

    if (pgOk) {
      try {
        const keys = Object.keys(snake);
        const values = Object.values(snake);
        const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
        values.push(id, userId);
        const res = await pool.query(
          `UPDATE vault_documents SET ${setClauses} WHERE id = $${values.length - 1} AND user_id = $${values.length} RETURNING *`,
          values
        );
        if (res.rows.length > 0) return toCamelCase(res.rows[0]);
      } catch {}
    }

    const { data: updated, error } = await supabase
      .from('vault_documents')
      .update(snake)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return toCamelCase(updated);
  },

  async deleteDocument(id: string, userId: string) {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        await pool.query('DELETE FROM vault_documents WHERE id = $1 AND user_id = $2', [id, userId]);
        return true;
      } catch {}
    }
    const { error } = await supabase.from('vault_documents').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    return true;
  },

  // Hotel Revenue
  async getHotelRevenue(userId: string, leaseId?: string, propertyId?: string) {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
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
        const res = await pool.query(query, params);
        return toCamelCase(res.rows);
      } catch {}
    }

    let q = supabase.from('hotel_revenue').select('*').eq('user_id', userId).order('month', { ascending: false });
    if (leaseId) q = q.eq('lease_id', leaseId);
    if (propertyId) q = q.eq('property_id', propertyId);
    const { data, error } = await q;
    if (error) throw error;
    return toCamelCase(data || []);
  },

  async upsertHotelRevenue(record: any) {
    const snake = toSnakeCase(record);
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        const res = await pool.query(
          `INSERT INTO hotel_revenue (id, user_id, property_id, lease_id, month, revenue_amount, occupancy_percent, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (lease_id, month) DO UPDATE SET
             revenue_amount = EXCLUDED.revenue_amount,
             occupancy_percent = EXCLUDED.occupancy_percent,
             notes = EXCLUDED.notes
           RETURNING *`,
          [snake.id, snake.user_id, snake.property_id, snake.lease_id, snake.month, snake.revenue_amount, snake.occupancy_percent, snake.notes]
        );
        return toCamelCase(res.rows[0]);
      } catch {}
    }

    const { data, error } = await supabase
      .from('hotel_revenue')
      .upsert(snake, { onConflict: 'lease_id,month' })
      .select()
      .single();
    if (error) throw error;
    return toCamelCase(data);
  },

  async deleteHotelRevenue(id: string, userId: string) {
    const pgOk = await checkPostgresConnection();
    if (pgOk) {
      try {
        await pool.query('DELETE FROM hotel_revenue WHERE id = $1 AND user_id = $2', [id, userId]);
        return true;
      } catch {}
    }
    const { error } = await supabase.from('hotel_revenue').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    return true;
  },

  // Analytics
  async getAnalytics(userId: string) {
    const props = await this.getProperties(userId);
    const expenses = await this.getExpenses(userId);
    const leases = await this.getLeases(userId);

    const totalUnits = props.length;
    const occupiedUnits = props.filter((p: any) => p.status === 'occupied').length;
    const vacantUnits = props.filter((p: any) => p.status === 'vacant').length;
    const maintenanceUnits = 0;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

    const monthlyGrossRent = props
      .filter((p: any) => p.status === 'occupied')
      .reduce((sum: number, p: any) => sum + (Number(p.rentAmount) || 0), 0);

    const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

    const now = new Date();
    const day30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const day60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const day90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    const upcomingLeases = leases.filter((l: any) => l.status === 'active' && l.endDate >= todayStr);
    const expiringIn30Days = upcomingLeases.filter((l: any) => l.endDate <= day30);
    const expiringIn60Days = upcomingLeases.filter((l: any) => l.endDate <= day60);
    const expiringIn90Days = upcomingLeases.filter((l: any) => l.endDate <= day90);

    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    const cashFlowData = months.map((m, idx) => {
      const rentFactor = 0.9 + idx * 0.02;
      const gross = Math.round(monthlyGrossRent * rentFactor);
      const exp = Math.round(totalExpenses * (0.15 + (idx % 3) * 0.05));
      return {
        month: m,
        income: gross,
        expenses: exp,
        netCashflow: gross - exp,
      };
    });

    return {
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
    };
  },

  // Seed default data if Supabase has 0 properties
  async seedInitialDataIfEmpty(userId: string, initialProps: any[], initialLeasesList: any[], initialInv: any[], initialExp: any[], initialComps: any[], initialDocs: any[]) {
    try {
      const { count } = await supabase.from('properties').select('id', { count: 'exact', head: true });
      if (count && count > 0) return;

      console.log('Seeding initial portfolio data into Supabase Cloud...');
      // 1. Ensure user
      await supabase.from('users').upsert({
        id: userId,
        email: 'alex.vance@resr.sk',
        name: 'Alex Vance (Portfolio Owner)',
        role: 'landlord',
      });

      // 2. Insert Properties (temporarily active_lease_id null to avoid foreign key cycle)
      const propsToInsert = initialProps.map(p => {
        const snake = toSnakeCase(p);
        snake.active_lease_id = null;
        return snake;
      });
      await supabase.from('properties').upsert(propsToInsert);

      // 3. Insert Leases
      const leasesToInsert = initialLeasesList.map(l => toSnakeCase(l));
      await supabase.from('leases').upsert(leasesToInsert);

      // 4. Update Properties with active_lease_id
      for (const p of initialProps) {
        if (p.activeLeaseId) {
          await supabase.from('properties').update({ active_lease_id: p.activeLeaseId }).eq('id', p.id);
        }
      }

      // 5. Insert Inventory
      if (initialInv.length > 0) {
        await supabase.from('inventory_items').upsert(initialInv.map(i => toSnakeCase(i)));
      }

      // 6. Insert Expenses
      if (initialExp.length > 0) {
        await supabase.from('expenses').upsert(initialExp.map(e => toSnakeCase(e)));
      }

      // 7. Insert Market Comps
      if (initialComps.length > 0) {
        await supabase.from('market_comps').upsert(initialComps.map(c => toSnakeCase(c)));
      }

      // 8. Insert Documents
      if (initialDocs.length > 0) {
        await supabase.from('vault_documents').upsert(initialDocs.map(d => toSnakeCase(d)));
      }

      console.log('Successfully seeded portfolio data into Supabase Cloud!');
    } catch (err: any) {
      console.error('Failed to seed initial data:', err.message);
    }
  }
};
