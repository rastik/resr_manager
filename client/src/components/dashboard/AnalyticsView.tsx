import React, { useState, useMemo } from 'react';
import {
  Card,
  CardBody,
  Button,
  Chip,
  Select,
  SelectItem,
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

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-200">
      {/* Top Filter & Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            Finančná analytika a peňažné toky
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Prehľad príjmov z nájomného, prevádzkových výdavkov a čistej výnosnosti portfólia
          </p>
        </div>

        {/* Property Selector Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-72">
            <Select
              size="sm"
              label="Filtrovať podľa nehnuteľnosti"
              selectedKeys={[selectedPropertyId]}
              onSelectionChange={keys => {
                const val = Array.from(keys)[0];
                if (val) setSelectedPropertyId(String(val));
              }}
              className="w-full"
              variant="bordered"
            >
              {[
                <SelectItem key="all" textValue="Celé portfólio (všetky byty a apartmány)">
                  Celé portfólio (všetky byty a apartmány)
                </SelectItem>,
                ...properties.map(p => (
                  <SelectItem key={p.id} textValue={`${p.propertyType === 'apartment' ? 'Apartmán' : 'Byt'} ${p.unitNumber} - ${p.name}`}>
                    {p.propertyType === 'apartment' ? 'Apartmán' : 'Byt'} {p.unitNumber} – {p.name}
                  </SelectItem>
                )),
              ]}
            </Select>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Príjmy za 6 mesiacov */}
        <Card shadow="sm" className="border border-slate-200 bg-white">
          <CardBody className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Príjmy z nájmu (6 mes.)
              </span>
              <div className="text-xl font-black text-emerald-600">
                €{totalIncome6M.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span>Priemerne €{Math.round(totalIncome6M / 6).toLocaleString()} / mes</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            </div>
          </CardBody>
        </Card>

        {/* 2. Výdavky za 6 mesiacov */}
        <Card shadow="sm" className="border border-slate-200 bg-white">
          <CardBody className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Prevádzkové výdavky (6 mes.)
              </span>
              <div className="text-xl font-black text-rose-600">
                €{totalExpenses6M.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-slate-400" />
                <span>Priemerne €{Math.round(totalExpenses6M / 6).toLocaleString()} / mes</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
            </div>
          </CardBody>
        </Card>

        {/* 3. Čistý peňažný tok (Net Cashflow) */}
        <Card shadow="sm" className="border border-slate-200 bg-white">
          <CardBody className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Čistý peňažný tok (Net Cash)
              </span>
              <div className={`text-xl font-black ${netCashFlow6M >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                €{netCashFlow6M.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zisk po odpočítaní nákladov</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 stroke-[2.5]" />
            </div>
          </CardBody>
        </Card>

        {/* 4. Čistá zisková marža */}
        <Card shadow="sm" className="border border-slate-200 bg-white">
          <CardBody className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Čistá marža nájmu
              </span>
              <div className="text-xl font-black text-indigo-600">
                {netMarginPercent}%
              </div>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-indigo-500" />
                <span>Pomer zisku k vybranému nájmu</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
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
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {property.propertyType === 'apartment' ? 'Apartmán' : 'Byt'} {property.unitNumber}
                          </span>
                          <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                            {property.name}
                          </span>
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
