import type { Historico, Operacao, ParametrosInvest, Posicao } from '../dados/tipos'

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

export interface Painel {
  total: number
  semCarro: number
  aAlocar: number
  vencimentos: { quantidade: number; valor: number }
  /** Reserva, Carro, Apê, Convexo e A alocar, nesta ordem. */
  caixas: LinhaCaixa[]
  /** Confere se toda posição tem uma das cinco caixas. */
  statusTotal: string
  convexo: { atual: number; pct: number | null; alvo: number; status: string }
  wrld: { atual: number; pct: number | null; alvo: number; status: string }
  gold: { atual: number; pct: number | null; alvo: number; status: string }
  acaoBr: { atual: number; pctDoPatrimonio: number | null; pctDoConvexo: number }
  fgc: LinhaFgc[]
}

export function painel(posicoes: Posicao[], inv: ParametrosInvest, hoje: string): Painel {
  const de = (campo: 'caixa' | 'classe', nome: string) =>
    soma(posicoes.filter((p) => p[campo] === nome).map((p) => p.valor))
  const total = soma(posicoes.map((p) => p.valor))
  const [reserva, carro, ape, convexo, aAlocar] = ['Reserva', 'Carro', 'Apê', 'Convexo', 'A alocar'].map((c) =>
    de('caixa', c),
  )
  const semCarro = total - carro
  const metaConvexo = Math.round(inv.alvoConvexo * semCarro)
  const pctConvexo = semCarro === 0 ? null : convexo / semCarro

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

  const wrld = de('classe', 'ETF global')
  const gold = de('classe', 'ETF ouro')
  const acaoBr = de('classe', 'Ação BR')
  const etf = (atual: number, alvo: number) => {
    const pct = wrld + gold === 0 ? null : atual / (wrld + gold)
    const diferenca = pct === null ? 0 : pct - alvo
    const status =
      pct === null
        ? 'Ainda sem posição'
        : Math.abs(diferenca) <= inv.tolerancia
          ? 'OK'
          : diferenca < 0
            ? 'Abaixo: priorizar no aporte'
            : 'Acima: pausar aportes'
    return { atual, pct, alvo, status }
  }

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

  return {
    total,
    semCarro,
    aAlocar,
    vencimentos: { quantidade: proximos.length, valor: soma(proximos.map((p) => p.valor)) },
    caixas: [
      caixa('Reserva', reserva, inv.metaReserva, simples(reserva, inv.metaReserva)),
      caixa(
        'Carro',
        carro,
        inv.metaCarro,
        carro >= inv.metaCarro * 1.05 ? 'OK (o excedente pode ir para a reserva ao vencer)' : simples(carro, inv.metaCarro),
      ),
      caixa('Apê', ape, inv.metaApe, simples(ape, inv.metaApe)),
      caixa('Convexo', convexo, metaConvexo, statusConvexo),
      caixa('A alocar', aAlocar, null, aAlocar > 0 ? 'Distribuir (veja a sugestão)' : 'OK'),
    ],
    statusTotal: reserva + carro + ape + convexo + aAlocar === total ? 'OK' : 'ATENÇÃO: há posição sem caixa',
    convexo: { atual: convexo, pct: pctConvexo, alvo: inv.alvoConvexo, status: statusConvexo },
    wrld: etf(wrld, inv.alvoWrld),
    gold: etf(gold, 1 - inv.alvoWrld),
    acaoBr: {
      atual: acaoBr,
      pctDoPatrimonio: semCarro === 0 ? null : acaoBr / semCarro,
      pctDoConvexo: convexo === 0 ? 0 : acaoBr / convexo,
    },
    fgc,
  }
}

export interface Sugestao {
  /** Aporte novo + caixa "A alocar". */
  total: number
  convexo: number
  wrld: number
  gold: number
  /** Cotas inteiras; null enquanto o preço não foi informado. */
  cotasWrld: number | null
  cotasGold: number | null
  reserva: number
  carro: number
  ape: number
}

/**
 * "Sugestão para o aporte do mês": 1º convexo (até a meta, limitado ao teto mensal; depois, % alvo do aporte),
 * 2º reserva até a meta, 3º caixa do carro até a meta, 4º fundo do apê com o resto.
 */
export function sugestaoDeAporte(
  p: Painel,
  inv: ParametrosInvest,
  aporteNovo: number,
  precoWrld: number | null,
  precoGold: number | null,
): Sugestao {
  const [reserva, carro, , convexo] = p.caixas
  const total = aporteNovo + p.aAlocar
  const paraConvexo =
    total <= 0 || convexo.status === 'Acima: colher'
      ? 0
      : Math.min(total, inv.tetoConvexo, Math.max(convexo.falta, Math.round(inv.alvoConvexo * total)))
  // Vai primeiro para o ETF que está abaixo da proporção.
  const wrld = Math.min(
    paraConvexo,
    Math.max(0, Math.round((p.wrld.atual + p.gold.atual + paraConvexo) * inv.alvoWrld) - p.wrld.atual),
  )
  const gold = paraConvexo - wrld
  const paraReserva = Math.min(total - paraConvexo, reserva.falta)
  const paraCarro = Math.min(total - paraConvexo - paraReserva, carro.falta)
  return {
    total,
    convexo: paraConvexo,
    wrld,
    gold,
    cotasWrld: precoWrld ? Math.floor(wrld / precoWrld) : null,
    cotasGold: precoGold ? Math.floor(gold / precoGold) : null,
    reserva: paraReserva,
    carro: paraCarro,
    ape: total - paraConvexo - paraReserva - paraCarro,
  }
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
  const ativos = [...new Set(operacoes.map((o) => o.ativo))].sort()
  return ativos.map((ativo) => {
    const doAtivo = operacoes.filter((o) => o.ativo === ativo)
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

export interface LinhaHistorico extends Historico {
  total: number
  /** Total − total do mês anterior − aporte + saídas; null no primeiro mês. */
  rendimento: number | null
  /** Convexo ÷ (total − Carro). */
  pctConvexo: number | null
}

export function linhasDoHistorico(historico: Historico[]): LinhaHistorico[] {
  const ordenado = [...historico].sort((a, b) => a.mes.localeCompare(b.mes))
  const total = (h: Historico) => h.reserva + h.carro + h.ape + h.convexo + h.aAlocar
  return ordenado.map((h, i) => ({
    ...h,
    total: total(h),
    rendimento: i === 0 ? null : total(h) - total(ordenado[i - 1]) - h.aporte + h.saidas,
    pctConvexo: total(h) - h.carro === 0 ? null : h.convexo / (total(h) - h.carro),
  }))
}

/** A "Linha para o Histórico" do Painel: a foto das caixas no fechamento do mês. */
export function fotoDoMes(p: Painel, mes: string, aporte: number, saidas: number): Historico {
  const [reserva, carro, ape, convexo, aAlocar] = p.caixas.map((c) => c.atual)
  return { mes, reserva, carro, ape, convexo, aAlocar, aporte, saidas }
}

/** Cor do aviso, pelas mesmas palavras que a planilha usava na formatação. */
export function tomDoStatus(status: string): 'ok' | 'aviso' | 'critico' | 'neutro' {
  if (/Acima|VENCIDO|ATENÇÃO/.test(status)) return 'critico'
  if (/Abaixo|Aguardar|breve|Distribuir/.test(status)) return 'aviso'
  if (/OK|Liberado/.test(status)) return 'ok'
  return 'neutro'
}
