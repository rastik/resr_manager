import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Chip, Tooltip } from '@heroui/react';
import {
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Calendar,
  DollarSign,
  Sparkles,
  ArrowUpRight,
  Info,
  CheckCircle2,
  Building2,
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
    { date: '2026-09-01', pricePerNight: 122 },
    { date: '2026-09-07', pricePerNight: 125 },
    { date: '2026-09-14', pricePerNight: 134 },
    { date: '2026-09-20', pricePerNight: 128 },
  ];

  const minP = Math.min(...history.map(h => h.pricePerNight));
  const maxP = Math.max(...history.map(h => h.pricePerNight));

  const bookingUrl =
    data?.sourceUrl ||
    'https://www.booking.com/hotel/sk/aplend-ovruc.sk.html?aid=356980&label=gog235jc-10CAsozQFCDGFwbGVuZC1vdnJ1Y0giWANozQGIAQGYATO4ARfIAQzYAQPoAQH4AQGIAgGoAgG4AseWxdUGwAIB0gIkN2NhMTM1ZWItNDUzNS00ZjQ3LTliYTEtYmI4ZmVhN2ZiYTAy2AIB4AIB&sid=c1113d3b9b05d259464a4c8cf432062a&dest_id=-846202&dest_type=city&dist=0&group_adults=2&group_children=0&hapos=1&hpos=1&no_rooms=1&req_adults=2&req_children=0&room1=A%2CA&sb_price_type=total&sr_order=popularity&srepoch=1790004044&srpvid=eebf6be496f80f2a&type=total&ucfs=1&';

  return (
    <div className="w-full lg:w-[410px] shrink-0">
      <Card
        shadow="sm"
        className="bg-slate-900/90 backdrop-blur-xl border border-white/20 text-white rounded-xl overflow-hidden shadow-2xl"
      >
        <CardBody className="p-3 sm:p-3.5 space-y-3">
          {/* Top Header: Badge & Live Action */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <div className="truncate">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-white tracking-tight">Booking.com</span>
                  <Chip
                    size="sm"
                    variant="flat"
                    className="bg-cyan-500/20 text-cyan-300 text-[10px] font-semibold h-4 px-1 border border-cyan-500/30"
                  >
                    Apartmán Deluxe
                  </Chip>
                </div>
                <span className="text-[10px] text-slate-300 block truncate">
                  Sledovanie cien • Aplend Ovruč
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Tooltip content="Synchronizovať aktuálne ceny cez Jev AI" placement="top">
                <Button
                  isIconOnly
                  size="sm"
                  variant="flat"
                  onPress={handleSync}
                  isLoading={syncing}
                  className="bg-white/10 hover:bg-white/20 text-white w-7 h-7 min-w-7 rounded-lg transition"
                >
                  <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                </Button>
              </Tooltip>

              <Tooltip content="Otvoriť ponuku na Booking.com" placement="top">
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center bg-blue-600/80 hover:bg-blue-600 text-white w-7 h-7 rounded-lg transition"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </Tooltip>
            </div>
          </div>

          {/* Pricing Highlight & AI Extraction Tag */}
          <div className="grid grid-cols-2 gap-2">
            {/* Left Box: Current Night Rate */}
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                Aktuálna sadzba
              </span>
              <div className="mt-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    €{currentPrice}
                  </span>
                  <span className="text-[10px] text-slate-300 font-medium">/ noc</span>
                </div>
                <span className="text-[9px] text-slate-400 block mt-0.5">
                  Priemer v histórii: €{avgPrice}
                </span>
              </div>
            </div>

            {/* Right Box: Potential Monthly Revenue */}
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-300">
                  Súkromný prenájom
                </span>
                <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 px-1 rounded">
                  +{percentDiff}%
                </span>
              </div>
              <div className="mt-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black text-emerald-300 tracking-tight">
                    €{estNet.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium">/ mes</span>
                </div>
                <span className="text-[9px] text-emerald-300/80 block mt-0.5">
                  vs. operátor: €{operatorPayoutAvg.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Sparkline / Price History Over Time */}
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-cyan-400" />
                História cien (Apartmán Deluxe)
              </span>
              <span className="text-[9px] text-slate-400">
                Rozpätie: €{minP} – €{maxP}
              </span>
            </div>

            {/* Micro Bar Sparkline Chart */}
            <div className="h-10 flex items-end gap-1.5 pt-1">
              {history.map((rec, idx) => {
                const range = maxP - minP || 10;
                const normalizedHeight = Math.max(
                  20,
                  Math.min(100, Math.round(((rec.pricePerNight - minP) / range) * 80 + 20))
                );
                return (
                  <Tooltip
                    key={idx}
                    content={`${rec.date}: €${rec.pricePerNight} / noc`}
                    placement="top"
                  >
                    <div className="flex-1 flex flex-col items-center gap-1 group/bar cursor-pointer">
                      <div
                        style={{ height: `${normalizedHeight}%` }}
                        className="w-full rounded-t bg-cyan-400/80 group-hover/bar:bg-cyan-300 transition-all shadow-xs"
                      />
                      <span className="text-[8px] text-slate-400 group-hover/bar:text-white truncate">
                        {rec.date.slice(5)}
                      </span>
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          {/* Comparative Formula & Stats Breakdown */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-300">
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>TypeSafe Jev AI aktívny</span>
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <span>Rozdiel: </span>
              <span className="font-bold text-emerald-400">
                +{delta > 0 ? `€${delta.toLocaleString()}` : `€${delta.toLocaleString()}`} / mes
              </span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
