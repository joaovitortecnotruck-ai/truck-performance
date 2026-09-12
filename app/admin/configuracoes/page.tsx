import { Users } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { createClient } from "@/lib/supabase/server";
import { UserRoleForm } from "./UserRoleForm";
import { NotificationBell } from "@/components/admin/NotificationBell";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  client: "Cliente",
  admin: "Admin",
  technician: "Técnico / Tuner",
  reseller: "Revendedor",
  support: "Suporte",
};

export default async function ConfiguracoesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nomeExibido = "Admin";
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
    if (profile?.name) nomeExibido = profile.name;
  }

  const { data: usuarios } = await supabase
    .from("profiles")
    .select("id, name, role, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex min-h-screen bg-base-950">
      <Sidebar variant="admin" />
      <div className="flex-1">
        <Topbar
          title="Configurações"
          subtitle="Preferências da plataforma e da conta administrativa."
          userName={nomeExibido}
          notificationSlot={<NotificationBell />}
        />
        <main className="px-8 py-6">
          <section className="rounded-card border border-base-800 bg-base-900 shadow-card">
            <div className="flex items-center gap-2 border-b border-base-800 px-5 py-4">
              <Users className="h-4 w-4 text-accent" />
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-accent">
                Usuários e permissões
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-base-800 text-[11px] uppercase tracking-wide text-ink-500">
                    <th className="px-5 py-3 font-medium">Usuário</th>
                    <th className="px-5 py-3 font-medium">Cadastrado em</th>
                    <th className="px-5 py-3 font-medium">Papel atual</th>
                    <th className="px-5 py-3 font-medium">Alterar papel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-800">
                  {(usuarios ?? []).map((u) => (
                    <tr key={u.id}>
                      <td className="px-5 py-3 text-ink-100">{u.name || "—"}</td>
                      <td className="px-5 py-3 text-ink-500">
                        {new Date(u.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-5 py-3 text-ink-300">{ROLE_LABEL[u.role] ?? u.role}</td>
                      <td className="px-5 py-3">
                        <UserRoleForm userId={u.id} role={u.role} />
                      </td>
                    </tr>
                  ))}

                  {(usuarios ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-ink-500">
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <p className="mt-4 text-[12px] text-ink-500">
            Integrações de pagamento e notificações serão configuradas aqui nas próximas fases.
          </p>
        </main>
      </div>
    </div>
  );
}
