import { clsx } from "clsx";

export const ORDER_STATUS_META: Record<string, { label: string; tone: string }> = {
  received: { label: "Pedido recebido", tone: "bg-base-700 text-ink-300" },
  recebido: { label: "Pedido recebido", tone: "bg-base-700 text-ink-300" },
  in_review: { label: "Arquivo em análise", tone: "bg-base-700 text-ink-300" },
  em_analise: { label: "Arquivo em análise", tone: "bg-base-700 text-ink-300" },
  in_progress: { label: "Em desenvolvimento", tone: "bg-accent/15 text-accent" },
  em_desenvolvimento: { label: "Em desenvolvimento", tone: "bg-accent/15 text-accent" },
  ready: { label: "Arquivo pronto", tone: "bg-ok/15 text-ok" },
  arquivo_pronto: { label: "Arquivo pronto", tone: "bg-ok/15 text-ok" },
  completed: { label: "Finalizado", tone: "bg-ok/20 text-ok" },
  finalizado: { label: "Finalizado", tone: "bg-ok/20 text-ok" },
  cancelled: { label: "Cancelado", tone: "bg-base-700 text-ink-500 line-through" },
  cancelado: { label: "Cancelado", tone: "bg-base-700 text-ink-500 line-through" },
};

export const ORDER_STATUS_OPTIONS = [
  { value: "received", label: "Pedido recebido" },
  { value: "in_review", label: "Arquivo em análise" },
  { value: "in_progress", label: "Em desenvolvimento" },
  { value: "ready", label: "Arquivo pronto" },
  { value: "completed", label: "Finalizado" },
  { value: "cancelled", label: "Cancelado" },
];

export function OrderStatusBadge({ status }: { status: string }) {
  const meta = ORDER_STATUS_META[status] ?? { label: status, tone: "bg-base-700 text-ink-300" };
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
        meta.tone
      )}
    >
      {meta.label}
    </span>
  );
}

export const PAYMENT_STATUS_META: Record<string, { label: string; tone: string }> = {
  pending: { label: "Pendente", tone: "bg-warn/15 text-warn" },
  pendente: { label: "Pendente", tone: "bg-warn/15 text-warn" },
  paid: { label: "Pago", tone: "bg-ok/15 text-ok" },
  pago: { label: "Pago", tone: "bg-ok/15 text-ok" },
};

export const PAYMENT_STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "paid", label: "Pago" },
];

export function PaymentStatusBadge({ status }: { status: string }) {
  const meta = PAYMENT_STATUS_META[status] ?? { label: status, tone: "bg-base-700 text-ink-500" };
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium", meta.tone)}>
      {meta.label}
    </span>
  );
}
