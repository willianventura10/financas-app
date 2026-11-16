import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { firebase } from './firebase'

/** De quem são os dados que esta conta abre, e se ela só pode consultar. */
export interface Acesso {
  dono: string
  consulta: boolean
}

// Quem tem um documento em leitores/{uid} abre os dados de outra conta, só para leitura.
// O documento é criado à mão no painel do Firebase, e as regras do banco é que garantem a trava.
const chave = (uid: string) => `financas-acesso-${uid}`

function guardado(uid: string): string | null {
  try {
    return localStorage.getItem(chave(uid))
  } catch {
    return null
  }
}

/** undefined enquanto ainda não sabemos qual é o acesso. */
export function useAcesso(uid: string | undefined): Acesso | undefined {
  const [dono, setDono] = useState<string | null>(() => (uid ? guardado(uid) : null))

  useEffect(() => {
    if (!firebase || !uid) return
    let vivo = true
    setDono(guardado(uid))
    const definir = (novo: string, guardar: boolean) => {
      if (!vivo) return
      setDono(novo)
      if (!guardar) return
      try {
        localStorage.setItem(chave(uid), novo)
      } catch {
        // Sem armazenamento, a consulta é refeita a cada abertura.
      }
    }
    // Sem resposta (sem internet no primeiro uso), segue como dono da própria conta; a resposta, quando vier, corrige.
    const espera = setTimeout(() => !guardado(uid) && definir(uid, false), navigator.onLine ? 4000 : 0)
    getDoc(doc(firebase.db, 'leitores', uid))
      .then((d) => {
        const outro = d.data()?.dono
        definir(typeof outro === 'string' && outro ? outro : uid, true)
      })
      .catch(() => !guardado(uid) && definir(uid, false))
      .finally(() => clearTimeout(espera))
    return () => {
      vivo = false
      clearTimeout(espera)
    }
  }, [uid])

  if (!firebase) return { dono: '', consulta: new URLSearchParams(location.search).has('consulta') }
  if (!uid || !dono) return undefined
  return { dono, consulta: dono !== uid }
}
