import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { firebase } from './firebase'
import { criarRepoFirestore } from './dados/repoFirestore'
import { criarRepoLocal } from './dados/repoLocal'
import type { Config, EstadoSync, Historico, Lancamento, Lista, MesDoc, Operacao, Posicao, Viagem } from './dados/tipos'
import { mesVazio } from './lib/calculos'
import { hoje, mesDe, nomeDoMes, somarMes } from './lib/datas'
import { Login } from './telas/Login'
import { Inicio } from './telas/Inicio'
import { Gastos } from './telas/Gastos'
import { Investimentos } from './telas/Investimentos'
import { Lancar } from './telas/Lancar'
import { Mais } from './telas/Mais'

type Aba = 'inicio' | 'gastos' | 'invest' | 'mais'

interface Aviso {
  texto: string
  desfazer?: () => void
}

export function App() {
  // undefined = ainda não sabemos se há sessão; null = sem sessão.
  const [usuario, setUsuario] = useState<User | null | undefined>(firebase ? undefined : null)
  useEffect(() => (firebase ? onAuthStateChanged(firebase.auth, setUsuario) : undefined), [])

  if (firebase && usuario === undefined) return <p className="abrindo">Abrindo…</p>
  if (firebase && !usuario) return <Login />
  return <Principal usuario={usuario ?? null} />
}

function useConectado() {
  const [conectado, setConectado] = useState(navigator.onLine)
  useEffect(() => {
    const atualizar = () => setConectado(navigator.onLine)
    window.addEventListener('online', atualizar)
    window.addEventListener('offline', atualizar)
    return () => {
      window.removeEventListener('online', atualizar)
      window.removeEventListener('offline', atualizar)
    }
  }, [])
  return conectado
}

