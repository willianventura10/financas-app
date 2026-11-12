import { describe, expect, it } from 'vitest'
import { criarRepoLocal } from '../dados/repoLocal'
import type { Lancamento } from '../dados/tipos'
import { hoje, mesDe, nomeDoMes, somarMes } from './datas'
import { lerCentavos, reais } from './dinheiro'
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

describe('repositório local', () => {
  const memoria = () => {
    let texto: string | null = null
    return { ler: () => texto, gravar: (t: string) => void (texto = t) }
  }

  it('entrega só os lançamentos do mês pedido e avisa a cada mudança', async () => {
    const repo = criarRepoLocal(memoria())
    const vistos: number[] = []
    const parar = repo.ouvirLancamentos('2026-11', (itens) => vistos.push(itens.length))
    const a = gasto({})
    await repo.salvarLancamento(a)
    await repo.salvarLancamento(gasto({ mes: '2026-10', data: '2026-10-30' }))
    await repo.excluirLancamento(a.id)
    parar()
    await repo.salvarLancamento(gasto({}))
    expect(vistos).toEqual([0, 1, 1, 0])
  })

  it('substitui o lançamento de mesmo id em vez de duplicar', async () => {
    const repo = criarRepoLocal(memoria())
    const a = gasto({ valor: 500 })
    await repo.salvarLancamento(a)
    await repo.salvarLancamento({ ...a, valor: 700 })
    let lidos: Lancamento[] = []
    repo.ouvirLancamentos('2026-11', (itens) => (lidos = itens))
    expect(lidos.map((l) => l.valor)).toEqual([700])
  })

  it('preserva os dados depois de reabrir', async () => {
    const armazem = memoria()
    await criarRepoLocal(armazem).salvarLancamento(gasto({ valor: 4590 }))
    let lidos: Lancamento[] = []
    criarRepoLocal(armazem).ouvirLancamentos('2026-11', (itens) => (lidos = itens))
    expect(lidos).toHaveLength(1)
  })
})
