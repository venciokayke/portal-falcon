"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

type OpenShiftEmployee = {
  id: string;
  name: string;
  count: number;
};

export default function CollapsibleOpenShifts({ employees }: { employees: OpenShiftEmployee[] }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-amber-50 border border-amber-200 border-l-4 border-l-amber-500 rounded-xl flex flex-col shadow-sm overflow-hidden">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-amber-100/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-amber-900 text-sm">
              Plantões em aberto precisam de fechamento
            </h3>
            <p className="text-amber-700 text-xs mt-0.5">Turnos com entrada registrada mas sem horário de saída ({employees.length} pendências).</p>
          </div>
        </div>
        <button className="text-amber-700 hover:text-amber-900 p-1">
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>
      
      {isOpen && (
        <div className="flex flex-col gap-2 p-4 pt-0 border-t border-amber-200/50 mt-2">
          {employees.map(emp => (
            <Link
              key={emp.id}
              href={`/ponto/${emp.id}`}
              className="flex items-center justify-between px-4 py-2.5 bg-white/60 border border-amber-200 border-l-4 border-l-amber-400 rounded-r-lg hover:bg-white transition-colors group"
            >
              <span className="font-medium text-slate-800 text-sm">{emp.name}</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-yellow-200 text-yellow-900 rounded-full">
                {emp.count} turno(s) em aberto →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
