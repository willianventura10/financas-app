import { describe, expect, it } from 'vitest'
import type { Operacao, ParametrosInvest, Posicao } from '../dados/tipos'
import {
  alertaDeVencimento,
  fotoDoMes,
  linhasDoHistorico,
  painel,
  resumoPorAtivo,
  sugestaoDeAporte,
  tomDoStatus,
} from './investimentos'

// Números inventados: os dados reais nunca entram no repositório.
const inv: ParametrosInvest = {
  metaReserva: 5000000,
  metaReservaFinal: 7000000,
  metaCarro: 4000000,
  dataCarro: null,
  metaApe: 10000000,
  dataApe: null,
  alvoConvexo: 0.1,
  minConvexo: 0.06,
  maxConvexo: 0.15,
  alvoWrld: 0.6,
  tolerancia: 0.05,
  aporteMensal: 500000,
  tetoConvexo: 200000,
  limiteFgc: 25000000,
  alertaVencimentoDias: 45,
  caixas: [],
  classes: [],
  instituicoes: ['Banco A', 'Banco B'],
  liquidez: [],
}

let n = 0
const pos = (caixa: string, valor: number, extra: Partial<Posicao> = {}): Posicao => ({
  id: `p${++n}`,
  ordem: n,
  nome: `Posição ${n}`,
  instituicao: 'Banco A',
  classe: 'Renda fixa',
  caixa,
  valor,
  rentabilidade: '',
  vencimento: null,
  liquidez: 'Diária',
  fgc: true,
  obs: '',
  ...extra,
})

const carteira = [
  pos('Reserva', 4800000),
  pos('Carro', 4300000, { instituicao: 'Banco B', vencimento: '2026-12-01' }),
  pos('Apê', 1000000, { fgc: false, instituicao: 'Tesouro' }),
  pos('Convexo', 240000, { classe: 'ETF global', fgc: false, instituicao: 'Bolsa' }),
  pos('Convexo', 160000, { classe: 'ETF ouro', fgc: false, instituicao: 'Bolsa' }),
  pos('Convexo', 100000, { classe: 'Ação BR', fgc: false, instituicao: 'Bolsa' }),
]
const HOJE = '2026-11-11'

describe('painel', () => {
  const p = painel(carteira, inv, HOJE)

  it('soma o patrimônio e desconta a caixa do carro', () => {
    expect(p.total).toBe(10600000)
    expect(p.semCarro).toBe(6300000)
    expect(p.statusTotal).toBe('OK')
  })

  it('compara cada caixa com a meta', () => {
    const [reserva, carro, ape, convexo, aAlocar] = p.caixas
    expect(reserva).toMatchObject({ falta: 200000, status: 'Abaixo da meta' })
    expect(carro.status).toBe('OK (o excedente pode ir para a reserva ao vencer)') // 107,5% da meta
    expect(ape).toMatchObject({ falta: 9000000, status: 'Abaixo da meta' })
    expect(convexo.meta).toBe(630000) // 10% de 63.000,00
    expect(convexo.falta).toBe(130000)
    expect(aAlocar).toMatchObject({ meta: null, status: 'OK' })
  })

  it('classifica o convexo pela faixa', () => {
    expect(p.convexo.pct).toBeCloseTo(500000 / 6300000) // 7,9%: dentro de 6% a 15%
    expect(p.convexo.status).toBe('OK')
    const magro = painel([pos('Reserva', 9000000), pos('Convexo', 100000)], inv, HOJE)
    expect(magro.convexo.status).toBe('Abaixo da faixa')
    const gordo = painel([pos('Reserva', 1000000), pos('Convexo', 400000)], inv, HOJE)
    expect(gordo.convexo.status).toBe('Acima: colher')
  })

  it('mede WRLD11 e GOLD11 sobre a soma dos dois, sem a ação BR', () => {
    expect(p.wrld.pct).toBeCloseTo(0.6)
    expect(p.gold.pct).toBeCloseTo(0.4)
    expect(p.wrld.status).toBe('OK')
    expect(p.acaoBr.pctDoConvexo).toBeCloseTo(0.2)
    const torto = painel([pos('Convexo', 900000, { classe: 'ETF global' }), pos('Convexo', 100000, { classe: 'ETF ouro' })], inv, HOJE)
    expect(torto.wrld.status).toBe('Acima: pausar aportes')
    expect(torto.gold.status).toBe('Abaixo: priorizar no aporte')
  })

  it('soma o FGC por instituição e conta vencimentos próximos', () => {
    expect(p.fgc.find((f) => f.instituicao === 'Banco A')).toMatchObject({ comFgc: 4800000, folga: 20200000, status: 'OK' })
    expect(p.fgc.find((f) => f.instituicao === 'Tesouro')).toMatchObject({ comFgc: 0, total: 1000000, status: 'Sem FGC' })
    expect(p.vencimentos).toEqual({ quantidade: 1, valor: 4300000 }) // vence em 20 dias
    const cheio = painel([pos('Reserva', 21000000)], inv, HOJE)
    expect(cheio.fgc[0].status).toBe('Abaixo, mas perto do limite')
  })

  it('acusa posição com caixa fora da lista', () => {
    expect(painel([pos('Outra', 100)], inv, HOJE).statusTotal).toBe('ATENÇÃO: há posição sem caixa')
  })
})

