import { describe, expect, it } from 'vitest'
import type { Operacao, ParametrosInvest, Posicao } from '../dados/tipos'
import {
  alertaDeVencimento,
  caixasDe,
  fotoDoMes,
  linhasDoHistorico,
  painel,
  resultadoDoAtivo,
  resumoDoAnoHistorico,
  resumoPorAtivo,
  sugestaoDeAporte,
  tomDoStatus,
  valorNoHistorico,
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
    expect(p.baseConvexo).toBe(6300000)
    expect(p.foraDaBase).toEqual(['Carro'])
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
    const [wrld, gold] = p.ativos
    expect(wrld.pct).toBeCloseTo(0.6)
    expect(gold.pct).toBeCloseTo(0.4)
    expect(wrld.status).toBe('OK')
    expect(p.foraDaProporcao.pctDoConvexo).toBeCloseTo(0.2)
    const torto = painel([pos('Convexo', 900000, { classe: 'ETF global' }), pos('Convexo', 100000, { classe: 'ETF ouro' })], inv, HOJE)
    expect(torto.ativos.map((a) => a.status)).toEqual(['Acima: pausar aportes', 'Abaixo: priorizar no aporte'])
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
    const s = sugestaoDeAporte(p, inv, 500000, { WRLD11: 15000, GOLD11: 2500 })
    expect(s.total).toBe(500000)
    expect(s.convexo).toBe(130000) // o que falta para a meta, abaixo do teto de 2.000,00
    // (2.400 + 1.600 + 1.300) × 60% − 2.400 = 780,00 para WRLD11; o resto para GOLD11
    expect(s.ativos).toEqual([
      { nome: 'WRLD11', valor: 78000, cotas: 5 }, // 780 ÷ 150, para baixo
      { nome: 'GOLD11', valor: 52000, cotas: 20 }, // 520 ÷ 25, para baixo
    ])
    expect(s.objetivos).toEqual([
      { nome: 'Reserva', valor: 200000 }, // até a meta
      { nome: 'Carro', valor: 0 }, // já acima da meta
      { nome: 'Apê', valor: 170000 }, // o que sobra
    ])
    expect(s.sobra).toBe(0)
  })

  it('respeita o teto mensal do convexo e soma a caixa "A alocar"', () => {
    const comSobra = painel([...carteira, pos('A alocar', 3000000)], inv, HOJE)
    const s = sugestaoDeAporte(comSobra, inv, 1000000)
    expect(s.total).toBe(4000000)
    expect(s.convexo).toBe(200000) // teto
    expect(s.ativos[0].cotas).toBeNull() // sem preço informado
  })

  it('não manda nada para o convexo quando ele passou da faixa, nem distribui sem aporte', () => {
    const gordo = painel([pos('Reserva', 1000000), pos('Convexo', 400000)], inv, HOJE)
    expect(sugestaoDeAporte(gordo, inv, 500000).convexo).toBe(0)
    const parado = sugestaoDeAporte(p, inv, 0)
    expect(parado).toMatchObject({ total: 0, convexo: 0, sobra: 0 })
    expect(parado.objetivos.every((o) => o.valor === 0)).toBe(true)
  })
})

