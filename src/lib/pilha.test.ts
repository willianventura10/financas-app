import { describe, expect, it } from 'vitest'
import { LIMITE, PILHA_VAZIA, descrever, desfazer, refazer, registrar, type Passo } from './pilha'

const passo = (caminho: string, antes: object | null, depois: object | null): Passo => ({ caminho, antes, depois })

describe('desfazer e refazer', () => {
  it('desfaz na ordem inversa e refaz o que foi desfeito', () => {
    let p = registrar(PILHA_VAZIA, passo('lancamentos/a', null, { valor: 1 }), false)
    p = registrar(p, passo('viagens/b', { gasto: 1 }, { gasto: 2 }), false)
    const d1 = desfazer(p)
    expect(d1.acao).toEqual([passo('viagens/b', { gasto: 1 }, { gasto: 2 })])
    const d2 = desfazer(d1.pilha)
    expect(d2.acao![0].caminho).toBe('lancamentos/a')
    expect(desfazer(d2.pilha).acao).toBeNull()
    const r = refazer(d2.pilha)
    expect(r.acao![0].caminho).toBe('lancamentos/a')
    expect(r.pilha.desfeitas).toHaveLength(1)
  })

  it('uma alteração nova apaga o que podia ser refeito', () => {
    let p = registrar(PILHA_VAZIA, passo('lancamentos/a', null, {}), false)
    p = desfazer(p).pilha
    p = registrar(p, passo('lancamentos/c', null, {}), false)
    expect(refazer(p).acao).toBeNull()
  })

  it(`guarda só as últimas ${LIMITE} alterações`, () => {
    let p = PILHA_VAZIA
    for (let i = 0; i < LIMITE + 3; i++) p = registrar(p, passo(`lancamentos/${i}`, null, {}), false)
    expect(p.feitas).toHaveLength(LIMITE)
    expect(p.feitas[0][0].caminho).toBe('lancamentos/3')
  })

  it('junta as gravações do mesmo lote, e as repetidas do mesmo documento', () => {
    let p = registrar(PILHA_VAZIA, passo('posicoes/a', { valor: 1 }, { valor: 2 }), false)
    p = registrar(p, passo('posicoes/b', { valor: 5 }, { valor: 6 }), true)
    p = registrar(p, passo('posicoes/a', { valor: 2 }, { valor: 3 }), true)
    expect(p.feitas).toEqual([[passo('posicoes/a', { valor: 1 }, { valor: 3 }), passo('posicoes/b', { valor: 5 }, { valor: 6 })]])
    expect(descrever(p.feitas[0])).toBe('2 alterações')
  })

  it('descreve a alteração pelo tipo do registro', () => {
    expect(descrever([passo('lancamentos/a', null, {})])).toBe('gasto incluído')
    expect(descrever([passo('viagens/a', {}, null)])).toBe('viagem excluída')
    expect(descrever([passo('config/geral', {}, {})])).toBe('metas alteradas')
  })
})
