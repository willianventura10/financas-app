// Todo valor é guardado em centavos inteiros, para as somas não acumularem erro.

/**
 * "45,90" -> 4590. Aceita "1.234,56", "45.9" e "R$ 12". Devolve null se não for um valor.
 * Com "negativo", aceita também "-340,00".
 */
export function lerCentavos(texto: string, negativo = false): number | null {
  let t = texto.replace(/[R$\s]/g, '').replace('−', '-')
  const sinal = negativo && t.startsWith('-') ? -1 : 1
  if (sinal === -1) t = t.slice(1)
  if (!/^\d[\d.,]*$/.test(t)) return null
  if (t.includes(',')) {
    t = t.replace(/\./g, '').replace(',', '.')
  } else if (/\.\d{3}$/.test(t)) {
    t = t.replace(/\./g, '') // ponto de milhar: "1.234"
  }
  const n = Number(t)
  return Number.isFinite(n) ? sinal * Math.round(n * 100) : null
}

const formato = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const semSimbolo = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 4590 -> "R$ 45,90" */
export function reais(centavos: number): string {
  return formato.format(centavos / 100)
}

/** 123456 -> "1.234,56", para campos de digitação e tabelas. */
export function numero(centavos: number): string {
  return semSimbolo.format(centavos / 100)
}

/** 0,0793 -> "7,9%" */
export function porcento(fracao: number): string {
  return (fracao * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}
