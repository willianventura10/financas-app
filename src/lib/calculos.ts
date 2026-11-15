import type { Cartao, Config, Lancamento, MesDoc, Viagem } from '../dados/tipos'
import { CATEGORIAS, type CategoriaId } from './categorias'
import { totalDoMes } from './totais'

// As regras de cálculo da aba Mensal. Tudo em centavos.

const soma = (valores: number[]) => valores.reduce((s, v) => s + v, 0)

export function mesVazio(mes: string): MesDoc {
  return { mes, cvm: null, extra: 0, social: 0, cartaoElis: 0, poupado: 0, poupViagem: 0, contas: {} }
}

/** Quanto a viagem tirou da caixinha. */
export function abatidoDaViagem(v: Viagem): number {
  return v.abatido ?? (v.abater ? v.gasto : 0)
}

/** Saldo da caixinha de viagem: todo o Poup. viagem menos o que as viagens abateram, de todos os anos. */
export function saldoDaCaixinha(meses: MesDoc[], viagens: Viagem[]): number {
  return soma(meses.map((m) => m.poupViagem)) - soma(viagens.map(abatidoDaViagem))
}

export const CARTAO_VAZIO: Cartao = {
  fatura: null,
  semanas: [0, 0, 0, 0, 0],
  saudeAcademia: 0,
  ajusteUber: 0,
  ajusteAbater: 0,
  ajusteFatura: 0,
}

export function metaTotal(config: Config): number {
  return soma(Object.values(config.metas))
}

export interface ResumoMes {
  total: number
  metaTotal: number
  /** Meta total − total do mês (linha DIFERENÇA). */
  diferenca: number
  /** CVM + Extra; null enquanto a renda do mês não foi informada. */
  renda: number | null
  /** Renda − total do mês (linha FLUTUÁVEL LÍQUIDO). */
  flutuavel: number | null
}

export function resumoDoMes(itensDoMes: Lancamento[], mes: MesDoc, config: Config): ResumoMes {
  const total = totalDoMes(itensDoMes)
  const renda = mes.cvm === null ? null : mes.cvm + mes.extra
  return {
    total,
    metaTotal: metaTotal(config),
    diferenca: metaTotal(config) - total,
    renda,
    flutuavel: renda === null ? null : renda - total,
  }
}

/** Categorias que nascem marcadas para abater da fatura. */
export function abatePorPadrao(categoria: CategoriaId): boolean {
  return categoria === 'alim' || categoria === 'viagens' || categoria === 'transporte'
}

/** O lançamento sai da fatura do mês? Vale a marca; sem ela, a regra antiga de cada categoria. */
export function abateDaFatura(l: Lancamento): boolean {
  if (l.categoria === 'cartao') return false
  if (l.abater !== undefined) return l.abater
  if (l.categoria === 'alim') return !!l.data && !l.foraDoCartao
  return l.categoria === 'viagens' || l.categoria === 'transporte'
}

export interface ResumoCartao {
  /** Os lançamentos que saem da fatura, do mais recente para o mais antigo. */
  abatidos: Lancamento[]
  /** Lançamentos abatidos que não estão na tabela das semanas, mais o ajuste manual. */
  uber: number
  /** O que já foi lançado em outras categorias e sai da fatura. */
  abater: number
  /** Alimentação lançada no cartão em cada semana do mês. */
  lancado: number[]
  /** Fatura − abater: o valor que vira "Cartão" no mês seguinte. */
  atualizado: number | null
}

/** As semanas do calendário do mês, de domingo a sábado. O que passar da quinta entra na quinta. */
export function semanasDoMes(mes: string): { de: number; ate: number }[] {
  const [ano, m] = mes.split('-').map(Number)
  const dias = new Date(ano, m, 0).getDate()
  const primeiroSabado = 7 - new Date(ano, m - 1, 1).getDay()
  return [0, 1, 2, 3, 4].map((i) => ({
    de: i === 0 ? 1 : primeiroSabado + 7 * (i - 1) + 1,
    ate: i === 4 ? dias : Math.min(primeiroSabado + 7 * i, dias),
  }))
}

const naSemana = (l: Lancamento, mes: string) => l.categoria === 'alim' && !!l.data?.startsWith(mes)

/** Alimentação com data e abatida da fatura, somada por semana do calendário. */
export function alimentacaoPorSemana(itensDoMes: Lancamento[], mes: string): number[] {
  const semanas = semanasDoMes(mes)
  const total = [0, 0, 0, 0, 0]
  for (const l of itensDoMes) {
    if (!abateDaFatura(l) || !naSemana(l, mes)) continue
    const dia = Number(l.data!.slice(8, 10))
    total[semanas.findIndex((s) => dia <= s.ate)] += l.valor
  }
  return total
}

