"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Download, Send, UploadCloud, CheckCircle2, Loader2, BadgeCheck, DollarSign, Wallet } from "lucide-react";
import { clsx } from "clsx";
import { ORDER_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS } from "@/components/StatusBadge";
import { updateOrderStatus, uploadModifiedFile, updateOrderPrice, updatePaymentStatus, updateFileMeta } from "./actions";

function StatusSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={clsx(
        "mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] text-sm font-medium",
        pending ? "cursor-not-allowed bg-base-800 text-ink-500" : "bg-base-700 text-ink-100 hover:bg-base-600"
      )}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
      {pending ? "Atualizando..." : "Atualizar status"}
    </button>
  );
}

function PriceSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={clsx(
        "mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] text-sm font-medium",
        pending ? "cursor-not-allowed bg-base-800 text-ink-500" : "bg-base-700 text-ink-100 hover:bg-base-600"
      )}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
      {pending ? "Salvando..." : "Salvar valor"}
    </button>
  );
}

function PaymentSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={clsx(
        "mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] text-sm font-medium",
        pending ? "cursor-not-allowed bg-base-800 text-ink-500" : "bg-base-700 text-ink-100 hover:bg-base-600"
      )}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
      {pending ? "Salvando..." : "Salvar pagamento"}
    </button>
  );
}

function FileMetaSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={clsx(
        "mt-2 flex h-9 items-center justify-center gap-1.5 rounded-[8px] px-3 text-[12px] font-medium",
        pending ? "cursor-not-allowed bg-base-800 text-ink-500" : "bg-base-700 text-ink-100 hover:bg-base-600"
      )}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
      {pending ? "Salvando..." : "Salvar HW/SW"}
    </button>
  );
}

function UploadSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={clsx(
        "mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[8px] text-sm font-semibold",
        disabled || pending ? "cursor-not-allowed bg-base-800 text-ink-500" : "bg-accent text-white hover:bg-accent-600"
      )}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      {pending ? "Enviando arquivo..." : "Enviar arquivo para o cliente"}
    </button>
  );
}

// Normaliza status antigos em português (dados de demonstração) para o padrão em inglês.
const STATUS_ALIASES: Record<string, string> = {
  recebido: "received",
  em_analise: "in_review",
  em_desenvolvimento: "in_progress",
  em_processamento: "in_progress",
  arquivo_pronto: "ready",
  finalizado: "completed",
  cancelado: "cancelled",
};

const PAYMENT_ALIASES: Record<string, string> = {
  pendente: "pending",
  pago: "paid",
};

interface ArquivoInfo {
  id: string;
  nome: string;
  url?: string | null;
  hw?: string | null;
  sw?: string | null;
}

