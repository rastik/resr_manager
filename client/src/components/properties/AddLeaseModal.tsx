import React, { useState, useEffect } from 'react';
import { Input, Select, SelectItem, Button } from '@heroui/react';
import { Modal } from '../common/Modal';
import { ImageLightboxModal } from '../common/ImageLightboxModal';
import { useProperty } from '../../context/PropertyContext';
import { Camera, UploadCloud, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { compressImage } from '../../utils/imageCompressor';

interface AddLeaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPropertyId?: string;
}

export const AddLeaseModal: React.FC<AddLeaseModalProps> = ({
  isOpen,
  onClose,
  defaultPropertyId,
}) => {
  const { properties, addLease } = useProperty();

  const [propertyId, setPropertyId] = useState(defaultPropertyId || properties[0]?.id || '');
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [baseRent, setBaseRent] = useState<number | ''>('');
  const [utilitiesAmount, setUtilitiesAmount] = useState<number | ''>('');
  const [depositAmount, setDepositAmount] = useState<number | ''>('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [contractFileName] = useState('Najomna_Zmluva_2026.pdf');
  const [moveInPhotos, setMoveInPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const totalRent = (Number(baseRent) || 0) + (Number(utilitiesAmount) || 0);

  useEffect(() => {
    if (isOpen) {
      const targetId = defaultPropertyId || (properties.length > 0 ? properties[0].id : '');
      if (targetId) {
        handlePropertyChange(targetId);
      }
    }
  }, [isOpen, defaultPropertyId, properties]);

  const handlePropertyChange = (pId: string) => {
    setPropertyId(pId);
    const prop = properties.find(p => p.id === pId);
    if (prop) {
      if (prop.baseRent !== undefined && prop.baseRent !== null && prop.baseRent > 0) {
        setBaseRent(prop.baseRent);
        setUtilitiesAmount(prop.utilitiesAmount ?? 0);
        const tot = Number(prop.baseRent) + Number(prop.utilitiesAmount || 0);
        setDepositAmount(tot * 2);
      } else if (prop.rentAmount && prop.rentAmount > 0) {
        setBaseRent(prop.rentAmount);
        setUtilitiesAmount(0);
        setDepositAmount(prop.rentAmount * 2);
      } else {
        setBaseRent('');
        setUtilitiesAmount('');
        setDepositAmount('');
      }
    }
  };

  const handleMoveInPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const promises = Array.from(files).map(file => compressImage(file));
      const b64s = (await Promise.all(promises)).filter(Boolean);
      if (b64s.length > 0) {
        setMoveInPhotos(prev => [...prev, ...b64s]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveMoveInPhoto = (index: number) => {
    setMoveInPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const bRent = Number(baseRent) || 0;
      const uAmount = Number(utilitiesAmount) || 0;
      const totRent = bRent + uAmount;

      await addLease({
        propertyId,
        tenantName,
        tenantEmail,
        tenantPhone,
        baseRent: bRent,
        utilitiesAmount: uAmount,
        rentAmount: totRent,
        depositAmount: Number(depositAmount) || 0,
        startDate,
        endDate,
        status: 'active',
        contractFileName,
        contractFileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        moveInPhotos,
      });

      try {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.7 },
        });
      } catch {
        // ignore
      }

      onClose();
      setTenantName('');
      setTenantEmail('');
      setTenantPhone('');
      setMoveInPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nová nájomná zmluva"
      subtitle="Zaregistrujte novú zmluvu a priraďte nájomcu k bytu"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Vybraný byt / nehnuteľnosť <span className="text-rose-500">*</span>
          </label>
          <Select
            size="sm"
            variant="bordered"
            aria-label="Vybraný byt / nehnuteľnosť"
            selectedKeys={propertyId ? [propertyId] : []}
            onChange={e => handlePropertyChange(e.target.value)}
            onSelectionChange={keys => {
              const val = Array.from(keys)[0];
              if (val) handlePropertyChange(String(val));
            }}
            classNames={{
              trigger: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 min-h-9 shadow-2xs',
              value: 'text-xs font-medium text-slate-900',
            }}
          >
            {properties.map(p => (
              <SelectItem key={p.id}>
                {`${p.name} (${p.unitNumber}) - ${p.city}`}
              </SelectItem>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Meno a priezvisko nájomcu <span className="text-rose-500">*</span>
            </label>
            <Input
              size="sm"
              variant="bordered"
              aria-label="Meno a priezvisko nájomcu"
              placeholder="napr. Martin Horváth"
              isRequired
              value={tenantName}
              onChange={e => setTenantName(e.target.value)}
              classNames={{
                inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                input: 'text-xs text-slate-900 placeholder:text-slate-400',
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Email nájomcu <span className="text-rose-500">*</span>
            </label>
            <Input
              type="email"
              size="sm"
              variant="bordered"
              aria-label="Email nájomcu"
              placeholder="najomca@email.sk"
              isRequired
              value={tenantEmail}
              onChange={e => setTenantEmail(e.target.value)}
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
              Telefónne číslo <span className="text-rose-500">*</span>
            </label>
            <Input
              type="tel"
              size="sm"
              variant="bordered"
              aria-label="Telefónne číslo"
              placeholder="+421 905 123 456"
              isRequired
              value={tenantPhone}
              onChange={e => setTenantPhone(e.target.value)}
              classNames={{
                inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                input: 'text-xs text-slate-900 placeholder:text-slate-400',
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Výška kaucie / zábezpeky (€) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              size="sm"
              variant="bordered"
              aria-label="Výška kaucie"
              placeholder="napr. 1500"
              isRequired
              value={depositAmount === '' ? '' : String(depositAmount)}
              onChange={e => setDepositAmount(e.target.value === '' ? '' : Number(e.target.value))}
              classNames={{
                inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                input: 'text-xs text-slate-900',
              }}
            />
          </div>
        </div>

        {/* NÁJOM A ENERGIE SEKCOVÝ PANEL */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Mesačný nájom a energie <span className="text-rose-500">*</span>
              </span>
              <span className="text-[11px] text-slate-500">
                Rozdelenie celkovej mesačnej platby
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs inline-block">
                Celkom: €{totalRent.toLocaleString()} / mes
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Čistý nájom (€/mes) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                size="sm"
                variant="bordered"
                aria-label="Čistý nájom"
                placeholder="napr. 600"
                isRequired
                value={baseRent === '' ? '' : String(baseRent)}
                onChange={e => {
                  const val = e.target.value === '' ? '' : Number(e.target.value);
                  setBaseRent(val);
                  if (depositAmount === '' || depositAmount === 0) {
                    const u = typeof utilitiesAmount === 'number' ? utilitiesAmount : 0;
                    const b = typeof val === 'number' ? val : 0;
                    setDepositAmount((b + u) * 2);
                  }
                }}
                classNames={{
                  inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                  input: 'text-xs text-slate-900 font-semibold',
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Energie a služby (€/mes) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                size="sm"
                variant="bordered"
                aria-label="Energie a služby"
                placeholder="napr. 150"
                isRequired
                value={utilitiesAmount === '' ? '' : String(utilitiesAmount)}
                onChange={e => {
                  const val = e.target.value === '' ? '' : Number(e.target.value);
                  setUtilitiesAmount(val);
                  if (depositAmount === '' || depositAmount === 0) {
                    const b = typeof baseRent === 'number' ? baseRent : 0;
                    const u = typeof val === 'number' ? val : 0;
                    setDepositAmount((b + u) * 2);
                  }
                }}
                classNames={{
                  inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                  input: 'text-xs text-slate-900 font-semibold',
                }}
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/70">
            <span>Súhrn platby:</span>
            <span className="font-semibold text-slate-800">
              Nájom €{(Number(baseRent) || 0).toLocaleString()} + Energie €{(Number(utilitiesAmount) || 0).toLocaleString()} = €{totalRent.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Začiatok nájmu <span className="text-rose-500">*</span>
            </label>
            <Input
              type="date"
              size="sm"
              variant="bordered"
              aria-label="Začiatok nájmu"
              isRequired
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              classNames={{
                inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                input: 'text-xs text-slate-900',
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Koniec nájmu <span className="text-rose-500">*</span>
            </label>
            <Input
              type="date"
              size="sm"
              variant="bordered"
              aria-label="Koniec nájmu"
              isRequired
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              classNames={{
                inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
                input: 'text-xs text-slate-900',
              }}
            />
          </div>
        </div>

        {/* Fotografie pred začiatkom nájmu */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-slate-500" />
              <label className="text-xs font-semibold text-slate-700">
                Stav pred začiatkom nájmu
              </label>
              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full font-medium">
                {moveInPhotos.length}
              </span>
            </div>
            <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition shadow-2xs">
              <UploadCloud className="w-3 h-3 text-slate-500" />
              <span>+ Pridať fotky</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleMoveInPhotoUpload}
                className="hidden"
              />
            </label>
          </div>

          {moveInPhotos.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
              {moveInPhotos.map((photo, idx) => (
                <div key={idx} className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-2xs">
                  <img
                    src={photo}
                    alt={`Pred nájmom ${idx + 1}`}
                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                    onClick={() => setLightboxIndex(idx)}
                    title="Kliknutím otvoriť vo väčšom"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveMoveInPhoto(idx)}
                    className="absolute top-1 right-1 w-5 h-5 rounded bg-rose-600/90 hover:bg-rose-700 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-xs"
                    title="Odstrániť"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic">
              Nepovinné: môžete už teraz nahrať fotografie bytu z dňa odovzdania kľúčov.
            </p>
          )}
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
            Vystaviť zmluvu
          </Button>
        </div>
      </form>

      <ImageLightboxModal
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        photos={moveInPhotos}
        initialIndex={lightboxIndex || 0}
        title={`Stav pred začiatkom nájmu – ${tenantName || 'Nová zmluva'}`}
      />
    </Modal>
  );
};
