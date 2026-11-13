import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Resultado } from '../componentes'
import type { Config, DocParaImportar, Lista, Viagem } from '../dados/tipos'
import { exportarBackup, exportarExcel } from '../lib/exportar'
import { Listas } from './Listas'
import { Metas } from './Metas'
import { hoje, mesCurto, mesDe } from '../lib/datas'
import { abatidoDaViagem } from '../lib/calculos'
import { lerCentavos, numero, reais } from '../lib/dinheiro'
import { firebase, sairELimpar } from '../firebase'
import { useInstalar } from '../instalar'

interface Props {
  email: string | null
  viagens: Viagem[]
  /** Ano do mês selecionado no topo: a lista de viagens mostra só ele. */
  ano: string
  caixinhaViagem: number
  aoGravar: (caminho: string, dados: object) => void
  aoExcluir: (caminho: string, dados: object, texto: string) => void
  aoImportar: (docs: DocParaImportar[]) => Promise<void>
  config: Config | null
  listas: Lista[]
  aoLerTudo: () => Promise<DocParaImportar[]>
}

type Secao = 'viagens' | 'metas' | 'listas' | 'dados' | 'conta'
const SECOES: { id: Secao; nome: string }[] = [
  { id: 'viagens', nome: 'Viagens' },
  { id: 'metas', nome: 'Metas' },
  { id: 'listas', nome: 'Listas' },
  { id: 'dados', nome: 'Dados' },
  { id: 'conta', nome: 'Conta' },
]

export function Mais(props: Props) {
  const [secao, setSecao] = useState<Secao>('viagens')

  return (
    <div className="mais">
      <div className="visoes cinco" role="tablist" aria-label="Seções de Mais">
        {SECOES.map((s) => (
          <button key={s.id} role="tab" aria-selected={secao === s.id} onClick={() => setSecao(s.id)}>
            {s.nome}
          </button>
        ))}
      </div>
      {secao === 'viagens' && <Viagens {...props} />}
      {secao === 'metas' &&
        (props.config ? (
          <Metas config={props.config} aoGravar={(c) => props.aoGravar('config/geral', c)} />
        ) : (
          <section className="vazio">
            <h2>Ainda não há metas</h2>
            <p>Importe a carga inicial na seção Dados.</p>
          </section>
        ))}
      {secao === 'listas' && <Listas listas={props.listas} aoGravar={props.aoGravar} />}
      {secao === 'dados' && (
        <>
          <Importar aoImportar={props.aoImportar} />
          <Exportar aoLerTudo={props.aoLerTudo} />
        </>
      )}
      {secao === 'conta' && <Conta email={props.email} />}
    </div>
  )
}

function Exportar({ aoLerTudo }: Pick<Props, 'aoLerTudo'>) {
  const [estado, setEstado] = useState('')
  async function exportar(como: (docs: DocParaImportar[]) => void | Promise<void>) {
    setEstado('Preparando o arquivo…')
    try {
      const docs = await aoLerTudo()
      await como(docs)
      setEstado(`Arquivo gerado com ${docs.length} registros.`)
    } catch {
      setEstado('Não foi possível gerar o arquivo. Confira a conexão e tente de novo.')
    }
  }
  return (
    <section className="bloco">
      <h2>Exportar</h2>
      <p>O Excel traz lançamentos, meses, posições, compras e vendas e histórico. O backup guarda tudo e pode ser importado de volta.</p>
      <div className="botoes">
        <button className="secundario" onClick={() => void exportar(exportarExcel)}>
          Exportar para Excel
        </button>
        <button className="secundario" onClick={() => void exportar(exportarBackup)}>
          Baixar backup
        </button>
      </div>
      {estado && <p role="status">{estado}</p>}
    </section>
  )
}

function Conta({ email }: Pick<Props, 'email'>) {
  const instalar = useInstalar()
  return (
      <section className="bloco sem-linha">
        <h2>Conta</h2>
        <p>{email ?? 'Modo local, sem login.'}</p>
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
  )
}

