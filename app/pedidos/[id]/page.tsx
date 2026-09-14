import { notFound } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/StatusBadge";
import { StatusTimeline } from "@/components/StatusTimeline";
import { formatOrderValue } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { DownloadPanel } from "./DownloadPanel";
import { OrderChat } from "@/components/OrderChat";

export const dynamic = "force-dynamic";

export default async function PedidoDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  let nomeExibido = user.email ?? "Cliente";
  const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
  if (profile?.name) nomeExibido = profile.name;

  const { data: order } = await supabase
    .from("orders")
    .select("*, vehicles(*), order_items(*), files(*)")
    .eq("order_number", params.id)
    .eq("client_id", user.id)
    .maybeSingle();

  if (!order) notFound();

  const veiculo = Array.isArray(order.vehicles) ? order.vehicles[0] : order.vehicles;
  const arquivoOriginal = order.files?.find((f: any) => f.file_type === "original") ?? null;
  const arquivoModificado = order.files?.find((f: any) => f.file_type === "final") ?? null;

  async function signUrl(path: string) {
    const { data } = await supabase.storage.from("ecu-files").createSignedUrl(path, 600);
    return data?.signedUrl ?? null;
  }

  const urlOriginal = arquivoOriginal ? await signUrl(arquivoOriginal.storage_path) : null;

  const { data: terms } = await supabase.from("terms").select("id, code").eq("active", true);
  const termReadWriteId = terms?.find((t) => t.code === "READ_WRITE")?.id ?? "";
  const termEmissionsId = terms?.find((t) => t.code === "EMISSIONS")?.id ?? "";

  const { data: mensagens } = await supabase
    .from("messages")
    .select("id, sender_id, body, internal, created_at")
    .eq("order_id", order.id)
    .eq("internal", false)
    .order("created_at", { ascending: true });

  return (
    <div className="flex min-h-screen bg-base-950">
      <Sidebar variant="cliente" />
      <div className="flex-1">
        <Topbar title={order.order_number} subtitle="Detalhes do pedido" userName={nomeExibido} />

        <main className="grid grid-cols-1 gap-6 px-8 py-6 xl:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-6">
            <section className="rounded-card border border-base-800 bg-base-900 p-5 shadow-card">
              <div className="flex flex-wrap items-center gap-2">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.payment_status} />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <Info label="Veículo" value={`${veiculo?.brand ?? ""} ${veiculo?.model ?? ""}`} />
                <Info label="Motorização" value={veiculo?.engine ?? "—"} />
                <Info label="Placa" value={veiculo?.plate ?? "—"} mono />
                <Info label="ECU" value={veiculo?.ecu_model ?? "—"} mono />
                <Info label="Serviço" value={order.requested_service} />
                <Info label="Valor total" value={formatOrderValue(Number(order.total_price))} />
              </div>

              {order.order_items?.length > 0 && (
                <div className="mt-4 border-t border-base-800 pt-4">
                  <div className="text-[12px] text-ink-500">Itens do pedido</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {order.order_items.map((item: any) => (
                      <span
                        key={item.id}
                        className="rounded-full border border-base-700 bg-base-800 px-2.5 py-1 text-[11px] text-ink-300"
                      >
                        {item.service_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-card border border-base-800 bg-base-900 p-5 shadow-card">
              <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-accent">
                Andamento do pedido
              </h2>
              <StatusTimeline status={order.status} />
            </section>

            <OrderChat
              orderId={order.id}
              clientId={order.client_id}
              currentUserId={user.id}
              initialMessages={mensagens ?? []}
              canSeeInternal={false}
            />
          </div>

          <div className="flex flex-col gap-6">
            <DownloadPanel
              orderNumber={order.order_number}
              orderId={order.id}
              status={order.status}
              emissionsRelated={order.emissions_related}
              termReadWriteId={termReadWriteId}
              termEmissionsId={termEmissionsId}
              arquivoOriginal={arquivoOriginal ? { nome: arquivoOriginal.original_name, url: urlOriginal } : null}
              arquivoModificado={arquivoModificado ? { id: arquivoModificado.id, nome: arquivoModificado.original_name } : null}
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
