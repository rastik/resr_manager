import React, { useState, useEffect } from 'react';
import { Input, Button } from '@heroui/react';
import { Modal } from '../common/Modal';
import { ImageLightboxModal } from '../common/ImageLightboxModal';
import { DecimalInput } from '../common/DecimalInput';
import { useProperty } from '../../context/PropertyContext';
import { Lease, LeaseType } from '../../types';
import { Trash2, UploadCloud, FileText, Download, Check, X, Camera, Home, Hotel, Building2, UserMinus } from 'lucide-react';
import { compressImage } from '../../utils/imageCompressor';
import { getEffectiveLeaseStatus } from '../../utils/date';

interface EditLeaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  lease: Lease | null;
}

export const EditLeaseModal: React.FC<EditLeaseModalProps> = ({
  isOpen,
  onClose,
  lease,
}) => {
  const { properties, updateLease, deleteLease, updateProperty, showToast } = useProperty();

  const [leaseType, setLeaseType] = useState<LeaseType>('standard');
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [operatorCompany, setOperatorCompany] = useState('');
  const [baseRent, setBaseRent] = useState<string>('');
  const [utilitiesAmount, setUtilitiesAmount] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contractFileName, setContractFileName] = useState('');
  const [contractFileUrl, setContractFileUrl] = useState('');
  const [moveInPhotos, setMoveInPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isHotel = leaseType === 'hotel_operator';

  useEffect(() => {
    if (lease && isOpen) {
      setLeaseType(lease.leaseType || 'standard');
      setTenantName(lease.tenantName || '');
      setTenantEmail(lease.tenantEmail || '');
      setTenantPhone(lease.tenantPhone || '');
      setOperatorCompany(lease.operatorCompany || '');
      setBaseRent(lease.baseRent !== undefined ? String(lease.baseRent) : (lease.rentAmount !== undefined ? String(lease.rentAmount) : ''));
      setUtilitiesAmount(lease.utilitiesAmount !== undefined ? String(lease.utilitiesAmount) : '0');
      setDepositAmount(lease.depositAmount !== undefined ? String(lease.depositAmount) : '');
      setStartDate(lease.startDate ? lease.startDate.split('T')[0] : '');
      setEndDate(lease.endDate ? lease.endDate.split('T')[0] : '');
      setContractFileName(lease.contractFileName || '');
      setContractFileUrl(lease.contractFileUrl || '');
      setMoveInPhotos(lease.moveInPhotos || []);
    }
  }, [lease, isOpen]);

  if (!lease) return null;

  const totalRent = (Number(baseRent) || 0) + (Number(utilitiesAmount) || 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setContractFileName(file.name);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setContractFileUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveContract = () => {
    setContractFileName('');
    setContractFileUrl('');
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

  const associatedProperty = lease ? properties.find(p => p.id === lease.propertyId) : null;
  const isApartment = associatedProperty?.propertyType === 'apartment';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const bRent = Number(baseRent) || 0;
      const uAmount = isHotel ? 0 : (Number(utilitiesAmount) || 0);
      const totRent = bRent + uAmount;

      await updateLease(lease.id, {
        leaseType,
        tenantName,
        tenantEmail,
        tenantPhone,
        operatorCompany: isHotel ? operatorCompany : undefined,
        baseRent: isHotel ? 0 : bRent,
        utilitiesAmount: isHotel ? 0 : uAmount,
        rentAmount: isHotel ? 0 : totRent,
        depositAmount: isHotel ? 0 : (Number(depositAmount) || 0),
        startDate,
        endDate: endDate || undefined,
        contractFileName: contractFileName || '',
        contractFileUrl: contractFileUrl || '',
        moveInPhotos,
      });

      onClose();
    } finally {
      setLoading(false);
    }
  };

  const isCurrentlyActive = lease && (associatedProperty?.activeLeaseId === lease.id || lease.status === 'active') && getEffectiveLeaseStatus(lease) === 'active';

  const handleEndActiveLease = async () => {
    if (
      confirm(
        `Naozaj chcete ukončiť aktívny nájom pre nájomcu ${lease.tenantName}?\n\nNájomca a táto zmluva zostanú zachované v histórii zmlúv ako neaktívne a byt bude označený ako voľný.`
      )
    ) {
      setDeleteLoading(true);
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const newEndDate = lease.endDate && lease.endDate < todayStr ? lease.endDate : todayStr;
        await updateLease(lease.id, {
          status: 'expired',
          endDate: newEndDate,
        });
        if (associatedProperty) {
          await updateProperty(associatedProperty.id, {
            activeLeaseId: undefined,
            status: 'vacant',
            rentAmount: 0,
            baseRent: undefined,
            utilitiesAmount: undefined,
          });
        }
        showToast(`Nájomca ${lease.tenantName} bol presunutý do histórie zmlúv a byt je voľný.`);
        onClose();
      } finally {
        setDeleteLoading(false);
      }
    }
  };

  const handleDelete = async () => {
    if (confirm(`Naozaj chcete natrvalo vymazať nájomnú zmluvu pre nájomcu ${lease.tenantName}?`)) {
      setDeleteLoading(true);
      try {
        await deleteLease(lease.id);
        onClose();
      } finally {
        setDeleteLoading(false);
      }
    }
  };

  const inputClass = {
    inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
    input: 'text-xs text-slate-900 placeholder:text-slate-400',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isHotel ? 'Upraviť zmluvu operátora' : 'Upraviť nájomnú zmluvu'}
      subtitle={isHotel ? 'Upravte podmienky spolupráce s hotelovým operátorom' : 'Upravte podmienky zmluvy, nájomné alebo kontaktné údaje nájomcu'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Typ zmluvy — iba pre apartmány */}
        {isApartment && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Typ nájmu</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLeaseType('standard')}
                className={`p-2.5 rounded-lg border text-left transition flex items-center gap-2 ${
                  leaseType === 'standard'
                    ? 'border-slate-900 bg-white ring-1 ring-slate-900 shadow-xs'
                    : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                }`}
              >
                <Home className="w-4 h-4 shrink-0 text-slate-600" />
                <div>
                  <span className="text-xs font-bold block text-slate-900">Štandardný nájom</span>
                  <span className="text-[11px] text-slate-400">Klasická nájomná zmluva</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setLeaseType('hotel_operator')}
                className={`p-2.5 rounded-lg border text-left transition flex items-center gap-2 ${
                  leaseType === 'hotel_operator'
                    ? 'border-amber-600 bg-white ring-1 ring-amber-600 shadow-xs'
                    : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                }`}
              >
                <Hotel className="w-4 h-4 shrink-0 text-amber-600" />
                <div>
                  <span className="text-xs font-bold block text-slate-900">Hotelový operátor</span>
                  <span className="text-[11px] text-slate-400">Prevádzkar hotela, revenue share</span>
                </div>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              {isHotel ? 'Meno prevádzkovateľa' : 'Meno a priezvisko nájomcu'} <span className="text-rose-500">*</span>
            </label>
            <Input
              size="sm"
              variant="bordered"
              aria-label="Meno"
              placeholder={isHotel ? 'napr. Ing. Peter Kováč' : 'napr. Martin Horváth'}
              isRequired
              value={tenantName}
              onChange={e => setTenantName(e.target.value)}
              classNames={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              {isHotel ? 'Email prevádzkovateľa' : 'Email nájomcu'} <span className="text-rose-500">*</span>
            </label>
            <Input
              type="email"
              size="sm"
              variant="bordered"
              aria-label="Email"
              placeholder={isHotel ? 'prevadzkar@hotel.sk' : 'najomca@email.sk'}
              isRequired
              value={tenantEmail}
              onChange={e => setTenantEmail(e.target.value)}
              classNames={inputClass}
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
              classNames={inputClass}
            />
          </div>
          {isHotel ? (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Spoločnosť prevádzkovateľa
              </label>
              <Input
                size="sm"
                variant="bordered"
                aria-label="Spoločnosť"
                placeholder="napr. Hotel Grand s.r.o."
                value={operatorCompany}
                onChange={e => setOperatorCompany(e.target.value)}
                classNames={inputClass}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Výška kaucie / zábezpeky (€) <span className="text-rose-500">*</span>
              </label>
              <DecimalInput
                size="sm"
                variant="bordered"
                aria-label="Výška kaucie"
                placeholder="napr. 1500"
                isRequired
                value={depositAmount}
                onValueChange={val => setDepositAmount(val)}
                classNames={inputClass}
              />
            </div>
          )}
        </div>

        {/* Hotel info banner alebo Nájom a energie */}
        {isHotel ? (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
            <Building2 className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-900">Hotelový model — mesačné výnosy</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Príjem je evidovaný ako podiel z tržieb hotela. Mesačné výnosy sa zaznamenávajú v detaile apartmánu.
              </p>
            </div>
          </div>
        ) : (
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
                <DecimalInput
                  size="sm"
                  variant="bordered"
                  aria-label="Čistý nájom"
                  placeholder="napr. 600"
                  isRequired
                  value={baseRent}
                  onValueChange={val => setBaseRent(val)}
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
                <DecimalInput
                  size="sm"
                  variant="bordered"
                  aria-label="Energie a služby"
                  placeholder="napr. 150"
                  isRequired
                  value={utilitiesAmount}
                  onValueChange={val => setUtilitiesAmount(val)}
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
        )}

        <div className="grid grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              {isHotel ? 'Začiatok spolupráce' : 'Začiatok nájmu'} <span className="text-rose-500">*</span>
            </label>
            <Input
              type="date"
              size="sm"
              variant="bordered"
              aria-label="Začiatok"
              isRequired
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              classNames={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              {isHotel ? 'Koniec spolupráce' : 'Koniec nájmu'} {isHotel && <span className="text-slate-400 font-normal">(nepovinné)</span>}
              {!isHotel && <span className="text-rose-500">*</span>}
            </label>
            <Input
              type="date"
              size="sm"
              variant="bordered"
              aria-label="Koniec"
              isRequired={!isHotel}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              classNames={inputClass}
            />
          </div>
        </div>

        {/* Dokument zmluvy (Upload) */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-semibold text-slate-700">
            Dokument nájomnej zmluvy (PDF / DOCX / sken)
          </label>

          {contractFileName || contractFileUrl ? (
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-100/70 border border-emerald-200 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {contractFileName || 'Nájomná_Zmluva.pdf'}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> Priložený dokument
                    </span>
                    {contractFileUrl && (
                      <>
                        <span>•</span>
                        <a
                          href={contractFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          download={contractFileName || 'Zmluva.pdf'}
                          className="hover:text-slate-900 underline flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Stiahnuť
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <span className="inline-flex items-center text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 transition shadow-2xs">
                    Nahradiť
                  </span>
                </label>
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  onClick={handleRemoveContract}
                  className="min-w-7 w-7 h-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                  title="Odstrániť priložený dokument"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <label className="border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 transition rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer text-center group">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-slate-200/80 flex items-center justify-center text-slate-500 transition mb-1.5">
                <UploadCloud className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-800">
                Kliknite pre nahratie zmluvy
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                Podporované formáty: PDF, DOC, DOCX alebo sken (max. 10 MB)
              </span>
            </label>
          )}
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
              Zatiaľ neboli priložené žiadne fotografie pred začiatkom nájmu.
            </p>
          )}
        </div>

        <div className="pt-4 flex items-center justify-between gap-2 border-t border-slate-200">
          <div className="flex items-center gap-1.5">
            {isCurrentlyActive ? (
              <Button
                size="sm"
                color="danger"
                variant="flat"
                onClick={handleEndActiveLease}
                isLoading={deleteLoading}
                startContent={<UserMinus className="w-3.5 h-3.5" />}
                className="text-rose-600 font-medium text-xs rounded-lg"
                title="Presunie zmluvu do histórie ako neaktívnu a byt uvoľní"
              >
                Ukončiť nájom (do histórie)
              </Button>
            ) : (
              <Button
                size="sm"
                color="danger"
                variant="flat"
                onClick={handleDelete}
                isLoading={deleteLoading}
                startContent={<Trash2 className="w-3.5 h-3.5" />}
                className="text-rose-600 font-medium text-xs rounded-lg"
              >
                Vymazať zmluvu
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
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
        </div>
      </form>

      <ImageLightboxModal
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        photos={moveInPhotos}
        initialIndex={lightboxIndex || 0}
        title={`Stav pred začiatkom nájmu – ${tenantName || 'Zmluva'}`}
      />
    </Modal>
  );
};
