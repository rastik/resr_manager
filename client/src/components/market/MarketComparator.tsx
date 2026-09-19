import React, { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  Button,
  Chip,
  Spinner,
  Progress,
} from '@heroui/react';
import {
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  MapPin,
  RefreshCw,
  Sparkles,
  Maximize2,
  Bed,
  Car,
  Warehouse,
  Wind,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  SlidersHorizontal,
  Home,
  Check,
  Building,
  Building2,
  Armchair,
} from 'lucide-react';
import { useProperty } from '../../context/PropertyContext';
import { api } from '../../services/api';
import { Property, MarketComparisonResponse, MarketComparableItem } from '../../types';

interface MarketComparatorProps {
  onSelectProperty?: (id: string) => void;
}

function getCityForProperty(p?: Property): string {
  if (!p) return 'Trnava';
  const c = (p.city || '').trim();
  if (['berlin', 'vienna', 'central'].includes(c.toLowerCase())) {
    return 'Bratislava';
  }
  return c || 'Trnava';
}

export const MarketComparator: React.FC<MarketComparatorProps> = ({ onSelectProperty }) => {
  const { properties } = useProperty();

  const initialProp = properties.length > 0 ? properties[0] : undefined;

  // Selected apartment from portfolio
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(() => initialProp?.id || '');

  // Search parameters for Nehnutelnosti.sk (synced with active property)
  const [cityFilter, setCityFilter] = useState<string>(() => getCityForProperty(initialProp));
  const [roomsFilter, setRoomsFilter] = useState<string>(() => String(initialProp?.bedrooms || 2));
  const [sortBy, setSortBy] = useState<'confidence' | 'priceAsc' | 'priceDesc' | 'sqmAsc'>('confidence');

  // Live comparison data state
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<MarketComparisonResponse | null>(null);
  const [activeBreakdownId, setActiveBreakdownId] = useState<string | null>(null);

  // Sync selected property when properties list loads
  useEffect(() => {
    if (!selectedPropertyId && properties.length > 0) {
      const first = properties[0];
      setSelectedPropertyId(first.id);
      setCityFilter(getCityForProperty(first));
      setRoomsFilter(String(first.bedrooms || 2));
    }
  }, [properties, selectedPropertyId]);

  const activeProperty = properties.find(p => p.id === selectedPropertyId) || properties[0];

  // Fetch live comparables whenever selected property or main filters change
  const fetchComparables = async () => {
    if (!activeProperty) return;
    setLoading(true);
    try {
      const targetCity = cityFilter || getCityForProperty(activeProperty);
      const targetRooms = roomsFilter ? parseInt(roomsFilter, 10) : (activeProperty.bedrooms || 2);

      const res = await api.getMarketComparables({
        propertyId: activeProperty.id,
        city: targetCity,
        rooms: targetRooms,
        sizeSqm: activeProperty.sizeSqm,
        rentAmount: activeProperty.rentAmount,
      });

      if (res) {
        setData(res);
      }
    } catch (e) {
      console.error('Failed to load live market comparables', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeProperty) {
      const propCity = getCityForProperty(activeProperty);
      setCityFilter(propCity);
      setRoomsFilter(String(activeProperty.bedrooms || 2));
    }
  }, [selectedPropertyId]);

  useEffect(() => {
    fetchComparables();
  }, [selectedPropertyId, cityFilter, roomsFilter]);

  // Sorted comparables
  const comparables = data?.comparables ? [...data.comparables] : [];
  if (sortBy === 'confidence') {
    comparables.sort((a, b) => b.confidenceScore - a.confidenceScore);
  } else if (sortBy === 'priceAsc') {
    comparables.sort((a, b) => (a.totalRentPrice || a.rentPrice || 0) - (b.totalRentPrice || b.rentPrice || 0));
  } else if (sortBy === 'priceDesc') {
    comparables.sort((a, b) => (b.totalRentPrice || b.rentPrice || 0) - (a.totalRentPrice || a.rentPrice || 0));
  } else if (sortBy === 'sqmAsc') {
    comparables.sort((a, b) => (a.pricePerSqm || 0) - (b.pricePerSqm || 0));
  }

  const stats = data?.stats;

  const fallbackImg =
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80';

  return (
    <div className="space-y-6">
      {/* 1. Page Title & Live Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-950 tracking-tight">
              Trhové porovnanie s Nehnutelnosti.sk
            </h1>
            <Chip size="sm" color="success" variant="flat" className="text-[11px] font-semibold">
              Živé dáta
            </Chip>
            {stats?.hasJevAI ? (
              <Chip size="sm" color="secondary" variant="flat" className="text-[11px] font-semibold">
                TypeSafe Jev AI
              </Chip>
            ) : null}
          </div>
          <p className="text-xs text-slate-500 mt-1.5 ml-0.5">
            Vyhľadanie a výpočet miery zhody (Confidence Metric) najpodobnejších bytov na prenájom z portálu Nehnutelnosti.sk.
          </p>
        </div>

        <Button
          size="sm"
          variant="flat"
          color="primary"
          startContent={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          onPress={fetchComparables}
          className="text-xs font-semibold self-start sm:self-auto shrink-0 shadow-2xs"
        >
          Obnoviť ponuky z trhu
        </Button>
      </div>

      {/* 2. Visual Apartment Selector Strip (Karty výberu bytov s mini fotkami) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Vyberte byt z portfólia na porovnanie ({properties.length})
            </span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Kliknutím na kartu prepnete porovnávaný apartmán
          </span>
        </div>

        {/* Horizontal scrollable gallery of apartment cards */}
        <div className="flex items-stretch gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
          {properties.map(property => {
            const isSelected = selectedPropertyId === property.id;
            const imgUrl = property.imageUrl || (property.photos && property.photos[0]) || fallbackImg;
            const typeLabel = property.propertyType === 'apartment' ? 'Apartmán' : 'Byt';

            return (
              <button
                key={property.id}
                type="button"
                onClick={() => setSelectedPropertyId(property.id)}
                className={`flex items-center gap-3 p-2.5 rounded-xl text-left transition-all duration-200 shrink-0 min-w-[240px] sm:min-w-[270px] max-w-[290px] border cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs'
                }`}
              >
                {/* Mini Photo with status indicator overlay */}
                <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100 shadow-2xs">
                  <img
                    src={imgUrl}
                    alt={property.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={e => {
                      (e.target as HTMLImageElement).src = fallbackImg;
                    }}
                  />
                  {/* Status dot */}
                  <span
                    className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-xs ${
                      property.status === 'occupied' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    title={property.status === 'occupied' ? 'Prenajatý' : 'Voľný'}
                  />
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {typeLabel} {property.unitNumber}
                    </span>
                    {isSelected && (
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                    {property.name}
                  </p>

                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 font-medium">
                      {property.bedrooms} izby • {property.sizeSqm} m²
                    </span>
                    <span className="font-bold text-slate-900">
                      {property.rentAmount && property.rentAmount > 0
                        ? `€${property.rentAmount.toLocaleString()}`
                        : <span className="text-slate-400 font-normal">Bez nájmu</span>}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 3. Featured Active Apartment Spotlight Banner */}
        {activeProperty && (
          <div className="mt-3 pt-4 border-t border-slate-100/90 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60">
            {/* Left: Big photo + Info */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border border-slate-200 shadow-2xs relative bg-white">
                <img
                  src={activeProperty.imageUrl || (activeProperty.photos && activeProperty.photos[0]) || fallbackImg}
                  alt={activeProperty.name}
                  className="w-full h-full object-cover"
                />
                <span
                  className={`absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs ${
                    activeProperty.status === 'occupied'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {activeProperty.status === 'occupied' ? 'Prenajatý' : 'Voľný'}
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    {activeProperty.name} ({activeProperty.unitNumber})
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-semibold shrink-0">
                    Aktívny výber
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {activeProperty.address}, {activeProperty.city}{activeProperty.neighborhood && activeProperty.neighborhood.toLowerCase() !== 'central' ? ` (${activeProperty.neighborhood})` : ''}
                  </span>
                </div>

                {/* Specs chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200/80 font-medium text-slate-700">
                    {activeProperty.bedrooms} {activeProperty.bedrooms === 1 ? 'izba' : 'izby'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200/80 font-medium text-slate-700">
                    {activeProperty.sizeSqm} m²
                  </span>
                  {activeProperty.hasParking && (
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200/80 font-medium text-slate-700 flex items-center gap-1">
                      <Car className="w-3 h-3 text-emerald-600" />
                      Garáž/Státie
                    </span>
                  )}
                  {activeProperty.hasCellar && (
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200/80 font-medium text-slate-700 flex items-center gap-1">
                      <Warehouse className="w-3 h-3 text-slate-500" />
                      Kobka/Pivnica
                    </span>
                  )}
                  {activeProperty.hasAC && (
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200/80 font-medium text-slate-700 flex items-center gap-1">
                      <Wind className="w-3 h-3 text-cyan-600" />
                      Klíma
                    </span>
                  )}
                  {activeProperty.hasBalcony && (
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200/80 font-medium text-slate-700 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-amber-600" />
                      Balkón/Lodžia
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200/80 font-medium text-slate-700 flex items-center gap-1">
                    <Armchair className="w-3 h-3 text-slate-500" />
                    {activeProperty.furnishingStatus === 'unfurnished' ? 'Nezariadený' : 'Zariadený'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Rent breakdown badge */}
            <div className="flex flex-row md:flex-col items-start md:items-end justify-between md:justify-center border-t md:border-t-0 pt-2 md:pt-0 border-slate-200/70 shrink-0">
              <div className="text-left md:text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Náš celkový nájom
                </span>
                <div className="flex items-baseline md:justify-end gap-1.5 mt-0.5">
                  {activeProperty.rentAmount && activeProperty.rentAmount > 0 ? (
                    <>
                      <span className="text-xl sm:text-2xl font-black text-slate-950">
                        €{activeProperty.rentAmount.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">/ mes.</span>
                    </>
                  ) : (
                    <span className="text-sm sm:text-base font-bold text-slate-400">
                      Bez nájomnej zmluvy
                    </span>
                  )}
                </div>
              </div>

              {/* Subtitle with rent + utilities */}
              <div className="text-left md:text-right mt-1">
                {activeProperty.rentAmount && activeProperty.rentAmount > 0 ? (
                  activeProperty.baseRent && activeProperty.utilitiesAmount ? (
                    <div className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200/80 text-[11px] font-medium text-emerald-900">
                      <span>€{activeProperty.baseRent} nájom</span>
                      <span className="mx-1 text-emerald-500">+</span>
                      <span className="font-semibold text-emerald-700">€{activeProperty.utilitiesAmount} energie</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-medium">
                      €{(activeProperty.rentAmount / activeProperty.sizeSqm).toFixed(2)}/m²
                    </span>
                  )
                ) : (
                  <span className="text-[11px] text-amber-600 font-medium">
                    Voľný k prenájmu
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. KPI Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-slate-200 shadow-xs bg-white">
            <CardBody className="p-4">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Odhadovaný trhový nájom
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  €{stats.targetEstimatedMarketRent.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">/ mes.</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Založené na trhovom priemere €{stats.avgRentPerSqm}/m²
              </span>
            </CardBody>
          </Card>

          <Card className="border border-slate-200 shadow-xs bg-white">
            <CardBody className="p-4">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Rozdiel nášho nájmu vs trh
              </span>
              {activeProperty.rentAmount && activeProperty.rentAmount > 0 ? (
                <>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span
                      className={`text-2xl font-bold ${
                        stats.deltaMarketRent >= 0 ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {stats.deltaMarketRent >= 0 ? `+€${stats.deltaMarketRent}` : `-€${Math.abs(stats.deltaMarketRent)}`}
                    </span>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={stats.deltaMarketRent >= 0 ? 'success' : 'warning'}
                      className="text-[10px] font-semibold h-5"
                    >
                      {stats.deltaMarketPercent >= 0 ? `+${stats.deltaMarketPercent}%` : `${stats.deltaMarketPercent}%`}
                    </Chip>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {stats.deltaMarketRent >= 0 ? 'Nájom je nad priemerom' : 'Nájom je pod priemerom'}{' '}
                    <span className="font-semibold text-slate-700">
                      (odporúčaná cena €{stats.targetEstimatedMarketRent.toLocaleString()})
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-400">
                      —
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Byt nemá aktívny nájom{' '}
                    <span className="font-semibold text-slate-700">
                      (odporúčaná cena €{stats.targetEstimatedMarketRent.toLocaleString()})
                    </span>
                  </span>
                </>
              )}
            </CardBody>
          </Card>

          <Card className="border border-slate-200 shadow-xs bg-white">
            <CardBody className="p-4">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Trhový medián kategórie
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  €{stats.medianRent.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">/ mes.</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Rozpätie: €{stats.minRent} – €{stats.maxRent}
              </span>
            </CardBody>
          </Card>

          <Card className="border border-slate-200 shadow-xs bg-white">
            <CardBody className="p-4">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Analyzovaná vzorka
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {stats.comparablesCount}
                </span>
                <span className="text-xs text-slate-500">inzerátov</span>
              </div>
              <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
                Nehnutelnosti.sk • {cityFilter}
              </span>
            </CardBody>
          </Card>
        </div>
      )}

      {/* 6. Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 border border-slate-200 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-3 text-xs w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtrovať ponuky z portálu:</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="Bratislava">Bratislava</option>
              <option value="Kosice">Košice</option>
              <option value="Trnava">Trnava</option>
              <option value="Zilina">Žilina</option>
              <option value="Nitra">Nitra</option>
              <option value="Banska-Bystrica">Banská Bystrica</option>
              <option value="Slovensko">Celé Slovensko</option>
            </select>

            <select
              value={roomsFilter}
              onChange={e => setRoomsFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="1">1-izbové byty / garzónky</option>
              <option value="2">2-izbové byty</option>
              <option value="3">3-izbové byty</option>
              <option value="4">4-izbové byty</option>
              <option value="5">5 a viac-izbové</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-end">
          <span className="text-slate-500">Zoradiť:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="confidence">Najvyššia zhoda (Confidence)</option>
            <option value="priceAsc">Celková cena (od najlacnejších)</option>
            <option value="priceDesc">Celková cena (od najdrahších)</option>
            <option value="sqmAsc">Cena za m² (vzostupne)</option>
          </select>
        </div>
      </div>

      {/* 7. Confidence Metric Legend */}
      <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            <strong>Confidence Metric (% Zhoda)</strong> hodnotí 4 kľúčové rozmery: Výmera m² (30%), Počet izieb (25%), Mestská časť (25%) a Vybavenosť ako parkovanie, balkón, pivnica, klíma (20%).
          </span>
        </div>
        <span className="shrink-0 font-medium text-slate-600 hidden sm:inline">
          Nájdených {comparables.length} relevantných inzerátov
        </span>
      </div>

      {/* 8. Loading state */}
      {loading && (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
          <Spinner size="lg" color="primary" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            Prehľadávam a analyzujem aktuálne ponuky z Nehnutelnosti.sk...
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Počítam mieru zhody, odchýlku plochy a trhové ceny.
          </p>
        </div>
      )}

      {/* 9. Empty State */}
      {!loading && comparables.length === 0 && (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">
            Nenašli sa žiadne inzeráty pre zvolené kritériá.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Skúste zmeniť mesto alebo počet izieb vo filtri vyššie.
          </p>
        </div>
      )}

      {/* 10. List of Comparables Cards */}
      {!loading && comparables.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {comparables.map((item, index) => {
            const isTopMatch = index === 0 && item.confidenceScore >= 85;
            const isBreakdownOpen = activeBreakdownId === item.id;

            return (
              <Card
                key={item.id}
                className={`border transition-all duration-200 bg-white ${
                  isTopMatch
                    ? 'border-emerald-300 ring-2 ring-emerald-500/10 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <CardBody className="p-4 flex flex-col justify-between h-full">
                  <div>
                    {/* Top Row: Confidence Badge & Rank */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveBreakdownId(isBreakdownOpen ? null : item.id)
                          }
                          className="flex items-center gap-1.5 focus:outline-none"
                        >
                          <Chip
                            size="sm"
                            variant="solid"
                            color={
                              item.confidenceScore >= 85
                                ? 'success'
                                : item.confidenceScore >= 65
                                ? 'primary'
                                : 'warning'
                            }
                            startContent={<CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                            className="font-bold text-[11px] shadow-xs cursor-pointer"
                          >
                            {item.confidenceScore}% Zhoda
                          </Chip>
                        </button>

                        {isTopMatch && (
                          <Chip size="sm" variant="flat" color="success" className="text-[10px] font-semibold">
                            Najlepšia zhoda
                          </Chip>
                        )}

                        {item.sourceAI === 'jev' && (
                          <Chip size="sm" variant="flat" color="secondary" className="text-[10px] font-semibold h-5">
                            TypeSafe Jev
                          </Chip>
                        )}

                        {item.buildingCondition && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            {item.buildingCondition === 'new_building'
                              ? 'Novostavba'
                              : item.buildingCondition === 'reconstructed'
                              ? 'Rekonštrukcia'
                              : 'Pôvodný stav'}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-slate-400 font-mono">
                        #{index + 1}
                      </span>
                    </div>

                    {/* Main Content Area: Image + Details */}
                    <div className="flex gap-3.5">
                      {/* Photo Thumbnail */}
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/80 relative">
                        {item.photoUrl ? (
                          <img
                            src={item.photoUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={e => {
                              (e.target as HTMLImageElement).src = fallbackImg;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                            <Home className="w-6 h-6" />
                            <span className="text-[9px] mt-1">Bez foto</span>
                          </div>
                        )}
                      </div>

                      {/* Title, Location & Prices */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs sm:text-sm font-semibold text-slate-900 line-clamp-2 leading-snug">
                          {item.title}
                        </h3>

                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                          <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                          <span className="truncate">{item.location}</span>
                        </div>

                        {/* Price Display: Total price + Breakdown of rent & utilities */}
                        <div className="mt-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                              €{(item.totalRentPrice || item.rentPrice || 0).toLocaleString()}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                              / mes. celkovo
                            </span>

                            {item.pricePerSqm && (
                              <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                €{item.pricePerSqm}/m²
                              </span>
                            )}
                          </div>

                          {/* Subtitle breakdown: Nájom a Energie */}
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                            {item.utilitiesAmount !== null && item.utilitiesAmount !== undefined ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50/90 border border-amber-200/80 text-amber-950 font-medium">
                                <span className="font-semibold text-slate-900">€{item.baseRent}</span>&nbsp;nájom +&nbsp;
                                <span className="font-semibold text-amber-700">€{item.utilitiesAmount}</span>&nbsp;energie
                              </span>
                            ) : item.isUtilitiesInclusive ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/80 text-emerald-850 font-medium">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 mr-1" />
                                Vrátane energií
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                €{item.baseRent}&nbsp;nájom (energie v popise)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Delta vs Our Property */}
                        {activeProperty && Boolean(activeProperty.rentAmount && activeProperty.rentAmount > 0) && item.totalRentPrice && (
                          <div className="text-[11px] mt-1.5 flex items-center gap-1 font-medium">
                            {item.deltaAmount < 0 ? (
                              <span className="text-emerald-700 flex items-center">
                                <ArrowDownRight className="w-3 h-3 shrink-0" />
                                O €{Math.abs(item.deltaAmount)} lacnejší ({item.deltaPercent}%) celkovo
                              </span>
                            ) : item.deltaAmount > 0 ? (
                              <span className="text-amber-700 flex items-center">
                                <ArrowUpRight className="w-3 h-3 shrink-0" />
                                O €{item.deltaAmount} drahší (+{item.deltaPercent}%) celkovo
                              </span>
                            ) : (
                              <span className="text-slate-600">Rovnaké celkové nájomné ako náš byt</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Feature Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
                      {item.rooms && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/60 text-slate-700">
                          <Bed className="w-3 h-3 text-slate-400" />
                          {item.rooms} {item.rooms === 1 ? 'izba' : item.rooms < 5 ? 'izby' : 'izieb'}
                        </span>
                      )}

                      {item.sizeSqm && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/60 text-slate-700">
                          <Maximize2 className="w-3 h-3 text-slate-400" />
                          {item.sizeSqm} m²
                        </span>
                      )}

                      {item.hasParking && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/60 text-slate-700">
                          <Car className="w-3 h-3 text-emerald-600" />
                          Parkovanie
                        </span>
                      )}

                      {item.hasBalcony && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/60 text-slate-700">
                          Balkón/Lodžia
                        </span>
                      )}

                      {item.hasCellar && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/60 text-slate-700">
                          <Warehouse className="w-3 h-3 text-slate-400" />
                          Pivnica
                        </span>
                      )}

                      {item.hasAC && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200/60 text-sky-700">
                          <Wind className="w-3 h-3 text-sky-500" />
                          Klimatizácia
                        </span>
                      )}

                      {item.isFurnished && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/60 text-slate-700">
                          Zariadený
                        </span>
                      )}
                    </div>

                    {/* Match Breakdown Drawer */}
                    {isBreakdownOpen && item.breakdown && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                        <div className="flex items-center justify-between font-semibold text-slate-800 text-[11px] pb-1 border-b border-slate-200/60">
                          <span>Rozpad metriky zhody ({item.confidenceScore}%)</span>
                          <span className="text-slate-500 text-[10px]">Kliknutím skryjete</span>
                        </div>

                        <div className="space-y-1.5 text-[11px]">
                          <div>
                            <div className="flex justify-between text-slate-600">
                              <span>Plocha ({item.breakdown.sizeLabel})</span>
                              <span className="font-semibold text-slate-800">
                                {item.breakdown.sizeScore} / {item.breakdown.sizeMax} b
                              </span>
                            </div>
                            <Progress
                              size="sm"
                              value={(item.breakdown.sizeScore / item.breakdown.sizeMax) * 100}
                              color="success"
                              className="h-1.5"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-slate-600">
                              <span>Izby ({item.breakdown.roomsLabel})</span>
                              <span className="font-semibold text-slate-800">
                                {item.breakdown.roomsScore} / {item.breakdown.roomsMax} b
                              </span>
                            </div>
                            <Progress
                              size="sm"
                              value={(item.breakdown.roomsScore / item.breakdown.roomsMax) * 100}
                              color="primary"
                              className="h-1.5"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-slate-600">
                              <span>Lokalita ({item.breakdown.locationLabel})</span>
                              <span className="font-semibold text-slate-800">
                                {item.breakdown.locationScore} / {item.breakdown.locationMax} b
                              </span>
                            </div>
                            <Progress
                              size="sm"
                              value={(item.breakdown.locationScore / item.breakdown.locationMax) * 100}
                              color="secondary"
                              className="h-1.5"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-slate-600">
                              <span>Benefity ({item.breakdown.amenitiesLabel})</span>
                              <span className="font-semibold text-slate-800">
                                {item.breakdown.amenitiesScore} / {item.breakdown.amenitiesMax} b
                              </span>
                            </div>
                            <Progress
                              size="sm"
                              value={(item.breakdown.amenitiesScore / item.breakdown.amenitiesMax) * 100}
                              color="warning"
                              className="h-1.5"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action: Open Listing on Nehnutelnosti.sk */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveBreakdownId(isBreakdownOpen ? null : item.id)
                      }
                      className="text-[11px] text-slate-500 hover:text-slate-800 underline focus:outline-none"
                    >
                      {isBreakdownOpen ? 'Skryť rozpad zhody' : 'Prečo táto zhoda?'}
                    </button>

                    <a
                      href={item.detailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors shadow-xs"
                    >
                      <span>Nehnutelnosti.sk</span>
                      <ExternalLink className="w-3 h-3 text-slate-300" />
                    </a>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
