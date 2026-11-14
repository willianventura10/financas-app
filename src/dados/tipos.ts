import type { CategoriaId } from '../lib/categorias'

// Todos os valores em dinheiro são centavos inteiros.

export interface Lancamento {
  id: string
  /** Mês de competência, "AAAA-MM". */
  mes: string
  /** "AAAA-MM-DD"; null nos lançamentos vindos da planilha, que não guardava o dia. */
  data: string | null
  valor: number
  categoria: CategoriaId
  /** "Comi na rua" é Alimentação com esta marca. */
  comiNaRua?: boolean
  /** Alimentação paga sem o cartão: fica fora do que o mês abate da fatura. */
  foraDoCartao?: boolean
  obs?: string
  origem?: 'planilha'
  criadoEm: number
  editadoEm: number
}

/** Conciliação da fatura do cartão, como nas linhas 59 a 67 da aba Mensal. */
export interface Cartao {
  fatura: number | null
  /** Ajuste manual de cada semana, somado à Alimentação lançada com data naquela semana. */
  semanas: number[]
  saudeAcademia: number
  /** Ajustes manuais que a planilha fazia dentro das fórmulas. */
  ajusteUber: number
  ajusteAbater: number
  ajusteFatura: number
}

export interface MesDoc {
  mes: string
  cvm: number | null
  extra: number
  social: number
  cartaoElis: number
  poupado: number
  poupViagem: number
  /** Contas marcadas como pagas. */
  contas: Record<string, boolean>
  cartao?: Cartao
  notas?: { onde: string; texto: string }[]
}

export interface Config {
  /** Meta mensal por categoria. Viagens não tem meta. */
  metas: Partial<Record<CategoriaId, number>>
  rendaPrevistaMensal: number
  /** Contas do checklist; "meses" limita a conta a alguns meses do ano (1 = janeiro). */
  contas: { nome: string; meses?: number[] }[]
  /** Metas de poupança do bloco POUPAR da planilha; servem de referência. */
  metasPoupanca?: Record<string, number>
  investimentos?: ParametrosInvest
  /** Última cotação de cada ativo, em centavos. */
  cotacoes?: Record<string, { preco: number; em: string }>
  /** Token da brapi; fica no banco do usuário, nunca no código. */
  brapiToken?: string
}

/** A aba Metas da planilha de investimentos. Percentuais são frações: 0,12 = 12%. */
export interface ParametrosInvest {
  metaReserva: number
  metaReservaFinal: number
  metaCarro: number
  dataCarro: string | null
  metaApe: number
  dataApe: string | null
  alvoConvexo: number
  minConvexo: number
  maxConvexo: number
  /** Parte de WRLD11 dentro do convexo, sem a ação BR. GOLD11 fica com o resto. */
  alvoWrld: number
  tolerancia: number
  aporteMensal: number
  tetoConvexo: number
  limiteFgc: number
  alertaVencimentoDias: number
  caixas: string[]
  classes: string[]
  instituicoes: string[]
  liquidez: string[]
}

export interface Posicao {
  id: string
  ordem: number
  nome: string
  instituicao: string
  classe: string
  caixa: string
  valor: number
  rentabilidade: string
  vencimento: string | null
  liquidez: string
  fgc: boolean
  obs: string
}

export interface Operacao {
  id: string
  data: string
  ativo: string
  tipo: 'compra' | 'venda'
  quantidade: number
  /** Valor total da operação, com custos. */
  total: number
  obs: string
}

/** Foto do patrimônio por caixa no fechamento de um mês. */
export interface Historico {
  mes: string
  reserva: number
  carro: number
  ape: number
  convexo: number
  aAlocar: number
  aporte: number
  saidas: number
  obs?: string
}

/** Uma lista de apoio (móveis, imóveis, notas...). O formato dos itens varia por lista. */
export interface Lista {
  id: string
  itens?: Record<string, unknown>[]
  [campo: string]: unknown
}

export interface Viagem {
  id: string
  nome: string
  mes: string
  gasto: number
  itens: { nome: string; valor: number }[]
  obs: string
  /** Quanto do gasto sai do saldo da caixinha de viagem; pode ser só uma parte. */
  abatido?: number
  /** Forma antiga: abatia o gasto inteiro. */
  abater?: boolean
}

export interface EstadoSync {
  /** Há gravações deste aparelho que o servidor ainda não confirmou. */
  pendente: boolean
  /** Os dados mostrados vieram só do cache local. */
  doCache: boolean
}

export interface DocParaImportar {
  /** "colecao/id", por exemplo "meses/2026-10". */
  caminho: string
  dados: object
}

export interface Repositorio {
  /** Acompanha os lançamentos de um ano ("2026"). Devolve a função que encerra o acompanhamento. */
  ouvirLancamentos(ano: string, aoMudar: (itens: Lancamento[], estado: EstadoSync) => void): () => void
  /** Acompanha uma coleção pequena inteira ("meses", "posicoes"...). Cada documento vem com seu "id". */
  ouvirColecao<T>(nome: string, aoMudar: (docs: T[]) => void): () => void
  /** Cria ou substitui o documento em "colecao/id". Sem internet, a promessa só termina quando a conexão volta. */
  gravar(caminho: string, dados: object): Promise<void>
  excluir(caminho: string): Promise<void>
  /** Grava muitos documentos de uma vez; precisa de internet. */
  importar(docs: DocParaImportar[]): Promise<void>
  /** Lê todos os documentos do usuário, para exportar e fazer backup. */
  lerTudo(): Promise<DocParaImportar[]>
}
