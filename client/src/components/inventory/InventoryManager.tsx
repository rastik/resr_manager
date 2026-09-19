import React, { useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Input,
  Button,
  Chip,
} from '@heroui/react';
import { Search, Plus, Trash2 } from 'lucide-react';
import { useProperty } from '../../context/PropertyContext';
import { InventoryCategory } from '../../types';

interface InventoryManagerProps {
  onOpenAddInventory: (propertyId?: string) => void;
  onSelectProperty: (propertyId: string) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  onOpenAddInventory,
  onSelectProperty,
}) => {
  const { inventory, deleteInventoryItem } = useProperty();

  const [categoryFilter, setCategoryFilter] = useState<InventoryCategory | 'all'>('all');
  const [search, setSearch] = useState<string>('');

  const now = new Date();

  const filteredItems = inventory.filter(item => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.brandModel.toLowerCase().includes(search.toLowerCase()) ||
      item.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
      (item.propertyName && item.propertyName.toLowerCase().includes(search.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const totalValue = inventory.reduce((sum, i) => sum + Number(i.cost), 0);

  const categoryLabels: Record<string, string> = {
    all: 'Všetko',
    appliance: 'Spotrebiče',
    furniture: 'Nábytok',
    fixture: 'Vybavenie',
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Input
            size="sm"
            variant="bordered"
            placeholder="Hľadať spotrebiče, modely..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            startContent={<Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
            classNames={{
              input: 'text-xs text-slate-800 placeholder:text-slate-400',
              inputWrapper:
                'h-8 min-h-8 bg-white border-slate-200 hover:border-slate-300 focus-within:!border-slate-400 rounded-lg shadow-xs',
            }}
          />
        </div>

        {/* Filter Pills & Add Action */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100/90 border border-slate-200/80 rounded-lg p-0.5">
            {(['all', 'appliance', 'furniture', 'fixture'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 text-xs rounded-md transition ${
                  categoryFilter === cat
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            onClick={() => onOpenAddInventory()}
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs h-8 rounded-lg px-3 shadow-xs"
            startContent={<Plus className="w-3.5 h-3.5" />}
          >
            Pridať položku
          </Button>
        </div>
      </div>

      {/* HeroUI Table */}
      <Table
        aria-label="Inventár a spotrebiče"
        shadow="none"
        classNames={{
          base: 'border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs',
          table: 'min-w-full',
          thead: '[&>tr]:first:rounded-none',
          th: 'bg-slate-50/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider py-3 px-4 border-b border-slate-200',
          td: 'py-3 px-4 text-xs border-b border-slate-100 last:border-0',
          tr: 'hover:bg-slate-50/70 transition-colors',
        }}
      >
        <TableHeader>
          <TableColumn key="name">POLOŽKA</TableColumn>
          <TableColumn key="category">KATEGÓRIA</TableColumn>
          <TableColumn key="property">BYT / JEDNOTKA</TableColumn>
          <TableColumn key="brand">ZNAČKA A MODEL</TableColumn>
          <TableColumn key="date">INŠTALÁCIA</TableColumn>
          <TableColumn key="cost">CENA</TableColumn>
          <TableColumn key="warranty">ZÁRUKA</TableColumn>
          <TableColumn key="actions">{''}</TableColumn>
        </TableHeader>
        <TableBody emptyContent="Nenašli sa žiadne položky inventára.">
          {filteredItems.map(item => {
            let isExpiringSoon = false;
            let isExpired = false;
            if (item.warrantyExpiresAt) {
              const exp = new Date(item.warrantyExpiresAt);
              const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays < 0) isExpired = true;
              else if (diffDays <= 60) isExpiringSoon = true;
            }

            return (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="font-semibold text-slate-900">{item.name}</div>
                  {item.notes && (
                    <div className="text-[11px] text-slate-400 italic max-w-xs truncate" title={item.notes}>
                      📝 {item.notes}
                    </div>
                  )}
                </TableCell>
                <TableCell className="capitalize text-slate-500">
                  {categoryLabels[item.category] || item.category}
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => onSelectProperty(item.propertyId)}
                    className="text-slate-800 hover:underline text-left font-medium"
                  >
                    {item.propertyName} ({item.propertyUnit})
                  </button>
                </TableCell>
                <TableCell className="text-slate-500 text-[11px]">{item.brandModel || '—'}</TableCell>
                <TableCell className="text-slate-500 text-[11px]">{item.purchaseDate}</TableCell>
                <TableCell className="text-slate-900 font-semibold">€{item.cost.toLocaleString()}</TableCell>
                <TableCell>
                  {item.warrantyExpiresAt ? (
                    <Chip
                      size="sm"
                      variant="flat"
                      color={isExpired ? 'default' : isExpiringSoon ? 'warning' : 'success'}
                      className="text-[11px]"
                    >
                      {item.warrantyExpiresAt} {isExpiringSoon && '(Končí)'}
                    </Chip>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => {
                      if (confirm(`Naozaj chcete vymazať ${item.name}?`)) {
                        deleteInventoryItem(item.id);
                      }
                    }}
                    className="text-slate-400 hover:text-rose-600 min-w-7 w-7 h-7"
                    title="Zmazať"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex justify-between items-center text-[11px] text-slate-500 px-1 font-medium">
        <span>Zobrazených {filteredItems.length} položiek</span>
        <span>Celková hodnota inventára portfólia: €{totalValue.toLocaleString()}</span>
      </div>
    </div>
  );
};
