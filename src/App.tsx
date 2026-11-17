import { useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { firebase } from './firebase'
import { useAcesso, type Acesso } from './acesso'
import { criarRepoFirestore } from './dados/repoFirestore'
import { criarRepoLocal } from './dados/repoLocal'
import type { Config, EstadoSync, Historico, Lancamento, Lista, MesDoc, Operacao, Posicao, Viagem } from './dados/tipos'
import { mesVazio, saldoDaCaixinha } from './lib/calculos'
import { hoje, mesDe, nomeDoMes, somarMes } from './lib/datas'
import { ocultarValores } from './lib/dinheiro'
import { PILHA_VAZIA, descrever, desfazer, refazer, registrar, type Pilha } from './lib/pilha'
import { Login } from './telas/Login'
import { Inicio } from './telas/Inicio'
import { Gastos } from './telas/Gastos'
import { Investimentos } from './telas/Investimentos'
import { Lancar } from './telas/Lancar'
import { Mais } from './telas/Mais'

type Aba = 'inicio' | 'gastos' | 'invest' | 'mais'

const CHAVE_OCULTO = 'financas-ocultar'
function lerOculto(): boolean {
  try {
    return localStorage.getItem(CHAVE_OCULTO) === '1'
  } catch {
    return false
  }
}

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
  return <ComAcesso usuario={usuario ?? null} />
}

