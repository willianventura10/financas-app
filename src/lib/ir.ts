// Imposto de renda dos investimentos em bolsa: apuração mensal das vendas, bens e direitos em 31/12 e proventos.
// É uma estimativa para conferência: não trata day trade, o IR retido na fonte de 0,005% nem feriados.
import type { Operacao, TipoIR } from '../dados/tipos'

export const TIPOS_IR: Record<TipoIR, string> = { acao: 'Ação', etf: 'ETF', bdr: 'BDR', fii: 'FII' }

/** Vendas de ações até este total no mês têm o lucro isento. */
export const ISENCAO_ACOES = 2000000
/** DARF abaixo disto não é pago: soma no mês seguinte. */
export const DARF_MINIMO = 1000

const soma = (v: number[]) => v.reduce((s, x) => s + x, 0)

/** O tipo pelo código: final 3 a 8 é ação, final 11 é ETF, outro final de dois dígitos é BDR. Pode ser trocado. */
export function tipoDoAtivo(ativo: string, escolhidos: Record<string, TipoIR> = {}): TipoIR {
  if (escolhidos[ativo]) return escolhidos[ativo]
  if (/[A-Z]{4}[3-8]$/.test(ativo)) return 'acao'
  if (/11$/.test(ativo)) return 'etf'
  if (/[A-Z]{4}\d\d$/.test(ativo)) return 'bdr'
  return 'acao'
}

const ehNegocio = (o: Operacao) => o.tipo === 'compra' || o.tipo === 'venda'
const emOrdem = (ops: Operacao[]) =>
  // No mesmo dia, a compra vem antes da venda.
  [...ops].filter(ehNegocio).sort((a, b) => a.data.localeCompare(b.data) || (a.tipo === 'compra' ? -1 : 1))

export interface Carteira {
  ativo: string
  quantidade: number
  /** Custo de aquisição pelo preço médio, em centavos. */
  custo: number
}

export interface VendaApurada {
  operacao: Operacao
  custo: number
  resultado: number
  /** Vendeu mais do que tinha registrado: o custo ficou incompleto. */
  semCompra: boolean
}

/** Percorre as compras e vendas em ordem: o preço médio só muda nas compras e recomeça quando o ativo zera. */
function percorrer(operacoes: Operacao[], ate?: string) {
  const carteira = new Map<string, { quantidade: number; custo: number }>()
  const vendas: VendaApurada[] = []
  for (const o of emOrdem(operacoes)) {
    if (ate && o.data > ate) break
    const c = carteira.get(o.ativo) ?? { quantidade: 0, custo: 0 }
    if (o.tipo === 'compra') {
      carteira.set(o.ativo, { quantidade: c.quantidade + o.quantidade, custo: c.custo + o.total })
      continue
    }
    const vendida = Math.min(o.quantidade, c.quantidade)
    const custo = c.quantidade ? Math.round((c.custo * vendida) / c.quantidade) : 0
    vendas.push({ operacao: o, custo, resultado: o.total - custo, semCompra: o.quantidade > c.quantidade })
    const resta = c.quantidade - vendida
    carteira.set(o.ativo, { quantidade: resta, custo: resta ? c.custo - custo : 0 })
  }
  return { carteira, vendas }
}

/** Bens e direitos: quantidade e custo de cada ativo numa data, normalmente 31/12. */
export function carteiraEm(operacoes: Operacao[], data: string): Carteira[] {
  return [...percorrer(operacoes, data).carteira]
    .map(([ativo, c]) => ({ ativo, ...c }))
    .filter((c) => c.quantidade > 0)
    .sort((a, b) => a.ativo.localeCompare(b.ativo))
}

export interface MesApurado {
  mes: string
  vendas: VendaApurada[]
  /** Total vendido em ações no mês: decide a isenção. */
  vendasAcoes: number
  /** Ações com vendas até R$ 20 mil e lucro: o lucro é isento. */
  lucroIsento: number
  /** Resultado tributável a 15% (ações acima do limite, ETF e BDR), antes de compensar prejuízo. */
  resultadoComum: number
  /** Resultado de FII, tributável a 20%, antes de compensar prejuízo. */
  resultadoFii: number
  /** Prejuízo que sobra para compensar depois deste mês. */
  prejuizoComum: number
  prejuizoFii: number
  /** Imposto do mês, mais o que ficou abaixo do mínimo nos meses anteriores. */
  imposto: number
  /** Imposto de R$ 10,00 ou mais: há DARF a pagar. */
  pagar: boolean
  vencimento: string
}

