"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Lock } from "lucide-react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  sender_id: string;
  body: string;
  internal: boolean;
  created_at: string;
}

export function OrderChat({
  orderId,
  clientId,
  currentUserId,
  initialMessages,
  canSeeInternal,
}: {
  orderId: string;
  clientId: string;
  currentUserId: string;
  initialMessages: Message[];
  canSeeInternal: boolean;
}) {
  const [msgs, setMsgs] = useState<Message[]>(initialMessages);
  const [texto, setTexto] = useState("");
  const [interno, setInterno] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelado = false;

    (async () => {
      // Garante que o Realtime já tem o token de autenticação antes de assinar o
      // canal — sem isso, as políticas de segurança (RLS) podem bloquear os
      // eventos silenciosamente, mesmo com uma sessão válida.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
      if (cancelado) return;

      channel = supabase
        .channel(`order-messages-${orderId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `order_id=eq.${orderId}` },
          (payload) => {
            const nova = payload.new as Message;
            setMsgs((prev) => (prev.some((m) => m.id === nova.id) ? prev : [...prev, nova]));
          }
        )
        .subscribe();
    })();

    return () => {
      cancelado = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [orderId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs]);

  const visiveis = canSeeInternal ? msgs : msgs.filter((m) => !m.internal);

  async function enviar() {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    const supabase = createClient();
    const { error } = await supabase.from("messages").insert({
      order_id: orderId,
      client_id: clientId,
      sender_id: currentUserId,
      body: texto.trim(),
      internal: canSeeInternal ? interno : false,
    });
    if (!error) {
      setTexto("");
      setInterno(false);
    }
    setEnviando(false);
  }

  return (
    <section className="flex flex-col rounded-card border border-base-800 bg-base-900 p-5 shadow-card">
      <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-accent">
        Mensagens do pedido
      </h2>

      <div ref={scrollRef} className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
        {visiveis.length === 0 && (
          <p className="text-[13px] text-ink-500">Nenhuma mensagem ainda. Envie uma dúvida sobre o seu pedido.</p>
        )}
        {visiveis.map((m) => {
          const minha = m.sender_id === currentUserId;
          const doCliente = m.sender_id === clientId;
          return (
            <div key={m.id} className={clsx("flex", minha ? "justify-end" : "justify-start")}>
              <div
                className={clsx(
                  "max-w-[80%] rounded-[10px] px-3.5 py-2.5 text-[13px] leading-relaxed",
                  m.internal
                    ? "border border-warn/30 bg-warn/10 text-warn"
                    : minha
                    ? "bg-accent/15 text-ink-100"
                    : "bg-base-800 text-ink-300"
                )}
              >
                {!minha && (
                  <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-ink-500">
                    {doCliente ? "Cliente" : "Equipe Truck Performance"}
                  </div>
                )}
                {m.internal && (
                  <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-warn">
                    <Lock className="h-3 w-3" /> nota interna
                  </div>
                )}
                {m.body}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-base-800 pt-4">
        {canSeeInternal && (
          <label className="flex items-center gap-2 text-[12px] text-ink-500">
            <input
              type="checkbox"
              checked={interno}
              onChange={(e) => setInterno(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-base-600 bg-base-800 accent-warn"
            />
            Nota interna (não visível ao cliente)
          </label>
        )}
        <div className="flex items-center gap-2">
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
            disabled={enviando || !texto.trim()}
            className={clsx(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] text-white",
              enviando || !texto.trim() ? "cursor-not-allowed bg-base-700" : "bg-accent hover:bg-accent-600"
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
