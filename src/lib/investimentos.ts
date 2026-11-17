import type { AtivoConvexo, Historico, Objetivo, Operacao, ParametrosInvest, Posicao } from '../dados/tipos'

// As regras das abas Painel, Posições, Histórico e Compras. Dinheiro em centavos; percentuais como frações.

const soma = (valores: number[]) => valores.reduce((s, v) => s + v, 0)
const DIA = 86_400_000

/** Dias de "hoje" até "data" (as duas em "AAAA-MM-DD"); negativo se já passou. */
export function diasAte(data: string, hoje: string): number {
  return Math.round((Date.parse(data) - Date.parse(hoje)) / DIA)
}

export function somarDias(data: string, dias: number): string {
  return new Date(Date.parse(data) + dias * DIA).toISOString().slice(0, 10)
}

/** Coluna "Alerta" da aba Posições. */
export function alertaDeVencimento(p: Posicao, hoje: string, diasDeAlerta: number): string {
  if (!p.vencimento || p.valor === 0) return ''
  const dias = diasAte(p.vencimento, hoje)
  return dias < 0 ? 'VENCIDO' : dias <= diasDeAlerta ? 'Vence em breve' : ''
}

export interface LinhaCaixa {
  nome: string
  atual: number
  meta: number | null
  /** Quanto falta para a meta; nunca negativo. */
  falta: number
  status: string
}

export interface LinhaFgc {
  instituicao: string
  comFgc: number
  total: number
  folga: number
  status: string
}

export const CONVEXO = 'Convexo'
export const A_ALOCAR = 'A alocar'

/** Os objetivos, na ordem do aporte. Sem lista gravada, valem os três que vieram da planilha. */
export function objetivosDe(inv: ParametrosInvest): Objetivo[] {
  return (
    inv.objetivos ?? [
      { id: 'reserva', nome: 'Reserva', meta: inv.metaReserva, data: null },
      { id: 'carro', nome: 'Carro', meta: inv.metaCarro, data: inv.dataCarro, foraDoConvexo: true },
      { id: 'ape', nome: 'Apê', meta: inv.metaApe, data: inv.dataApe },
    ]
  )
}

/** Os ativos que dividem o convexo em proporção. Sem lista gravada, WRLD11 e GOLD11 pelas classes da planilha. */
export function ativosDe(inv: ParametrosInvest): AtivoConvexo[] {
  return (
    inv.ativosConvexo ?? [
      { nome: 'WRLD11', alvo: inv.alvoWrld, classe: 'ETF global' },
      { nome: 'GOLD11', alvo: 1 - inv.alvoWrld, classe: 'ETF ouro' },
    ]
  )
}

/** As caixas que uma posição pode ter: os objetivos, o convexo e o dinheiro a alocar. */
export function caixasDe(inv: ParametrosInvest): string[] {
  return [...objetivosDe(inv).map((o) => o.nome), CONVEXO, A_ALOCAR]
}

const mesmoNome = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export interface LinhaAtivo {
  nome: string
  atual: number
  /** Parte do ativo na soma dos ativos da proporção. */
  pct: number | null
  alvo: number
  status: string
}

export interface Painel {
  total: number
  /** Patrimônio sem os objetivos que não contam para o convexo. */
  baseConvexo: number
  /** Nomes dos objetivos que ficam fora da base do convexo. */
  foraDaBase: string[]
  aAlocar: number
  vencimentos: { quantidade: number; valor: number }
  /** Os objetivos na ordem do aporte, depois Convexo e A alocar. */
  caixas: LinhaCaixa[]
  /** Confere se toda posição tem uma das caixas. */
  statusTotal: string
  convexo: { atual: number; pct: number | null; alvo: number; status: string }
  ativos: LinhaAtivo[]
  /** O que está no convexo e não é um dos ativos da proporção. */
  foraDaProporcao: { atual: number; pctDoConvexo: number }
  fgc: LinhaFgc[]
}

