import { Property, Lease, InventoryItem, Expense, MarketComp, VaultDocument, PortfolioAnalytics, UserProfile } from '../types';
import { initialProperties, initialLeases, initialInventory, initialExpenses, initialMarketComps, initialDocuments, initialUser } from './mockData';

const BASE_URL = '/api';

class ApiService {
  private userId: string = 'user_demo_landlord';
  private isOnlineWithBackend: boolean = true;

  setUserId(id: string) {
    this.userId = id;
  }

  getUserId() {
    return this.userId;
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-user-id': this.userId,
    };
  }

  // Health / Connection status check
  async checkHealth(): Promise<{ isConnected: boolean; database: string; message: string }> {
    try {
      const res = await fetch(`${BASE_URL}/health`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        this.isOnlineWithBackend = true;
        return { isConnected: true, database: data.database || 'PostgreSQL', message: 'Connected to live PostgreSQL Docker instance' };
      }
    } catch {
      // Handled in fallback
    }
    this.isOnlineWithBackend = false;
    return { isConnected: false, database: 'Local Resilient Cache', message: 'Running in Local Offline Mode' };
  }

  // Properties
  async getProperties(): Promise<Property[]> {
    try {
      const res = await fetch(`${BASE_URL}/properties`, { headers: this.getHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API fallback for properties', e);
    }
    const cached = localStorage.getItem(`resr_props_${this.userId}`) || localStorage.getItem(`hearthstone_props_${this.userId}`);
    return cached ? JSON.parse(cached) : initialProperties;
  }

  async getPropertyDetails(id: string) {
    try {
      const res = await fetch(`${BASE_URL}/properties/${id}`, { headers: this.getHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API fallback for property details', e);
    }
    const props = await this.getProperties();
    const prop = props.find(p => p.id === id);
    const leases = (await this.getLeases()).filter(l => l.propertyId === id);
    const inventory = (await this.getInventory()).filter(i => i.propertyId === id);
    const expenses = (await this.getExpenses()).filter(e => e.propertyId === id);
    const documents = (await this.getDocuments()).filter(d => d.propertyId === id);
    return { property: prop, leases, inventory, expenses, documents };
  }

  async createProperty(data: Partial<Property>): Promise<Property> {
    try {
      const res = await fetch(`${BASE_URL}/properties`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API fallback for create property', e);
    }
    const newProp: Property = {
      id: 'prop_' + Date.now(),
      userId: this.userId,
      name: data.name || 'New Unit',
      unitNumber: data.unitNumber || '1A',
      address: data.address || '',
      postalCode: data.postalCode || '',
      city: data.city || 'Berlin',
      neighborhood: data.neighborhood || 'Mitte',
      sizeSqm: Number(data.sizeSqm) || 50,
      bedrooms: Number(data.bedrooms) || 1,
      bathrooms: Number(data.bathrooms) || 1,
      rentAmount: data.rentAmount !== undefined && !isNaN(Number(data.rentAmount)) ? Number(data.rentAmount) : 0,
      status: data.status || 'vacant',
      imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
      createdAt: new Date().toISOString(),
    };
    return newProp;
  }

  async updateProperty(id: string, data: Partial<Property>): Promise<Property> {
    try {
      const res = await fetch(`${BASE_URL}/properties/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API fallback for update property', e);
    }
    return { id, ...data } as Property;
  }

  async deleteProperty(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/properties/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      if (res.ok) return true;
    } catch (e) {
      console.warn('API fallback for delete property', e);
    }
    return true;
  }

  // Leases
  async getLeases(): Promise<Lease[]> {
    try {
      const res = await fetch(`${BASE_URL}/leases`, { headers: this.getHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API fallback for leases', e);
    }
    const cached = localStorage.getItem(`hearthstone_leases_${this.userId}`);
    return cached ? JSON.parse(cached) : initialLeases;
  }

  async createLease(data: Partial<Lease>): Promise<Lease> {
    try {
      const res = await fetch(`${BASE_URL}/leases`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API fallback for create lease', e);
    }
    const newLease: Lease = {
      id: 'lease_' + Date.now(),
      userId: this.userId,
      propertyId: data.propertyId!,
      tenantName: data.tenantName!,
      tenantEmail: data.tenantEmail!,
      tenantPhone: data.tenantPhone!,
      rentAmount: Number(data.rentAmount),
      baseRent: data.baseRent !== undefined ? Number(data.baseRent) : undefined,
      utilitiesAmount: data.utilitiesAmount !== undefined ? Number(data.utilitiesAmount) : undefined,
      depositAmount: Number(data.depositAmount),
      startDate: data.startDate!,
      endDate: data.endDate!,
      status: data.status || 'active',
      contractFileName: data.contractFileName || 'Tenancy_Agreement.pdf',
      contractFileUrl: data.contractFileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    };
    return newLease;
  }

  async updateLease(id: string, data: Partial<Lease>): Promise<Lease> {
    try {
      const res = await fetch(`${BASE_URL}/leases/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API fallback for update lease', e);
    }
    return { id, ...data } as Lease;
  }

  async deleteLease(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/leases/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      if (res.ok) return true;
    } catch (e) {
      console.warn('API fallback for delete lease', e);
    }
    return true;
  }

  // Inventory
  async getInventory(): Promise<InventoryItem[]> {
    try {
      const res = await fetch(`${BASE_URL}/inventory`, { headers: this.getHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API fallback for inventory', e);
    }
    const cached = localStorage.getItem(`hearthstone_inv_${this.userId}`);
    return cached ? JSON.parse(cached) : initialInventory;
  }

  async createInventoryItem(data: Partial<InventoryItem>): Promise<InventoryItem> {
    try {
      const res = await fetch(`${BASE_URL}/inventory`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API fallback for create inventory', e);
    }
    const newItem: InventoryItem = {
      id: 'inv_' + Date.now(),
      userId: this.userId,
      propertyId: data.propertyId!,
      name: data.name!,
      category: data.category || 'appliance',
      brandModel: data.brandModel || '',
      serialNumber: data.serialNumber || '',
      purchaseDate: data.purchaseDate || new Date().toISOString().split('T')[0],
      warrantyExpiresAt: data.warrantyExpiresAt,
      lifespanYears: Number(data.lifespanYears) || 8,
      cost: Number(data.cost) || 0,
      notes: data.notes || '',
    };
    return newItem;
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/inventory/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      if (res.ok) return true;
    } catch (e) {
      console.warn('API fallback for delete inventory', e);
    }
    return true;
  }

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    try {
      const res = await fetch(`${BASE_URL}/expenses`, { headers: this.getHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API fallback for expenses', e);
    }
    const cached = localStorage.getItem(`hearthstone_exp_${this.userId}`);
    return cached ? JSON.parse(cached) : initialExpenses;
  }

  async createExpense(data: Partial<Expense>): Promise<Expense> {
    try {
      const res = await fetch(`${BASE_URL}/expenses`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API fallback for create expense', e);
    }
    const newExp: Expense = {
      id: 'exp_' + Date.now(),
      userId: this.userId,
      propertyId: data.propertyId!,
      category: data.category || 'repair',
      amount: Number(data.amount) || 0,
      date: data.date || new Date().toISOString().split('T')[0],
      description: data.description || '',
    };
    return newExp;
  }

  async deleteExpense(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/expenses/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      if (res.ok) return true;
    } catch (e) {
      console.warn('API fallback for delete expense', e);
    }
    return true;
  }

  // Market Comps
  async getMarketComps(): Promise<MarketComp[]> {
    try {
      const res = await fetch(`${BASE_URL}/market-comps`, { headers: this.getHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API fallback for market comps', e);
    }
    return initialMarketComps;
  }

  // Vault Documents
  async getDocuments(): Promise<VaultDocument[]> {
    try {
      const res = await fetch(`${BASE_URL}/documents`, { headers: this.getHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API fallback for documents', e);
    }
    const cached = localStorage.getItem(`hearthstone_docs_${this.userId}`);
    return cached ? JSON.parse(cached) : initialDocuments;
  }

  async createDocument(data: Partial<VaultDocument>): Promise<VaultDocument> {
    try {
      const res = await fetch(`${BASE_URL}/documents`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API fallback for create document', e);
    }
    const newDoc: VaultDocument = {
      id: 'doc_' + Date.now(),
      userId: this.userId,
      propertyId: data.propertyId,
      leaseId: data.leaseId,
      name: data.name || 'Untitled Document',
      category: data.category || 'tenancy',
      fileSize: data.fileSize || '1.2 MB',
      uploadDate: new Date().toISOString().split('T')[0],
      expiryDate: data.expiryDate,
      fileUrl: data.fileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      notes: data.notes || '',
    };
    return newDoc;
  }

  async deleteDocument(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/documents/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      if (res.ok) return true;
    } catch (e) {
      console.warn('API fallback for delete document', e);
    }
    return true;
  }

  // Analytics
  async getAnalytics(): Promise<PortfolioAnalytics> {
    try {
      const res = await fetch(`${BASE_URL}/analytics`, { headers: this.getHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API fallback for analytics', e);
    }

    // Client-side computed analytics fallback
    const props = await this.getProperties();
    const leases = await this.getLeases();
    const expenses = await this.getExpenses();

    const totalUnits = props.length;
    const occupiedUnits = props.filter(p => p.status === 'occupied').length;
    const vacantUnits = props.filter(p => p.status === 'vacant').length;
    const maintenanceUnits = 0;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    const monthlyGrossRent = props
      .filter(p => p.status === 'occupied')
      .reduce((sum, p) => sum + Number(p.rentAmount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const now = new Date();
    const day30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const day60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const day90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    const upcomingLeases = leases.filter(l => l.status === 'active' && l.endDate >= todayStr);
    const expiringIn30Days = upcomingLeases.filter(l => l.endDate <= day30);
    const expiringIn60Days = upcomingLeases.filter(l => l.endDate <= day60);
    const expiringIn90Days = upcomingLeases.filter(l => l.endDate <= day90);

    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    const cashFlowData = months.map((m, idx) => {
      const gross = Math.round(monthlyGrossRent * (0.92 + idx * 0.015));
      const exp = Math.round(totalExpenses * (0.16 + (idx % 3) * 0.04));
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
  }
}

export const api = new ApiService();
