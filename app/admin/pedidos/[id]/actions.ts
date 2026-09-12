"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";

async function sha256File(file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  return createHash("sha256").update(buf).digest("hex");
}

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

export async function uploadModifiedFile(formData: FormData) {
  const orderNumber = String(formData.get("orderNumber") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  const hw = String(formData.get("hw") ?? "").trim();
  const sw = String(formData.get("sw") ?? "").trim();
  const arquivo = formData.get("arquivoModificado");

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    redirect(`/admin/pedidos/${orderNumber}?error=` + encodeURIComponent("Selecione um arquivo."));
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const path = `${clientId}/${orderId}/final/${arquivo.name}`;

  async function tentarUpload() {
    return supabase.storage
      .from("ecu-files")
      .upload(path, arquivo as File, { contentType: (arquivo as File).type || "application/octet-stream", upsert: true });
  }

  let uploadError: { message: string } | null = null;
  try {
    const primeira = await tentarUpload();
    uploadError = primeira.error;
    if (uploadError) {
      // conexão instável: tenta mais uma vez antes de desistir
      const segunda = await tentarUpload();
      uploadError = segunda.error;
    }
  } catch (e: any) {
    uploadError = { message: e?.message ?? "erro de rede desconhecido" };
  }

  if (uploadError) {
    redirect(
      `/admin/pedidos/${orderNumber}?error=` +
        encodeURIComponent(`Falha ao enviar o arquivo: ${uploadError.message}`)
    );
  }

  const sha256 = await sha256File(arquivo);

  await Promise.all([
    supabase.from("files").insert({
      order_id: orderId,
      uploaded_by: user!.id,
      file_type: "final",
      original_name: arquivo.name,
      storage_path: path,
      size_bytes: arquivo.size,
      hw: hw || null,
      sw: sw || null,
      sha256,
    }),
    supabase.from("orders").update({ status: "ready" }).eq("order_number", orderNumber),
    logActivity(supabase, orderId, user!.id, "arquivo_modificado_enviado", { nome: arquivo.name, sha256 }),
  ]);

  revalidatePath(`/admin/pedidos/${orderNumber}`);
  redirect(
    `/admin/pedidos/${orderNumber}?success=` +
      encodeURIComponent("Arquivo enviado com sucesso! O pedido foi marcado como \"Arquivo pronto\".")
  );
}
