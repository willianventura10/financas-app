import { useState } from 'react'
import type { Config, Lancamento, MesDoc } from '../dados/tipos'
import { nomeDaCategoria } from '../lib/categorias'
import { diaMes, nomeDoMes } from '../lib/datas'
import { reais } from '../lib/dinheiro'
import { totalDoMes } from '../lib/totais'
import { GastosAno } from './GastosAno'
import { GastosMes } from './GastosMes'

interface Props {
  itens: Lancamento[] | null
  itensDoAno: Lancamento[]
  mes: string
  mesDoc: MesDoc
  meses: MesDoc[]
  config: Config | null
  aoAbrir: (l: Lancamento) => void
  aoGravarMes: (mes: MesDoc) => void
  aoLancarCartao: (valor: number) => void
}

type Visao = 'lancamentos' | 'mes' | 'ano'
const VISOES: { id: Visao; nome: string }[] = [
  { id: 'lancamentos', nome: 'Lançamentos' },
  { id: 'mes', nome: 'Mês' },
  { id: 'ano', nome: 'Ano' },
]

export function Gastos(props: Props) {
  const [visao, setVisao] = useState<Visao>('lancamentos')
  const { itens, mes, config } = props
  if (!itens) return <p className="abrindo">Carregando os gastos…</p>

  const semConfig = (
    <section className="vazio">
      <h2>Faltam as metas e as contas</h2>
      <p>Importe a carga inicial em Mais para preencher esta tela.</p>
    </section>
  )

  return (
    <>
      <div className="visoes" role="tablist" aria-label="Visões de Gastos">
        {VISOES.map((v) => (
          <button key={v.id} role="tab" aria-selected={visao === v.id} onClick={() => setVisao(v.id)}>
            {v.nome}
          </button>
        ))}
      </div>

      {visao === 'lancamentos' && <Lista itens={itens} mes={mes} aoAbrir={props.aoAbrir} />}
      {visao === 'mes' &&
        (config ? (
          <GastosMes
            itens={itens}
            mesDoc={props.mesDoc}
            config={config}
            aoGravar={props.aoGravarMes}
            aoLancarCartao={props.aoLancarCartao}
          />
        ) : (
          semConfig
        ))}
      {visao === 'ano' &&
        (config ? (
          <GastosAno ano={mes.slice(0, 4)} itensDoAno={props.itensDoAno} meses={props.meses} config={config} />
        ) : (
          semConfig
        ))}
    </>
  )
}

function Lista({ itens, mes, aoAbrir }: { itens: Lancamento[]; mes: string; aoAbrir: (l: Lancamento) => void }) {
  if (itens.length === 0)
    return (
      <section className="vazio">
        <h2>Nenhum gasto em {nomeDoMes(mes)}</h2>
        <p>Use o botão Lançar para registrar o primeiro.</p>
      </section>
    )

  // Mais recentes primeiro; os sem dia (vindos da planilha) ficam no fim, agrupados por categoria.
  const ordenados = [...itens].sort(
    (a, b) =>
      (b.data ?? '').localeCompare(a.data ?? '') || a.categoria.localeCompare(b.categoria) || b.criadoEm - a.criadoEm,
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
