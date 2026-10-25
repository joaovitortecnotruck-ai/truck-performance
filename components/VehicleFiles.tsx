import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatOrderValue } from "@/lib/pricing";
import { OrderStatusBadge } from "@/components/StatusBadge";
import { grantExtraDownload } from "@/app/admin/pedidos/[id]/actions";

// Histórico de arquivos do mesmo carro (placa normalizada).
// Cliente: o RLS de vehicles/orders/files já limita aos dele; o filtro por client_id é uma segunda trava.
export async function VehicleFiles({
  vehicle,
  orderNumber,
  orderId,
  clientId,
  isAdmin,
}: {
  vehicle: { id: string; plate_norm?: string | null } | null;
  orderNumber: string;
  orderId: string;
  clientId: string;
  isAdmin: boolean;
}) {
  if (!vehicle) return null;
  const supabase = createClient();

  let vehicleIds = [vehicle.id];
  if (vehicle.plate_norm) {
    let q = supabase.from("vehicles").select("id").eq("plate_norm", vehicle.plate_norm);
    if (!isAdmin) q = q.eq("client_id", clientId);
    const { data } = await q;
    if (data?.length) vehicleIds = data.map((v) => v.id);
  }

  let q = supabase
    .from("files")
    .select(
      "id, file_type, original_name, hw, sw, storage_path, created_at, downloads_used, downloads_allowed, profiles(name), orders!inner(id, order_number, status, total_price, client_id, vehicle_id, vehicles(ecu_model))"
    )
    .in("orders.vehicle_id", vehicleIds)
    .order("created_at", { ascending: false });
  if (!isAdmin) q = q.eq("orders.client_id", clientId);
  const { data: arquivos } = await q;
  if (!arquivos?.length) return null;

  let urls: Record<string, string> = {};
  if (isAdmin) {
    const { data } = await supabase.storage.from("ecu-files").createSignedUrls(
      arquivos.map((f) => f.storage_path),
      600
    );
    urls = Object.fromEntries((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
  }

  const um = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? x[0] ?? null : x);
  const base = isAdmin ? "/admin/pedidos" : "/pedidos";

  const linhas = arquivos.map((f) => {
    const o = um(f.orders as any) as any;
    const final = f.file_type === "final";
    const esgotado = f.downloads_used >= f.downloads_allowed;
    const acao = isAdmin ? (
      <div className="flex items-center gap-3">
        {urls[f.storage_path] && (
          <a href={urls[f.storage_path]} className="text-ink-300 hover:text-accent">
            Baixar
          </a>
        )}
        {final && (
          <span className="text-ink-500">
            {f.downloads_used}/{f.downloads_allowed}
          </span>
        )}
        {final && esgotado && (
          <form action={grantExtraDownload}>
            <input type="hidden" name="orderNumber" value={orderNumber} />
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="fileId" value={f.id} />
            <button
              type="submit"
              title="Liberar novo download para o cliente"
              className="flex items-center gap-1 text-accent hover:text-accent-600"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Liberar
            </button>
          </form>
        )}
      </div>
    ) : final ? (
      esgotado ? (
        <span className="text-ink-500">Já baixado</span>
      ) : (
        <Link href={`/pedidos/${o?.order_number}`} className="text-accent hover:text-accent-600">
          Disponível
        </Link>
      )
    ) : (
      <span className="text-ink-500">—</span>
    );
    return {
      f,
      o,
      final,
      acao,
      ecu: um(o?.vehicles as any)?.ecu_model as string | undefined,
      autor: (um(f.profiles as any) as { name: string } | null)?.name ?? "—",
      atual: o?.order_number === orderNumber,
      data: new Date(f.created_at).toLocaleDateString("pt-BR"),
      valor: formatOrderValue(Number(o?.total_price ?? 0)),
    };
  });

  return (
    <section className="rounded-card border border-base-800 bg-base-900 p-5 shadow-card">
      <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-accent">
        Arquivos deste veículo
      </h2>

      {/* celular: cartões */}
      <ul className="flex flex-col gap-3 sm:hidden">
        {linhas.map(({ f, o, final, acao, ecu, autor, atual, data, valor }) => (
          <li
            key={f.id}
            className={`rounded-[8px] border p-3.5 text-[12.5px] ${atual ? "border-accent/40 bg-accent/5" : "border-base-800 bg-base-800/40"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <Link href={`${base}/${o?.order_number}`} className="font-mono text-ink-100 hover:text-accent">
                {o?.order_number}
              </Link>
              {o && <OrderStatusBadge status={o.status} />}
            </div>
            <div className={`mt-2 text-[10.5px] font-semibold uppercase ${final ? "text-accent" : "text-ink-500"}`}>
              {final ? "Modificado" : "Original"}
            </div>
            <div className="break-all font-mono text-ink-300">{f.original_name}</div>
            <div className="mt-1.5 font-mono text-[11.5px] text-ink-500">
              {ecu ?? "—"} · HW {f.hw ?? "—"} · SW {f.sw ?? "—"}
            </div>
            <div className="mt-1 text-ink-500">
              {data} · {valor}
              {isAdmin && ` · ${autor}`}
            </div>
            <div className="mt-2.5 border-t border-base-800 pt-2.5">{acao}</div>
          </li>
        ))}
      </ul>

      {/* tablet/desktop: tabela */}
      <div className="-mx-5 hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[720px] text-left text-[12.5px]">
          <thead className="text-[11px] uppercase tracking-wide text-ink-500">
            <tr className="border-b border-base-800">
              <th className="px-5 py-2 font-medium">Data</th>
              <th className="px-3 py-2 font-medium">Pedido</th>
              <th className="px-3 py-2 font-medium">Arquivo</th>
              <th className="px-3 py-2 font-medium">ECU / HW / SW</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Valor</th>
              {isAdmin && <th className="px-3 py-2 font-medium">Enviado por</th>}
              <th className="px-5 py-2 font-medium">Download</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ f, o, final, acao, ecu, autor, atual, data, valor }) => (
              <tr key={f.id} className={`border-b border-base-800 last:border-b-0 ${atual ? "bg-accent/5" : ""}`}>
                <td className="whitespace-nowrap px-5 py-2.5 text-ink-500">{data}</td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <Link href={`${base}/${o?.order_number}`} className="font-mono text-ink-100 hover:text-accent">
                    {o?.order_number}
                  </Link>
                </td>
                <td className="max-w-[200px] px-3 py-2.5">
                  <div className={`text-[10.5px] font-semibold uppercase ${final ? "text-accent" : "text-ink-500"}`}>
                    {final ? "Modificado" : "Original"}
                  </div>
                  <div className="truncate font-mono text-ink-300" title={f.original_name}>
                    {f.original_name}
                  </div>
                </td>
                <td className="px-3 py-2.5 font-mono text-[11.5px] text-ink-300">
                  <div>{ecu ?? "—"}</div>
                  <div className="text-ink-500">
                    {f.hw ?? "—"} / {f.sw ?? "—"}
                  </div>
                </td>
                <td className="px-3 py-2.5">{o && <OrderStatusBadge status={o.status} />}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-300">{valor}</td>
                {isAdmin && <td className="px-3 py-2.5 text-ink-300">{autor}</td>}
                <td className="whitespace-nowrap px-5 py-2.5">{acao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
