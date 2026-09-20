import { ClipboardList, Clock, CheckCircle2, DollarSign, Users, FileStack } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { StatCard } from "@/components/StatCard";
import { OrderStatusBadge } from "@/components/StatusBadge";
import { formatBRL, formatOrderValue } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "@/components/admin/NotificationBell";
import Link from "next/link";

export const dynamic = "force-dynamic";

const NOVOS = ["received", "recebido"];
const EM_ANDAMENTO = [
  "in_review",
  "in_progress",
  "ready",
  "em_analise",
  "em_desenvolvimento",
  "em_processamento",
  "arquivo_pronto",
];
const FINALIZADOS = ["completed", "finalizado"];
const CANCELADOS = ["cancelled", "cancelado"];

function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nomeExibido = "Admin";
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
    if (profile?.name) nomeExibido = profile.name;
  }

  const [{ data: pedidos }, { count: totalArquivos }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, requested_service, status, total_price, created_at, client_id, vehicles(brand, model)")
      .order("created_at", { ascending: false }),
    supabase.from("files").select("id", { count: "exact", head: true }),
  ]);

  const todosPedidos = pedidos ?? [];
  const novos = todosPedidos.filter((p) => NOVOS.includes(p.status));
  const emAndamento = todosPedidos.filter((p) => EM_ANDAMENTO.includes(p.status));
  const finalizados = todosPedidos.filter((p) => FINALIZADOS.includes(p.status));
  const faturamentoTotal = todosPedidos
    .filter((p) => !CANCELADOS.includes(p.status))
    .reduce((s, p) => s + Number(p.total_price), 0);
  const clientesAtivos = new Set(todosPedidos.map((p) => p.client_id)).size;
  const recentes = todosPedidos.slice(0, 10);

  return (
    <div className="flex min-h-screen bg-base-950">
      <Sidebar variant="admin" />
      <div className="flex-1">
        <Topbar
          title="Painel administrativo"
          subtitle="Visão geral dos pedidos e faturamento."
          userName={nomeExibido}
          notificationSlot={<NotificationBell />}
        />

        <main className="px-8 py-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Pedidos novos" value={novos.length} icon={ClipboardList} />
            <StatCard label="Em andamento" value={emAndamento.length} icon={Clock} tone="accent" />
            <StatCard label="Finalizados" value={finalizados.length} icon={CheckCircle2} tone="ok" />
            <StatCard label="Faturamento total" value={formatBRL(faturamentoTotal)} icon={DollarSign} tone="ok" />
            <StatCard label="Clientes ativos" value={clientesAtivos} icon={Users} />
            <StatCard label="Total de arquivos" value={totalArquivos ?? 0} icon={FileStack} />
            <StatCard label="Total de pedidos" value={todosPedidos.length} icon={ClipboardList} />
          </div>

          <div className="mt-8 rounded-card border border-base-800 bg-base-900 shadow-card">
            <div className="flex items-center justify-between border-b border-base-800 px-5 py-4">
              <h2 className="font-display text-base font-semibold text-ink-100">Pedidos recentes</h2>
              <Link href="/admin/pedidos" className="text-[12px] font-medium text-ink-300 hover:text-accent">
                Ver todos
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-base-800 text-[11px] uppercase tracking-wide text-ink-500">
                    <th className="px-5 py-3 font-medium">Pedido</th>
                    <th className="px-5 py-3 font-medium">Veículo</th>
                    <th className="px-5 py-3 font-medium">Serviço</th>
                    <th className="px-5 py-3 font-medium">Valor</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-800">
                  {recentes.map((p) => {
                    const veiculo = one(p.vehicles);
                    return (
                      <tr key={p.id}>
                        <td className="px-5 py-3">
                          <Link href={`/admin/pedidos/${p.order_number}`} className="font-mono text-[12px] text-ink-100 hover:text-accent">
                            {p.order_number}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-ink-300">
                          {veiculo?.brand} {veiculo?.model}
                        </td>
                        <td className="px-5 py-3 text-ink-300">{p.requested_service}</td>
                        <td className={`px-5 py-3 ${Number(p.total_price) > 0 ? "text-ink-100" : "font-medium text-warn"}`}>
                          {formatOrderValue(Number(p.total_price))}
                        </td>
                        <td className="px-5 py-3">
                          <OrderStatusBadge status={p.status} />
                        </td>
                      </tr>
                    );
                  })}

                  {recentes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-ink-500">
                        Nenhum pedido ainda.
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
