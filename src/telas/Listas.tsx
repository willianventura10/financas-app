import { useState, type FormEvent, type ReactNode } from 'react'
import { CampoNumero, Resultado } from '../componentes'
import type { Lista } from '../dados/tipos'
import { dataBr } from '../lib/datas'
import { lerCentavos, numero, reais } from '../lib/dinheiro'

type Item = Record<string, unknown>
type Tipo = 'texto' | 'valor' | 'numero' | 'data'
interface Campo {
  chave: string
  rotulo: string
  tipo: Tipo
}

interface PropsLista {
  titulo: string
  itens: Item[]
  campos: Campo[]
  /** Como mostrar um item: texto principal, valor à direita e linha de apoio. */
  mostrar: (item: Item, i: number) => { principal: ReactNode; valor?: string; apoio?: ReactNode }
  aoMudar: (itens: Item[]) => void
  rodape?: ReactNode
}

/** Lista simples: mostra os itens, remove e acrescenta. */
function ListaEditavel({ titulo, itens, campos, mostrar, aoMudar, rodape }: PropsLista) {
  const [novo, setNovo] = useState<Record<string, string>>({})
  const [erro, setErro] = useState('')

  function adicionar(e: FormEvent) {
    e.preventDefault()
    const item: Item = {}
    for (const c of campos) {
      const texto = (novo[c.chave] ?? '').trim()
      if (c.tipo === 'valor') item[c.chave] = lerCentavos(texto)
      else if (c.tipo === 'numero') item[c.chave] = texto ? Number(texto.replace(',', '.')) : null
      else item[c.chave] = texto || null
    }
    if (!item[campos[0].chave]) return setErro(`Preencha o campo "${campos[0].rotulo}".`)
    aoMudar([...itens, item])
    setNovo({})
    setErro('')
  }

  return (
    <section className="bloco">
      <h2>{titulo}</h2>
      <ul className="razao">
        {itens.map((item, i) => {
          const m = mostrar(item, i)
          return (
            <li key={i}>
              <div className="linha-razao">
                <span>{m.principal}</span>
                {m.valor && <span className="num">{m.valor}</span>}
              </div>
              {m.apoio && <p className="apoio">{m.apoio}</p>}
              <button className="texto" onClick={() => aoMudar(itens.filter((_, j) => j !== i))}>
                Remover
              </button>
            </li>
          )
        })}
      </ul>
      {rodape}
      <form className="grade" onSubmit={adicionar}>
        {campos.map((c) => (
          <label className="campo" key={c.chave}>
            {c.rotulo}
            <input
              type={c.tipo === 'data' ? 'date' : 'text'}
              inputMode={c.tipo === 'valor' || c.tipo === 'numero' ? 'decimal' : undefined}
              className={c.tipo === 'valor' || c.tipo === 'numero' ? 'num' : undefined}
              value={novo[c.chave] ?? ''}
              onChange={(e) => setNovo({ ...novo, [c.chave]: e.target.value })}
            />
          </label>
        ))}
        <button className="secundario">Adicionar</button>
      </form>
      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
    </section>
  )
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const dinheiro = (v: unknown) => (typeof v === 'number' ? reais(v) : '')

/** As abas de apoio das planilhas: móveis, imóveis, salário, ar-condicionado, mudança e notas. */
export function Listas({ listas, aoGravar }: { listas: Lista[]; aoGravar: (caminho: string, dados: object) => void }) {
  const lista = (id: string): Lista => listas.find((l) => l.id === id) ?? { id }
  const itens = (id: string) => (lista(id).itens ?? []) as Item[]
  const gravarItens = (id: string) => (novos: Item[]) => aoGravar(`listas/${id}`, { ...lista(id), itens: novos })

  const moveis = itens('moveis')
  const salarios = itens('salario')
  const ar = lista('arcond')
  const horas = (ar.horasPorMes as number[] | undefined) ?? Array(12).fill(0)
  const custos = (ar.custoHoraPorMes as (number | null)[] | undefined) ?? Array(12).fill(null)
  const mudanca = lista('mudanca')
  const trocar = <T,>(vetor: T[], i: number, valor: T) => vetor.map((v, j) => (j === i ? valor : v))

  return (
    <div className="listas">
      <ListaEditavel
        titulo="Móveis e compras da casa"
        itens={moveis}
        campos={[
          { chave: 'nome', rotulo: 'Item', tipo: 'texto' },
          { chave: 'valor', rotulo: 'Valor', tipo: 'valor' },
        ]}
        mostrar={(i) => ({ principal: String(i.nome), valor: dinheiro(i.valor) })}
        aoMudar={gravarItens('moveis')}
        rodape={<Resultado rotulo="Total" valor={moveis.reduce((s, i) => s + (Number(i.valor) || 0), 0)} forte />}
      />

      <ListaEditavel
        titulo="Imóveis pesquisados"
        itens={itens('imoveis')}
        campos={[
          { chave: 'endereco', rotulo: 'Endereço', tipo: 'texto' },
          { chave: 'modalidade', rotulo: 'Compra ou aluguel', tipo: 'texto' },
          { chave: 'valor', rotulo: 'Valor', tipo: 'valor' },
          { chave: 'area', rotulo: 'Área em m²', tipo: 'numero' },
          { chave: 'caracteristicas', rotulo: 'Características', tipo: 'texto' },
          { chave: 'link', rotulo: 'Link', tipo: 'texto' },
        ]}
        mostrar={(i) => ({
          principal: String(i.endereco),
          valor: dinheiro(i.valor),
          apoio: (
            <>
              {[i.modalidade, i.tipo, i.area ? `${i.area} m²` : null, i.caracteristicas].filter(Boolean).join(', ')}
              {typeof i.link === 'string' && (
                <>
                  {' '}
                  <a href={i.link} target="_blank" rel="noreferrer">
                    Abrir o anúncio
                  </a>
                </>
              )}
            </>
          ),
        })}
        aoMudar={gravarItens('imoveis')}
      />

      <ListaEditavel
        titulo="Salário em salários mínimos"
        itens={salarios}
        campos={[
          { chave: 'ano', rotulo: 'Ano', tipo: 'numero' },
          { chave: 'salario', rotulo: 'Salário', tipo: 'valor' },
          { chave: 'minimo', rotulo: 'Salário mínimo', tipo: 'valor' },
        ]}
        mostrar={(i, n) => {
          const razao = (x: Item) => Number(x.salario) / Number(x.minimo)
          const variacao = n > 0 ? razao(i) - razao(salarios[n - 1]) : null
          return {
            principal: `${i.ano}: ${razao(i).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} salários mínimos`,
            valor: dinheiro(i.salario),
            apoio: `Mínimo de ${dinheiro(i.minimo)}${
              variacao === null ? '' : `, variação de ${variacao.toLocaleString('pt-BR', { maximumFractionDigits: 2, signDisplay: 'always' })}`
            }`,
          }
        }}
        aoMudar={gravarItens('salario')}
      />

      <section className="bloco">
        <h2>Ar-condicionado</h2>
        <p className="apoio">
          Consumo de {String(ar.consumoKwhMes ?? '?')} kWh por mês para 1 hora diária. Informe as horas de uso e o custo por hora de
          cada mês.
        </p>
        <table className="tabela">
          <thead>
            <tr>
              <th>Mês</th>
              <th>Horas</th>
              <th>Custo por hora</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {MESES.map((nome, i) => (
              <tr key={nome}>
                <td>{nome}</td>
                <td>
                  <CampoNumero rotulo="" valor={horas[i] ?? 0} aoMudar={(v) => aoGravar('listas/arcond', { ...ar, horasPorMes: trocar(horas, i, v) })} />
                </td>
                <td>
                  <CampoNumero
                    rotulo=""
                    valor={custos[i] ?? 0}
                    aoMudar={(v) => aoGravar('listas/arcond', { ...ar, custoHoraPorMes: trocar(custos, i, v) })}
                  />
                </td>
                <td className="num">{numero(Math.round((horas[i] ?? 0) * (custos[i] ?? 0) * 100))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <ListaEditavel
        titulo={`Mudança${mudanca.dataAlvo ? `, data alvo ${String(mudanca.dataAlvo)}` : ''}`}
        itens={itens('mudanca')}
        campos={[
          { chave: 'tarefa', rotulo: 'Tarefa', tipo: 'texto' },
          { chave: 'prazo', rotulo: 'Prazo', tipo: 'data' },
        ]}
        mostrar={(i) => ({ principal: String(i.tarefa), valor: typeof i.prazo === 'string' ? dataBr(i.prazo) : '' })}
        aoMudar={gravarItens('mudanca')}
      />

      <ListaEditavel
        titulo="Notas"
        itens={itens('notas')}
        campos={[
          { chave: 'titulo', rotulo: 'Título', tipo: 'texto' },
          { chave: 'texto', rotulo: 'Texto', tipo: 'texto' },
          { chave: 'link', rotulo: 'Link', tipo: 'texto' },
        ]}
        mostrar={(i) => ({
          principal: String(i.titulo),
          apoio: (
            <>
              {String(i.texto ?? '')}
              {typeof i.link === 'string' && (
                <>
                  {' '}
                  <a href={i.link} target="_blank" rel="noreferrer">
                    Abrir o link
                  </a>
                </>
              )}
            </>
          ),
        })}
        aoMudar={gravarItens('notas')}
      />
    </div>
  )
}
