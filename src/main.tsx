import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import './estilos.css'
import { App } from './App'
import { aplicarTema, lerTema } from './tema'

registerSW({ immediate: true })
aplicarTema(lerTema()) // antes de desenhar, para a tela não piscar na cor padrão

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
