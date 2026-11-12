import { collection, deleteDoc, doc, onSnapshot, query, setDoc, where, type Firestore } from 'firebase/firestore'
import type { Lancamento, Repositorio } from './tipos'

/** Dados de um usuário ficam em users/{uid}/..., e a regra do banco só libera esse caminho ao próprio usuário. */
export function criarRepoFirestore(db: Firestore, uid: string): Repositorio {
  const lancamentos = collection(db, 'users', uid, 'lancamentos')

  return {
    ouvirLancamentos(mes, aoMudar) {
      return onSnapshot(
        query(lancamentos, where('mes', '==', mes)),
        { includeMetadataChanges: true },
        (foto) =>
          aoMudar(
            foto.docs.map((d) => d.data() as Lancamento),
            { pendente: foto.metadata.hasPendingWrites, doCache: foto.metadata.fromCache },
          ),
      )
    },
    salvarLancamento: (l) => setDoc(doc(lancamentos, l.id), l),
    excluirLancamento: (id) => deleteDoc(doc(lancamentos, id)),
  }
}
