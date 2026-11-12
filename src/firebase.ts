import { initializeApp } from 'firebase/app'
import { getAuth, signOut } from 'firebase/auth'
import {
  clearIndexedDbPersistence,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
} from 'firebase/firestore'
import { firebaseConfig } from './firebase-config'

function iniciar(config: NonNullable<typeof firebaseConfig>) {
  const app = initializeApp(config)
  // Cache persistente: o app lê e grava sem internet, e a biblioteca envia a fila quando a conexão volta.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  })
  return { auth: getAuth(app), db }
}

// VITE_MODO_LOCAL=1 gera uma versão sem login nem Firebase, usada para conferir as telas com dados locais.
export const firebase = firebaseConfig && !import.meta.env.VITE_MODO_LOCAL ? iniciar(firebaseConfig) : null

/** Encerra a sessão e apaga a cópia dos dados guardada neste aparelho. */
export async function sairELimpar() {
  if (!firebase) return
  await signOut(firebase.auth)
  await terminate(firebase.db)
  await clearIndexedDbPersistence(firebase.db)
  location.reload()
}
