import React from 'react';
import { Search, Plus, RefreshCw, LogOut } from 'lucide-react';
import { Button, Input, Chip } from '@heroui/react';
import { useProperty } from '../../context/PropertyContext';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  activeTab: string;
  onOpenAddProperty: () => void;
  onOpenAddExpense: () => void;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenAddProperty,
  onOpenAuth,
}) => {
  const { searchQuery, setSearchQuery, refreshData, loading } = useProperty();
  const { logout, user } = useAuth();
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      setIsScrolled(scrollY > 5);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

  const titles: Record<string, string> = {
    dashboard: 'Prehľad portfólia',
    analytics: 'Analytika a cash flow',
    properties: 'Nehnuteľnosti a byty',
    documents: 'Dokumenty a zmluvy',
    market: 'Trhové porovnanie nájomného s Nehnutelnosti.sk',
  };

  return (
    <header
      className={`sticky top-0 z-30 bg-[#fcfdfd]/95 backdrop-blur-md border-b border-slate-200/80 transition-all duration-150 px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-4 ${
        isScrolled ? 'shadow-xs' : ''
      }`}
    >
      {/* Page Title */}
      <h2 className="text-sm sm:text-base lg:text-lg font-bold text-slate-800 tracking-tight shrink-0">
        {titles[activeTab] || 'Portfólio'}
      </h2>

      {/* Center Search */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <Input
          size="sm"
          variant="bordered"
          placeholder="Hľadať nehnuteľnosti, nájomcov..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          startContent={<Search className="w-4 h-4 text-slate-400 shrink-0" />}
          classNames={{
            input: 'text-sm text-slate-800 placeholder:text-slate-400 font-normal',
            inputWrapper:
              'h-9 min-h-9 bg-slate-50/80 border-slate-200 hover:border-slate-300 focus-within:!border-slate-400 rounded-lg shadow-2xs',
          }}
        />
      </div>

      {/* Right Tools */}
      <div className="flex items-center gap-2.5">
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onClick={() => refreshData()}
          aria-label="Obnoviť údaje"
          title="Obnoviť údaje"
          className="text-slate-500 hover:text-slate-800 min-w-9 w-9 h-9 rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
        </Button>

        <Button
          size="sm"
          onClick={onOpenAddProperty}
          startContent={<Plus className="w-4 h-4" />}
          className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-xs h-9 rounded-lg px-3.5"
        >
          Pridať nehnuteľnosť
        </Button>

        <Button
          size="sm"
          variant="light"
          onClick={() => {
            if (window.confirm('Naozaj sa chcete odhlásiť zo systému?')) {
              logout();
            }
          }}
          startContent={<LogOut className="w-4 h-4 text-slate-500 group-hover:text-rose-600 transition-colors" />}
          className="group text-slate-600 hover:text-rose-600 hover:bg-rose-50 font-medium text-xs h-9 rounded-lg px-3 border border-slate-200/80 hover:border-rose-200 transition-colors"
          title="Odhlásiť sa zo systému"
        >
          Odhlásiť sa
        </Button>
      </div>
    </header>
  );
};
