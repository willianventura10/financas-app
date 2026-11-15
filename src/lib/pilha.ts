// Desfazer e refazer: guarda, para cada alteração, como o documento estava antes e depois.

export interface Passo {
  caminho: string
  /** null quando o documento não existia. */
  antes: object | null
  /** null quando o documento foi excluído. */
  depois: object | null
}

/** Uma alteração feita pelo usuário; "Aplicar aos saldos", por exemplo, grava várias posições num passo só. */
export type Acao = Passo[]

export interface Pilha {
  feitas: Acao[]
  desfeitas: Acao[]
}

export const PILHA_VAZIA: Pilha = { feitas: [], desfeitas: [] }
export const LIMITE = 10

/** Registra uma gravação. Com "juntar", ela entra na última ação em vez de abrir outra. */
export function registrar(p: Pilha, passo: Passo, juntar: boolean): Pilha {
  const ultima = juntar ? p.feitas[p.feitas.length - 1] : undefined
  if (!ultima) return { feitas: [...p.feitas, [passo]].slice(-LIMITE), desfeitas: [] }
  // O mesmo documento gravado duas vezes na mesma ação: vale o primeiro "antes" e o último "depois".
  const repetido = ultima.find((x) => x.caminho === passo.caminho)
  const junta = repetido
    ? ultima.map((x) => (x === repetido ? { ...x, depois: passo.depois } : x))
    : [...ultima, passo]
  return { feitas: [...p.feitas.slice(0, -1), junta], desfeitas: [] }
}

/** Tira a última ação feita. Devolve o que gravar para voltar atrás. */
export function desfazer(p: Pilha): { pilha: Pilha; acao: Acao | null } {
  const acao = p.feitas[p.feitas.length - 1]
  if (!acao) return { pilha: p, acao: null }
  return { pilha: { feitas: p.feitas.slice(0, -1), desfeitas: [...p.desfeitas, acao] }, acao }
}

export function refazer(p: Pilha): { pilha: Pilha; acao: Acao | null } {
  const acao = p.desfeitas[p.desfeitas.length - 1]
  if (!acao) return { pilha: p, acao: null }
  return { pilha: { feitas: [...p.feitas, acao], desfeitas: p.desfeitas.slice(0, -1) }, acao }
}

const NOMES: Record<string, [string, string, string, string]> = {
  lancamentos: ['gasto', 'incluído', 'alterado', 'excluído'],
  meses: ['mês', 'incluído', 'alterado', 'excluído'],
  config: ['metas', 'incluídas', 'alteradas', 'excluídas'],
  viagens: ['viagem', 'incluída', 'alterada', 'excluída'],
  posicoes: ['posição', 'incluída', 'alterada', 'excluída'],
  operacoes: ['compra ou venda', 'incluída', 'alterada', 'excluída'],
  historico: ['fechamento do mês', 'incluído', 'alterado', 'excluído'],
  listas: ['lista', 'incluída', 'alterada', 'excluída'],
}

/** "gasto excluído", "viagem alterada", "3 alterações". */
export function descrever(acao: Acao): string {
  if (acao.length > 1) return `${acao.length} alterações`
  const { caminho, antes, depois } = acao[0]
  const [nome, incluido, alterado, excluido] = NOMES[caminho.split('/')[0]] ?? ['registro', 'incluído', 'alterado', 'excluído']
  return `${nome} ${antes === null ? incluido : depois === null ? excluido : alterado}`
}
