import React, { useState, useEffect } from 'react';
import {
  Breadcrumbs,
  BreadcrumbItem,
  Card,
  CardBody,
  Button,
  Tabs,
  Tab,
  Select,
  SelectItem,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Chip,
} from '@heroui/react';
import {
  ArrowLeft,
  MapPin,
  Mail,
  Phone,
  Download,
  Plus,
  Trash2,
  DollarSign,
  Layers,
  Wrench,
  Package,
  FileText,
  Camera,
  History,
  Box,
  Car,
  FileCheck,
  FileUp,
  UploadCloud,
  Star,
  ExternalLink,
  Check,
  Edit3,
  Copy,
  Sparkles,
  Home,
  Building2,
  TrendingUp,
  Wind,
  Armchair,
  UserMinus,
  UserX,
} from 'lucide-react';
import { Property, Lease } from '../../types';
import { useProperty } from '../../context/PropertyContext';
import { Badge } from '../common/Badge';
import { EditPropertyModal } from './EditPropertyModal';
import { EditLeaseModal } from './EditLeaseModal';
import { AddHotelRevenueModal } from './AddHotelRevenueModal';
import { BookingMonitorCard } from './BookingMonitorCard';
import { ImageLightboxModal } from '../common/ImageLightboxModal';
import { formatDate, getEffectiveLeaseStatus, isLeaseExpired } from '../../utils/date';
import { compressImage } from '../../utils/imageCompressor';
import { openLeasePdfWindow } from '../../utils/contractPdf';

interface PropertyDetailPageProps {
  property: Property;
  fromTabTitle?: string;
  onBack: () => void;
  onOpenAddLease: (propertyId: string) => void;
  onOpenAddInventory: (propertyId: string) => void;
  onOpenAddExpense: (propertyId: string) => void;
}

const TabLabel: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isSelected: boolean;
}> = ({ icon: Icon, label, isSelected }) => (
  <div
    className={`flex items-center gap-2 transition-transform duration-200 origin-center ${
      isSelected ? 'scale-105' : 'scale-100'
    }`}
  >
    <Icon className={`w-4 h-4 shrink-0 transition-colors duration-200 ${isSelected ? 'text-slate-900' : 'text-slate-400'}`} />
    <span className="inline-grid [grid-template-areas:'stack'] text-left">
      <span className="[grid-area:stack] font-semibold invisible select-none pointer-events-none" aria-hidden="true">
        {label}
      </span>
      <span
        className={`[grid-area:stack] transition-colors duration-200 ${
          isSelected ? 'font-semibold text-slate-900' : 'font-medium text-slate-500 hover:text-slate-700'
        }`}
      >
        {label}
      </span>
    </span>
  </div>
);

