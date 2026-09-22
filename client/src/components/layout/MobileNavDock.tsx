import React from 'react';
import { LayoutDashboard, Home, FileText, TrendingUp, BarChart3 } from 'lucide-react';

interface MobileNavDockProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenQuickAction?: () => void;
}

export const MobileNavDock: React.FC<MobileNavDockProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const items = [
    { id: 'dashboard', label: 'Prehľad', icon: LayoutDashboard },
    { id: 'properties', label: 'Byty', icon: Home },
    { id: 'documents', label: 'Zmluvy', icon: FileText },
    { id: 'analytics', label: 'Analytika', icon: BarChart3 },
    { id: 'market', label: 'Trh', icon: TrendingUp },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 pb-safe shadow-lg">
      <div className="flex items-center justify-around relative">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition-all ${
                isActive ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[11px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
