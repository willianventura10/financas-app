import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import type { Lancamento, Repositorio } from './tipos'

const COLECOES = ['lancamentos', 'meses', 'config', 'viagens', 'posicoes', 'operacoes', 'historico', 'listas']

/** Dados de um usuário ficam em users/{uid}/..., e a regra do banco só libera esse caminho ao próprio usuário. */
export function criarRepoFirestore(db: Firestore, uid: string): Repositorio {
  const colecao = (nome: string) => collection(db, 'users', uid, nome)
  const documento = (caminho: string) => doc(db, 'users', uid, ...caminho.split('/'))

  return {
    ouvirLancamentos(ano, aoMudar) {
      return onSnapshot(
        query(colecao('lancamentos'), where('mes', '>=', `${ano}-01`), where('mes', '<=', `${ano}-12`)),
        { includeMetadataChanges: true },
        (foto) =>
          aoMudar(
            foto.docs.map((d) => d.data() as Lancamento),
            { pendente: foto.metadata.hasPendingWrites, doCache: foto.metadata.fromCache },
          ),
      )
    },
    ouvirColecao<T>(nome: string, aoMudar: (docs: T[]) => void) {
      return onSnapshot(colecao(nome), (foto) => aoMudar(foto.docs.map((d) => ({ ...d.data(), id: d.id }) as T)))
    },
    gravar: (caminho, dados) => setDoc(documento(caminho), dados),
    excluir: (caminho) => deleteDoc(documento(caminho)),
    async importar(docs) {
      // Um lote do Firestore aceita até 500 gravações.
      for (let i = 0; i < docs.length; i += 400) {
        const lote = writeBatch(db)
        docs.slice(i, i + 400).forEach((d) => lote.set(documento(d.caminho), d.dados))
        await lote.commit()
      }
    },
    async lerTudo() {
      const fotos = await Promise.all(COLECOES.map((nome) => getDocs(colecao(nome))))
      return fotos.flatMap((foto, i) => foto.docs.map((d) => ({ caminho: `${COLECOES[i]}/${d.id}`, dados: d.data() })))
    },
  }
}
