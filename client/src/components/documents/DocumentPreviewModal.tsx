import React from 'react';
import { Button, Chip } from '@heroui/react';
import { Modal } from '../common/Modal';
import { VaultDocument } from '../../types';
import { FileText, Download, ShieldCheck, AlertTriangle, ExternalLink } from 'lucide-react';
import { useProperty } from '../../context/PropertyContext';
import { openLeasePdfWindow } from '../../utils/contractPdf';

interface DocumentPreviewModalProps {
  document: VaultDocument | null;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  onClose,
}) => {
  const { leases, properties } = useProperty();
  if (!document) return null;

  const now = new Date();
  let isExpiringSoon = false;
  let isExpired = false;
  if (document.expiryDate) {
    const exp = new Date(document.expiryDate);
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) isExpired = true;
    else if (diffDays <= 45) isExpiringSoon = true;
  }

  return (
    <Modal
      isOpen={!!document}
      onClose={onClose}
      title={document.name}
      subtitle={`Kategória: ${document.category.toUpperCase()} • Veľkosť: ${document.fileSize}`}
      maxWidth="2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Expiry Warning Banner */}
        {isExpiringSoon && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Upozornenie na koniec platnosti:</strong> Platnosť zmluvy končí {document.expiryDate} (o menej ako 45 dní). Odporúčame pripraviť predĺženie.
            </span>
          </div>
        )}

        {isExpired && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Platnosť skončila:</strong> Platnosť tohto dokumentu vypršala dňa {document.expiryDate}.
            </span>
          </div>
        )}

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Nahrané</span>
            <span className="font-medium text-slate-800">{document.uploadDate}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Platnosť do</span>
            <span className="font-medium text-slate-800">{document.expiryDate || 'Neobmedzená'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Nehnuteľnosť</span>
            <span className="font-medium text-slate-800">{document.propertyName || 'Všeobecné'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Integrita</span>
            <span className="text-emerald-700 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3 h-3" /> Overené
            </span>
          </div>
        </div>

        {/* Document Canvas */}
        <div className="border border-slate-200 rounded-xl bg-slate-50/50 p-6 flex flex-col items-center justify-center min-h-[220px] text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-slate-700">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">{document.name}</h4>
            <p className="text-slate-500 text-[11px] max-w-sm mt-1">
              {document.notes || 'Dokument je bezpečne uložený v šifrovanom trezore RESR, s.r.o.'}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button
              size="sm"
              variant="flat"
              onPress={() => {
                if (document.leaseId) {
                  const lease = leases.find(l => l.id === document.leaseId);
                  const prop = properties.find(p => p.id === (document.propertyId || lease?.propertyId));
                  if (lease) {
                    openLeasePdfWindow(lease, prop);
                    return;
                  }
                }
                if (document.fileUrl) {
                  window.open(document.fileUrl, '_blank');
                }
              }}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
              startContent={<ExternalLink className="w-3.5 h-3.5" />}
            >
              Otvoriť PDF v novom okne
            </Button>
            <Button
              as="a"
              href={document.fileUrl}
              download
              size="sm"
              className="bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-xs"
              startContent={<Download className="w-3.5 h-3.5" />}
            >
              Stiahnuť
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