export function painel(posicoes: Posicao[], inv: ParametrosInvest, hoje: string): Painel {
  const daCaixa = (nome: string) => soma(posicoes.filter((p) => p.caixa === nome).map((p) => p.valor))
  const total = soma(posicoes.map((p) => p.valor))
  const objetivos = objetivosDe(inv)
  const convexo = daCaixa(CONVEXO)
  const aAlocar = daCaixa(A_ALOCAR)
  const foraDaBase = objetivos.filter((o) => o.foraDoConvexo)
  const baseConvexo = total - soma(foraDaBase.map((o) => daCaixa(o.nome)))
  const metaConvexo = Math.round(inv.alvoConvexo * baseConvexo)
  const pctConvexo = baseConvexo === 0 ? null : convexo / baseConvexo

  const statusConvexo =
    pctConvexo === null
      ? ''
      : pctConvexo < inv.minConvexo
        ? 'Abaixo da faixa'
        : pctConvexo > inv.maxConvexo
          ? 'Acima: colher'
          : 'OK'

  const caixa = (nome: string, atual: number, meta: number | null, status: string): LinhaCaixa => ({
    nome,
    atual,
    meta,
    falta: meta === null ? 0 : Math.max(0, meta - atual),
    status,
  })
  const simples = (atual: number, meta: number) => (atual >= meta ? 'OK' : 'Abaixo da meta')

  const doAtivo = (a: AtivoConvexo) =>
    soma(posicoes.filter((p) => (a.classe ? p.classe === a.classe : mesmoNome(p.nome, a.nome))).map((p) => p.valor))
  const valores = ativosDe(inv).map((a) => ({ a, atual: doAtivo(a) }))
  const naProporcao = soma(valores.map((v) => v.atual))
  const ativos = valores.map(({ a, atual }): LinhaAtivo => {
    const pct = naProporcao === 0 ? null : atual / naProporcao
    const diferenca = pct === null ? 0 : pct - a.alvo
    const status =
      pct === null
        ? 'Ainda sem posição'
        : Math.abs(diferenca) <= inv.tolerancia
          ? 'OK'
          : diferenca < 0
            ? 'Abaixo: priorizar no aporte'
            : 'Acima: pausar aportes'
    return { nome: a.nome, atual, pct, alvo: a.alvo, status }
  })
  const fora = Math.max(0, convexo - naProporcao)

  const proximos = posicoes.filter((p) => {
    if (!p.vencimento) return false
    const dias = diasAte(p.vencimento, hoje)
    return dias >= 0 && dias <= inv.alertaVencimentoDias
  })

  const instituicoes = [...new Set([...inv.instituicoes, ...posicoes.map((p) => p.instituicao)])]
  const fgc = instituicoes.map((instituicao): LinhaFgc => {
    const dela = posicoes.filter((p) => p.instituicao === instituicao)
    const comFgc = soma(dela.filter((p) => p.fgc).map((p) => p.valor))
    return {
      instituicao,
      comFgc,
      total: soma(dela.map((p) => p.valor)),
      folga: inv.limiteFgc - comFgc,
      status:
        comFgc === 0
          ? 'Sem FGC'
          : comFgc > inv.limiteFgc
            ? 'Acima do FGC'
            : comFgc > 0.8 * inv.limiteFgc
              ? 'Abaixo, mas perto do limite'
              : 'OK',
    }
  })

  const caixas = [
    ...objetivos.map((o) => {
      const atual = daCaixa(o.nome)
      // A caixa do carro vence em data marcada: passou de 105% da meta, a sobra pode mudar de caixa.
      const status =
        o.id === 'carro' && atual >= o.meta * 1.05
          ? 'OK (o excedente pode ir para a reserva ao vencer)'
          : simples(atual, o.meta)
      return caixa(o.nome, atual, o.meta, status)
    }),
    caixa(CONVEXO, convexo, metaConvexo, statusConvexo),
    caixa(A_ALOCAR, aAlocar, null, aAlocar > 0 ? 'Distribuir (veja a sugestão)' : 'OK'),
  ]

  return {
    total,
    baseConvexo,
    foraDaBase: foraDaBase.map((o) => o.nome),
    aAlocar,
    vencimentos: { quantidade: proximos.length, valor: soma(proximos.map((p) => p.valor)) },
    caixas,
    statusTotal: soma(caixas.map((c) => c.atual)) === total ? 'OK' : 'ATENÇÃO: há posição sem caixa',
    convexo: { atual: convexo, pct: pctConvexo, alvo: inv.alvoConvexo, status: statusConvexo },
    ativos,
    foraDaProporcao: { atual: fora, pctDoConvexo: convexo === 0 ? 0 : fora / convexo },
    fgc,
  }
}

