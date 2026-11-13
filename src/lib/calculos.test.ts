import { describe, expect, it } from 'vitest'
import { criarRepoLocal } from '../dados/repoLocal'
import type { Cartao, Config, Lancamento, MesDoc } from '../dados/tipos'
import { CARTAO_VAZIO, contasPendentes, mesVazio, resumoDoAno, resumoDoCartao, resumoDoMes, saldoDaCaixinha } from './calculos'
import type { CategoriaId } from './categorias'
import { lerCentavos, numero } from './dinheiro'

// Números inventados: os dados reais nunca entram no repositório.
let n = 0
const gasto = (mes: string, categoria: CategoriaId, valor: number, extra: Partial<Lancamento> = {}): Lancamento => ({
  id: `t${++n}`,
  mes,
  data: `${mes}-10`,
  valor,
  categoria,
  criadoEm: n,
  editadoEm: n,
  ...extra,
})

const config: Config = {
  metas: { aluguel: 300000, alim: 200000, transporte: 30000 },
  rendaPrevistaMensal: 1500000,
  contas: [{ nome: 'Aluguel' }, { nome: 'Internet' }, { nome: 'Anuidade', meses: [1] }],
}

describe('resumo do mês', () => {
  const itens = [gasto('2026-03', 'aluguel', 310000), gasto('2026-03', 'alim', 150000), gasto('2026-03', 'viagens', 80000)]

  it('segue as linhas TOTAL, DIFERENÇA e FLUTUÁVEL LÍQUIDO da planilha', () => {
    const mes: MesDoc = { ...mesVazio('2026-03'), cvm: 1700000, extra: 50000 }
    const r = resumoDoMes(itens, mes, config)
    expect(r.total).toBe(540000) // inclui Viagens
    expect(r.metaTotal).toBe(530000)
    expect(r.diferenca).toBe(-10000) // meta − total
    expect(r.flutuavel).toBe(1750000 - 540000) // CVM + Extra − total
  })

  it('deixa o flutuável sem valor enquanto a renda não foi informada', () => {
    expect(resumoDoMes(itens, mesVazio('2026-03'), config).flutuavel).toBeNull()
  })
})

describe('cartão', () => {
  const itens = [gasto('2026-01', 'viagens', 141840), gasto('2026-01', 'transporte', 38030), gasto('2026-01', 'alim', 99999)]
  const cartao: Cartao = {
    fatura: 559600,
    semanas: [32101, 76251, 49846, 75624, 0],
    saudeAcademia: 15990,
    ajusteUber: -18800,
    ajusteAbater: 9000,
    ajusteFatura: 0,
  }

  it('abate da fatura o que já está em outras categorias', () => {
    const r = resumoDoCartao(itens, cartao)
    expect(r.uber).toBe(141840 + 38030 - 18800) // Viagens + Transporte + ajuste
    expect(r.abater).toBe(r.uber + 15990 + 233822 + 9000)
    expect(r.atualizado).toBe(559600 - r.abater)
  })

  it('aplica o ajuste da fatura e fica sem valor quando a fatura não foi informada', () => {
    const comAjuste = resumoDoCartao(itens, { ...cartao, ajusteFatura: -51552 })
    expect(comAjuste.atualizado).toBe(559600 - 51552 - comAjuste.abater)
    expect(resumoDoCartao(itens, CARTAO_VAZIO).atualizado).toBeNull()
  })
})

describe('resumo do ano', () => {
  const itens = [
    gasto('2026-01', 'alim', 210000),
    gasto('2026-02', 'alim', 190000),
    gasto('2026-03', 'alim', 100000), // mês em andamento
    gasto('2026-01', 'viagens', 500000),
    gasto('2026-02', 'aluguel', 300000),
    gasto('2025-12', 'alim', 999999), // outro ano
  ]
  const meses: MesDoc[] = [
    { ...mesVazio('2026-01'), cvm: 1700000, social: 30000, poupado: 500000, poupViagem: 50000 },
    { ...mesVazio('2026-02'), cvm: 1700000, extra: 100000, cartaoElis: 120000, poupado: 600000 },
    { ...mesVazio('2025-12'), cvm: 1, poupado: 1 },
  ]
  const doAno = itens.filter((l) => l.mes.startsWith('2026'))
  const r = resumoDoAno('2026', doAno, meses, config, '2026-03')

  it('calcula a média só com os meses fechados', () => {
    const alim = r.linhas.find((l) => l.id === 'alim')!
    expect(r.mesesFechados).toBe(2)
    expect(alim.acumulado).toBe(500000) // o acumulado inclui o mês em andamento
    expect(alim.media).toBe(200000) // (210.000 + 190.000) ÷ 2
    expect(alim.previsto).toBe(2400000) // meta × 12
  })

  it('deixa Viagens fora do acumulado, como a planilha', () => {
    expect(r.linhas.some((l) => l.id === 'viagens')).toBe(false)
    expect(r.viagens.acumulado).toBe(500000)
    expect(r.totais.acumulado).toBe(800000)
    expect(r.totais.porMes.slice(0, 3)).toEqual([210000, 490000, 100000])
  })

  it('soma renda e poupado só do ano pedido', () => {
    expect(r.renda).toBe(3500000)
    expect(r.rendaPrevista).toBe(18000000)
    expect(r.poupado).toBe(1100000)
  })

  it('soma as destinações de cada mês', () => {
    const de = (id: string) => r.destinacoes.find((d) => d.id === id)!
    expect(r.destinacoes.map((d) => d.id)).toEqual(['social', 'cartaoElis', 'poupado', 'poupViagem'])
    expect(de('poupado').porMes.slice(0, 3)).toEqual([500000, 600000, 0])
    expect(r.destinado.porMes.slice(0, 3)).toEqual([580000, 720000, 0]) // social + cartão Elis + poupado + poup. viagem
    expect(r.destinado.acumulado).toBe(1300000)
  })

  it('fica sem média em janeiro e usa os 12 meses em ano já encerrado', () => {
    expect(resumoDoAno('2026', doAno, meses, config, '2026-01').totais.media).toBeNull()
    expect(resumoDoAno('2026', doAno, meses, config, '2027-02').mesesFechados).toBe(12)
  })
})

