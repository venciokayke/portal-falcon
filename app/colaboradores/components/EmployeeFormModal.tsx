"use client";

import { useState, useEffect } from "react";
import { Plus, X, AlertCircle, CreditCard, Landmark, Banknote, UserCircle, Briefcase, AlertTriangle, Info } from "lucide-react";
import { addEmployee, updateEmployee } from "@/actions/employee";
import { AlertModal } from "@/components/ui/AlertModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { getWorkLocations } from "@/actions/workLocation";

type FieldErrors = Partial<Record<
  "baseSalary" | "hourlyRate" | "pixType" | "pixKey" | "bankName" | "bankAgency" | "bankAccount",
  boolean
>>;

const inputClass = (hasError?: boolean) =>
  `w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none transition-shadow bg-white ${hasError
    ? "border-red-400 ring-2 ring-red-200 focus:ring-red-300 bg-red-50"
    : "border-gray-300 focus:ring-blue-500"
  }`;

const PAYMENT_METHODS = [
  { value: "PIX", label: "PIX", icon: CreditCard, color: "text-blue-600" },
  { value: "BANCARIA", label: "Transferência Bancária", icon: Landmark, color: "text-purple-600" },
  { value: "ESPECIE", label: "Espécie / Sem PIX", icon: Banknote, color: "text-green-600" },
];

const SCALE_LABELS: Record<string, string> = {
  FIXED_220: "Fixo (220h)",
  SCALE_12X36: "Escala 12x36",
  CUSTOM: "Personalizada",
};


const maskCPF_CNPJ = (val: string) => {
  const v = val.replace(/\D/g, "");
  if (v.length <= 11) {
    return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})/, "$1-$2");
  }
  return v.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})/, "$1-$2");
};

const maskPhone = (val: string) => {
  const v = val.replace(/\D/g, "");
  return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{4})/, "$1-$2").slice(0, 15);
};

const formatPixKey = (val: string, type: string) => {
  if (type === "CPF") return maskCPF_CNPJ(val);
  if (type === "PHONE") return maskPhone(val);
  return val;
};