export const PropertyDetailPage: React.FC<PropertyDetailPageProps> = ({
  property,
  fromTabTitle = 'Prehľad',
  onBack,
  onOpenAddLease,
  onOpenAddInventory,
  onOpenAddExpense,
}) => {
  const {
    leases,
    inventory,
    expenses,
    hotelRevenue,
    updateProperty,
    deleteProperty,
    deleteInventoryItem,
    deleteExpense,
    deleteLease,
    updateLease,
    addHotelRevenue,
    deleteHotelRevenue,
    showToast,
  } = useProperty();

  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'expenses' | 'history' | 'photos' | 'maintenance' | 'leases'>('overview');
  const [selectedPhoto, setSelectedPhoto] = useState<string>(property.imageUrl || '');
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedLeaseToEdit, setSelectedLeaseToEdit] = useState<Lease | null>(null);
  const [isEditLeaseModalOpen, setIsEditLeaseModalOpen] = useState<boolean>(false);
  const [isHotelRevenueModalOpen, setIsHotelRevenueModalOpen] = useState<boolean>(false);
  const [copiedContact, setCopiedContact] = useState<'email' | 'phone' | null>(null);
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    photos: string[];
    index: number;
    title: string;
  }>({
    isOpen: false,
    photos: [],
    index: 0,
    title: '',
  });

  const openLightbox = (photos: string[], index: number, title: string) => {
    setLightboxState({
      isOpen: true,
      photos,
      index,
      title,
    });
  };

  const handleCopyContact = (text: string, type: 'email' | 'phone') => {
    navigator.clipboard.writeText(text);
    setCopiedContact(type);
    showToast(type === 'email' ? 'Email bol skopírovaný do schránky' : 'Telefónne číslo bolo skopírované do schránky');
    setTimeout(() => {
      setCopiedContact(prev => prev === type ? null : prev);
    }, 2000);
  };

  useEffect(() => {
    setSelectedPhoto(property.imageUrl || '');
  }, [property.id, property.imageUrl]);

  const allPhotos = Array.from(new Set([
    ...(property.photos || []),
    ...(property.imageUrl ? [property.imageUrl] : [])
  ])).filter(Boolean);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const readPromises = Array.from(files).map(file => compressImage(file));
      const base64Results = (await Promise.all(readPromises)).filter(Boolean);
      if (base64Results.length > 0) {
        const updatedPhotos = [...allPhotos, ...base64Results];
        await updateProperty(property.id, {
          photos: updatedPhotos,
          imageUrl: property.imageUrl || base64Results[0],
        });
        setSelectedPhoto(base64Results[0]);
        showToast(`Úspešne nahraných ${base64Results.length} fotografií bytu.`);
      }
    } catch (err) {
      console.error(err);
      showToast('Chyba pri nahrávaní fotografií', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleSetMainPhoto = async (photoUrl: string) => {
    try {
      await updateProperty(property.id, {
        imageUrl: photoUrl,
      });
      setSelectedPhoto(photoUrl);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadPhoto = (photoUrl: string, index: number) => {
    try {
      const link = document.createElement('a');
      link.href = photoUrl;
      link.download = `${property.name.replace(/\s+/g, '_')}_foto_${index + 1}.jpg`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      window.open(photoUrl, '_blank');
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    const updatedPhotos = allPhotos.filter(p => p !== photoUrl);
    const newMain = property.imageUrl === photoUrl ? (updatedPhotos[0] || '') : property.imageUrl;
    try {
      await updateProperty(property.id, {
        photos: updatedPhotos,
        imageUrl: newMain,
      });
      if (selectedPhoto === photoUrl) {
        setSelectedPhoto(newMain || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const unitLeases = leases.filter(l => l.propertyId === property.id);
  const activeLease = unitLeases.find(l => (l.id === property.activeLeaseId || l.status === 'active') && getEffectiveLeaseStatus(l) === 'active');
  const isHotelOperator = activeLease?.leaseType === 'hotel_operator';
  const unitHotelRevenue = hotelRevenue.filter(r => r.propertyId === property.id).sort((a, b) => b.month.localeCompare(a.month));
  const unitInventory = inventory.filter(i => i.propertyId === property.id);
  const unitExpenses = expenses.filter(e => e.propertyId === property.id);

  const handleLeaseMoveInPhotosUpload = async (lease: Lease, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const readPromises = Array.from(files).map(file => compressImage(file));
      const newPhotos = await Promise.all(readPromises);
      const validPhotos = newPhotos.filter(Boolean);
      const existing = lease.moveInPhotos || [];
      const updated = [...existing, ...validPhotos];
      await updateLease(lease.id, { moveInPhotos: updated });
      showToast(`Pridaných ${validPhotos.length} fotografií k odovzdaniu bytu (${lease.tenantName}).`);
    } catch (err) {
      console.error(err);
      showToast('Nastala chyba pri nahrávaní fotografií', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleDeleteLeaseMoveInPhoto = async (lease: Lease, photoToDelete: string) => {
    if (confirm(`Naozaj chcete vymazať túto fotografiu z odovzdania bytu (${lease.tenantName})?`)) {
      const existing = lease.moveInPhotos || [];
      const updated = existing.filter(p => p !== photoToDelete);
      await updateLease(lease.id, { moveInPhotos: updated });
      showToast('Fotografia bola odstránená', 'info');
    }
  };

  const handleMoveInPhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeLease) handleLeaseMoveInPhotosUpload(activeLease, e);
  };

  const handleDeleteMoveInPhoto = (photoToDelete: string) => {
    if (activeLease) handleDeleteLeaseMoveInPhoto(activeLease, photoToDelete);
  };

  const totalLeasePhotos = unitLeases.reduce((acc, l) => acc + (l.moveInPhotos?.length || 0), 0);
  const handoverLeases = unitLeases
    .filter(l => (l.moveInPhotos && l.moveInPhotos.length > 0) || l.id === activeLease?.id)
    .sort((a, b) => {
      if (a.id === activeLease?.id) return -1;
      if (b.id === activeLease?.id) return 1;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
  
  const effectivePropertyStatus = property.status === 'occupied' && !activeLease ? 'vacant' : property.status;
  const effectiveRentAmount = activeLease ? (property.rentAmount || activeLease.rentAmount || 0) : 0;
  const rentPerSqm = property.sizeSqm > 0 ? (effectiveRentAmount / property.sizeSqm).toFixed(2) : '0.00';

  const effectiveBaseRent = activeLease?.baseRent !== undefined
    ? activeLease.baseRent
    : (activeLease ? property.baseRent : undefined);
  const effectiveUtilities = activeLease?.utilitiesAmount !== undefined
    ? activeLease.utilitiesAmount
    : (activeLease ? property.utilitiesAmount : undefined);

  const handleDeleteProperty = async () => {
    if (confirm(`Naozaj chcete natrvalo vymazať nehnuteľnosť ${property.name} (č. ${property.unitNumber})?`)) {
      await deleteProperty(property.id);
      onBack();
    }
  };

  const handleEditLease = (leaseToEdit: Lease) => {
    setSelectedLeaseToEdit(leaseToEdit);
    setIsEditLeaseModalOpen(true);
  };

  const handleEndActiveLease = async (leaseToEnd: Lease) => {
    if (
      confirm(
        `Naozaj chcete ukončiť aktívny nájom pre nájomcu ${leaseToEnd.tenantName}?\n\nNájomca a táto zmluva zostanú zachované v histórii zmlúv ako neaktívne a byt bude označený ako voľný.`
      )
    ) {
      const todayStr = new Date().toISOString().split('T')[0];
      const newEndDate = leaseToEnd.endDate && leaseToEnd.endDate < todayStr ? leaseToEnd.endDate : todayStr;
      await updateLease(leaseToEnd.id, {
        status: 'expired',
        endDate: newEndDate,
      });
      await updateProperty(property.id, {
        activeLeaseId: undefined,
        status: 'vacant',
        rentAmount: 0,
        baseRent: undefined,
        utilitiesAmount: undefined,
      });
      showToast(`Nájomca ${leaseToEnd.tenantName} bol presunutý do histórie zmlúv a byt je voľný.`);
    }
  };

  const handleDeleteLease = async (leaseId: string, tenantName: string) => {
    if (confirm(`Naozaj chcete natrvalo vymazať zmluvu pre nájomcu ${tenantName}?`)) {
      await deleteLease(leaseId);
    }
  };

  const isOvrucDeluxeMonitored =
    property.id === 'prop_1789904376801' ||
    property.name.toLowerCase().includes('arboria') ||
    property.name.toLowerCase().includes('ovruč') ||
    property.name.toLowerCase().includes('ovruc');

  return (
    <div className="animate-in fade-in duration-150 w-full">
      {/* 1. HERO COVER BANNER WITH BREADCRUMBS, ACTIONS & BOOKING MONITOR (RIGHT OF PHOTO) */}
      <div className="relative overflow-hidden border-b border-slate-200 shadow-sm min-h-[175px] sm:min-h-[200px] w-full group">
        {/* Background Photo */}
        <img
          src={
            selectedPhoto ||
            property.imageUrl ||
            'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=85'
          }
          alt={property.name}
          className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-101 transition-transform duration-700"
        />
        {/* Dark Gradient Overlay for optimal legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/65 to-slate-950/45" />

        {/* Content Over Banner */}
        <div className="relative z-10 px-4 sm:px-6 lg:px-7 py-3.5 sm:py-4 flex flex-col justify-between min-h-[165px] sm:min-h-[190px] w-full gap-4">
          {/* Top Bar: Breadcrumbs + Badges on Left, Actions on Right */}
          <div className="w-full flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Breadcrumbs Over Photo */}
              <div className="flex items-center gap-1.5 py-1 px-3 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-xs font-medium text-white shadow-xs">
                <button
                  type="button"
                  onClick={onBack}
                  className="flex items-center gap-1 text-slate-200 hover:text-white transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{fromTabTitle}</span>
                </button>
                <span className="text-slate-400">/</span>
                <span className="font-semibold text-white">
                  {property.name} (č. {property.unitNumber})
                </span>
              </div>

              {/* Status Badge */}
              <Badge variant={effectivePropertyStatus} />
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onPress={() => onOpenAddLease(property.id)}
                startContent={<Plus className="w-3.5 h-3.5" />}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs"
              >
                Nová zmluva
              </Button>

              <Button
                size="sm"
                onPress={() => setIsEditModalOpen(true)}
                startContent={<Edit3 className="w-3.5 h-3.5" />}
                className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/25 font-semibold text-xs shadow-xs"
              >
                Upraviť nehnuteľnosť
              </Button>

              <Button
                size="sm"
                color="danger"
                variant="flat"
                onPress={handleDeleteProperty}
                startContent={<Trash2 className="w-3.5 h-3.5" />}
                className="bg-black/50 text-white hover:bg-rose-600 backdrop-blur-md border border-white/20 text-xs font-medium"
              >
                <span className="hidden sm:inline">Vymazať</span>
              </Button>
            </div>
          </div>

          {/* Bottom Row: Title & Address on Left, Booking.com Monitor Section on Right */}
          <div className="mt-2 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight drop-shadow-xs">
                {property.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-200 flex items-center gap-1.5 mt-1 drop-shadow-xs">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  {property.address}, {property.city}
                </span>
              </p>
            </div>

            {/* Single added section right of photo: Booking.com Price Monitor (Exclusive to this apartment) */}
            {isOvrucDeluxeMonitored && (
              <div className="w-full lg:w-auto">
                <BookingMonitorCard
                  propertyId={property.id}
                  operatorPayoutAvg={
                    unitHotelRevenue.length > 0
                      ? Math.round(
                          unitHotelRevenue.reduce((s, r) => s + r.revenueAmount, 0) /
                            unitHotelRevenue.length
                        )
                      : effectiveRentAmount > 0
                      ? effectiveRentAmount
                      : 1450
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Page Content Body */}
      <div className="px-4 sm:px-6 lg:px-7 py-4 sm:py-5 space-y-4 sm:space-y-5">
        {/* 2. TABS SELECTOR (Directly under photo) */}
        {(() => {
          const effectiveTab = activeTab === 'leases' || activeTab === 'maintenance' ? 'history' : activeTab;
          return (
            <Tabs
              selectedKey={effectiveTab}
              onSelectionChange={key => setActiveTab(key as any)}
              variant="underlined"
              color="primary"
              classNames={{
                tabList: 'gap-6 border-b border-slate-200 p-0',
                cursor: 'w-full bg-slate-900',
                tab: 'max-w-fit px-2 h-10 text-sm font-medium transition-colors',
              }}
            >
              <Tab
                key="overview"
                title={
                  <TabLabel
                    icon={Layers}
                    label="Prehľad a nájomca"
                    isSelected={effectiveTab === 'overview'}
                  />
                }
              />
              <Tab
                key="inventory"
                title={
                  <TabLabel
                    icon={Package}
                    label={`Inventár (${unitInventory.length})`}
                    isSelected={effectiveTab === 'inventory'}
                  />
                }
              />
              <Tab
                key="expenses"
                title={
                  <TabLabel
                    icon={DollarSign}
                    label={`Výdavky (${unitExpenses.length})`}
                    isSelected={effectiveTab === 'expenses'}
                  />
                }
              />
              <Tab
                key="history"
                title={
                  <TabLabel
                    icon={History}
                    label={`História (${unitLeases.length + unitExpenses.filter(e => e.category === 'repair' || e.category === 'replacement').length})`}
                    isSelected={effectiveTab === 'history'}
                  />
                }
              />
              <Tab
                key="photos"
                title={
                  <TabLabel
                    icon={Camera}
                    label={`Fotky (${allPhotos.length + totalLeasePhotos})`}
                    isSelected={effectiveTab === 'photos'}
                  />
                }
              />
            </Tabs>
          );
        })()}

        {/* 3. TAB CONTENT PANELS */}
        <div className="space-y-4 min-h-[500px]">
          {/* TAB: OVERVIEW & TENANT */}
          {activeTab === 'overview' && (
            <div className="space-y-5 w-full">
              {/* Key Metrics Bar (Compact & Sleek) */}
              <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 overflow-hidden">
                {/* 1. Mesačný nájom */}
                <div className="p-2.5 sm:p-3 flex flex-col justify-between min-h-[62px]">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block leading-tight">
                    Mesačný nájom
                  </span>
                  {effectiveRentAmount > 0 ? (
                    <div>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                          €{effectiveRentAmount.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal">/ mes</span>
                      </div>
                      {effectiveBaseRent !== undefined || effectiveUtilities !== undefined ? (
                        <span
                          className="text-[10px] text-slate-500 block truncate leading-tight mt-0.5"
                          title={`Nájom: €${(effectiveBaseRent ?? effectiveRentAmount).toLocaleString()} + Energie: €${(effectiveUtilities ?? 0).toLocaleString()}`}
                        >
                          Nájom: €{(effectiveBaseRent ?? effectiveRentAmount).toLocaleString()} + Energie: €{(effectiveUtilities ?? 0).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 block truncate leading-tight mt-0.5">
                          Ročne: €{(effectiveRentAmount * 12).toLocaleString()}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm sm:text-base font-bold text-slate-400 mt-0.5">—</div>
                      <span className="text-[10px] text-slate-400 block truncate leading-tight mt-0.5">Bez aktívneho nájmu</span>
                    </div>
                  )}
                </div>

                {/* 2. Výmera bytu */}
                <div className="p-2.5 sm:p-3 flex flex-col justify-between min-h-[62px]">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block leading-tight">
                    Výmera bytu
                  </span>
                  <div>
                    <div className="text-sm sm:text-base font-bold text-slate-900 leading-tight mt-0.5">
                      {property.sizeSqm} m²
                    </div>
                    <span className="text-[10px] text-slate-500 block truncate leading-tight mt-0.5">
                      {property.bedrooms} {property.bedrooms === 1 ? 'izba' : property.bedrooms < 5 ? 'izby' : 'izieb'}
                      {property.floor !== undefined ? ` • ${property.floor}. posch.` : ''}
                    </span>
                  </div>
                </div>

                {/* 3. Trhová sadzba */}
                <div className="p-2.5 sm:p-3 flex flex-col justify-between min-h-[62px]">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block leading-tight">
                    Trhová sadzba
                  </span>
                  {effectiveRentAmount > 0 ? (
                    <div>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-sm sm:text-base font-bold text-emerald-700 leading-tight">
                          €{rentPerSqm}
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal">/ m²</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate leading-tight mt-0.5">za m² mesačne</span>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm sm:text-base font-bold text-slate-400 mt-0.5">—</div>
                      <span className="text-[10px] text-slate-400 block truncate leading-tight mt-0.5">podľa zmluvy</span>
                    </div>
                  )}
                </div>

                {/* 4. Aktívny nájomca */}
                <div className="p-2.5 sm:p-3 flex flex-col justify-between min-h-[62px]">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block leading-tight">
                    Aktívny nájomca
                  </span>
                  <div>
                    <div className="text-sm sm:text-base font-bold text-slate-900 truncate leading-tight mt-0.5" title={activeLease?.tenantName || 'Voľný byt'}>
                      {activeLease?.tenantName || 'Voľný byt'}
                    </div>
                    <span className="text-[10px] text-slate-500 block truncate leading-tight mt-0.5">
                      {activeLease
                        ? `Do ${formatDate(activeLease.endDate)}`
                        : 'Pripravené k prenájmu'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Tenant Box and Details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
            {/* Active Tenant Box (Compact) */}
            <Card shadow="sm" className="lg:col-span-2 xl:col-span-3 border border-slate-200 bg-white rounded-xl overflow-hidden">
              <CardBody className="p-3.5 sm:p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      {isHotelOperator ? 'Hotelový operátor' : 'Aktívny nájomca'}
                    </h3>
                    {activeLease && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0 ring-2 ring-emerald-100 shadow-xs" title="Aktívna zmluva" />
                    )}
                    {isHotelOperator && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Hotel</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {activeLease && (
                      <>
                        {isHotelOperator && (
                          <Button
                            size="sm"
                            variant="flat"
                            onPress={() => setIsHotelRevenueModalOpen(true)}
                            startContent={<Plus className="w-3 h-3" />}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium text-[11px] rounded-lg h-7 px-2"
                          >
                            Zaznamenať výnos
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={() => handleEditLease(activeLease)}
                          startContent={<Edit3 className="w-3 h-3" />}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] rounded-lg h-7 px-2"
                        >
                          Upraviť zmluvu
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          color="danger"
                          onPress={() => handleEndActiveLease(activeLease)}
                          startContent={<UserMinus className="w-3 h-3" />}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium text-[11px] rounded-lg h-7 px-2"
                          title="Ukončí aktívny nájom a presunie nájomcu do histórie zmlúv"
                        >
                          Odstrániť nájomcu
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {activeLease ? (
                  <div className="space-y-3">
                    {/* Tenant Contacts & Lease Details */}
                    <div className="space-y-3">
                      {/* 6 Unified Lease & Tenant Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-3 text-xs">
                        {/* 1. Meno */}
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Meno</span>
                          <span className="font-semibold text-slate-800 text-xs mt-0.5 block truncate">
                            {activeLease.tenantName}
                          </span>
                        </div>

                        {/* 2. Email */}
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Email</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="font-semibold text-slate-800 text-xs truncate select-all">
                              {activeLease.tenantEmail || '—'}
                            </span>
                            {activeLease.tenantEmail && (
                              <button
                                type="button"
                                onClick={() => handleCopyContact(activeLease.tenantEmail, 'email')}
                                className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition cursor-pointer select-none shrink-0"
                                title="Kopírovať email"
                              >
                                {copiedContact === 'email' ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 3. Telefón */}
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Telefón</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="font-semibold text-slate-800 text-xs truncate select-all">
                              {activeLease.tenantPhone || '—'}
                            </span>
                            {activeLease.tenantPhone && (
                              <button
                                type="button"
                                onClick={() => handleCopyContact(activeLease.tenantPhone, 'phone')}
                                className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition cursor-pointer select-none shrink-0"
                                title="Kopírovať telefónne číslo"
                              >
                                {copiedContact === 'phone' ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 4. Doba nájmu */}
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Doba nájmu</span>
                          <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                            {formatDate(activeLease.startDate)} &rarr; {formatDate(activeLease.endDate)}
                          </span>
                        </div>

                        {/* 5. Mesačný nájom / Posledný výnos */}
                        {isHotelOperator ? (
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Posledný výnos</span>
                            {unitHotelRevenue.length > 0 ? (
                              <div className="mt-0.5">
                                <span className="font-bold text-amber-700 text-xs">€{unitHotelRevenue[0].revenueAmount.toLocaleString()}</span>
                                <span className="text-[10px] text-slate-500 ml-1">{unitHotelRevenue[0].month}</span>
                                {unitHotelRevenue[0].occupancyPercent != null && (
                                  <span className="text-[10px] text-slate-500 ml-1">({unitHotelRevenue[0].occupancyPercent}% obs.)</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic mt-0.5 block">Zatiaľ nezaznamenané</span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Mesačný nájom</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="font-bold text-slate-900 text-xs">€{activeLease.rentAmount.toLocaleString()}</span>
                              <span className="text-[10px] text-slate-500">/ mes</span>
                              {(activeLease.baseRent !== undefined || activeLease.utilitiesAmount !== undefined) && (
                                <span className="text-[10px] text-slate-500 font-normal ml-1 truncate" title={`Nájom: €${(activeLease.baseRent ?? activeLease.rentAmount).toLocaleString()} + Energie: €${(activeLease.utilitiesAmount ?? 0).toLocaleString()}`}>
                                  (€{(activeLease.baseRent ?? activeLease.rentAmount).toLocaleString()} + €{(activeLease.utilitiesAmount ?? 0).toLocaleString()})
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 6. Spoločnosť / Kaucia */}
                        {isHotelOperator && activeLease.operatorCompany ? (
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Spoločnosť</span>
                            <span className="font-semibold text-slate-800 text-xs mt-0.5 block truncate">{activeLease.operatorCompany}</span>
                          </div>
                        ) : !isHotelOperator ? (
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Zložená kaucia</span>
                            <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                              €{activeLease.depositAmount.toLocaleString()}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Move-in / Handover Photos Section */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            if (activeLease.moveInPhotos && activeLease.moveInPhotos.length > 0) {
                              openLightbox(activeLease.moveInPhotos, 0, `Stav pred začiatkom nájmu – ${activeLease.tenantName}`);
                            } else {
                              setActiveTab('photos');
                            }
                          }}
                          className="flex items-center gap-1.5 group cursor-pointer text-left hover:opacity-90 transition"
                          title={activeLease.moveInPhotos && activeLease.moveInPhotos.length > 0 ? "Kliknutím otvoriť fotografie v plnej veľkosti" : "Zobraziť v záložke Fotky"}
                        >
                          <Camera className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-600 transition-colors" />
                          <span className="text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors underline-offset-2 group-hover:underline">
                            Stav pred začiatkom nájmu
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium bg-slate-100 group-hover:bg-slate-200 px-1.5 py-0.5 rounded-full transition">
                            {activeLease.moveInPhotos?.length || 0}
                          </span>
                        </button>
                        <div className="flex items-center gap-1.5">
                          {activeLease.moveInPhotos && activeLease.moveInPhotos.length > 0 && (
                            <button
                              type="button"
                              onClick={() => openLightbox(activeLease.moveInPhotos || [], 0, `Stav pred začiatkom nájmu – ${activeLease.tenantName}`)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-md text-[11px] font-medium transition cursor-pointer"
                              title="Otvoriť galériu v plnej veľkosti"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Zobraziť</span>
                            </button>
                          )}
                          <label className="cursor-pointer inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-md text-[11px] font-medium transition shadow-2xs">
                            <UploadCloud className="w-3 h-3 text-slate-500" />
                            <span>+ Pridať fotky</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handleMoveInPhotosUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      {activeLease.moveInPhotos && activeLease.moveInPhotos.length > 0 ? (
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                          {activeLease.moveInPhotos.map((mPhoto, pIdx) => (
                            <div
                              key={pIdx}
                              onClick={() => openLightbox(activeLease.moveInPhotos || [], pIdx, `Stav pred začiatkom nájmu – ${activeLease.tenantName}`)}
                              className="group relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 aspect-square shadow-2xs cursor-pointer hover:border-emerald-400 transition"
                            >
                              <img
                                src={mPhoto}
                                alt={`Stav pred nájmom ${pIdx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 p-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openLightbox(activeLease.moveInPhotos || [], pIdx, `Stav pred začiatkom nájmu – ${activeLease.tenantName}`);
                                  }}
                                  className="w-5 h-5 rounded bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-xs transition"
                                  title="Zobraziť v plnej veľkosti"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMoveInPhoto(mPhoto);
                                  }}
                                  className="w-5 h-5 rounded bg-rose-600/90 hover:bg-rose-700 text-white flex items-center justify-center shadow-xs transition"
                                  title="Vymazať fotografiu"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-xs text-slate-500">
                          <span className="text-[11px] text-slate-400">
                            Zatiaľ nie sú nahrané žiadne fotografie zachytávajúce stav bytu pred začiatkom tohto nájmu.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Hotel Revenue Section */}
                    {isHotelOperator && (
                      <div className="pt-3 border-t border-amber-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                            <span className="text-xs font-semibold text-slate-800">Mesačné výnosy z hotela</span>
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full font-medium">
                              {unitHotelRevenue.length} záz.
                            </span>
                          </div>
                          {unitHotelRevenue.length > 0 && (
                            <span className="text-[11px] text-slate-500">
                              Priemer: <span className="font-semibold text-amber-700">
                                €{Math.round(unitHotelRevenue.reduce((s, r) => s + r.revenueAmount, 0) / unitHotelRevenue.length).toLocaleString()}
                              </span>
                            </span>
                          )}
                        </div>
                        {unitHotelRevenue.length > 0 ? (
                          <div className="rounded-lg border border-slate-200 overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                  <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Mesiac</th>
                                  <th className="text-right px-3 py-2 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Výnos</th>
                                  <th className="text-right px-3 py-2 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Obsadenosť</th>
                                  <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Poznámka</th>
                                  <th className="px-2 py-2"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {unitHotelRevenue.map((rev, idx) => (
                                  <tr key={rev.id} className={`border-b border-slate-100 last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                    <td className="px-3 py-2 font-medium text-slate-900">{rev.month}</td>
                                    <td className="px-3 py-2 text-right font-bold text-amber-700">€{rev.revenueAmount.toLocaleString()}</td>
                                    <td className="px-3 py-2 text-right text-slate-600">
                                      {rev.occupancyPercent != null ? `${rev.occupancyPercent}%` : '—'}
                                    </td>
                                    <td className="px-3 py-2 text-slate-500 truncate max-w-[120px]">{rev.notes || '—'}</td>
                                    <td className="px-2 py-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (confirm(`Vymazať záznam výnosu za ${rev.month}?`)) {
                                            deleteHotelRevenue(rev.id);
                                          }
                                        }}
                                        className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition"
                                        title="Vymazať"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg border border-dashed border-amber-200 bg-amber-50/30 text-center">
                            <p className="text-[11px] text-amber-600/70">Zatiaľ nie sú zaznamenané žiadne mesačné výnosy.</p>
                            <button
                              type="button"
                              onClick={() => setIsHotelRevenueModalOpen(true)}
                              className="mt-1.5 text-[11px] font-semibold text-amber-600 hover:text-amber-700 underline underline-offset-2"
                            >
                              + Zaznamenať prvý výnos
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center space-y-2">
                    <p className="text-slate-500 text-xs">Tento byt je momentálne voľný a nemá evidovaného nájomcu.</p>
                    <Button
                      size="sm"
                      className="bg-slate-900 text-white font-medium text-xs h-7 px-3"
                      onPress={() => onOpenAddLease(property.id)}
                    >
                      + Zaevidovať nového nájomcu
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Quick Property Summary Card */}
            <Card shadow="sm" className="border border-slate-200 bg-white rounded-xl overflow-hidden">
              <CardBody className="p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Parametre nehnuteľnosti
                  </h3>
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => setIsEditModalOpen(true)}
                    startContent={<Edit3 className="w-3 h-3 text-slate-500" />}
                    className="text-xs text-slate-700 hover:text-slate-900 font-medium h-6 px-2"
                  >
                    Upraviť
                  </Button>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Typ nehnuteľnosti:</span>
                    <span className="font-semibold text-slate-900">
                      {property.propertyType === 'apartment'
                        ? <span className="flex items-center gap-1 justify-end"><Building2 className="w-3.5 h-3.5" /> Apartmán</span>
                        : <span className="flex items-center gap-1 justify-end"><Home className="w-3.5 h-3.5" /> Byt</span>
                      }
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Mesto:</span>
                    <span className="font-medium text-slate-900">{property.city}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Počet izieb:</span>
                    <span className="font-medium text-slate-900">{property.bedrooms}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Poschodie:</span>
                    <span className="font-medium text-slate-900">
                      {property.floor !== undefined ? `${property.floor}. poschodie` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Box className="w-3.5 h-3.5 text-slate-400" />
                      Pivničná kobka:
                    </span>
                    <span className="font-medium text-slate-900">
                      {property.hasCellar
                        ? `Áno (${property.cellarAreaSqm ? property.cellarAreaSqm + ' m²' : ''}${property.cellarNumber ? ', č. ' + property.cellarNumber : ''})`
                        : 'Nie'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Car className="w-3.5 h-3.5 text-slate-400" />
                      Parkovacie státie:
                    </span>
                    <span className="font-medium text-slate-900">
                      {property.hasParking
                        ? `Áno (${property.parkingSpotNumber ? 'č. ' + property.parkingSpotNumber : 'priradené'})`
                        : 'Nie'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Wind className="w-3.5 h-3.5 text-slate-400" />
                      Klimatizácia:
                    </span>
                    <span className="font-medium text-slate-900">
                      {property.hasAC ? 'Áno' : 'Nie'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      Balkón / Lodžia:
                    </span>
                    <span className="font-medium text-slate-900">
                      {property.hasBalcony ? 'Áno' : 'Nie'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Armchair className="w-3.5 h-3.5 text-slate-400" />
                      Zariadenie:
                    </span>
                    <span className="font-medium text-slate-900">
                      {property.furnishingStatus === 'unfurnished' ? 'Nezariadený' : 'Zariadený'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Inventárnych položiek:</span>
                    <span className="font-medium text-slate-900">{unitInventory.length} ks</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Evidované výdavky:</span>
                    <span className="font-semibold text-rose-600">
                      €{unitExpenses.reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()}
                    </span>
                  </div>
                  {property.notes && (
                    <div className="pt-2">
                      <span className="text-slate-500 block mb-1">Poznámka k bytu:</span>
                      <p className="p-2 bg-slate-50 rounded-lg text-slate-700 italic border border-slate-100">
                        {property.notes}
                      </p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

        {/* TAB: INVENTORY */}
        {activeTab === 'inventory' && (
          <Card shadow="sm" className="border border-slate-200 bg-white rounded-xl overflow-hidden">
            <CardBody className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Inventár a spotrebiče v byte</h3>
                  <p className="text-xs text-slate-500">Evidencia vybavenia, modelov a záručných lehôt</p>
                </div>
                <Button
                  size="sm"
                  className="bg-slate-900 text-white font-medium shadow-xs"
                  onPress={() => onOpenAddInventory(property.id)}
                  startContent={<Plus className="w-3.5 h-3.5" />}
                >
                  Pridať položku
                </Button>
              </div>

              <Table
                aria-label="Inventár v byte"
                shadow="none"
                classNames={{
                  base: 'border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs',
                  wrapper: 'p-0 shadow-none bg-transparent rounded-none',
                  table: 'min-w-full',
                  thead: '[&>tr]:first:rounded-none',
                  th: 'first:rounded-none last:rounded-none bg-slate-50/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider py-3 px-4 border-b border-slate-200',
                  td: 'py-3 px-4 text-xs border-b border-slate-100 last:border-0',
                  tr: 'hover:bg-slate-50/70 transition-colors',
                }}
              >
                <TableHeader>
                  <TableColumn key="name">NÁZOV POLOŽKY</TableColumn>
                  <TableColumn key="category">KATEGÓRIA</TableColumn>
                  <TableColumn key="model">ZNAČKA / MODEL</TableColumn>
                  <TableColumn key="cost">CENA</TableColumn>
                  <TableColumn key="warranty">ZÁRUKA DO</TableColumn>
                  <TableColumn key="actions">{''}</TableColumn>
                </TableHeader>
                <TableBody emptyContent="V tomto byte zatiaľ nie je evidovaný žiadny inventár.">
                  {unitInventory.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        {item.notes && (
                          <div className="text-[11px] text-slate-400 italic max-w-xs truncate" title={item.notes}>
                            📝 {item.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="capitalize text-slate-500">{item.category}</TableCell>
                      <TableCell className="text-slate-500">{item.brandModel || '—'}</TableCell>
                      <TableCell className="text-slate-800 font-semibold">€{item.cost}</TableCell>
                      <TableCell className="text-slate-500">{item.warrantyExpiresAt || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => {
                            if (confirm(`Naozaj chcete vymazať položku ${item.name}?`)) {
                              deleteInventoryItem(item.id);
                            }
                          }}
                          className="min-w-7 w-7 h-7 text-slate-400 hover:text-rose-600"
                          title="Vymazať"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        )}

        {/* TAB: EXPENSES */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            {/* Quick Metrics Bar for Expenses */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-amber-200/90 bg-amber-50/50 shadow-2xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-900 block flex items-center gap-1">
                  <Package className="w-3 h-3 text-amber-600" />
                  Výmena spotrebičov
                </span>
                <div className="text-base sm:text-lg font-black text-amber-950 mt-1">
                  €{unitExpenses.filter(e => e.category === 'replacement').reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()}
                </div>
                <span className="text-[10px] text-amber-700 block mt-0.5">
                  {unitExpenses.filter(e => e.category === 'replacement').length} zaevidovaných výmen
                </span>
              </div>

              <div className="p-3 rounded-xl border border-blue-200/80 bg-blue-50/30 shadow-2xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-900 block flex items-center gap-1">
                  <Wrench className="w-3 h-3 text-blue-600" />
                  Servis a údržba
                </span>
                <div className="text-base sm:text-lg font-black text-blue-950 mt-1">
                  €{unitExpenses.filter(e => e.category === 'service' || e.category === 'repair' || e.category === 'utility').reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()}
                </div>
                <span className="text-[10px] text-blue-700 block mt-0.5">
                  {unitExpenses.filter(e => e.category === 'service' || e.category === 'repair' || e.category === 'utility').length} zásahov
                </span>
              </div>

              <div className="p-3 rounded-xl border border-teal-200/80 bg-teal-50/30 shadow-2xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-teal-900 block flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-teal-600" />
                  Upratovanie
                </span>
                <div className="text-base sm:text-lg font-black text-teal-950 mt-1">
                  €{unitExpenses.filter(e => e.category === 'cleaning').reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()}
                </div>
                <span className="text-[10px] text-teal-700 block mt-0.5">
                  {unitExpenses.filter(e => e.category === 'cleaning').length} upratovaní
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                  Celkové výdavky
                </span>
                <div className="text-base sm:text-lg font-black text-rose-600 mt-1">
                  €{unitExpenses.reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Spolu {unitExpenses.length} položiek
                </span>
              </div>
            </div>

            <Card shadow="sm" className="border border-slate-200 bg-white rounded-xl overflow-hidden">
              <CardBody className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Výdavky a výmena spotrebičov ({unitExpenses.length})</h3>
                    <p className="text-xs text-slate-500">Evidencia nákupu nových spotrebičov, techniky a servisných nákladov bytu</p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-slate-900 text-white font-medium shadow-xs"
                    onPress={() => onOpenAddExpense(property.id)}
                    startContent={<Plus className="w-3.5 h-3.5" />}
                  >
                    Zaznamenať výdavok
                  </Button>
                </div>

                <Table
                  aria-label="Výdavky na byt"
                  shadow="none"
                  classNames={{
                    base: 'border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs',
                    wrapper: 'p-0 shadow-none bg-transparent rounded-none',
                    table: 'min-w-full',
                    thead: '[&>tr]:first:rounded-none',
                    th: 'first:rounded-none last:rounded-none bg-slate-50/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider py-3 px-4 border-b border-slate-200',
                    td: 'py-3 px-4 text-xs border-b border-slate-100 last:border-0',
                    tr: 'hover:bg-slate-50/70 transition-colors',
                  }}
                >
                  <TableHeader>
                    <TableColumn key="date">DÁTUM</TableColumn>
                    <TableColumn key="desc">POPIS SPOTREBIČA / VÝDAVKU</TableColumn>
                    <TableColumn key="cat">TYP VÝDAVKU</TableColumn>
                    <TableColumn key="amount">SUMA</TableColumn>
                    <TableColumn key="actions">{''}</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent="Pre tento byt zatiaľ nie je zaevidovaná žiadna výmena spotrebiča ani výdavok.">
                    {unitExpenses.map(exp => (
                      <TableRow key={exp.id}>
                        <TableCell className="text-slate-500">{formatDate(exp.date)}</TableCell>
                        <TableCell className="text-slate-900 font-semibold">{exp.description}</TableCell>
                        <TableCell>
                          {exp.category === 'replacement' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Package className="w-3 h-3 text-amber-600 shrink-0" />
                              Výmena spotrebičov
                            </span>
                          ) : exp.category === 'cleaning' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                              <Sparkles className="w-3 h-3 text-teal-600 shrink-0" />
                              Upratovanie
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <Wrench className="w-3 h-3 text-blue-500 shrink-0" />
                              Servis a údržba
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-rose-600 font-bold">-€{exp.amount}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={() => {
                              if (confirm(`Naozaj chcete vymazať výdavok "${exp.description}"?`)) {
                                deleteExpense(exp.id);
                              }
                            }}
                            className="min-w-7 w-7 h-7 text-slate-400 hover:text-rose-600"
                            title="Vymazať"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          </div>
        )}

        {/* TAB: HISTORY (História nájomcov + História úprav a údržby) */}
        {(activeTab === 'history' || activeTab === 'leases' || activeTab === 'maintenance') && (
          <div className="space-y-5">
            {/* 1. Sekcia: História nájomných zmlúv */}
            <Card shadow="sm" className="border border-slate-200 bg-white rounded-xl overflow-hidden">
              <CardBody className="p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">História nájomných zmlúv</h3>
                    <p className="text-xs text-slate-500">Zoznam súčasných a predošlých zmlúv</p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-slate-900 text-white font-medium shadow-xs"
                    onPress={() => onOpenAddLease(property.id)}
                    startContent={<Plus className="w-3.5 h-3.5" />}
                  >
                    Nová zmluva
                  </Button>
                </div>

                <div className="space-y-3">
                  {unitLeases.map(lease => (
                    <div
                      key={lease.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full inline-block shrink-0 ring-2 shadow-xs ${
                              getEffectiveLeaseStatus(lease) === 'active'
                                ? 'bg-emerald-500 ring-emerald-100'
                                : 'bg-slate-400 ring-slate-200'
                            }`}
                            title={getEffectiveLeaseStatus(lease) === 'active' ? 'Aktívna zmluva' : 'Neaktívna zmluva'}
                          />
                          <span className="font-semibold text-slate-900 text-sm">{lease.tenantName}</span>
                          <span className="text-xs text-slate-500">({lease.tenantEmail})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="light"
                            isIconOnly
                            onPress={() => handleEditLease(lease)}
                            className="min-w-7 w-7 h-7 text-slate-600 hover:text-slate-900 rounded-md"
                            title="Upraviť zmluvu"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="light"
                            isIconOnly
                            onPress={() => handleDeleteLease(lease.id, lease.tenantName)}
                            className="min-w-7 w-7 h-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md"
                            title="Vymazať zmluvu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2 pt-1 border-t border-slate-200/60">
                        <span>
                          Platnosť: <strong>{formatDate(lease.startDate)}</strong> &rarr; <strong>{formatDate(lease.endDate)}</strong>
                        </span>
                        <span>
                          Mesačný nájom: <strong>€{lease.rentAmount.toLocaleString()} / mes</strong>
                          {(lease.baseRent !== undefined || lease.utilitiesAmount !== undefined) && (
                            <span className="text-slate-500 font-normal ml-1">
                              (Nájom: €{(lease.baseRent ?? lease.rentAmount).toLocaleString()} + Energie: €{(lease.utilitiesAmount ?? 0).toLocaleString()})
                            </span>
                          )}
                          {' '}(Kaucia: €{lease.depositAmount.toLocaleString()})
                        </span>
                      </div>

                      {lease.contractFileUrl && (
                        <div className="pt-1">
                          <Button
                            size="sm"
                            variant="light"
                            onPress={() => openLeasePdfWindow(lease, property)}
                            className="text-emerald-700 hover:underline p-0 h-auto font-medium text-xs cursor-pointer"
                            startContent={<Download className="w-3.5 h-3.5" />}
                          >
                            {lease.contractFileName || 'Zobraziť zmluvu v prehliadači (PDF)'}
                          </Button>
                        </div>
                      )}

                      {lease.moveInPhotos && lease.moveInPhotos.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                          <button
                            type="button"
                            onClick={() => openLightbox(lease.moveInPhotos || [], 0, `Stav pred začiatkom nájmu – ${lease.tenantName}`)}
                            className="text-[11px] font-semibold text-slate-700 hover:text-emerald-700 flex items-center gap-1 cursor-pointer group text-left transition"
                            title="Kliknutím otvoriť fotografie v plnej veľkosti"
                          >
                            <Camera className="w-3 h-3 text-slate-500 group-hover:text-emerald-600" />
                            <span className="group-hover:underline">Stav pred začiatkom nájmu ({lease.moveInPhotos.length}):</span>
                          </button>
                          <div className="flex flex-wrap gap-1.5">
                            {lease.moveInPhotos.map((photo, pIdx) => (
                              <img
                                key={pIdx}
                                src={photo}
                                alt={`Foto ${pIdx + 1}`}
                                onClick={() => openLightbox(lease.moveInPhotos || [], pIdx, `Stav pred začiatkom nájmu – ${lease.tenantName}`)}
                                className="w-10 h-10 object-cover rounded-md border border-slate-200 cursor-pointer hover:opacity-80 transition shadow-2xs"
                                title="Kliknutím otvoriť v plnej veľkosti"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {unitLeases.length === 0 && (
                    <div className="py-8 text-center text-slate-400 text-sm">
                      Pre tento byt zatiaľ neboli zaevidované žiadne nájomné zmluvy.
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* 2. Sekcia: História zmien spotrebičov a údržby */}
            <Card shadow="sm" className="border border-slate-200 bg-white rounded-xl overflow-hidden">
              <CardBody className="p-5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">História zmien spotrebičov a údržby</h3>
                    <p className="text-xs text-slate-500">Chronologický prehľad výmen techniky, opráv a servisných zásahov</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-slate-900 text-white font-medium shadow-xs"
                      onPress={() => onOpenAddExpense(property.id)}
                      startContent={<Plus className="w-3.5 h-3.5" />}
                    >
                      Zaevidovať servis / opravu
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      className="text-slate-800 font-medium"
                      onPress={() => onOpenAddInventory(property.id)}
                      startContent={<Plus className="w-3.5 h-3.5" />}
                    >
                      Pridať nový spotrebič
                    </Button>
                  </div>
                </div>

                {/* Maintenance & Replacement Timeline / Table */}
                <div className="space-y-4">
                  {/* Spotrebice s evidovanou vymenou */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-slate-500" />
                      Spotrebiče a technika v byte (stav a dátumy inštalácie/výmeny)
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {unitInventory.map(item => (
                        <div key={item.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-900">{item.name}</span>
                            <Chip size="sm" variant="flat" color="default" className="text-[10px]">
                              {item.category}
                            </Chip>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                            <div>
                              <span className="text-slate-400 block">Značka a model:</span>
                              <span className="font-medium text-slate-800">{item.brandModel || '—'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Výrobné číslo (S/N):</span>
                              <span className="font-medium text-slate-800">{item.serialNumber || '—'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Dátum inštalácie:</span>
                              <span className="font-medium text-slate-800">{formatDate(item.purchaseDate)}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Záruka platná do:</span>
                              <span className="font-medium text-slate-800">{item.warrantyExpiresAt ? formatDate(item.warrantyExpiresAt) : 'Bez záruky'}</span>
                            </div>
                          </div>
                          {item.replacedDate && (
                            <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200/60 text-[11px] text-amber-900">
                              🔄 <strong>Výmena vykonaná:</strong> {formatDate(item.replacedDate)}
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200/50">
                              📝 {item.notes}
                            </div>
                          )}
                        </div>
                      ))}

                      {unitInventory.length === 0 && (
                        <div className="col-span-full py-6 text-center text-slate-400 text-xs">
                          Zatiaľ nie sú evidované žiadne spotrebiče pre tento byt.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Servisne zasahy a opravy */}
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      Záznamy o servisných zásahoch, revíziách a opravách
                    </span>

                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden">
                      {unitExpenses
                        .filter(e => e.category === 'repair' || e.category === 'replacement')
                        .map(exp => (
                          <div key={exp.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-900">{exp.description}</span>
                                <Chip
                                  size="sm"
                                  variant="flat"
                                  color={exp.category === 'replacement' ? 'warning' : 'primary'}
                                  className="text-[10px] h-5 px-1 font-medium"
                                >
                                  {exp.category === 'replacement' ? 'Výmena spotrebiča / dielca' : 'Oprava / Servis'}
                                </Chip>
                              </div>
                              <span className="text-[11px] text-slate-400">Dátum realizácie: {formatDate(exp.date)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-rose-600 font-bold">-€{exp.amount}</span>
                            </div>
                          </div>
                        ))}

                      {unitExpenses.filter(e => e.category === 'repair' || e.category === 'replacement').length === 0 && (
                        <div className="py-8 text-center text-slate-400 text-xs">
                          Pre tento byt zatiaľ nie sú evidované žiadne opravy ani výmeny spotrebičov.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* TAB: PHOTOS GALLERY (Posledná karta) */}
        {activeTab === 'photos' && (
          <div className="space-y-6">
            {/* 1. SEKCIA: REPREZENTATÍVNE FOTOGRAFIE BYTU */}
            <Card shadow="sm" className="border border-slate-200 bg-white rounded-xl overflow-hidden">
              <CardBody className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        Reprezentatívne fotografie bytu ({allPhotos.length})
                      </h3>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        Portfólio & Prezentácia
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Prezentačné fotografie nehnuteľnosti, výber hlavnej titulnej fotografie a správa galérie
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium shadow-xs transition">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Pridať fotky</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Photos Grid with Full Actions */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2.5">
                  {allPhotos.map((pUrl, idx) => {
                    const isCover = property.imageUrl === pUrl;
                    return (
                      <div
                        key={idx}
                        className={`group relative rounded-lg overflow-hidden border transition-all shadow-2xs bg-white flex flex-col ${
                          isCover ? 'border-emerald-600 ring-2 ring-emerald-600/20' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Image Preview */}
                        <div className="aspect-4/3 w-full overflow-hidden bg-slate-100 relative">
                          <img
                            src={pUrl}
                            alt={`Fotografia ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                            onClick={() => openLightbox(allPhotos, idx, `Reprezentatívne fotografie – ${property.name}`)}
                          />

                          {/* Badges on top */}
                          <div className="absolute top-1 left-1 flex items-center gap-1">
                            {isCover ? (
                              <Chip size="sm" color="success" variant="solid" className="text-[8px] h-4 px-1 font-semibold shadow-xs">
                                ⭐ Hlavná
                              </Chip>
                            ) : (
                              <span className="px-1 py-0.5 rounded bg-black/60 backdrop-blur-md text-white text-[8px] font-medium border border-white/20">
                                #{idx + 1}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="p-1.5 bg-white flex items-center justify-between gap-1 border-t border-slate-100 mt-auto">
                          {isCover ? (
                            <span className="text-[9px] text-emerald-700 font-semibold flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" />
                              Hlavná
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="flat"
                              onPress={() => handleSetMainPhoto(pUrl)}
                              className="text-[9px] h-5 px-1.5 min-w-0 text-slate-700 hover:text-slate-900 bg-slate-100 font-medium rounded truncate"
                              title="Nastaviť ako hlavnú"
                            >
                              Hlavná
                            </Button>
                          )}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => handleDownloadPhoto(pUrl, idx)}
                              className="min-w-5 w-5 h-5 text-slate-500 hover:text-slate-900 rounded"
                              title="Stiahnuť súbor"
                            >
                              <Download className="w-2.5 h-2.5" />
                            </Button>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => {
                                if (confirm('Naozaj chcete vymazať túto fotografiu z galérie?')) {
                                  handleDeletePhoto(pUrl);
                                }
                              }}
                              className="min-w-5 w-5 h-5 text-slate-400 hover:text-rose-600 rounded"
                              title="Vymazať fotografiu"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {allPhotos.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 text-sm">
                      Pre tento byt zatiaľ nie sú nahrané žiadne fotografie. Použite tlačidlo „Pridať fotky“ vyššie.
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* 2. AUTOMATICKÉ SEKCIE: ODOVZDANIE BYTU PRE JEDNOTLIVÉ ZMLUVY */}
            {handoverLeases.map((lease) => {
              const isActive = lease.id === activeLease?.id;
              const photos = lease.moveInPhotos || [];
              return (
                <Card key={lease.id} shadow="sm" className="border border-slate-200 bg-white rounded-xl overflow-hidden">
                  <CardBody className="p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Camera className="w-4 h-4 text-slate-600" />
                          <button
                            type="button"
                            onClick={() => {
                              if (photos.length > 0) {
                                openLightbox(photos, 0, `Stav pred začiatkom nájmu – ${lease.tenantName}`);
                              }
                            }}
                            className={`text-sm font-bold text-slate-900 ${photos.length > 0 ? 'hover:text-emerald-700 cursor-pointer hover:underline text-left' : ''}`}
                            title={photos.length > 0 ? 'Otvoriť fotografie v plnej veľkosti' : undefined}
                          >
                            Odovzdanie bytu – {lease.tenantName} ({photos.length})
                          </button>
                          {isActive ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Aktívny nájomca
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              Ukončený nájom
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (photos.length > 0) {
                              openLightbox(photos, 0, `Stav pred začiatkom nájmu – ${lease.tenantName}`);
                            }
                          }}
                          className={`text-xs text-slate-500 mt-0.5 text-left block ${photos.length > 0 ? 'hover:text-emerald-700 cursor-pointer' : ''}`}
                        >
                          <span className="font-semibold text-slate-700 hover:underline">Stav bytu pred začiatkom nájmu</span> • Doba nájmu: {formatDate(lease.startDate)} → {formatDate(lease.endDate)}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        {photos.length > 0 && (
                          <Button
                            size="sm"
                            variant="flat"
                            onPress={() => openLightbox(photos, 0, `Stav pred začiatkom nájmu – ${lease.tenantName}`)}
                            startContent={<ExternalLink className="w-3.5 h-3.5" />}
                            className="bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-medium text-xs rounded-lg shadow-2xs"
                          >
                            Otvoriť galériu
                          </Button>
                        )}
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-medium shadow-2xs transition">
                          <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                          <span>+ Pridať fotky</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => handleLeaseMoveInPhotosUpload(lease, e)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Photos Grid */}
                    {photos.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2.5">
                        {photos.map((mPhoto, pIdx) => (
                          <div
                            key={pIdx}
                            className="group relative rounded-lg overflow-hidden border border-slate-200 hover:border-slate-300 transition-all shadow-2xs bg-white flex flex-col"
                          >
                            <div className="aspect-4/3 w-full overflow-hidden bg-slate-100 relative">
                              <img
                                src={mPhoto}
                                alt={`Odovzdanie ${lease.tenantName} ${pIdx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                                onClick={() => openLightbox(photos, pIdx, `Odovzdanie bytu – ${lease.tenantName}`)}
                              />
                              <div className="absolute top-1 left-1">
                                <span className="px-1 py-0.5 rounded bg-black/60 backdrop-blur-md text-white text-[8px] font-medium border border-white/20">
                                  #{pIdx + 1}
                                </span>
                              </div>
                            </div>

                            <div className="p-1.5 bg-white flex items-center justify-between gap-1 border-t border-slate-100 mt-auto">
                              <span className="text-[10px] text-slate-400 font-medium">
                                Foto #{pIdx + 1}
                              </span>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  onPress={() => {
                                    const link = document.createElement('a');
                                    link.href = mPhoto;
                                    link.download = `odovzdanie_${lease.tenantName.replace(/\s+/g, '_')}_${pIdx + 1}.jpg`;
                                    link.target = '_blank';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }}
                                  className="min-w-5 w-5 h-5 text-slate-500 hover:text-slate-900 rounded"
                                  title="Stiahnuť súbor"
                                >
                                  <Download className="w-2.5 h-2.5" />
                                </Button>
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  onPress={() => handleDeleteLeaseMoveInPhoto(lease, mPhoto)}
                                  className="min-w-5 w-5 h-5 text-slate-400 hover:text-rose-600 rounded"
                                  title="Vymazať fotografiu"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-400">
                        Zatiaľ nie sú nahrané žiadne fotografie zachytávajúce stav bytu pred začiatkom tohto nájmu.
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      </div>

      {/* Edit Property Modal */}
      <EditPropertyModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        property={property}
      />

      {/* Edit Lease Modal */}
      <EditLeaseModal
        isOpen={isEditLeaseModalOpen}
        onClose={() => {
          setIsEditLeaseModalOpen(false);
          setSelectedLeaseToEdit(null);
        }}
        lease={selectedLeaseToEdit}
      />

      {/* Fullscreen Photo Lightbox Modal */}
      <ImageLightboxModal
        isOpen={lightboxState.isOpen}
        onClose={() => setLightboxState(prev => ({ ...prev, isOpen: false }))}
        photos={lightboxState.photos}
        initialIndex={lightboxState.index}
        title={lightboxState.title}
      />

      {/* Hotel Revenue Modal */}
      {activeLease && isHotelOperator && (
        <AddHotelRevenueModal
          isOpen={isHotelRevenueModalOpen}
          onClose={() => setIsHotelRevenueModalOpen(false)}
          leaseId={activeLease.id}
          propertyId={property.id}
          propertyName={`${property.name} (č. ${property.unitNumber})`}
        />
      )}
    </div>
  );
};