describe('saldo da caixinha de viagem', () => {
  it('soma o Poup. viagem de todos os anos e tira só as viagens marcadas', () => {
    const viagem = (mes: string, gasto: number, abater?: boolean) => ({ id: mes + gasto, nome: 'x', mes, gasto, itens: [], obs: '', abater })
    const meses = [{ ...mesVazio('2026-12'), poupViagem: 100000 }, { ...mesVazio('2027-01'), poupViagem: 50000 }]
    expect(saldoDaCaixinha(meses, [viagem('2026-12', 30000, true), viagem('2026-12', 99999), viagem('2027-01', 80000, true)])).toBe(40000)
  })
})

describe('contas do mês', () => {
  it('lista as contas sem OK e só cobra a anual no mês dela', () => {
    const fevereiro: MesDoc = { ...mesVazio('2026-02'), contas: { Aluguel: true } }
    expect(contasPendentes(fevereiro, config)).toEqual(['Internet'])
    expect(contasPendentes(mesVazio('2026-01'), config)).toEqual(['Aluguel', 'Internet', 'Anuidade'])
  })
})

describe('valores negativos e formatação', () => {
  it('só aceita negativo quando o campo permite', () => {
    expect(lerCentavos('-340,00', true)).toBe(-34000)
    expect(lerCentavos('−287,36', true)).toBe(-28736)
    expect(lerCentavos('-340,00')).toBeNull()
  })
  it('formata sem o símbolo', () => {
    expect(numero(123456)).toBe('1.234,56')
    expect(numero(-34000)).toBe('-340,00')
  })
})

describe('repositório local', () => {
  const memoria = () => {
    let texto: string | null = null
    return { ler: () => texto, gravar: (t: string) => void (texto = t) }
  }

  it('entrega só os lançamentos do ano pedido e avisa a cada mudança', async () => {
    const repo = criarRepoLocal(memoria())
    const vistos: number[] = []
    const parar = repo.ouvirLancamentos('2026', (itens) => vistos.push(itens.length))
    const a = gasto('2026-11', 'alim', 1000)
    await repo.gravar(`lancamentos/${a.id}`, a)
    await repo.gravar('lancamentos/antigo', gasto('2025-12', 'alim', 1000))
    await repo.excluir(`lancamentos/${a.id}`)
    parar()
    await repo.gravar('lancamentos/depois', gasto('2026-11', 'alim', 1000))
    expect(vistos).toEqual([0, 1, 1, 0])
  })

  it('substitui o documento de mesmo caminho, na gravação e na importação', async () => {
    const repo = criarRepoLocal(memoria())
    const a = gasto('2026-11', 'alim', 500)
    await repo.gravar(`lancamentos/${a.id}`, a)
    await repo.importar([
      { caminho: `lancamentos/${a.id}`, dados: { ...a, valor: 700 } },
      { caminho: 'meses/2026-11', dados: mesVazio('2026-11') },
    ])
    await repo.importar([{ caminho: 'meses/2026-11', dados: { ...mesVazio('2026-11'), poupado: 9 } }])
    let lidos: Lancamento[] = []
    let meses: MesDoc[] = []
    repo.ouvirLancamentos('2026', (itens) => (lidos = itens))
    repo.ouvirColecao<MesDoc>('meses', (docs) => (meses = docs))
    expect(lidos.map((l) => l.valor)).toEqual([700])
    expect(meses.map((m) => m.poupado)).toEqual([9])
  })

  it('preserva os dados depois de reabrir', async () => {
    const armazem = memoria()
    await criarRepoLocal(armazem).gravar('viagens/v1', { id: 'v1' })
    let lidos: unknown[] = []
    criarRepoLocal(armazem).ouvirColecao('viagens', (docs) => (lidos = docs))
    expect(lidos).toHaveLength(1)
  })
})
