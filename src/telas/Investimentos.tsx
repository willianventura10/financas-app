import { useState, type FormEvent } from 'react'
import { CampoValor, Composicao, Resultado, Status } from '../componentes'
import type { Config, Historico, Operacao, ParametrosInvest, Posicao } from '../dados/tipos'
import { dataBr, hoje, nomeDoMes } from '../lib/datas'
import { lerCentavos, numero, porcento, reais } from '../lib/dinheiro'
import {
  alertaDeVencimento,
  diasAte,
  fotoDoMes,
  linhasDoHistorico,
  objetivosNoHistorico,
  painel as calcularPainel,
  resumoPorAtivo,
  sugestaoDeAporte,
  valorNoHistorico,
  type Painel,
} from '../lib/investimentos'
import { EditorPosicao } from './EditorPosicao'

interface Props {
  posicoes: Posicao[]
  operacoes: Operacao[]
  historico: Historico[]
  config: Config | null
  mes: string
  aoGravar: (caminho: string, dados: object) => void
  aoExcluir: (caminho: string, dados: object, texto: string) => void
}

type Visao = 'painel' | 'posicoes' | 'compras' | 'historico'
const VISOES: { id: Visao; nome: string }[] = [
  { id: 'painel', nome: 'Painel' },
  { id: 'posicoes', nome: 'Posições' },
  { id: 'compras', nome: 'Compras' },
  { id: 'historico', nome: 'Histórico' },
]

export function Investimentos(props: Props) {
  const [visao, setVisao] = useState<Visao>('painel')
  const inv = props.config?.investimentos
  if (!inv)
    return (
      <section className="vazio">
        <h2>Faltam as metas dos investimentos</h2>
        <p>Importe a carga inicial em Mais, na parte Dados, para preencher esta área.</p>
      </section>
    )

  const posicoes = [...props.posicoes].sort((a, b) => a.ordem - b.ordem)
  const p = calcularPainel(posicoes, inv, hoje())

  return (
    <>
      <div className="visoes quatro" role="tablist" aria-label="Visões de Investimentos">
        {VISOES.map((v) => (
          <button key={v.id} role="tab" aria-selected={visao === v.id} onClick={() => setVisao(v.id)}>
            {v.nome}
          </button>
        ))}
      </div>
      {visao === 'painel' && <VisaoPainel p={p} inv={inv} config={props.config!} />}
      {visao === 'posicoes' && <VisaoPosicoes {...props} posicoes={posicoes} p={p} inv={inv} />}
      {visao === 'compras' && <VisaoCompras {...props} posicoes={posicoes} />}
      {visao === 'historico' && <VisaoHistorico key={props.mes} {...props} p={p} />}
    </>
  )
}

