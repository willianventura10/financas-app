/** Data local de hoje como "AAAA-MM-DD". */
export function hoje(agora = new Date()): string {
  const m = String(agora.getMonth() + 1).padStart(2, '0')
  const d = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${m}-${d}`
}

/** "2026-11-11" -> "2026-11" */
export function mesDe(data: string): string {
  return data.slice(0, 7)
}

/** Soma meses a "AAAA-MM": somarMes("2026-12", 1) -> "2027-01". */
export function somarMes(mes: string, quantos: number): string {
  const [a, m] = mes.split('-').map(Number)
  const total = a * 12 + (m - 1) + quantos
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

const NOMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "2026-11" -> "novembro de 2026" */
export function nomeDoMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number)
  return `${NOMES[m - 1]} de ${a}`
}

/** "2026-11-05" -> "05/11" */
export function diaMes(data: string): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}`
}
