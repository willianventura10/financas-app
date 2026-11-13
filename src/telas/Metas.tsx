import { useState } from 'react'
import { CampoNumero, CampoValor, Resultado } from '../componentes'
import type { Config, ParametrosInvest } from '../dados/tipos'
import { metaTotal } from '../lib/calculos'
import { CATEGORIAS } from '../lib/categorias'

const POUPANCA: [string, string][] = [
  ['reservaMensal', 'Reserva por mês'],
  ['viagemMensal', 'Viagem por mês'],
  ['anualMinimo', 'Mínimo no ano'],
  ['viagemAnual', 'Viagem no ano'],
  ['social', 'Social'],
  ['cartaoElis', 'Cartão Elis'],
  ['poupado', 'Poupado'],
  ['poupViagem', 'Poup. viagem'],
]

const VALORES_INVEST: [keyof ParametrosInvest, string][] = [
  ['metaReserva', 'Meta da reserva, vigente'],
  ['metaReservaFinal', 'Meta final da reserva'],
  ['metaCarro', 'Meta da caixa do carro'],
  ['metaApe', 'Meta do fundo do apê'],
  ['aporteMensal', 'Aporte mensal previsto'],
  ['tetoConvexo', 'Teto mensal para o convexo'],
  ['limiteFgc', 'Limite do FGC por instituição'],
]

const PERCENTUAIS: [keyof ParametrosInvest, string][] = [
  ['alvoConvexo', 'Alvo do lado convexo'],
  ['minConvexo', 'Faixa mínima do convexo'],
  ['maxConvexo', 'Faixa máxima do convexo'],
  ['alvoWrld', 'WRLD11 dentro do convexo'],
  ['tolerancia', 'Tolerância da proporção'],
]

/** As metas da aba Mensal e a aba Metas da planilha de investimentos, editáveis. */
export function Metas({ config, aoGravar }: { config: Config; aoGravar: (config: Config) => void }) {
  const [novaConta, setNovaConta] = useState('')
  const [token, setToken] = useState(config.brapiToken ?? '')
  const inv = config.investimentos
  const mudarInv = (parte: Partial<ParametrosInvest>) => inv && aoGravar({ ...config, investimentos: { ...inv, ...parte } })

  return (
    <>
      <section className="bloco sem-linha">
        <h2>Metas de gastos por mês</h2>
        <div className="grade">
          {CATEGORIAS.filter((c) => c.id !== 'viagens').map((c) => (
            <CampoValor
              key={c.id}
              rotulo={c.nome}
              valor={config.metas[c.id] ?? null}
              aoMudar={(v) => aoGravar({ ...config, metas: { ...config.metas, [c.id]: v ?? 0 } })}
            />
          ))}
        </div>
        <Resultado rotulo="Meta total do mês" valor={metaTotal(config)} forte />
        <p className="apoio">Viagens não tem meta mensal.</p>
        <div className="grade">
          <CampoValor
            rotulo="Renda prevista por mês"
            valor={config.rendaPrevistaMensal}
            aoMudar={(v) => aoGravar({ ...config, rendaPrevistaMensal: v ?? 0 })}
          />
        </div>
      </section>

      <section className="bloco">
        <h2>Metas de poupança</h2>
        <div className="grade">
          {POUPANCA.map(([chave, rotulo]) => (
            <CampoValor
              key={chave}
              rotulo={rotulo}
              valor={config.metasPoupanca?.[chave] ?? null}
              aoMudar={(v) => aoGravar({ ...config, metasPoupanca: { ...config.metasPoupanca, [chave]: v ?? 0 } })}
            />
          ))}
        </div>
      </section>

      <section className="bloco">
        <h2>Contas do mês</h2>
        <ul className="itens">
          {config.contas.map((c) => (
            <li key={c.nome}>
              <span>
                {c.nome}
                {c.meses && <small> só em janeiro</small>}
              </span>
              <button
                className="texto"
                onClick={() => aoGravar({ ...config, contas: config.contas.filter((x) => x.nome !== c.nome) })}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
        <form
          className="grade"
          onSubmit={(e) => {
            e.preventDefault()
            const nome = novaConta.trim()
            if (!nome || config.contas.some((c) => c.nome === nome)) return
            aoGravar({ ...config, contas: [...config.contas, { nome }] })
            setNovaConta('')
          }}
        >
          <label className="campo">
            Nova conta
            <input value={novaConta} onChange={(e) => setNovaConta(e.target.value)} />
          </label>
          <button className="secundario">Adicionar conta</button>
        </form>
      </section>

      {inv && (
        <section className="bloco">
          <h2>Investimentos</h2>
          <div className="grade">
            {VALORES_INVEST.map(([chave, rotulo]) => (
              <CampoValor
                key={chave}
                rotulo={rotulo}
                valor={inv[chave] as number}
                aoMudar={(v) => mudarInv({ [chave]: v ?? 0 })}
              />
            ))}
            {PERCENTUAIS.map(([chave, rotulo]) => (
              <CampoNumero
                key={chave}
                rotulo={rotulo}
                valor={inv[chave] as number}
                aoMudar={(v) => mudarInv({ [chave]: v })}
                percentual
              />
            ))}
            <CampoNumero
              rotulo="Alerta de vencimento, em dias"
              valor={inv.alertaVencimentoDias}
              aoMudar={(v) => mudarInv({ alertaVencimentoDias: Math.round(v) })}
            />
            <label className="campo">
              Compra do carro
              <input type="date" value={inv.dataCarro ?? ''} onChange={(e) => mudarInv({ dataCarro: e.target.value || null })} />
            </label>
            <label className="campo">
              Compra do apê
              <input type="date" value={inv.dataApe ?? ''} onChange={(e) => mudarInv({ dataApe: e.target.value || null })} />
            </label>
          </div>
          <p className="apoio">GOLD11 fica com o que sobra de WRLD11 dentro do convexo.</p>
        </section>
      )}

      <section className="bloco">
        <h2>Cotações</h2>
        <p>Com o token gratuito da brapi, o app busca o preço dos ativos em Investimentos, na aba Compras.</p>
        <label className="campo">
          Token da brapi
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onBlur={() => token.trim() !== (config.brapiToken ?? '') && aoGravar({ ...config, brapiToken: token.trim() })}
            autoComplete="off"
          />
        </label>
      </section>
    </>
  )
}
