import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeActivityLog } from "@/lib/activity-log";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requirePermission("MANAGE_EMPLOYEES", "MANAGE_SHIFTS"); }
  catch { return new Response("Acesso negado.", { status: 403 }); }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Não encontrado.", { status: 404 });
  const record = await prisma.absenceExemption.findUnique({
    where: { id }, select: { attachmentName: true, attachmentData: true },
  });
  if (!record?.attachmentData || !record.attachmentName) return new Response("Não encontrado.", { status: 404 });
  await writeActivityLog(user.id, "BAIXAR_ATESTADO", `Abono: ${id}`);
  const filename = encodeURIComponent(record.attachmentName).replace(/'/g, '%27');
  return new Response(new Uint8Array(record.attachmentData), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'",
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  });
}
