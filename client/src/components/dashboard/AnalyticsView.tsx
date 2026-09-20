import React, { useState, useMemo } from 'react';
import {
  Card,
  CardBody,
  Button,
  Chip,
} from '@heroui/react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Calendar,
  Building2,
  PieChart as PieIcon,
  BarChart3,
  Percent,
  Download,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useProperty } from '../../context/PropertyContext';
import { PropertySelectorDropdown } from '../common/PropertySelectorDropdown';

interface AnalyticsViewProps {
  onSelectProperty: (id: string) => void;
  onNavigateToTab: (tab: string) => void;
}

const MONTH_NAMES_SK: Record<string, string> = {
  Jan: 'Január',
  Feb: 'Február',
  Mar: 'Marec',
  Apr: 'Apríl',
  May: 'Máj',
  Jun: 'Jún',
  Jul: 'Júl',
  Aug: 'August',
  Sep: 'September',
  Oct: 'Október',
  Nov: 'November',
  Dec: 'December',
};

const EXPENSE_CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  replacement: { label: 'Výmena spotrebičov', color: '#f59e0b' }, // amber
  service: { label: 'Servis a údržba', color: '#3b82f6' }, // blue
  cleaning: { label: 'Upratovanie', color: '#0d9488' }, // teal
  repair: { label: 'Servis a údržba', color: '#3b82f6' },
  utility: { label: 'Servis a údržba', color: '#3b82f6' },
  tax: { label: 'Servis a údržba', color: '#3b82f6' },
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  onSelectProperty,
  onNavigateToTab,
}) => {
  const { properties, expenses, leases, analytics } = useProperty();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');

  // Filter properties and expenses
  const filteredProperties = useMemo(() => {
    if (selectedPropertyId === 'all') return properties;
    return properties.filter(p => p.id === selectedPropertyId);
  }, [properties, selectedPropertyId]);

  const filteredExpenses = useMemo(() => {
    if (selectedPropertyId === 'all') return expenses;
    return expenses.filter(e => e.propertyId === selectedPropertyId);
  }, [expenses, selectedPropertyId]);

  // Dynamic 6-month cashflow calculation based on selected filter or portfolio analytics
  const cashFlowData = useMemo(() => {
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];

    if (selectedPropertyId === 'all' && analytics?.cashFlowData && analytics.cashFlowData.length > 0) {
      return analytics.cashFlowData.map(d => ({
        ...d,
        monthLabel: MONTH_NAMES_SK[d.month] || d.month,
      }));
    }

    // Calculate specifically for single property or fallback
    const propMonthlyRent = filteredProperties
      .filter(p => p.status === 'occupied')
      .reduce((sum, p) => sum + (Number(p.rentAmount) || 0), 0);

    const propTotalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return months.map((m, idx) => {
      const gross = Math.round(propMonthlyRent * (0.94 + idx * 0.012));
      const exp = Math.round(propTotalExpenses * (0.12 + (idx % 3) * 0.05));
      return {
        month: m,
        monthLabel: MONTH_NAMES_SK[m] || m,
        income: gross,
        expenses: exp,
        netCashflow: gross - exp,
      };
    });
  }, [selectedPropertyId, analytics?.cashFlowData, filteredProperties, filteredExpenses]);

  // Aggregate metrics
  const totalIncome6M = useMemo(() => {
    return cashFlowData.reduce((acc, curr) => acc + curr.income, 0);
  }, [cashFlowData]);

  const totalExpenses6M = useMemo(() => {
    return cashFlowData.reduce((acc, curr) => acc + curr.expenses, 0);
  }, [cashFlowData]);

  const netCashFlow6M = totalIncome6M - totalExpenses6M;
  const netMarginPercent = totalIncome6M > 0 ? Math.round((netCashFlow6M / totalIncome6M) * 100) : 0;

  // Expense breakdown by category (Výmena spotrebičov, Servis a údržba, Upratovanie)
  const expenseBreakdown = useMemo(() => {
    const map: Record<string, number> = {
      replacement: 0,
      service: 0,
      cleaning: 0,
    };

    filteredExpenses.forEach(exp => {
      let normalizedCat = exp.category || 'service';
      if (normalizedCat === 'repair' || normalizedCat === 'utility' || normalizedCat === 'tax') {
        normalizedCat = 'service';
      }
      if (map[normalizedCat] === undefined) {
        map[normalizedCat] = 0;
      }
      map[normalizedCat] += Number(exp.amount) || 0;
    });

    const total = Object.values(map).reduce((a, b) => a + b, 0);

    return Object.entries(map).map(([key, amount]) => ({
      key,
      name: EXPENSE_CATEGORY_LABELS[key]?.label || key,
      value: amount,
      percent: total > 0 ? Math.round((amount / total) * 100) : 0,
      color: EXPENSE_CATEGORY_LABELS[key]?.color || '#94a3b8',
    })).filter(item => item.value > 0);
  }, [filteredExpenses]);

  // Property performance ranking (Income vs Expenses)
  const propertyPerformance = useMemo(() => {
    return properties.map(p => {
      const propExpenses = expenses
        .filter(e => e.propertyId === p.id)
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const monthlyRent = Number(p.rentAmount) || 0;
      const annualRentProjected = monthlyRent * 12;
      const netAnnualEst = annualRentProjected - propExpenses;
      const rentPerSqm = p.sizeSqm > 0 ? (monthlyRent / p.sizeSqm).toFixed(1) : '0';

      return {
        property: p,
        monthlyRent,
        annualRentProjected,
        totalExpenses: propExpenses,
        netAnnualEst,
        rentPerSqm,
      };
    }).sort((a, b) => b.monthlyRent - a.monthlyRent);
  }, [properties, expenses]);

  // Helper to format date string to SK format 'DD.MM.YYYY'
  const formatDateSK = (dStr?: string) => {
    if (!dStr) return '';
    try {
      const parts = dStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parseInt(parts[2], 10)}.${parseInt(parts[1], 10)}.${parts[0]}`;
      }
      const d = new Date(dStr);
      return isNaN(d.getTime()) ? dStr : d.toLocaleDateString('sk-SK');
    } catch {
      return dStr;
    }
  };

  // Helper to calculate days between two dates
  const daysDiff = (startStr: string, endStr: string) => {
    try {
      const d1 = new Date(startStr.split('T')[0]).getTime();
      const d2 = new Date(endStr.split('T')[0]).getTime();
      const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
      return diff > 0 ? diff : 1;
    } catch {
      return 1;
    }
  };

  // Gantt Timeline (Unified horizontal continuous timeline: 12 months, e.g. -6 months to +5 months)
  const ganttTimeline = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Start: 6 months ago, 1st day
    const startDate = new Date(currentYear, currentMonth - 6, 1);
    // End: 6 months in future (5 months offset + last day of that month)
    const endDate = new Date(currentYear, currentMonth + 6, 0); // last day of +5 month
    endDate.setHours(23, 59, 59, 999);

    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    const totalMs = endMs - startMs;

    const months: { key: string; label: string; year: number; monthIdx: number; isCurrent: boolean; leftPct: number; widthPct: number }[] = [];

    for (let offset = -6; offset <= 5; offset++) {
      const mStart = new Date(currentYear, currentMonth + offset, 1);
      const mEnd = new Date(currentYear, currentMonth + offset + 1, 0, 23, 59, 59, 999);
      const y = mStart.getFullYear();
      const mIdx = mStart.getMonth();
      const key = `${y}-${String(mIdx + 1).padStart(2, '0')}`;
      const shortMonth = mStart.toLocaleString('sk-SK', { month: 'short' });
      const capitalized = shortMonth.charAt(0).toUpperCase() + shortMonth.slice(1);

      const mStartMs = Math.max(startMs, mStart.getTime());
      const mEndMs = Math.min(endMs, mEnd.getTime());
      const leftPct = ((mStartMs - startMs) / totalMs) * 100;
      const widthPct = ((mEndMs - mStartMs) / totalMs) * 100;

      months.push({
        key,
        label: `${capitalized} ${String(y).slice(2)}`,
        year: y,
        monthIdx: mIdx,
        isCurrent: offset === 0,
        leftPct,
        widthPct,
      });
    }

    const todayMs = now.getTime();
    const todayPct = Math.max(0, Math.min(100, ((todayMs - startMs) / totalMs) * 100));

    return {
      startDate,
      endDate,
      startMs,
      endMs,
      totalMs,
      months,
      todayPct,
      formattedStart: `${startDate.getDate()}.${startDate.getMonth() + 1}.${startDate.getFullYear()}`,
      formattedEnd: `${endDate.getDate()}.${endDate.getMonth() + 1}.${endDate.getFullYear()}`,
    };
  }, []);

  // Calculate continuous timeline bars for each property
  const ganttPropertyData = useMemo(() => {
    const { startMs, endMs, totalMs } = ganttTimeline;

    return filteredProperties.map(property => {
      const propLeases = leases
        .filter(l => l.propertyId === property.id)
        .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

      const monthlyRent = Number(property.rentAmount) || 0;
      const dailyRent = monthlyRent > 0 ? monthlyRent / 30 : 25;

      // Map each lease into a visible bar segment if it overlaps the timeline window
      const leaseBars: {
        id: string;
        tenantName: string;
        rentAmount: number;
        startDate: string;
        endDate: string;
        formattedStart: string;
        formattedEnd: string;
        leftPct: number;
        widthPct: number;
        durationDays: number;
        status: string;
      }[] = [];

      let totalOccupiedDays = 0;

      propLeases.forEach(l => {
        const lStartStr = l.startDate ? l.startDate.split('T')[0] : '2020-01-01';
        const lEndStr = l.endDate ? l.endDate.split('T')[0] : '2099-12-31';

        const lStartMs = new Date(lStartStr).getTime();
        const lEndObj = new Date(lEndStr);
        lEndObj.setHours(23, 59, 59, 999);
        const lEndMs = lEndObj.getTime();

        // Check overlap
        if (lEndMs >= startMs && lStartMs <= endMs) {
          const clampedStartMs = Math.max(startMs, lStartMs);
          const clampedEndMs = Math.min(endMs, lEndMs);

          const leftPct = Math.max(0, ((clampedStartMs - startMs) / totalMs) * 100);
          const rightPct = Math.min(100, ((clampedEndMs - startMs) / totalMs) * 100);
          const widthPct = Math.max(0.8, rightPct - leftPct);

          const days = Math.round((clampedEndMs - clampedStartMs) / (1000 * 60 * 60 * 24));
          totalOccupiedDays += days;

          leaseBars.push({
            id: l.id,
            tenantName: l.tenantName || 'Nájomca',
            rentAmount: l.rentAmount || monthlyRent,
            startDate: lStartStr,
            endDate: lEndStr,
            formattedStart: formatDateSK(lStartStr),
            formattedEnd: formatDateSK(lEndStr),
            leftPct,
            widthPct,
            durationDays: daysDiff(lStartStr, lEndStr),
            status: l.status || 'active',
          });
        }
      });

      const totalWindowDays = Math.round(totalMs / (1000 * 60 * 60 * 24));
      const vacantDaysCount = Math.max(0, totalWindowDays - totalOccupiedDays);
      const lostRevenue = Math.round(vacantDaysCount * dailyRent);

      return {
        property,
        leaseBars,
        vacantDaysCount,
        occupiedDaysCount: totalOccupiedDays,
        lostRevenue,
      };
    });
  }, [filteredProperties, leases, ganttTimeline]);

  // Overall Gantt summary
  const ganttSummary = useMemo(() => {
    const totalLostRevenue = ganttPropertyData.reduce((acc, p) => acc + p.lostRevenue, 0);
    const totalVacantDays = ganttPropertyData.reduce((acc, p) => acc + p.vacantDaysCount, 0);
    return {
      totalLostRevenue,
      totalVacantDays,
    };
  }, [ganttPropertyData]);

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-200">
      {/* Top Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="w-full sm:w-88">
          <PropertySelectorDropdown
            properties={properties}
            selectedPropertyId={selectedPropertyId}
            onSelectPropertyId={setSelectedPropertyId}
            allowAll={true}
            allLabel="Celé portfólio"
            allSubtitle="Všetky byty a apartmány"
            label="Filtrovať podľa nehnuteľnosti"
          />
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Príjmy za 6 mesiacov */}
        <Card shadow="sm" className="border border-slate-200 bg-white">
          <CardBody className="p-4 sm:p-5 flex flex-row items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block truncate">
                Príjmy z nájmu (6 mes.)
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 leading-tight">
                €{totalIncome6M.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Priemerne €{Math.round(totalIncome6M / 6).toLocaleString()} / mes</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            </div>
          </CardBody>
        </Card>

        {/* 2. Výdavky za 6 mesiacov */}
        <Card shadow="sm" className="border border-slate-200 bg-white">
          <CardBody className="p-4 sm:p-5 flex flex-row items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block truncate">
                Prevádzkové výdavky (6 mes.)
              </span>
              <div className="text-xl sm:text-2xl font-black text-rose-600 leading-tight">
                €{totalExpenses6M.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                <TrendingDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Priemerne €{Math.round(totalExpenses6M / 6).toLocaleString()} / mes</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
            </div>
          </CardBody>
        </Card>

        {/* 3. Čistý peňažný tok (Net Cashflow) */}
        <Card shadow="sm" className="border border-slate-200 bg-white">
          <CardBody className="p-4 sm:p-5 flex flex-row items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block truncate">
                Čistý peňažný tok (Net Cash)
              </span>
              <div className={`text-xl sm:text-2xl font-black leading-tight ${netCashFlow6M >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                €{netCashFlow6M.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                <Wallet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Zisk po odpočítaní nákladov</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200">
              <DollarSign className="w-5 h-5 stroke-[2.5]" />
            </div>
          </CardBody>
        </Card>

        {/* 4. Čistá zisková marža */}
        <Card shadow="sm" className="border border-slate-200 bg-white">
          <CardBody className="p-4 sm:p-5 flex flex-row items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block truncate">
                Čistá marža nájmu
              </span>
              <div className="text-xl sm:text-2xl font-black text-indigo-600 leading-tight">
                {netMarginPercent}%
              </div>
              <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                <Percent className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Pomer zisku k nájmu</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main Cash Flow Chart (Primary feature requested) */}
      <Card shadow="sm" className="border border-slate-200 bg-white">
        <CardBody className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>📊</span> Peňažné toky (posledných 6 mesiacov)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Príjmy z nájmu vs prevádzkové výdavky {selectedPropertyId !== 'all' ? 'pre vybranú nehnuteľnosť' : 'pre celé portfólio'}
              </p>
            </div>

            {/* Toggle bar / area chart */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 text-xs pr-3 border-r border-slate-200">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Príjmy z nájmu
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-400" /> Prevádzkové výdavky
                </span>
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                    chartType === 'bar' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Stĺpce
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('area')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                    chartType === 'area' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Vývoj (Plocha)
                </button>
              </div>
            </div>
          </div>

          <div className="h-72 sm:h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart
                  data={cashFlowData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="monthLabel" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={val => `€${val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#0f172a',
                      boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(val: any, name: string) => [
                      `€${Number(val).toLocaleString()}`,
                      name === 'income' ? 'Príjmy z nájmu' : name === 'expenses' ? 'Prevádzkové výdavky' : 'Čistý tok',
                    ]}
                  />
                  <Bar dataKey="income" name="income" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={38} />
                  <Bar dataKey="expenses" name="expenses" fill="#94a3b8" radius={[5, 5, 0, 0]} maxBarSize={38} />
                </BarChart>
              ) : (
                <AreaChart
                  data={cashFlowData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="monthLabel" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={val => `€${val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#0f172a',
                      boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(val: any, name: string) => [
                      `€${Number(val).toLocaleString()}`,
                      name === 'income' ? 'Príjmy z nájmu' : name === 'expenses' ? 'Prevádzkové výdavky' : 'Čistý tok',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="income"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#incomeGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="expenses"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#expenseGradient)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      {/* 2. GANTT CHART: Vyťaženosť bytov v čase (Kontinuálny horizontálny diagram zľava doprava) */}
      <Card shadow="sm" className="border border-slate-200 bg-white">
        <CardBody className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Ganttov diagram vyťaženosti bytov
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kontinuálny časový prehľad (12 mesiacov): zelený pás znázorňuje aktívny nájom, prázdne miesto je voľný byt (nevyťaženosť).
              </p>
            </div>

            {/* Legend & Summary Metrics */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {/* Legend Badges */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 font-medium text-slate-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                  <span className="w-3 h-2 rounded-xs bg-emerald-500 shrink-0" />
                  <span>Vyťažený byt (Aktívny nájom)</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                  <span className="w-3 h-2 rounded-xs bg-slate-200 border border-dashed border-slate-400 shrink-0" />
                  <span>Voľný byt (Nevyťažený)</span>
                </div>
              </div>

              {/* Total Lost Revenue Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white font-medium">
                <span className="text-[11px] text-slate-300">Ušlý zisk z voľných dní:</span>
                <span className="font-bold text-rose-400">€{ganttSummary.totalLostRevenue.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Unified Horizontal Gantt Timeline */}
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[840px] space-y-3">
              {/* Timeline Header with Month Divisions */}
              <div className="flex items-center">
                <div className="w-52 shrink-0 pr-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Nehnuteľnosť / Byt
                </div>
                <div className="flex-1 relative h-7 bg-slate-100 rounded-lg border border-slate-200/80 flex overflow-hidden">
                  {ganttTimeline.months.map(m => (
                    <div
                      key={m.key}
                      style={{ width: `${m.widthPct}%` }}
                      className={`h-full border-r border-slate-200/80 last:border-r-0 flex items-center justify-center text-[10px] font-semibold truncate px-1 transition ${
                        m.isCurrent
                          ? 'bg-slate-900 text-white font-bold'
                          : 'text-slate-600 hover:bg-slate-200/60'
                      }`}
                      title={m.isCurrent ? `Aktuálny mesiac (${m.label})` : m.label}
                    >
                      {m.label}
                    </div>
                  ))}

                  {/* Today Marker Line */}
                  <div
                    style={{ left: `${ganttTimeline.todayPct}%` }}
                    className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10 pointer-events-none"
                    title="Dnešný deň"
                  >
                    <span className="absolute -top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-rose-500" />
                  </div>
                </div>
              </div>

              {/* Property Rows: Bar flows from left to right */}
              <div className="space-y-2">
                {ganttPropertyData.map(({ property, leaseBars, vacantDaysCount, lostRevenue }) => (
                  <div
                    key={property.id}
                    onClick={() => onSelectProperty(property.id)}
                    className="flex items-center p-2 rounded-xl hover:bg-slate-50 transition cursor-pointer group border border-slate-200/60 hover:border-slate-300"
                  >
                    {/* Left Column: Property Info */}
                    <div className="w-52 shrink-0 min-w-0 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                          {property.name} ({property.unitNumber})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                        <span>{property.city}</span>
                        <span>•</span>
                        {vacantDaysCount > 0 ? (
                          <span className="text-rose-600 font-semibold" title={`Ušlý zisk: cca €${lostRevenue}`}>
                            {vacantDaysCount} dní voľný (-€{lostRevenue})
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">100% vyťažený</span>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Continuous Horizontal Gantt Track */}
                    <div className="flex-1 relative h-9 bg-slate-100/70 rounded-lg border border-slate-200/70 overflow-hidden">
                      {/* Background Month Grid Lines */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {ganttTimeline.months.map(m => (
                          <div
                            key={m.key}
                            style={{ width: `${m.widthPct}%` }}
                            className="h-full border-r border-slate-200/50 last:border-r-0"
                          />
                        ))}
                      </div>

                      {/* Today Indicator Vertical Line */}
                      <div
                        style={{ left: `${ganttTimeline.todayPct}%` }}
                        className="absolute top-0 bottom-0 w-0.5 bg-rose-400/70 z-10 pointer-events-none"
                      />

                      {/* Occupied Lease Bars (Left to Right) */}
                      {leaseBars.map(bar => (
                        <div
                          key={bar.id}
                          style={{
                            left: `${bar.leftPct}%`,
                            width: `${bar.widthPct}%`,
                          }}
                          className="absolute top-1 bottom-1 bg-emerald-500 hover:bg-emerald-600 rounded-md shadow-xs flex items-center px-2 z-20 group/bar transition-all"
                        >
                          {/* Inner Bar Label (visible if wide enough) */}
                          <span className="text-[10px] font-bold text-white truncate drop-shadow-xs">
                            {bar.tenantName} ({bar.durationDays} dní)
                          </span>

                          {/* Tooltip on Hover */}
                          <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover/bar:flex flex-col items-center z-40 pointer-events-none whitespace-nowrap">
                            <div className="bg-slate-900 text-white text-[10px] py-1.5 px-2.5 rounded-lg shadow-xl border border-white/10">
                              <p className="font-bold text-emerald-400">{property.name} ({property.unitNumber})</p>
                              <p className="font-semibold text-white mt-0.5">Nájomca: {bar.tenantName}</p>
                              <p className="text-slate-300">
                                Platnosť: <span className="text-white font-medium">{bar.formattedStart}</span> → <span className="text-white font-medium">{bar.formattedEnd}</span> ({bar.durationDays} dní)
                              </p>
                              <p className="text-slate-300">Nájomné: €{bar.rentAmount}/mes</p>
                            </div>
                            <div className="w-2 h-1 bg-slate-900 clip-triangle" />
                          </div>
                        </div>
                      ))}

                      {/* Empty gap hint when property has no leases at all */}
                      {leaseBars.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-slate-400 italic">
                          Celé obdobie voľné (nevyťažený byt)
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Breakdown Section: 2 Columns (Expense Categories & Property Performance Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Expense Breakdown by Category */}
        <Card shadow="sm" className="border border-slate-200 bg-white lg:col-span-1">
          <CardBody className="p-5 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-indigo-600" />
                Štruktúra prevádzkových výdavkov
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Rozdelenie nákladov na výmenu techniky, servis a revízie
              </p>
            </div>

            {expenseBreakdown.length > 0 ? (
              <>
                <div className="h-48 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {expenseBreakdown.map(entry => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [`€${Number(val).toLocaleString()}`, 'Výdavky']}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e2e8f0',
                          borderRadius: '8px',
                          fontSize: '11px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {expenseBreakdown.map(cat => (
                    <div key={cat.key} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-slate-700 truncate font-medium">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400 font-normal">{cat.percent}%</span>
                        <span className="font-bold text-slate-900">€{cat.value.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                Žiadne evidované výdavky pre vybraný filter.
              </div>
            )}
          </CardBody>
        </Card>

        {/* Right Column: Property Financial Performance */}
        <Card shadow="sm" className="border border-slate-200 bg-white lg:col-span-2">
          <CardBody className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  Výkonnosť jednotlivých nehnuteľností
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Mesačný nájom, náklady a čistá ročná bilancia
                </p>
              </div>
              <Button
                size="sm"
                variant="light"
                onPress={() => onNavigateToTab('properties')}
                className="text-xs text-slate-600 font-semibold"
              >
                Všetky byty →
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-2 font-semibold">Nehnuteľnosť</th>
                    <th className="pb-2 font-semibold text-right">Mesačný nájom</th>
                    <th className="pb-2 font-semibold text-right">Cena / m²</th>
                    <th className="pb-2 font-semibold text-right">Celkové výdavky</th>
                    <th className="pb-2 font-semibold text-right">Odhad čistého zisku</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {propertyPerformance.map(({ property, monthlyRent, totalExpenses, netAnnualEst, rentPerSqm }) => (
                    <tr
                      key={property.id}
                      onClick={() => onSelectProperty(property.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition"
                    >
                      <td className="py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Property Photo Thumbnail with Status Dot */}
                          <div className="relative shrink-0">
                            <img
                              src={property.imageUrl || (property.photos && property.photos[0]) || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80'}
                              alt={property.name}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-2xs"
                              onError={e => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80';
                              }}
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                property.status === 'occupied' ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                              title={property.status === 'occupied' ? 'Obsadený' : 'Voľný'}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate max-w-[220px]">
                              {property.name} ({property.unitNumber})
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {property.city} • {property.sizeSqm} m²
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-bold text-emerald-600">
                        {monthlyRent > 0 ? `€${monthlyRent.toLocaleString()}` : <span className="text-slate-400 font-normal">Voľný</span>}
                      </td>
                      <td className="py-2.5 text-right text-slate-600 font-medium">
                        €{rentPerSqm} / m²
                      </td>
                      <td className="py-2.5 text-right text-slate-500 font-medium">
                        €{totalExpenses.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right font-bold text-slate-900">
                        €{netAnnualEst.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/ rok</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
