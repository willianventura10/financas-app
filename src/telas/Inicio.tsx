import { Medidor, Resultado } from '../componentes'
import type { Config, Historico, Lancamento, MesDoc } from '../dados/tipos'
import { contasPendentes, resumoDoMes } from '../lib/calculos'
import { nomeDaCategoria } from '../lib/categorias'
import { hoje, mesDe, nomeDoMes } from '../lib/datas'
import { lembretes, lerUltimoBackup } from '../lib/lembretes'
import { reais } from '../lib/dinheiro'
import { totaisPorCategoria } from '../lib/totais'

interface Props {
  itens: Lancamento[] | null
  mes: string
  mesDoc: MesDoc
  config: Config | null
  historico: Historico[]
}

export function Inicio({ itens, mes, mesDoc, config, historico }: Props) {
  if (!itens) return <p className="abrindo">Carregando os gastos…</p>
  if (itens.length === 0)
    return (
      <section className="vazio">
        <h2>Nenhum gasto em {nomeDoMes(mes)}</h2>
        <p>Use o botão Lançar para registrar o primeiro.</p>
      </section>
    )

  const categorias = totaisPorCategoria(itens).filter((c) => c.total > 0 || config?.metas[c.id])
  const resumo = config ? resumoDoMes(itens, mesDoc, config) : null
  const total = resumo?.total ?? itens.reduce((s, l) => s + l.valor, 0)
  const pendentes = config ? contasPendentes(mesDoc, config) : []
  const estouradas = config ? categorias.filter((c) => c.total > (config.metas[c.id] ?? Infinity)) : []
  // Os lembretes são de hoje, então só aparecem no mês corrente.
  const avisos = mes === mesDe(hoje()) ? lembretes(hoje(), historico, lerUltimoBackup()) : []

  return (
    <>
      <section className="total-mes">
        <h2>Gasto no mês</h2>
        <p className="valor-grande">{reais(total)}</p>
        <p className="apoio">
          {itens.length} {itens.length === 1 ? 'lançamento' : 'lançamentos'}
        </p>
      </section>

      {resumo && (
        <section className="bloco" aria-label="Resumo do mês">
          <Resultado rotulo="Meta do mês" valor={resumo.metaTotal} />
          <Resultado rotulo="Diferença para a meta" valor={resumo.diferenca} />
          <Resultado rotulo="Flutuável líquido" valor={resumo.flutuavel} forte />
          {resumo.flutuavel === null && <p className="apoio">Informe a renda do mês em Gastos, na aba Mês.</p>}
        </section>
      )}

      {(estouradas.length > 0 || pendentes.length > 0 || avisos.length > 0) && (
        <section className="atencao">
          <h2>Pede atenção</h2>
          <ul>
            {estouradas.map((c) => (
              <li key={c.id}>{nomeDaCategoria(c.id)} passou da meta.</li>
            ))}
            {pendentes.length > 0 && <li>Contas sem OK: {pendentes.join(', ')}.</li>}
            {avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Gasto por categoria">
        <ul className="razao">
          {categorias.map((c) => {
            const meta = config?.metas[c.id]
            return (
              <li key={c.id}>
                <div className="linha-razao">
                  <span>{nomeDaCategoria(c.id)}</span>
                  <span className="num">{reais(c.total)}</span>
                </div>
                {meta ? <Medidor gasto={c.total} meta={meta} /> : config && <p className="apoio">Sem meta mensal.</p>}
                {c.comiNaRua > 0 && <p className="apoio">Comi na rua: {reais(c.comiNaRua)}</p>}
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}
