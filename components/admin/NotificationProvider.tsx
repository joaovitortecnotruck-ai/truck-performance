"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface OrderNotification {
  id: string;
  order_number: string;
  requested_service: string;
  created_at: string;
}

interface NotificationContextValue {
  orders: OrderNotification[];
  unreadCount: number;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const STORAGE_KEY = "tp_admin_last_seen_order_at";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<OrderNotification[]>([]);
  const [lastSeenAt, setLastSeenAt] = useState<string>("");
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) ?? new Date().toISOString();
    setLastSeenAt(stored);

    const supabase = supabaseRef.current;

    (async () => {
      const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, requested_service, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      if (data) setOrders(data);
    })();

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

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
        .channel("admin-new-orders")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "orders" },
          (payload) => {
            const novo = payload.new as OrderNotification;
            setOrders((prev) => [novo, ...prev]);

            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification("Novo pedido recebido!", {
                body: `${novo.order_number} — ${novo.requested_service}`,
                tag: novo.id,
              });
            }
          }
        )
        .subscribe();
    })();

    return () => {
      cancelado = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = orders.filter((o) => o.created_at > lastSeenAt).length;

  function markAllRead() {
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, now);
    setLastSeenAt(now);
  }

  return (
    <NotificationContext.Provider value={{ orders, unreadCount, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications deve ser usado dentro de NotificationProvider");
  return ctx;
}
