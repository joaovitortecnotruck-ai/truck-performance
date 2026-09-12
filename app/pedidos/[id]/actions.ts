"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function confirmDownload(formData: FormData) {
  const orderNumber = String(formData.get("orderNumber") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const fileId = String(formData.get("fileId") ?? "");
  const termReadWriteId = String(formData.get("termReadWriteId") ?? "");
  const termEmissionsId = String(formData.get("termEmissionsId") ?? "");
  const emissionsRelated = formData.get("emissionsRelated") === "true";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const forwardedFor = headers().get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : null;
  const userAgent = headers().get("user-agent");

  const registros: Record<string, unknown>[] = [];
  if (termReadWriteId) {
    registros.push({ order_id: orderId, user_id: user!.id, term_id: termReadWriteId, ip_address: ip, user_agent: userAgent });
  }
  if (emissionsRelated && termEmissionsId) {
    registros.push({ order_id: orderId, user_id: user!.id, term_id: termEmissionsId, ip_address: ip, user_agent: userAgent });
  }
  if (registros.length > 0) {
    await supabase.from("term_acceptances").insert(registros);
  }

  const { data: file } = await supabase.from("files").select("storage_path").eq("id", fileId).maybeSingle();
  if (!file) {
    redirect(`/pedidos/${orderNumber}?error=` + encodeURIComponent("Arquivo não encontrado."));
  }

  const { data: signed } = await supabase.storage.from("ecu-files").createSignedUrl(file!.storage_path, 60);
  if (!signed?.signedUrl) {
    redirect(`/pedidos/${orderNumber}?error=` + encodeURIComponent("Não foi possível gerar o link de download."));
  }

  redirect(signed!.signedUrl);
}
