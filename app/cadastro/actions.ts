"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";

export async function signup(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const empresa = String(formData.get("empresa") ?? "").trim();
  const documento = String(formData.get("documento") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const cidade = String(formData.get("cidade") ?? "").trim();
  const estado = String(formData.get("estado") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const senha2 = String(formData.get("senha2") ?? "");
  const aceite = formData.get("termos");

  if (!nome || !email || !whatsapp || !senha) {
    redirect("/cadastro?error=" + encodeURIComponent("Preencha todos os campos obrigatórios."));
  }
  if (!aceite) {
    redirect("/cadastro?error=" + encodeURIComponent("Você precisa aceitar os termos de uso."));
  }
  if (senha.length < 6) {
    redirect("/cadastro?error=" + encodeURIComponent("A senha deve ter pelo menos 6 caracteres."));
  }
  if (senha !== senha2) {
    redirect("/cadastro?error=" + encodeURIComponent("As senhas não coincidem."));
  }
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response"), "signup"))) {
    redirect("/cadastro?error=" + encodeURIComponent("Falha na verificação de segurança. Tente novamente."));
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({ email, password: senha });

  if (error) {
    redirect("/cadastro?error=" + encodeURIComponent(error.message));
  }

  if (!data.user) {
    redirect("/cadastro?error=" + encodeURIComponent("Não foi possível criar a conta."));
  }

  if (!data.session) {
    redirect(
      "/login?message=" +
        encodeURIComponent("Conta criada! Verifique seu e-mail para confirmar antes de entrar.")
    );
  }

  // O banco já cria a linha em `profiles` automaticamente (trigger on_auth_user_created);
  // aqui só completamos com os dados do formulário.
  await supabase
    .from("profiles")
    .update({
      name: nome,
      company: empresa || null,
      document: documento || null,
      phone: telefone || null,
      whatsapp,
      city: cidade || null,
      state: estado || null,
    })
    .eq("id", data.user.id);

  redirect("/dashboard");
}
