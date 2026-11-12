import type { Lancamento } from '../dados/tipos'
import { CATEGORIAS, type CategoriaId } from './categorias'

export interface TotalCategoria {
  id: CategoriaId
  total: number
  /** Parte de Alimentação marcada como "Comi na rua". */
  comiNaRua: number
}

/** Total por categoria, na ordem da planilha. "Comi na rua" já entra em Alimentação. */
export function totaisPorCategoria(itens: Lancamento[]): TotalCategoria[] {
  return CATEGORIAS.map((c) => {
    const daCategoria = itens.filter((l) => l.categoria === c.id)
    return {
      id: c.id,
      total: daCategoria.reduce((s, l) => s + l.valor, 0),
      comiNaRua: daCategoria.filter((l) => l.comiNaRua).reduce((s, l) => s + l.valor, 0),
    }
  })
}

export function totalDoMes(itens: Lancamento[]): number {
  return itens.reduce((s, l) => s + l.valor, 0)
}
