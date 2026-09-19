"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, FileUp, Info, X } from "lucide-react";
import { clsx } from "clsx";
import { createOrder } from "./actions";

const METODOS_LEITURA = ["OBD", "BENCH", "BOOT", "JTAG", "OUTRO"];

export interface ServiceRow {
  code: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
}

export interface VeiculoSalvo {
  id: string;
  brand: string;
  model: string;
  engine: string | null;
  year: number | null;
  mileage: number | null;
  plate: string;
  ecu_model: string | null;
  tcu_model: string | null;
}

const VEICULO_VAZIO = { marca: "", modelo: "", motorizacao: "", ano: "", km: "", placa: "", ecu: "", tcu: "" };

export function NovoPedidoForm({
  services,
  veiculosSalvos,
}: {
  services: ServiceRow[];
  veiculosSalvos: VeiculoSalvo[];
}) {
  const stages = useMemo(() => services.filter((s) => s.category === "stage"), [services]);
  const adicionais = useMemo(() => services.filter((s) => s.category === "optional"), [services]);
  const emissoes = useMemo(() => services.filter((s) => s.category === "emissions"), [services]);

  const [stage, setStage] = useState<string>(stages[0]?.code ?? "");
  const [opcionais, setOpcionais] = useState<string[]>([]);
  const [emissoesLiberado, setEmissoesLiberado] = useState(false);
  const [euroStandard, setEuroStandard] = useState<"euro5" | "euro6" | "">("");
  const [emissoesOpcionais, setEmissoesOpcionais] = useState<string[]>([]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [declaracao, setDeclaracao] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [vehicleId, setVehicleId] = useState("");
  const [veiculo, setVeiculo] = useState(VEICULO_VAZIO);

  function handleSelectVeiculo(id: string) {
    setVehicleId(id);
    if (!id) {
      setVeiculo(VEICULO_VAZIO);
      return;
    }
    const v = veiculosSalvos.find((v) => v.id === id);
    if (v) {
      setVeiculo({
        marca: v.brand,
        modelo: v.model,
        motorizacao: v.engine ?? "",
        ano: v.year ? String(v.year) : "",
        km: v.mileage ? String(v.mileage) : "",
        placa: v.plate,
        ecu: v.ecu_model ?? "",
        tcu: v.tcu_model ?? "",
      });
    }
  }

  function campoVeiculo(chave: keyof typeof VEICULO_VAZIO) {
    return {
      value: veiculo[chave],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setVeiculo((v) => ({ ...v, [chave]: e.target.value })),
    };
  }

  const emissoesVisiveis = emissoes.filter((o) => {
    if (o.code === "SCR_OFF_EURO5") return euroStandard === "euro5";
    if (o.code === "SCR_OFF_EURO6") return euroStandard === "euro6";
    return true;
  });

  function handleEuroStandardChange(value: "euro5" | "euro6" | "") {
    setEuroStandard(value);
    setEmissoesOpcionais((prev) =>
      prev.filter((code) => {
        if (code === "SCR_OFF_EURO5") return value === "euro5";
        if (code === "SCR_OFF_EURO6") return value === "euro6";
        return true;
      })
    );
  }

  const stageAtual = services.find((s) => s.code === stage);
  const todosOpcionais = [...opcionais, ...emissoesOpcionais];

  function toggleOpcional(id: string) {
    setOpcionais((prev) => (prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]));
  }

  function toggleEmissao(id: string) {
    if (!emissoesLiberado) return;
    setEmissoesOpcionais((prev) => (prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]));
  }

  const podeEnviar = arquivo !== null && declaracao && stage !== "";

  return (
    <form action={createOrder} className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
      <input type="hidden" name="stageCode" value={stage} />
      {todosOpcionais.map((code) => (
        <input key={code} type="hidden" name="opcionais" value={code} />
      ))}

      <div className="flex flex-col gap-6">
        {/* ETAPA 1 — Veículo */}
        <Section title="Dados do veículo">
          <input type="hidden" name="vehicleId" value={vehicleId} />

          {veiculosSalvos.length > 0 && (
            <label className="mb-4 flex flex-col gap-1.5 text-[13px] text-ink-300">
              Veículo já cadastrado
              <select
                value={vehicleId}
                onChange={(e) => handleSelectVeiculo(e.target.value)}
                className="h-11 rounded-[8px] border border-base-700 bg-base-800 px-3.5 text-sm text-ink-100"
              >
                <option value="">+ Novo veículo</option>
                {veiculosSalvos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.brand} {v.model} — {v.plate}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Marca" name="marca" placeholder="Ex: Volkswagen" required {...campoVeiculo("marca")} />
            <Field label="Modelo" name="modelo" placeholder="Ex: Amarok" required {...campoVeiculo("modelo")} />
            <Field label="Motorização" name="motorizacao" placeholder="Ex: 3.0 V6 TDI" required {...campoVeiculo("motorizacao")} />
            <Field label="Ano" name="ano" placeholder="Ex: 2022" required {...campoVeiculo("ano")} />
            <Field label="Quilometragem" name="km" placeholder="Ex: 80.000" required {...campoVeiculo("km")} />
            <Field label="Placa do veículo" name="placa" placeholder="Ex: ABC1D23" required {...campoVeiculo("placa")} />
            <Field label="Modelo da ECU (opcional)" name="ecu" placeholder="Ex: Bosch EDC17CP54" {...campoVeiculo("ecu")} />
            <Field label="Modelo da TCU (opcional)" name="tcu" placeholder="Ex: 6R80 / DQ381..." {...campoVeiculo("tcu")} />
            <SelectField label="Equipamento utilizado" name="equipamento" options={["Selecione", "KESS3", "K-TAG", "PCMflash", "Flex", "CMD Flash", "Outro"]} />
            <SelectField label="Método de leitura" name="metodo" options={METODOS_LEITURA} defaultValue="OBD" />
          </div>
          <label className="mt-4 flex flex-col gap-1.5 text-[13px] text-ink-300">
            Serviço desejado
            <textarea
              name="descricaoServico"
              rows={3}
              placeholder="Descreva exatamente o que deseja no arquivo..."
              className="rounded-[8px] border border-base-700 bg-base-800 px-3.5 py-2.5 text-sm text-ink-100 placeholder:text-ink-500"
            />
          </label>
        </Section>

        {/* ETAPA 2 — Serviço principal */}
        <Section title="Serviço principal">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {stages.map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => setStage(s.code)}
                className={clsx(
                  "flex items-start gap-3 rounded-[8px] border px-4 py-3.5 text-left transition-colors",
                  stage === s.code
                    ? "border-accent bg-accent/10"
                    : "border-base-700 bg-base-800 hover:border-base-600"
                )}
              >
                <span
                  className={clsx(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                    stage === s.code ? "border-accent" : "border-base-600"
                  )}
                >
                  {stage === s.code && <span className="h-2 w-2 rounded-full bg-accent" />}
                </span>
                <div>
                  <div className="text-sm font-medium text-ink-100">{s.name}</div>
                  <div className="mt-0.5 text-[12px] text-ink-500">{s.description}</div>
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* ETAPA 3 — Opcionais */}
        <Section title="Opcionais / adicionais">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {adicionais.map((o) => (
              <OptionRow
                key={o.code}
                nome={o.name}
                descricao={o.description ?? ""}
                checked={opcionais.includes(o.code)}
                onToggle={() => toggleOpcional(o.code)}
              />
            ))}
          </div>
        </Section>

        {/* ETAPA 4 — Sistemas de emissões */}
        <Section title="Sistemas de emissões (EGR / DPF / SCR / ARLA)">
          <div className="flex items-start gap-3 rounded-[8px] border border-warn/30 bg-warn/10 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
            <div className="text-[12.5px] leading-relaxed text-ink-300">
              <span className="font-semibold text-warn">Atenção: </span>
              alterações relacionadas aos sistemas de controle de emissões podem possuir
              restrições legais para utilização em veículos destinados à circulação em vias
              públicas. Os serviços desta área são destinados exclusivamente a aplicações
              permitidas — competição, desenvolvimento, testes, exportação ou uso fora de vias
              públicas, conforme legislação aplicável.
              <label className="mt-3 flex items-start gap-2 text-[12.5px] text-ink-300">
                <input
                  type="checkbox"
                  checked={emissoesLiberado}
                  onChange={(e) => setEmissoesLiberado(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-base-600 bg-base-800 accent-warn"
                />
                Li e estou de acordo com as condições acima.
              </label>
            </div>
          </div>

          <div className={clsx("mt-3", !emissoesLiberado && "pointer-events-none opacity-40")}>
            <label className="flex flex-col gap-1.5 text-[13px] text-ink-300">
              Padrão de emissões do veículo
              <select
                value={euroStandard}
                onChange={(e) => handleEuroStandardChange(e.target.value as "euro5" | "euro6" | "")}
                className="h-11 w-full rounded-[8px] border border-base-700 bg-base-800 px-3.5 text-sm text-ink-100 sm:w-64"
              >
                <option value="">Selecione...</option>
                <option value="euro5">Euro 5</option>
                <option value="euro6">Euro 6</option>
              </select>
            </label>

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {emissoesVisiveis.map((o) => (
                <OptionRow
                  key={o.code}
                  nome={o.name}
                  descricao={o.description ?? ""}
                  checked={emissoesOpcionais.includes(o.code)}
                  onToggle={() => toggleEmissao(o.code)}
                />
              ))}
              {!euroStandard && (
                <p className="col-span-full text-[12px] text-ink-500">
                  Selecione o padrão de emissões acima para liberar a opção de SCR/ARLA.
                </p>
              )}
            </div>
          </div>
        </Section>

        {/* Informações adicionais / upload */}
        <Section title="Informações adicionais">
          <label className="flex flex-col gap-1.5 text-[13px] text-ink-300">
            Arquivo original *
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex h-11 cursor-pointer items-center gap-2 rounded-[8px] border border-dashed border-base-600 bg-base-800 px-3.5 text-sm text-ink-500 hover:border-accent/50"
            >
              <FileUp className="h-4 w-4 shrink-0" />
              {arquivo ? (
                <span className="flex items-center gap-2 truncate text-ink-100">
                  {arquivo.name}
                  <span className="text-[11px] text-ink-500">
                    ({(arquivo.size / 1024).toFixed(0)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setArquivo(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="ml-1 text-ink-500 hover:text-accent"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ) : (
                "Escolher arquivo — nenhum arquivo escolhido"
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              name="arquivoOriginal"
              accept=".bin,.ori,.mod,.hex,.mpc,.eep,.zip,.rar"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>

          <div className="mt-4 flex items-start gap-2 rounded-[8px] border border-base-700 bg-base-800 p-3.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
            <p className="text-[12px] leading-relaxed text-ink-500">
              <span className="font-medium text-ink-300">Importante:</span> confira placa, veículo,
              arquivo e método de leitura antes de enviar. Esses dados ficarão vinculados ao
              histórico técnico do pedido.
            </p>
          </div>

          <label className="mt-4 flex items-start gap-2 text-[12.5px] text-ink-300">
            <input
              type="checkbox"
              name="declaracao"
              checked={declaracao}
              onChange={(e) => setDeclaracao(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 rounded border-base-600 bg-base-800 accent-accent"
            />
            Declaro que as informações fornecidas correspondem ao veículo e módulo deste pedido.
          </label>
        </Section>
      </div>

      {/* Resumo do pedido */}
      <aside className="xl:sticky xl:top-6 xl:h-fit">
        <div className="rounded-card border border-base-800 bg-base-900 p-5 shadow-card">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-accent">
            Resumo do pedido
          </h3>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-ink-500">Serviço principal</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-sm">
            <span className="text-ink-100">{stageAtual?.name ?? "—"}</span>
          </div>

          {todosOpcionais.length > 0 && (
            <>
              <div className="mt-4 text-sm text-ink-500">
                Opcionais selecionados ({todosOpcionais.length})
              </div>
              <ul className="mt-1 flex flex-col gap-1.5">
                {services
                  .filter((o) => todosOpcionais.includes(o.code))
                  .map((o) => (
                    <li key={o.code} className="flex items-center gap-1.5 text-sm">
                      <Check className="h-3.5 w-3.5 text-ok" />
                      <span className="text-ink-300">{o.name}</span>
                    </li>
                  ))}
              </ul>
            </>
          )}

          <div className="mt-4 flex items-start gap-2 rounded-[8px] border border-base-700 bg-base-800 p-3">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-500" />
            <p className="text-[11px] leading-relaxed text-ink-500">
              O valor do pedido será definido pela equipe Truck Performance após a análise do
              arquivo, e ficará visível no seu pedido.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={!podeEnviar}
          className={clsx(
            "mt-4 flex h-12 w-full items-center justify-center rounded-[8px] text-sm font-semibold transition-colors",
            podeEnviar
              ? "bg-accent text-white hover:bg-accent-600"
              : "cursor-not-allowed bg-base-800 text-ink-500"
          )}
        >
          Enviar pedido
        </button>
        {!podeEnviar && (
          <p className="mt-2 text-center text-[11px] text-ink-500">
            Anexe o arquivo original e confirme a declaração para enviar.
          </p>
        )}
      </aside>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-base-800 bg-base-900 p-5 shadow-card">
      <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-accent">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] text-ink-300">
      {label} {required && <span className="text-accent">*</span>}
      <input
        {...props}
        required={required}
        className="h-11 rounded-[8px] border border-base-700 bg-base-800 px-3.5 text-sm text-ink-100 placeholder:text-ink-500"
      />
    </label>
  );
}

function SelectField({
  label,
  options,
  defaultValue,
  name,
}: {
  label: string;
  options: string[];
  defaultValue?: string;
  name: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] text-ink-300">
      {label}
      <select
        name={name}
        defaultValue={defaultValue ?? options[0]}
        className="h-11 rounded-[8px] border border-base-700 bg-base-800 px-3.5 text-sm text-ink-100"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function OptionRow({
  nome,
  descricao,
  checked,
  onToggle,
}: {
  nome: string;
  descricao: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={clsx(
        "flex items-start gap-2.5 rounded-[8px] border px-3.5 py-3 text-left transition-colors",
        checked ? "border-accent bg-accent/10" : "border-base-700 bg-base-800 hover:border-base-600"
      )}
    >
      <span
        className={clsx(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border-2",
          checked ? "border-accent bg-accent" : "border-base-600"
        )}
      >
        {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </span>
      <div>
        <div className="text-[13px] font-medium text-ink-100">{nome}</div>
        <div className="text-[11.5px] text-ink-500">{descricao}</div>
      </div>
    </button>
  );
}
