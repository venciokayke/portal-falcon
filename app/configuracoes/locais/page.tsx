import { requireRole } from "@/lib/auth";
import { getWorkLocations } from "@/actions/workLocation";
import WorkLocationClient from "./components/WorkLocationClient";

export default async function WorkLocationsPage() {
  await requireRole("ADMIN", "MANAGER");
  const isAdminOrManager = true;

  // @ts-ignore
  const locations = await getWorkLocations(true); // get all, including archived

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Locais de Trabalho</h1>
      {/* @ts-ignore */}
      <WorkLocationClient initialLocations={locations} isAdminOrManager={isAdminOrManager} />
    </div>
  );
}
