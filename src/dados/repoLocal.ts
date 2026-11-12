import type { Lancamento, Repositorio } from './tipos'

interface Armazem {
  ler(): string | null
  gravar(texto: string): void
}

const CHAVE = 'financas-dados'

const armazemDoNavegador: Armazem = {
  ler: () => localStorage.getItem(CHAVE),
  gravar: (texto) => localStorage.setItem(CHAVE, texto),
}

/**
 * Guarda os dados só neste aparelho. Usado nos testes e no modo local;
 * não sincroniza com nada.
 */
export function criarRepoLocal(armazem: Armazem = armazemDoNavegador): Repositorio {
  // caminho ("colecao/id") -> documento
  const docs: Record<string, object> = JSON.parse(armazem.ler() ?? '{}')
  const ouvintes = new Set<() => void>()

  function mudou() {
    armazem.gravar(JSON.stringify(docs))
    ouvintes.forEach((avisar) => avisar())
  }

  function daColecao<T>(nome: string): T[] {
    return Object.keys(docs)
      .filter((caminho) => caminho.startsWith(nome + '/'))
      .map((caminho) => docs[caminho] as T)
  }

  function ouvir(avisar: () => void) {
    ouvintes.add(avisar)
    avisar()
    return () => void ouvintes.delete(avisar)
  }

  return {
    ouvirLancamentos: (ano, aoMudar) =>
      ouvir(() =>
        aoMudar(
          daColecao<Lancamento>('lancamentos').filter((l) => l.mes.startsWith(ano)),
          { pendente: false, doCache: false },
        ),
      ),
    ouvirColecao: (nome, aoMudar) => ouvir(() => aoMudar(daColecao(nome))),
    async gravar(caminho, dados) {
      docs[caminho] = dados
      mudou()
    },
    async excluir(caminho) {
      delete docs[caminho]
      mudou()
    },
    async importar(novos) {
      novos.forEach((d) => (docs[d.caminho] = d.dados))
      mudou()
    },
  }
}
