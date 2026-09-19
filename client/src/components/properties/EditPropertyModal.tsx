import React, { useState, useEffect } from 'react';
import { Input, Button, Checkbox, Textarea } from '@heroui/react';
import { Home, Building2, Wind, Armchair } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useProperty } from '../../context/PropertyContext';
import { Property } from '../../types';

interface EditPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
}

export const EditPropertyModal: React.FC<EditPropertyModalProps> = ({
  isOpen,
  onClose,
  property,
}) => {
  const { updateProperty } = useProperty();

  const [name, setName] = useState(property.name);
  const [propertyType, setPropertyType] = useState<'apartment' | 'flat'>(
    property.propertyType || 'flat'
  );
  const [unitNumber, setUnitNumber] = useState(property.unitNumber);
  const [address, setAddress] = useState(property.address);
  const [city, setCity] = useState(property.city);
  const [sizeSqm, setSizeSqm] = useState<number | ''>(property.sizeSqm);
  const [bedrooms, setBedrooms] = useState<number | ''>(property.bedrooms);
  const [hasCellar, setHasCellar] = useState(Boolean(property.hasCellar));
  const [cellarAreaSqm, setCellarAreaSqm] = useState<number | ''>(
    property.cellarAreaSqm || ''
  );
  const [cellarNumber, setCellarNumber] = useState(property.cellarNumber || '');
  const [hasParking, setHasParking] = useState(Boolean(property.hasParking));
  const [parkingSpotNumber, setParkingSpotNumber] = useState(property.parkingSpotNumber || '');
  const [hasAC, setHasAC] = useState(Boolean(property.hasAC));
  const [furnishingStatus, setFurnishingStatus] = useState<'furnished' | 'unfurnished'>(
    property.furnishingStatus || 'furnished'
  );
  const [notes, setNotes] = useState(property.notes || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(property.name);
      setPropertyType(property.propertyType || 'flat');
      setUnitNumber(property.unitNumber);
      setAddress(property.address);
      setCity(property.city);
      setSizeSqm(property.sizeSqm);
      setBedrooms(property.bedrooms);
      setHasCellar(Boolean(property.hasCellar));
      setCellarAreaSqm(property.cellarAreaSqm || '');
      setCellarNumber(property.cellarNumber || '');
      setHasParking(Boolean(property.hasParking));
      setParkingSpotNumber(property.parkingSpotNumber || '');
      setHasAC(Boolean(property.hasAC));
      setFurnishingStatus(property.furnishingStatus || 'furnished');
      setNotes(property.notes || '');
    }
  }, [isOpen, property]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProperty(property.id, {
        name,
        propertyType,
        unitNumber,
        address,
        postalCode: property.postalCode || '',
        city,
        neighborhood: property.neighborhood || '',
        sizeSqm: Number(sizeSqm),
        bedrooms: Number(bedrooms),
        bathrooms: property.bathrooms || 1,
        rentAmount: property.rentAmount,
        status: property.status,
        imageUrl: property.imageUrl,
        photos: property.photos,
        hasCellar,
        cellarAreaSqm: hasCellar && cellarAreaSqm !== '' ? Number(cellarAreaSqm) : undefined,
        cellarNumber: hasCellar ? cellarNumber : undefined,
        hasParking,
        parkingSpotNumber: hasParking ? parkingSpotNumber : undefined,
        hasAC,
        furnishingStatus,
        notes,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upraviť nehnuteľnosť"
      subtitle={`Úprava parametrov a údajov pre ${property.name} (${property.unitNumber})`}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Typ nehnuteľnosti: Byt vs Apartmán */}
        <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <label className="block text-xs font-semibold text-slate-800">
            Typ nehnuteľnosti <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPropertyType('flat')}
              className={`p-2.5 rounded-lg border text-left transition flex items-center justify-between ${
                propertyType === 'flat'
                  ? 'border-slate-900 bg-white ring-1 ring-slate-900 shadow-xs'
                  : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
              }`}
            >
              <div>
                <span className="text-xs font-bold block text-slate-900 flex items-center gap-1"><Home className="w-3.5 h-3.5" /> Byt</span>
                <span className="text-[11px] text-slate-400">Klasický rezidenčný byt</span>
              </div>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  propertyType === 'flat' ? 'border-slate-900 bg-slate-900' : 'border-slate-300'
                }`}
              >
                {propertyType === 'flat' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPropertyType('apartment')}
              className={`p-2.5 rounded-lg border text-left transition flex items-center justify-between ${
                propertyType === 'apartment'
                  ? 'border-slate-900 bg-white ring-1 ring-slate-900 shadow-xs'
                  : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
              }`}
            >
              <div>
                <span className="text-xs font-bold block text-slate-900 flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> Apartmán</span>
                <span className="text-[11px] text-slate-400">Apartmánový dom / nebytový priestor</span>
              </div>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  propertyType === 'apartment' ? 'border-slate-900 bg-slate-900' : 'border-slate-300'
                }`}
              >
                {propertyType === 'apartment' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
            </button>
          </div>
        </div>

        {/* Názov a číslo jednotky */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Názov objektu / budovy <span className="text-rose-500">*</span>
            </label>
            <Input
              size="sm"
              variant="bordered"
              aria-label="Názov objektu / budovy"
              isRequired
              value={name}
              onChange={e => setName(e.target.value)}
              classNames={{
                inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                input: 'text-xs text-slate-900',
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Číslo jednotky / bytu <span className="text-rose-500">*</span>
            </label>
            <Input
              size="sm"
              variant="bordered"
              aria-label="Číslo jednotky / bytu"
              placeholder="napr. 100"
              isRequired
              value={unitNumber}
              onChange={e => setUnitNumber(e.target.value)}
              classNames={{
                inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                input: 'text-xs text-slate-900 placeholder:text-slate-400',
              }}
            />
          </div>
        </div>

        {/* Ulica */}
        {/* Ulica & Mesto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Ulica a orientačné číslo <span className="text-rose-500">*</span>
            </label>
            <Input
              size="sm"
              variant="bordered"
              aria-label="Ulica a orientačné číslo"
              isRequired
              value={address}
              onChange={e => setAddress(e.target.value)}
              classNames={{
                inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                input: 'text-xs text-slate-900',
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Mesto <span className="text-rose-500">*</span>
            </label>
            <Input
              size="sm"
              variant="bordered"
              aria-label="Mesto"
              isRequired
              value={city}
              onChange={e => setCity(e.target.value)}
              classNames={{
                inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                input: 'text-xs text-slate-900',
              }}
            />
          </div>
        </div>

        {/* Parametre: Výmera a Izby */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Výmera (m²) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              size="sm"
              variant="bordered"
              aria-label="Výmera"
              placeholder="napr. 65"
              isRequired
              value={sizeSqm === 0 ? '' : String(sizeSqm)}
              onChange={e => setSizeSqm(e.target.value === '' ? '' : Number(e.target.value))}
              classNames={{
                inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                input: 'text-xs text-slate-900',
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Počet izieb <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              size="sm"
              variant="bordered"
              aria-label="Počet izieb"
              placeholder="napr. 2"
              isRequired
              value={bedrooms === 0 ? '' : String(bedrooms)}
              onChange={e => setBedrooms(e.target.value === '' ? '' : Number(e.target.value))}
              classNames={{
                inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                input: 'text-xs text-slate-900',
              }}
            />
          </div>
        </div>

        {/* Cellar & Parking Section */}
        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
          <span className="text-xs font-semibold text-slate-900 block">Príslušenstvo: Kobka a Parkovacie státie</span>

          {/* Pivničná kobka */}
          <div className="space-y-2">
            <Checkbox
              size="sm"
              isSelected={hasCellar}
              onValueChange={setHasCellar}
              classNames={{
                label: 'text-xs font-medium text-slate-700 select-none',
              }}
            >
              K bytu patrí pivničná kobka
            </Checkbox>

            {hasCellar && (
              <div className="grid grid-cols-2 gap-3 pl-6 pt-1">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Výmera kobky (m²) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    size="sm"
                    variant="bordered"
                    aria-label="Výmera kobky"
                    placeholder="napr. 4.5"
                    isRequired
                    value={cellarAreaSqm === '' ? '' : String(cellarAreaSqm)}
                    onChange={e => setCellarAreaSqm(e.target.value === '' ? '' : Number(e.target.value))}
                    classNames={{
                      inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-8 shadow-2xs',
                      input: 'text-xs text-slate-900 placeholder:text-slate-400',
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Číslo kobky <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    size="sm"
                    variant="bordered"
                    aria-label="Číslo kobky"
                    placeholder="napr. K-12"
                    isRequired
                    value={cellarNumber}
                    onChange={e => setCellarNumber(e.target.value)}
                    classNames={{
                      inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-8 shadow-2xs',
                      input: 'text-xs text-slate-900 placeholder:text-slate-400',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Parkovacie státie */}
          <div className="space-y-2 pt-2 border-t border-slate-200/60">
            <Checkbox
              size="sm"
              isSelected={hasParking}
              onValueChange={setHasParking}
              classNames={{
                label: 'text-xs font-medium text-slate-700 select-none',
              }}
            >
              K bytu patrí parkovacie státie
            </Checkbox>

            {hasParking && (
              <div className="pl-6 pt-1">
                <div className="space-y-1 max-w-xs">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Číslo parkovacieho státia <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    size="sm"
                    variant="bordered"
                    aria-label="Číslo parkovacieho státia"
                    placeholder="napr. P-05 alebo G-14"
                    isRequired
                    value={parkingSpotNumber}
                    onChange={e => setParkingSpotNumber(e.target.value)}
                    classNames={{
                      inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-8 shadow-2xs',
                      input: 'text-xs text-slate-900 placeholder:text-slate-400',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Vybavenie a zariadenie: Klimatizácia a Zariadenosť */}
        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
          <span className="text-xs font-semibold text-slate-900 block">Vybavenie nehnuteľnosti</span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Klimatizácia */}
            <div className="flex items-center">
              <Checkbox
                size="sm"
                isSelected={hasAC}
                onValueChange={setHasAC}
                classNames={{
                  label: 'text-xs font-medium text-slate-700 select-none flex items-center gap-1.5',
                }}
              >
                <Wind className="w-3.5 h-3.5 text-slate-500" />
                <span>Klimatizácia</span>
              </Checkbox>
            </div>

            {/* Zariadenie */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                <Armchair className="w-3.5 h-3.5 text-slate-500" />
                <span>Stav zariadenia</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFurnishingStatus('furnished')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    furnishingStatus === 'furnished'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Zariadený
                </button>
                <button
                  type="button"
                  onClick={() => setFurnishingStatus('unfurnished')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    furnishingStatus === 'unfurnished'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Nezariadený
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Poznámka ku bytu */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Poznámka k nehnuteľnosti / inzerátu <span className="text-slate-400 font-normal">(voliteľné)</span>
          </label>
          <Textarea
            size="sm"
            variant="bordered"
            aria-label="Poznámka k bytu"
            placeholder="napr. Byt po kompletnej rekonštrukcii..."
            minRows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            classNames={{
              inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg shadow-2xs',
              input: 'text-xs text-slate-900 placeholder:text-slate-400',
            }}
          />
        </div>

        {/* Action Buttons */}
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
            Uložiť zmeny
          </Button>
        </div>
      </form>
    </Modal>
  );
};