export function resumoDoCartao(itensDoMes: Lancamento[], c: Cartao, mes: string): ResumoCartao {
  const abatidos = itensDoMes
    .filter(abateDaFatura)
    .sort((a, b) => (b.data ?? '').localeCompare(a.data ?? '') || b.criadoEm - a.criadoEm)
  const uber = soma(abatidos.filter((l) => !naSemana(l, mes)).map((l) => l.valor)) + c.ajusteUber
  const lancado = alimentacaoPorSemana(itensDoMes, mes)
  const abater = uber + c.saudeAcademia + soma(lancado) + soma(c.semanas) + c.ajusteAbater
  return { abatidos, uber, lancado, abater, atualizado: c.fatura === null ? null : c.fatura + c.ajusteFatura - abater }
}

export interface LinhaAno {
  id: CategoriaId
  /** Gasto de janeiro a dezembro. */
  porMes: number[]
  acumulado: number
  /** Média dos meses fechados; null se nenhum mês do ano fechou. */
  media: number | null
  meta: number | null
  /** Meta mensal × 12. */
  previsto: number | null
}

export type DestinoId = 'social' | 'cartaoElis' | 'poupado' | 'poupViagem'

export interface LinhaDestino {
  id: DestinoId
  porMes: number[]
  acumulado: number
}

const DESTINOS: DestinoId[] = ['social', 'cartaoElis', 'poupado', 'poupViagem']

export interface ResumoAno {
  /** As 11 categorias com meta, na ordem da planilha. */
  linhas: LinhaAno[]
  /** Viagens fica fora do acumulado e da média, como na planilha. */
  viagens: LinhaAno
  mesesFechados: number
  totais: { porMes: number[]; acumulado: number; media: number | null; meta: number; previsto: number }
  /** As destinações informadas em cada mês, na ordem da tela do mês. */
  destinacoes: LinhaDestino[]
  /** Soma das destinações de cada mês. */
  destinado: { porMes: number[]; acumulado: number }
  /** CVM + Extra de todos os meses informados. */
  renda: number
  rendaPrevista: number
  poupado: number
}

/**
 * Resumo do ano. "mesAtual" ("AAAA-MM") define os meses fechados: são os anteriores a ele.
 */
export function resumoDoAno(
  ano: string,
  itensDoAno: Lancamento[],
  meses: MesDoc[],
  config: Config,
  mesAtual: string,
): ResumoAno {
  const fechados = [...Array(12).keys()].filter((i) => `${ano}-${String(i + 1).padStart(2, '0')}` < mesAtual).length

  const linha = (id: CategoriaId): LinhaAno => {
    const porMes = [...Array(12).keys()].map((i) => {
      const mes = `${ano}-${String(i + 1).padStart(2, '0')}`
      return soma(itensDoAno.filter((l) => l.mes === mes && l.categoria === id).map((l) => l.valor))
    })
    const meta = config.metas[id] ?? null
    return {
      id,
      porMes,
      acumulado: soma(porMes),
      media: fechados ? Math.round(soma(porMes.slice(0, fechados)) / fechados) : null,
      meta,
      previsto: meta === null ? null : meta * 12,
    }
  }

  const linhas = CATEGORIAS.filter((c) => c.id !== 'viagens').map((c) => linha(c.id))
  const doAno = meses.filter((m) => m.mes.startsWith(ano))
  const porMes = [...Array(12).keys()].map((i) => soma(linhas.map((l) => l.porMes[i])))

  const destinacoes = DESTINOS.map((id): LinhaDestino => {
    const valores = [...Array(12).keys()].map(
      (i) => doAno.find((m) => m.mes === `${ano}-${String(i + 1).padStart(2, '0')}`)?.[id] ?? 0,
    )
    return { id, porMes: valores, acumulado: soma(valores) }
  })
  const destinado = [...Array(12).keys()].map((i) =>
    soma(destinacoes.map((d) => d.porMes[i])),
  )

  return {
    linhas,
    viagens: linha('viagens'),
    mesesFechados: fechados,
    totais: {
      porMes,
      acumulado: soma(porMes),
      media: fechados ? Math.round(soma(porMes.slice(0, fechados)) / fechados) : null,
      meta: metaTotal(config),
      previsto: metaTotal(config) * 12,
    },
    destinacoes,
    destinado: { porMes: destinado, acumulado: soma(destinado) },
    renda: soma(doAno.map((m) => (m.cvm ?? 0) + m.extra)),
    rendaPrevista: config.rendaPrevistaMensal * 12,
    poupado: soma(doAno.map((m) => m.poupado)),
  }
}

/** Contas do checklist que valem para o mês e ainda estão sem OK. */
export function contasPendentes(mes: MesDoc, config: Config): string[] {
  const numero = Number(mes.mes.slice(5, 7))
  return config.contas
    .filter((c) => !c.meses || c.meses.includes(numero))
    .map((c) => c.nome)
    .filter((nome) => !mes.contas[nome])
}
