import { useState } from 'react'
import { lerCentavos, numero, reais } from './lib/dinheiro'

interface CampoValorProps {
  rotulo: string
  valor: number | null
  /** Chamado ao sair do campo, só quando o valor mudou. Campo vazio vira null. */
  aoMudar: (valor: number | null) => void
  negativo?: boolean
  ajuda?: string
}

/** Campo de dinheiro que grava ao sair, para fazer uma gravação por alteração. */
export function CampoValor({ rotulo, valor, aoMudar, negativo, ajuda }: CampoValorProps) {
  const salvo = valor === null ? '' : numero(valor)
  const [digitado, setDigitado] = useState<string | null>(null)
  const [invalido, setInvalido] = useState(false)

  function sair() {
    if (digitado === null) return
    const vazio = digitado.trim() === ''
    const novo = vazio ? null : lerCentavos(digitado, negativo)
    setInvalido(!vazio && novo === null)
    if ((vazio || novo !== null) && novo !== valor) aoMudar(novo)
    setDigitado(null)
  }

  return (
    <label className="campo">
      {rotulo}
      <input
        className="num"
        inputMode={negativo ? 'text' : 'decimal'}
        placeholder="0,00"
        aria-invalid={invalido || undefined}
        value={digitado ?? salvo}
        onFocus={() => setDigitado(salvo)}
        onChange={(e) => setDigitado(e.target.value)}
        onBlur={sair}
      />
      {invalido && <small className="erro">Valor não reconhecido; o anterior foi mantido.</small>}
      {ajuda && !invalido && <small>{ajuda}</small>}
    </label>
  )
}

/** Linha "rótulo ... valor" de um resultado calculado. */
export function Resultado({ rotulo, valor, forte }: { rotulo: string; valor: number | null; forte?: boolean }) {
  return (
    <p className={forte ? 'resultado forte' : 'resultado'}>
      <span>{rotulo}</span>
      <span className="num">{valor === null ? 'sem valor' : reais(valor)}</span>
    </p>
  )
}

/** Barra de gasto contra a meta. Acima da meta, o aviso vem escrito, não só na cor. */
export function Medidor({ gasto, meta }: { gasto: number; meta: number }) {
  const acima = gasto > meta
  return (
    <>
      <div
        className={acima ? 'barra acima' : 'barra'}
        role="img"
        aria-label={`${reais(gasto)} de ${reais(meta)}`}
        title={`${reais(gasto)} de ${reais(meta)}`}
      >
        <span style={{ width: `${Math.min(gasto / meta, 1) * 100}%` }} />
      </div>
      <p className={acima ? 'apoio alerta' : 'apoio'}>
        {acima ? `Acima da meta em ${reais(gasto - meta)}` : `Meta de ${reais(meta)}, restam ${reais(meta - gasto)}`}
      </p>
    </>
  )
}
