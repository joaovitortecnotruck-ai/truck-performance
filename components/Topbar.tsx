import { Bell } from "lucide-react";
import { PartnerBadge } from "./Logo";

export function Topbar({
  title,
  subtitle,
  userName,
  notificationSlot,
}: {
  title: string;
  subtitle?: string;
  userName?: string;
  notificationSlot?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-base-800 px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-100">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <PartnerBadge />
        {notificationSlot ?? (
          <button
            type="button"
            aria-label="Notificações"
            className="relative flex h-9 w-9 items-center justify-center rounded-[8px] border border-base-700 bg-base-900 text-ink-500 hover:text-ink-300"
          >
            <Bell className="h-4 w-4" />
          </button>
        )}
        {userName && (
          <div className="flex h-9 items-center gap-2 rounded-[8px] border border-base-700 bg-base-900 pl-3 pr-1">
            <span className="text-sm text-ink-300">{userName}</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-base-700 font-display text-xs font-semibold text-ink-100">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
