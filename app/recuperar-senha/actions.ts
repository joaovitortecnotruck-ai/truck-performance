"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect("/recuperar-senha?error=" + encodeURIComponent("Informe seu e-mail."));
  }

  const supabase = createClient();
  const origin = headers().get("origin") ?? "http://localhost:3000";

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/redefinir-senha`,
  });

  // Mensagem genérica sempre igual, exista ou não o e-mail (evita revelar quais e-mails têm conta).
  redirect(
    "/recuperar-senha?success=" +
      encodeURIComponent("Se esse e-mail estiver cadastrado, enviamos um link para redefinir a senha.")
  );
}
