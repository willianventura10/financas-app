// Todo valor é guardado em centavos inteiros, para as somas não acumularem erro.

/** "45,90" -> 4590. Aceita "1.234,56", "45.9" e "R$ 12". Devolve null se não for um valor. */
export function lerCentavos(texto: string): number | null {
  let t = texto.replace(/[R$\s]/g, '')
  if (!/^\d[\d.,]*$/.test(t)) return null
  if (t.includes(',')) {
    t = t.replace(/\./g, '').replace(',', '.')
  } else if (/\.\d{3}$/.test(t)) {
    t = t.replace(/\./g, '') // ponto de milhar: "1.234"
  }
  const n = Number(t)
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

const formato = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** 4590 -> "R$ 45,90" */
export function reais(centavos: number): string {
  return formato.format(centavos / 100)
}
