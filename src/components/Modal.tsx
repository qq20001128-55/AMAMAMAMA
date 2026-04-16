import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-4xl' }: ModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, type: 'spring', bounce: 0.3 }}
            className={`relative bg-[#fafafa] w-full ${maxWidth} max-h-[90vh] flex flex-col rounded-lg shadow-2xl border-2 border-[#53565b] overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-[#53565b]/20 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="text-xl font-bold tracking-widest text-[#53565b]">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-2 text-[#53565b] hover:bg-gray-200 hover:text-gray-900 rounded-full transition-colors"
                title="關閉"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