export default function EmployeeFormModal({
  employee,
  trigger,
}: {
  employee?: any;
  trigger?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [workLocations, setWorkLocations] = useState<any[]>([]);
  const [workLocationValue, setWorkLocationValue] = useState(employee?.workLocation || "");

  useEffect(() => {
    if (isOpen) {
      getWorkLocations().then(setWorkLocations).catch(console.error);
      // Re-sync controlled value when modal opens (in case employee prop changed)
      setWorkLocationValue(employee?.workLocation || "");
    }
  }, [isOpen]);
  const [workSchedule, setWorkSchedule] = useState(employee?.workSchedule || "FIXED_220");
  const [contractType, setContractType] = useState(employee?.contractType || "CLT");
  const [registrationCompany, setRegistrationCompany] = useState(
    employee?.registrationCompany || "NAO_REGISTRADO"
  );
  const [activeTab, setActiveTab] = useState<"base" | "financial">("base");
  const [receivesIntervalHour, setReceivesIntervalHour] = useState<boolean>(
    employee?.receivesIntervalHour || false
  );
  const [receivesNightHazard, setReceivesNightHazard] = useState<boolean>(
    employee?.receivesNightHazard || false
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    employee?.paymentMethod || "PIX"
  );
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string }>({ isOpen: false, title: "", message: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [confirmBenefitsOpen, setConfirmBenefitsOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);


  const initialHours = employee?.standardHours?.split(" AS ") || ["", ""];
  const [standardHourStart, setStandardHourStart] = useState(initialHours[0] || "");
  const [standardHourEnd, setStandardHourEnd] = useState(initialHours[1] || "");
  const [pixType, setPixType] = useState(employee?.pixType || "");
  const [pixKey, setPixKey] = useState(employee?.pixKey || "");

  const clearErrors = () => { setFieldErrors({}); };

  const handleContractChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setContractType(value);
    clearErrors();
    if (["HORISTA", "PJ_HORISTA", "PJ_FIXO"].includes(value)) {
      setWorkSchedule("CUSTOM");
      setReceivesIntervalHour(false);
      setReceivesNightHazard(false);
    } else if (value === "CLT" && workSchedule === "CUSTOM") {
      setWorkSchedule("FIXED_220");
    }
  };

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setRegistrationCompany(value);
    clearErrors();

    if (value === "FALCON_SERVICE" || value === "FALCON_MONITORAMENTO") {
      setContractType("CLT");
      // Reseta escala se necessário (opcional, mas bom manter padrão CLT 220h)
      if (workSchedule === "CUSTOM") setWorkSchedule("FIXED_220");
    } else if (value === "NAO_REGISTRADO" && contractType === "CLT") {
      setContractType("HORISTA");
      setWorkSchedule("CUSTOM");
      setReceivesIntervalHour(false);
      setReceivesNightHazard(false);
    }
  };

  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value);
    setFieldErrors({});
  };

  const validateForm = (formData: FormData) => {
    const errors: FieldErrors = {};
    const messages: string[] = [];
    const ct = formData.get("contractType") as string;
    const baseSalary = Number(formData.get("baseSalary")) || 0;
    const hourlyRate = Number(formData.get("hourlyRate")) || 0;
    const pm = formData.get("paymentMethod") as string;
    const pixType = formData.get("pixType") as string;
    const pixKey = (formData.get("pixKey") as string)?.trim();
    const bankName = (formData.get("bankName") as string)?.trim();
    const bankAgency = (formData.get("bankAgency") as string)?.trim();
    const bankAccount = (formData.get("bankAccount") as string)?.trim();

    if (ct === "PJ_FIXO" && baseSalary <= 0) {
      errors.baseSalary = true;
      messages.push("PJ Fixo exige um Salário Base maior que zero.");
    }
    if ((ct === "HORISTA" || ct === "PJ_HORISTA") && hourlyRate < 0) {
      errors.hourlyRate = true;
      messages.push("Valor da Hora não pode ser negativo");
    }

    if (pm === "PIX") {
      if (pixKey && !pixType) { errors.pixType = true; messages.push("Selecione o Tipo de PIX para a chave informada"); }
    }
    if (pm === "BANCARIA") {
      if (!bankName) { errors.bankName = true; messages.push("Informe o Banco"); }
      if (!bankAgency) { errors.bankAgency = true; messages.push("Informe a Agência"); }
      if (!bankAccount) { errors.bankAccount = true; messages.push("Informe a Conta"); }
    }

    return { valid: messages.length === 0, errors, message: messages.join(" · ") };
  };

  const hasFinancialError = (errors: FieldErrors) =>
    errors.baseSalary || errors.hourlyRate || errors.pixType || errors.pixKey ||
    errors.bankName || errors.bankAgency || errors.bankAccount;

  const saveEmployeeData = async (formData: FormData) => {
    try {
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
        setPaymentMethod("PIX");
        setReceivesIntervalHour(false);
        setReceivesNightHazard(false);
        setStandardHourStart("");
        setStandardHourEnd("");
        setPixKey("");
        setPixType("");
      }
    } catch (err: any) {
      setErrorModal({ isOpen: true, title: "Erro ao salvar", message: err.message });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Combine standard hours
    if (standardHourStart && standardHourEnd) {
      formData.set("standardHours", `${standardHourStart} AS ${standardHourEnd}`);
    } else {
      formData.set("standardHours", "");
    }

    // Set default parity since it was removed from form
    formData.set("startParity", "NONE");

    const { valid, errors, message } = validateForm(formData);

    if (!valid) {
      setFieldErrors(errors);
      setErrorModal({ isOpen: true, title: "Atenção", message: message || "Preencha os campos obrigatórios." });
      if (hasFinancialError(errors)) setActiveTab("financial");
      return;
    }

    clearErrors();

    const receivesVA = formData.get("receivesVA") === "on";
    const receivesVT = formData.get("receivesVT") === "on";
    const receivesIntervalHour = formData.get("receivesIntervalHour") === "on";
    const receivesNightHazard = formData.get("receivesNightHazard") === "on";
    const hasAnyBenefit = receivesVA || receivesVT || receivesIntervalHour || receivesNightHazard;

    if (contractType === "CLT" && !hasAnyBenefit) {
      setPendingFormData(formData);
      setConfirmBenefitsOpen(true);
      return;
    }

    await saveEmployeeData(formData);
  };

  const isPJFix = contractType === "PJ_FIXO" || contractType === "CLT";

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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                {employee ? "Editar Colaborador" : "Cadastrar Colaborador"}
              </h2>
              <button
                type="button"
                onClick={() => { setIsOpen(false); clearErrors(); }}
                className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-md transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <AlertModal
              isOpen={errorModal.isOpen}
              onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
              title={errorModal.title}
              message={errorModal.message}
              type="error"
            />

            <ConfirmModal
              isOpen={confirmBenefitsOpen}
              onClose={() => {
                setConfirmBenefitsOpen(false);
                setPendingFormData(null);
              }}
              onConfirm={async () => {
                if (pendingFormData) {
                  await saveEmployeeData(pendingFormData);
                }
              }}
              title="Confirmar Cadastro"
              message={`Este colaborador está contratado sob o regime CLT, porém não possui nenhum benefício ativo (Vale Alimentação, Vale Transporte, Hora Intervalar ou Adicional Noturno).

Você tem certeza que deseja salvar sem benefícios?`}
              confirmText="Sim, salvar"
              cancelText="Voltar"
            />

            {/* Abas */}
            <div className="flex border-b border-gray-200">
              {(["base", "financial"] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors relative ${activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                  {tab === "base" ? "Dados Base" : "Dados Financeiros"}
                  {tab === "financial" && hasFinancialError(fieldErrors) && (
                    <span className="absolute top-2 right-8 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} onKeyDown={(e) => {
              if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
                e.preventDefault();
                const form = e.currentTarget;
                const elements = Array.from(form.elements).filter(el =>
                  (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "BUTTON") &&
                  !(el as any).hidden && !(el as any).disabled
                );
                const index = elements.indexOf(e.target as any);
                if (index > -1 && elements[index + 1]) {
                  (elements[index + 1] as HTMLElement).focus();
                }
              }
            }} className="overflow-y-auto p-6 space-y-4">

              {/* ── ABA BASE ─────────────────────────────────────────────── */}
              <div className={activeTab === "base" ? "block space-y-4" : "hidden"}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                  <input required name="name" defaultValue={employee?.name} type="text"
                    onChange={(e) => e.target.value = e.target.value.toUpperCase()}
                    className={inputClass()} placeholder="Ex: JOÃO DA SILVA" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lotação</label>
                  <select
                    name="workLocation"
                    value={workLocationValue}
                    onChange={e => setWorkLocationValue(e.target.value)}
                    className={inputClass()}
                  >
                    <option value="">Selecione...</option>
                    {workLocations.map((loc) => (
                      <option key={loc.id} value={loc.name}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empresa de Registro</label>
                  <select name="registrationCompany" value={registrationCompany}
                    onChange={handleCompanyChange} className={inputClass()}>
                    <option value="FALCON_SERVICE">Falcon Service</option>
                    <option value="FALCON_MONITORAMENTO">Falcon Monitoramento</option>
                    <option value="NAO_REGISTRADO">Não Registrado</option>
                  </select>
                  {registrationCompany === "NAO_REGISTRADO" && (
                    <p className="mt-1 text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Não registrados não podem ter contrato CLT.</p>
                  )}
                  {(registrationCompany === "FALCON_SERVICE" || registrationCompany === "FALCON_MONITORAMENTO") && (
                    <p className="mt-1 text-xs text-blue-600 flex items-center gap-1"><Info className="w-3 h-3" /> Colaboradores registrados devem ser obrigatoriamente CLT.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contrato</label>
                    <select name="contractType" value={contractType}
                      onChange={handleContractChange} className={inputClass()}>
                      <option value="CLT" disabled={registrationCompany === "NAO_REGISTRADO"}>
                        CLT{registrationCompany === "NAO_REGISTRADO" ? " (indisponível)" : ""}
                      </option>
                      <option value="HORISTA" disabled={registrationCompany !== "NAO_REGISTRADO"}>
                        Horista{registrationCompany !== "NAO_REGISTRADO" ? " (bloqueado)" : ""}
                      </option>
                      <option value="PJ_FIXO" disabled={registrationCompany !== "NAO_REGISTRADO"}>
                        PJ Fixo{registrationCompany !== "NAO_REGISTRADO" ? " (bloqueado)" : ""}
                      </option>
                      <option value="PJ_HORISTA" disabled={registrationCompany !== "NAO_REGISTRADO"}>
                        PJ Horista{registrationCompany !== "NAO_REGISTRADO" ? " (bloqueado)" : ""}
                      </option>
                    </select>
                  </div>
                  <div>
                    {/* CLT: apenas taxa de hora extra como exceção */}
                    {contractType === "CLT" && (
                      <>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Taxa hora extra <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                        </label>
                        <input name="hourlyRate" defaultValue={employee?.hourlyRate || ""} type="number"
                          step="0.01" min="0" className={inputClass()}
                          placeholder="Vazio = usa taxa global" />
                        <input type="hidden" name="baseSalary" value="" />
                        <p className="text-xs text-gray-400 mt-1">Salário calculado pela contabilidade.</p>
                      </>
                    )}

                    {/* HORISTA / PJ_HORISTA: taxa por hora como exceção */}
                    {(contractType === "HORISTA" || contractType === "PJ_HORISTA") && (
                      <>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Taxa hora trabalhada <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                        </label>
                        <input name="hourlyRate" defaultValue={employee?.hourlyRate || ""} type="number"
                          step="0.01" min="0" className={inputClass()}
                          placeholder="Vazio = usa taxa global" />
                        <input type="hidden" name="baseSalary" value="" />
                      </>
                    )}

                    {/* PJ_FIXO: salário base obrigatório */}
                    {contractType === "PJ_FIXO" && (
                      <>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Salário Base (R$) *</label>
                        <input name="baseSalary" defaultValue={employee?.baseSalary || ""} type="number"
                          step="0.01" min="0.01" className={inputClass(fieldErrors.baseSalary)} placeholder="2000.00" />
                        <input type="hidden" name="hourlyRate" value="" />
                        {fieldErrors.baseSalary && <p className="text-xs text-red-500 mt-1">Campo obrigatório</p>}
                      </>
                    )}

                    {/* CUSTOM (NAO_REGISTRADO): ambos opcionais */}
                    {contractType === "CUSTOM" && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Valor Fixo (R$) <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                          </label>
                          <input name="baseSalary" defaultValue={employee?.baseSalary || ""} type="number"
                            step="0.01" min="0" className={inputClass()} placeholder="Para situações de pagamento fixo" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Taxa hora <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                          </label>
                          <input name="hourlyRate" defaultValue={employee?.hourlyRate || ""} type="number"
                            step="0.01" min="0" className={inputClass()} placeholder="Vazio = usa taxa global" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Escala de Trabalho</label>
                  <select name="workSchedule" value={workSchedule}
                    onChange={(e) => setWorkSchedule(e.target.value)}
                    disabled={["HORISTA", "PJ_HORISTA", "PJ_FIXO"].includes(contractType)}
                    className={`${inputClass()} ${["HORISTA", "PJ_HORISTA", "PJ_FIXO"].includes(contractType) ? "opacity-60 cursor-not-allowed" : ""}`}>
                    <option value="FIXED_220">{SCALE_LABELS.FIXED_220}</option>
                    <option value="SCALE_12X36">{SCALE_LABELS.SCALE_12X36}</option>
                    <option value="CUSTOM" disabled={contractType === "CLT"}>{SCALE_LABELS.CUSTOM}</option>
                  </select>
                  {["HORISTA", "PJ_HORISTA", "PJ_FIXO"].includes(contractType) && (
                    <input type="hidden" name="workSchedule" value="CUSTOM" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Entrada (Padrão)</label>
                    <input type="time" value={standardHourStart} onChange={(e) => setStandardHourStart(e.target.value)}
                      className={inputClass()} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Saída (Padrão)</label>
                    <input type="time" value={standardHourEnd} onChange={(e) => setStandardHourEnd(e.target.value)}
                      className={inputClass()} />
                  </div>
                </div>


              </div>

              {/* ── ABA FINANCEIRA ───────────────────────────────────────── */}
              <div className={activeTab === "financial" ? "block space-y-4" : "hidden"}>

                {/* Método de pagamento — toggle visual */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pagamento</label>
                  <input type="hidden" name="paymentMethod" value={paymentMethod} />
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map(({ value, label, icon: Icon, color }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handlePaymentMethodChange(value)}
                        className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-xs font-semibold ${paymentMethod === value
                          ? `border-blue-500 bg-blue-50 ${color}`
                          : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                      >
                        <Icon className={`h-5 w-5 ${paymentMethod === value ? color : ""}`} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── PIX ── */}
                {paymentMethod === "PIX" && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de PIX <span className="text-xs text-gray-400 font-normal">(opcional)</span></label>
                      <select name="pixType" value={pixType}
                        onChange={(e) => { setPixType(e.target.value); setPixKey(""); setFieldErrors(p => ({ ...p, pixType: false, pixKey: false })); }}
                        className={`${inputClass(fieldErrors.pixType)}`}>
                        <option value="">Selecione...</option>
                        <option value="CPF">CPF / CNPJ</option>
                        <option value="PHONE">Telefone</option>
                        <option value="EMAIL">E-mail</option>
                        <option value="RANDOM">Chave Aleatória</option>
                      </select>
                      {fieldErrors.pixType && <p className="text-xs text-red-500 mt-1">Obrigatório para a chave informada</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chave PIX <span className="text-xs text-gray-400 font-normal">(opcional)</span></label>
                      <input name="pixKey" value={pixKey} type="text"
                        onChange={(e) => { setPixKey(formatPixKey(e.target.value, pixType)); setFieldErrors(p => ({ ...p, pixKey: false })); }}
                        className={inputClass(fieldErrors.pixKey)} placeholder="Chave para pagamento" />
                      {fieldErrors.pixKey && <p className="text-xs text-red-500 mt-1">Obrigatório</p>}
                    </div>
                  </div>
                )}

                {/* ── BANCÁRIA ── */}
                {paymentMethod === "BANCARIA" && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Banco *</label>
                      <input name="bankName" defaultValue={employee?.bankName || ""} type="text"
                        onChange={() => setFieldErrors(p => ({ ...p, bankName: false }))}
                        className={inputClass(fieldErrors.bankName)} placeholder="Ex: Banco do Brasil, Caixa..." />
                      {fieldErrors.bankName && <p className="text-xs text-red-500 mt-1">Obrigatório</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Agência *</label>
                        <input name="bankAgency" defaultValue={employee?.bankAgency || ""} type="text"
                          onChange={() => setFieldErrors(p => ({ ...p, bankAgency: false }))}
                          className={inputClass(fieldErrors.bankAgency)} placeholder="Ex: 0001" />
                        {fieldErrors.bankAgency && <p className="text-xs text-red-500 mt-1">Obrigatório</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Conta *</label>
                        <input name="bankAccount" defaultValue={employee?.bankAccount || ""} type="text"
                          onChange={() => setFieldErrors(p => ({ ...p, bankAccount: false }))}
                          className={inputClass(fieldErrors.bankAccount)} placeholder="Ex: 12345-6" />
                        {fieldErrors.bankAccount && <p className="text-xs text-red-500 mt-1">Obrigatório</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── ESPÉCIE ── */}
                {paymentMethod === "ESPECIE" && (
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl animate-in fade-in duration-200">
                    <Banknote className="h-8 w-8 text-green-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">Pagamento em Espécie</p>
                      <p className="text-xs text-green-600 mt-0.5">
                        Nenhuma chave PIX ou dado bancário é necessário para este colaborador.
                      </p>
                    </div>
                  </div>
                )}

                {/* Benefícios */}
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">Benefícios</p>
                  {[
                    { name: "receivesVA", label: "Recebe Vale Alimentação (VA)", defaultCheck: employee?.receivesVA, disabled: false },
                    { name: "receivesVT", label: "Recebe Vale Transporte (VT)", defaultCheck: employee?.receivesVT, disabled: false },
                    { name: "receivesIntervalHour", label: "Recebe Hora Intervalar", defaultCheck: receivesIntervalHour, disabled: ["HORISTA", "PJ_HORISTA", "PJ_FIXO"].includes(contractType), controlled: true },
                    { name: "receivesNightHazard", label: "Recebe Adicional Noturno (AD)", defaultCheck: receivesNightHazard, disabled: ["HORISTA", "PJ_HORISTA", "PJ_FIXO"].includes(contractType), controlled: true },
                  ].map(({ name, label, defaultCheck, disabled, controlled }) => (
                    <label key={name}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-colors border border-transparent ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 cursor-pointer hover:border-gray-100"
                        }`}>
                      <input
                        type="checkbox"
                        name={name}
                        disabled={disabled}
                        {...(controlled
                          ? {
                            checked: name === "receivesIntervalHour" ? receivesIntervalHour : receivesNightHazard,
                            onChange: (e) => name === "receivesIntervalHour"
                              ? setReceivesIntervalHour(e.target.checked)
                              : setReceivesNightHazard(e.target.checked)
                          }
                          : { defaultChecked: defaultCheck }
                        )}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:cursor-not-allowed"
                      />
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-2 border-t border-gray-200 flex justify-end gap-3">
                <button type="button" onClick={() => { setIsOpen(false); clearErrors(); }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm">
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
