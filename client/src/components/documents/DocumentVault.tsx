import React, { useState, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Input,
  Button,
  Chip,
} from '@heroui/react';
import {
  FileText,
  Search,
  Plus,
  Download,
  Eye,
  Trash2,
  FileCheck2,
  Edit3,
} from 'lucide-react';
import { useProperty } from '../../context/PropertyContext';
import { VaultDocument, DocumentCategory, Lease } from '../../types';
import { formatDate } from '../../utils/date';
import { openLeasePdfWindow } from '../../utils/contractPdf';
import { DocumentUploadModal } from './DocumentUploadModal';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { EditLeaseModal } from '../properties/EditLeaseModal';

export const DocumentVault: React.FC = () => {
  const { documents, leases, properties, deleteDocument } = useProperty();

  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | 'all'>('all');
  const [search, setSearch] = useState<string>('');
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [editingDoc, setEditingDoc] = useState<VaultDocument | null>(null);
  const [editingLease, setEditingLease] = useState<Lease | null>(null);
  const [previewDoc, setPreviewDoc] = useState<VaultDocument | null>(null);

  const handleOpenDocument = (doc: VaultDocument) => {
    // If it's a lease agreement, open full authentic printable PDF view
    if (doc.leaseId) {
      const lease = leases.find(l => l.id === doc.leaseId);
      const prop = properties.find(p => p.id === (doc.propertyId || lease?.propertyId));
      if (lease) {
        openLeasePdfWindow(lease, prop);
        return;
      }
    }

    // Default open in new tab
    if (doc.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    }
  };

  const categoryLabels: Record<string, string> = {
    all: 'Všetko',
    tenancy: 'Zmluvy',
    inspection: 'Protokoly',
    invoice: 'Faktúry',
    other: 'Ostatné',
  };

  // Merge uploaded documents with active & historical leases
  const allVaultDocuments = useMemo(() => {
    // Convert leases into virtual vault documents
    const leaseDocuments: VaultDocument[] = leases.map(lease => ({
      id: `lease_doc_${lease.id}`,
      userId: lease.userId,
      propertyId: lease.propertyId,
      leaseId: lease.id,
      name: lease.contractFileName || `Nájomná zmluva – ${lease.tenantName}`,
      category: 'tenancy',
      fileSize: '1.4 MB',
      uploadDate: formatDate(lease.startDate || lease.createdAt || new Date().toISOString()),
      expiryDate: lease.endDate ? formatDate(lease.endDate) : undefined,
      fileUrl: lease.contractFileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      notes: `Zmluva s nájomcom ${lease.tenantName} (${lease.tenantEmail || ''})`,
      propertyName: lease.propertyName || 'Nehnuteľnosť',
      propertyUnit: lease.propertyUnit || '',
      tenantName: lease.tenantName,
    }));

    // Avoid duplicates if a document already references this leaseId
    const existingLeaseIds = new Set(documents.filter(d => d.leaseId).map(d => d.leaseId));
    const nonDuplicateLeaseDocs = leaseDocuments.filter(ld => !existingLeaseIds.has(ld.leaseId));

    return [...documents, ...nonDuplicateLeaseDocs];
  }, [documents, leases]);

  const filteredDocs = allVaultDocuments.filter(doc => {
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    const matchesSearch =
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      (doc.propertyName && doc.propertyName.toLowerCase().includes(search.toLowerCase())) ||
      (doc.tenantName && doc.tenantName.toLowerCase().includes(search.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Input
            size="sm"
            variant="bordered"
            placeholder="Hľadať dokumenty..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            startContent={<Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
            classNames={{
              input: 'text-xs text-slate-800 placeholder:text-slate-400',
              inputWrapper:
                'h-8 min-h-8 bg-white border-slate-200 hover:border-slate-300 focus-within:!border-slate-400 rounded-lg shadow-xs',
            }}
          />
        </div>

        {/* Filters & Upload Action */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100/90 border border-slate-200/80 rounded-lg p-0.5">
            {(['all', 'tenancy', 'inspection', 'invoice'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 text-xs rounded-md transition ${
                  categoryFilter === cat
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            color="primary"
            onClick={() => setIsUploadOpen(true)}
            className="font-medium text-xs h-8 rounded-lg px-3 shadow-xs"
            startContent={<Plus className="w-3.5 h-3.5" />}
          >
            Nahrať dokument
          </Button>
        </div>
      </div>

      {/* HeroUI Document Table */}
      <Table
        aria-label="Dokumenty a zmluvy"
        shadow="none"
        classNames={{
          base: 'border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs',
          table: 'min-w-full',
          thead: '[&>tr]:first:rounded-none',
          th: 'bg-slate-50/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider py-3 px-4 border-b border-slate-200',
          td: 'py-3 px-4 text-xs border-b border-slate-100 last:border-0',
          tr: 'hover:bg-slate-50/70 transition-colors',
        }}
      >
        <TableHeader>
          <TableColumn key="doc">DOKUMENT</TableColumn>
          <TableColumn key="cat">KATEGÓRIA</TableColumn>
          <TableColumn key="property">PRIRADENÝ BYT</TableColumn>
          <TableColumn key="uploaded">NAHRANÉ</TableColumn>
          <TableColumn key="expiry">PLATNOSŤ DO</TableColumn>
          <TableColumn key="size">VEĽKOSŤ</TableColumn>
          <TableColumn key="notes">POZNÁMKA</TableColumn>
          <TableColumn key="actions">{''}</TableColumn>
        </TableHeader>
        <TableBody emptyContent="Nenašli sa žiadne dokumenty.">
          {filteredDocs.map(doc => (
            <TableRow key={doc.id}>
              <TableCell>
                <button
                  type="button"
                  onClick={() => handleOpenDocument(doc)}
                  className="flex items-center gap-2 font-medium text-slate-900 hover:text-emerald-700 hover:underline text-left group cursor-pointer"
                  title="Kliknutím otvoriť v novom okne (PDF)"
                >
                  {doc.leaseId ? (
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-emerald-600 transition-colors" />
                  )}
                  <span className="group-hover:text-emerald-700 transition-colors">{doc.name}</span>
                </button>
              </TableCell>
              <TableCell>
                <Chip
                  size="sm"
                  variant="flat"
                  className={`text-[11px] ${
                    doc.category === 'tenancy'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {categoryLabels[doc.category] || doc.category}
                </Chip>
              </TableCell>
              <TableCell className="text-slate-600">
                {doc.propertyName ? `${doc.propertyName} (${doc.propertyUnit})` : 'Celé portfólio'}
              </TableCell>
              <TableCell className="text-slate-500 text-[11px]">{doc.uploadDate}</TableCell>
              <TableCell className="text-slate-700 text-[11px] font-medium">{doc.expiryDate || '—'}</TableCell>
              <TableCell className="text-slate-500 text-[11px]">{doc.fileSize}</TableCell>
              <TableCell className="max-w-[200px] sm:max-w-[260px]">
                {doc.notes ? (
                  <span className="text-slate-600 text-xs line-clamp-2 break-words leading-relaxed" title={doc.notes}>
                    {doc.notes}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => handleOpenDocument(doc)}
                    className="min-w-7 w-7 h-7 text-slate-400 hover:text-slate-800"
                    title="Otvoriť v prehliadači (PDF)"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <a
                    href={doc.fileUrl}
                    download
                    className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md inline-flex items-center justify-center transition"
                    title="Stiahnuť súbor"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  {doc.id.startsWith('lease_doc_') ? (
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => {
                        const targetLease = leases.find(l => l.id === doc.leaseId);
                        if (targetLease) setEditingLease(targetLease);
                      }}
                      className="min-w-7 w-7 h-7 text-slate-400 hover:text-slate-900"
                      title="Upraviť zmluvu"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => setEditingDoc(doc)}
                        className="min-w-7 w-7 h-7 text-slate-400 hover:text-slate-900"
                        title="Upraviť dokument"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => {
                          if (confirm(`Naozaj chcete vymazať dokument ${doc.name}?`)) {
                            deleteDocument(doc.id);
                          }
                        }}
                        className="min-w-7 w-7 h-7 text-slate-400 hover:text-rose-600"
                        title="Zmazať"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Modals */}
      <DocumentUploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
      {editingDoc && (
        <DocumentUploadModal
          isOpen={Boolean(editingDoc)}
          onClose={() => setEditingDoc(null)}
          docToEdit={editingDoc}
        />
      )}
      {editingLease && (
        <EditLeaseModal
          isOpen={Boolean(editingLease)}
          onClose={() => setEditingLease(null)}
          lease={editingLease}
        />
      )}
      <DocumentPreviewModal document={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
};
