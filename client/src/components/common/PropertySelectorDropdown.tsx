import React, { useState, useRef, useEffect } from 'react';
import { Property } from '../../types';
import { ChevronDown, Check, Building2, LayoutGrid } from 'lucide-react';

interface PropertySelectorDropdownProps {
  properties: Property[];
  selectedPropertyId: string;
  onSelectPropertyId: (id: string) => void;
  allowAll?: boolean;
  allLabel?: string;
  allSubtitle?: string;
  label?: string;
  className?: string;
}

const fallbackImg =
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80';

export const PropertySelectorDropdown: React.FC<PropertySelectorDropdownProps> = ({
  properties,
  selectedPropertyId,
  onSelectPropertyId,
  allowAll = false,
  allLabel = 'Celé portfólio',
  allSubtitle = 'Všetky byty a apartmány dohromady',
  label = 'Vybrať nehnuteľnosť',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeProperty = properties.find(p => p.id === selectedPropertyId);
  const isAllSelected = allowAll && selectedPropertyId === 'all';

  // Group properties into flats and apartments similar to sidebar
  const flats = properties.filter(p => (p.propertyType || 'flat') === 'flat');
  const apartments = properties.filter(p => p.propertyType === 'apartment');

  const renderItem = (p: Property) => {
    const isSelected = selectedPropertyId === p.id;
    const imgUrl = p.imageUrl || (p.photos && p.photos[0]) || fallbackImg;
    const location = [p.address, p.city].filter(Boolean).join(', ');

    return (
      <button
        key={p.id}
        type="button"
        onClick={() => {
          onSelectPropertyId(p.id);
          setIsOpen(false);
        }}
        className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-xl transition-colors cursor-pointer group ${
          isSelected
            ? 'bg-emerald-50 text-emerald-950 font-medium'
            : 'hover:bg-slate-50 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <img
              src={imgUrl}
              alt={p.name}
              className="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-2xs"
              onError={e => {
                (e.target as HTMLImageElement).src = fallbackImg;
              }}
            />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${
                p.status === 'occupied' ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              title={p.status === 'occupied' ? 'Prenajatý' : 'Voľný'}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 truncate">
                {p.name} ({p.unitNumber})
              </span>
              <span
                className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                  p.status === 'occupied'
                    ? 'bg-emerald-100/70 text-emerald-700'
                    : 'bg-rose-100/70 text-rose-700'
                }`}
              >
                {p.status === 'occupied' ? 'Prenajatý' : 'Voľný'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate leading-none mt-1">
              {location || 'Bez adresy'}
              {p.rentAmount ? ` • €${p.rentAmount}/mes` : ''}
            </p>
          </div>
        </div>

        {isSelected && (
          <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
        )}
      </button>
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          {label}
        </span>
      )}

      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 focus:border-slate-400 rounded-xl px-3 py-2 text-left transition-all duration-150 shadow-2xs flex items-center justify-between gap-2.5 cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {isAllSelected ? (
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-600">
              <LayoutGrid className="w-4 h-4" />
            </div>
          ) : activeProperty ? (
            <div className="relative shrink-0">
              <img
                src={activeProperty.imageUrl || (activeProperty.photos && activeProperty.photos[0]) || fallbackImg}
                alt={activeProperty.name}
                className="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-2xs"
                onError={e => {
                  (e.target as HTMLImageElement).src = fallbackImg;
                }}
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${
                  activeProperty.status === 'occupied' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-400">
              <Building2 className="w-4 h-4" />
            </div>
          )}

          <div className="min-w-0">
            {isAllSelected ? (
              <>
                <span className="text-xs font-bold text-slate-900 block truncate">
                  {allLabel}
                </span>
                <span className="text-[11px] text-slate-500 block truncate leading-none mt-0.5">
                  {allSubtitle} ({properties.length} nehnuteľností)
                </span>
              </>
            ) : activeProperty ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {activeProperty.name} ({activeProperty.unitNumber})
                  </span>
                  <span
                    className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                      activeProperty.status === 'occupied'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {activeProperty.status === 'occupied' ? 'Prenajatý' : 'Voľný'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 block truncate leading-none mt-0.5">
                  {[activeProperty.address, activeProperty.city].filter(Boolean).join(', ') || 'Bez adresy'}
                  {activeProperty.rentAmount ? ` • €${activeProperty.rentAmount}/mes` : ''}
                </span>
              </>
            ) : (
              <span className="text-xs font-semibold text-slate-500">
                Vyberte nehnuteľnosť...
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 sm:right-auto sm:w-88 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-1.5 max-h-[360px] overflow-y-auto space-y-1 animate-in fade-in zoom-in-95 duration-100">
          {allowAll && (
            <>
              <button
                type="button"
                onClick={() => {
                  onSelectPropertyId('all');
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-xl transition-colors cursor-pointer ${
                  selectedPropertyId === 'all'
                    ? 'bg-emerald-50 text-emerald-950 font-medium'
                    : 'hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-600">
                    <LayoutGrid className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 block truncate">
                      {allLabel}
                    </span>
                    <p className="text-[11px] text-slate-500 truncate leading-none mt-0.5">
                      {allSubtitle}
                    </p>
                  </div>
                </div>
                {selectedPropertyId === 'all' && (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                )}
              </button>
              <div className="h-px bg-slate-100 my-1 mx-2" />
            </>
          )}

          {flats.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Byty ({flats.length})
              </div>
              <div className="space-y-0.5">
                {flats.map(renderItem)}
              </div>
            </div>
          )}

          {apartments.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                Apartmány ({apartments.length})
              </div>
              <div className="space-y-0.5">
                {apartments.map(renderItem)}
              </div>
            </div>
          )}

          {properties.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400">
              Žiadne nehnuteľnosti
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default PropertySelectorDropdown;
