"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Download, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";

interface FileRow {
  id: string;
  file_type: string;
  original_name: string;
  hw: string | null;
  sw: string | null;
  sha256: string | null;
  size_bytes: number | null;
  created_at: string;
  url: string | null;
  orders:
    | {
        order_number: string;
        profiles: { name: string | null } | { name: string | null }[] | null;
        vehicles: { brand: string; model: string; engine: string | null; ecu_model: string | null } | { brand: string; model: string; engine: string | null; ecu_model: string | null }[] | null;
      }
    | {
        order_number: string;
        profiles: { name: string | null } | { name: string | null }[] | null;
        vehicles: { brand: string; model: string; engine: string | null; ecu_model: string | null } | { brand: string; model: string; engine: string | null; ecu_model: string | null }[] | null;
      }[]
    | null;
}

function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

const TIPO_LABEL: Record<string, string> = {
  original: "Original",
  final: "Modificado",
};

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

export function FilesTable({ arquivos }: { arquivos: FileRow[] }) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return arquivos;
    return arquivos.filter((f) => {
      const order = one(f.orders);
      const cliente = order ? one(order.profiles) : null;
      const veiculo = order ? one(order.vehicles) : null;
      const campos = [
        f.original_name,
        f.hw,
        f.sw,
        order?.order_number,
        cliente?.name,
        veiculo?.brand,
        veiculo?.model,
        veiculo?.engine,
        veiculo?.ecu_model,
      ];
      return campos.some((c) => (c ?? "").toLowerCase().includes(termo));
    });
  }, [arquivos, busca]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por arquivo, cliente, veículo, ECU, HW ou SW..."
          className="h-10 w-full rounded-[8px] border border-base-700 bg-base-900 pl-9 pr-3 text-sm text-ink-100 placeholder:text-ink-500"
        />
      </div>

      <div className="rounded-card border border-base-800 bg-base-900 shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-base-800 text-[11px] uppercase tracking-wide text-ink-500">
                <th className="px-5 py-3 font-medium">Arquivo</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium">Pedido</th>
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Veículo</th>
                <th className="px-5 py-3 font-medium">ECU</th>
                <th className="px-5 py-3 font-medium">HW</th>
                <th className="px-5 py-3 font-medium">SW</th>
                <th className="px-5 py-3 font-medium">Tamanho</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium">Checksum</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-800">
              {filtrados.map((f) => {
                const order = one(f.orders);
                const cliente = order ? one(order.profiles) : null;
                const veiculo = order ? one(order.vehicles) : null;
                return (
                  <tr key={f.id} className="hover:bg-base-850">
                    <td className="max-w-[220px] truncate px-5 py-3 font-mono text-[12px] text-ink-100" title={f.original_name}>
                      {f.original_name}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={clsx(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium",
                          f.file_type === "final" ? "bg-ok/15 text-ok" : "bg-base-700 text-ink-300"
                        )}
                      >
                        {TIPO_LABEL[f.file_type] ?? f.file_type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {order ? (
                        <Link href={`/admin/pedidos/${order.order_number}`} className="font-mono text-[12px] text-ink-100 hover:text-accent">
                          {order.order_number}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-ink-300">{cliente?.name ?? "—"}</td>
                    <td className="px-5 py-3 text-ink-300">
                      {veiculo ? `${veiculo.brand} ${veiculo.model}${veiculo.engine ? " · " + veiculo.engine : ""}` : "—"}
                    </td>
                    <td className="px-5 py-3 font-mono text-[12px] text-ink-500">{veiculo?.ecu_model ?? "—"}</td>
                    <td className="px-5 py-3 font-mono text-[12px] text-ink-300">{f.hw ?? "—"}</td>
                    <td className="px-5 py-3 font-mono text-[12px] text-ink-300">{f.sw ?? "—"}</td>
                    <td className="px-5 py-3 text-ink-500">{formatSize(f.size_bytes)}</td>
                    <td className="px-5 py-3 text-ink-500">{new Date(f.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-5 py-3">
                      {f.sha256 ? (
                        <span
                          title={f.sha256}
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-ok"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {f.sha256.slice(0, 8)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {f.url && (
                        <a href={f.url} className="flex h-8 w-8 items-center justify-center rounded-[8px] text-ink-500 hover:text-accent" title="Baixar">
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-5 py-8 text-center text-ink-500">
                    Nenhum arquivo encontrado.
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