describe('objetivos e ativos editados', () => {
  const novo: ParametrosInvest = {
    ...inv,
    objetivos: [
      { id: 'a', nome: 'Intercâmbio', meta: 2000000, data: '2028-01-31' },
      { id: 'b', nome: 'Reserva', meta: 5000000, data: null, foraDoConvexo: true },
    ],
    ativosConvexo: [
      { nome: 'AAA11', alvo: 0.5 },
      { nome: 'BBB11', alvo: 0.3 },
      { nome: 'CCC11', alvo: 0.2 },
    ],
  }
  const posicoes = [
    pos('Intercâmbio', 1500000),
    pos('Reserva', 4000000),
    pos('Convexo', 100000, { nome: 'aaa11' }),
    pos('Convexo', 60000, { nome: 'BBB11' }),
    pos('Convexo', 40000, { nome: 'Outra aposta' }),
  ]
  const p = painel(posicoes, novo, HOJE)

  it('monta as caixas pela lista e tira da base do convexo os objetivos marcados', () => {
    expect(p.caixas.map((c) => c.nome)).toEqual(['Intercâmbio', 'Reserva', 'Convexo', 'A alocar'])
    expect(p.baseConvexo).toBe(5700000 - 4000000)
    expect(p.statusTotal).toBe('OK')
    expect(caixasDe(novo)).toEqual(['Intercâmbio', 'Reserva', 'Convexo', 'A alocar'])
  })

  it('acha os ativos pelo nome da posição e separa o que está fora da proporção', () => {
    expect(p.ativos.map((a) => a.atual)).toEqual([100000, 60000, 0])
    expect(p.ativos[0].pct).toBeCloseTo(0.625)
    expect(p.foraDaProporcao.atual).toBe(40000)
  })

  it('distribui o aporte na ordem da lista, com o último objetivo ficando com o resto', () => {
    const s = sugestaoDeAporte(p, novo, 1000000)
    expect(s.convexo).toBe(100000) // 10% do aporte, abaixo do teto
    // Alvos sobre 2.600,00: 1.300, 780 e 520. Faltam 300, 180 e 520; o último fica com o resto.
    expect(s.ativos.map((a) => a.valor)).toEqual([30000, 18000, 52000])
    expect(s.objetivos).toEqual([{ nome: 'Intercâmbio', valor: 500000 }, { nome: 'Reserva', valor: 400000 }])
  })

  it('guarda no fechamento o saldo de cada objetivo e lê os fechamentos antigos', () => {
    const foto = fotoDoMes(p, '2026-12', 0, 0)
    expect(foto.caixas).toEqual({ 'Intercâmbio': 1500000, Reserva: 4000000 })
    const antigo = { mes: '2026-11', reserva: 3900000, carro: 100000, ape: 0, convexo: 150000, aAlocar: 0, aporte: 0, saidas: 0 }
    const [primeira, segunda] = linhasDoHistorico([foto, antigo])
    expect(primeira.total).toBe(4150000)
    expect(valorNoHistorico(antigo, 'Carro')).toBe(100000)
    expect(segunda.total).toBe(5700000)
    expect(segunda.pctConvexo).toBeCloseTo(200000 / 1700000)
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
    expect(foto).toMatchObject({ caixas: { Reserva: 4800000, Carro: 4300000, Apê: 1000000 }, convexo: 500000, aAlocar: 0 })
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

describe('lucro ou prejuízo por ativo', () => {
  const ativo = { ativo: 'WRLD11', cotas: 10, custoDasCompras: 150000, precoMedio: 12500, vendaLiberadaEm: null, status: '' }

  it('compara a cotação com o preço médio das cotas em carteira', () => {
    // 12 cotas compradas por 1.500,00 (média de 125,00); restam 10.
    expect(resultadoDoAtivo(ativo, 15000)).toEqual({ custo: 125000, valor: 150000, diferenca: 25000, pct: 15000 / 12500 - 1 })
    const queda = resultadoDoAtivo(ativo, 10000)!
    expect(queda.diferenca).toBe(-25000)
    expect(queda.pct).toBeCloseTo(-0.2)
  })

  it('fica sem resultado sem cotação, sem compras ou sem cotas', () => {
    expect(resultadoDoAtivo(ativo, null)).toBeNull()
    expect(resultadoDoAtivo({ ...ativo, precoMedio: null }, 15000)).toBeNull()
    expect(resultadoDoAtivo({ ...ativo, cotas: 0 }, 15000)).toBeNull()
  })
})

describe('resumo do ano no histórico', () => {
  const fechamento = (mes: string, convexo: number, aporte = 0, saidas = 0) => ({ mes, caixas: {}, convexo, aAlocar: 0, aporte, saidas })
  const linhas = linhasDoHistorico([
    fechamento('2026-11', 100000),
    fechamento('2026-12', 130000, 20000),
    fechamento('2027-01', 150000, 10000, 5000),
    fechamento('2027-02', 160000, 10000),
  ])

  it('parte do último fechamento do ano anterior e soma aportes, saídas e rendimentos do ano', () => {
    // Janeiro: 150 − 130 − 10 + 5 = 15; fevereiro: 160 − 150 − 10 = 0.
    expect(resumoDoAnoHistorico(linhas, '2027')).toEqual({ inicio: 130000, inicioEm: '2026-12', fim: 160000, aporte: 20000, saidas: 5000, rendimento: 15000, meses: 2 })
  })

  it('sem ano anterior, parte do primeiro fechamento; sem fechamento no ano, não há resumo', () => {
    expect(resumoDoAnoHistorico(linhas, '2026')).toMatchObject({ inicio: 100000, inicioEm: '2026-11', fim: 130000, rendimento: 10000 })
    expect(resumoDoAnoHistorico(linhas, '2025')).toBeNull()
  })
})
