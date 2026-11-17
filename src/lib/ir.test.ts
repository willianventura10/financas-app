import { describe, expect, it } from 'vitest'
import type { Operacao } from '../dados/tipos'
import { apuracaoMensal, carteiraEm, darfEmAberto, proventosDoAno, tipoDoAtivo, vencimentoDoDarf } from './ir'

let n = 0
const op = (data: string, ativo: string, tipo: Operacao['tipo'], quantidade: number, total: number): Operacao => ({
  id: String(n++),
  data,
  ativo,
  tipo,
  quantidade,
  total,
  obs: '',
})

describe('imposto de renda', () => {
  it('deduz o tipo pelo código, e a escolha do usuário vale mais', () => {
    expect(['BBAS3', 'PETR4', 'WRLD11', 'AAPL34'].map((a) => tipoDoAtivo(a))).toEqual(['acao', 'acao', 'etf', 'bdr'])
    expect(tipoDoAtivo('HGLG11', { HGLG11: 'fii' })).toBe('fii')
  })

  it('calcula o custo pelo preço médio, que recomeça quando o ativo zera', () => {
    const ops = [
      op('2026-01-10', 'WRLD11', 'compra', 10, 100000),
      op('2026-02-10', 'WRLD11', 'compra', 10, 140000), // média de 120,00
      op('2026-03-10', 'WRLD11', 'venda', 5, 75000), // custo de 600,00
      op('2026-04-10', 'BBAS3', 'compra', 100, 200000),
      op('2026-05-10', 'BBAS3', 'venda', 100, 180000),
      op('2026-06-10', 'BBAS3', 'compra', 10, 15000), // recomeça a 15,00
    ]
    expect(carteiraEm(ops, '2026-12-31')).toEqual([
      { ativo: 'BBAS3', quantidade: 10, custo: 15000 },
      { ativo: 'WRLD11', quantidade: 15, custo: 180000 },
    ])
    expect(carteiraEm(ops, '2026-01-31')).toEqual([{ ativo: 'WRLD11', quantidade: 10, custo: 100000 }])
  })

  it('isenta o lucro de ações até R$ 20 mil vendidos, mas não o de ETF', () => {
    const ops = [
      op('2026-01-05', 'BBAS3', 'compra', 100, 1000000),
      op('2026-01-05', 'WRLD11', 'compra', 10, 100000),
      op('2026-02-05', 'BBAS3', 'venda', 100, 1500000), // lucro de 5.000,00, isento
      op('2026-02-06', 'WRLD11', 'venda', 10, 120000), // lucro de 200,00, tributável
    ]
    const [fev] = apuracaoMensal(ops)
    expect(fev).toMatchObject({ mes: '2026-02', vendasAcoes: 1500000, lucroIsento: 500000, resultadoComum: 20000 })
    expect(fev.imposto).toBe(3000)
    expect(fev.pagar).toBe(true)
    expect(fev.vencimento).toBe('2026-03-31')
  })

  it('tributa todo o lucro de ações quando as vendas passam de R$ 20 mil', () => {
    const ops = [op('2026-01-05', 'PETR4', 'compra', 1000, 2000000), op('2026-02-05', 'PETR4', 'venda', 1000, 2100000)]
    expect(apuracaoMensal(ops)[0]).toMatchObject({ lucroIsento: 0, resultadoComum: 100000, imposto: 15000 })
  })

  it('compensa o prejuízo acumulado e junta o imposto abaixo de R$ 10,00 ao mês seguinte', () => {
    const ops = [
      op('2026-01-05', 'MOVI3', 'compra', 50, 39013),
      op('2026-01-07', 'MOVI3', 'venda', 50, 31410), // prejuízo de 76,03
      op('2026-01-05', 'WRLD11', 'compra', 30, 300000),
      op('2026-02-05', 'WRLD11', 'venda', 10, 110603), // lucro de 106,03: sobra 30,00 depois do prejuízo
      op('2026-03-05', 'WRLD11', 'venda', 10, 105000), // lucro de 50,00
    ]
    const [jan, fev, mar] = apuracaoMensal(ops)
    expect(jan).toMatchObject({ resultadoComum: -7603, prejuizoComum: 7603, imposto: 0, pagar: false })
    expect(fev).toMatchObject({ resultadoComum: 10603, prejuizoComum: 0, imposto: 450, pagar: false })
    expect(mar).toMatchObject({ imposto: 450 + 750, pagar: true })
  })

  it('separa o FII, a 20%, com prejuízo próprio', () => {
    const tipos = { HGLG11: 'fii' as const }
    const ops = [op('2026-01-05', 'HGLG11', 'compra', 10, 160000), op('2026-02-05', 'HGLG11', 'venda', 10, 170000)]
    expect(apuracaoMensal(ops, tipos)[0]).toMatchObject({ resultadoFii: 10000, resultadoComum: 0, imposto: 2000 })
  })

  it('marca a venda sem compra registrada', () => {
    const [m] = apuracaoMensal([op('2026-02-05', 'BBAS3', 'venda', 10, 20000)])
    expect(m.vendas[0]).toMatchObject({ custo: 0, semCompra: true })
  })

  it('soma os proventos do ano e acha o DARF em aberto', () => {
    const ops = [
      op('2026-03-01', 'BBAS3', 'dividendo', 0, 1200),
      op('2026-06-01', 'BBAS3', 'jcp', 0, 850),
      op('2025-06-01', 'BBAS3', 'dividendo', 0, 999),
    ]
    expect(proventosDoAno(ops, '2026')).toEqual([{ ativo: 'BBAS3', dividendos: 1200, jcp: 850 }])
    const apuracao = apuracaoMensal([op('2026-10-01', 'WRLD11', 'compra', 10, 100000), op('2026-10-20', 'WRLD11', 'venda', 10, 120000)])
    expect(vencimentoDoDarf('2026-10')).toBe('2026-11-30')
    expect(darfEmAberto(apuracao, [], '2026-11-17')?.mes).toBe('2026-10')
    expect(darfEmAberto(apuracao, ['2026-10'], '2026-11-17')).toBeNull()
    expect(darfEmAberto(apuracao, [], '2026-10-25')).toBeNull() // o mês ainda não acabou
    expect(darfEmAberto(apuracao, [], '2026-12-01')).toBeNull() // venceu
  })
})
