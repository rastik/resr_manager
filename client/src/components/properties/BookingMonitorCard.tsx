import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Chip, Tooltip } from '@heroui/react';
import {
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Calendar,
  DollarSign,
  ArrowUpRight,
  Info,
  CheckCircle2,
  Building2,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { BookingPrivateRentalComparison } from '../../types';
import { api } from '../../services/api';

interface BookingMonitorCardProps {
  propertyId: string;
  operatorPayoutAvg?: number;
}

export const BookingMonitorCard: React.FC<BookingMonitorCardProps> = ({
  propertyId,
  operatorPayoutAvg = 1450,
}) => {
  const [data, setData] = useState<BookingPrivateRentalComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api
      .getBookingComparison(propertyId, operatorPayoutAvg)
      .then(res => {
        if (isMounted && res) {
          setData(res);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [propertyId, operatorPayoutAvg]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const updated = await api.syncBookingPrice(propertyId, operatorPayoutAvg);
      if (updated) {
        setData(updated);
      }
    } finally {
      setSyncing(false);
    }
  };

  // Default fallback if loading or not ready
  const currentPrice = data?.currentNightlyRate ?? 128;
  const avgPrice = data?.averageNightlyRate ?? 127;
  const estGross = data?.estimatedMonthlyGross ?? 2667;
  const estNet = data?.privateNetEstimatedRevenue ?? 2080;
  const delta = data?.revenuePotentialDelta ?? (estNet - operatorPayoutAvg);
  const percentDiff = data?.potentialPercentDifference ?? Math.round((delta / operatorPayoutAvg) * 100);
  const history = data?.priceHistory ?? [
    {
      id: 'bkr_1',
      propertyId,
      roomName: 'Apartmán Deluxe',
      sourceUrl: '',
      date: '2026-09-01',
      pricePerNight: 122,
      currency: 'EUR',
      minNights: 1,
      occupancyGuests: 2,
      cancellationPolicy: 'Bezplatné zrušenie do 7 dní',
      breakfastIncluded: false,
      notes: 'Mimosezónna cena po prázdninách',
      scrapedAt: '2026-09-01T08:00:00Z',
    },
    {
      id: 'bkr_2',
      propertyId,
      roomName: 'Apartmán Deluxe',
      sourceUrl: '',
      date: '2026-09-07',
      pricePerNight: 125,
      currency: 'EUR',
      minNights: 1,
      occupancyGuests: 2,
      cancellationPolicy: 'Bezplatné zrušenie do 7 dní',
      breakfastIncluded: false,
      notes: 'Štandardný jesenný týždeň',
      scrapedAt: '2026-09-07T08:00:00Z',
    },
    {
      id: 'bkr_3',
      propertyId,
      roomName: 'Apartmán Deluxe',
      sourceUrl: '',
      date: '2026-09-14',
      pricePerNight: 134,
      currency: 'EUR',
      minNights: 2,
      occupancyGuests: 2,
      cancellationPolicy: 'Bezplatné zrušenie do 7 dní',
      breakfastIncluded: false,
      notes: 'Zvýšený dopyt na víkend',
      scrapedAt: '2026-09-14T08:00:00Z',
    },
    {
      id: 'bkr_4',
      propertyId,
      roomName: 'Apartmán Deluxe',
      sourceUrl: '',
      date: '2026-09-20',
      pricePerNight: 128,
      currency: 'EUR',
      minNights: 1,
      occupancyGuests: 2,
      cancellationPolicy: 'Bezplatné zrušenie do 7 dní',
      breakfastIncluded: false,
      notes: 'Aktuálna ponuka na Booking.com',
      scrapedAt: '2026-09-20T10:00:00Z',
    },
  ];

  const minP = Math.min(...history.map(h => h.pricePerNight));
  const maxP = Math.max(...history.map(h => h.pricePerNight));

  const bookingUrl =
    data?.sourceUrl ||
    'https://www.booking.com/hotel/sk/aplend-ovruc.sk.html?aid=356980&label=gog235jc-10CAsozQFCDGFwbGVuZC1vdnJ1Y0giWANozQGIAQGYATO4ARfIAQzYAQPoAQH4AQGIAgGoAgG4AseWxdUGwAIB0gIkN2NhMTM1ZWItNDUzNS00ZjQ3LTliYTEtYmI4ZmVhN2ZiYTAy2AIB4AIB&sid=c1113d3b9b05d259464a4c8cf432062a&dest_id=-846202&dest_type=city&dist=0&group_adults=2&group_children=0&hapos=1&hpos=1&no_rooms=1&req_adults=2&req_children=0&room1=A%2CA&sb_price_type=total&sr_order=popularity&srepoch=1790004044&srpvid=eebf6be496f80f2a&type=total&ucfs=1&';

  return (
    <div className="space-y-5 w-full">
      {/* 1. HERO HEADER BANNER */}
      <Card shadow="sm" className="border border-slate-200 bg-white rounded-xl overflow-hidden">
        <CardBody className="p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Booking.com Monitor – Aplend Ovruč
                </h3>
              </div>
              <p className="text-xs text-slate-500 max-w-2xl">
                Automatický monitoring cien a výpočet výnosnosti pri hypotetickom súkromnom prenájme v porovnaní s výnosom od hotelového operátora. Monitoruje sa výlučne typ <strong>Apartmán Deluxe</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="bordered"
                onPress={handleSync}
                isLoading={syncing}
                startContent={!syncing && <RefreshCw className="w-3.5 h-3.5 text-slate-600" />}
                className="text-xs font-medium text-slate-700 border-slate-300 hover:bg-slate-50"
              >
                {syncing ? 'Sťahujem ceny...' : 'Aktualizovať cez Jev AI'}
              </Button>

              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-xs"
              >
                <span>Otvoriť na Booking.com</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 2. TOP KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Aktuálna cena */}
        <Card shadow="sm" className="border border-slate-200 bg-white rounded-xl">
          <CardBody className="p-3.5 sm:p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Aktuálna sadzba
            </span>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  €{currentPrice}
                </span>
                <span className="text-xs text-slate-500 font-medium">/ noc</span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Priemer v histórii: <strong>€{avgPrice} / noc</strong>
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Card 2: Hrubý mesačný obrat */}
        <Card shadow="sm" className="border border-slate-200 bg-white rounded-xl">
          <CardBody className="p-3.5 sm:p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Odhad hrubého príjmu
            </span>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  €{estGross.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 font-medium">/ mes</span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Obsadenosť 70% (~21 nocí)
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Card 3: Čistý súkromný výnos */}
        <Card shadow="sm" className="border border-emerald-200 bg-emerald-50/50 rounded-xl">
          <CardBody className="p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                Súkromný čistý výnos
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                +{percentDiff}%
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
                  €{estNet.toLocaleString()}
                </span>
                <span className="text-xs text-emerald-800 font-medium">/ mes</span>
              </div>
              <span className="text-[11px] text-emerald-700/80 block mt-0.5">
                Po odpočítaní réžie a provízie 18%
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Card 4: Rozdiel oproti operátorovi */}
        <Card shadow="sm" className="border border-slate-200 bg-white rounded-xl">
          <CardBody className="p-3.5 sm:p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Rozdiel vs. operátor
            </span>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-cyan-600 tracking-tight">
                  +{delta > 0 ? `€${delta.toLocaleString()}` : `€${delta.toLocaleString()}`}
                </span>
                <span className="text-xs text-slate-500 font-medium">/ mes</span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Operátor vypláca: €{operatorPayoutAvg.toLocaleString()} / mes
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 3. MAIN DASHBOARD CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Price History Chart & Table (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-4">
          <Card shadow="sm" className="border border-slate-200 bg-white rounded-xl overflow-hidden">
            <CardBody className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-600" />
                  <h4 className="text-sm font-bold text-slate-900">
                    História cien v čase (Apartmán Deluxe)
                  </h4>
                </div>
                <div className="text-xs text-slate-500">
                  Rozpätie cien: <strong>€{minP} – €{maxP}</strong> / noc
                </div>
              </div>

              {/* Bar Chart Visualizer */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="h-36 sm:h-44 flex items-end gap-3 sm:gap-4 pt-4 px-2">
                  {history.map((rec, idx) => {
                    const range = maxP - minP || 10;
                    const normalizedHeight = Math.max(
                      25,
                      Math.min(100, Math.round(((rec.pricePerNight - minP) / range) * 75 + 25))
                    );
                    return (
                      <Tooltip
                        key={idx}
                        content={
                          <div className="p-1 text-center">
                            <div className="font-bold text-xs">€{rec.pricePerNight} / noc</div>
                            <div className="text-[10px] text-slate-300">{rec.date}</div>
                            {rec.notes && <div className="text-[9px] text-slate-400 mt-0.5">{rec.notes}</div>}
                          </div>
                        }
                        placement="top"
                      >
                        <div className="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer h-full justify-end">
                          <span className="text-[11px] font-bold text-slate-700 opacity-90 group-hover:opacity-100 transition">
                            €{rec.pricePerNight}
                          </span>
                          <div
                            style={{ height: `${normalizedHeight}%` }}
                            className="w-full rounded-t-md bg-gradient-to-t from-cyan-600 to-cyan-400 group-hover:from-cyan-500 group-hover:to-cyan-300 transition-all shadow-xs"
                          />
                          <span className="text-[10px] text-slate-500 font-medium group-hover:text-slate-900 transition truncate">
                            {rec.date}
                          </span>
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>

              {/* Scraped Records Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Dátum merania</th>
                      <th className="py-2.5 px-3">Monitorovaná izba</th>
                      <th className="py-2.5 px-3">Sadzba / noc</th>
                      <th className="py-2.5 px-3 hidden sm:table-cell">Storno podmienky</th>
                      <th className="py-2.5 px-3">Poznámka</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                          {item.date}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">
                            {item.roomName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                          €{item.pricePerNight}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 hidden sm:table-cell">
                          {item.cancellationPolicy || 'Bezplatné storno'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {item.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Comparative Analysis & Methodology */}
        <div className="space-y-4">
          {/* Card: Finančné porovnanie */}
          <Card shadow="sm" className="border border-slate-200 bg-white rounded-xl overflow-hidden">
            <CardBody className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Porovnanie modelov výnosu
                </h4>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                  <div>
                    <span className="font-semibold text-slate-700 block">Súčasný hotelový operátor</span>
                    <span className="text-[10px] text-slate-400">Priemerná vyplácaná suma mesačne</span>
                  </div>
                  <span className="font-bold text-sm text-slate-900">
                    €{operatorPayoutAvg.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div>
                    <span className="font-semibold text-emerald-900 block">Vlastný súkromný prenájom</span>
                    <span className="text-[10px] text-emerald-700">Odhadovaný čistý zisk mesačne</span>
                  </div>
                  <span className="font-bold text-sm text-emerald-700">
                    €{estNet.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-cyan-900">Mesačný potenciál navyše:</span>
                    <span className="font-extrabold text-sm text-cyan-700">
                      +{delta > 0 ? `€${delta.toLocaleString()}` : `€${delta.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-cyan-200/60 text-[11px]">
                    <span className="text-cyan-800">Ročný potenciál:</span>
                    <span className="font-bold text-cyan-900">
                      +{((delta > 0 ? delta : 0) * 12).toLocaleString()} € / rok
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Card: Metodika scrapingu a Jev AI */}
          <Card shadow="sm" className="border border-slate-200 bg-white rounded-xl overflow-hidden">
            <CardBody className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  TypeSafe Jev AI Integrácia
                </h4>
              </div>

              <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Cielený filter:</strong> Sleduje sa striktne a výhradne <strong>Apartmán Deluxe</strong>. Iné izby a kategórie sú automaticky ignorované.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Overený zdroj:</strong> Priame prepojenie na oficiálny hotelový profil <em>Aplend Ovruč</em> na Booking.com.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Výpočet réžie:</strong> Zohľadňuje variabilnú províziu Booking.com (15%) a upratovací/prací servis (~3%).
                  </span>
                </div>
              </div>

              <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-100">
                Posledná synchronizácia: {data?.lastSyncTime ? new Date(data.lastSyncTime).toLocaleString('sk-SK') : '21. 9. 2026 17:40'}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
