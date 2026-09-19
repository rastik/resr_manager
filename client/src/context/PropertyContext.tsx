import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Property,
  Lease,
  InventoryItem,
  Expense,
  MarketComp,
  VaultDocument,
  PortfolioAnalytics,
  PropertyStatus,
} from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface PropertyContextType {
  properties: Property[];
  leases: Lease[];
  inventory: InventoryItem[];
  expenses: Expense[];
  marketComps: MarketComp[];
  documents: VaultDocument[];
  analytics: PortfolioAnalytics | null;
  loading: boolean;
  selectedProperty: Property | null;
  setSelectedPropertyId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: PropertyStatus | 'all';
  setStatusFilter: (status: PropertyStatus | 'all') => void;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  // CRUD
  addProperty: (data: Partial<Property>) => Promise<Property>;
  updateProperty: (id: string, data: Partial<Property>) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
  addLease: (data: Partial<Lease>) => Promise<Lease>;
  updateLease: (id: string, data: Partial<Lease>) => Promise<void>;
  deleteLease: (id: string) => Promise<void>;
  addInventoryItem: (data: Partial<InventoryItem>) => Promise<InventoryItem>;
  deleteInventoryItem: (id: string) => Promise<void>;
  addExpense: (data: Partial<Expense>) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;
  addDocument: (data: Partial<VaultDocument>) => Promise<VaultDocument>;
  deleteDocument: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [properties, setProperties] = useState<Property[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [marketComps, setMarketComps] = useState<MarketComp[]>([]);
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [analytics, setAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | 'all'>('all');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = 'toast_' + Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [props, lss, inv, exp, comps, docs, anl] = await Promise.all([
        api.getProperties(),
        api.getLeases(),
        api.getInventory(),
        api.getExpenses(),
        api.getMarketComps(),
        api.getDocuments(),
        api.getAnalytics(),
      ]);

      setProperties(props);
      setLeases(lss);
      setInventory(inv);
      setExpenses(exp);
      setMarketComps(comps);
      setDocuments(docs);
      setAnalytics(anl);
    } catch (err: any) {
      console.error('Failed to load portfolio data', err);
      showToast('Error syncing with database', 'error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // CRUD Implementations with optimistic UI
  const addProperty = async (data: Partial<Property>): Promise<Property> => {
    const created = await api.createProperty(data);
    setProperties(prev => [created, ...prev]);
    showToast(`Byt ${created.unitNumber} (${created.name}) bol úspešne vytvorený!`);
    refreshData();
    return created;
  };

  const updateProperty = async (id: string, data: Partial<Property>) => {
    setProperties(prev => prev.map(p => (p.id === id ? { ...p, ...data } : p)));
    await api.updateProperty(id, data);
    showToast('Údaje nehnuteľnosti boli upravené');
    refreshData();
  };

  const deleteProperty = async (id: string) => {
    setProperties(prev => prev.filter(p => p.id !== id));
    if (selectedPropertyId === id) setSelectedPropertyId(null);
    await api.deleteProperty(id);
    showToast('Nehnuteľnosť bola odstránená', 'info');
    refreshData();
  };

  const addLease = async (data: Partial<Lease>): Promise<Lease> => {
    const created = await api.createLease(data);
    setLeases(prev => [created, ...prev]);
    showToast(`Nová zmluva pre nájomcu ${created.tenantName} bola zaevidovaná!`);
    refreshData();
    return created;
  };

  const updateLease = async (id: string, data: Partial<Lease>) => {
    await api.updateLease(id, data);
    showToast('Nájomná zmluva bola úspešne upravená');
    refreshData();
  };

  const deleteLease = async (id: string) => {
    await api.deleteLease(id);
    showToast('Nájomná zmluva bola vymazaná', 'info');
    refreshData();
  };

  const addInventoryItem = async (data: Partial<InventoryItem>): Promise<InventoryItem> => {
    const created = await api.createInventoryItem(data);
    setInventory(prev => [created, ...prev]);
    showToast(`Položka ${created.name} bola pridaná do inventára`);
    refreshData();
    return created;
  };

  const deleteInventoryItem = async (id: string) => {
    setInventory(prev => prev.filter(i => i.id !== id));
    await api.deleteInventoryItem(id);
    showToast('Položka bola odstránená z inventára', 'info');
    refreshData();
  };

  const addExpense = async (data: Partial<Expense>): Promise<Expense> => {
    const created = await api.createExpense(data);
    setExpenses(prev => [created, ...prev]);
    showToast(`Zaznamenaný výdavok vo výške €${created.amount}`);
    refreshData();
    return created;
  };

  const deleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    await api.deleteExpense(id);
    showToast('Výdavok bol odstránený', 'info');
    refreshData();
  };

  const addDocument = async (data: Partial<VaultDocument>): Promise<VaultDocument> => {
    const created = await api.createDocument(data);
    setDocuments(prev => [created, ...prev]);
    showToast(`Dokument "${created.name}" bol uložený do trezora`);
    refreshData();
    return created;
  };

  const deleteDocument = async (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    await api.deleteDocument(id);
    showToast('Dokument bol vymazaný z trezora', 'info');
    refreshData();
  };

  const selectedProperty = properties.find(p => p.id === selectedPropertyId) || null;

  return (
    <PropertyContext.Provider
      value={{
        properties,
        leases,
        inventory,
        expenses,
        marketComps,
        documents,
        analytics,
        loading,
        selectedProperty,
        setSelectedPropertyId,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        toasts,
        showToast,
        removeToast,
        addProperty,
        updateProperty,
        deleteProperty,
        addLease,
        updateLease,
        deleteLease,
        addInventoryItem,
        deleteInventoryItem,
        addExpense,
        deleteExpense,
        addDocument,
        deleteDocument,
        refreshData,
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
};

export const useProperty = () => {
  const context = useContext(PropertyContext);
  if (!context) throw new Error('useProperty must be used within a PropertyProvider');
  return context;
};
