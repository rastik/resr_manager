import React, { useState } from 'react';
import { Input, Button } from '@heroui/react';
import { Modal } from '../common/Modal';
import { DecimalInput } from '../common/DecimalInput';
import { useProperty } from '../../context/PropertyContext';
import { TrendingUp } from 'lucide-react';

interface AddHotelRevenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaseId: string;
  propertyId: string;
  propertyName?: string;
}

export const AddHotelRevenueModal: React.FC<AddHotelRevenueModalProps> = ({
  isOpen,
  onClose,
  leaseId,
  propertyId,
  propertyName,
}) => {
  const { addHotelRevenue } = useProperty();

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [month, setMonth] = useState(defaultMonth);
  const [revenueAmount, setRevenueAmount] = useState<string>('');
  const [occupancyPercent, setOccupancyPercent] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const inputClass = {
    inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
    input: 'text-xs text-slate-900 placeholder:text-slate-400',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (revenueAmount === '') return;
    setLoading(true);
    try {
      await addHotelRevenue({
        leaseId,
        propertyId,
        month,
        revenueAmount: Number(revenueAmount),
        occupancyPercent: occupancyPercent !== '' ? Number(occupancyPercent) : undefined,
        notes: notes || undefined,
      });
      onClose();
      setRevenueAmount('');
      setOccupancyPercent('');
      setNotes('');
      setMonth(defaultMonth);
    } finally {
      setLoading(false);
    }
  };

  const monthLabel = (() => {
    if (!month) return '';
    const [y, m] = month.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' });
  })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Zaznamenať výnos z hotela"
      subtitle={propertyName ? `Apartmán: ${propertyName}` : undefined}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mesiac */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Mesiac <span className="text-rose-500">*</span>
          </label>
          <input
            type="month"
            required
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg hover:border-slate-400 focus:border-slate-900 focus:outline-none shadow-2xs"
          />
          {monthLabel && (
            <p className="text-[11px] text-slate-500">{monthLabel}</p>
          )}
        </div>

        {/* Výnos */}
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-bold text-amber-900">Výnosy za mesiac</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Výnos (€) <span className="text-rose-500">*</span>
              </label>
              <DecimalInput
                size="sm"
                variant="bordered"
                aria-label="Výnos"
                placeholder="napr. 4500"
                isRequired
                value={revenueAmount}
                onValueChange={val => setRevenueAmount(val)}
                classNames={{
                  inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                  input: 'text-xs text-slate-900 font-semibold',
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Obsadenosť (%) <span className="text-slate-400 font-normal">nepovinné</span>
              </label>
              <DecimalInput
                size="sm"
                variant="bordered"
                aria-label="Obsadenosť"
                placeholder="napr. 85"
                value={occupancyPercent}
                onValueChange={val => setOccupancyPercent(val)}
                classNames={{
                  inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                  input: 'text-xs text-slate-900',
                }}
              />
            </div>
          </div>
        </div>

        {/* Poznámka */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">Poznámka</label>
          <Input
            size="sm"
            variant="bordered"
            aria-label="Poznámka"
            placeholder="napr. sezónny bonus, výpadok..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            classNames={inputClass}
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
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg shadow-xs px-4"
          >
            Zaznamenať výnos
          </Button>
        </div>
      </form>
    </Modal>
  );
};
