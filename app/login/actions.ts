"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=" + encodeURIComponent("Preencha e-mail e senha."));
  }

  if (!(await verifyTurnstile(formData.get("cf-turnstile-response"), "login"))) {
    redirect("/login?error=" + encodeURIComponent("Falha na verificação de segurança. Tente novamente."));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=" + encodeURIComponent("E-mail ou senha inválidos."));
  }

  redirect("/dashboard");
}