export function AdminOrderPanel({
  orderNumber,
  orderId,
  clientId,
  status,
  totalPrice,
  paymentStatus,
  arquivoOriginal,
  arquivoModificado,
}: {
  orderNumber: string;
  orderId: string;
  clientId: string;
  status: string;
  totalPrice: number;
  paymentStatus: string;
  arquivoOriginal: ArquivoInfo | null;
  arquivoModificado: ArquivoInfo | null;
}) {
  const [novoArquivo, setNovoArquivo] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <form action={updateOrderStatus}>
        <input type="hidden" name="orderNumber" value={orderNumber} />
        <input type="hidden" name="orderId" value={orderId} />
        <section className="rounded-card border border-base-800 bg-base-900 p-5 shadow-card">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-accent">
            Status do pedido
          </h2>
          <select
            name="status"
            defaultValue={STATUS_ALIASES[status] ?? status}
            className="h-11 w-full rounded-[8px] border border-base-700 bg-base-800 px-3.5 text-sm text-ink-100"
          >
            {ORDER_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <StatusSubmitButton />
        </section>
      </form>

      <form action={updateOrderPrice}>
        <input type="hidden" name="orderNumber" value={orderNumber} />
        <input type="hidden" name="orderId" value={orderId} />
        <section className="rounded-card border border-base-800 bg-base-900 p-5 shadow-card">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-accent">
            Valor do pedido
          </h2>
          <label className="flex flex-col gap-1.5 text-[13px] text-ink-300">
            Valor total (R$)
            <input
              type="number"
              name="totalPrice"
              step="0.01"
              min="0"
              defaultValue={totalPrice.toFixed(2)}
              className="h-11 rounded-[8px] border border-base-700 bg-base-800 px-3.5 text-sm text-ink-100"
            />
          </label>
          <PriceSubmitButton />
          <p className="mt-2 text-[11px] text-ink-500">
            Ajuste manualmente quando o arquivo enviado divergir do que o cliente selecionou (ex:
            marcou Euro 5 mas o veículo é Euro 6), ou para aplicar desconto.
          </p>
        </section>
      </form>

      <form action={updatePaymentStatus}>
        <input type="hidden" name="orderNumber" value={orderNumber} />
        <input type="hidden" name="orderId" value={orderId} />
        <section className="rounded-card border border-base-800 bg-base-900 p-5 shadow-card">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-accent">
            Pagamento
          </h2>
          <select
            name="paymentStatus"
            defaultValue={PAYMENT_ALIASES[paymentStatus] ?? paymentStatus}
            className="h-11 w-full rounded-[8px] border border-base-700 bg-base-800 px-3.5 text-sm text-ink-100"
          >
            {PAYMENT_STATUS_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <PaymentSubmitButton />
        </section>
      </form>

      <section className="rounded-card border border-base-800 bg-base-900 p-5 shadow-card">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-accent">
          Arquivo original
        </h2>
        <div className="flex items-center justify-between rounded-[8px] border border-base-700 bg-base-800 px-3.5 py-2.5">
          <span className="truncate font-mono text-[12px] text-ink-300">
            {arquivoOriginal?.nome ?? "Nenhum arquivo enviado"}
          </span>
        </div>
        <a
          href={arquivoOriginal?.url ?? undefined}
          className={clsx(
            "mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] text-sm font-medium",
            arquivoOriginal?.url ? "bg-base-700 text-ink-100 hover:bg-base-600" : "pointer-events-none cursor-not-allowed bg-base-800 text-ink-500"
          )}
        >
          <Download className="h-4 w-4" />
          Baixar original
        </a>

        {arquivoOriginal && (
          <form action={updateFileMeta} className="mt-3 border-t border-base-800 pt-3">
            <input type="hidden" name="orderNumber" value={orderNumber} />
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="fileId" value={arquivoOriginal.id} />
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-[11px] text-ink-500">
                HW
                <input
                  type="text"
                  name="hw"
                  defaultValue={arquivoOriginal.hw ?? ""}
                  placeholder="Ex: 0281..."
                  className="h-9 rounded-[8px] border border-base-700 bg-base-800 px-2.5 text-[12px] text-ink-100 placeholder:text-ink-600"
                />
              </label>
              <label className="flex flex-col gap-1 text-[11px] text-ink-500">
                SW
                <input
                  type="text"
                  name="sw"
                  defaultValue={arquivoOriginal.sw ?? ""}
                  placeholder="Ex: 1037..."
                  className="h-9 rounded-[8px] border border-base-700 bg-base-800 px-2.5 text-[12px] text-ink-100 placeholder:text-ink-600"
                />
              </label>
            </div>
            <FileMetaSubmitButton />
          </form>
        )}
      </section>

      <form action={uploadModifiedFile}>
        <input type="hidden" name="orderNumber" value={orderNumber} />
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="clientId" value={clientId} />
        <section className="rounded-card border border-base-800 bg-base-900 p-5 shadow-card">
          <h2 className="mb-3 flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-wide text-accent">
            Arquivo modificado
            {arquivoModificado && <BadgeCheck className="h-4 w-4 text-ok" />}
          </h2>
          {arquivoModificado && (
            <p className="mb-2 flex items-center gap-1.5 truncate rounded-[8px] border border-ok/30 bg-ok/10 px-3 py-2 text-[12px] text-ok">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Enviado: {arquivoModificado.nome}</span>
            </p>
          )}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex h-11 cursor-pointer items-center gap-2 rounded-[8px] border border-dashed border-base-600 bg-base-800 px-3.5 text-sm text-ink-500 hover:border-accent/50"
          >
            <UploadCloud className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {novoArquivo ? novoArquivo.name : "Selecionar arquivo modificado"}
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            name="arquivoModificado"
            onChange={(e) => setNovoArquivo(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[11px] text-ink-500">
              HW
              <input
                type="text"
                name="hw"
                defaultValue={arquivoModificado?.hw ?? ""}
                placeholder="Ex: 0281..."
                className="h-9 rounded-[8px] border border-base-700 bg-base-800 px-2.5 text-[12px] text-ink-100 placeholder:text-ink-600"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-ink-500">
              SW
              <input
                type="text"
                name="sw"
                defaultValue={arquivoModificado?.sw ?? ""}
                placeholder="Ex: 1037..."
                className="h-9 rounded-[8px] border border-base-700 bg-base-800 px-2.5 text-[12px] text-ink-100 placeholder:text-ink-600"
              />
            </label>
          </div>
          <UploadSubmitButton disabled={!novoArquivo} />
          <p className="mt-2 text-[11px] text-ink-500">
            Ao enviar, o pedido é marcado automaticamente como "Arquivo pronto". O download só é
            liberado ao cliente após o aceite dos termos obrigatórios.
          </p>
        </section>
      </form>
    </>
  );
}
