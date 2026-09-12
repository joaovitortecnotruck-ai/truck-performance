// Tipos de domínio da plataforma Truck Performance
// Espelham as tabelas planejadas no Supabase (ver supabase/schema.sql)

export type UserRole = "cliente" | "admin" | "tuner" | "revendedor" | "suporte";

export interface Customer {
  id: string;
  nome: string;
  empresa?: string;
  documento: string; // CPF ou CNPJ
  telefone: string;
  whatsapp: string;
  email: string;
  cidade: string;
  estado: string;
}

export interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  motorizacao: string;
  ano: string;
  km: string;
  placa: string;
  ecuModelo?: string;
  tcuModelo?: string;
  equipamento?: string;
  metodoLeitura?: "OBD" | "BENCH" | "BOOT" | "JTAG" | "OUTRO";
}

export type StageId = "original" | "stage1" | "stage2" | "stage3" | "stage4" | "custom";

export interface Stage {
  id: StageId;
  nome: string;
  descricao: string;
  preco: number;
  ganhoPotencia?: string;
  ganhoTorque?: string;
}

export type OptionCategory = "adicional" | "emissao";

export interface ServiceOption {
  id: string;
  categoria: OptionCategory;
  nome: string;
  descricao: string;
  preco: number;
  compativelCom?: string[]; // ids de ECU/veículo, quando restrito
}

export type OrderStatus =
  | "recebido"
  | "aguardando_pagamento"
  | "pagamento_confirmado"
  | "em_analise"
  | "em_desenvolvimento"
  | "em_processamento"
  | "aguardando_informacoes"
  | "arquivo_pronto"
  | "finalizado"
  | "cancelado";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  recebido: "Pedido recebido",
  aguardando_pagamento: "Aguardando pagamento",
  pagamento_confirmado: "Pagamento confirmado",
  em_analise: "Arquivo em análise",
  em_desenvolvimento: "Em desenvolvimento",
  em_processamento: "Em processamento",
  aguardando_informacoes: "Aguardando informações",
  arquivo_pronto: "Arquivo pronto",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "recebido",
  "aguardando_pagamento",
  "pagamento_confirmado",
  "em_analise",
  "em_desenvolvimento",
  "em_processamento",
  "arquivo_pronto",
  "finalizado",
];

export type PaymentStatus = "pendente" | "pago" | "parcial" | "cancelado";

export interface OrderFile {
  id: string;
  tipo: "original" | "modificado";
  nome: string;
  tamanhoBytes: number;
  criadoEm: string;
  hw?: string;
  sw?: string;
  checksum?: string;
}

export interface OrderMessage {
  id: string;
  autor: "cliente" | "admin";
  texto: string;
  anexoNome?: string;
  criadoEm: string;
}

export interface TermAcceptance {
  termo: "emissoes" | "leitura_gravacao";
  versao: string;
  aceitoEm: string;
  ip?: string;
}

export interface Order {
  id: string; // ex: TP-2026-000123
  clienteId: string;
  veiculo: Vehicle;
  stage: StageId;
  opcionais: string[]; // ids de ServiceOption
  arquivoOriginalNome?: string;
  observacoes?: string;
  subtotal: number;
  desconto: number;
  total: number;
  status: OrderStatus;
  pagamento: PaymentStatus;
  criadoEm: string;
  termosAceitos: TermAcceptance[];
  mensagens: OrderMessage[];
  arquivos: OrderFile[];
}
