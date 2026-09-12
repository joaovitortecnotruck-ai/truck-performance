import { Gauge } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-accent shadow-glow">
        <Gauge className="h-5 w-5 text-white" strokeWidth={2.5} />
      </div>
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-[19px] font-bold uppercase tracking-wide text-ink-100">
            Truck<span className="text-accent">Performance</span>
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-ink-500">
            Plataforma de Remapeamento
          </div>
        </div>
      )}
    </div>
  );
}

export function PartnerBadge() {
  return (
    <div className="flex items-center gap-2 rounded-full border border-base-700 bg-base-900 px-3 py-1.5 text-[11px] text-ink-500">
      <span>em parceria com</span>
      <span className="font-display font-semibold tracking-wide text-ink-300">Diesel Master</span>
    </div>
  );
}