describe('sugestão de aporte', () => {
  const p = painel(carteira, inv, HOJE)

  it('segue a ordem convexo, reserva, carro e apê', () => {
    const s = sugestaoDeAporte(p, inv, 500000, 15000, 2500)
    expect(s.total).toBe(500000)
    expect(s.convexo).toBe(130000) // o que falta para a meta, abaixo do teto de 2.000,00
    // (2.400 + 1.600 + 1.300) × 60% − 2.400 = 780,00 para WRLD11; o resto para GOLD11
    expect(s.wrld).toBe(78000)
    expect(s.gold).toBe(52000)
    expect(s.cotasWrld).toBe(5) // 780 ÷ 150, para baixo
    expect(s.cotasGold).toBe(20) // 520 ÷ 25, para baixo
    expect(s.reserva).toBe(200000) // até a meta
    expect(s.carro).toBe(0) // já acima da meta
    expect(s.ape).toBe(170000) // o que sobra
    expect(s.convexo + s.reserva + s.carro + s.ape).toBe(s.total)
  })

  it('respeita o teto mensal do convexo e soma a caixa "A alocar"', () => {
    const comSobra = painel([...carteira, pos('A alocar', 3000000)], inv, HOJE)
    const s = sugestaoDeAporte(comSobra, inv, 1000000, null, null)
    expect(s.total).toBe(4000000)
    expect(s.convexo).toBe(200000) // teto
    expect(s.cotasWrld).toBeNull() // sem preço informado
  })

  it('não manda nada para o convexo quando ele passou da faixa, nem distribui sem aporte', () => {
    const gordo = painel([pos('Reserva', 1000000), pos('Convexo', 400000)], inv, HOJE)
    expect(sugestaoDeAporte(gordo, inv, 500000, null, null).convexo).toBe(0)
    expect(sugestaoDeAporte(p, inv, 0, null, null)).toMatchObject({ total: 0, convexo: 0, reserva: 0, ape: 0 })
  })
})

describe('compras e vendas', () => {
  const op = (data: string, ativo: string, tipo: 'compra' | 'venda', quantidade: number, total: number): Operacao => ({
    id: `${data}${ativo}${tipo}`,
    data,
    ativo,
    tipo,
    quantidade,
    total,
    obs: '',
  })
  const ops = [
    op('2026-10-01', 'AAAA3', 'compra', 100, 200000),
    op('2026-10-20', 'AAAA3', 'compra', 100, 260000),
    op('2026-11-05', 'AAAA3', 'venda', 50, 150000),
    op('2026-10-27', 'BBBB3', 'compra', 50, 40000),
    op('2026-10-29', 'BBBB3', 'venda', 50, 30000),
  ]

  it('calcula cotas, preço médio das compras e a data liberada pela regra dos 30 dias', () => {
    const [a, b] = resumoPorAtivo(ops, '2026-11-11')
    expect(a).toMatchObject({ ativo: 'AAAA3', cotas: 150, custoDasCompras: 460000, precoMedio: 2300 })
    expect(a.vendaLiberadaEm).toBe('2026-11-19') // última compra em 20/10 + 30 dias
    expect(a.status).toBe('Aguardar')
    expect(b).toMatchObject({ cotas: 0, vendaLiberadaEm: null, status: 'Sem posição' })
  })

  it('libera a venda no 30º dia', () => {
    expect(resumoPorAtivo(ops, '2026-11-19')[0].status).toBe('Liberado')
  })
})

describe('histórico', () => {
  const p = painel(carteira, inv, HOJE)

  it('tira a foto das caixas e estima o rendimento do mês', () => {
    const anterior = { mes: '2026-10', reserva: 4700000, carro: 4250000, ape: 990000, convexo: 300000, aAlocar: 0, aporte: 0, saidas: 0 }
    const foto = fotoDoMes(p, '2026-11', 300000, 50000)
    expect(foto).toMatchObject({ reserva: 4800000, carro: 4300000, ape: 1000000, convexo: 500000, aAlocar: 0 })
    const [primeira, segunda] = linhasDoHistorico([foto, anterior])
    expect(primeira.rendimento).toBeNull()
    expect(segunda.total).toBe(10600000)
    expect(segunda.rendimento).toBe(10600000 - 10240000 - 300000 + 50000) // variação − aporte + saídas
    expect(segunda.pctConvexo).toBeCloseTo(500000 / 6300000)
  })
})

describe('alertas', () => {
  it('avisa do vencimento e escolhe o tom pela palavra', () => {
    expect(alertaDeVencimento(pos('Carro', 100, { vencimento: '2026-11-01' }), HOJE, 45)).toBe('VENCIDO')
    expect(alertaDeVencimento(pos('Carro', 100, { vencimento: '2026-12-20' }), HOJE, 45)).toBe('Vence em breve')
    expect(alertaDeVencimento(pos('Carro', 100, { vencimento: '2027-04-30' }), HOJE, 45)).toBe('')
    expect(alertaDeVencimento(pos('Carro', 0, { vencimento: '2026-11-01' }), HOJE, 45)).toBe('')
    expect(tomDoStatus('Acima: colher')).toBe('critico')
    expect(tomDoStatus('Abaixo da meta')).toBe('aviso')
    expect(tomDoStatus('OK')).toBe('ok')
    expect(tomDoStatus('Sem FGC')).toBe('neutro')
  })
})
