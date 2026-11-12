import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { firebase } from './firebase'
import { criarRepoFirestore } from './dados/repoFirestore'
import { criarRepoLocal } from './dados/repoLocal'
import type { EstadoSync, Lancamento } from './dados/tipos'
import { hoje, mesDe, nomeDoMes, somarMes } from './lib/datas'
import { Login } from './telas/Login'
import { Inicio } from './telas/Inicio'
import { Gastos } from './telas/Gastos'
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
  const [itens, setItens] = useState<Lancamento[] | null>(null)
  const [estado, setEstado] = useState<EstadoSync>({ pendente: false, doCache: false })
  const [editor, setEditor] = useState<'novo' | Lancamento | null>(null)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const conectado = useConectado()

  useEffect(() => {
    setItens(null)
    return repo.ouvirLancamentos(mes, (novos, novoEstado) => {
      setItens(novos)
      setEstado(novoEstado)
    })
  }, [repo, mes])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 6000)
    return () => clearTimeout(t)
  }, [aviso])

  const falhou = () => setAviso({ texto: 'Não foi possível gravar. Tente de novo.' })

  function salvar(l: Lancamento, anterior?: Lancamento) {
    repo.salvarLancamento(l).catch(falhou)
    setEditor(null)
    const onde = l.mes === mes ? '' : ` em ${nomeDoMes(l.mes)}`
    setAviso({
      texto: (anterior ? 'Gasto alterado' : 'Gasto salvo') + onde,
      desfazer: () => {
        const volta = anterior ? repo.salvarLancamento(anterior) : repo.excluirLancamento(l.id)
        volta.catch(falhou)
      },
    })
  }

  function excluir(l: Lancamento) {
    repo.excluirLancamento(l.id).catch(falhou)
    setEditor(null)
    setAviso({ texto: 'Gasto excluído', desfazer: () => void repo.salvarLancamento(l).catch(falhou) })
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

        {!firebase && (
          <p className="faixa">Modo local: os dados ficam só neste aparelho, até o Firebase ser configurado.</p>
        )}

        <main>
          {aba === 'inicio' && <Inicio itens={itens} mes={mes} />}
          {aba === 'gastos' && <Gastos itens={itens} mes={mes} aoAbrir={setEditor} />}
          {aba === 'invest' && (
            <section className="vazio">
              <h2>Investimentos chegam na etapa 3</h2>
              <p>Painel, posições, compras e vendas, histórico e sugestão de aporte entram aqui.</p>
            </section>
          )}
          {aba === 'mais' && <Mais email={usuario?.email ?? null} />}
        </main>
      </div>

      {editor && (
        <Lancar
          inicial={editor === 'novo' ? undefined : editor}
          aoSalvar={salvar}
          aoExcluir={excluir}
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
