import React, { useState, useEffect } from 'react';
import { Input, Select, SelectItem, Textarea, Progress, Button } from '@heroui/react';
import { Modal } from '../common/Modal';
import { useProperty } from '../../context/PropertyContext';
import { UploadCloud, File } from 'lucide-react';
import { DocumentCategory, VaultDocument } from '../../types';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  docToEdit?: VaultDocument | null;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ isOpen, onClose, docToEdit }) => {
  const { properties, leases, addDocument, updateDocument } = useProperty();

  const [file, setFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('tenancy');
  const [propertyId, setPropertyId] = useState<string>(properties[0]?.id || 'none');
  const [leaseId, setLeaseId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (docToEdit) {
        setDocName(docToEdit.name || '');
        setCategory(docToEdit.category || 'tenancy');
        setPropertyId(docToEdit.propertyId || 'none');
        setLeaseId(docToEdit.leaseId || '');
        setExpiryDate(docToEdit.expiryDate ? docToEdit.expiryDate.split('T')[0] : '');
        setNotes(docToEdit.notes || '');
        setFile(null);
      } else {
        setPropertyId(properties[0]?.id || 'none');
        setDocName('');
        setCategory('tenancy');
        setLeaseId('');
        setExpiryDate('');
        setNotes('');
        setFile(null);
      }
    }
  }, [isOpen, properties, docToEdit]);

  const handlePropertySelect = (pId: string) => {
    if (!pId || pId === 'none') {
      setPropertyId('none');
      setLeaseId('');
      return;
    }
    setPropertyId(pId);
    const relatedLease = leases.find(l => l.propertyId === pId && l.status === 'active');
    if (relatedLease) {
      setLeaseId(relatedLease.id);
      if (category === 'tenancy') {
        setExpiryDate(relatedLease.endDate);
      }
    } else {
      setLeaseId('');
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      setFile(selected);
      if (!docName) setDocName(selected.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!docName) setDocName(selected.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !docName) return;

    setIsUploading(true);
    setUploadProgress(20);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 25;
      });
    }, 150);

    setTimeout(async () => {
      clearInterval(interval);
      setUploadProgress(100);

      const fileSizeStr = file
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : docToEdit?.fileSize || '1.8 MB';

      if (docToEdit) {
        await updateDocument(docToEdit.id, {
          propertyId: propertyId && propertyId !== 'none' ? propertyId : undefined,
          leaseId: propertyId && propertyId !== 'none' ? (leaseId || undefined) : undefined,
          name: docName || docToEdit.name,
          category,
          fileSize: fileSizeStr,
          expiryDate: expiryDate || undefined,
          notes,
        });
      } else {
        await addDocument({
          propertyId: propertyId && propertyId !== 'none' ? propertyId : undefined,
          leaseId: propertyId && propertyId !== 'none' ? (leaseId || undefined) : undefined,
          name: docName || file?.name || 'Dokument',
          category,
          fileSize: fileSizeStr,
          expiryDate: expiryDate || undefined,
          fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          notes,
        });
      }

      setIsUploading(false);
      setUploadProgress(0);
      setFile(null);
      setDocName('');
      onClose();
    }, 800);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={docToEdit ? 'Upraviť dokument' : 'Nahrať dokument'}
      subtitle={docToEdit ? `Úprava parametrov a údajov dokumentu "${docToEdit.name}"` : 'Úložisko pre zmluvy, preberacie protokoly a faktúry'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Drag & Drop Upload Zone (optional if editing existing document) */}
        {!docToEdit && (
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-slate-200 hover:border-slate-300 bg-slate-50/50 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition relative"
          >
            <input
              type="file"
              onChange={handleFileInput}
              className="absolute inset-0 opacity-0 cursor-pointer"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            />
            <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
            {file ? (
              <div>
                <p className="font-semibold text-slate-900 flex items-center justify-center gap-1.5">
                  <File className="w-3.5 h-3.5 text-slate-600" />
                  {file.name}
                </p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • Pripravené na nahranie
                </p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-slate-700">Presuňte súbor sem, alebo kliknite pre výber</p>
                <p className="text-slate-400 text-[11px] mt-0.5">PDF, PNG, JPG, DOC do 25MB</p>
              </div>
            )}
          </div>
        )}

        {/* HeroUI Upload Progress Bar */}
        {isUploading && (
          <div className="space-y-1">
            <Progress
              size="sm"
              value={uploadProgress}
              color="primary"
              label="Ukladám súbor..."
              showValueLabel={true}
              classNames={{
                label: 'text-xs text-slate-600',
                value: 'text-xs font-semibold text-slate-900',
                indicator: 'bg-slate-900',
              }}
            />
          </div>
        )}

        {/* Document Title */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Názov dokumentu <span className="text-rose-500">*</span>
          </label>
          <Input
            size="sm"
            variant="bordered"
            aria-label="Názov dokumentu"
            placeholder="napr. Nájomná zmluva 2026 - Dodatok č. 1"
            isRequired
            value={docName}
            onChange={e => setDocName(e.target.value)}
            classNames={{
              inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
              input: 'text-xs text-slate-900 placeholder:text-slate-400',
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3.5">
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
              <SelectItem key="tenancy">Nájomná zmluva / Dodatok</SelectItem>
              <SelectItem key="inspection">Preberací protokol</SelectItem>
              <SelectItem key="invoice">Faktúra / Daňový doklad</SelectItem>
              <SelectItem key="other">Iný dokument / Certifikát</SelectItem>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Priradiť k bytu
            </label>
            <Select
              size="sm"
              variant="bordered"
              aria-label="Priradiť k bytu"
              selectedKeys={[propertyId || 'none']}
              onChange={e => handlePropertySelect(e.target.value)}
              onSelectionChange={keys => {
                const val = Array.from(keys)[0];
                handlePropertySelect(String(val || 'none'));
              }}
              classNames={{
                trigger: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 min-h-9 shadow-2xs',
                value: 'text-xs font-medium text-slate-900',
              }}
            >
              {[
                { id: 'none', label: '— Žiadnemu bytu (všeobecný dokument) —' },
                ...properties.map(p => ({ id: p.id, label: `${p.name} (č. ${p.unitNumber})` }))
              ].map(opt => (
                <SelectItem key={opt.id} textValue={opt.label}>
                  {opt.label}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Dátum konca platnosti
          </label>
          <Input
            type="date"
            size="sm"
            variant="bordered"
            aria-label="Dátum konca platnosti"
            value={expiryDate}
            onChange={e => setExpiryDate(e.target.value)}
            classNames={{
              inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-9 shadow-2xs',
              input: 'text-xs text-slate-900',
            }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Interné poznámky
          </label>
          <Textarea
            size="sm"
            variant="bordered"
            aria-label="Interné poznámky"
            minRows={2}
            placeholder="Podpísané oboma stranami, odovzdané kľúče..."
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
            isLoading={isUploading}
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg shadow-xs px-4"
          >
            {docToEdit ? 'Uložiť zmeny' : 'Nahrať dokument'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