function VisaoPainel({ p, inv, config }: { p: Painel; inv: ParametrosInvest; config: Config }) {
  const [aporte, setAporte] = useState<number | null>(null)
  // Preço digitado aqui vale sobre a cotação guardada.
  const [digitados, setDigitados] = useState<Record<string, number | null>>({})
  const preco = (ativo: string) => (ativo in digitados ? digitados[ativo] : (config.cotacoes?.[ativo]?.preco ?? null))
  const s = sugestaoDeAporte(p, inv, aporte ?? 0, Object.fromEntries(p.ativos.map((a) => [a.nome, preco(a.nome)])))
  const cotas = (n: number | null) => (n === null ? 'informe o preço' : `${n} ${n === 1 ? 'cota' : 'cotas'}`)

  return (
    <>
      <section className="total-mes">
        <h2>Patrimônio total</h2>
        <p className="valor-grande">{reais(p.total)}</p>
        {p.foraDaBase.length > 0 && (
          <p className="apoio">
            Base do convexo, sem {p.foraDaBase.join(', ')}: {reais(p.baseConvexo)}
          </p>
        )}
      </section>

      {(p.vencimentos.quantidade > 0 || p.statusTotal !== 'OK') && (
        <section className="atencao">
          <h2>Pede atenção</h2>
          <ul>
            {p.vencimentos.quantidade > 0 && (
              <li>
                {p.vencimentos.quantidade === 1 ? '1 posição vence' : `${p.vencimentos.quantidade} posições vencem`} em até{' '}
                {inv.alertaVencimentoDias} dias: {reais(p.vencimentos.valor)}.
              </li>
            )}
            {p.statusTotal !== 'OK' && <li>{p.statusTotal}.</li>}
          </ul>
        </section>
      )}

      <section className="bloco">
        <h2>Composição do patrimônio</h2>
        <Composicao partes={p.caixas.map((c) => ({ nome: c.nome, valor: c.atual }))} />
      </section>

      <section className="bloco">
        <h2>Caixas e metas</h2>
        <ul className="razao">
          {p.caixas.map((c) => (
            <li key={c.nome}>
              <div className="linha-razao">
                <span>{c.nome}</span>
                <span className="num">{reais(c.atual)}</span>
              </div>
              {c.meta !== null && c.meta > 0 && (
                <>
                  <div className="barra" role="img" aria-label={`${reais(c.atual)} de ${reais(c.meta)}`}>
                    <span style={{ width: `${Math.min(c.atual / c.meta, 1) * 100}%` }} />
                  </div>
                  <p className="apoio">
                    {porcento(c.atual / c.meta)} da meta de {reais(c.meta)}
                    {c.falta > 0 && `, faltam ${reais(c.falta)}`}
                  </p>
                </>
              )}
              <Status texto={c.status} />
            </li>
          ))}
        </ul>
      </section>

      <section className="bloco">
        <h2>Lado convexo</h2>
        <ul className="razao">
          {[
            { nome: 'Convexo na base do patrimônio', l: p.convexo },
            ...p.ativos.map((a) => ({ nome: `${a.nome} dentro do convexo`, l: a })),
          ].map(({ nome, l }) => (
            <li key={nome}>
              <div className="linha-razao">
                <span>{nome}</span>
                <span className="num">{reais(l.atual)}</span>
              </div>
              <p className="apoio">
                {l.pct === null ? 'Sem posição' : `Atual ${porcento(l.pct)}`}, alvo {porcento(l.alvo)}
              </p>
              <Status texto={l.status} />
            </li>
          ))}
          {p.foraDaProporcao.atual > 0 && (
            <li>
              <div className="linha-razao">
                <span>Fora da proporção</span>
                <span className="num">{reais(p.foraDaProporcao.atual)}</span>
              </div>
              <p className="apoio">Aposta: {porcento(p.foraDaProporcao.pctDoConvexo)} do convexo.</p>
            </li>
          )}
        </ul>
      </section>

      <section className="bloco">
        <h2>Exposição por instituição</h2>
        <ul className="razao">
          {p.fgc
            .filter((f) => f.total > 0)
            .map((f) => (
              <li key={f.instituicao}>
                <div className="linha-razao">
                  <span>{f.instituicao}</span>
                  <span className="num">{reais(f.total)}</span>
                </div>
                <p className="apoio">
                  {f.comFgc > 0 ? `Com FGC ${reais(f.comFgc)}, folga de ${reais(f.folga)}` : 'Sem cobertura do FGC'}
                </p>
                {f.comFgc > 0 && <Status texto={f.status} />}
              </li>
            ))}
        </ul>
        <p className="apoio">Tesouro, ETFs e ações não têm FGC. O Tesouro é garantido pelo governo.</p>
      </section>

      <section className="bloco">
        <h2>Sugestão para o aporte do mês</h2>
        <div className="grade">
          <CampoValor rotulo="Aporte novo" valor={aporte} aoMudar={setAporte} ajuda="Deixe vazio se o dinheiro já está em A alocar." />
          {p.ativos.map((a) => (
            <CampoValor
              key={a.nome}
              rotulo={`Preço de ${a.nome}`}
              valor={preco(a.nome)}
              aoMudar={(v) => setDigitados({ ...digitados, [a.nome]: v })}
            />
          ))}
        </div>
        <Resultado rotulo="Total a distribuir" valor={s.total} forte />
        <Resultado rotulo="Lado convexo" valor={s.convexo} />
        {s.ativos.map((a) => (
          <Resultado key={a.nome} rotulo={`${a.nome}, ${cotas(a.cotas)}`} valor={a.valor} />
        ))}
        {s.objetivos.map((o) => (
          <Resultado key={o.nome} rotulo={o.nome} valor={o.valor} />
        ))}
        {s.sobra > 0 && <Resultado rotulo="Sem destino: crie um objetivo em Mais › Metas" valor={s.sobra} />}
        <p className="apoio">Compre em cotas inteiras. A sobra do arredondamento fica para o mês seguinte.</p>
      </section>
    </>
  )
}

