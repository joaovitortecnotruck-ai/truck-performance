"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function logActivity(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
  actorId: string | undefined,
  action: string,
  details: Record<string, unknown>
) {
  if (!orderId || !actorId) return;
  await supabase.from("activity_logs").insert({ order_id: orderId, actor_id: actorId, action, details });
}

export async function updateOrderStatus(formData: FormData) {
  const orderNumber = String(formData.get("orderNumber") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!orderNumber || !status) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: antes } = await supabase.from("orders").select("status").eq("order_number", orderNumber).maybeSingle();
  await supabase.from("orders").update({ status }).eq("order_number", orderNumber);
  await logActivity(supabase, orderId, user?.id, "status_alterado", { de: antes?.status ?? null, para: status });

  revalidatePath(`/admin/pedidos/${orderNumber}`);
  redirect(`/admin/pedidos/${orderNumber}?success=` + encodeURIComponent("Status atualizado!"));
}

export async function updateOrderPrice(formData: FormData) {
  const orderNumber = String(formData.get("orderNumber") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const totalPriceRaw = String(formData.get("totalPrice") ?? "").replace(",", ".");
  const totalPrice = Number(totalPriceRaw);

  if (!orderNumber || Number.isNaN(totalPrice) || totalPrice < 0) {
    redirect(`/admin/pedidos/${orderNumber}?error=` + encodeURIComponent("Valor inválido."));
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: antes } = await supabase.from("orders").select("total_price").eq("order_number", orderNumber).maybeSingle();
  await supabase.from("orders").update({ total_price: totalPrice }).eq("order_number", orderNumber);
  await logActivity(supabase, orderId, user?.id, "valor_alterado", { de: antes?.total_price ?? null, para: totalPrice });

  revalidatePath(`/admin/pedidos/${orderNumber}`);
  redirect(`/admin/pedidos/${orderNumber}?success=` + encodeURIComponent("Valor do pedido atualizado!"));
}

export async function updatePaymentStatus(formData: FormData) {
  const orderNumber = String(formData.get("orderNumber") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const paymentStatus = String(formData.get("paymentStatus") ?? "");
  if (!orderNumber || !paymentStatus) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: antes } = await supabase.from("orders").select("payment_status").eq("order_number", orderNumber).maybeSingle();
  await supabase.from("orders").update({ payment_status: paymentStatus }).eq("order_number", orderNumber);
  await logActivity(supabase, orderId, user?.id, "pagamento_alterado", { de: antes?.payment_status ?? null, para: paymentStatus });

  revalidatePath(`/admin/pedidos/${orderNumber}`);
  redirect(`/admin/pedidos/${orderNumber}?success=` + encodeURIComponent("Pagamento atualizado!"));
}

export async function updateFileMeta(formData: FormData) {
  const orderNumber = String(formData.get("orderNumber") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const fileId = String(formData.get("fileId") ?? "");
  const hw = String(formData.get("hw") ?? "").trim();
  const sw = String(formData.get("sw") ?? "").trim();
  if (!orderNumber || !fileId) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from("files")
    .update({ hw: hw || null, sw: sw || null })
    .eq("id", fileId);
  await logActivity(supabase, orderId, user?.id, "hw_sw_atualizado", { fileId, hw: hw || null, sw: sw || null });

  revalidatePath(`/admin/pedidos/${orderNumber}`);
  redirect(`/admin/pedidos/${orderNumber}?success=` + encodeURIComponent("HW/SW atualizado!"));
}

// O arquivo já foi enviado direto do navegador para o Storage (ver lib/upload.ts);
// aqui só registramos os metadados e marcamos o pedido como pronto.
export async function uploadModifiedFile(formData: FormData) {
  const orderNumber = String(formData.get("orderNumber") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const hw = String(formData.get("hw") ?? "").trim();
  const sw = String(formData.get("sw") ?? "").trim();
  const path = String(formData.get("arquivoPath") ?? "");
  const nome = String(formData.get("arquivoNome") ?? "");
  const tamanho = Number(formData.get("arquivoTamanho") ?? 0);
  const sha256 = String(formData.get("arquivoSha256") ?? "");

  if (!path || !nome) {
    redirect(`/admin/pedidos/${orderNumber}?error=` + encodeURIComponent("Selecione um arquivo."));
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("files").insert({
    order_id: orderId,
    uploaded_by: user!.id,
    file_type: "final",
    original_name: nome,
    storage_path: path,
    size_bytes: tamanho,
    hw: hw || null,
    sw: sw || null,
    sha256: sha256 || null,
  });
  if (error) {
    redirect(`/admin/pedidos/${orderNumber}?error=` + encodeURIComponent(`Falha ao registrar o arquivo: ${error.message}`));
  }

  await Promise.all([
    supabase.from("orders").update({ status: "ready" }).eq("order_number", orderNumber),
    logActivity(supabase, orderId, user!.id, "arquivo_modificado_enviado", { nome, sha256 }),
  ]);

  revalidatePath(`/admin/pedidos/${orderNumber}`);
  redirect(
    `/admin/pedidos/${orderNumber}?success=` +
      encodeURIComponent("Arquivo enviado com sucesso! O pedido foi marcado como \"Arquivo pronto\".")
  );
}

export async function grantExtraDownload(formData: FormData) {
  const orderNumber = String(formData.get("orderNumber") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const fileId = String(formData.get("fileId") ?? "");
  if (!orderNumber || !fileId) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.rpc("grant_extra_download", { p_file_id: fileId });
  if (error) {
    redirect(`/admin/pedidos/${orderNumber}?error=` + encodeURIComponent(`Não foi possível liberar: ${error.message}`));
  }
  await logActivity(supabase, orderId, user?.id, "download_liberado", { fileId });

  revalidatePath(`/admin/pedidos/${orderNumber}`);
  redirect(`/admin/pedidos/${orderNumber}?success=` + encodeURIComponent("Novo download liberado para o cliente."));
}
