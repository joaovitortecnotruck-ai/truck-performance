import { Check } from "lucide-react";
import { clsx } from "clsx";
import { ORDER_STATUS_META } from "./StatusBadge";

const FLOW = ["received", "in_review", "in_progress", "ready", "completed"];

// Aceita tanto os status em inglês (produção) quanto em português (dados de demonstração antigos).
const ALIASES: Record<string, string> = {
  recebido: "received",
  em_analise: "in_review",
  em_desenvolvimento: "in_progress",
  em_processamento: "in_progress",
  arquivo_pronto: "ready",
  finalizado: "completed",
  cancelado: "cancelled",
};

export function StatusTimeline({ status }: { status: string }) {
  const normalizado = ALIASES[status] ?? status;

  if (normalizado === "cancelled") {
    return (
      <div className="rounded-card border border-base-700 bg-base-900 p-4 text-sm text-ink-500">
        Este pedido foi cancelado.
      </div>
    );
  }

  const currentIndex = FLOW.indexOf(normalizado);

  return (
    <ol className="flex flex-col gap-0">
      {FLOW.map((step, i) => {
        const done = currentIndex >= 0 && i < currentIndex;
        const current = i === currentIndex;
        const isLast = i === FLOW.length - 1;
        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={clsx(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px]",
                  done && "border-ok bg-ok/15 text-ok",
                  current && "border-accent bg-accent/15 text-accent",
                  !done && !current && "border-base-700 bg-base-900 text-ink-500"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {!isLast && (
                <div
                  className={clsx(
                    "w-px flex-1 min-h-[22px]",
                    done ? "bg-ok/40" : "bg-base-700"
                  )}
                />
              )}
            </div>
            <div className={clsx("pb-6 text-sm", current ? "text-ink-100" : done ? "text-ink-300" : "text-ink-500")}>
              {ORDER_STATUS_META[step]?.label ?? step}
              {current && (
                <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-accent">
                  <span className="h-1.5 w-1.5 animate-progress-pulse rounded-full bg-accent" />
                  em andamento
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
