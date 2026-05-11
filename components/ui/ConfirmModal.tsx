"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmModal({ 
  isOpen, onClose, onConfirm, title, message, 
  confirmText = "Confirmar", cancelText = "Cancelar" 
}: ConfirmModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:hidden">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="p-3 bg-amber-50 rounded-full">
            <AlertTriangle className="w-12 h-12 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-2 whitespace-pre-line">{message}</p>
          </div>
          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={onClose}
              className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-xl transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-xl transition-colors"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
