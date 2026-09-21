import React, { useState, useEffect } from 'react';
import { Input, Select, SelectItem, Textarea, Button } from '@heroui/react';
import { Modal } from '../common/Modal';
import { useProperty } from '../../context/PropertyContext';
import { ExpenseCategory } from '../../types';
import { Package } from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPropertyId?: string;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  defaultPropertyId,
}) => {
  const { properties, inventory, addExpense } = useProperty();

  const [propertyId, setPropertyId] = useState(defaultPropertyId || properties[0]?.id || '');
  const [category, setCategory] = useState<ExpenseCategory>('replacement');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [amount, setAmount] = useState(250);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const targetId = defaultPropertyId || (properties.length > 0 ? properties[0].id : '');
      if (targetId) {
        setPropertyId(targetId);
      }
      setSelectedInventoryId('');
    }
  }, [isOpen, defaultPropertyId, properties]);

  const propertyInventory = inventory.filter(i => i.propertyId === propertyId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const defaultDesc = category === 'replacement'
        ? 'Výmena spotrebiča'
        : category === 'cleaning'
        ? 'Upratovanie'
        : 'Servis a údržba';

      await addExpense({
        propertyId,
        category,
        amount: Number(amount),
        date,
        description: description.trim() || defaultDesc,
      });

      onClose();
      setDescription('');
      setSelectedInventoryId('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Zaznamenať výdavok"
      subtitle="Evidencia výmeny spotrebičov, zakúpenej techniky a servisných nákladov bytu"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Priradiť k bytu <span className="text-rose-500">*</span>
          </label>
          <Select
            size="sm"
            variant="bordered"
            aria-label="Priradiť k bytu"
            disallowEmptySelection
            selectedKeys={propertyId ? [propertyId] : []}
            onSelectionChange={keys => {
              const val = Array.from(keys)[0];
              if (val) setPropertyId(String(val));
            }}
            classNames={{
              trigger: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 min-h-9 shadow-2xs',
              value: 'text-xs font-medium text-slate-900',
            }}
          >
            {properties.map(p => (
              <SelectItem key={p.id}>
                {`${p.name} (č. ${p.unitNumber})`}
              </SelectItem>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Kategória výdavku <span className="text-rose-500">*</span>
            </label>
            <Select
              size="sm"
              variant="bordered"
              aria-label="Kategória výdavku"
              disallowEmptySelection
              selectedKeys={[category]}
              onSelectionChange={keys => {
                const val = Array.from(keys)[0];
                if (val) setCategory(val as any);
              }}
              classNames={{
                trigger: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 min-h-9 shadow-2xs',
                value: 'text-xs font-medium text-slate-900',
              }}
            >
              <SelectItem key="replacement">Výmena spotrebičov</SelectItem>
              <SelectItem key="service">Servis a údržba</SelectItem>
              <SelectItem key="cleaning">Upratovanie</SelectItem>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Suma (€) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              size="sm"
              variant="bordered"
              aria-label="Suma"
              isRequired
              value={amount === 0 ? '' : String(amount)}
              onChange={e => setAmount(e.target.value === '' ? 0 : Number(e.target.value))}
              classNames={{
                inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                input: 'text-xs text-rose-600 font-bold',
              }}
            />
          </div>
        </div>

        {/* Ak ide o výmenu spotrebiča, ponukni výber z evidovaného inventára */}
        {category === 'replacement' && propertyInventory.length > 0 && (
          <div className="space-y-2 p-3 rounded-xl bg-amber-50/70 border border-amber-200">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-amber-950 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-700" />
                Vymieňaný spotrebič z inventára (voliteľné)
              </label>
              <span className="text-[10px] text-amber-700 font-medium">Predvyplní popis</span>
            </div>
            <Select
              size="sm"
              variant="bordered"
              aria-label="Vymenený spotrebič z inventára"
              placeholder="Vyberte zo zoznamu evidovaných spotrebičov..."
              selectedKeys={selectedInventoryId ? [selectedInventoryId] : []}
              onSelectionChange={keys => {
                const val = Array.from(keys)[0];
                const id = val ? String(val) : '';
                setSelectedInventoryId(id);
                const found = propertyInventory.find(i => i.id === id);
                if (found) {
                  setDescription(`Výmena spotrebiča: ${found.name} (${found.brandModel || found.category})`);
                }
              }}
              classNames={{
                trigger: 'border-amber-300 bg-white hover:border-amber-400 focus-within:!border-amber-600 rounded-lg h-9 min-h-9 shadow-2xs',
                value: 'text-xs font-medium text-slate-900',
              }}
            >
              {propertyInventory.map(item => (
                <SelectItem key={item.id} textValue={`${item.name} (${item.brandModel || item.category})`}>
                  <div className="flex items-center justify-between text-xs py-0.5">
                    <span className="font-semibold text-slate-800">{item.name}</span>
                    <span className="text-slate-500 text-[11px]">{item.brandModel || item.category}</span>
                  </div>
                </SelectItem>
              ))}
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Dátum zakúpenia / výmeny / úhrady <span className="text-rose-500">*</span>
          </label>
          <Input
            type="date"
            size="sm"
            variant="bordered"
            aria-label="Dátum úhrady"
            isRequired
            value={date}
            onChange={e => setDate(e.target.value)}
            classNames={{
              inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
              input: 'text-xs text-slate-900',
            }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Popis zakúpeného spotrebiča / práce a dodávateľ <span className="text-slate-400 font-normal">(nepovinné)</span>
          </label>
          <Textarea
            size="sm"
            variant="bordered"
            aria-label="Popis práce a dodávateľ"
            minRows={3}
            placeholder="napr. Nová chladnička Samsung RB34, nákup Alza.sk (výmena starej nefunkčnej chladničky)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            classNames={{
              inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg shadow-2xs',
              input: 'text-xs text-slate-900 placeholder:text-slate-400',
            }}
          />
        </div>

        <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
          <Button
            size="sm"
            variant="flat"
            onClick={onClose}
            className="font-medium text-slate-700 rounded-lg"
          >
            Zrušiť
          </Button>
          <Button
            size="sm"
            type="submit"
            isLoading={loading}
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg shadow-xs px-4"
          >
            Zaznamenať výdavok
          </Button>
        </div>
      </form>
    </Modal>
  );
};
