"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updatePassword(formData: FormData) {
  const senha = String(formData.get("senha") ?? "");
  const senha2 = String(formData.get("senha2") ?? "");

  if (senha.length < 6) {
    redirect("/redefinir-senha?error=" + encodeURIComponent("A senha deve ter pelo menos 6 caracteres."));
  }
  if (senha !== senha2) {
    redirect("/redefinir-senha?error=" + encodeURIComponent("As senhas não coincidem."));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: senha });

  if (error) {
    redirect(
      "/redefinir-senha?error=" +
        encodeURIComponent("Não foi possível redefinir a senha. Solicite um novo link e tente de novo.")
    );
  }

  redirect("/login?message=" + encodeURIComponent("Senha redefinida com sucesso! Faça login com a nova senha."));
}
