import React, { useState } from 'react';
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
} from 'lucide-react';
import { useProperty } from '../../context/PropertyContext';
import { VaultDocument, DocumentCategory } from '../../types';
import { DocumentUploadModal } from './DocumentUploadModal';
import { DocumentPreviewModal } from './DocumentPreviewModal';

export const DocumentVault: React.FC = () => {
  const { documents, deleteDocument } = useProperty();

  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | 'all'>('all');
  const [search, setSearch] = useState<string>('');
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [previewDoc, setPreviewDoc] = useState<VaultDocument | null>(null);

  const categoryLabels: Record<string, string> = {
    all: 'Všetko',
    tenancy: 'Zmluvy',
    inspection: 'Protokoly',
    invoice: 'Faktúry',
    other: 'Ostatné',
  };

  const filteredDocs = documents.filter(doc => {
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    const matchesSearch =
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      (doc.propertyName && doc.propertyName.toLowerCase().includes(search.toLowerCase()));

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
            onClick={() => setIsUploadOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs h-8 rounded-lg px-3 shadow-xs"
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
          <TableColumn key="actions">{''}</TableColumn>
        </TableHeader>
        <TableBody emptyContent="Nenašli sa žiadne dokumenty.">
          {filteredDocs.map(doc => (
            <TableRow key={doc.id}>
              <TableCell>
                <button
                  onClick={() => setPreviewDoc(doc)}
                  className="flex items-center gap-2 font-medium text-slate-900 hover:underline text-left"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{doc.name}</span>
                </button>
              </TableCell>
              <TableCell>
                <Chip size="sm" variant="flat" color="default" className="text-[11px]">
                  {categoryLabels[doc.category] || doc.category}
                </Chip>
              </TableCell>
              <TableCell className="text-slate-600">
                {doc.propertyName ? `${doc.propertyName} (${doc.propertyUnit})` : 'Celé portfólio'}
              </TableCell>
              <TableCell className="text-slate-500 text-[11px]">{doc.uploadDate}</TableCell>
              <TableCell className="text-slate-700 text-[11px] font-medium">{doc.expiryDate || '—'}</TableCell>
              <TableCell className="text-slate-500 text-[11px]">{doc.fileSize}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => setPreviewDoc(doc)}
                    className="min-w-7 w-7 h-7 text-slate-400 hover:text-slate-800"
                    title="Náhľad"
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
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Modals */}
      <DocumentUploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
      <DocumentPreviewModal document={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
};
