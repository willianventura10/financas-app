import { Resultado } from '../componentes'
import type { Config, Lancamento, MesDoc } from '../dados/tipos'
import { resumoDoAno, type DestinoId, type LinhaDestino } from '../lib/calculos'
import { nomeDaCategoria } from '../lib/categorias'
import { hoje, mesDe, nomeDoMes } from '../lib/datas'
import { numero, reais } from '../lib/dinheiro'

interface Props {
  ano: string
  itensDoAno: Lancamento[]
  meses: MesDoc[]
  caixinha: number
  config: Config
}

interface LinhaComparada {
  nome: string
  referencia: number
  realizado: number
}

/** Duas barras por categoria: a referência (meta ou previsto) e o realizado. */
function Comparativo(props: { titulo: string; referencia: string; realizado: string; linhas: LinhaComparada[] }) {
  const maior = Math.max(1, ...props.linhas.flatMap((l) => [l.referencia, l.realizado]))
  const barra = (classe: string, serie: string, valor: number) => (
    <div className="par" title={`${serie}: ${reais(valor)}`}>
      <span className={`serie ${classe}`} style={{ width: `${(valor / maior) * 100}%` }} />
      <span className="num">{numero(valor)}</span>
    </div>
  )
  return (
    <section className="bloco">
      <h2>{props.titulo}</h2>
      <p className="legenda">
        <span className="serie ref" /> {props.referencia}
        <span className="serie real" /> {props.realizado}
      </p>
      <ul className="comparativo">
        {props.linhas.map((l) => (
          <li key={l.nome}>
            <span>{l.nome}</span>
            {barra('ref', props.referencia, l.referencia)}
            {barra('real', props.realizado, l.realizado)}
          </li>
        ))}
      </ul>
    </section>
  )
}

const DESTINO: Record<DestinoId, string> = {
  social: 'Social',
  cartaoElis: 'Cartão Elis',
  poupado: 'Poupado',
  poupViagem: 'Poup. viagem',
}

const ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Resumo do ano: o topo da aba Mensal (linhas 1 a 16) e seus dois gráficos. */
export function GastosAno({ ano, itensDoAno, meses, caixinha, config }: Props) {
  const r = resumoDoAno(ano, itensDoAno, meses, config, mesDe(hoje()))
  const doAno = meses.filter((m) => m.mes.startsWith(ano)).sort((a, b) => a.mes.localeCompare(b.mes))
  const linhaDeDestino = (d: LinhaDestino) => (
    <tr key={d.id}>
      <td>{DESTINO[d.id]}</td>
      {d.porMes.map((v, i) => (
        <td key={i} className="num">
          {v ? numero(v) : ''}
        </td>
      ))}
      <td className="num">{numero(d.acumulado)}</td>
    </tr>
  )

  return (
    <>
      <section className="bloco">
        <h2>{ano} até agora</h2>
        <Resultado rotulo="Acumulado, sem Viagens" valor={r.totais.acumulado} forte />
        <Resultado
          rotulo={r.mesesFechados === 1 ? 'Média do mês fechado' : `Média dos ${r.mesesFechados} meses fechados`}
          valor={r.totais.media}
        />
        <Resultado rotulo="Meta mensal" valor={r.totais.meta} />
        <Resultado rotulo="Viagens no ano" valor={r.viagens.acumulado} />
        <Resultado rotulo="Renda acumulada, CVM e extra" valor={r.renda} />
        <Resultado rotulo="Flutuável líquido acumulado" valor={r.renda - r.totais.acumulado} forte />
        <p className="apoio">
          Previsto para o ano: gasto de {reais(r.totais.previsto)}, renda de {reais(r.rendaPrevista)} e flutuável de{' '}
          {reais(r.rendaPrevista - r.totais.previsto)}.
        </p>
      </section>

      <Comparativo
        titulo="Meta mensal e média mensal"
        referencia="Meta"
        realizado="Média"
        linhas={r.linhas.map((l) => ({ nome: nomeDaCategoria(l.id), referencia: l.meta ?? 0, realizado: l.media ?? 0 }))}
      />
      <Comparativo
        titulo="Previsto no ano e acumulado"
        referencia="Previsto"
        realizado="Acumulado"
        linhas={r.linhas.map((l) => ({ nome: nomeDaCategoria(l.id), referencia: l.previsto ?? 0, realizado: l.acumulado }))}
      />

      <section className="bloco">
        <h2>Poupado em {ano}</h2>
        <Resultado rotulo="Reserva" valor={r.poupado} forte />
        <Resultado rotulo="Saldo da caixinha de viagem" valor={caixinha} forte />
        <table className="tabela">
          <thead>
            <tr>
              <th>Mês</th>
              <th>Reserva</th>
              <th>Poup. viagem</th>
            </tr>
          </thead>
          <tbody>
            {doAno.map((m) => (
              <tr key={m.mes}>
                <td>{nomeDoMes(m.mes).split(' ')[0]}</td>
                <td className="num">{numero(m.poupado)}</td>
                <td className="num">{numero(m.poupViagem)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bloco so-largo">
        <h2>Mês a mês</h2>
        <table className="tabela">
          <thead>
            <tr>
              <th>Categoria</th>
              {ABREV.map((m) => (
                <th key={m}>{m}</th>
              ))}
              <th>Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {[...r.linhas, r.viagens].map((l) => (
              <tr key={l.id}>
                <td>{nomeDaCategoria(l.id)}</td>
                {l.porMes.map((v, i) => (
                  <td key={i} className={l.meta !== null && v > l.meta ? 'num alerta' : 'num'}>
                    {v ? numero(v) : ''}
                  </td>
                ))}
                <td className="num">{numero(l.acumulado)}</td>
              </tr>
            ))}
            <tr className="total">
              <td>Total</td>
              {r.totais.porMes.map((v, i) => (
                <td key={i} className="num">
                  {v + r.viagens.porMes[i] ? numero(v + r.viagens.porMes[i]) : ''}
                </td>
              ))}
              <td className="num">{numero(r.totais.acumulado + r.viagens.acumulado)}</td>
            </tr>
          </tbody>
          <tbody>
            <tr className="subtitulo">
              <th>Destinações</th>
              {ABREV.map((m) => (
                <th key={m}>{m}</th>
              ))}
              <th>Acumulado</th>
            </tr>
            {r.destinacoes.map(linhaDeDestino)}
            <tr className="total">
              <td>Total destinado</td>
              {r.destinado.porMes.map((v, i) => (
                <td key={i} className="num">
                  {v ? numero(v) : ''}
                </td>
              ))}
              <td className="num">{numero(r.destinado.acumulado)}</td>
            </tr>
          </tbody>
        </table>
        <p className="apoio">Em vermelho, os meses em que a categoria passou da meta.</p>
      </section>
    </>
  )
}
