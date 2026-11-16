import { useState } from 'react'
import { lerCentavos, paraCampo, porcento, reais } from './lib/dinheiro'
import { tomDoStatus } from './lib/investimentos'

interface CampoValorProps {
  rotulo: string
  valor: number | null
  /** Chamado ao sair do campo, só quando o valor mudou. Campo vazio vira null. */
  aoMudar: (valor: number | null) => void
  negativo?: boolean
  ajuda?: string
  /** Nome lido pelo leitor de tela quando o campo não tem rótulo visível. */
  nome?: string
}

/** Campo de dinheiro que grava ao sair, para fazer uma gravação por alteração. */
export function CampoValor({ rotulo, valor, aoMudar, negativo, ajuda, nome }: CampoValorProps) {
  const salvo = valor === null ? '' : paraCampo(valor)
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
        aria-label={nome}
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

/** Aviso escrito, com a cor como reforço. */
export function Status({ texto }: { texto: string }) {
  return texto ? <span className={`status status-${tomDoStatus(texto)}`}>{texto}</span> : null
}

interface CampoNumeroProps {
  rotulo: string
  valor: number
  aoMudar: (valor: number) => void
  /** Mostra e lê o valor como percentual: 0,12 aparece como 12. */
  percentual?: boolean
}

/** Campo numérico simples (percentuais, dias, quantidades) que grava ao sair. */
export function CampoNumero({ rotulo, valor, aoMudar, percentual }: CampoNumeroProps) {
  const fator = percentual ? 100 : 1
  const salvo = String(Math.round(valor * fator * 10000) / 10000).replace('.', ',')
  const [digitado, setDigitado] = useState<string | null>(null)
  function sair() {
    if (digitado === null) return
    const novo = Number(digitado.replace(',', '.')) / fator
    if (digitado.trim() !== '' && Number.isFinite(novo) && novo !== valor) aoMudar(novo)
    setDigitado(null)
  }
  return (
    <label className="campo">
      {rotulo}
      {percentual ? ' (%)' : ''}
      <input
        className="num"
        inputMode="decimal"
        value={digitado ?? salvo}
        onFocus={() => setDigitado(salvo)}
        onChange={(e) => setDigitado(e.target.value)}
        onBlur={sair}
      />
    </label>
  )
}

/** Barra única dividida em partes, com a legenda trazendo valor e participação de cada uma. */
export function Composicao({ partes }: { partes: { nome: string; valor: number }[] }) {
  const total = partes.reduce((s, p) => s + Math.max(0, p.valor), 0)
  if (total === 0) return null
  return (
    <div className="composicao">
      <div className="pilha" role="img" aria-label="Composição por caixa">
        {partes.map((p, i) =>
          p.valor > 0 ? (
            <span
              key={p.nome}
              className={`cor-${i + 1}`}
              style={{ flexGrow: p.valor }}
              title={`${p.nome}: ${reais(p.valor)} (${porcento(p.valor / total)})`}
            />
          ) : null,
        )}
      </div>
      <ul>
        {partes.map((p, i) => (
          <li key={p.nome}>
            <span className={`marca-cor cor-${i + 1}`} />
            <span>{p.nome}</span>
            <span className="num">
              {reais(p.valor)} <small>{porcento(p.valor / total)}</small>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
