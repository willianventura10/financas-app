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
  obs?: string
  origem?: 'planilha'
  criadoEm: number
  editadoEm: number
}

/** Conciliação da fatura do cartão, como nas linhas 59 a 67 da aba Mensal. */
export interface Cartao {
  fatura: number | null
  /** Alimentação paga no cartão, semana a semana. */
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
  /** O que o mês somou (ou tirou) da caixinha de viagem. */
  caixinhaViagem: number
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
}

export interface Viagem {
  id: string
  nome: string
  mes: string
  gasto: number
  itens: { nome: string; valor: number }[]
  obs: string
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
  /** Acompanha uma coleção pequena inteira: "meses", "config", "viagens". */
  ouvirColecao<T>(nome: string, aoMudar: (docs: T[]) => void): () => void
  /** Cria ou substitui o documento em "colecao/id". Sem internet, a promessa só termina quando a conexão volta. */
  gravar(caminho: string, dados: object): Promise<void>
  excluir(caminho: string): Promise<void>
  /** Grava muitos documentos de uma vez; precisa de internet. */
  importar(docs: DocParaImportar[]): Promise<void>
}
