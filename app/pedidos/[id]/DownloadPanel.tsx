"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Download, FileDown, Lock, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { confirmDownload } from "./actions";

const TERMO_LEITURA_GRAVACAO =
  "Declaro que compreendo os riscos envolvidos nos procedimentos de leitura e gravação da ECU/TCU e que sou responsável pelas condições elétricas, mecânicas e operacionais do veículo e dos equipamentos utilizados.";

interface ArquivoOriginalInfo {
  nome: string;
  url: string | null;
}

interface ArquivoModificadoInfo {
  id: string;
  nome: string;
}

function DownloadSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={clsx(
        "mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-[8px] text-sm font-semibold transition-colors",
        disabled || pending
          ? "cursor-not-allowed bg-base-800 text-ink-500"
          : "bg-accent text-white hover:bg-accent-600"
      )}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : disabled ? <Lock className="h-4 w-4" /> : <Download className="h-4 w-4" />}
      {pending ? "Baixando..." : "Baixar arquivo"}
    </button>
  );
}

export function DownloadPanel({
  orderNumber,
  orderId,
  status,
  emissionsRelated,
  termReadWriteId,
  termEmissionsId,
  arquivoOriginal,
  arquivoModificado,
}: {
  orderNumber: string;
  orderId: string;
  status: string;
  emissionsRelated: boolean;
  termReadWriteId: string;
  termEmissionsId: string;
  arquivoOriginal: ArquivoOriginalInfo | null;
  arquivoModificado: ArquivoModificadoInfo | null;
}) {
  const [aceiteLeitura, setAceiteLeitura] = useState(false);
  const [aceiteEmissoes, setAceiteEmissoes] = useState(false);

  const termosOk = aceiteLeitura && (!emissionsRelated || aceiteEmissoes);
  const podeBaixar = status !== "cancelado" && status !== "cancelled" && !!arquivoModificado && termosOk;

  return (
    <section className="rounded-card border border-base-800 bg-base-900 p-5 shadow-card">
      <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-accent">
        Arquivos
      </h2>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-base-800 text-ink-500">
            <FileDown className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[13px] text-ink-100">Arquivo original</div>
            <div className="font-mono text-[11px] text-ink-500">
              {arquivoOriginal ? arquivoOriginal.nome : "Ainda não disponível"}
            </div>
          </div>
        </div>
        {arquivoOriginal?.url && (
          <a href={arquivoOriginal.url} className="text-[12px] font-medium text-ink-300 hover:text-accent">
            Baixar original
          </a>
        )}
      </div>

      <div className="mt-3 border-t border-base-800 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-accent/15 text-accent">
              <FileDown className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[13px] text-ink-100">Arquivo modificado</div>
              <div className="font-mono text-[11px] text-ink-500">
                {arquivoModificado ? arquivoModificado.nome : "Ainda não disponível"}
              </div>
            </div>
          </div>
          {arquivoModificado && !termosOk && <Lock className="h-4 w-4 text-ink-500" />}
        </div>
      </div>

      {arquivoModificado && (
        <form action={confirmDownload}>
          <input type="hidden" name="orderNumber" value={orderNumber} />
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="fileId" value={arquivoModificado.id} />
          <input type="hidden" name="termReadWriteId" value={termReadWriteId} />
          <input type="hidden" name="termEmissionsId" value={termEmissionsId} />
          <input type="hidden" name="emissionsRelated" value={String(emissionsRelated)} />

          <div className="mt-4 flex flex-col gap-3 border-t border-base-800 pt-4">
            <label className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-300">
              <input
                type="checkbox"
                checked={aceiteLeitura}
                onChange={(e) => setAceiteLeitura(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-base-600 bg-base-800 accent-accent"
              />
              {TERMO_LEITURA_GRAVACAO}
            </label>

            {emissionsRelated && (
              <label className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-300">
                <input
                  type="checkbox"
                  checked={aceiteEmissoes}
                  onChange={(e) => setAceiteEmissoes(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-base-600 bg-base-800 accent-accent"
                />
                Reafirmo o aceite do termo sobre sistemas de emissões para este pedido.
              </label>
            )}

            <DownloadSubmitButton disabled={!podeBaixar} />
            <p className="text-[11px] text-ink-500">
              Ao baixar, o aceite dos termos acima fica registrado com data, hora e IP.
            </p>
          </div>
        </form>
      )}
    </section>
  );
}
