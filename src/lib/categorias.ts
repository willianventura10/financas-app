// As 12 categorias da aba Mensal, na ordem da planilha.
export const CATEGORIAS = [
  { id: 'aluguel', nome: 'Aluguel' },
  { id: 'alim', nome: 'Alimentação' },
  { id: 'gas', nome: 'Gás' },
  { id: 'energia', nome: 'Energia' },
  { id: 'internet', nome: 'Internet' },
  { id: 'celular', nome: 'Celular' },
  { id: 'saude', nome: 'Saúde' },
  { id: 'educ', nome: 'Educação e academia' },
  { id: 'cartao', nome: 'Cartão' },
  { id: 'outros', nome: 'Outros' },
  { id: 'viagens', nome: 'Viagens' },
  { id: 'transporte', nome: 'Transporte' },
] as const

export type CategoriaId = (typeof CATEGORIAS)[number]['id']

export function nomeDaCategoria(id: string): string {
  return CATEGORIAS.find((c) => c.id === id)?.nome ?? id
}
