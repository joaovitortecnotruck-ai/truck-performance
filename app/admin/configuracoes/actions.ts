"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateUserRole(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!userId || !role) return;

  const supabase = createClient();
  await supabase.from("profiles").update({ role }).eq("id", userId);

  revalidatePath("/admin/configuracoes");
}
