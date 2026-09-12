import { ServiceOption, Stage } from "./types";

// Catálogo inicial. Em produção isso vem da tabela `pricing` no Supabase,
// cadastrável pelo administrador por ECU / veículo / motorização / Stage.
export const STAGES: Stage[] = [
  {
    id: "original",
    nome: "Original",
    descricao: "Restaura o arquivo original de fábrica na ECU",
    preco: 300,
    ganhoPotencia: "+0 cv",
    ganhoTorque: "+0 kgfm",
  },
  {
    id: "stage1",
    nome: "Stage 1",
    descricao: "Ganho moderado de performance, seguro para uso diário",
    preco: 800,
    ganhoPotencia: "+46 cv",
    ganhoTorque: "+10 kgfm",
  },
  {
    id: "stage2",
    nome: "Stage 2",
    descricao: "Alto ganho de performance, requer bomba/injetores em dia",
    preco: 1200,
    ganhoPotencia: "+70 cv",
    ganhoTorque: "+16 kgfm",
  },
  {
    id: "stage3",
    nome: "Stage 3",
    descricao: "Máximo desempenho, recomendado para uso com upgrades",
    preco: 1800,
    ganhoPotencia: "+95 cv",
    ganhoTorque: "+22 kgfm",
  },
  {
    id: "stage4",
    nome: "Stage 4",
    descricao: "Preparação extrema, avaliação técnica obrigatória",
    preco: 2600,
  },
  {
    id: "custom",
    nome: "Custom",
    descricao: "Calibração sob medida conforme sua necessidade",
    preco: 0,
  },
];

export const ADICIONAIS: ServiceOption[] = [
  { id: "hardcut", categoria: "adicional", nome: "Hardcut", descricao: "Corte de câmbio esportivo", preco: 150 },
  { id: "hard-smoke", categoria: "adicional", nome: "Hard Smoke", descricao: "Fumaça controlada em aceleração", preco: 200 },
  { id: "pops-bangs", categoria: "adicional", nome: "Pops & Bangs", descricao: "Estalos no escapamento em desaceleração", preco: 200 },
  { id: "launch-control", categoria: "adicional", nome: "Launch Control", descricao: "Controle de largada", preco: 150 },
  { id: "anti-lag", categoria: "adicional", nome: "Anti-Lag", descricao: "Reduz o turbo lag em competição", preco: 250 },
  { id: "mapas-extras", categoria: "adicional", nome: "Mapas Extras", descricao: "Mapas adicionais selecionáveis", preco: 150 },
  { id: "speed-limiter", categoria: "adicional", nome: "Speed Limiter", descricao: "Ajuste do limitador de velocidade", preco: 100 },
  { id: "rpm-limiter", categoria: "adicional", nome: "RPM Limiter", descricao: "Ajuste do limitador de rotação", preco: 100 },
  { id: "start-stop", categoria: "adicional", nome: "Start/Stop OFF", descricao: "Desativação do sistema start/stop", preco: 100 },
  { id: "multimapa", categoria: "adicional", nome: "Multimapa", descricao: "Seleção de mapas via botão/switch", preco: 250 },
  { id: "outros", categoria: "adicional", nome: "Outros", descricao: "A combinar com o administrador", preco: 0 },
];

export const EMISSOES: ServiceOption[] = [
  { id: "egr-off", categoria: "emissao", nome: "EGR OFF", descricao: "Desativação lógica/física do EGR", preco: 200 },
  { id: "dpf-off", categoria: "emissao", nome: "DPF OFF", descricao: "Desativação lógica do DPF", preco: 200 },
  { id: "scr-off", categoria: "emissao", nome: "SCR OFF", descricao: "Desativação do sistema SCR", preco: 250 },
  { id: "adblue-off", categoria: "emissao", nome: "ARLA / AdBlue OFF", descricao: "Desativação do sistema de AdBlue", preco: 250 },
];

export const ALL_OPTIONS: ServiceOption[] = [...ADICIONAIS, ...EMISSOES];

export function getStage(id: string) {
  return STAGES.find((s) => s.id === id);
}

export function getOption(id: string) {
  return ALL_OPTIONS.find((o) => o.id === id);
}
