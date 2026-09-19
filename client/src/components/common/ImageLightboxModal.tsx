import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Download, ExternalLink } from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
  initialIndex?: number;
  title?: string;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  photos,
  initialIndex = 0,
  title = 'Fotografie',
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, photos.length - 1)));
    }
  }, [isOpen, initialIndex, photos.length]);

  const handlePrev = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : photos.length - 1));
  }, [photos.length]);

  const handleNext = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentIndex(prev => (prev < photos.length - 1 ? prev + 1 : 0));
  }, [photos.length]);

  const handleDownload = useCallback(() => {
    const currentPhoto = photos[currentIndex];
    if (!currentPhoto) return;
    const link = document.createElement('a');
    link.href = currentPhoto;
    link.download = `foto_${currentIndex + 1}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [photos, currentIndex]);

  const handleOpenExternal = useCallback(() => {
    const currentPhoto = photos[currentIndex];
    if (!currentPhoto) return;
    window.open(currentPhoto, '_blank');
  }, [photos, currentIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between bg-slate-950/95 backdrop-blur-md select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-900/60 border-b border-white/10 z-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h4 className="text-white text-sm font-semibold truncate tracking-tight">{title}</h4>
            <p className="text-slate-400 text-xs font-medium">
              Fotografia {currentIndex + 1} z {photos.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleDownload}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition"
            title="Stiahnuť fotografiu"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleOpenExternal}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition"
            title="Otvoriť v plnej veľkosti v novom okne"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-rose-600/80 rounded-lg transition ml-1"
            title="Zatvoriť (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Center Image View Area */}
      <div
        className="relative flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden"
        onClick={onClose}
      >
        {/* Left Arrow Button */}
        {photos.length > 1 && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-3 sm:left-6 z-20 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 hover:scale-105 transition shadow-lg"
            title="Predchádzajúca fotka (Šípka doľava)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Current Photo */}
        <div
          className="relative max-h-[75vh] sm:max-h-[80vh] max-w-[92vw] flex items-center justify-center"
          onClick={e => e.stopPropagation()}
        >
          <img
            src={currentPhoto}
            alt={`${title} - ${currentIndex + 1}`}
            className="max-h-[75vh] sm:max-h-[80vh] max-w-[92vw] object-contain rounded-lg shadow-2xl transition-all duration-150"
          />
        </div>

        {/* Right Arrow Button */}
        {photos.length > 1 && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-3 sm:right-6 z-20 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 hover:scale-105 transition shadow-lg"
            title="Ďalšia fotka (Šípka doprava)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {photos.length > 1 && (
        <div
          className="px-4 py-3 bg-slate-900/60 border-t border-white/10 flex items-center justify-center gap-2 overflow-x-auto max-w-full z-10"
          onClick={e => e.stopPropagation()}
        >
          {photos.map((thumb, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`relative shrink-0 w-12 h-10 sm:w-14 sm:h-12 rounded-md overflow-hidden transition-all duration-150 border-2 ${
                currentIndex === idx
                  ? 'border-emerald-500 ring-2 ring-emerald-500/40 scale-105 opacity-100'
                  : 'border-transparent opacity-50 hover:opacity-85'
              }`}
            >
              <img
                src={thumb}
                alt={`Náhľad ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
