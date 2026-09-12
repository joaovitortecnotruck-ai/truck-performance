import Link from "next/link";
import { ClipboardList, Clock, CheckCircle2, Wallet, Plus, LifeBuoy } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { StatCard } from "@/components/StatCard";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/StatusBadge";
import { formatBRL } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

const CONCLUIDO = ["finalizado", "completed"];
const CANCELADO = ["cancelado", "cancelled"];

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { success?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nomeExibido = user?.email ?? "Cliente";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.name) nomeExibido = profile.name;
  }

  const { data: pedidosData } = await supabase
    .from("orders")
    .select("id, order_number, requested_service, status, payment_status, total_price, created_at, vehicles(brand, model, engine, plate)")
    .eq("client_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  const meusPedidos = pedidosData ?? [];
  const emAndamento = meusPedidos.filter((o) => !CONCLUIDO.includes(o.status) && !CANCELADO.includes(o.status));
  const finalizados = meusPedidos.filter((o) => CONCLUIDO.includes(o.status));
  const valorTotal = meusPedidos.reduce((sum, o) => sum + Number(o.total_price), 0);

  return (
    <div className="flex min-h-screen bg-base-950">
      <Sidebar variant="cliente" />

      <div className="flex-1">
        <Topbar title="Dashboard" subtitle="Acompanhe seus pedidos e arquivos." userName={nomeExibido} />

        <main className="px-8 py-6">
          {searchParams?.success && (
            <p className="mb-6 rounded-[8px] border border-ok/30 bg-ok/10 px-3.5 py-2.5 text-[13px] text-ok">
              {searchParams.success}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total de pedidos" value={meusPedidos.length} icon={ClipboardList} />
            <StatCard label="Em processamento" value={emAndamento.length} icon={Clock} tone="accent" />
            <StatCard label="Finalizados" value={finalizados.length} icon={CheckCircle2} tone="ok" />
            <StatCard label="Valor total" value={formatBRL(valorTotal)} icon={Wallet} tone="warn" />
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/novo-pedido"
              className="flex flex-1 items-center justify-between rounded-card border border-accent/30 bg-gradient-to-br from-accent/15 to-base-900 p-5 shadow-card transition-colors hover:from-accent/20"
            >
              <div>
                <div className="font-display text-lg font-semibold text-ink-100">Novo pedido</div>
                <div className="mt-1 text-[13px] text-ink-500">
                  Envie um arquivo original e escolha o serviço desejado.
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white">
                <Plus className="h-5 w-5" />
              </div>
            </Link>

            <a
              href="#suporte"
              id="suporte"
              className="flex flex-1 items-center justify-between rounded-card border border-base-800 bg-base-900 p-5 shadow-card transition-colors hover:border-base-700"
            >
              <div>
                <div className="font-display text-lg font-semibold text-ink-100">Suporte</div>
                <div className="mt-1 text-[13px] text-ink-500">
                  Fale com a equipe Truck Performance sobre um pedido.
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-base-700 text-ink-300">
                <LifeBuoy className="h-5 w-5" />
              </div>
            </a>
          </div>

          <div id="pedidos" className="mt-8 rounded-card border border-base-800 bg-base-900 shadow-card">
            <div className="flex items-center justify-between border-b border-base-800 px-5 py-4">
              <h2 className="font-display text-base font-semibold text-ink-100">Meus pedidos</h2>
              <span className="text-[12px] text-ink-500">{meusPedidos.length} pedido(s)</span>
            </div>

            <div className="divide-y divide-base-800">
              {meusPedidos.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-ink-500">
                  Você ainda não tem pedidos. Clique em "Novo pedido" para enviar o primeiro.
                </p>
              )}
              {meusPedidos.map((order) => {
                const veiculo = Array.isArray(order.vehicles) ? order.vehicles[0] : order.vehicles;
                return (
                  <Link
                    key={order.id}
                    href={`/pedidos/${order.order_number}`}
                    className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-base-850 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12px] text-ink-500">{order.order_number}</span>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <div className="mt-1 text-sm text-ink-100">
                        {veiculo?.brand} {veiculo?.model} {veiculo?.engine ? `· ${veiculo.engine}` : ""}
                      </div>
                      <div className="text-[12px] text-ink-500">Placa {veiculo?.plate}</div>
                    </div>

                    <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1.5">
                      <PaymentStatusBadge status={order.payment_status} />
                      <span className="font-display text-sm font-semibold text-ink-100">
                        {formatBRL(Number(order.total_price))}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
