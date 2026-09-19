import React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Chip,
} from '@heroui/react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useProperty } from '../../context/PropertyContext';

interface MarketComparatorProps {
  onSelectProperty: (id: string) => void;
}

export const MarketComparator: React.FC<MarketComparatorProps> = ({ onSelectProperty }) => {
  const { properties, marketComps } = useProperty();

  const comparisons = properties.map(property => {
    const currentRentPerSqm = Number((property.rentAmount / property.sizeSqm).toFixed(2));
    const comp =
      marketComps.find(
        c => c.neighborhood.toLowerCase() === (property.neighborhood || '').toLowerCase()
      ) ||
      marketComps[0] || {
        avgRentPerSqm: 18.5,
        neighborhood: property.neighborhood || property.city,
      };

    const marketAvgPerSqm = Number(comp.avgRentPerSqm);
    const targetRent = Math.round(marketAvgPerSqm * property.sizeSqm);
    const deltaRent = property.rentAmount - targetRent;
    const deltaPercent = Number(
      (((currentRentPerSqm - marketAvgPerSqm) / marketAvgPerSqm) * 100).toFixed(1)
    );

    let strategy = '';
    if (deltaPercent < -6) {
      strategy = `Pod trhovou cenou. Možnosť navýšenia o +€${Math.abs(deltaRent)}/mes pri obnove zmluvy.`;
    } else if (deltaPercent > 6) {
      strategy = `Prémiové nájomné (+${deltaPercent}% nad trhom). Prioritou je spokojnosť nájomcu.`;
    } else {
      strategy = `Zodpovedá trhu. Odporúča sa štandardná inflačná indexácia.`;
    }

    return {
      property,
      currentRentPerSqm,
      marketAvgPerSqm,
      targetRent,
      deltaRent,
      deltaPercent,
      strategy,
    };
  });

  return (
    <div className="space-y-4">
      {/* Neighborhood baseline chips */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 shrink-0 font-medium">Trhová hladina (€/m²):</span>
        {marketComps.map(c => (
          <div
            key={c.id}
            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shrink-0 flex items-center gap-1.5 shadow-xs"
          >
            <span className="text-slate-700">{c.neighborhood}</span>
            <span className="text-emerald-700 font-semibold">€{c.avgRentPerSqm}</span>
          </div>
        ))}
      </div>

      {/* HeroUI Comparison Table */}
      <Table
        aria-label="Trhové porovnanie nájomného"
        shadow="none"
        classNames={{
          base: 'border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs',
          table: 'min-w-full',
          thead: '[&>tr]:first:rounded-none',
          th: 'bg-slate-50/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider py-3 px-4 border-b border-slate-200',
          td: 'py-3 px-4 text-xs border-b border-slate-100 last:border-0',
          tr: 'hover:bg-slate-50/70 transition-colors cursor-pointer',
        }}
      >
        <TableHeader>
          <TableColumn key="prop">BYT / NEHNUTEĽNOSŤ</TableColumn>
          <TableColumn key="rent">AKTUÁLNE NÁJOMNÉ</TableColumn>
          <TableColumn key="size">VÝMERA</TableColumn>
          <TableColumn key="rate">NÁJOMNÉ / M²</TableColumn>
          <TableColumn key="market">TRHOVÝ PRIEMER</TableColumn>
          <TableColumn key="delta">ROZDIEL OPROTI TRHU</TableColumn>
          <TableColumn key="strategy">ODPORÚČANÁ STRATÉGIA</TableColumn>
        </TableHeader>
        <TableBody emptyContent="Žiadne nehnuteľnosti na porovnanie.">
          {comparisons.map(item => (
            <TableRow key={item.property.id} onClick={() => onSelectProperty(item.property.id)}>
              <TableCell>
                <div className="font-semibold text-slate-900">{item.property.name}</div>
                <span className="text-[11px] text-slate-500">
                  {item.property.unitNumber} • {item.property.city}
                </span>
              </TableCell>
              <TableCell className="text-slate-900 font-semibold">
                €{item.property.rentAmount.toLocaleString()}
              </TableCell>
              <TableCell className="text-slate-600">{item.property.sizeSqm} m²</TableCell>
              <TableCell className="text-slate-800 font-medium">€{item.currentRentPerSqm}</TableCell>
              <TableCell className="text-slate-500">
                €{item.marketAvgPerSqm}/m² (cieľ: €{item.targetRent})
              </TableCell>
              <TableCell>
                <Chip
                  size="sm"
                  variant="flat"
                  color={item.deltaPercent < -6 ? 'warning' : item.deltaPercent > 6 ? 'success' : 'default'}
                  startContent={
                    item.deltaPercent > 0 ? (
                      <ArrowUpRight className="w-3 h-3 shrink-0" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 shrink-0" />
                    )
                  }
                  className="text-[11px] font-medium"
                >
                  {item.deltaPercent > 0 ? `+${item.deltaPercent}%` : `${item.deltaPercent}%`}
                </Chip>
              </TableCell>
              <TableCell className="text-slate-600 text-xs">{item.strategy}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
