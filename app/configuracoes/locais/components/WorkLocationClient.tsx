"use client";

import { useState } from "react";
import { createWorkLocation, archiveWorkLocation, unarchiveWorkLocation } from "@/actions/workLocation";
import { MapPin, Archive, ArchiveRestore, Plus } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { AlertModal } from "@/components/ui/AlertModal";
import { logActivity } from "@/actions/activity-log";

type WorkLocation = {
  id: string;
  name: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export default function WorkLocationClient({
  initialLocations,
  isAdminOrManager = false,
}: {
  initialLocations: WorkLocation[];
  isAdminOrManager?: boolean;
}) {
  const [locations, setLocations] = useState<WorkLocation[]>(initialLocations);
  const [newName, setNewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string }>({ isOpen: false, title: "", message: "" });
  const [locationToArchive, setLocationToArchive] = useState<WorkLocation | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const displayedLocations = locations.filter(loc => (loc.isActive ?? true) === !showArchived);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);

    const res = await createWorkLocation(newName.trim());

    if (res.success) {
      logActivity("CRIAR_LOCAL", `Novo local criado: ${newName.trim()}`);
      setNewName("");
      window.location.reload(); 
    } else {
      setAlertModal({ isOpen: true, title: "Erro ao criar local", message: res.error || "Erro desconhecido" });
    }
    
    setIsSubmitting(false);
  };

  const handleArchive = async () => {
    if (!locationToArchive) return;

    const res = await archiveWorkLocation(locationToArchive.id);
    if (res.success) {
      logActivity("ARQUIVAR_LOCAL", `Local arquivado: ${locationToArchive.name}`);
      window.location.reload();
    } else {
      setAlertModal({ isOpen: true, title: "Erro ao arquivar local", message: res.error || "Erro desconhecido" });
    }
    setLocationToArchive(null);
  };

  const handleUnarchive = async (loc: WorkLocation) => {
    const res = await unarchiveWorkLocation(loc.id);
    if (res.success) {
      logActivity("DESARQUIVAR_LOCAL", `Local restaurado: ${loc.name}`);
      window.location.reload();
    } else {
      setAlertModal({ isOpen: true, title: "Erro ao desarquivar local", message: res.error || "Erro desconhecido" });
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {isAdminOrManager && (
        <form onSubmit={handleCreate} className="flex gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Nome do Novo Local (ex: GUARITA NORTE)"
              value={newName}
              onChange={(e) => setNewName(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 border rounded-md uppercase focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={isSubmitting}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !newName.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            <Plus size={20} />
            Adicionar
          </button>
        </form>
      )}

      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 font-medium ${!showArchived ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setShowArchived(false)}
        >
          Ativos
        </button>
        <button
          className={`px-4 py-2 font-medium ${showArchived ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setShowArchived(true)}
        >
          Arquivados
        </button>
      </div>

      <div className="border rounded-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Local de Trabalho
              </th>
              {isAdminOrManager && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayedLocations.length === 0 ? (
              <tr>
                <td colSpan={isAdminOrManager ? 2 : 1} className="px-6 py-4 text-center text-gray-500">
                  Nenhum local encontrado
                </td>
              </tr>
            ) : (
              displayedLocations.map((loc) => (
                <tr key={loc.id} className={showArchived ? "bg-gray-50" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`flex items-center font-medium ${showArchived ? "text-gray-500" : "text-gray-900"}`}>
                      <MapPin size={18} className="mr-2 text-gray-400" />
                      {loc.name}
                      {showArchived && (
                        <span className="ml-3 px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600 font-semibold">Arquivado</span>
                      )}
                    </div>
                  </td>
                  {isAdminOrManager && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {!showArchived ? (
                        <button
                          onClick={() => setLocationToArchive(loc)}
                          title="Arquivar Local"
                          className="text-amber-600 hover:text-amber-900 p-2 rounded-full hover:bg-amber-50 transition-colors"
                        >
                          <Archive size={20} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnarchive(loc)}
                          title="Restaurar Local"
                          className="text-green-600 hover:text-green-900 p-2 rounded-full hover:bg-green-50 transition-colors"
                        >
                          <ArchiveRestore size={20} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {locationToArchive && (
        <ConfirmModal
          isOpen={true}
          title="Arquivar Local"
          message={`Tem certeza que deseja arquivar o local "${locationToArchive.name}"? Ele deixará de aparecer nas opções de lançamento, mas os registros antigos serão mantidos.`}
          onConfirm={handleArchive}
          onClose={() => setLocationToArchive(null)}
        />
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        type="error"
      />
    </div>
  );
}
