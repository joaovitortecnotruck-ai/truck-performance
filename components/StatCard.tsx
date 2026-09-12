import { LucideIcon } from "lucide-react";
import { clsx } from "clsx";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "accent" | "ok" | "warn";
}) {
  return (
    <div className="rounded-card border border-base-800 bg-base-900 p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-ink-500">{label}</span>
        <Icon
          className={clsx(
            "h-4 w-4",
            tone === "accent" && "text-accent",
            tone === "ok" && "text-ok",
            tone === "warn" && "text-warn",
            tone === "default" && "text-ink-500"
          )}
          strokeWidth={2}
        />
      </div>
      <div className="mt-3 font-display text-3xl font-semibold text-ink-100">{value}</div>
    </div>
  );
}
