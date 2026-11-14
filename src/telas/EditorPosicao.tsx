import { useState, type FormEvent } from 'react'
import type { ParametrosInvest, Posicao } from '../dados/tipos'
import { lerCentavos, numero } from '../lib/dinheiro'
import { caixasDe } from '../lib/investimentos'

interface Props {
  inicial?: Posicao
  /** Posição na lista para uma posição nova. */
  ordem: number
  inv: ParametrosInvest
  aoSalvar: (p: Posicao) => void
  aoExcluir: (p: Posicao) => void
  aoFechar: () => void
}

/** Todos os campos de uma linha da aba Posições. */
export function EditorPosicao({ inicial, ordem, inv, aoSalvar, aoExcluir, aoFechar }: Props) {
  const [p, setP] = useState<Posicao>(
    inicial ?? {
      id: crypto.randomUUID(),
      ordem,
      nome: '',
      instituicao: inv.instituicoes[0] ?? '',
      classe: inv.classes[0] ?? '',
      caixa: caixasDe(inv)[0],
      valor: 0,
      rentabilidade: '',
      vencimento: null,
      liquidez: inv.liquidez[0] ?? '',
      fgc: false,
      obs: '',
    },
  )
  const [valor, setValor] = useState(numero(p.valor))
  const [erro, setErro] = useState('')
  const mudar = (parte: Partial<Posicao>) => setP({ ...p, ...parte })

  function salvar(e: FormEvent) {
    e.preventDefault()
    const centavos = lerCentavos(valor)
    if (!p.nome.trim() || centavos === null) return setErro('Preencha o nome e o valor atual.')
    aoSalvar({ ...p, nome: p.nome.trim(), valor: centavos })
  }

  const escolha = (rotulo: string, chave: 'instituicao' | 'classe' | 'caixa' | 'liquidez', opcoes: string[]) => (
    <label className="campo">
      {rotulo}
      <select value={p[chave]} onChange={(e) => mudar({ [chave]: e.target.value })}>
        {[...new Set([...opcoes, p[chave]])].filter(Boolean).map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  )

  return (
    <div className="folha-fundo" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <form className="folha" onSubmit={salvar} aria-label={inicial ? 'Alterar posição' : 'Nova posição'}>
        <div className="folha-topo">
          <h2>{inicial ? 'Alterar posição' : 'Nova posição'}</h2>
          <button type="button" className="texto" onClick={aoFechar}>
            Cancelar
          </button>
        </div>
        <label className="campo">
          Investimento
          <input value={p.nome} onChange={(e) => mudar({ nome: e.target.value })} autoFocus={!inicial} />
        </label>
        <div className="grade">
          {escolha('Instituição', 'instituicao', inv.instituicoes)}
          {escolha('Classe', 'classe', inv.classes)}
          {escolha('Caixa', 'caixa', caixasDe(inv))}
          {escolha('Liquidez', 'liquidez', inv.liquidez)}
          <label className="campo">
            Valor atual
            <input className="num" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
          </label>
          <label className="campo">
            Rentabilidade
            <input value={p.rentabilidade} onChange={(e) => mudar({ rentabilidade: e.target.value })} />
          </label>
          <label className="campo">
            Vencimento
            <input type="date" value={p.vencimento ?? ''} onChange={(e) => mudar({ vencimento: e.target.value || null })} />
          </label>
        </div>
        <label className="marcar">
          <input type="checkbox" checked={p.fgc} onChange={(e) => mudar({ fgc: e.target.checked })} />
          Coberto pelo FGC
        </label>
        <label className="campo">
          Observação
          <input value={p.obs} onChange={(e) => mudar({ obs: e.target.value })} />
        </label>
        {erro && (
          <p className="erro" role="alert">
            {erro}
          </p>
        )}
        <div className="folha-acoes">
          {inicial && (
            <button type="button" className="perigo" onClick={() => aoExcluir(inicial)}>
              Excluir
            </button>
          )}
          <button className="primario">{inicial ? 'Salvar alteração' : 'Salvar posição'}</button>
        </div>
      </form>
    </div>
  )
}
