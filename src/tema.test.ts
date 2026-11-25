import { describe, expect, it } from 'vitest'
import { TEMAS, temaPorId } from './tema'

describe('cor do app', () => {
  it('o neutro é o padrão e id desconhecido cai nele', () => {
    expect(TEMAS[0].id).toBe('neutro')
    expect(temaPorId(null).id).toBe('neutro')
    expect(temaPorId('xyz').id).toBe('neutro')
  })

  it('acha cada tema pelo id, sem repetir id nem cor', () => {
    for (const t of TEMAS) expect(temaPorId(t.id)).toBe(t)
    expect(new Set(TEMAS.map((t) => t.id)).size).toBe(TEMAS.length)
    expect(new Set(TEMAS.map((t) => t.cor)).size).toBe(TEMAS.length)
  })
})
