import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PropertyProvider, useProperty } from './context/PropertyContext';
import { DesktopSidebar } from './components/layout/DesktopSidebar';
import { MobileNavDock } from './components/layout/MobileNavDock';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/common/ToastContainer';
import { PortfolioOverview } from './components/dashboard/PortfolioOverview';
import { PropertyList } from './components/properties/PropertyList';
import { PropertyDetailPage } from './components/properties/PropertyDetailPage';
import { AddPropertyModal } from './components/properties/AddPropertyModal';
import { AddLeaseModal } from './components/properties/AddLeaseModal';
import { AddExpenseModal } from './components/properties/AddExpenseModal';
import { InventoryManager } from './components/inventory/InventoryManager';
import { AddInventoryModal } from './components/inventory/AddInventoryModal';
import { DocumentVault } from './components/documents/DocumentVault';
import { MarketComparator } from './components/market/MarketComparator';
import { AnalyticsView } from './components/dashboard/AnalyticsView';
import { AuthModal } from './components/auth/AuthModal';

const AppContent: React.FC = () => {
  const { user, toggleDemoMode, login } = useAuth();
  const { selectedProperty, setSelectedPropertyId } = useProperty();

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [breadcrumbSource, setBreadcrumbSource] = useState<string>('dashboard');

  const handleSelectProperty = (id: string, fromTab: string = activeTab) => {
    setBreadcrumbSource(fromTab);
    setSelectedPropertyId(id);
  };

  const handleTabChange = (tab: string) => {
    setSelectedPropertyId(null);
    setActiveTab(tab);
  };

  // Modals state
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState<boolean>(false);
  const [isAddLeaseOpen, setIsAddLeaseOpen] = useState<boolean>(false);
  const [targetLeasePropertyId, setTargetLeasePropertyId] = useState<string | undefined>(undefined);
  const [isAddInventoryOpen, setIsAddInventoryOpen] = useState<boolean>(false);
  const [targetInventoryPropertyId, setTargetInventoryPropertyId] = useState<string | undefined>(undefined);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState<boolean>(false);
  const [targetExpensePropertyId, setTargetExpensePropertyId] = useState<string | undefined>(undefined);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);

  // Keyboard shortcuts (Cmd+N, Cmd+M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsAddPropertyOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsAddExpenseOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenAddLease = (propertyId?: string) => {
    setTargetLeasePropertyId(propertyId);
    setIsAddLeaseOpen(true);
  };

  const handleOpenAddInventory = (propertyId?: string) => {
    setTargetInventoryPropertyId(propertyId);
    setIsAddInventoryOpen(true);
  };

  const handleOpenAddExpense = (propertyId?: string) => {
    setTargetExpensePropertyId(propertyId);
    setIsAddExpenseOpen(true);
  };

  const getBreadcrumbTitle = (source: string) => {
    switch (source) {
      case 'analytics':
        return 'Analytika';
      case 'properties':
        return 'Nehnuteľnosti';
      case 'inventory':
        return 'Inventár';
      case 'market':
        return 'Trhové porovnanie';
      default:
        return 'Prehľad';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-2xl space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-950 tracking-tight">
              RESR, s.r.o.
            </h1>
            <p className="text-xs text-slate-500">
              Správa nehnuteľností, bytov a zmlúv
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
            Boli ste úspešne odhlásený zo systému. Pre pokračovanie v práci sa prosím prihláste.
          </div>

          <button
            type="button"
            onClick={() => toggleDemoMode()}
            className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-850 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition cursor-pointer"
          >
            Prihlásiť sa do systému
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500/20 selection:text-emerald-900">
      {/* Desktop Persistent Left Sidebar */}
      <DesktopSidebar
        activeTab={selectedProperty ? '' : activeTab}
        setActiveTab={handleTabChange}
        onOpenAddProperty={() => setIsAddPropertyOpen(true)}
        onOpenAddExpense={() => handleOpenAddExpense()}
        onSelectProperty={id => handleSelectProperty(id, activeTab || 'dashboard')}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main Workspace Frame */}
      <div className={`flex-1 flex flex-col min-w-0 ${selectedProperty ? 'pb-8' : 'pb-20 md:pb-8'}`}>
        {/* Top Header */}
        <Header
          activeTab={selectedProperty ? 'properties' : activeTab}
          onOpenAddProperty={() => setIsAddPropertyOpen(true)}
          onOpenAddExpense={() => handleOpenAddExpense()}
          onOpenAuth={() => setIsAuthOpen(true)}
        />

        {/* Dynamic Module Page Body */}
        <main className={`flex-1 w-full max-w-none ${selectedProperty ? 'p-0' : 'p-4 sm:p-6 px-4 sm:px-8'}`}>
          {selectedProperty ? (
            <PropertyDetailPage
              property={selectedProperty}
              fromTabTitle={getBreadcrumbTitle(breadcrumbSource)}
              onBack={() => setSelectedPropertyId(null)}
              onOpenAddLease={handleOpenAddLease}
              onOpenAddInventory={handleOpenAddInventory}
              onOpenAddExpense={handleOpenAddExpense}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <PortfolioOverview
                  onSelectProperty={id => handleSelectProperty(id, 'dashboard')}
                  onOpenAddProperty={() => setIsAddPropertyOpen(true)}
                  onOpenAddExpense={() => handleOpenAddExpense()}
                  onNavigateToTab={handleTabChange}
                />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsView
                  onSelectProperty={id => handleSelectProperty(id, 'analytics')}
                  onNavigateToTab={handleTabChange}
                />
              )}

              {activeTab === 'properties' && (
                <PropertyList
                  onSelectProperty={id => handleSelectProperty(id, 'properties')}
                  onOpenAddProperty={() => setIsAddPropertyOpen(true)}
                />
              )}

              {activeTab === 'inventory' && (
                <InventoryManager
                  onOpenAddInventory={handleOpenAddInventory}
                  onSelectProperty={id => handleSelectProperty(id, 'inventory')}
                />
              )}

              {activeTab === 'documents' && <DocumentVault />}

              {activeTab === 'market' && (
                <MarketComparator onSelectProperty={id => handleSelectProperty(id, 'market')} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Dock */}
      <MobileNavDock
        activeTab={selectedProperty ? '' : activeTab}
        setActiveTab={handleTabChange}
        onOpenQuickAction={() => setIsAddPropertyOpen(true)}
      />

      <AddPropertyModal
        isOpen={isAddPropertyOpen}
        onClose={() => setIsAddPropertyOpen(false)}
      />

      <AddLeaseModal
        isOpen={isAddLeaseOpen}
        onClose={() => setIsAddLeaseOpen(false)}
        defaultPropertyId={targetLeasePropertyId}
      />

      <AddInventoryModal
        isOpen={isAddInventoryOpen}
        onClose={() => setIsAddInventoryOpen(false)}
        defaultPropertyId={targetInventoryPropertyId}
      />

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        defaultPropertyId={targetExpensePropertyId}
      />

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Global Notifications */}
      <ToastContainer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <PropertyProvider>
        <AppContent />
      </PropertyProvider>
    </AuthProvider>
  );
};

export default App;
