import { describe, expect, it } from 'vitest'
import type { Lancamento } from '../dados/tipos'
import { hoje, mesDe, nomeDoMes, somarMes } from './datas'
import { lerCentavos, numero, ocultarValores, paraCampo, precoMedio, reais } from './dinheiro'
import { totaisPorCategoria, totalDoMes } from './totais'

const gasto = (parcial: Partial<Lancamento>): Lancamento => ({
  id: crypto.randomUUID(),
  mes: '2026-11',
  data: '2026-11-05',
  valor: 1000,
  categoria: 'alim',
  criadoEm: 1,
  editadoEm: 1,
  ...parcial,
})

describe('dinheiro', () => {
  it('lê valores digitados no formato brasileiro', () => {
    expect(lerCentavos('45,90')).toBe(4590)
    expect(lerCentavos('1.234,56')).toBe(123456)
    expect(lerCentavos('R$ 12')).toBe(1200)
    expect(lerCentavos('1.234')).toBe(123400)
  })
  it('aceita ponto como decimal quando não há vírgula', () => {
    expect(lerCentavos('45.9')).toBe(4590)
    expect(lerCentavos('0.5')).toBe(50)
  })
  it('recusa o que não é valor', () => {
    expect(lerCentavos('')).toBeNull()
    expect(lerCentavos('abc')).toBeNull()
    expect(lerCentavos('-5')).toBeNull()
  })
  it('não acumula erro de arredondamento', () => {
    // 0,1 + 0,2 em ponto flutuante dá 0,30000000000000004; em centavos dá 30.
    expect(lerCentavos('0,10')! + lerCentavos('0,20')!).toBe(30)
  })
  it('formata em reais', () => {
    expect(reais(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56')
  })
})

describe('datas', () => {
  it('monta a data local de hoje', () => {
    expect(hoje(new Date(2026, 10, 11, 23, 30))).toBe('2026-11-11')
  })
  it('tira o mês da data', () => {
    expect(mesDe('2026-11-11')).toBe('2026-11')
  })
  it('anda entre meses virando o ano', () => {
    expect(somarMes('2026-12', 1)).toBe('2027-01')
    expect(somarMes('2026-01', -1)).toBe('2025-12')
    expect(somarMes('2026-11', 0)).toBe('2026-11')
  })
  it('escreve o mês por extenso', () => {
    expect(nomeDoMes('2026-11')).toBe('novembro de 2026')
  })
})

describe('totais', () => {
  // Novembro na planilha: Alimentação = Comi na rua (68,09) + demais parcelas (1.018,27) = 1.086,36.
  const itens = [
    gasto({ valor: 6809, comiNaRua: true }),
    gasto({ valor: 101827 }),
    gasto({ categoria: 'transporte', valor: 14540 }),
  ]
  it('soma "Comi na rua" dentro de Alimentação', () => {
    const alim = totaisPorCategoria(itens).find((c) => c.id === 'alim')!
    expect(alim.total).toBe(108636)
    expect(alim.comiNaRua).toBe(6809)
  })
  it('mantém as 12 categorias na ordem da planilha', () => {
    const ids = totaisPorCategoria([]).map((c) => c.id)
    expect(ids).toHaveLength(12)
    expect(ids[0]).toBe('aluguel')
    expect(ids[11]).toBe('transporte')
  })
  it('soma o total do mês', () => {
    expect(totalDoMes(itens)).toBe(123176)
  })
})

describe('ocultar valores', () => {
  it('troca os valores mostrados por bolinhas, menos o que vai para os campos', () => {
    ocultarValores(true)
    expect(reais(4590)).toBe('R$ ••••')
    expect(numero(4590)).toBe('••••')
    expect(precoMedio(12533.33)).toBe('R$ ••••')
    expect(paraCampo(123456)).toBe('1.234,56')
    ocultarValores(false)
    expect(numero(123456)).toBe('1.234,56')
    expect(precoMedio(12533.3333)).toBe('R$ 125,3333')
  })
})