export interface Sugestao {
  /** Aporte novo + caixa "A alocar". */
  total: number
  convexo: number
  /** A parte do convexo para cada ativo da proporção. Cotas inteiras; null enquanto o preço não foi informado. */
  ativos: { nome: string; valor: number; cotas: number | null }[]
  /** O que vai para cada objetivo, na ordem da lista. */
  objetivos: { nome: string; valor: number }[]
  /** Só sobra dinheiro quando não há objetivo nenhum. */
  sobra: number
}

/**
 * "Sugestão para o aporte do mês": 1º convexo (até a meta, limitado ao teto mensal; depois, % alvo do aporte),
 * depois cada objetivo até a meta, na ordem da lista; o último fica com o resto.
 */
export function sugestaoDeAporte(
  p: Painel,
  inv: ParametrosInvest,
  aporteNovo: number,
  precos: Record<string, number | null | undefined> = {},
): Sugestao {
  const convexo = p.caixas.find((c) => c.nome === CONVEXO)!
  const objetivos = p.caixas.filter((c) => c.nome !== CONVEXO && c.nome !== A_ALOCAR)
  const total = aporteNovo + p.aAlocar
  const paraConvexo =
    total <= 0 || convexo.status === 'Acima: colher'
      ? 0
      : Math.min(total, inv.tetoConvexo, Math.max(convexo.falta, Math.round(inv.alvoConvexo * total)))

  // Vai primeiro para o ativo que está abaixo da proporção; o último fica com o resto.
  const naProporcao = soma(p.ativos.map((a) => a.atual))
  let resta = paraConvexo
  const ativos = p.ativos.map((a, i) => {
    const falta = Math.max(0, Math.round((naProporcao + paraConvexo) * a.alvo) - a.atual)
    const valor = i === p.ativos.length - 1 ? resta : Math.min(resta, falta)
    resta -= valor
    const preco = precos[a.nome]
    return { nome: a.nome, valor, cotas: preco ? Math.floor(valor / preco) : null }
  })

  resta = total - paraConvexo
  const paraObjetivos = objetivos.map((o, i) => {
    const valor = i === objetivos.length - 1 ? resta : Math.min(resta, o.falta)
    resta -= valor
    return { nome: o.nome, valor }
  })

  return { total, convexo: paraConvexo, ativos, objetivos: paraObjetivos, sobra: resta }
}

export interface ResumoAtivo {
  ativo: string
  /** Cotas compradas − vendidas. */
  cotas: number
  custoDasCompras: number
  /** Custo das compras ÷ cotas compradas, em centavos (com fração). */
  precoMedio: number | null
  /** Data da última compra + 30 dias: a regra de venda para servidores da CVM. */
  vendaLiberadaEm: string | null
  status: string
}

export function resumoPorAtivo(operacoes: Operacao[], hoje: string): ResumoAtivo[] {
  // Proventos não mexem em cotas nem no preço médio.
  const negocios = operacoes.filter((o) => o.tipo === 'compra' || o.tipo === 'venda')
  const ativos = [...new Set(negocios.map((o) => o.ativo))].sort()
  return ativos.map((ativo) => {
    const doAtivo = negocios.filter((o) => o.ativo === ativo)
    const compras = doAtivo.filter((o) => o.tipo === 'compra')
    const compradas = soma(compras.map((o) => o.quantidade))
    const cotas = compradas - soma(doAtivo.filter((o) => o.tipo === 'venda').map((o) => o.quantidade))
    const ultimaCompra = compras.map((o) => o.data).sort().at(-1)
    const vendaLiberadaEm = ultimaCompra && cotas > 0 ? somarDias(ultimaCompra, 30) : null
    return {
      ativo,
      cotas,
      custoDasCompras: soma(compras.map((o) => o.total)),
      precoMedio: compradas ? soma(compras.map((o) => o.total)) / compradas : null,
      vendaLiberadaEm,
      status: !vendaLiberadaEm ? 'Sem posição' : hoje >= vendaLiberadaEm ? 'Liberado' : 'Aguardar',
    }
  })
}

