"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  FilePlus2,
  ListChecks,
  LifeBuoy,
  ShieldCheck,
  Users,
  Tags,
  Database,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "./Logo";

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
}

const ICONS = {
  dashboard: LayoutDashboard,
  novoPedido: FilePlus2,
  pedidos: ListChecks,
  suporte: LifeBuoy,
  admin: ShieldCheck,
  clientes: Users,
  precos: Tags,
  banco: Database,
  config: Settings,
};

const CLIENT_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/novo-pedido", label: "Novo pedido", icon: "novoPedido" },
  { href: "/dashboard#pedidos", label: "Meus pedidos", icon: "pedidos" },
  { href: "/dashboard#suporte", label: "Suporte", icon: "suporte" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/pedidos", label: "Pedidos", icon: "pedidos" },
  { href: "/admin/clientes", label: "Clientes", icon: "clientes" },
  { href: "/admin/precificacao", label: "Precificação", icon: "precos" },
  { href: "/admin/banco-de-arquivos", label: "Banco de arquivos", icon: "banco" },
  { href: "/admin/configuracoes", label: "Configurações", icon: "config" },
];

export function Sidebar({ variant }: { variant: "cliente" | "admin" }) {
  const pathname = usePathname();
  const items = variant === "admin" ? ADMIN_NAV : CLIENT_NAV;
  // celular/tablet: barra no topo + menu em gaveta; desktop (lg+): menu lateral fixo
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-base-800 bg-base-950 px-4 py-3 lg:hidden">
        <Logo />
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={() => setAberto(true)}
          className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-base-700 text-ink-300"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
      {aberto && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setAberto(false)} />}
      <aside
        onClick={(e) => (e.target as HTMLElement).closest("a") && setAberto(false)}
        className={clsx(
          "w-[248px] shrink-0 flex-col border-r border-base-800 bg-base-950 px-4 py-6",
          "lg:sticky lg:top-0 lg:flex lg:h-screen",
          aberto ? "fixed inset-y-0 left-0 z-50 flex overflow-y-auto" : "hidden"
        )}
      >
        <div className="flex items-center justify-between px-1">
          <Logo />
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setAberto(false)}
            className="text-ink-500 hover:text-ink-300 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {variant === "admin" && (
          <div className="mt-4 inline-flex items-center gap-1.5 self-start rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
            Painel administrativo
          </div>
        )}

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = pathname === item.href.split("#")[0];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "group flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-[14px] transition-colors",
                  active
                    ? "bg-accent/12 text-ink-100"
                    : "text-ink-500 hover:bg-base-900 hover:text-ink-300"
                )}
              >
                <Icon
                  className={clsx("h-[18px] w-[18px]", active ? "text-accent" : "text-ink-500 group-hover:text-ink-300")}
                  strokeWidth={2}
                />
                {item.label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-1 border-t border-base-800 pt-4">
          {variant === "cliente" ? (
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-[13px] text-ink-500 hover:bg-base-900 hover:text-ink-300"
            >
              <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2} />
              Painel administrativo
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-[13px] text-ink-500 hover:bg-base-900 hover:text-ink-300"
            >
              <LayoutDashboard className="h-[18px] w-[18px]" strokeWidth={2} />
              Área do cliente
            </Link>
          )}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-[13px] text-ink-500 hover:bg-base-900 hover:text-ink-300"
            >
              <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
              Sair
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
