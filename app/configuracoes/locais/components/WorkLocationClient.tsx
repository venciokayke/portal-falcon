"use client";

import { useState } from "react";
import { createWorkLocation, deleteWorkLocation } from "@/actions/workLocation";
import { MapPin, Trash2, Plus } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

type WorkLocation = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export default function WorkLocationClient({
  initialLocations,
}: {
  initialLocations: WorkLocation[];
}) {
  const [locations, setLocations] = useState<WorkLocation[]>(initialLocations);
  const [newName, setNewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [locationToDelete, setLocationToDelete] = useState<WorkLocation | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    setError("");

    const res = await createWorkLocation(newName.trim());

    if (res.success) {
      setNewName("");
      // Since it's a Server Action with revalidatePath, 
      // the page data will refresh if we reload, but to be smooth we can manually append it or let Next.js refresh.
      // Next.js will automatically refetch Server Components that use revalidatePath when an action succeeds.
      // However, we passed initialLocations as a prop. 
      // To reflect changes immediately without full reload, we can just do a hard refresh or update state.
      window.location.reload(); 
    } else {
      setError(res.error || "Erro desconhecido");
    }
    
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!locationToDelete) return;

    const res = await deleteWorkLocation(locationToDelete.id);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error);
    }
    setLocationToDelete(null);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <form onSubmit={handleCreate} className="flex gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Nome do Novo Local (ex: GUARITA NORTE)"
            value={newName}
            onChange={(e) => setNewName(e.target.value.toUpperCase())}
            className="w-full px-4 py-2 border rounded-md uppercase"
            disabled={isSubmitting}
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !newName.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
        >
          <Plus size={20} />
          Adicionar
        </button>
      </form>

      <div className="border rounded-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Local de Trabalho
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {locations.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-4 text-center text-gray-500">
                  Nenhum local cadastrado
                </td>
              </tr>
            ) : (
              locations.map((loc) => (
                <tr key={loc.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-gray-900 font-medium">
                      <MapPin size={18} className="mr-2 text-gray-400" />
                      {loc.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setLocationToDelete(loc)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {locationToDelete && (
        <ConfirmModal
          isOpen={true}
          title="Excluir Local"
          message={`Tem certeza que deseja excluir o local "${locationToDelete.name}"? Esta ação não pode ser desfeita.`}
          onConfirm={handleDelete}
          onClose={() => setLocationToDelete(null)}
        />
      )}
    </div>
  );
}
