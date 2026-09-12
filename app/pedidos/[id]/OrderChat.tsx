"use client";

import { useState } from "react";
import { Paperclip, Send } from "lucide-react";
import { clsx } from "clsx";
import { OrderMessage } from "@/lib/types";

export function OrderChat({ mensagens }: { mensagens: OrderMessage[] }) {
  const [texto, setTexto] = useState("");
  const [msgs, setMsgs] = useState(mensagens);

  function enviar() {
    if (!texto.trim()) return;
    setMsgs((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, autor: "cliente", texto, criadoEm: new Date().toISOString() },
    ]);
    setTexto("");
  }

  return (
    <section className="flex flex-col rounded-card border border-base-800 bg-base-900 p-5 shadow-card">
      <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-accent">
        Mensagens do pedido
      </h2>

      <div className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
        {msgs.length === 0 && (
          <p className="text-[13px] text-ink-500">Nenhuma mensagem ainda. Envie uma dúvida sobre o seu pedido.</p>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={clsx("flex", m.autor === "cliente" ? "justify-end" : "justify-start")}>
            <div
              className={clsx(
                "max-w-[80%] rounded-[10px] px-3.5 py-2.5 text-[13px] leading-relaxed",
                m.autor === "cliente" ? "bg-accent/15 text-ink-100" : "bg-base-800 text-ink-300"
              )}
            >
              {m.texto}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-base-800 pt-4">
        <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-base-700 text-ink-500 hover:text-ink-300">
          <Paperclip className="h-4 w-4" />
        </button>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
          placeholder="Escreva uma mensagem..."
          className="h-10 flex-1 rounded-[8px] border border-base-700 bg-base-800 px-3.5 text-[13px] text-ink-100 placeholder:text-ink-500"
        />
        <button
          type="button"
          onClick={enviar}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-accent text-white hover:bg-accent-600"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
