import type { Lancamento, Repositorio } from './tipos'

interface Armazem {
  ler(): string | null
  gravar(texto: string): void
}

const CHAVE = 'financas-lancamentos'

const armazemDoNavegador: Armazem = {
  ler: () => localStorage.getItem(CHAVE),
  gravar: (texto) => localStorage.setItem(CHAVE, texto),
}

/**
 * Guarda os dados só neste aparelho. Usado nos testes e enquanto o Firebase
 * não está configurado; não sincroniza com nada.
 */
export function criarRepoLocal(armazem: Armazem = armazemDoNavegador): Repositorio {
  let itens: Lancamento[] = JSON.parse(armazem.ler() ?? '[]')
  const ouvintes = new Set<() => void>()

  function mudou() {
    armazem.gravar(JSON.stringify(itens))
    ouvintes.forEach((avisar) => avisar())
  }

  return {
    ouvirLancamentos(mes, aoMudar) {
      const avisar = () =>
        aoMudar(
          itens.filter((l) => l.mes === mes),
          { pendente: false, doCache: false },
        )
      ouvintes.add(avisar)
      avisar()
      return () => ouvintes.delete(avisar)
    },
    async salvarLancamento(l) {
      itens = [...itens.filter((x) => x.id !== l.id), l]
      mudou()
    },
    async excluirLancamento(id) {
      itens = itens.filter((x) => x.id !== id)
      mudou()
    },
  }
}