function Principal({ usuario }: { usuario: User | null }) {
  const uid = usuario?.uid
  const repo = useMemo(() => (firebase && uid ? criarRepoFirestore(firebase.db, uid) : criarRepoLocal()), [uid])

  const [aba, setAba] = useState<Aba>('inicio')
  const [mes, setMes] = useState(() => mesDe(hoje()))
  const [itensDoAno, setItensDoAno] = useState<Lancamento[] | null>(null)
  const [estado, setEstado] = useState<EstadoSync>({ pendente: false, doCache: false })
  const [meses, setMeses] = useState<MesDoc[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [viagens, setViagens] = useState<Viagem[]>([])
  const [posicoes, setPosicoes] = useState<Posicao[]>([])
  const [operacoes, setOperacoes] = useState<Operacao[]>([])
  const [historico, setHistorico] = useState<Historico[]>([])
  const [listas, setListas] = useState<Lista[]>([])
  const [editor, setEditor] = useState<'novo' | Lancamento | null>(null)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const conectado = useConectado()
  const ano = mes.slice(0, 4)

  useEffect(() => {
    setItensDoAno(null)
    return repo.ouvirLancamentos(ano, (novos, novoEstado) => {
      setItensDoAno(novos)
      setEstado(novoEstado)
    })
  }, [repo, ano])

  useEffect(() => {
    const parar = [
      repo.ouvirColecao<MesDoc>('meses', setMeses),
      repo.ouvirColecao<Config>('config', (docs) => setConfig(docs[0] ?? null)),
      repo.ouvirColecao<Viagem>('viagens', setViagens),
      repo.ouvirColecao<Posicao>('posicoes', setPosicoes),
      repo.ouvirColecao<Operacao>('operacoes', setOperacoes),
      repo.ouvirColecao<Historico>('historico', setHistorico),
      repo.ouvirColecao<Lista>('listas', setListas),
    ]
    return () => parar.forEach((p) => p())
  }, [repo])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 6000)
    return () => clearTimeout(t)
  }, [aviso])

  const itens = useMemo(() => itensDoAno?.filter((l) => l.mes === mes) ?? null, [itensDoAno, mes])
  const mesDoc = meses.find((m) => m.mes === mes) ?? mesVazio(mes)

  const falhou = () => setAviso({ texto: 'Não foi possível gravar. Tente de novo.' })
  const gravar = (caminho: string, dados: object) => void repo.gravar(caminho, dados).catch(falhou)

  function salvar(l: Lancamento, anterior?: Lancamento) {
    gravar(`lancamentos/${l.id}`, l)
    setEditor(null)
    const onde = l.mes === mes ? '' : ` em ${nomeDoMes(l.mes)}`
    setAviso({
      texto: (anterior ? 'Gasto alterado' : 'Gasto salvo') + onde,
      desfazer: () =>
        anterior
          ? gravar(`lancamentos/${l.id}`, anterior)
          : void repo.excluir(`lancamentos/${l.id}`).catch(falhou),
    })
  }

  function excluir(caminho: string, dados: object, texto: string) {
    repo.excluir(caminho).catch(falhou)
    setEditor(null)
    setAviso({ texto, desfazer: () => gravar(caminho, dados) })
  }

  /** O "Cartão atualizado" de um mês vira um lançamento de Cartão no mês seguinte. */
  function lancarCartao(valor: number) {
    const proximo = somarMes(mes, 1)
    const agora = Date.now()
    // Código fixo por mês: repetir o botão substitui o lançamento, em vez de duplicar.
    salvar({
      id: `cartao-${mes}`,
      mes: proximo,
      data: `${proximo}-01`,
      valor,
      categoria: 'cartao',
      obs: `Fatura de ${nomeDoMes(mes)}`,
      criadoEm: agora,
      editadoEm: agora,
    })
  }

  const sync = !firebase
    ? { texto: 'Modo local', tom: 'aviso' }
    : !conectado
      ? { texto: estado.pendente ? 'Sem conexão, envio pendente' : 'Sem conexão', tom: 'aviso' }
      : estado.pendente
        ? { texto: 'Salvando…', tom: 'neutro' }
        : { texto: 'Salvo', tom: 'ok' }

  const abas: { id: Aba; nome: string; icone: string }[] = [
    { id: 'inicio', nome: 'Início', icone: 'M4 11 12 4l8 7v9h-5v-6H9v6H4z' },
    { id: 'gastos', nome: 'Gastos', icone: 'M5 6h14M5 12h14M5 18h9' },
    { id: 'invest', nome: 'Investimentos', icone: 'M4 19h16M7 16v-5M12 16V6M17 16v-8' },
    { id: 'mais', nome: 'Mais', icone: 'M5 12h.01M12 12h.01M19 12h.01' },
  ]
  const botaoAba = (a: (typeof abas)[number]) => (
    <button key={a.id} className="aba" aria-current={aba === a.id ? 'page' : undefined} onClick={() => setAba(a.id)}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={a.icone} />
      </svg>
      {a.nome}
    </button>
  )

  return (
    <div className="app">
      <nav className="navegacao" aria-label="Áreas do app">
        <p className="marca">Finanças</p>
        {abas.slice(0, 2).map(botaoAba)}
        <button className="lancar" onClick={() => setEditor('novo')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Lançar
        </button>
        {abas.slice(2).map(botaoAba)}
      </nav>

      <div className="conteudo">
        <header className="topo">
          <div className="seletor-mes">
            <button aria-label="Mês anterior" onClick={() => setMes(somarMes(mes, -1))}>
              ‹
            </button>
            <h1>{nomeDoMes(mes)}</h1>
            <button aria-label="Mês seguinte" onClick={() => setMes(somarMes(mes, 1))}>
              ›
            </button>
          </div>
          <span className={`sync sync-${sync.tom}`} role="status">
            {sync.texto}
          </span>
        </header>

        {!firebase && <p className="faixa">Modo local: os dados ficam só neste aparelho.</p>}

        <main>
          {aba === 'inicio' && <Inicio itens={itens} mes={mes} mesDoc={mesDoc} config={config} />}
          {aba === 'gastos' && (
            <Gastos
              itens={itens}
              itensDoAno={itensDoAno ?? []}
              mes={mes}
              mesDoc={mesDoc}
              meses={meses}
              config={config}
              aoAbrir={setEditor}
              aoGravarMes={(m) => gravar(`meses/${m.mes}`, m)}
              aoLancarCartao={lancarCartao}
            />
          )}
          {aba === 'invest' && (
            <Investimentos
              posicoes={posicoes}
              operacoes={operacoes}
              historico={historico}
              config={config}
              mes={mes}
              aoGravar={gravar}
              aoExcluir={excluir}
            />
          )}
          {aba === 'mais' && (
            <Mais
              email={usuario?.email ?? null}
              viagens={viagens}
              caixinhaViagem={meses.filter((m) => m.mes.startsWith(ano)).reduce((s, m) => s + m.caixinhaViagem, 0)}
              aoGravar={gravar}
              aoExcluir={excluir}
              aoImportar={(docs) => repo.importar(docs)}
              config={config}
              listas={listas}
              aoLerTudo={() => repo.lerTudo()}
            />
          )}
        </main>
      </div>

      {editor && (
        <Lancar
          inicial={editor === 'novo' ? undefined : editor}
          aoSalvar={salvar}
          aoExcluir={(l) => excluir(`lancamentos/${l.id}`, l, 'Gasto excluído')}
          aoFechar={() => setEditor(null)}
        />
      )}

      {aviso && (
        <div className="aviso" role="status">
          <span>{aviso.texto}</span>
          {aviso.desfazer && (
            <button
              onClick={() => {
                aviso.desfazer?.()
                setAviso(null)
              }}
            >
              Desfazer
            </button>
          )}
        </div>
      )}
    </div>
  )
}
