"use client";

import { AlertTriangle, XCircle, Info, CheckCircle2 } from "lucide-react";
import { useEffect } from "react";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: "error" | "warning" | "info" | "success";
}

export function AlertModal({ isOpen, onClose, title, message, type = "error" }: AlertModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen) return null;

  const icons = {
    error: <XCircle className="w-12 h-12 text-red-500" />,
    warning: <AlertTriangle className="w-12 h-12 text-amber-500" />,
    info: <Info className="w-12 h-12 text-blue-500" />,
    success: <CheckCircle2 className="w-12 h-12 text-green-500" />
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:hidden">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center gap-4">
          <div className={`p-3 rounded-full ${
            type === "error" ? "bg-red-50" : 
            type === "warning" ? "bg-amber-50" : 
            type === "info" ? "bg-blue-50" : "bg-green-50"
          }`}>
            {icons[type]}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-2">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="mt-2 w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 rounded-xl transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
