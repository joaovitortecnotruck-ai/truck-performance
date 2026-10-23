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
  const voltar = (msg: string) => redirect(`/pedidos/${orderNumber}?error=` + encodeURIComponent(msg));

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // vem do banco, não do formulário, para o cliente não pular o termo de emissões
  const { data: pedido } = await supabase.from("orders").select("emissions_related").eq("id", orderId).maybeSingle();
  const emissionsRelated = !!pedido?.emissions_related;

  if (formData.get("aceiteLeitura") !== "on" || (emissionsRelated && formData.get("aceiteEmissoes") !== "on")) {
    voltar("Aceite os termos para baixar o arquivo.");
  }

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

  // Download único: a função marca o arquivo como baixado ANTES de liberar o link
  // e só então o Storage permite ler o arquivo (janela de 60s). Ver migration 013.
  const { data: path, error } = await supabase.rpc("consume_file_download", {
    p_file_id: fileId,
    p_ip: ip ?? "",
    p_user_agent: userAgent ?? "",
  });
  if (error || !path) {
    voltar("Este arquivo já foi baixado. Se precisar de um novo download, fale com a equipe pelo chat.");
  }

  const { data: file } = await supabase.from("files").select("original_name").eq("id", fileId).maybeSingle();
  const { data: signed } = await supabase.storage
    .from("ecu-files")
    .createSignedUrl(path as string, 60, { download: file?.original_name ?? true });
  if (!signed?.signedUrl) {
    voltar("Não foi possível gerar o link de download. Fale com a equipe pelo chat para liberar novamente.");
  }

  redirect(signed!.signedUrl);
}
