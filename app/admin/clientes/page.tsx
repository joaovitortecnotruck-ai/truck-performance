import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { formatBRL } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "@/components/admin/NotificationBell";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nomeExibido = "Admin";
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
    if (profile?.name) nomeExibido = profile.name;
  }

  const [{ data: clientes }, { data: pedidos }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, document, phone, whatsapp, city, state")
      .eq("role", "client"),
    supabase.from("orders").select("client_id, total_price"),
  ]);

  const stats = new Map<string, { pedidos: number; total: number }>();
  for (const o of pedidos ?? []) {
    const atual = stats.get(o.client_id) ?? { pedidos: 0, total: 0 };
    atual.pedidos += 1;
    atual.total += Number(o.total_price);
    stats.set(o.client_id, atual);
  }

  const linhas = (clientes ?? [])
    .map((c) => ({ ...c, ...(stats.get(c.id) ?? { pedidos: 0, total: 0 }) }))
    .sort((a, b) => b.pedidos - a.pedidos);

  return (
    <div className="flex min-h-screen bg-base-950">
      <Sidebar variant="admin" />
      <div className="flex-1">
        <Topbar
          title="Clientes"
          subtitle="Clientes com pedidos na plataforma."
          userName={nomeExibido}
          notificationSlot={<NotificationBell />}
        />
        <main className="px-8 py-6">
          <div className="rounded-card border border-base-800 bg-base-900 shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-base-800 text-[11px] uppercase tracking-wide text-ink-500">
                    <th className="px-5 py-3 font-medium">Cliente</th>
                    <th className="px-5 py-3 font-medium">CPF/CNPJ</th>
                    <th className="px-5 py-3 font-medium">Telefone</th>
                    <th className="px-5 py-3 font-medium">WhatsApp</th>
                    <th className="px-5 py-3 font-medium">Cidade/UF</th>
                    <th className="px-5 py-3 font-medium">Pedidos</th>
                    <th className="px-5 py-3 font-medium">Total gasto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-800">
                  {linhas.map((c) => (
                    <tr key={c.id}>
                      <td className="px-5 py-3 text-ink-100">{c.name || "—"}</td>
                      <td className="px-5 py-3 font-mono text-[12px] text-ink-300">{c.document || "—"}</td>
                      <td className="px-5 py-3 text-ink-300">{c.phone || "—"}</td>
                      <td className="px-5 py-3 text-ink-300">{c.whatsapp || "—"}</td>
                      <td className="px-5 py-3 text-ink-300">
                        {c.city ? `${c.city}${c.state ? "/" + c.state : ""}` : "—"}
                      </td>
                      <td className="px-5 py-3 text-ink-300">{c.pedidos}</td>
                      <td className="px-5 py-3 text-ink-100">{formatBRL(c.total)}</td>
                    </tr>
                  ))}

                  {linhas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-ink-500">
                        Nenhum cliente cadastrado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
