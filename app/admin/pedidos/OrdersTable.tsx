"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { OrderStatusBadge, ORDER_STATUS_OPTIONS, PaymentStatusBadge } from "@/components/StatusBadge";
import { formatBRL } from "@/lib/pricing";

interface PedidoRow {
  id: string;
  order_number: string;
  requested_service: string;
  status: string;
  payment_status: string;
  total_price: number;
  created_at: string;
  vehicles: { brand: string; model: string; plate: string; ecu_model: string | null } | { brand: string; model: string; plate: string; ecu_model: string | null }[] | null;
  profiles: { name: string | null } | { name: string | null }[] | null;
}

function one<T>(v: T | T[] | null): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}

export function OrdersTable({ pedidos }: { pedidos: PedidoRow[] }) {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<string>("todos");

  const filtrados = useMemo(() => {
    return pedidos.filter((p) => {
      const veiculo = one(p.vehicles);
      const termo = busca.trim().toLowerCase();
      const bateBusca =
        !termo ||
        p.order_number.toLowerCase().includes(termo) ||
        (veiculo?.plate ?? "").toLowerCase().includes(termo) ||
        `${veiculo?.brand ?? ""} ${veiculo?.model ?? ""}`.toLowerCase().includes(termo);
      const bateStatus = status === "todos" || p.status === status;
      return bateBusca && bateStatus;
    });
  }, [pedidos, busca, status]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por pedido, placa ou veículo..."
            className="h-10 w-full rounded-[8px] border border-base-700 bg-base-900 pl-9 pr-3 text-sm text-ink-100 placeholder:text-ink-500"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-[8px] border border-base-700 bg-base-900 px-3 text-sm text-ink-300"
        >
          <option value="todos">Todos os status</option>
          {ORDER_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-card border border-base-800 bg-base-900 shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-base-800 text-[11px] uppercase tracking-wide text-ink-500">
                <th className="px-5 py-3 font-medium">Pedido</th>
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Veículo</th>
                <th className="px-5 py-3 font-medium">ECU</th>
                <th className="px-5 py-3 font-medium">Serviço</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium">Valor</th>
                <th className="px-5 py-3 font-medium">Pagamento</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-800">
              {filtrados.map((p) => {
                const veiculo = one(p.vehicles);
                const cliente = one(p.profiles);
                return (
                  <tr key={p.id} className="hover:bg-base-850">
                    <td className="px-5 py-3">
                      <Link href={`/admin/pedidos/${p.order_number}`} className="font-mono text-[12px] text-ink-100 hover:text-accent">
                        {p.order_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-ink-300">{cliente?.name ?? "—"}</td>
                    <td className="px-5 py-3 text-ink-300">
                      {veiculo?.brand} {veiculo?.model} · {veiculo?.plate}
                    </td>
                    <td className="px-5 py-3 font-mono text-[12px] text-ink-500">{veiculo?.ecu_model ?? "—"}</td>
                    <td className="px-5 py-3 text-ink-300">{p.requested_service}</td>
                    <td className="px-5 py-3 text-ink-500">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-5 py-3 text-ink-100">{formatBRL(Number(p.total_price))}</td>
                    <td className="px-5 py-3">
                      <PaymentStatusBadge status={p.payment_status} />
                    </td>
                    <td className="px-5 py-3">
                      <OrderStatusBadge status={p.status} />
                    </td>
                  </tr>
                );
              })}

              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-ink-500">
                    Nenhum pedido encontrado com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
