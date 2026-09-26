import React, { useState } from 'react';
import { Card, CardBody, Button, Chip, Textarea } from '@heroui/react';
import { Clock, ShieldAlert, Plus, MapPin, ArrowRight, AlertTriangle, CheckCircle2, Calendar, Home, Building2, FileText, Check } from 'lucide-react';
import { useProperty } from '../../context/PropertyContext';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { formatDate, getEffectiveLeaseStatus } from '../../utils/date';
import { Property } from '../../types';

interface PortfolioOverviewProps {
  onSelectProperty: (id: string) => void;
  onOpenAddProperty: () => void;
  onOpenAddExpense: () => void;
  onNavigateToTab: (tab: string) => void;
}

export const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({
  onSelectProperty,
  onOpenAddProperty,
  onNavigateToTab,
}) => {
  const { properties, analytics, inventory, leases } = useProperty();

  const flats = properties.filter(p => (p.propertyType || 'flat') === 'flat');
  const apartments = properties.filter(p => p.propertyType === 'apartment');

  const renderPropertyCard = (property: typeof properties[0]) => {
    const fallbackImg =
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80';
    const imgUrl = property.imageUrl || fallbackImg;

    const activeLease = leases.find(l => l.propertyId === property.id && l.status === 'active');
    const badgeVariant = activeLease ? 'occupied' : (property.status === 'occupied' ? 'vacant' : property.status);

    return (
      <Card
        key={property.id}
        isPressable
        onPress={() => onSelectProperty(property.id)}
        className="group relative h-36 sm:h-40 rounded-xl overflow-hidden border border-slate-200/80 hover:border-slate-300 p-0 shadow-2xs hover:shadow-lg transition-all duration-250 text-left w-full"
      >
        {/* Background Image */}
        <img
          src={imgUrl}
          alt={property.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Dark Gradient Overlay for optimal contrast & legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-slate-950/20 group-hover:from-slate-950/90 transition-colors" />

        {/* Content Inside Card */}
        <div className="relative z-10 h-full flex flex-col justify-between p-3 w-full">
          {/* Top: Status Badge */}
          <div className="flex items-center justify-end w-full">
            <Badge variant={badgeVariant as any} />
          </div>

          {/* Bottom: Info, Specs & Price */}
          <div className="space-y-1 w-full">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors truncate">
                {property.name} (č. {property.unitNumber})
              </h4>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-300 pt-0.5 border-t border-white/15">
              <span>{property.sizeSqm} m²</span>
              <span>•</span>
              <span>{property.bedrooms} {property.bedrooms === 1 ? 'izba' : property.bedrooms < 5 ? 'izby' : 'izieb'}</span>
              {property.floor !== undefined && (
                <>
                  <span>•</span>
                  <span>{property.floor}. posch.</span>
                </>
              )}
            </div>

            <div className="flex items-center justify-between pt-0.5 border-t border-white/10 w-full">
              <div>
                {property.rentAmount && property.rentAmount > 0 ? (
                  <>
                    <span className="text-xs sm:text-sm font-bold text-white">
                      €{property.rentAmount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-300"> / mes</span>
                  </>
                ) : (
                  <span className="text-[11px] font-medium text-slate-300">Bez nájmu</span>
                )}
              </div>
              <span className="text-[10px] text-slate-200 bg-white/15 backdrop-blur-md px-1.5 py-0.5 rounded font-medium truncate max-w-[100px]">
                {property.tenantName || 'Voľný'}
              </span>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4 w-full">
      {/* Key Metrics Bar (Clean, modern with subtle color accents) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 overflow-hidden">
        {/* 1. Mesačný nájom */}
        <div className="p-3.5 sm:p-4 lg:p-4.5 flex flex-col justify-between min-h-[76px] sm:min-h-[82px] hover:bg-emerald-50/20 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-slate-500 block leading-tight">
              Mesačný nájom
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100/80" />
          </div>
          <div className="mt-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl lg:text-2xl font-black text-emerald-950 leading-tight">
                €{analytics?.monthlyGrossRent.toLocaleString() || 0}
              </span>
              <span className="text-[11px] sm:text-xs text-emerald-700 font-semibold">/ mes</span>
            </div>
            <span className="text-[11px] text-slate-500 block truncate leading-tight mt-0.5">
              Ročne: €{((analytics?.monthlyGrossRent || 0) * 12).toLocaleString()}
            </span>
          </div>
        </div>

        {/* 2. Obsadenosť portfólia */}
        <div className="p-3.5 sm:p-4 lg:p-4.5 flex flex-col justify-between min-h-[76px] sm:min-h-[82px] hover:bg-teal-50/20 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-slate-500 block leading-tight">
              Obsadenosť portfólia
            </span>
            <span className="w-2 h-2 rounded-full bg-teal-500 ring-4 ring-teal-100/80" />
          </div>
          <div className="mt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 leading-tight">
                {analytics?.occupancyRate || 0}%
              </span>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200/80 px-1.5 py-0.2 rounded">
                {(analytics?.occupancyRate || 0) >= 90 ? 'Vysoká' : 'Štandard'}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block truncate leading-tight mt-0.5">
              {analytics?.occupiedUnits || 0} z {analytics?.totalUnits || 0} jednotiek obsadených
            </span>
          </div>
        </div>

        {/* 3. Končiace zmluvy */}
        <div className="p-3.5 sm:p-4 lg:p-4.5 flex flex-col justify-between min-h-[76px] sm:min-h-[82px] hover:bg-amber-50/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-slate-500 block leading-tight">
              Končiace zmluvy
            </span>
            <span className={`w-2 h-2 rounded-full ${(analytics?.expiringIn60DaysCount || 0) > 0 ? 'bg-amber-500 ring-4 ring-amber-100' : 'bg-slate-300'}`} />
          </div>
          <div className="mt-1">
            <div className={`text-lg sm:text-xl lg:text-2xl font-black leading-tight ${(analytics?.expiringIn60DaysCount || 0) > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {analytics?.expiringIn60DaysCount || 0}
            </div>
            <span className="text-[11px] text-slate-500 block truncate leading-tight mt-0.5">
              V nasledujúcich 60 dňoch
            </span>
          </div>
        </div>

        {/* 4. Výdavky na údržbu */}
        <div className="p-3.5 sm:p-4 lg:p-4.5 flex flex-col justify-between min-h-[76px] sm:min-h-[82px] hover:bg-rose-50/20 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-slate-500 block leading-tight">
              Výdavky na údržbu
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500 ring-4 ring-rose-100/80" />
          </div>
          <div className="mt-1">
            <div className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 leading-tight">
              €{analytics?.totalExpenses.toLocaleString() || 0}
            </div>
            <span className="text-[11px] text-slate-500 block truncate leading-tight mt-0.5">
              Celkové evidované náklady
            </span>
          </div>
        </div>
      </div>

      {/* Sekcia 1: Byty v správe */}
      <div className="space-y-2 w-full">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <Home className="w-4 h-4 text-slate-600" /> Byty v správe ({flats.length})
            </h3>
          </div>
          <Button
            size="sm"
            variant="light"
            className="text-slate-600 hover:text-slate-900 font-medium inline-flex h-7 px-2"
            onPress={() => onNavigateToTab('properties')}
            endContent={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Zobraziť v tabuľke
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-3 w-full">
          {flats.map(property => renderPropertyCard(property))}

          {flats.length === 0 && (
            <div className="col-span-full p-6 text-center bg-[#fcfdfd] rounded-2xl border border-slate-200/80 text-slate-500 text-sm">
              Zatiaľ nie sú evidované žiadne byty.
            </div>
          )}
        </div>
      </div>

      {/* Sekcia 2: Apartmány v správe */}
      <div className="space-y-2 w-full">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-600" /> Apartmány v správe ({apartments.length})
            </h3>
          </div>
          <Button
            size="sm"
            variant="light"
            className="text-slate-600 hover:text-slate-900 font-medium inline-flex h-7 px-2"
            onPress={() => onNavigateToTab('properties')}
            endContent={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Zobraziť v tabuľke
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-3 w-full">
          {apartments.map(property => renderPropertyCard(property))}

          {apartments.length === 0 && (
            <div className="col-span-full p-6 text-center bg-[#fcfdfd] rounded-2xl border border-slate-200/80 text-slate-500 text-sm">
              Zatiaľ nie sú evidované žiadne apartmány.
            </div>
          )}
        </div>
      </div>

      {/* Priority Action Items: Leases & Warranties (HeroUI Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 sm:pt-3">
        {/* Leases requiring renewal - SORTED CLOSEST FIRST */}
        <Card shadow="none" className="border border-slate-200/80 bg-[#fcfdfd] rounded-2xl shadow-xs overflow-hidden">
          <CardBody className="p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
                  Končiace nájomné zmluvy
                </h3>
                <p className="text-[11px] text-slate-500">
                  Sledovanie expirácie a potreby obnovy (od najbližšej)
                </p>
              </div>
              <Button
                size="sm"
                variant="light"
                onPress={() => onNavigateToTab('properties')}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium h-7 px-2.5"
                endContent={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Všetky zmluvy
              </Button>
            </div>

            <div className="divide-y divide-slate-100">
              {leases
                .filter(l => getEffectiveLeaseStatus(l) === 'active')
                .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
                .map(lease => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const end = new Date(lease.endDate);
                  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                  let chipColor: 'danger' | 'warning' | 'default' | 'success' = 'default';
                  let statusText = '';

                  if (diffDays < 0) {
                    chipColor = 'danger';
                    statusText = `Expirovala pred ${Math.abs(diffDays)} dňami`;
                  } else if (diffDays === 0) {
                    chipColor = 'danger';
                    statusText = 'Končí dnes!';
                  } else if (diffDays <= 30) {
                    chipColor = 'danger';
                    statusText = `Končí o ${diffDays} dní`;
                  } else if (diffDays <= 60) {
                    chipColor = 'warning';
                    statusText = `Končí o ${diffDays} dní`;
                  } else {
                    chipColor = 'success';
                    const months = Math.floor(diffDays / 30);
                    statusText = `Zostáva ${months > 0 ? months + ' mes.' : diffDays + ' dní'}`;
                  }

                  const prop = properties.find(p => p.id === lease.propertyId);
                  const propName = lease.propertyName || prop?.name || 'Nehnuteľnosť';
                  const propUnit = lease.propertyUnit || prop?.unitNumber;
                  const propertyLabel = propUnit ? `${propName} (č. ${propUnit})` : propName;

                  return (
                    <div
                      key={lease.id}
                      onClick={() => onSelectProperty(lease.propertyId)}
                      className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 px-2 -mx-2 rounded-lg transition"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900">
                            {propertyLabel}
                          </span>
                          <Chip size="sm" variant="flat" color={chipColor} className="text-[10px] h-5 px-1 font-medium">
                            {statusText}
                          </Chip>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Nájomca: <span className="text-slate-700 font-medium">{lease.tenantName}</span> {lease.tenantPhone && `• ${lease.tenantPhone}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <span className="text-xs text-slate-900 font-bold">€{lease.rentAmount}/mes</span>
                        <p className="text-[11px] text-slate-400">Do: {formatDate(lease.endDate)}</p>
                      </div>
                    </div>
                  );
                })}

              {leases.filter(l => getEffectiveLeaseStatus(l) === 'active').length === 0 && (
                <p className="text-xs text-slate-400 py-3 text-center">Žiadne aktívne zmluvy.</p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Expiring Warranties - ALL ITEMS WITH WARRANTY FROM ALL INVENTORIES, SORTED CLOSEST EXPIRATION FIRST */}
        <Card shadow="none" className="border border-slate-200/80 bg-[#fcfdfd] rounded-2xl shadow-xs overflow-hidden">
          <CardBody className="p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
                  Končiace záruky
                </h3>
                <p className="text-[11px] text-slate-500">
                  Sledovanie garancií a servisu zo všetkých inventárov (od najskoršej)
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {inventory
                .filter(i => Boolean(i.warrantyExpiresAt && i.warrantyExpiresAt.trim()))
                .sort((a, b) => new Date(a.warrantyExpiresAt!).getTime() - new Date(b.warrantyExpiresAt!).getTime())
                .map(item => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const exp = new Date(item.warrantyExpiresAt!);
                  const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                  let chipColor: 'danger' | 'warning' | 'default' | 'success' = 'default';
                  let statusText = '';

                  if (diffDays < 0) {
                    chipColor = 'default';
                    statusText = 'Po záruke';
                  } else if (diffDays <= 30) {
                    chipColor = 'danger';
                    statusText = `Záruka končí o ${diffDays} dní!`;
                  } else if (diffDays <= 90) {
                    chipColor = 'warning';
                    statusText = `Záruka končí o ${diffDays} dní`;
                  } else {
                    chipColor = 'success';
                    const months = Math.floor(diffDays / 30);
                    statusText = `Záruka platná (${months > 0 ? months + ' mes.' : diffDays + ' dní'})`;
                  }

                  const prop = properties.find(p => p.id === item.propertyId);
                  const propertyLabel = prop
                    ? `${prop.name} (č. ${prop.unitNumber})`
                    : item.propertyName || 'Neznámy byt';

                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectProperty(item.propertyId)}
                      className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 px-2 -mx-2 rounded-lg transition"
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900 truncate">{item.name}</span>
                          <Chip size="sm" variant="flat" color={chipColor} className="text-[10px] h-5 px-1 font-medium shrink-0">
                            {statusText}
                          </Chip>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {propertyLabel} • {item.brandModel || 'Bez modelu'}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        {item.cost ? (
                          <span className="text-xs text-slate-900 font-semibold block">€{item.cost}</span>
                        ) : null}
                        <p className="text-[11px] text-slate-400">Záruka do: {formatDate(item.warrantyExpiresAt)}</p>
                      </div>
                    </div>
                  );
                })}

              {inventory.filter(i => Boolean(i.warrantyExpiresAt && i.warrantyExpiresAt.trim())).length === 0 && (
                <p className="text-xs text-slate-400 py-6 text-center">Žiadne evidované záruky v inventári.</p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
