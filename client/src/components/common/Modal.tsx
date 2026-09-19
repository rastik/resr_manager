import React from 'react';
import {
  Modal as HeroModal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from '@heroui/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
}) => {
  const sizeMap: Record<string, 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl'> = {
    sm: 'sm',
    md: 'md',
    lg: 'lg',
    xl: 'xl',
    '2xl': '2xl',
    '4xl': '4xl',
  };

  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size={sizeMap[maxWidth] || 'lg'}
      scrollBehavior="inside"
      backdrop="blur"
      placement="center"
      classNames={{
        base: 'border border-slate-200/90 bg-white text-slate-900 shadow-2xl rounded-2xl max-h-[92vh] overflow-hidden flex flex-col my-auto',
        header: 'border-b border-slate-100 bg-slate-50/80 py-3.5 px-6 flex flex-col items-start gap-0.5 rounded-t-2xl shrink-0',
        body: 'p-6 pb-7 text-slate-700 overflow-y-auto rounded-b-2xl',
        closeButton: 'hover:bg-slate-100 text-slate-400 hover:text-slate-700 active:bg-slate-200 top-3.5 right-4 z-20',
      }}
    >
      <ModalContent className="rounded-2xl overflow-hidden">
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-0.5 rounded-t-2xl">
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500 font-normal">{subtitle}</p>}
            </ModalHeader>
            <ModalBody className="p-6 pb-7 text-slate-700 overflow-y-auto rounded-b-2xl">
              {children}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </HeroModal>
  );
};