/** Descobre de quem são os dados que esta conta abre antes de montar o app. */
function ComAcesso({ usuario }: { usuario: User | null }) {
  const acesso = useAcesso(usuario?.uid)
  if (!acesso) return <p className="abrindo">Abrindo…</p>
  return <Principal usuario={usuario} acesso={acesso} />
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

function Principal({ usuario, acesso }: { usuario: User | null; acesso: Acesso }) {
  const { dono, consulta } = acesso
  const repo = useMemo(() => (firebase && dono ? criarRepoFirestore(firebase.db, dono) : criarRepoLocal()), [dono])

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
  const [oculto, setOculto] = useState(lerOculto)
  // Antes de desenhar as telas: é o que faz reais() e numero() devolverem bolinhas.
  ocultarValores(oculto)
  function trocarOculto() {
    try {
      localStorage.setItem(CHAVE_OCULTO, oculto ? '' : '1')
    } catch {
      // Sem armazenamento, a escolha vale só até fechar o app.
    }
    setOculto(!oculto)
  }
  const ano = mes.slice(0, 4)
  const caixinha = saldoDaCaixinha(meses, viagens)

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
  const aplicar = (caminho: string, dados: object | null) =>
    void (dados ? repo.gravar(caminho, dados) : repo.excluir(caminho)).catch(falhou)

  // Como cada documento está agora, para guardar o "antes" de cada gravação.
  const comId = <T extends { id: string }>(docs: T[]) => (id: string) => docs.find((d) => d.id === id)
  const atual: Record<string, (id: string) => object | undefined> = {
    lancamentos: comId(itensDoAno ?? []),
    meses: (id) => meses.find((m) => m.mes === id),
    config: () => config ?? undefined,
    viagens: comId(viagens),
    posicoes: comId(posicoes),
    operacoes: comId(operacoes),
    historico: (id) => historico.find((h) => h.mes === id),
    listas: comId(listas),
  }
  const pilha = useRef(PILHA_VAZIA)
  const mesmoLote = useRef(false)
  const [podeDesfazer, setPodeDesfazer] = useState(false)
  const [podeRefazer, setPodeRefazer] = useState(false)
  function trocarPilha(nova: Pilha) {
    pilha.current = nova
    setPodeDesfazer(nova.feitas.length > 0)
    setPodeRefazer(nova.desfeitas.length > 0)
  }
  // A pilha é deste aparelho e desta conta: trocou de conta, começa vazia.
  useEffect(() => trocarPilha(PILHA_VAZIA), [repo])

  /** Grava (ou exclui, com dados null) e guarda a alteração para o desfazer. */
  function alterar(caminho: string, dados: object | null, antes?: object | null) {
    if (consulta) return setAviso({ texto: 'Modo consulta: nada é alterado.' })
    const [colecao, id] = caminho.split('/')
    const anterior = antes !== undefined ? antes : (atual[colecao]?.(id) ?? null)
    trocarPilha(registrar(pilha.current, { caminho, antes: anterior, depois: dados }, mesmoLote.current))
    // Gravações disparadas pelo mesmo clique formam uma alteração só.
    if (!mesmoLote.current) {
      mesmoLote.current = true
      setTimeout(() => (mesmoLote.current = false), 0)
    }
    aplicar(caminho, dados)
  }
  const gravar = (caminho: string, dados: object) => alterar(caminho, dados)

  function desfazerUltima() {
    const { pilha: nova, acao } = desfazer(pilha.current)
    if (!acao) return
    trocarPilha(nova)
    acao.forEach((p) => aplicar(p.caminho, p.antes))
    setAviso({ texto: `Desfeito: ${descrever(acao)}` })
  }

  function refazerUltima() {
    const { pilha: nova, acao } = refazer(pilha.current)
    if (!acao) return
    trocarPilha(nova)
    acao.forEach((p) => aplicar(p.caminho, p.depois))
    setAviso({ texto: `Refeito: ${descrever(acao)}` })
  }

  function salvar(l: Lancamento, anterior?: Lancamento) {
    // O gasto pode cair em outro ano, que não está carregado: o "antes" vem de quem chamou.
    alterar(`lancamentos/${l.id}`, l, anterior ?? (l.mes.startsWith(ano) ? undefined : null))
    setEditor(null)
    const onde = l.mes === mes ? '' : ` em ${nomeDoMes(l.mes)}`
    setAviso({ texto: (anterior ? 'Gasto alterado' : 'Gasto salvo') + onde, desfazer: desfazerUltima })
  }

  function excluir(caminho: string, dados: object, texto: string) {
    alterar(caminho, null, dados)
    setEditor(null)
    setAviso({ texto, desfazer: desfazerUltima })
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
    <div className={['app', oculto && 'oculto', consulta && 'consulta'].filter(Boolean).join(' ')}>
      <nav className="navegacao" aria-label="Áreas do app">
        <p className="marca">Finanças</p>
        {abas.slice(0, 2).map(botaoAba)}
        {!consulta && (
          <button className="lancar" onClick={() => setEditor('novo')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Lançar
          </button>
        )}
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
          <div className="acoes-topo">
            <button
              aria-label={oculto ? 'Mostrar os valores' : 'Ocultar os valores'}
              title={oculto ? 'Mostrar os valores' : 'Ocultar os valores'}
              aria-pressed={oculto}
              onClick={trocarOculto}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
                {oculto && <path d="M4 4l16 16" />}
              </svg>
            </button>
            {!consulta && (
              <>
                <button aria-label="Desfazer" title="Desfazer" disabled={!podeDesfazer} onClick={desfazerUltima}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
                  </svg>
                </button>
                <button aria-label="Refazer" title="Refazer" disabled={!podeRefazer} onClick={refazerUltima}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" />
                  </svg>
                </button>
              </>
            )}
            {consulta && <span className="sync sync-neutro">Consulta</span>}
            <span className={`sync sync-${sync.tom}`} role="status">
              {sync.texto}
            </span>
          </div>
        </header>

        {!firebase && <p className="faixa">Modo local: os dados ficam só neste aparelho.</p>}

        <main>
          {aba === 'inicio' && <Inicio itens={itens} mes={mes} mesDoc={mesDoc} config={config} historico={historico} operacoes={operacoes} consulta={consulta} />}
          {aba === 'gastos' && (
            <Gastos
              itens={itens}
              itensDoAno={itensDoAno ?? []}
              mes={mes}
              mesDoc={mesDoc}
              meses={meses}
              caixinha={caixinha}
              config={config}
              aoAbrir={consulta ? () => {} : setEditor}
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
              consulta={consulta}
              viagens={viagens}
              posicoes={posicoes}
              ano={ano}
              caixinhaViagem={caixinha}
              aoGravar={gravar}
              aoExcluir={excluir}
              aoImportar={(docs) => repo.importar(docs).then(() => trocarPilha(PILHA_VAZIA))}
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
