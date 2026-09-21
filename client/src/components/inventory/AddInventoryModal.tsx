import React, { useState, useEffect } from 'react';
import { Input, Select, SelectItem, Textarea, Button } from '@heroui/react';
import { Modal } from '../common/Modal';
import { useProperty } from '../../context/PropertyContext';
import { InventoryCategory } from '../../types';

interface AddInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPropertyId?: string;
}

export const AddInventoryModal: React.FC<AddInventoryModalProps> = ({
  isOpen,
  onClose,
  defaultPropertyId,
}) => {
  const { properties, addInventoryItem } = useProperty();

  const [propertyId, setPropertyId] = useState(defaultPropertyId || properties[0]?.id || '');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('appliance');
  const [brandModel, setBrandModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [warrantyExpiresAt, setWarrantyExpiresAt] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const targetId = defaultPropertyId || (properties.length > 0 ? properties[0].id : '');
      if (targetId) {
        setPropertyId(targetId);
      }
    }
  }, [isOpen, defaultPropertyId, properties]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addInventoryItem({
        propertyId,
        name,
        category,
        brandModel,
        serialNumber,
        purchaseDate: purchaseDate || undefined,
        warrantyExpiresAt: warrantyExpiresAt || undefined,
        lifespanYears: 8,
        cost: cost === '' ? 0 : Number(cost),
        notes,
      });
      onClose();
      setName('');
      setBrandModel('');
      setSerialNumber('');
      setPurchaseDate('');
      setWarrantyExpiresAt('');
      setCost('');
      setNotes('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Zaevidovať spotrebič / inventár"
      subtitle="Priraďte nové zariadenie alebo nábytok ku konkrétnemu bytu"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Vybraný byt / jednotka <span className="text-rose-500">*</span>
          </label>
          <Select
            size="sm"
            variant="bordered"
            aria-label="Vybraný byt / jednotka"
            selectedKeys={propertyId ? [propertyId] : []}
            onChange={e => setPropertyId(e.target.value)}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Názov položky <span className="text-rose-500">*</span>
            </label>
            <Input
              size="sm"
              variant="bordered"
              aria-label="Názov položky"
              placeholder="napr. Umývačka riadu Bosch Serie 6"
              isRequired
              value={name}
              onChange={e => setName(e.target.value)}
              classNames={{
                inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                input: 'text-xs text-slate-900 placeholder:text-slate-400',
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Kategória <span className="text-rose-500">*</span>
            </label>
            <Select
              size="sm"
              variant="bordered"
              aria-label="Kategória"
              selectedKeys={[category]}
              onChange={e => setCategory(e.target.value as any)}
              onSelectionChange={keys => {
                const val = Array.from(keys)[0];
                if (val) setCategory(val as any);
              }}
              classNames={{
                trigger: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 min-h-9 shadow-2xs',
                value: 'text-xs font-medium text-slate-900',
              }}
            >
              <SelectItem key="appliance">Spotrebič (Kuchyňa, pranie)</SelectItem>
              <SelectItem key="furniture">Nábytok (Sedačka, posteľ, stôl)</SelectItem>
              <SelectItem key="fixture">Vybavenie (Klimatizácia, kotol)</SelectItem>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Značka a model
            </label>
            <Input
              size="sm"
              variant="bordered"
              aria-label="Značka a model"
              placeholder="napr. SMV6ZCX07E"
              value={brandModel}
              onChange={e => setBrandModel(e.target.value)}
              classNames={{
                inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                input: 'text-xs text-slate-900 placeholder:text-slate-400',
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Výrobné číslo (S/N)
            </label>
            <Input
              size="sm"
              variant="bordered"
              aria-label="Výrobné číslo (S/N)"
              placeholder="napr. SN-994821"
              value={serialNumber}
              onChange={e => setSerialNumber(e.target.value)}
              classNames={{
                inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                input: 'text-xs text-slate-900 placeholder:text-slate-400',
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Dátum nákupu
            </label>
            <Input
              type="date"
              size="sm"
              variant="bordered"
              aria-label="Dátum nákupu"
              value={purchaseDate}
              onChange={e => setPurchaseDate(e.target.value)}
              classNames={{
                inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                input: 'text-xs text-slate-900',
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Koniec záruky
            </label>
            <Input
              type="date"
              size="sm"
              variant="bordered"
              aria-label="Koniec záruky"
              value={warrantyExpiresAt}
              onChange={e => setWarrantyExpiresAt(e.target.value)}
              classNames={{
                inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                input: 'text-xs text-slate-900',
              }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Obstarávacia cena (€)
          </label>
          <Input
            type="number"
            size="sm"
            variant="bordered"
            aria-label="Obstarávacia cena"
            placeholder="0.00"
            value={cost === '' ? '' : String(cost)}
            onChange={e => setCost(e.target.value === '' ? '' : Number(e.target.value))}
            classNames={{
              inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
              input: 'text-xs text-slate-900 font-bold',
            }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Poznámky
          </label>
          <Textarea
            size="sm"
            variant="bordered"
            aria-label="Poznámky"
            minRows={2}
            placeholder="Informácie o záruke, montáži..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
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
            Uložiť položku
          </Button>
        </div>
      </form>
    </Modal>
  );
};
