import React, { useState, useEffect } from 'react';
import { Input, Button, Checkbox, Textarea } from '@heroui/react';
import { Home, Building2, Wind, Armchair } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useProperty } from '../../context/PropertyContext';

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddPropertyModal: React.FC<AddPropertyModalProps> = ({ isOpen, onClose }) => {
  const { addProperty } = useProperty();

  const [name, setName] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [sizeSqm, setSizeSqm] = useState<number | ''>('');
  const [bedrooms, setBedrooms] = useState<number | ''>('');
  const [hasCellar, setHasCellar] = useState(false);
  const [cellarAreaSqm, setCellarAreaSqm] = useState<number | ''>('');
  const [cellarNumber, setCellarNumber] = useState('');
  const [hasParking, setHasParking] = useState(false);
  const [parkingSpotNumber, setParkingSpotNumber] = useState('');
  const [hasAC, setHasAC] = useState(false);
  const [hasBalcony, setHasBalcony] = useState(false);
  const [furnishingStatus, setFurnishingStatus] = useState<'furnished' | 'unfurnished'>('furnished');
  const [notes, setNotes] = useState('');
  const [propertyType, setPropertyType] = useState<'apartment' | 'flat'>('flat');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setUnitNumber('');
      setAddress('');
      setCity('');
      setSizeSqm('');
      setBedrooms('');
      setNotes('');
      setCellarNumber('');
      setCellarAreaSqm('');
      setParkingSpotNumber('');
      setHasCellar(false);
      setHasParking(false);
      setHasAC(false);
      setHasBalcony(false);
      setFurnishingStatus('furnished');
      setPropertyType('flat');
    }
  }, [isOpen]);

  const defaultImageUrl =
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addProperty({
        name,
        unitNumber,
        address,
        postalCode: '',
        city,
        neighborhood: '',
        sizeSqm: Number(sizeSqm),
        bedrooms: Number(bedrooms),
        bathrooms: 1,
        rentAmount: 0,
        status: 'vacant',
        imageUrl: defaultImageUrl,
        hasCellar,
        cellarAreaSqm: hasCellar && cellarAreaSqm !== '' ? Number(cellarAreaSqm) : undefined,
        cellarNumber: hasCellar ? cellarNumber : undefined,
        hasParking,
        parkingSpotNumber: hasParking ? parkingSpotNumber : undefined,
        hasAC,
        hasBalcony,
        furnishingStatus,
        photos: [defaultImageUrl],
        notes,
        propertyType,
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
      title="Pridať nový byt / nehnuteľnosť"
      subtitle="Zaregistrujte novú bytovú jednotku do vášho portfólia"
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
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${propertyType === 'flat' ? 'border-slate-900 bg-slate-900' : 'border-slate-300'}`}>
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
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${propertyType === 'apartment' ? 'border-slate-900 bg-slate-900' : 'border-slate-300'}`}>
                {propertyType === 'apartment' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Názov objektu / budovy <span className="text-rose-500">*</span>
            </label>
            <Input
              size="sm"
              variant="bordered"
              aria-label="Názov objektu / budovy"
              placeholder="napr. Rezidencia Dunaj"
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
              Číslo bytu / jednotky <span className="text-rose-500">*</span>
            </label>
            <Input
              size="sm"
              variant="bordered"
              aria-label="Číslo bytu / jednotky"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Ulica a orientačné číslo <span className="text-rose-500">*</span>
            </label>
            <Input
              size="sm"
              variant="bordered"
              aria-label="Ulica a orientačné číslo"
              placeholder="napr. Dvořákovo nábrežie 12"
              isRequired
              value={address}
              onChange={e => setAddress(e.target.value)}
              classNames={{
                inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                input: 'text-xs text-slate-900 placeholder:text-slate-400',
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
              placeholder="napr. Bratislava"
              isRequired
              value={city}
              onChange={e => setCity(e.target.value)}
              classNames={{
                inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                input: 'text-xs text-slate-900 placeholder:text-slate-400',
              }}
            />
          </div>
        </div>

        {/* Specs row: Výmera & Počet izieb */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Výmera (m²) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              size="sm"
              variant="bordered"
              aria-label="Výmera (m²)"
              placeholder="napr. 65"
              isRequired
              value={sizeSqm === '' ? '' : String(sizeSqm)}
              onChange={e => setSizeSqm(e.target.value === '' ? '' : Number(e.target.value))}
              classNames={{
                inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                input: 'text-xs text-slate-900 placeholder:text-slate-400',
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
              value={bedrooms === '' ? '' : String(bedrooms)}
              onChange={e => setBedrooms(e.target.value === '' ? '' : Number(e.target.value))}
              classNames={{
                inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                input: 'text-xs text-slate-900 placeholder:text-slate-400',
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
            {/* Klimatizácia a Balkón */}
            <div className="flex flex-col gap-2 justify-center">
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

              <Checkbox
                size="sm"
                isSelected={hasBalcony}
                onValueChange={setHasBalcony}
                classNames={{
                  label: 'text-xs font-medium text-slate-700 select-none flex items-center gap-1.5',
                }}
              >
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Balkón / Lodžia / Terasa</span>
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
            Poznámka k bytu / inzerátu <span className="text-slate-400 font-normal">(voliteľné)</span>
          </label>
          <Textarea
            size="sm"
            variant="bordered"
            aria-label="Poznámka k bytu"
            placeholder="napr. Byt po kompletnej rekonštrukcii, orientácia na juh, tichý vnútroblok..."
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
            Zaregistrovať byt
          </Button>
        </div>
      </form>
    </Modal>
  );
};
