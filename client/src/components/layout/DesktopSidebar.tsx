import React from 'react';
import {
  LayoutDashboard,
  Home,
  Building2,
  Package,
  FileText,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { useProperty } from '../../context/PropertyContext';
import { useAuth } from '../../context/AuthContext';

interface DesktopSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAddProperty: () => void;
  onOpenAddExpense: () => void;
  onSelectProperty?: (id: string) => void;
  onOpenAuth?: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddProperty,
  onSelectProperty,
  onOpenAuth,
}) => {
  const { properties, analytics, selectedProperty, setSelectedPropertyId } = useProperty();
  const { isBackendConnected } = useAuth();

  const handlePropertyClick = (propertyId: string) => {
    if (onSelectProperty) {
      onSelectProperty(propertyId);
    } else {
      setSelectedPropertyId(propertyId);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Prehľad', icon: LayoutDashboard },
    { id: 'properties', label: 'Nehnuteľnosti', icon: Home, count: properties.length },
    { id: 'inventory', label: 'Inventár a spotrebiče', icon: Package },
    { id: 'documents', label: 'Dokumenty a zmluvy', icon: FileText },
    { id: 'analytics', label: 'Analytika a cash flow', icon: BarChart3 },
    { id: 'market', label: 'Trhové porovnanie', icon: TrendingUp },
  ];

  return (
    <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200/90 shadow-[4px_0_16px_-4px_rgba(0,0,0,0.06),1px_0_4px_-1px_rgba(0,0,0,0.03)] z-20 shrink-0 h-screen sticky top-0 select-none">
      {/* Workspace Brand Header (Click navigates to Prehľad / Dashboard) */}
      <button
        type="button"
        onClick={() => {
          setSelectedPropertyId(null);
          setActiveTab('dashboard');
        }}
        className="px-6 py-6 border-b border-slate-200 bg-white hover:bg-slate-50 transition-all duration-150 w-full cursor-pointer flex items-center justify-center group"
      >
        <h1 className="text-2xl font-black text-slate-950 tracking-tight group-hover:text-emerald-700 transition-colors text-center">
          RESR, s.r.o.
        </h1>
      </button>

      {/* Navigation & Properties List (Scrollable Area) */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4">
        {/* Main Navigation Modules */}
        <nav className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = !selectedProperty && activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedPropertyId(null);
                  setActiveTab(item.id);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* NEHNUTEĽNOSTI V SPRÁVE: BYTY A APARTMÁNY */}
        {(() => {
          const flats = properties.filter(p => (p.propertyType || 'flat') === 'flat');
          const apartments = properties.filter(p => p.propertyType === 'apartment');

          const renderPropertyItem = (property: typeof properties[0], typeLabel: string) => {
            const isSelected = selectedProperty?.id === property.id;
            const fallbackImg =
              'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80';
            const imgUrl = property.imageUrl || fallbackImg;

            return (
              <button
                key={property.id}
                onClick={() => handlePropertyClick(property.id)}
                className={`w-full flex items-center justify-between py-1 px-2 rounded-lg text-left transition-all duration-150 group ${
                  isSelected
                    ? 'bg-slate-100 border border-slate-300 shadow-2xs'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={imgUrl}
                    alt={property.name}
                    className="w-7 h-7 rounded-md object-cover border border-slate-200 shrink-0 shadow-2xs"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {typeLabel} {property.unitNumber}
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          property.status === 'occupied'
                            ? 'bg-emerald-500'
                            : 'bg-rose-500'
                        }`}
                        title={property.status === 'occupied' ? 'Prenajatý' : 'Voľný'}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 truncate leading-none mt-0.5">
                      {property.name}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-1.5">
                  {property.rentAmount && property.rentAmount > 0 ? (
                    <>
                      <span className="text-xs font-bold text-slate-900">
                        €{property.rentAmount.toLocaleString()}
                      </span>
                      <p className="text-[9px] text-slate-400 leading-none">/ mes</p>
                    </>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">Bez nájmu</span>
                  )}
                </div>
              </button>
            );
          };

          return (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              {/* Kategória 1: BYTY */}
              <div className="space-y-0.5">
                <div className="px-2 pb-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Home className="w-3 h-3" /> Byty ({flats.length})
                  </span>
                </div>

                {flats.map(p => renderPropertyItem(p, 'Byt'))}

                {flats.length === 0 && (
                  <div className="px-2 py-1 text-xs text-slate-400 italic">
                    Žiadne evidované byty.
                  </div>
                )}
              </div>

              {/* Kategória 2: APARTMÁNY */}
              <div className="space-y-0.5 pt-1.5 border-t border-slate-100">
                <div className="px-2 pb-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3 h-3" /> Apartmány ({apartments.length})
                  </span>
                </div>

                {apartments.map(p => renderPropertyItem(p, 'Apartmán'))}

                {apartments.length === 0 && (
                  <div className="px-2 py-1 text-xs text-slate-400 italic">
                    Žiadne evidované apartmány.
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Database Status Footer (Single User System) */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70">
        <button
          type="button"
          onClick={onOpenAuth}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-200/60 transition-colors text-left cursor-pointer group"
          title="Kliknutím zobrazíte stav databázy a pripojenia"
        >
          <div
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              isBackendConnected
                ? 'bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20'
                : 'bg-rose-500 ring-4 ring-rose-500/20'
            }`}
          />
          <span className="font-semibold text-sm text-slate-700 group-hover:text-slate-900 transition-colors">
            Databáza
          </span>
        </button>
      </div>
    </aside>
  );
};
