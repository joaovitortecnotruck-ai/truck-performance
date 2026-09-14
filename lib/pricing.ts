import { getOption, getStage } from "./catalog";

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatOrderValue(value: number) {
  return value > 0 ? formatBRL(value) : "Aguardando valor";
}

export function calculateSubtotal(stageId: string, optionIds: string[]) {
  const stage = getStage(stageId);
  const stageTotal = stage?.preco ?? 0;
  const optionsTotal = optionIds.reduce((sum, id) => sum + (getOption(id)?.preco ?? 0), 0);
  return { stageTotal, optionsTotal, subtotal: stageTotal + optionsTotal };
}

export function calculateTotal(subtotal: number, desconto: number) {
  return Math.max(subtotal - desconto, 0);
}

export function generateOrderId(sequence: number, year = new Date().getFullYear()) {
  return `TP-${year}-${String(sequence).padStart(6, "0")}`;
}
