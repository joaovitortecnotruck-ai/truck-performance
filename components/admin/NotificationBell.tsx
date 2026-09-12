"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotifications } from "./NotificationProvider";

export function NotificationBell() {
  const { orders, unreadCount, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Notificações"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) markAllRead();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-[8px] border border-base-700 bg-base-900 text-ink-500 hover:text-ink-300"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-card border border-base-800 bg-base-900 shadow-card">
          <div className="border-b border-base-800 px-4 py-3 text-[13px] font-semibold text-ink-100">
            Pedidos recentes
          </div>
          <div className="max-h-80 overflow-y-auto">
            {orders.length === 0 && (
              <p className="px-4 py-6 text-center text-[12px] text-ink-500">Nenhum pedido recente.</p>
            )}
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/admin/pedidos/${o.order_number}`}
                onClick={() => setOpen(false)}
                className="flex flex-col gap-0.5 border-b border-base-800 px-4 py-3 text-[12px] last:border-b-0 hover:bg-base-850"
              >
                <span className="font-mono text-ink-100">{o.order_number}</span>
                <span className="truncate text-ink-500">{o.requested_service}</span>
                <span className="text-[11px] text-ink-500">
                  {new Date(o.created_at).toLocaleString("pt-BR")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
