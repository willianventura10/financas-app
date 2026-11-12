import { useEffect, useState } from 'react'

// O Chrome avisa quando o app pode ser instalado; guardamos o aviso para oferecer o botão em "Mais".
interface AvisoDeInstalacao extends Event {
  prompt(): Promise<void>
}

let aviso: AvisoDeInstalacao | null = null
const ouvintes = new Set<() => void>()

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  aviso = e as AvisoDeInstalacao
  ouvintes.forEach((f) => f())
})
window.addEventListener('appinstalled', () => {
  aviso = null
  ouvintes.forEach((f) => f())
})

/** Devolve a função que abre a instalação, ou null se o navegador não ofereceu. */
export function useInstalar(): (() => void) | null {
  const [, redesenhar] = useState(0)
  useEffect(() => {
    const f = () => redesenhar((n) => n + 1)
    ouvintes.add(f)
    return () => void ouvintes.delete(f)
  }, [])
  return aviso ? () => void aviso?.prompt() : null
}
