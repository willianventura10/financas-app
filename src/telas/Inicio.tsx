import type { Lancamento } from '../dados/tipos'
import { nomeDaCategoria } from '../lib/categorias'
import { nomeDoMes } from '../lib/datas'
import { reais } from '../lib/dinheiro'
import { totaisPorCategoria, totalDoMes } from '../lib/totais'

export function Inicio({ itens, mes }: { itens: Lancamento[] | null; mes: string }) {
  if (!itens) return <p className="abrindo">Carregando os gastos…</p>
  if (itens.length === 0)
    return (
      <section className="vazio">
        <h2>Nenhum gasto em {nomeDoMes(mes)}</h2>
        <p>Use o botão Lançar para registrar o primeiro.</p>
      </section>
    )

  const total = totalDoMes(itens)
  const categorias = totaisPorCategoria(itens).filter((c) => c.total > 0)

  return (
    <>
      <section className="total-mes">
        <h2>Gasto no mês</h2>
        <p className="valor-grande">{reais(total)}</p>
        <p className="apoio">
          {itens.length} {itens.length === 1 ? 'lançamento' : 'lançamentos'}
        </p>
      </section>

      <section aria-label="Gasto por categoria">
        <ul className="razao">
          {categorias.map((c) => (
            <li key={c.id}>
              <div className="linha-razao">
                <span>{nomeDaCategoria(c.id)}</span>
                <span className="num">{reais(c.total)}</span>
              </div>
              <div className="barra" aria-hidden="true">
                <span style={{ width: `${(c.total / total) * 100}%` }} />
              </div>
              {c.comiNaRua > 0 && <p className="apoio">Comi na rua: {reais(c.comiNaRua)}</p>}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