function Viagens({ viagens, ano, caixinhaViagem, aoGravar, aoExcluir }: Props) {
  const [nome, setNome] = useState('')
  const [mes, setMes] = useState(mesDe(hoje()))
  const [gasto, setGasto] = useState('')
  const [abater, setAbater] = useState('')
  const [obs, setObs] = useState('')
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState<Viagem | null>(null)
  const ordenadas = viagens.filter((v) => v.mes.startsWith(ano)).sort((a, b) => b.mes.localeCompare(a.mes))

  function limpar() {
    setEditando(null)
    setNome('')
    setGasto('')
    setAbater('')
    setObs('')
    setErro('')
  }

  function editar(v: Viagem) {
    setEditando(v)
    setNome(v.nome)
    setMes(v.mes)
    setGasto(numero(v.gasto))
    setAbater(abatidoDaViagem(v) ? numero(abatidoDaViagem(v)) : '')
    setObs(v.obs)
    setErro('')
  }

  function adicionar(e: FormEvent) {
    e.preventDefault()
    const valor = lerCentavos(gasto)
    if (!nome.trim() || !mes || !valor) return setErro('Preencha o nome, o mês e o gasto da viagem.')
    const abatido = abater.trim() ? lerCentavos(abater) : 0
    if (abatido === null) return setErro('Confira o valor a abater da caixinha.')
    if (abatido > valor) return setErro('O valor a abater não pode passar do gasto total.')
    // "abater" é a forma antiga; ao salvar, a viagem passa a guardar só o valor abatido.
    const { abater: _antigo, ...base } = editando ?? { id: crypto.randomUUID(), itens: [] }
    aoGravar(`viagens/${base.id}`, { ...base, nome: nome.trim(), mes, gasto: valor, obs: obs.trim(), abatido } satisfies Viagem)
    limpar()
  }

  return (
    <section className="bloco sem-linha">
      <h2>Viagens de {ano}</h2>
      <Resultado rotulo="Saldo da caixinha de viagem" valor={caixinhaViagem} forte />
      <ul className="viagens">
        {ordenadas.map((v) => (
          <li key={v.id}>
            <div className="linha-razao">
              <span className="local">{v.nome}</span>
              <small>Data: {mesCurto(v.mes)}</small>
              <span className="num">{reais(v.gasto)}</span>
            </div>
            {v.itens.length > 0 && (
              <p className="apoio">{v.itens.map((i) => `${i.nome} ${reais(i.valor)}`).join('; ')}</p>
            )}
            {v.obs && <p className="apoio">{v.obs}</p>}
            {abatidoDaViagem(v) > 0 && <p className="apoio">Abatido da caixinha: {reais(abatidoDaViagem(v))}</p>}
            <button className="texto" onClick={() => editar(v)}>
              Editar
            </button>
            <button className="texto" onClick={() => aoExcluir(`viagens/${v.id}`, v, 'Viagem excluída')}>
              Excluir
            </button>
          </li>
        ))}
      </ul>
      <form className="grade" onSubmit={adicionar}>
        <label className="campo">
          {editando ? 'Editar viagem' : 'Nova viagem'}
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Destino" />
        </label>
        <label className="campo">
          Mês
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
        </label>
        <label className="campo">
          Gasto total
          <input className="num" inputMode="decimal" value={gasto} onChange={(e) => setGasto(e.target.value)} placeholder="0,00" />
        </label>
        <label className="campo">
          Abater da caixinha
          <input className="num" inputMode="decimal" value={abater} onChange={(e) => setAbater(e.target.value)} placeholder="0,00" />
        </label>
        <label className="campo largo">
          Anotações
          <textarea
            rows={5}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder={'Hotel: 574,55 (2 diárias)\nÔnibus: 174,00'}
          />
        </label>
        <button className="secundario">{editando ? 'Salvar alterações' : 'Adicionar viagem'}</button>
        {editando && (
          <button type="button" className="texto" onClick={limpar}>
            Cancelar
          </button>
        )}
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
