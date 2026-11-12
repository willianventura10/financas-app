import type { Lancamento } from '../dados/tipos'
import { nomeDaCategoria } from '../lib/categorias'
import { diaMes, nomeDoMes } from '../lib/datas'
import { reais } from '../lib/dinheiro'
import { totalDoMes } from '../lib/totais'

interface Props {
  itens: Lancamento[] | null
  mes: string
  aoAbrir: (l: Lancamento) => void
}

export function Gastos({ itens, mes, aoAbrir }: Props) {
  if (!itens) return <p className="abrindo">Carregando os gastos…</p>
  if (itens.length === 0)
    return (
      <section className="vazio">
        <h2>Nenhum gasto em {nomeDoMes(mes)}</h2>
        <p>Use o botão Lançar para registrar o primeiro.</p>
      </section>
    )

  // Mais recentes primeiro; os sem dia (vindos da planilha) ficam no fim.
  const ordenados = [...itens].sort(
    (a, b) => (b.data ?? '').localeCompare(a.data ?? '') || b.criadoEm - a.criadoEm,
  )

  return (
    <section aria-label={`Gastos de ${nomeDoMes(mes)}`}>
      <ul className="lancamentos">
        {ordenados.map((l) => (
          <li key={l.id}>
            <button onClick={() => aoAbrir(l)}>
              <span className="quando num">{l.data ? diaMes(l.data) : 'sem dia'}</span>
              <span className="oque">
                {l.comiNaRua ? 'Comi na rua' : nomeDaCategoria(l.categoria)}
                {l.obs && <small>{l.obs}</small>}
              </span>
              <span className="num">{reais(l.valor)}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="soma">
        <span>Total</span>
        <span className="num">{reais(totalDoMes(itens))}</span>
      </p>
    </section>
  )
}
