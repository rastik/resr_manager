import React, { useState, useEffect } from 'react';
import { Input, Select, SelectItem, Textarea, Button } from '@heroui/react';
import { Modal } from '../common/Modal';
import { DecimalInput } from '../common/DecimalInput';
import { useProperty } from '../../context/PropertyContext';
import { InventoryCategory, InventoryItem } from '../../types';

interface AddInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPropertyId?: string;
  itemToEdit?: InventoryItem | null;
}

export const AddInventoryModal: React.FC<AddInventoryModalProps> = ({
  isOpen,
  onClose,
  defaultPropertyId,
  itemToEdit,
}) => {
  const { properties, addInventoryItem, updateInventoryItem } = useProperty();

  const [propertyId, setPropertyId] = useState(defaultPropertyId || properties[0]?.id || '');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('appliance');
  const [brandModel, setBrandModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [warrantyExpiresAt, setWarrantyExpiresAt] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setPropertyId(itemToEdit.propertyId || defaultPropertyId || properties[0]?.id || '');
        setName(itemToEdit.name || '');
        setCategory(itemToEdit.category || 'appliance');
        setBrandModel(itemToEdit.brandModel || '');
        setSerialNumber(itemToEdit.serialNumber || '');
        setPurchaseDate(itemToEdit.purchaseDate ? itemToEdit.purchaseDate.split('T')[0] : '');
        setWarrantyExpiresAt(itemToEdit.warrantyExpiresAt ? itemToEdit.warrantyExpiresAt.split('T')[0] : '');
        setCost(itemToEdit.cost !== undefined && itemToEdit.cost !== null ? String(itemToEdit.cost) : '');
        setNotes(itemToEdit.notes || '');
      } else {
        const targetId = defaultPropertyId || (properties.length > 0 ? properties[0].id : '');
        setPropertyId(targetId);
        setName('');
        setCategory('appliance');
        setBrandModel('');
        setSerialNumber('');
        setPurchaseDate('');
        setWarrantyExpiresAt('');
        setCost('');
        setNotes('');
      }
    }
  }, [isOpen, defaultPropertyId, properties, itemToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const numCost = cost === '' ? 0 : Number(cost);
      if (itemToEdit) {
        await updateInventoryItem(itemToEdit.id, {
          propertyId,
          name,
          category,
          brandModel,
          serialNumber,
          purchaseDate: purchaseDate || undefined,
          warrantyExpiresAt: warrantyExpiresAt || undefined,
          cost: isNaN(numCost) ? 0 : numCost,
          notes,
        });
      } else {
        await addInventoryItem({
          propertyId,
          name,
          category,
          brandModel,
          serialNumber,
          purchaseDate: purchaseDate || undefined,
          warrantyExpiresAt: warrantyExpiresAt || undefined,
          lifespanYears: 8,
          cost: isNaN(numCost) ? 0 : numCost,
          notes,
        });
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={itemToEdit ? 'Upraviť položku inventára' : 'Zaevidovať spotrebič / inventár'}
      subtitle={itemToEdit ? `Úprava parametrov položky ${itemToEdit.name}` : 'Priraďte nové zariadenie alebo nábytok ku konkrétnemu bytu'}
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
            disallowEmptySelection
            selectedKeys={propertyId ? new Set([propertyId]) : new Set([])}
            onSelectionChange={keys => {
              const val = Array.from(keys)[0];
              if (val) setPropertyId(String(val));
            }}
            classNames={{
              trigger: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 min-h-9 shadow-2xs',
              value: 'text-xs font-medium text-slate-900',
              popoverContent: 'bg-white border border-slate-200 shadow-lg text-slate-900',
            }}
          >
            {properties.map(p => (
              <SelectItem key={p.id} className="text-slate-900 hover:bg-slate-100 data-[selected=true]:bg-slate-100 data-[selected=true]:text-slate-950 font-medium">
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
              disallowEmptySelection
              selectedKeys={new Set([category])}
              onSelectionChange={keys => {
                const val = Array.from(keys)[0];
                if (val) setCategory(String(val) as InventoryCategory);
              }}
              classNames={{
                trigger: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 min-h-9 shadow-2xs',
                value: 'text-xs font-medium text-slate-900',
                popoverContent: 'bg-white border border-slate-200 shadow-lg text-slate-900',
              }}
            >
              <SelectItem key="fixture" className="text-slate-900 hover:bg-slate-100 data-[selected=true]:bg-slate-100 data-[selected=true]:text-slate-950 font-medium">
                Vybavenie
              </SelectItem>
              <SelectItem key="furniture" className="text-slate-900 hover:bg-slate-100 data-[selected=true]:bg-slate-100 data-[selected=true]:text-slate-950 font-medium">
                Nábytok
              </SelectItem>
              <SelectItem key="appliance" className="text-slate-900 hover:bg-slate-100 data-[selected=true]:bg-slate-100 data-[selected=true]:text-slate-950 font-medium">
                Spotrebič
              </SelectItem>
              <SelectItem key="other" className="text-slate-900 hover:bg-slate-100 data-[selected=true]:bg-slate-100 data-[selected=true]:text-slate-950 font-medium">
                Ostatné
              </SelectItem>
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
          <DecimalInput
            size="sm"
            variant="bordered"
            aria-label="Obstarávacia cena"
            placeholder="0.00"
            value={cost}
            onValueChange={val => setCost(val)}
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
            color="primary"
            type="submit"
            isLoading={loading}
            className="font-medium rounded-lg shadow-xs px-4"
          >
            {itemToEdit ? 'Uložiť zmeny' : 'Uložiť položku'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
