// Cor de destaque do app. A escolha vale só para este aparelho, como o olho de ocultar valores.
// Todas as cores foram conferidas contra o fundo escuro (#161615) e aguentam texto escuro por cima.
export interface Tema {
  id: string
  nome: string
  cor: string
  claro: string
}

export const TEMAS: Tema[] = [
  { id: 'neutro', nome: 'Neutro', cor: '#f2f1ec', claro: 'rgb(242 241 236 / 0.12)' },
  { id: 'azul', nome: 'Azul', cor: '#5b9cf5', claro: 'rgb(91 156 245 / 0.15)' },
  { id: 'esmeralda', nome: 'Esmeralda', cor: '#1fc99b', claro: 'rgb(31 201 155 / 0.15)' },
  { id: 'roxo', nome: 'Roxo', cor: '#b08cf5', claro: 'rgb(176 140 245 / 0.15)' },
  { id: 'dourado', nome: 'Dourado', cor: '#f2c230', claro: 'rgb(242 194 48 / 0.13)' },
]

const CHAVE = 'financas-tema'

/** Id desconhecido ou ausente volta ao neutro, que é o padrão. */
export function temaPorId(id: string | null | undefined): Tema {
  return TEMAS.find((t) => t.id === id) ?? TEMAS[0]
}

export function lerTema(): Tema {
  try {
    return temaPorId(localStorage.getItem(CHAVE))
  } catch {
    return TEMAS[0]
  }
}

export function aplicarTema(t: Tema) {
  const estilo = document.documentElement.style
  estilo.setProperty('--destaque', t.cor)
  estilo.setProperty('--destaque-claro', t.claro)
}

export function salvarTema(t: Tema) {
  try {
    localStorage.setItem(CHAVE, t.id)
  } catch {
    // Sem armazenamento, a cor vale só até fechar o app.
  }
  aplicarTema(t)
}
