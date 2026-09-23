import React, { useState } from 'react';
import {
  X,
  Mail,
  Phone,
  Download,
  Plus,
  Trash2,
  Edit3,
} from 'lucide-react';
import { Property, InventoryItem } from '../../types';
import { useProperty } from '../../context/PropertyContext';
import { Badge } from '../common/Badge';
import { formatDate } from '../../utils/date';
import { AddInventoryModal } from '../inventory/AddInventoryModal';
import { DecimalInput } from '../common/DecimalInput';

interface PropertyDetailModalProps {
  property: Property | null;
  onClose: () => void;
  onOpenAddLease: (propertyId: string) => void;
  onOpenAddInventory: (propertyId: string) => void;
  onOpenAddExpense: (propertyId: string) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  onClose,
  onOpenAddLease,
  onOpenAddInventory,
  onOpenAddExpense,
}) => {
  const {
    leases,
    inventory,
    expenses,
    updateProperty,
    deleteProperty,
    deleteInventoryItem,
    deleteExpense,
  } = useProperty();

  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'leases' | 'expenses'>('overview');
  const [rentInput, setRentInput] = useState<string>(property?.rentAmount !== undefined ? String(property.rentAmount) : '0');
  const [statusInput, setStatusInput] = useState<string>(property?.status || 'vacant');
  const [editingInventoryItem, setEditingInventoryItem] = useState<InventoryItem | null>(null);

  if (!property) return null;

  const unitLeases = leases.filter(l => l.propertyId === property.id);
  const activeLease = unitLeases.find(l => l.id === property.activeLeaseId || l.status === 'active') || unitLeases[0];
  const unitInventory = inventory.filter(i => i.propertyId === property.id);
  const unitExpenses = expenses.filter(e => e.propertyId === property.id);
  const rentPerSqm = (property.sizeSqm ? (property.rentAmount / property.sizeSqm).toFixed(2) : '0.00');

  const handleSaveStatusAndRent = async () => {
    await updateProperty(property.id, {
      rentAmount: Number(rentInput) || 0,
      status: statusInput as any,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-2xl z-10 my-auto overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-100 text-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-slate-900">{property.name}</h3>
            <span className="text-xs font-medium text-slate-500">Byt {property.unitNumber}</span>
            <Badge variant={property.status} />
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 px-6 gap-6 text-xs font-medium bg-white">
          {[
            { id: 'overview', label: 'Prehľad' },
            { id: 'inventory', label: `Inventár (${unitInventory.length})` },
            { id: 'leases', label: `Zmluvy (${unitLeases.length})` },
            { id: 'expenses', label: `Výdavky (${unitExpenses.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Specs Grid */}
              <div className="grid grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-medium">Výmera</span>
                  <span className="text-sm font-bold text-slate-900">{property.sizeSqm} m²</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-medium">Izby</span>
                  <span className="text-sm font-bold text-slate-900">{property.bedrooms} {property.bedrooms === 1 ? 'izba' : property.bedrooms < 5 ? 'izby' : 'izieb'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-medium">Poschodie</span>
                  <span className="text-sm font-bold text-slate-900">{property.floor !== undefined ? `${property.floor}.` : '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-medium">Sadzba</span>
                  <span className="text-sm font-bold text-emerald-700">€{rentPerSqm}/m²</span>
                </div>
              </div>

              {/* Status & Rent Adjustment */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-medium">Stav:</span>
                  <select
                    value={statusInput}
                    onChange={e => setStatusInput(e.target.value)}
                    className="bg-white border border-slate-300 text-slate-800 rounded-md px-2.5 py-1 text-xs focus:outline-none capitalize"
                  >
                    <option value="occupied">Prenajatý</option>
                    <option value="vacant">Voľný</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-medium">Nájomné:</span>
                  <div className="relative w-28">
                    <DecimalInput
                      value={rentInput}
                      onValueChange={val => setRentInput(val)}
                      startContent={<span className="text-slate-400 text-xs">€</span>}
                      size="sm"
                      variant="bordered"
                      classNames={{
                        inputWrapper: 'bg-white border-slate-300 rounded-md h-8 shadow-2xs',
                        input: 'text-slate-900 font-semibold text-xs',
                      }}
                    />
                  </div>
                  <button
                    onClick={handleSaveStatusAndRent}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md transition text-xs shrink-0"
                  >
                    Uložiť
                  </button>
                </div>
              </div>

              {/* Tenant Section */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Aktívny nájomca
                </span>
                {activeLease ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">{activeLease.tenantName}</span>
                      <span className="text-slate-700 font-semibold">€{activeLease.rentAmount}/mes</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-600">
                      <a href={`mailto:${activeLease.tenantEmail}`} className="flex items-center gap-1.5 hover:text-slate-900 transition">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{activeLease.tenantEmail}</span>
                      </a>
                      <a href={`tel:${activeLease.tenantPhone}`} className="flex items-center gap-1.5 hover:text-slate-900 transition">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{activeLease.tenantPhone}</span>
                      </a>
                    </div>
                    <p className="text-slate-500 text-[11px] pt-1">
                      Platnosť zmluvy: {formatDate(activeLease.startDate)} &rarr; {formatDate(activeLease.endDate)}
                    </p>
                  </div>
                ) : (
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500">K tomuto bytu nie je priradená žiadna aktívna zmluva.</span>
                    <button
                      onClick={() => onOpenAddLease(property.id)}
                      className="text-slate-900 font-medium hover:underline"
                    >
                      + Pridať zmluvu
                    </button>
                  </div>
                )}
              </div>

              {/* Danger delete */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    if (confirm(`Naozaj chcete vymazať nehnuteľnosť ${property.name}?`)) {
                      deleteProperty(property.id);
                      onClose();
                    }
                  }}
                  className="text-rose-600 hover:text-rose-700 text-xs font-medium transition"
                >
                  Odstrániť nehnuteľnosť z portfólia
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: INVENTORY */}
          {activeTab === 'inventory' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600">Evidované spotrebiče a nábytok</span>
                <button
                  onClick={() => onOpenAddInventory(property.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Pridať položku</span>
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="linear-table">
                  <thead>
                    <tr>
                      <th>Položka</th>
                      <th>Kategória</th>
                      <th>Model</th>
                      <th>Cena</th>
                      <th>Záruka</th>
                      <th>Poznámka</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {unitInventory.map(item => (
                      <tr key={item.id}>
                        <td className="font-medium text-slate-900">{item.name}</td>
                        <td className="capitalize text-slate-500">{item.category}</td>
                        <td className="text-slate-500">{item.brandModel}</td>
                        <td className="text-slate-800 font-semibold">€{item.cost}</td>
                        <td className="text-slate-500">{item.warrantyExpiresAt || '—'}</td>
                        <td className="max-w-[180px]">
                          {item.notes ? (
                            <span className="text-slate-600 text-xs line-clamp-2 break-words leading-relaxed" title={item.notes}>
                              {item.notes}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingInventoryItem(item)}
                              className="text-slate-400 hover:text-slate-800 transition p-1"
                              title="Upraviť"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteInventoryItem(item.id)}
                              className="text-slate-400 hover:text-rose-600 transition p-1"
                              title="Vymazať"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {unitInventory.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-400">
                          Zatiaľ nie je evidovaný žiadny inventár.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: LEASE */}
          {activeTab === 'leases' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600">História a zmluvy</span>
                <button
                  onClick={() => onOpenAddLease(property.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Nová zmluva</span>
                </button>
              </div>

              <div className="space-y-2">
                {unitLeases.map(lease => (
                  <div key={lease.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{lease.tenantName}</span>
                      <Badge variant={lease.status} />
                    </div>
                    <div className="flex items-center justify-between text-slate-600 text-xs">
                      <span>Platnosť: {formatDate(lease.startDate)} &rarr; {formatDate(lease.endDate)}</span>
                      <span className="font-semibold text-slate-900">€{lease.rentAmount}/mes (Kaucia: €{lease.depositAmount})</span>
                    </div>
                    {lease.contractFileUrl && (
                      <div className="pt-1">
                        <a
                          href={lease.contractFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:underline flex items-center gap-1 text-xs font-medium"
                        >
                          <Download className="w-3 h-3" />
                          <span>{lease.contractFileName || 'Stiahnuť zmluvu (PDF)'}</span>
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: EXPENSES */}
          {activeTab === 'expenses' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600">Údržba, opravy a poplatky</span>
                <button
                  onClick={() => onOpenAddExpense(property.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Zaznamenať výdavok</span>
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="linear-table">
                  <thead>
                    <tr>
                      <th>Dátum</th>
                      <th>Popis</th>
                      <th>Kategória</th>
                      <th>Suma</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {unitExpenses.map(exp => (
                      <tr key={exp.id}>
                        <td className="text-slate-500">{exp.date}</td>
                        <td className="text-slate-900 font-medium">{exp.description}</td>
                        <td className="capitalize text-slate-500">{exp.category}</td>
                        <td className="text-rose-600 font-semibold">-€{exp.amount}</td>
                        <td className="text-right">
                          <button
                            onClick={() => deleteExpense(exp.id)}
                            className="text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {unitExpenses.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-400">
                          Zatiaľ nie sú evidované žiadne výdavky.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {editingInventoryItem && (
        <AddInventoryModal
          isOpen={Boolean(editingInventoryItem)}
          onClose={() => setEditingInventoryItem(null)}
          defaultPropertyId={property.id}
          itemToEdit={editingInventoryItem}
        />
      )}
    </div>
  );
};
