"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteOrder(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return;

  const supabase = createClient();

  const { data: files } = await supabase.from("files").select("storage_path").eq("order_id", orderId);
  if (files && files.length > 0) {
    await supabase.storage.from("ecu-files").remove(files.map((f) => f.storage_path));
  }

  // files, mensagens, itens, aceites e logs saem junto (ON DELETE CASCADE, migration 013)
  await supabase.from("orders").delete().eq("id", orderId);

  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
}
