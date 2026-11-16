import { describe, expect, it } from 'vitest'
import { lembretes } from './lembretes'

const fechado = (mes: string) => ({ mes, convexo: 0, aAlocar: 0, aporte: 0, saidas: 0 })

describe('lembretes do Início', () => {
  it('cobra o backup quando não há registro ou passou de 30 dias', () => {
    expect(lembretes('2026-11-16', [], null)).toEqual(['Sem registro de backup neste aparelho. Baixe um em Mais › Dados.'])
    expect(lembretes('2026-11-16', [], '2026-10-17')).toEqual([]) // 30 dias: ainda não
    expect(lembretes('2026-11-16', [], '2026-10-16')).toEqual([
      'O último backup deste aparelho foi há 31 dias. Baixe outro em Mais › Dados.',
    ])
  })

  it('cobra o fechamento do mês anterior, mas não de antes do primeiro mês fechado', () => {
    expect(lembretes('2026-11-16', [fechado('2026-11')], '2026-11-10')).toEqual([]) // outubro é anterior ao histórico
    expect(lembretes('2027-01-10', [fechado('2026-11')], '2027-01-05')).toEqual([
      'Falta fechar dezembro de 2026 em Investimentos › Histórico.',
    ])
    expect(lembretes('2027-01-10', [fechado('2026-11'), fechado('2026-12')], '2027-01-05')).toEqual([])
  })
})