/** Último dia útil (segunda a sexta) do mês seguinte, sem contar feriados. */
export function vencimentoDoDarf(mes: string): string {
  const [ano, m] = mes.split('-').map(Number)
  const dia = new Date(Date.UTC(ano, m + 1, 0))
  while (dia.getUTCDay() === 0 || dia.getUTCDay() === 6) dia.setUTCDate(dia.getUTCDate() - 1)
  return dia.toISOString().slice(0, 10)
}

/** A apuração de todos os meses com venda, em ordem, carregando prejuízo e imposto abaixo do mínimo. */
export function apuracaoMensal(operacoes: Operacao[], tipos: Record<string, TipoIR> = {}): MesApurado[] {
  const { vendas } = percorrer(operacoes)
  const meses = [...new Set(vendas.map((v) => v.operacao.data.slice(0, 7)))].sort()
  let prejuizoComum = 0
  let prejuizoFii = 0
  let pendente = 0
  return meses.map((mes) => {
    const doMes = vendas.filter((v) => v.operacao.data.startsWith(mes))
    const de = (...t: TipoIR[]) => doMes.filter((v) => t.includes(tipoDoAtivo(v.operacao.ativo, tipos)))
    const acoes = de('acao')
    const vendasAcoes = soma(acoes.map((v) => v.operacao.total))
    const resultadoAcoes = soma(acoes.map((v) => v.resultado))
    // Até R$ 20 mil vendidos, o lucro de ações é isento; o prejuízo continua compensável.
    const isento = vendasAcoes <= ISENCAO_ACOES && resultadoAcoes > 0
    const lucroIsento = isento ? resultadoAcoes : 0
    const resultadoComum = (isento ? 0 : resultadoAcoes) + soma(de('etf', 'bdr').map((v) => v.resultado))
    const resultadoFii = soma(de('fii').map((v) => v.resultado))

    const baseComum = resultadoComum - prejuizoComum
    prejuizoComum = Math.max(0, -baseComum)
    const baseFii = resultadoFii - prejuizoFii
    prejuizoFii = Math.max(0, -baseFii)

    const imposto = Math.round(Math.max(0, baseComum) * 0.15 + Math.max(0, baseFii) * 0.2) + pendente
    const pagar = imposto >= DARF_MINIMO
    pendente = pagar ? 0 : imposto
    return {
      mes,
      vendas: doMes,
      vendasAcoes,
      lucroIsento,
      resultadoComum,
      resultadoFii,
      prejuizoComum,
      prejuizoFii,
      imposto,
      pagar,
      vencimento: vencimentoDoDarf(mes),
    }
  })
}

export interface ProventosDoAtivo {
  ativo: string
  dividendos: number
  jcp: number
}

export function proventosDoAno(operacoes: Operacao[], ano: string): ProventosDoAtivo[] {
  const doAno = operacoes.filter((o) => (o.tipo === 'dividendo' || o.tipo === 'jcp') && o.data.startsWith(ano))
  return [...new Set(doAno.map((o) => o.ativo))].sort().map((ativo) => ({
    ativo,
    dividendos: soma(doAno.filter((o) => o.ativo === ativo && o.tipo === 'dividendo').map((o) => o.total)),
    jcp: soma(doAno.filter((o) => o.ativo === ativo && o.tipo === 'jcp').map((o) => o.total)),
  }))
}

/** O DARF que vence entre hoje e o fim do mês seguinte e ainda não foi marcado como pago. */
export function darfEmAberto(apuracao: MesApurado[], pagos: string[], hoje: string): MesApurado | null {
  return apuracao.find((m) => m.pagar && !pagos.includes(m.mes) && hoje <= m.vencimento && hoje.slice(0, 7) > m.mes) ?? null
}
