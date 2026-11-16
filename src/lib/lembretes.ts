import type { Historico } from '../dados/tipos'
import { nomeDoMes, somarMes } from './datas'

const CHAVE_BACKUP = 'financas-ultimo-backup'
const DIAS_SEM_BACKUP = 30

/** O dia ("2026-11-16") do último backup baixado neste aparelho, ou null. */
export function lerUltimoBackup(): string | null {
  try {
    return localStorage.getItem(CHAVE_BACKUP)
  } catch {
    return null
  }
}

export function marcarBackup(dia: string): void {
  try {
    localStorage.setItem(CHAVE_BACKUP, dia)
  } catch {
    // Sem armazenamento, o lembrete só não some.
  }
}

const dias = (de: string, ate: string) => Math.round((Date.parse(ate) - Date.parse(de)) / 86400000)

/** Os avisos do Início que não dependem dos gastos: backup atrasado e mês anterior sem fechamento. */
export function lembretes(hoje: string, historico: Historico[], ultimoBackup: string | null): string[] {
  const avisos: string[] = []
  if (!ultimoBackup) avisos.push('Sem registro de backup neste aparelho. Baixe um em Mais › Dados.')
  else if (dias(ultimoBackup, hoje) > DIAS_SEM_BACKUP)
    avisos.push(`O último backup deste aparelho foi há ${dias(ultimoBackup, hoje)} dias. Baixe outro em Mais › Dados.`)

  // Só cobra o fechamento de meses posteriores ao primeiro já fechado.
  const anterior = somarMes(hoje.slice(0, 7), -1)
  const fechados = historico.map((h) => h.mes)
  if (fechados.some((m) => m < anterior) && !fechados.includes(anterior))
    avisos.push(`Falta fechar ${nomeDoMes(anterior)} em Investimentos › Histórico.`)
  return avisos
}
