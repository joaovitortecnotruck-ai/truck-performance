"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Save, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";

interface ServiceRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  active: boolean;
}

const CATEGORY_LABEL: Record<string, string> = {
  stage: "Stages",
  optional: "Opcionais",
  emissions: "Sistemas de emissões",
};

export function PricingTable({ services }: { services: ServiceRow[] }) {
  const router = useRouter();
  const [precos, setPrecos] = useState<Record<string, number>>(
    Object.fromEntries(services.map((s) => [s.id, s.price]))
  );
  const [ativos, setAtivos] = useState<Record<string, boolean>>(
    Object.fromEntries(services.map((s) => [s.id, s.active]))
  );
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  // Ressincroniza o estado local sempre que os dados vêm atualizados do servidor
  // (ex: depois de um router.refresh() após salvar).
  useEffect(() => {
    setPrecos(Object.fromEntries(services.map((s) => [s.id, s.price])));
    setAtivos(Object.fromEntries(services.map((s) => [s.id, s.active])));
  }, [services]);

  const porCategoria = useMemo(() => {
    const grupos: Record<string, ServiceRow[]> = {};
    for (const s of services) {
      grupos[s.category] ??= [];
      grupos[s.category].push(s);
    }
    return grupos;
  }, [services]);

  const alterados = services.filter(
    (s) => precos[s.id] !== s.price || ativos[s.id] !== s.active
  );

  async function salvar() {
    setSalvando(true);
    setMensagem(null);
    const supabase = createClient();

    const resultados = await Promise.all(
      alterados.map((s) =>
        supabase
          .from("services")
          .update({ price: precos[s.id], active: ativos[s.id] })
          .eq("id", s.id)
      )
    );

    const comErro = resultados.some((r) => r.error);
    setSalvando(false);
    setMensagem(comErro ? "Algo deu errado ao salvar. Tente novamente." : "Preços atualizados com sucesso!");
    if (!comErro) router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-2 rounded-[8px] border border-base-700 bg-base-900 p-3.5 text-[12px] text-ink-500">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        Esses valores são usados direto na tela de "Novo pedido" dos clientes. Desativar um item
        faz ele parar de aparecer como opção, sem apagar o histórico de pedidos já feitos com ele.
      </div>

      {mensagem && (
        <p
          className={clsx(
            "rounded-[8px] border px-3.5 py-2.5 text-[13px]",
            mensagem.includes("sucesso")
              ? "border-ok/30 bg-ok/10 text-ok"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          )}
        >
          {mensagem}
        </p>
      )}

      {Object.entries(porCategoria).map(([categoria, itens]) => (
        <section key={categoria} className="rounded-card border border-base-800 bg-base-900 shadow-card">
          <div className="border-b border-base-800 px-5 py-4">
            <h2 className="font-display text-sm font-semibold text-ink-100">
              {CATEGORY_LABEL[categoria] ?? categoria}
            </h2>
          </div>
          <div className="divide-y divide-base-800">
            {itens.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={ativos[s.id]}
                    onChange={(e) => setAtivos((p) => ({ ...p, [s.id]: e.target.checked }))}
                    title="Ativo"
                    className="h-4 w-4 rounded border-base-600 bg-base-800 accent-accent"
                  />
                  <div className={clsx(!ativos[s.id] && "opacity-40")}>
                    <div className="text-sm text-ink-100">{s.name}</div>
                    <div className="text-[12px] text-ink-500">{s.description ?? s.code}</div>
                  </div>
                </div>
                <PriceInput
                  value={precos[s.id]}
                  onChange={(v) => setPrecos((p) => ({ ...p, [s.id]: v }))}
                />
              </div>
            ))}
          </div>
        </section>
      ))}

      <button
        type="button"
        onClick={salvar}
        disabled={salvando || alterados.length === 0}
        className={clsx(
          "flex h-11 w-fit items-center justify-center gap-2 self-end rounded-[8px] px-5 text-sm font-semibold",
          salvando || alterados.length === 0
            ? "cursor-not-allowed bg-base-800 text-ink-500"
            : "bg-accent text-white hover:bg-accent-600"
        )}
      >
        {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {salvando ? "Salvando..." : alterados.length > 0 ? `Salvar alterações (${alterados.length})` : "Salvar alterações"}
      </button>
    </div>
  );
}

function PriceInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5 rounded-[8px] border border-base-700 bg-base-800 px-3 py-2">
      <span className="text-[12px] text-ink-500">R$</span>
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 bg-transparent text-right text-sm text-ink-100 outline-none"
      />
    </div>
  );
}
