import React, { useState } from 'react';
import { Button, Input, Textarea, Progress } from '@heroui/react';
import { Modal } from '../common/Modal';
import { DecimalInput } from '../common/DecimalInput';
import { useProperty } from '../../context/PropertyContext';
import { UploadCloud, FileText, CheckCircle2, DollarSign, Calendar, File } from 'lucide-react';
import { compressImage } from '../../utils/imageCompressor';

interface UploadHotelInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  leaseId?: string;
  propertyName: string;
  operatorName?: string;
}

export const UploadHotelInvoiceModal: React.FC<UploadHotelInvoiceModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  leaseId,
  propertyName,
  operatorName = 'APLEND Hotel Services s.r.o.',
}) => {
  const { addDocument, addHotelRevenue, showToast } = useProperty();

  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const [docName, setDocName] = useState<string>('');
  const [billingMonth, setBillingMonth] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().substring(0, 7); // Previous month YYYY-MM
  });
  const [revenueAmount, setRevenueAmount] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleFileSelect = (file: globalThis.File) => {
    setSelectedFile(file);
    if (!docName) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      setDocName(cleanName);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setDocName('');
    setRevenueAmount('');
    setInvoiceNumber('');
    setNotes('');
    setIsUploading(false);
    setUploadProgress(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !docName) {
      showToast('Vyberte súbor faktúry na nahratie', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(25);

    try {
      let fileDataUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
      let fileSizeStr = '350 KB';

      if (selectedFile) {
        fileSizeStr =
          selectedFile.size > 1024 * 1024
            ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(selectedFile.size / 1024)} KB`;

        // If image, compress; if PDF/other, read as base64 data URL
        if (selectedFile.type.startsWith('image/')) {
          setUploadProgress(45);
          fileDataUrl = await compressImage(selectedFile);
        } else {
          setUploadProgress(50);
          fileDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(selectedFile);
          });
        }
      }

      setUploadProgress(75);

      const fullNotes = [
        invoiceNumber ? `Číslo faktúry: ${invoiceNumber}` : '',
        billingMonth ? `Mesiac: ${billingMonth}` : '',
        revenueAmount ? `Suma: €${revenueAmount}` : '',
        notes ? `Poznámka: ${notes}` : '',
      ]
        .filter(Boolean)
        .join(' • ');

      // 1. Save document to Vault
      await addDocument({
        propertyId,
        leaseId,
        name: docName || selectedFile?.name || `Faktúra od hotela (${billingMonth})`,
        category: 'invoice',
        fileSize: fileSizeStr,
        fileUrl: fileDataUrl,
        notes: fullNotes || `Faktúra a mesačné vyúčtovanie od ${operatorName}`,
        uploadDate: new Date().toISOString().split('T')[0],
      });

      // 2. If user provided a revenue amount and billing month, also record it into Hotel Revenue
      if (revenueAmount && billingMonth && !isNaN(Number(revenueAmount)) && Number(revenueAmount) > 0 && leaseId) {
        try {
          await addHotelRevenue({
            propertyId,
            leaseId,
            month: billingMonth,
            revenueAmount: Number(revenueAmount),
            notes: invoiceNumber ? `Faktúra č. ${invoiceNumber}` : `Nahratá faktúra: ${docName}`,
          });
        } catch (revErr) {
          console.warn('Could not auto-create hotel revenue from invoice:', revErr);
        }
      }

      setUploadProgress(100);
      showToast(`Faktúra "${docName || 'od hotela'}" bola úspešne nahraná.`);
      handleReset();
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast('Nastala chyba pri nahrávaní faktúry', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Nahrať faktúru od hotelového operátora"
      subtitle={`${propertyName} • ${operatorName}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Dropzone */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
            selectedFile
              ? 'border-emerald-400 bg-emerald-50/30'
              : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/20'
          }`}
          onClick={() => {
            const el = document.getElementById('hotel-invoice-file-input');
            if (el) el.click();
          }}
        >
          <input
            id="hotel-invoice-file-input"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
            className="hidden"
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />

          {selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800 text-xs truncate max-w-xs">{selectedFile.name}</p>
                <p className="text-[11px] text-slate-500">
                  {selectedFile.size > 1024 * 1024
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                    : `${Math.round(selectedFile.size / 1024)} KB`}{' '}
                  • Kliknite pre výmenu súboru
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-xs">
                  Sem pretiahnite faktúru alebo <span className="text-blue-600 underline">vyberte z počítača</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Podporované formáty: PDF, JPG, PNG, DOCX</p>
              </div>
            </div>
          )}
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Názov dokladu / faktúry *
            </label>
            <Input
              size="sm"
              variant="bordered"
              placeholder="napr. Vyúčtovanie a faktúra – Júl 2026"
              value={docName}
              onChange={e => setDocName(e.target.value)}
              required
              startContent={<FileText className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Mesiac vyúčtovania
              </label>
              <Input
                size="sm"
                type="month"
                variant="bordered"
                value={billingMonth}
                onChange={e => setBillingMonth(e.target.value)}
                startContent={<Calendar className="w-4 h-4 text-slate-400" />}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Fakturovaná suma výnosu (€)
              </label>
              <DecimalInput
                size="sm"
                variant="bordered"
                placeholder="napr. 1520"
                value={revenueAmount}
                onValueChange={val => setRevenueAmount(val)}
                startContent={<DollarSign className="w-4 h-4 text-slate-400" />}
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Voliteľné (automaticky zaeviduje aj výnos)
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Číslo faktúry / Variabilný symbol
            </label>
            <Input
              size="sm"
              variant="bordered"
              placeholder="napr. FA-20260712"
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Doplňujúca poznámka
            </label>
            <Textarea
              size="sm"
              variant="bordered"
              rows={2}
              placeholder="napr. Vyúčtovanie po letnej sezóne vrátane rozpisu upratovania..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {isUploading && (
          <div className="space-y-1.5 py-1">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Nahrávam a ukladám faktúru...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} color="primary" size="sm" className="h-1.5" />
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            size="sm"
            variant="flat"
            onPress={() => {
              handleReset();
              onClose();
            }}
            isDisabled={isUploading}
            className="text-xs"
          >
            Zrušiť
          </Button>
          <Button
            size="sm"
            type="submit"
            color="primary"
            isLoading={isUploading}
            startContent={!isUploading && <UploadCloud className="w-4 h-4" />}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
          >
            Nahrať a uložiť faktúru
          </Button>
        </div>
      </form>
    </Modal>
  );
};
