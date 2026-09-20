import { notFound } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { formatOrderValue } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/StatusBadge";
import { AdminOrderPanel } from "./AdminOrderPanel";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { OrderChat } from "@/components/OrderChat";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  status_alterado: "Status alterado",
  valor_alterado: "Valor do pedido alterado",
  pagamento_alterado: "Pagamento alterado",
  hw_sw_atualizado: "HW/SW atualizado",
  arquivo_modificado_enviado: "Arquivo modificado enviado",
};

export default async function AdminPedidoDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { error?: string; success?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nomeExibido = "Admin";
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
    if (profile?.name) nomeExibido = profile.name;
  }

  const { data: order } = await supabase
    .from("orders")
    .select("*, vehicles(*), order_items(*), files(*), profiles(name)")
    .eq("order_number", params.id)
    .maybeSingle();

  if (!order) notFound();

  const veiculo = Array.isArray(order.vehicles) ? order.vehicles[0] : order.vehicles;
  const cliente = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
  const arquivoOriginal = order.files?.find((f: any) => f.file_type === "original") ?? null;
  const arquivoModificado = order.files?.find((f: any) => f.file_type === "final") ?? null;

  let urlOriginal: string | null = null;
  if (arquivoOriginal) {
    const { data } = await supabase.storage.from("ecu-files").createSignedUrl(arquivoOriginal.storage_path, 600);
    urlOriginal = data?.signedUrl ?? null;
  }

  const { data: mensagens } = await supabase
    .from("messages")
    .select("id, sender_id, body, internal, created_at")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });

  const { data: logs } = await supabase
    .from("activity_logs")
    .select("id, action, details, created_at, profiles(name)")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: aceites } = await supabase
    .from("term_acceptances")
    .select("id, accepted_at, ip_address, terms(title)")
    .eq("order_id", order.id)
    .order("accepted_at", { ascending: false });

  return (
    <div className="flex min-h-screen bg-base-950">
      <Sidebar variant="admin" />
      <div className="flex-1">
        <Topbar
          title={order.order_number}
          subtitle="Tela administrativa do pedido"
          userName={nomeExibido}
          notificationSlot={<NotificationBell />}
        />

        <main className="grid grid-cols-1 gap-6 px-8 py-6 xl:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-6">
            {searchParams?.success && (
              <p className="rounded-[8px] border border-ok/30 bg-ok/10 px-3.5 py-2.5 text-[13px] text-ok">
                {searchParams.success}
              </p>
            )}
            {searchParams?.error && (
              <p className="rounded-[8px] border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-400">
                {searchParams.error}
              </p>
            )}

            <section className="rounded-card border border-base-800 bg-base-900 p-5 shadow-card">
              <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-accent">
                Cliente
              </h2>
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <Info label="Cliente" value={cliente?.name ?? "—"} />
                <Info label="Criado em" value={new Date(order.created_at).toLocaleString("pt-BR")} />
              </div>
            </section>

            <section className="rounded-card border border-base-800 bg-base-900 p-5 shadow-card">
              <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-accent">
                Veículo
              </h2>
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                <Info label="Marca" value={veiculo?.brand ?? "—"} />
                <Info label="Modelo" value={veiculo?.model ?? "—"} />
                <Info label="Motor" value={veiculo?.engine ?? "—"} />
                <Info label="Ano" value={String(veiculo?.year ?? "—")} />
                <Info label="KM" value={String(veiculo?.mileage ?? "—")} />
                <Info label="Placa" value={veiculo?.plate ?? "—"} mono />
                <Info label="ECU" value={veiculo?.ecu_model ?? "—"} mono />
                <Info label="Método de leitura" value={order.read_method ?? "—"} />
              </div>
            </section>

            <section className="rounded-card border border-base-800 bg-base-900 p-5 shadow-card">
              <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-accent">
                Serviço
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {order.order_items?.map((item: any) => (
                  <span key={item.id} className="rounded-full border border-base-700 bg-base-800 px-3 py-1 text-[12px] text-ink-300">
                    {item.service_name}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-base-800 pt-4">
                <span className="text-sm text-ink-500">Valor total</span>
                <span className={`font-display text-lg font-semibold ${Number(order.total_price) > 0 ? "text-ink-100" : "text-warn"}`}>
                  {formatOrderValue(Number(order.total_price))}
                </span>
              </div>
            </section>

            {aceites && aceites.length > 0 && (
              <section className="rounded-card border border-base-800 bg-base-900 p-5 shadow-card">
                <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-accent">
                  Termos aceitos pelo cliente
                </h2>
                <ul className="flex flex-col gap-2 text-sm">
                  {aceites.map((a: any) => {
                    const termo = Array.isArray(a.terms) ? a.terms[0] : a.terms;
                    return (
                      <li key={a.id} className="flex items-center justify-between text-ink-300">
                        <span>{termo?.title ?? "Termo"}</span>
                        <span className="text-[12px] text-ink-500">
                          {new Date(a.accepted_at).toLocaleString("pt-BR")}
                          {a.ip_address ? ` · ${a.ip_address}` : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {logs && logs.length > 0 && (
              <section className="rounded-card border border-base-800 bg-base-900 p-5 shadow-card">
                <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-accent">
                  Histórico de alterações
                </h2>
                <ul className="flex flex-col gap-2.5 text-sm">
                  {logs.map((log: any) => {
                    const autor = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
                    return (
                      <li key={log.id} className="flex flex-col gap-0.5 border-b border-base-800 pb-2.5 last:border-b-0 last:pb-0">
                        <div className="flex items-center justify-between">
                          <span className="text-ink-100">{ACTION_LABEL[log.action] ?? log.action}</span>
                          <span className="text-[11px] text-ink-500">{new Date(log.created_at).toLocaleString("pt-BR")}</span>
                        </div>
                        <span className="text-[12px] text-ink-500">
                          {autor?.name ?? "—"}
                          {log.details && "de" in log.details && "para" in log.details
                            ? ` · ${log.details.de ?? "—"} → ${log.details.para}`
                            : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <OrderChat
              orderId={order.id}
              clientId={order.client_id}
              currentUserId={user?.id ?? ""}
              initialMessages={mensagens ?? []}
              canSeeInternal={true}
            />
          </div>

          <div className="flex flex-col gap-6">
            <section className="rounded-card border border-base-800 bg-base-900 p-5 shadow-card">
              <div className="flex items-center gap-2">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.payment_status} />
              </div>
            </section>

            <AdminOrderPanel
              orderNumber={order.order_number}
              orderId={order.id}
              clientId={order.client_id}
              status={order.status}
              totalPrice={Number(order.total_price)}
              paymentStatus={order.payment_status}
              arquivoOriginal={
                arquivoOriginal
                  ? { id: arquivoOriginal.id, nome: arquivoOriginal.original_name, url: urlOriginal, hw: arquivoOriginal.hw, sw: arquivoOriginal.sw }
                  : null
              }
              arquivoModificado={
                arquivoModificado
                  ? { id: arquivoModificado.id, nome: arquivoModificado.original_name, hw: arquivoModificado.hw, sw: arquivoModificado.sw }
                  : null
              }
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[12px] text-ink-500">{label}</div>
      <div className={`mt-0.5 text-ink-100 ${mono ? "font-mono text-[13px]" : ""}`}>{value}</div>
    </div>
  );
}
