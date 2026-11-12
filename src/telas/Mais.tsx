import { firebase, sairELimpar } from '../firebase'
import { useInstalar } from '../instalar'

export function Mais({ email }: { email: string | null }) {
  const instalar = useInstalar()

  return (
    <section className="mais">
      <h2>Conta</h2>
      <p>{email ?? 'Modo local, sem login.'}</p>

      {instalar && (
        <>
          <h2>Instalação</h2>
          <p>Instale para abrir pelo ícone, em tela cheia, e usar sem internet.</p>
          <button className="primario" onClick={instalar}>
            Instalar o app
          </button>
        </>
      )}

      {firebase && (
        <>
          <h2>Este aparelho</h2>
          <p>Sair apaga a cópia dos dados guardada aqui. Nada é apagado da sua conta.</p>
          <button className="perigo" onClick={() => void sairELimpar()}>
            Sair e limpar os dados deste aparelho
          </button>
        </>
      )}

      <p className="apoio">Versão {__VERSAO__}</p>
    </section>
  )
}
