import React from 'react';
import { Button, Chip } from '@heroui/react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { Database, RefreshCw } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    isBackendConnected,
    dbBackendInfo,
    toggleDemoMode,
    refreshBackendStatus,
  } = useAuth();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stav systému a databázy"
      subtitle="Stav databázy a pripojenia systému RESR"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* TAB 1: SYSTEM & DATABASE STATUS */}
        <div className="space-y-3 pt-1">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium flex items-center gap-1.5 text-xs">
                <Database className="w-4 h-4 text-emerald-600" />
                Databázový server
              </span>
              <Chip
                size="sm"
                variant="flat"
                color={isBackendConnected ? 'success' : 'warning'}
                className="text-[11px] font-medium"
              >
                {isBackendConnected ? (dbBackendInfo || 'Pripojené') : 'Lokálny režim offline'}
              </Chip>
            </div>

            <div className="text-[11px] text-slate-600 space-y-1 pt-2 border-t border-slate-200">
              <p>Poskytovateľ: Supabase Cloud (PostgreSQL 15)</p>
              <p>Projekt: jjplixpjdyefibboerlq</p>
              <p>Stav: {isBackendConnected ? 'Aktívne online (Dáta sa ukladajú v cloude)' : 'Lokálna vyrovnávacia pamäť'}</p>
              <p>Režim: Samostatný správca (Single-Tenant)</p>
            </div>
          </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                size="sm"
                variant="flat"
                onClick={toggleDemoMode}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-lg"
              >
                Obnoviť dáta portfólia
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                onClick={() => refreshBackendStatus()}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg min-w-8 w-8 h-8"
                title="Overiť pripojenie k DB"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

        <div className="pt-3 flex justify-end border-t border-slate-200">
          <Button
            size="sm"
            variant="flat"
            onClick={onClose}
            className="text-xs font-medium text-slate-700 rounded-lg"
          >
            Zavrieť
          </Button>
        </div>
      </div>
    </Modal>
  );
};
