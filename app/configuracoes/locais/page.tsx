import { getWorkLocations } from "@/actions/workLocation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import WorkLocationClient from "./components/WorkLocationClient";

export default async function WorkLocationsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any).role;
  const isAdminOrManager = role === "ADMIN" || role === "MANAGER";

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
