import { getWorkLocations } from "@/actions/workLocation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import WorkLocationClient from "./components/WorkLocationClient";

export default async function WorkLocationsPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role === "USER") {
    redirect("/dashboard");
  }

  const locations = await getWorkLocations();

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Locais de Trabalho</h1>
      <WorkLocationClient initialLocations={locations} />
    </div>
  );
}
