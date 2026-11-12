import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Resultado } from '../componentes'
import type { DocParaImportar, Viagem } from '../dados/tipos'
import { hoje, mesDe, nomeDoMes } from '../lib/datas'
import { lerCentavos, reais } from '../lib/dinheiro'
import { firebase, sairELimpar } from '../firebase'
import { useInstalar } from '../instalar'

interface Props {
  email: string | null
  viagens: Viagem[]
  caixinhaViagem: number
  aoGravar: (caminho: string, dados: object) => void
  aoExcluir: (caminho: string, dados: object, texto: string) => void
  aoImportar: (docs: DocParaImportar[]) => Promise<void>
}

export function Mais(props: Props) {
  const instalar = useInstalar()

  return (
    <div className="mais">
      <Viagens {...props} />
      <Importar aoImportar={props.aoImportar} />

      <section className="bloco">
        <h2>Conta</h2>
        <p>{props.email ?? 'Modo local, sem login.'}</p>
        {instalar && (
          <button className="primario" onClick={instalar}>
            Instalar o app
          </button>
        )}
        {firebase && (
          <>
            <p>Sair apaga a cópia dos dados guardada neste aparelho. Nada é apagado da sua conta.</p>
            <button className="perigo" onClick={() => void sairELimpar()}>
              Sair e limpar os dados deste aparelho
            </button>
          </>
        )}
        <p className="apoio">Versão {__VERSAO__}</p>
      </section>
    </div>
  )
}

function Viagens({ viagens, caixinhaViagem, aoGravar, aoExcluir }: Props) {
  const [nome, setNome] = useState('')
  const [mes, setMes] = useState(mesDe(hoje()))
  const [gasto, setGasto] = useState('')
  const [erro, setErro] = useState('')
  const ordenadas = [...viagens].sort((a, b) => b.mes.localeCompare(a.mes))

  function adicionar(e: FormEvent) {
    e.preventDefault()
    const valor = lerCentavos(gasto)
    if (!nome.trim() || !mes || !valor) return setErro('Preencha o nome, o mês e o gasto da viagem.')
    const id = crypto.randomUUID()
    aoGravar(`viagens/${id}`, { id, nome: nome.trim(), mes, gasto: valor, itens: [], obs: '' } satisfies Viagem)
    setNome('')
    setGasto('')
    setErro('')
  }

  return (
    <section className="bloco">
      <h2>Viagens</h2>
      <Resultado rotulo="Saldo da caixinha de viagem" valor={caixinhaViagem} forte />
      <ul className="viagens">
        {ordenadas.map((v) => (
          <li key={v.id}>
            <div className="linha-razao">
              <span>
                {v.nome} <small>{nomeDoMes(v.mes)}</small>
              </span>
              <span className="num">{reais(v.gasto)}</span>
            </div>
            {v.itens.length > 0 && (
              <p className="apoio">{v.itens.map((i) => `${i.nome} ${reais(i.valor)}`).join('; ')}</p>
            )}
            {v.obs && <p className="apoio">{v.obs}</p>}
            <button className="texto" onClick={() => aoExcluir(`viagens/${v.id}`, v, 'Viagem excluída')}>
              Excluir
            </button>
          </li>
        ))}
      </ul>
      <form className="grade" onSubmit={adicionar}>
        <label className="campo">
          Nova viagem
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Destino" />
        </label>
        <label className="campo">
          Mês
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
        </label>
        <label className="campo">
          Gasto
          <input className="num" inputMode="decimal" value={gasto} onChange={(e) => setGasto(e.target.value)} placeholder="0,00" />
        </label>
        <button className="secundario">Adicionar viagem</button>
      </form>
      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
    </section>
  )
}

function Importar({ aoImportar }: Pick<Props, 'aoImportar'>) {
  const [docs, setDocs] = useState<DocParaImportar[] | null>(null)
  const [estado, setEstado] = useState('')

  async function escolher(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    try {
      const carga = JSON.parse(await arquivo.text())
      const validos =
        Array.isArray(carga.docs) && carga.docs.every((d: DocParaImportar) => typeof d.caminho === 'string' && d.dados)
      if (!validos) throw new Error('formato')
      setDocs(carga.docs)
      setEstado('')
    } catch {
      setDocs(null)
      setEstado('Este arquivo não é uma carga do app.')
    }
  }

  async function importar() {
    if (!docs) return
    setEstado('Importando…')
    try {
      await aoImportar(docs)
      setEstado(`${docs.length} registros importados.`)
      setDocs(null)
    } catch {
      setEstado('A importação falhou. Confira a conexão e tente de novo.')
    }
  }

  const quantos = (colecao: string) => docs?.filter((d) => d.caminho.startsWith(colecao + '/')).length ?? 0

  return (
    <section className="bloco">
      <h2>Importar dados</h2>
      <p>Escolha o arquivo de carga inicial ou um backup. Registros com o mesmo código são substituídos, sem duplicar.</p>
      <label className="campo">
        Arquivo
        <input type="file" accept=".json,application/json" onChange={escolher} />
      </label>
      {docs && (
        <>
          <p>
            O arquivo tem {docs.length} registros: {quantos('lancamentos')} lançamentos, {quantos('meses')} meses,{' '}
            {quantos('posicoes')} posições e {quantos('operacoes')} compras e vendas, além de metas, viagens e listas.
          </p>
          <button className="primario" onClick={() => void importar()}>
            Importar {docs.length} registros
          </button>
        </>
      )}
      {estado && <p role="status">{estado}</p>}
    </section>
  )
}
