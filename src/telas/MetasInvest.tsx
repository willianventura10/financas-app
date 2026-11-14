import { useState, type FormEvent } from 'react'
import { CampoNumero, CampoValor } from '../componentes'
import type { AtivoConvexo, Objetivo, ParametrosInvest, Posicao } from '../dados/tipos'
import { lerCentavos, porcento } from '../lib/dinheiro'
import { A_ALOCAR, CONVEXO, ativosDe, objetivosDe } from '../lib/investimentos'

interface Props {
  inv: ParametrosInvest
  posicoes: Posicao[]
  mudarInv: (parte: Partial<ParametrosInvest>) => void
}

/** A paleta das caixas tem oito cores: seis objetivos, mais Convexo e A alocar. */
const MAXIMO_DE_OBJETIVOS = 6

const igual = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** Os objetivos (Reserva, Carro, Apê...), na ordem em que recebem o aporte. */
export function Objetivos({ inv, posicoes, mudarInv }: Props) {
  const objetivos = objetivosDe(inv)
  const [nome, setNome] = useState('')
  const [meta, setMeta] = useState('')
  const [erro, setErro] = useState('')
  const gravar = (lista: Objetivo[]) => {
    setErro('')
    mudarInv({ objetivos: lista })
  }
  const mudar = (id: string, parte: Partial<Objetivo>) => gravar(objetivos.map((o) => (o.id === id ? { ...o, ...parte } : o)))
  const naCaixa = (o: Objetivo) => posicoes.filter((p) => p.caixa === o.nome).length

  function mover(i: number, para: number) {
    const lista = [...objetivos]
    ;[lista[i], lista[para]] = [lista[para], lista[i]]
    gravar(lista)
  }

  function excluir(o: Objetivo) {
    const quantas = naCaixa(o)
    if (quantas > 0)
      return setErro(
        `${o.nome} tem ${quantas === 1 ? '1 posição' : `${quantas} posições`}. Mova para outra caixa, em Investimentos › Posições, antes de excluir.`,
      )
    gravar(objetivos.filter((x) => x.id !== o.id))
  }

  function adicionar(e: FormEvent) {
    e.preventDefault()
    const limpo = nome.trim()
    const valor = lerCentavos(meta)
    if (!limpo || !valor) return setErro('Preencha o nome e a meta do objetivo.')
    if ([...objetivos.map((o) => o.nome), CONVEXO, A_ALOCAR].some((n) => igual(n, limpo)))
      return setErro(`Já existe uma caixa chamada ${limpo}.`)
    gravar([...objetivos, { id: crypto.randomUUID(), nome: limpo, meta: valor, data: null }])
    setNome('')
    setMeta('')
  }

  return (
    <section className="bloco">
      <h2>Objetivos</h2>
      <p className="apoio">
        Cada objetivo é uma caixa das posições. O aporte segue esta ordem, depois do convexo, e o último fica com o resto.
      </p>
      <ul className="objetivos">
        {objetivos.map((o, i) => (
          <li key={o.id}>
            <div className="linha-razao">
              <strong>
                {i + 1}. {o.nome}
              </strong>
              <small>{naCaixa(o) === 1 ? '1 posição' : `${naCaixa(o)} posições`}</small>
            </div>
            <div className="grade">
              <CampoValor rotulo="Meta" valor={o.meta} aoMudar={(v) => mudar(o.id, { meta: v ?? 0 })} />
              <label className="campo">
                Data prevista
                <input type="date" value={o.data ?? ''} onChange={(e) => mudar(o.id, { data: e.target.value || null })} />
              </label>
            </div>
            <label className="marcar">
              <input
                type="checkbox"
                checked={!!o.foraDoConvexo}
                onChange={(e) => mudar(o.id, { foraDoConvexo: e.target.checked || undefined })}
              />
              Não conta para o convexo
            </label>
            <div className="botoes">
              <button className="texto" disabled={i === 0} onClick={() => mover(i, i - 1)}>
                Subir
              </button>
              <button className="texto" disabled={i === objetivos.length - 1} onClick={() => mover(i, i + 1)}>
                Descer
              </button>
              <button className="texto" onClick={() => excluir(o)}>
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>
      {objetivos.length < MAXIMO_DE_OBJETIVOS ? (
        <form className="grade" onSubmit={adicionar}>
          <label className="campo">
            Novo objetivo
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" />
          </label>
          <label className="campo">
            Meta
            <input className="num" inputMode="decimal" value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="0,00" />
          </label>
          <button className="secundario">Adicionar objetivo</button>
        </form>
      ) : (
        <p className="apoio">O limite é de {MAXIMO_DE_OBJETIVOS} objetivos. Exclua um para criar outro.</p>
      )}
      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
    </section>
  )
}

/** Os ativos que dividem o lado convexo em proporção. */
export function AtivosDoConvexo({ inv, mudarInv }: Props) {
  const ativos = ativosDe(inv)
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const total = ativos.reduce((s, a) => s + a.alvo, 0)
  const gravar = (lista: AtivoConvexo[]) => {
    setErro('')
    mudarInv({ ativosConvexo: lista })
  }

  function adicionar(e: FormEvent) {
    e.preventDefault()
    const limpo = nome.trim().toUpperCase()
    if (!limpo) return setErro('Digite o nome do ativo, igual ao nome da posição.')
    if (ativos.some((a) => igual(a.nome, limpo))) return setErro(`${limpo} já está na lista.`)
    gravar([...ativos, { nome: limpo, alvo: Math.max(0, Math.round((1 - total) * 10000) / 10000) }])
    setNome('')
  }

  return (
    <section className="bloco">
      <h2>Ativos do lado convexo</h2>
      <p className="apoio">
        O app procura a posição com o mesmo nome do ativo. O que estiver na caixa Convexo e não for destes ativos aparece
        como fora da proporção.
      </p>
      <ul className="itens">
        {ativos.map((a) => (
          <li key={a.nome}>
            <span>{a.nome}</span>
            <CampoNumero
              rotulo="Alvo"
              valor={a.alvo}
              aoMudar={(v) => gravar(ativos.map((x) => (x.nome === a.nome ? { ...x, alvo: v } : x)))}
              percentual
            />
            <button className="texto" onClick={() => gravar(ativos.filter((x) => x.nome !== a.nome))}>
              Remover
            </button>
          </li>
        ))}
      </ul>
      {ativos.length > 0 && Math.abs(total - 1) > 0.0001 && (
        <p className="erro" role="alert">
          Os alvos somam {porcento(total)}. Ajuste para fechar em 100%.
        </p>
      )}
      <form className="grade" onSubmit={adicionar}>
        <label className="campo">
          Novo ativo
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Por exemplo: IVVB11" />
        </label>
        <button className="secundario">Adicionar ativo</button>
      </form>
      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
    </section>
  )
}

const LISTAS: { chave: 'instituicoes' | 'classes' | 'liquidez'; titulo: string; nova: string }[] = [
  { chave: 'instituicoes', titulo: 'Instituições', nova: 'Nova instituição' },
  { chave: 'classes', titulo: 'Classes', nova: 'Nova classe' },
  { chave: 'liquidez', titulo: 'Liquidez', nova: 'Nova opção de liquidez' },
]

/** As opções que aparecem ao criar ou alterar uma posição. */
export function OpcoesDasPosicoes({ inv, mudarInv }: Props) {
  const [novo, setNovo] = useState<Record<string, string>>({})
  return (
    <section className="bloco">
      <h2>Opções das posições</h2>
      <p className="apoio">Remover uma opção não muda as posições que já a usam.</p>
      {LISTAS.map(({ chave, titulo, nova }) => (
        <div key={chave} className="opcoes">
          <h3>{titulo}</h3>
          <ul className="itens">
            {inv[chave].map((o) => (
              <li key={o}>
                <span>{o}</span>
                <button className="texto" onClick={() => mudarInv({ [chave]: inv[chave].filter((x) => x !== o) })}>
                  Remover
                </button>
              </li>
            ))}
          </ul>
          <form
            className="grade"
            onSubmit={(e) => {
              e.preventDefault()
              const limpo = (novo[chave] ?? '').trim()
              if (!limpo || inv[chave].some((x) => igual(x, limpo))) return
              mudarInv({ [chave]: [...inv[chave], limpo] })
              setNovo({ ...novo, [chave]: '' })
            }}
          >
            <label className="campo">
              {nova}
              <input value={novo[chave] ?? ''} onChange={(e) => setNovo({ ...novo, [chave]: e.target.value })} />
            </label>
            <button className="secundario">Adicionar</button>
          </form>
        </div>
      ))}
    </section>
  )
}
