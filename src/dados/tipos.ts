import type { CategoriaId } from '../lib/categorias'

export interface Lancamento {
  id: string
  /** Mês de competência, "AAAA-MM". */
  mes: string
  /** "AAAA-MM-DD"; null nos lançamentos vindos da planilha, que não guardava o dia. */
  data: string | null
  /** Valor em centavos. */
  valor: number
  categoria: CategoriaId
  /** "Comi na rua" é Alimentação com esta marca. */
  comiNaRua?: boolean
  obs?: string
  criadoEm: number
  editadoEm: number
}

export interface EstadoSync {
  /** Há gravações deste aparelho que o servidor ainda não confirmou. */
  pendente: boolean
  /** Os dados mostrados vieram só do cache local. */
  doCache: boolean
}

export interface Repositorio {
  /** Acompanha os lançamentos de um mês. Devolve a função que encerra o acompanhamento. */
  ouvirLancamentos(mes: string, aoMudar: (itens: Lancamento[], estado: EstadoSync) => void): () => void
  /** Cria ou substitui. Sem internet, a promessa só termina quando a conexão volta. */
  salvarLancamento(l: Lancamento): Promise<void>
  excluirLancamento(id: string): Promise<void>
}
