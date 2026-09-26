import React, { useState } from 'react';
import {
  Card,
  Button,
  ButtonGroup,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Textarea,
} from '@heroui/react';
import { Search, Plus, LayoutList, LayoutGrid, ArrowRight, MapPin, FileText, Check } from 'lucide-react';
import { useProperty } from '../../context/PropertyContext';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Property } from '../../types';

interface PropertyListProps {
  onSelectProperty: (id: string) => void;
  onOpenAddProperty: () => void;
}

export const PropertyList: React.FC<PropertyListProps> = ({
  onSelectProperty,
  onOpenAddProperty,
}) => {
  const { properties, leases, searchQuery, setSearchQuery, statusFilter, setStatusFilter } = useProperty();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [sortField, setSortField] = useState<'unitNumber' | 'name' | 'city' | 'sizeSqm' | 'rentAmount' | 'status'>('unitNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const getEffectiveStatus = (prop: typeof properties[0]) => {
    const hasActiveLease = leases.some(l => l.propertyId === prop.id && l.status === 'active');
    return hasActiveLease ? 'occupied' : (prop.status === 'occupied' ? 'vacant' : prop.status);
  };

  const filteredProperties = properties
    .filter(prop => {
      const matchesSearch =
        prop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prop.tenantName && prop.tenantName.toLowerCase().includes(searchQuery.toLowerCase()));

      const effectiveStatus = getEffectiveStatus(prop);
      const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'unitNumber') {
        const numA = parseFloat(a.unitNumber);
        const numB = parseFloat(b.unitNumber);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }
        valA = (a.unitNumber || '').toLowerCase();
        valB = (b.unitNumber || '').toLowerCase();
      } else if (sortField === 'name') {
        valA = (a.name || '').toLowerCase();
        valB = (b.name || '').toLowerCase();
      } else if (sortField === 'city') {
        valA = (a.city || '').toLowerCase();
        valB = (b.city || '').toLowerCase();
      } else if (sortField === 'sizeSqm') {
        valA = a.sizeSqm || 0;
        valB = b.sizeSqm || 0;
      } else if (sortField === 'rentAmount') {
        valA = a.rentAmount || 0;
        valB = b.rentAmount || 0;
      } else if (sortField === 'status') {
        valA = getEffectiveStatus(a);
        valB = getEffectiveStatus(b);
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const handleTableSort = (columnKey: React.Key) => {
    const key = String(columnKey);
    let targetField: 'unitNumber' | 'name' | 'city' | 'sizeSqm' | 'rentAmount' | 'status' = 'unitNumber';

    if (key === 'unit') targetField = 'unitNumber';
    else if (key === 'property') targetField = 'name';
    else if (key === 'location') targetField = 'city';
    else if (key === 'size') targetField = 'sizeSqm';
    else if (key === 'rent') targetField = 'rentAmount';
    else if (key === 'status') targetField = 'status';
    else return;

    if (sortField === targetField) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(targetField);
      setSortDirection('asc');
    }
  };

  const statusLabels: Record<string, string> = {
    all: 'Všetky',
    occupied: 'Prenajatý',
    vacant: 'Voľný',
  };

  const currentTableColumnKey =
    sortField === 'unitNumber'
      ? 'unit'
      : sortField === 'name'
      ? 'property'
      : sortField === 'city'
      ? 'location'
      : sortField === 'sizeSqm'
      ? 'size'
      : sortField === 'rentAmount'
      ? 'rent'
      : 'status';

  return (
    <div className="space-y-4">
      {/* Search, Filter & View Mode Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Input
            size="sm"
            variant="bordered"
            placeholder="Filtrovať byty, adresy..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            startContent={<Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
            classNames={{
              input: 'text-xs text-slate-800 placeholder:text-slate-400',
              inputWrapper:
                'h-8 min-h-8 bg-white border-slate-200 hover:border-slate-300 focus-within:!border-slate-400 rounded-lg shadow-xs',
            }}
          />
        </div>

        {/* Filter Pills & View Toggle */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Zoradenie */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 h-8 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 shrink-0">Zoradiť:</span>
            <select
              value={`${sortField}-${sortDirection}`}
              onChange={e => {
                const [f, d] = e.target.value.split('-');
                setSortField(f as any);
                setSortDirection(d as any);
              }}
              className="text-xs font-semibold text-slate-800 bg-transparent border-0 outline-none cursor-pointer pr-1"
            >
              <option value="unitNumber-asc">Číslo bytu ↑</option>
              <option value="unitNumber-desc">Číslo bytu ↓</option>
              <option value="name-asc">Názov objektu (A-Z)</option>
              <option value="name-desc">Názov objektu (Z-A)</option>
              <option value="rentAmount-desc">Nájomné (od najvyššieho)</option>
              <option value="rentAmount-asc">Nájomné (od najnižšieho)</option>
              <option value="sizeSqm-desc">Výmera (od najväčšej)</option>
              <option value="sizeSqm-asc">Výmera (od najmenšej)</option>
              <option value="status-asc">Stav</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-100/90 border border-slate-200/80 rounded-lg p-0.5">
            {(['all', 'occupied', 'vacant'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs rounded-md transition ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {statusLabels[st]}
              </button>
            ))}
          </div>

          <ButtonGroup size="sm" variant="flat" className="border border-slate-200 rounded-lg p-0.5 bg-slate-100/90">
            <Button
              isIconOnly
              size="sm"
              variant={viewMode === 'table' ? 'solid' : 'light'}
              className={`min-w-7 w-7 h-7 rounded-md ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
              onPress={() => setViewMode('table')}
              title="Tabuľkový prehľad"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant={viewMode === 'cards' ? 'solid' : 'light'}
              className={`min-w-7 w-7 h-7 rounded-md ${viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
              onPress={() => setViewMode('cards')}
              title="Karty"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
          </ButtonGroup>

          <Button
            size="sm"
            color="default"
            className="bg-slate-900 text-white font-medium h-8 rounded-lg px-3 shadow-xs"
            onPress={onOpenAddProperty}
            startContent={<Plus className="w-3.5 h-3.5" />}
          >
            Pridať nehnuteľnosť
          </Button>
        </div>
      </div>

      {/* VIEW 1: HEROUI DATABASE TABLE */}
      {viewMode === 'table' && (
        <Table
          aria-label="Zoznam bytov a nehnuteľností"
          shadow="none"
          sortDescriptor={{
            column: currentTableColumnKey,
            direction: sortDirection === 'asc' ? 'ascending' : 'descending',
          }}
          onSortChange={descriptor => {
            if (descriptor.column) {
              handleTableSort(descriptor.column);
            }
          }}
          classNames={{
            base: 'border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs',
            table: 'min-w-full',
            thead: '[&>tr]:first:rounded-none',
            th: 'bg-slate-50/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider py-3 px-4 border-b border-slate-200 [&>div]:inline-flex [&>div]:items-center [&>div]:gap-1.5 [&_svg]:align-middle [&_svg]:my-auto',
            sortIcon: 'text-slate-500 shrink-0 inline-block align-middle my-auto',
            td: 'py-3 px-4 text-xs border-b border-slate-100 last:border-0',
            tr: 'hover:bg-slate-50/70 transition-colors cursor-pointer',
          }}
        >
          <TableHeader>
            <TableColumn key="unit" allowsSorting>ČÍSLO BYTU</TableColumn>
            <TableColumn key="property" allowsSorting>NÁZOV OBJEKTU</TableColumn>
            <TableColumn key="location" allowsSorting>LOKALITA</TableColumn>
            <TableColumn key="size" allowsSorting>VÝMERA</TableColumn>
            <TableColumn key="status" allowsSorting>STAV</TableColumn>
            <TableColumn key="rent" allowsSorting>MESAČNÉ NÁJOMNÉ</TableColumn>
            <TableColumn key="tenant">NÁJOMCA</TableColumn>
            <TableColumn key="action">{''}</TableColumn>
          </TableHeader>
          <TableBody emptyContent="Žiadne nehnuteľnosti nezodpovedajú zvolenému filtru.">
            {filteredProperties.map(property => (
              <TableRow key={property.id} onClick={() => onSelectProperty(property.id)}>
                <TableCell className="text-slate-700 font-semibold">č. {property.unitNumber}</TableCell>
                <TableCell className="font-medium text-slate-900">{property.name}</TableCell>
                <TableCell className="text-slate-500">
                  {property.city}
                </TableCell>
                <TableCell className="text-slate-600">
                  {property.sizeSqm} m²{property.floor !== undefined ? ` • ${property.floor}. posch.` : ''}
                </TableCell>
                  <TableCell>
                    <Badge variant={getEffectiveStatus(property) as any} />
                  </TableCell>
                <TableCell className="font-semibold text-slate-900">
                  {property.rentAmount && property.rentAmount > 0 ? (
                    `€${property.rentAmount.toLocaleString()}`
                  ) : (
                    <span className="text-slate-400 font-normal">—</span>
                  )}
                </TableCell>
                <TableCell className="text-slate-600">
                  {property.tenantName ? (
                    <span className="text-slate-800 font-medium">{property.tenantName}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 inline" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* VIEW 2: CARDS (HeroUI Cards with Photo Background) */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-3 w-full">
          {filteredProperties.map(property => {
            const fallbackImg =
              'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80';
            const imgUrl = property.imageUrl || fallbackImg;
            const cardBadgeVariant = getEffectiveStatus(property);

            return (
              <Card
                key={property.id}
                isPressable
                onPress={() => onSelectProperty(property.id)}
                className="group relative h-40 rounded-xl overflow-hidden border border-slate-200/80 hover:border-slate-300 p-0 shadow-2xs hover:shadow-lg transition-all duration-250 text-left w-full"
              >
                {/* Background Image */}
                <img
                  src={imgUrl}
                  alt={property.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-slate-950/20 group-hover:from-slate-950/90 transition-colors" />

                {/* Content Inside Card */}
                <div className="relative z-10 h-full flex flex-col justify-between p-3 w-full">
                  {/* Top: Status Badge */}
                  <div className="flex items-center justify-end w-full">
                    <Badge variant={cardBadgeVariant as any} />
                  </div>

                  {/* Bottom: Info, Specs & Price */}
                  <div className="space-y-1 w-full">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors truncate">
                        {property.name} (č. {property.unitNumber})
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-slate-300 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">
                          {property.city}
                        </span>
                      </p>
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
          })}
        </div>
      )}
    </div>
  );
};
