import React from 'react';
import { useProperty } from '../../context/PropertyContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useProperty();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const icon = {
          success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
          error: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />,
          info: <Info className="w-4 h-4 text-blue-600 shrink-0" />,
        }[toast.type];

        const borderColor = {
          success: 'border-emerald-200 bg-white text-emerald-900 shadow-md',
          error: 'border-rose-200 bg-white text-rose-900 shadow-md',
          info: 'border-blue-200 bg-white text-blue-900 shadow-md',
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-lg border shadow-lg transition-all animate-in slide-in-from-bottom-2 ${borderColor}`}
          >
            <div className="flex items-center gap-3">
              {icon}
              <p className="text-xs sm:text-sm font-medium text-slate-800">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