export interface ResultadoAtivo {
  /** Quanto as cotas em carteira custaram, pelo preço médio. */
  custo: number
  valor: number
  /** Valor − custo: positivo é lucro, negativo é prejuízo. */
  diferenca: number
  /** Cotação ÷ preço médio − 1. */
  pct: number
}

/** Lucro ou prejuízo das cotas em carteira, comparando a cotação com o preço médio das compras. */
export function resultadoDoAtivo(r: ResumoAtivo, preco: number | null | undefined): ResultadoAtivo | null {
  if (!preco || !r.precoMedio || r.cotas <= 0) return null
  const custo = Math.round(r.cotas * r.precoMedio)
  const valor = Math.round(r.cotas * preco)
  return { custo, valor, diferenca: valor - custo, pct: preco / r.precoMedio - 1 }
}

/** Os nomes antigos das três caixas que o histórico guardava em campos próprios. */
const ANTIGAS: Record<string, 'reserva' | 'carro' | 'ape'> = { Reserva: 'reserva', Carro: 'carro', Apê: 'ape' }

/** Quanto um objetivo tinha no fechamento do mês. */
export function valorNoHistorico(h: Historico, nome: string): number {
  return h.caixas ? (h.caixas[nome] ?? 0) : ((ANTIGAS[nome] && h[ANTIGAS[nome]]) ?? 0)
}

/** Os objetivos que aparecem em um fechamento, na ordem em que foram gravados. */
export function objetivosNoHistorico(h: Historico): string[] {
  return h.caixas ? Object.keys(h.caixas) : Object.keys(ANTIGAS)
}

export interface LinhaHistorico extends Historico {
  total: number
  /** Total − total do mês anterior − aporte + saídas; null no primeiro mês. */
  rendimento: number | null
  /** Convexo ÷ patrimônio sem os objetivos que não contam para o convexo. */
  pctConvexo: number | null
}

export function linhasDoHistorico(historico: Historico[]): LinhaHistorico[] {
  const ordenado = [...historico].sort((a, b) => a.mes.localeCompare(b.mes))
  const total = (h: Historico) =>
    soma(objetivosNoHistorico(h).map((nome) => valorNoHistorico(h, nome))) + h.convexo + h.aAlocar
  const base = (h: Historico) => total(h) - (h.caixas ? (h.foraDoConvexo ?? 0) : (h.carro ?? 0))
  return ordenado.map((h, i) => ({
    ...h,
    total: total(h),
    rendimento: i === 0 ? null : total(h) - total(ordenado[i - 1]) - h.aporte + h.saidas,
    pctConvexo: base(h) === 0 ? null : h.convexo / base(h),
  }))
}

/** A "Linha para o Histórico" do Painel: a foto das caixas no fechamento do mês. */
export function fotoDoMes(p: Painel, mes: string, aporte: number, saidas: number): Historico {
  const objetivos = p.caixas.filter((c) => c.nome !== CONVEXO && c.nome !== A_ALOCAR)
  return {
    mes,
    caixas: Object.fromEntries(objetivos.map((c) => [c.nome, c.atual])),
    foraDoConvexo: p.total - p.baseConvexo,
    convexo: p.convexo.atual,
    aAlocar: p.aAlocar,
    aporte,
    saidas,
  }
}

/** Cor do aviso, pelas mesmas palavras que a planilha usava na formatação. */
export function tomDoStatus(status: string): 'ok' | 'aviso' | 'critico' | 'neutro' {
  if (/Acima|VENCIDO|vencido|ATENÇÃO/.test(status)) return 'critico'
  if (/Abaixo|Aguardar|breve|Distribuir|DARF até|Prejuízo a compensar/.test(status)) return 'aviso'
  if (/OK|Liberado|Isento|DARF pago/.test(status)) return 'ok'
  return 'neutro'
}