function VisaoPosicoes({ posicoes, p, inv, aoGravar, aoExcluir }: Props & { p: Painel; inv: ParametrosInvest }) {
  const [editando, setEditando] = useState<Posicao | 'nova' | null>(null)
  const agora = hoje()

  return (
    <>
      <section className="bloco sem-linha">
        <Resultado rotulo="Total aplicado" valor={p.total} forte />
        <ul className="posicoes">
          {posicoes.map((pos) => {
            const alerta = alertaDeVencimento(pos, agora, inv.alertaVencimentoDias)
            return (
              <li key={pos.id}>
                <div className="posicao-topo">
                  <strong>{pos.nome}</strong>
                  <span className="apoio num">{p.total ? porcento(pos.valor / p.total) : ''}</span>
                </div>
                <p className="apoio">
                  {pos.instituicao}, {pos.caixa}
                  {pos.vencimento && `, vence em ${dataBr(pos.vencimento)} (${diasAte(pos.vencimento, agora)} dias)`}
                </p>
                <CampoValor
                  rotulo="Valor atual"
                  valor={pos.valor}
                  aoMudar={(v) => aoGravar(`posicoes/${pos.id}`, { ...pos, valor: v ?? 0 })}
                />
                <Status texto={alerta} />
                <div className="botoes">
                  <button className="texto" onClick={() => setEditando(pos)}>
                    Editar
                  </button>
                  <button className="texto" onClick={() => aoExcluir(`posicoes/${pos.id}`, pos, 'Posição excluída')}>
                    Excluir
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
        <button className="secundario" onClick={() => setEditando('nova')}>
          Nova posição
        </button>
      </section>
      {editando && (
        <EditorPosicao
          inicial={editando === 'nova' ? undefined : editando}
          ordem={Math.max(0, ...posicoes.map((x) => x.ordem)) + 1}
          inv={inv}
          aoSalvar={(pos) => {
            aoGravar(`posicoes/${pos.id}`, pos)
            setEditando(null)
          }}
          aoExcluir={(pos) => {
            aoExcluir(`posicoes/${pos.id}`, pos, 'Posição excluída')
            setEditando(null)
          }}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  )
}

function VisaoCompras({ operacoes, posicoes, config, aoGravar, aoExcluir }: Props) {
  const agora = hoje()
  const [data, setData] = useState(agora)
  const [ativo, setAtivo] = useState('')
  const [tipo, setTipo] = useState<'compra' | 'venda'>('compra')
  const [quantidade, setQuantidade] = useState('')
  const [total, setTotal] = useState('')
  const [erro, setErro] = useState('')
  const [cotando, setCotando] = useState('')
  const resumo = resumoPorAtivo(operacoes, agora)
  const cotacoes = config?.cotacoes ?? {}
  const ordenadas = [...operacoes].sort((a, b) => b.data.localeCompare(a.data))
  const medio = (centavos: number) =>
    'R$ ' + (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })

  function adicionar(e: FormEvent) {
    e.preventDefault()
    const qtd = Number(quantidade.replace(',', '.'))
    const valor = lerCentavos(total)
    if (!data || !ativo.trim() || !(qtd > 0) || !valor) return setErro('Preencha data, ativo, quantidade e valor total.')
    const id = crypto.randomUUID()
    const nova: Operacao = { id, data, ativo: ativo.trim().toUpperCase(), tipo, quantidade: qtd, total: valor, obs: '' }
    aoGravar(`operacoes/${id}`, nova)
    setQuantidade('')
    setTotal('')
    setErro('')
  }

  /** Busca na brapi a cotação de cada ativo em carteira e guarda na configuração. */
  async function atualizarCotacoes() {
    if (!config?.brapiToken) return setCotando('Cadastre o token da brapi em Mais, na parte Metas e parâmetros.')
    setCotando('Buscando cotações…')
    const novas = { ...cotacoes }
    const falhas: string[] = []
    for (const r of resumo.filter((x) => x.cotas > 0)) {
      try {
        const resposta = await fetch(`https://brapi.dev/api/quote/${r.ativo}`, {
          headers: { Authorization: `Bearer ${config.brapiToken}` },
        })
        const preco = (await resposta.json()).results?.[0]?.regularMarketPrice
        if (!resposta.ok || typeof preco !== 'number') throw new Error('sem preço')
        novas[r.ativo] = { preco: Math.round(preco * 100), em: new Date().toISOString() }
      } catch {
        falhas.push(r.ativo)
      }
    }
    aoGravar('config/geral', { ...config, cotacoes: novas })
    setCotando(falhas.length ? `Sem cotação para ${falhas.join(', ')}. O preço digitado continua valendo.` : 'Cotações atualizadas.')
  }

  /** Leva a cotação para o saldo das posições com o mesmo nome do ativo. */
  function aplicarAosSaldos() {
    let quantas = 0
    for (const r of resumo) {
      const pos = posicoes.find((p) => p.nome.toUpperCase() === r.ativo)
      const cotacao = cotacoes[r.ativo]
      if (!pos || !cotacao || r.cotas <= 0) continue
      aoGravar(`posicoes/${pos.id}`, { ...pos, valor: Math.round(r.cotas * cotacao.preco) })
      quantas++
    }
    setCotando(quantas ? `${quantas} saldos atualizados em Posições.` : 'Nenhuma posição tem cotação para aplicar.')
  }

  return (
    <>
      <section className="bloco sem-linha">
        <h2>Resumo por ativo</h2>
        <p className="apoio">
          Regra da CVM: vender só 30 dias depois da última compra do mesmo ativo, salvo queda de 10% ou mais, ou despesa
          urgente. Guarde as notas de corretagem.
        </p>
        <ul className="razao">
          {resumo.map((r) => (
            <li key={r.ativo}>
              <div className="linha-razao">
                <span>{r.ativo}</span>
                <span className="num">
                  {r.cotas} {r.cotas === 1 ? 'cota' : 'cotas'}
                </span>
              </div>
              <p className="apoio">
                Preço médio {r.precoMedio === null ? 'sem compras' : medio(r.precoMedio)}, custo das compras{' '}
                {reais(r.custoDasCompras)}
                {cotacoes[r.ativo] && r.cotas > 0 && (
                  <>
                    . Cotação {reais(cotacoes[r.ativo].preco)} em {dataBr(cotacoes[r.ativo].em.slice(0, 10))}, valor de{' '}
                    {reais(Math.round(r.cotas * cotacoes[r.ativo].preco))}
                  </>
                )}
              </p>
              {r.vendaLiberadaEm && (
                <p className="apoio">
                  Venda liberada em {dataBr(r.vendaLiberadaEm)} <Status texto={r.status} />
                </p>
              )}
            </li>
          ))}
        </ul>
        <div className="botoes">
          <button className="secundario" onClick={() => void atualizarCotacoes()}>
            Atualizar cotações
          </button>
          <button className="secundario" onClick={aplicarAosSaldos}>
            Aplicar aos saldos
          </button>
        </div>
        {cotando && <p role="status">{cotando}</p>}
      </section>

      <section className="bloco">
        <h2>Nova operação</h2>
        <form className="grade" onSubmit={adicionar}>
          <label className="campo">
            Data
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </label>
          <label className="campo">
            Ativo
            <input value={ativo} onChange={(e) => setAtivo(e.target.value)} placeholder="WRLD11" />
          </label>
          <label className="campo">
            Operação
            <select value={tipo} onChange={(e) => setTipo(e.target.value as 'compra' | 'venda')}>
              <option value="compra">Compra</option>
              <option value="venda">Venda</option>
            </select>
          </label>
          <label className="campo">
            Quantidade
            <input className="num" inputMode="decimal" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
          </label>
          <label className="campo">
            Valor total, com custos
            <input className="num" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0,00" />
          </label>
          <button className="secundario">Registrar operação</button>
        </form>
        {erro && (
          <p className="erro" role="alert">
            {erro}
          </p>
        )}
      </section>

      <section className="bloco">
        <h2>Operações</h2>
        <ul className="razao">
          {ordenadas.map((o) => (
            <li key={o.id}>
              <div className="linha-razao">
                <span>
                  {o.tipo === 'compra' ? 'Compra' : 'Venda'} de {o.quantidade} {o.ativo}
                </span>
                <span className="num">{reais(o.total)}</span>
              </div>
              <p className="apoio">
                {dataBr(o.data)}, a {medio(o.total / o.quantidade)} por cota. {o.obs}
              </p>
              <button className="texto" onClick={() => aoExcluir(`operacoes/${o.id}`, o, 'Operação excluída')}>
                Excluir
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function VisaoHistorico({ historico, mes, p, aoGravar }: Props & { p: Painel }) {
  const linhas = linhasDoHistorico(historico)
  const doMes = historico.find((h) => h.mes === mes)
  const [aporte, setAporte] = useState<number | null>(doMes?.aporte ?? null)
  const [saidas, setSaidas] = useState<number | null>(doMes?.saidas ?? null)

  return (
    <>
      <section className="bloco sem-linha">
        <h2>Fechar {nomeDoMes(mes)}</h2>
        <p>Grava a foto das caixas com os saldos atuais de Posições. Atualize os saldos antes de fechar.</p>
        <div className="grade">
          <CampoValor rotulo="Aporte do mês" valor={aporte} aoMudar={setAporte} />
          <CampoValor rotulo="Saídas do mês" valor={saidas} aoMudar={setSaidas} ajuda="Dinheiro gasto dos investimentos." />
        </div>
        <button
          className="primario"
          onClick={() => aoGravar(`historico/${mes}`, fotoDoMes(p, mes, aporte ?? 0, saidas ?? 0))}
        >
          {doMes ? 'Refazer o fechamento' : 'Fechar o mês'}
        </button>
      </section>

      <section className="bloco">
        <h2>Evolução por caixa</h2>
        <ul className="razao">
          {[...linhas].reverse().map((h) => (
            <li key={h.mes}>
              <div className="linha-razao">
                <span className="mes-historico">{nomeDoMes(h.mes)}</span>
                <span className="num">{reais(h.total)}</span>
              </div>
              <Composicao
                partes={[
                  ...objetivosNoHistorico(h).map((nome) => ({ nome, valor: valorNoHistorico(h, nome) })),
                  { nome: 'Convexo', valor: h.convexo },
                  { nome: 'A alocar', valor: h.aAlocar },
                ]}
              />
              <p className="apoio">
                Aporte {numero(h.aporte)}, saídas {numero(h.saidas)}, rendimento estimado{' '}
                {h.rendimento === null ? 'sem mês anterior' : numero(h.rendimento)}
                {h.pctConvexo !== null && `, convexo em ${porcento(h.pctConvexo)} da base do patrimônio`}.
              </p>
              {h.obs && <p className="apoio">{h.obs}</p>}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
