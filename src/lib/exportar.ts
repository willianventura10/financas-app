import type { DocParaImportar, Historico, Lancamento, MesDoc, Operacao, Posicao } from '../dados/tipos'
import { nomeDaCategoria } from './categorias'
import { hoje } from './datas'

type Celula = { value: string | number | null; type?: typeof Number; format?: string; fontWeight?: 'bold' }

const texto = (v: string | null | undefined): Celula => ({ value: v ?? '' })
const reais = (centavos: number | null | undefined): Celula =>
  centavos === null || centavos === undefined ? { value: null } : { value: centavos / 100, type: Number, format: '#,##0.00' }
const cabecalho = (...nomes: string[]): Celula[] => nomes.map((n) => ({ value: n, fontWeight: 'bold' }))

function daColecao<T>(docs: DocParaImportar[], nome: string): T[] {
  return docs.filter((d) => d.caminho.startsWith(nome + '/')).map((d) => d.dados as T)
}

/** Monta as abas do Excel a partir de todos os documentos do usuário. */
export function montarPlanilhas(docs: DocParaImportar[]): { sheet: string; data: Celula[][] }[] {
  const lancamentos = daColecao<Lancamento>(docs, 'lancamentos').sort(
    (a, b) => a.mes.localeCompare(b.mes) || a.categoria.localeCompare(b.categoria),
  )
  const meses = daColecao<MesDoc>(docs, 'meses').sort((a, b) => a.mes.localeCompare(b.mes))
  const posicoes = daColecao<Posicao>(docs, 'posicoes').sort((a, b) => a.ordem - b.ordem)
  const operacoes = daColecao<Operacao>(docs, 'operacoes').sort((a, b) => a.data.localeCompare(b.data))
  const historico = daColecao<Historico>(docs, 'historico').sort((a, b) => a.mes.localeCompare(b.mes))

  return [
    {
      sheet: 'Lançamentos',
      data: [
        cabecalho('Mês', 'Data', 'Categoria', 'Comi na rua', 'Valor', 'Observação'),
        ...lancamentos.map((l) => [
          texto(l.mes),
          texto(l.data),
          texto(nomeDaCategoria(l.categoria)),
          texto(l.comiNaRua ? 'Sim' : ''),
          reais(l.valor),
          texto(l.obs),
        ]),
      ],
    },
    {
      sheet: 'Meses',
      data: [
        cabecalho('Mês', 'CVM', 'Extra', 'Social', 'Cartão Elis', 'Poupado', 'Poup. viagem', 'Caixinha de viagem', 'Fatura do cartão'),
        ...meses.map((m) => [
          texto(m.mes),
          reais(m.cvm),
          reais(m.extra),
          reais(m.social),
          reais(m.cartaoElis),
          reais(m.poupado),
          reais(m.poupViagem),
          reais(m.caixinhaViagem),
          reais(m.cartao?.fatura),
        ]),
      ],
    },
    {
      sheet: 'Posições',
      data: [
        cabecalho('Investimento', 'Instituição', 'Classe', 'Caixa', 'Valor atual', 'Rentabilidade', 'Vencimento', 'Liquidez', 'FGC', 'Observação'),
        ...posicoes.map((p) => [
          texto(p.nome),
          texto(p.instituicao),
          texto(p.classe),
          texto(p.caixa),
          reais(p.valor),
          texto(p.rentabilidade),
          texto(p.vencimento),
          texto(p.liquidez),
          texto(p.fgc ? 'Sim' : 'Não'),
          texto(p.obs),
        ]),
      ],
    },
    {
      sheet: 'Compras e vendas',
      data: [
        cabecalho('Data', 'Ativo', 'Operação', 'Quantidade', 'Total', 'Observação'),
        ...operacoes.map((o) => [
          texto(o.data),
          texto(o.ativo),
          texto(o.tipo === 'compra' ? 'Compra' : 'Venda'),
          { value: o.quantidade, type: Number } as Celula,
          reais(o.total),
          texto(o.obs),
        ]),
      ],
    },
    {
      sheet: 'Histórico',
      data: [
        cabecalho('Mês', 'Reserva', 'Carro', 'Apê', 'Convexo', 'A alocar', 'Aporte', 'Saídas'),
        ...historico.map((h) => [
          texto(h.mes),
          reais(h.reserva),
          reais(h.carro),
          reais(h.ape),
          reais(h.convexo),
          reais(h.aAlocar),
          reais(h.aporte),
          reais(h.saidas),
        ]),
      ],
    },
  ]
}

function baixar(blob: Blob, nome: string) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = nome
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000)
}

export async function exportarExcel(docs: DocParaImportar[]) {
  // Carregada só na hora de exportar, para não pesar na abertura do app.
  const { default: escrever } = await import('write-excel-file/universal')
  const blob = await escrever(montarPlanilhas(docs) as never).toBlob()
  baixar(blob, `financas-${hoje()}.xlsx`)
}

/** Backup completo, no mesmo formato que a tela de importação aceita. */
export function exportarBackup(docs: DocParaImportar[]) {
  const carga = { versao: 1, origem: `backup de ${hoje()}`, docs }
  baixar(new Blob([JSON.stringify(carga)], { type: 'application/json' }), `financas-backup-${hoje()}.json`)
}
