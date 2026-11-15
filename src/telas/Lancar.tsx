import { useState, type FormEvent } from 'react'
import type { Lancamento } from '../dados/tipos'
import { abateDaFatura, abatePorPadrao } from '../lib/calculos'
import { CATEGORIAS, type CategoriaId } from '../lib/categorias'
import { hoje, mesDe } from '../lib/datas'
import { lerCentavos } from '../lib/dinheiro'

interface Props {
  inicial?: Lancamento
  aoSalvar: (l: Lancamento, anterior?: Lancamento) => void
  aoExcluir: (l: Lancamento) => void
  aoFechar: () => void
}

// "Comi na rua" aparece como escolha própria, logo depois de Alimentação.
type Escolha = CategoriaId | 'rua'
const ESCOLHAS = CATEGORIAS.flatMap((c): { id: Escolha; nome: string }[] =>
  c.id === 'alim' ? [c, { id: 'rua', nome: 'Comi na rua' }] : [c],
)

const ULTIMA = 'financas-ultima-categoria'

function ultimaEscolha(): Escolha {
  const salva = localStorage.getItem(ULTIMA)
  return ESCOLHAS.some((e) => e.id === salva) ? (salva as Escolha) : 'alim'
}

export function Lancar({ inicial, aoSalvar, aoExcluir, aoFechar }: Props) {
  const [valor, setValor] = useState(inicial ? (inicial.valor / 100).toFixed(2).replace('.', ',') : '')
  const [escolha, setEscolha] = useState<Escolha>(
    inicial ? (inicial.comiNaRua ? 'rua' : inicial.categoria) : ultimaEscolha,
  )
  const [data, setData] = useState(inicial ? (inicial.data ?? '') : hoje())
  const [obs, setObs] = useState(inicial?.obs ?? '')
  const categoria = escolha === 'rua' ? 'alim' : escolha
  // Sem escolha feita na caixinha, um gasto novo segue o padrão da categoria.
  const [marcado, setMarcado] = useState<boolean | null>(inicial ? abateDaFatura(inicial) : null)
  const abater = marcado ?? abatePorPadrao(categoria)
  const [erro, setErro] = useState('')

  function salvar(e: FormEvent) {
    e.preventDefault()
    const centavos = lerCentavos(valor)
    if (!centavos) return setErro('Digite o valor do gasto, como 45,90.')
    // Um lançamento da planilha pode não ter dia; sem data nova, ele continua no mês original.
    if (!data && !inicial) return setErro('Escolha a data do gasto.')
    const agora = Date.now()
    localStorage.setItem(ULTIMA, escolha)
    aoSalvar(
      {
        id: inicial?.id ?? crypto.randomUUID(),
        mes: data ? mesDe(data) : inicial!.mes,
        data: data || null,
        valor: centavos,
        categoria,
        comiNaRua: escolha === 'rua' || undefined,
        abater: categoria === 'cartao' ? undefined : abater,
        obs: obs.trim() || undefined,
        criadoEm: inicial?.criadoEm ?? agora,
        editadoEm: agora,
      },
      inicial,
    )
  }

  return (
    <div className="folha-fundo" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <form className="folha" onSubmit={salvar} aria-label={inicial ? 'Alterar gasto' : 'Lançar gasto'}>
        <div className="folha-topo">
          <h2>{inicial ? 'Alterar gasto' : 'Lançar gasto'}</h2>
          <button type="button" className="texto" onClick={aoFechar}>
            Cancelar
          </button>
        </div>

        <label className="campo-valor">
          Valor
          <span>
            R$
            <input
              inputMode="decimal"
              autoFocus
              placeholder="0,00"
              value={valor}
              onChange={(e) => {
                setValor(e.target.value)
                setErro('')
              }}
            />
          </span>
        </label>

        <fieldset className="categorias">
          <legend>Categoria</legend>
          {ESCOLHAS.map((c) => (
            <label key={c.id}>
              <input type="radio" name="categoria" checked={escolha === c.id} onChange={() => setEscolha(c.id)} />
              <span>{c.nome}</span>
            </label>
          ))}
        </fieldset>

        <div className="dupla">
          <label>
            Data
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </label>
          <label>
            Observação
            <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
          </label>
        </div>

        {categoria !== 'cartao' && (
          <label className="marcar">
            <input type="checkbox" checked={abater} onChange={(e) => setMarcado(e.target.checked)} />
            Abater da fatura
          </label>
        )}

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
          <button className="primario">{inicial ? 'Salvar alteração' : 'Salvar gasto'}</button>
        </div>
      </form>
    </div>
  )
}
