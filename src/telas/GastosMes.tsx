import { CampoValor, Resultado } from '../componentes'
import type { Cartao, Config, Lancamento, MesDoc } from '../dados/tipos'
import { CARTAO_VAZIO, resumoDoCartao, resumoDoMes, semanasDoMes } from '../lib/calculos'
import { nomeDoMes, somarMes } from '../lib/datas'
import { numero } from '../lib/dinheiro'

interface Props {
  itens: Lancamento[]
  mesDoc: MesDoc
  config: Config
  aoGravar: (mes: MesDoc) => void
  aoLancarCartao: (valor: number) => void
}

/** Renda e destinações, contas pagas e conciliação do cartão: as linhas 35 a 67 da aba Mensal. */
export function GastosMes({ itens, mesDoc, config, aoGravar, aoLancarCartao }: Props) {
  const resumo = resumoDoMes(itens, mesDoc, config)
  const cartao = mesDoc.cartao ?? CARTAO_VAZIO
  const fatura = resumoDoCartao(itens, cartao, mesDoc.mes)
  const numeroDoMes = Number(mesDoc.mes.slice(5, 7))
  const contas = config.contas.filter((c) => !c.meses || c.meses.includes(numeroDoMes))

  const mudar = (parte: Partial<MesDoc>) => aoGravar({ ...mesDoc, ...parte })
  const mudarCartao = (parte: Partial<Cartao>) => mudar({ cartao: { ...cartao, ...parte } })
  const campo = (rotulo: string, chave: 'extra' | 'social' | 'cartaoElis' | 'poupado' | 'poupViagem') => (
    <CampoValor rotulo={rotulo} valor={mesDoc[chave]} aoMudar={(v) => mudar({ [chave]: v ?? 0 })} />
  )

  return (
    <>
      <section className="bloco">
        <h2>Renda e destinações</h2>
        <div className="grade">
          <CampoValor rotulo="CVM" valor={mesDoc.cvm} aoMudar={(v) => mudar({ cvm: v })} />
          {campo('Extra', 'extra')}
          {campo('Social', 'social')}
          {campo('Cartão Elis', 'cartaoElis')}
          {campo('Poupado', 'poupado')}
          {campo('Poup. viagem', 'poupViagem')}
        </div>
        <Resultado rotulo="Gasto no mês" valor={resumo.total} />
        <Resultado rotulo="Flutuável líquido" valor={resumo.flutuavel} forte />
      </section>

      <section className="bloco">
        <h2>Contas do mês</h2>
        <ul className="contas">
          {contas.map((c) => (
            <li key={c.nome}>
              <label>
                <input
                  type="checkbox"
                  checked={!!mesDoc.contas[c.nome]}
                  onChange={(e) => mudar({ contas: { ...mesDoc.contas, [c.nome]: e.target.checked } })}
                />
                {c.nome}
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="bloco">
        <h2>Cartão</h2>
        <div className="grade">
          <CampoValor rotulo="Fatura" valor={cartao.fatura} aoMudar={(v) => mudarCartao({ fatura: v })} />
          <CampoValor
            rotulo="Saúde, academia e celular"
            valor={cartao.saudeAcademia}
            aoMudar={(v) => mudarCartao({ saudeAcademia: v ?? 0 })}
          />
        </div>
        <table className="tabela semanas">
          <thead>
            <tr>
              <th>Alimentação no cartão</th>
              <th>Lançado</th>
              <th>Ajuste</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {semanasDoMes(mesDoc.mes).map((s, i) => (
              <tr key={i}>
                <td>
                  Semana {i + 1} <small>{s.de > s.ate ? 'sem dias' : `dias ${s.de} a ${s.ate}`}</small>
                </td>
                <td className="num">{numero(fatura.lancado[i])}</td>
                <td>
                  <CampoValor
                    rotulo=""
                    nome={`Ajuste da semana ${i + 1}`}
                    valor={cartao.semanas[i]}
                    aoMudar={(v) => mudarCartao({ semanas: cartao.semanas.map((a, j) => (j === i ? (v ?? 0) : a)) })}
                    negativo
                  />
                </td>
                <td className="num">{numero(fatura.lancado[i] + cartao.semanas[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="apoio">
          Lançado é a Alimentação com data naquela semana, sem o que foi marcado como pago fora do cartão.
        </p>
        <details>
          <summary>Ajustes manuais</summary>
          <div className="grade">
            <CampoValor
              rotulo="Em uber, viagens e saídas"
              valor={cartao.ajusteUber}
              aoMudar={(v) => mudarCartao({ ajusteUber: v ?? 0 })}
              negativo
            />
            <CampoValor
              rotulo="No total a abater"
              valor={cartao.ajusteAbater}
              aoMudar={(v) => mudarCartao({ ajusteAbater: v ?? 0 })}
              negativo
            />
            <CampoValor
              rotulo="Na fatura"
              valor={cartao.ajusteFatura}
              aoMudar={(v) => mudarCartao({ ajusteFatura: v ?? 0 })}
              negativo
            />
          </div>
        </details>
        <Resultado rotulo="Uber, viagens e saídas" valor={fatura.uber} />
        <Resultado rotulo="Abater deste mês" valor={fatura.abater} />
        <Resultado rotulo="Cartão atualizado" valor={fatura.atualizado} forte />
        {fatura.atualizado !== null && (
          <button className="secundario" onClick={() => aoLancarCartao(fatura.atualizado!)}>
            Lançar em Cartão de {nomeDoMes(somarMes(mesDoc.mes, 1))}
          </button>
        )}
      </section>

      {mesDoc.notas && mesDoc.notas.length > 0 && (
        <section className="bloco">
          <h2>Notas da planilha</h2>
          <ul className="notas">
            {mesDoc.notas.map((n, i) => (
              <li key={i}>
                <strong>{n.onde}:</strong> {n.texto}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
