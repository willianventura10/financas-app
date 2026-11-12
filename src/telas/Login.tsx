import { useState, type FormEvent } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { firebase } from '../firebase'

export function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setEntrando(true)
    try {
      await signInWithEmailAndPassword(firebase!.auth, email.trim(), senha)
    } catch (falha) {
      const codigo = (falha as { code?: string }).code ?? ''
      setErro(
        codigo === 'auth/network-request-failed'
          ? 'Sem conexão. O primeiro acesso neste aparelho precisa de internet.'
          : codigo === 'auth/too-many-requests'
            ? 'Muitas tentativas. Espere alguns minutos e tente de novo.'
            : 'E-mail ou senha incorretos.',
      )
      setEntrando(false)
    }
  }

  return (
    <form className="login" onSubmit={entrar}>
      <h1>Finanças</h1>
      <label>
        E-mail
        <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Senha
        <input
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
      </label>
      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
      <button className="primario" disabled={entrando}>
        {entrando ? 'Entrando…' : 'Entrar'}
      </button>
      <p className="nota">O app guarda uma cópia dos dados neste aparelho. Entre só em aparelhos seus.</p>
    </form>
  )
}
