"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { addEmployee, updateEmployee } from "@/actions/employee";

export default function EmployeeFormModal({ 
  employee, 
  trigger 
}: { 
  employee?: any, 
  trigger?: React.ReactNode 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [workSchedule, setWorkSchedule] = useState(employee?.workSchedule || "FIXED_220");
  const [contractType, setContractType] = useState(employee?.contractType || "CLT");
  const [registrationCompany, setRegistrationCompany] = useState(employee?.registrationCompany || "NAO_REGISTRADO");
  const [activeTab, setActiveTab] = useState<"base" | "financial">("base");
  const [receivesIntervalHour, setReceivesIntervalHour] = useState<boolean>(employee?.receivesIntervalHour || false);
  const [receivesNightHazard, setReceivesNightHazard] = useState<boolean>(employee?.receivesNightHazard || false);

  const handleContractChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setContractType(value);
    if (value === "HORISTA" || value === "PJ_HORISTA" || value === "PJ_FIXO") {
      setWorkSchedule("CUSTOM");
      setReceivesIntervalHour(false);
      setReceivesNightHazard(false);
    } else if (value === "CLT" && workSchedule === "CUSTOM") {
      setWorkSchedule("FIXED_220");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (employee) {
      await updateEmployee(employee.id, formData);
    } else {
      await addEmployee(formData);
    }
    
    setIsOpen(false);
    if (!employee) {
      setActiveTab("base");
      setWorkSchedule("FIXED_220");
      setContractType("CLT");
      setRegistrationCompany("NAO_REGISTRADO");
      setReceivesIntervalHour(false);
      setReceivesNightHazard(false);
    }
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="inline-block cursor-pointer">
        {trigger || (
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
            <Plus className="h-5 w-5" />
            Novo Colaborador
          </button>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200 cursor-default">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                {employee ? "Editar Colaborador" : "Cadastrar Colaborador"}
              </h2>
              <button type="button" onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-md transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex border-b border-gray-200">
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'base' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('base')}
              >
                Dados Base
              </button>
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'financial' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('financial')}
              >
                Dados Financeiros
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
              <div className={activeTab === 'base' ? 'block' : 'hidden'}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                    <input required name="name" defaultValue={employee?.name} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" placeholder="Ex: João da Silva" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lotação</label>
                    <input name="workLocation" defaultValue={employee?.workLocation || ""} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" placeholder="Ex: SAMAMBAIA, BOI FORTE, GUARANIS" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Empresa de Registro</label>
                    <select 
                      name="registrationCompany" 
                      value={registrationCompany} 
                      onChange={(e) => setRegistrationCompany(e.target.value)} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-shadow"
                    >
                      <option value="FALCON_SERVICE">Falcon Service</option>
                      <option value="FALCON_MONITORAMENTO">Falcon Monitoramento</option>
                      <option value="NAO_REGISTRADO">Não Registrado</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contrato</label>
                      <select 
                        name="contractType" 
                        value={contractType} 
                        onChange={handleContractChange} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-shadow"
                      >
                        <option value="CLT">CLT</option>
                        <option value="HORISTA">Horista</option>
                        <option value="PJ_FIXO">PJ Fixo</option>
                        <option value="PJ_HORISTA">PJ Horista</option>
                      </select>
                    </div>
                    <div>
                      {contractType === 'PJ_FIXO' ? (
                        <>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Salário Base (R$)
                          </label>
                          <input required name="baseSalary" defaultValue={employee?.baseSalary} type="number" step="0.01" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" placeholder="2000.00" />
                          <input type="hidden" name="hourlyRate" value="0" />
                        </>
                      ) : (
                        <>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {contractType === 'CLT' ? 'Valor da Hora Extra (R$)' : 'Valor da Hora (R$)'}
                          </label>
                          <input required name="hourlyRate" defaultValue={employee?.hourlyRate} type="number" step="0.01" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" placeholder="0.00" />
                          <input type="hidden" name="baseSalary" value="0" />
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Escala de Trabalho</label>
                    <select 
                      name="workSchedule" 
                      value={workSchedule}
                      onChange={(e) => setWorkSchedule(e.target.value)}
                      disabled={contractType === "HORISTA" || contractType === "PJ_HORISTA" || contractType === "PJ_FIXO"}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg outline-none transition-shadow ${["HORISTA", "PJ_HORISTA", "PJ_FIXO"].includes(contractType) ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white focus:ring-2 focus:ring-blue-500"}`}
                    >
                      <option value="FIXED_220">Fixo (220h)</option>
                      <option value="SCALE_12X36">Escala 12x36</option>
                      <option value="CUSTOM" disabled={contractType === "CLT"}>Personalizada</option>
                    </select>
                    {["HORISTA", "PJ_HORISTA", "PJ_FIXO"].includes(contractType) && <input type="hidden" name="workSchedule" value="CUSTOM" />}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Horário Padrão</label>
                    <input name="standardHours" defaultValue={employee?.standardHours || ""} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" placeholder="Ex: 18:00 AS 06:00HS" />
                  </div>

                  {workSchedule === "SCALE_12X36" && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Paridade (Início)</label>
                      <select name="startParity" defaultValue={employee?.startParity || "PAR"} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-shadow">
                        <option value="PAR">Dia Par</option>
                        <option value="IMPAR">Dia Ímpar</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className={activeTab === 'financial' ? 'block' : 'hidden'}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de PIX</label>
                      <select name="pixType" defaultValue={employee?.pixType || ""} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-shadow">
                        <option value="">Selecione...</option>
                        <option value="CPF">CPF/CNPJ</option>
                        <option value="PHONE">Telefone</option>
                        <option value="EMAIL">E-mail</option>
                        <option value="RANDOM">Chave Aleatória</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chave PIX</label>
                      <input name="pixKey" defaultValue={employee?.pixKey || ""} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" placeholder="Chave para pagamento" />
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-100">
                      <input type="checkbox" name="receivesVA" defaultChecked={employee?.receivesVA} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-gray-700">Recebe Vale Alimentação (VA)</span>
                    </label>
                    <label className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-100">
                      <input type="checkbox" name="receivesVT" defaultChecked={employee?.receivesVT} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-gray-700">Recebe Vale Transporte (VT)</span>
                    </label>
                    <label className={`flex items-center gap-3 p-2 rounded-lg transition-colors border border-transparent ${['HORISTA', 'PJ_HORISTA', 'PJ_FIXO'].includes(contractType) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer hover:border-gray-100'}`}>
                      <input 
                        type="checkbox" 
                        name="receivesIntervalHour" 
                        checked={receivesIntervalHour}
                        onChange={(e) => setReceivesIntervalHour(e.target.checked)}
                        disabled={['HORISTA', 'PJ_HORISTA', 'PJ_FIXO'].includes(contractType)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:cursor-not-allowed" 
                      />
                      <span className="text-sm font-medium text-gray-700">Recebe Hora Intervalar</span>
                    </label>
                    <label className={`flex items-center gap-3 p-2 rounded-lg transition-colors border border-transparent ${['HORISTA', 'PJ_HORISTA', 'PJ_FIXO'].includes(contractType) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer hover:border-gray-100'}`}>
                      <input 
                        type="checkbox" 
                        name="receivesNightHazard" 
                        checked={receivesNightHazard}
                        onChange={(e) => setReceivesNightHazard(e.target.checked)}
                        disabled={['HORISTA', 'PJ_HORISTA', 'PJ_FIXO'].includes(contractType)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:cursor-not-allowed" 
                      />
                      <span className="text-sm font-medium text-gray-700">Recebe Adicional Noturno (AD)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-gray-200 flex justify-end gap-3">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm">
                  {employee ? "Salvar Alterações" : "Salvar Colaborador"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
