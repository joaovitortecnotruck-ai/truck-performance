import Image from "next/image";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Image src="/logo-icon.png" alt="Truck Performance" width={36} height={36} className="h-9 w-9 rounded-[6px] shadow-glow" />

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
