import { Resultado, Status } from '../componentes'
import type { Config, Operacao, Posicao, TipoIR } from '../dados/tipos'
import { dataBr, nomeDoMes } from '../lib/datas'
import { reais } from '../lib/dinheiro'
import { ISENCAO_ACOES, TIPOS_IR, apuracaoMensal, carteiraEm, proventosDoAno, tipoDoAtivo, type MesApurado } from '../lib/ir'

interface Props {
  operacoes: Operacao[]
  posicoes: Posicao[]
  config: Config
  /** O ano do mês selecionado no topo. */
  ano: string
  hoje: string
  aoGravar: (caminho: string, dados: object) => void
}

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

function situacao(m: MesApurado, pagos: string[], hoje: string): string {
  if (m.pagar) {
    if (pagos.includes(m.mes)) return 'DARF pago'
    return hoje > m.vencimento ? `DARF vencido em ${dataBr(m.vencimento)}` : `DARF até ${dataBr(m.vencimento)}`
  }
  if (m.imposto > 0) return 'Abaixo de R$ 10,00: soma no mês seguinte'
  if (m.prejuizoComum > 0 || m.prejuizoFii > 0) return 'Prejuízo a compensar'
  return m.lucroIsento > 0 ? 'Isento' : 'Sem imposto'
}

export function Imposto({ operacoes, posicoes, config, ano, hoje, aoGravar }: Props) {
  const tipos = config.tiposIR ?? {}
  const pagos = config.darfsPagos ?? []
  const apuracao = apuracaoMensal(operacoes, tipos)
  const doAno = apuracao.filter((m) => m.mes.startsWith(ano))
  const ultimo = apuracao.filter((m) => m.mes <= `${ano}-12`).at(-1)
  const anterior = String(Number(ano) - 1)
  const antes = carteiraEm(operacoes, `${anterior}-12-31`)
  const agora = carteiraEm(operacoes, `${ano}-12-31`)
  const ativos = [...new Set([...antes, ...agora].map((c) => c.ativo))].sort()
  const custo = (lista: typeof antes, ativo: string) => lista.find((c) => c.ativo === ativo)
  // Posição com o nome de um ativo negociado em bolsa já aparece acima, pelo custo.
  const negociados = new Set(operacoes.map((o) => o.ativo))
  const rendaFixa = posicoes.filter((p) => !negociados.has(p.nome.trim().toUpperCase()) && p.valor > 0)
  const proventos = proventosDoAno(operacoes, ano)
  const instituicoes = [...new Set(posicoes.filter((p) => p.valor > 0).map((p) => p.instituicao))].sort()

  const trocarTipo = (ativo: string, tipo: TipoIR) =>
    aoGravar('config/geral', { ...config, tiposIR: { ...tipos, [ativo]: tipo } })
  const marcarPago = (mes: string, pago: boolean) =>
    aoGravar('config/geral', { ...config, darfsPagos: pago ? [...pagos, mes] : pagos.filter((m) => m !== mes) })

  return (
    <>
      <section className="bloco sem-linha">
        <h2>Vendas e DARF de {ano}</h2>
        <p className="apoio">
          Estimativa para conferência, não o cálculo oficial. Considera só operações comuns (sem day trade) e não desconta o
          IR retido na fonte de 0,005%.
        </p>
        {doAno.length === 0 ? (
          <p>Nenhuma venda registrada em {ano}.</p>
        ) : (
          <ul className="razao">
            {doAno.map((m) => (
              <li key={m.mes}>
                <div className="linha-razao">
                  <strong>{maiuscula(nomeDoMes(m.mes))}</strong>
                  <span className="num">{m.imposto > 0 ? reais(m.imposto) : 'R$ 0,00'}</span>
                </div>
                <Status texto={situacao(m, pagos, hoje)} />
                {m.vendas.map((v) => (
                  <p className="apoio" key={v.operacao.id}>
                    Venda de {v.operacao.quantidade} {v.operacao.ativo} ({TIPOS_IR[tipoDoAtivo(v.operacao.ativo, tipos)]}) por{' '}
                    {reais(v.operacao.total)}: {v.resultado >= 0 ? 'lucro' : 'prejuízo'} de {reais(Math.abs(v.resultado))}
                    {v.semCompra && '. Falta registrar a compra: o custo está incompleto'}
                  </p>
                ))}
                {m.vendasAcoes > 0 && (
                  <p className="apoio">
                    Vendas de ações no mês: {reais(m.vendasAcoes)}
                    {m.vendasAcoes <= ISENCAO_ACOES ? ', dentro do limite de R$ 20.000,00' : ', acima do limite de R$ 20.000,00'}.
                  </p>
                )}
                {m.pagar && (
                  <button className="texto" onClick={() => marcarPago(m.mes, !pagos.includes(m.mes))}>
                    {pagos.includes(m.mes) ? 'Desmarcar pagamento' : 'Marcar DARF como pago'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {ultimo && (ultimo.prejuizoComum > 0 || ultimo.prejuizoFii > 0) && (
          <>
            <Resultado rotulo="Prejuízo a compensar, ações, ETF e BDR" valor={ultimo.prejuizoComum} />
            {ultimo.prejuizoFii > 0 && <Resultado rotulo="Prejuízo a compensar, FII" valor={ultimo.prejuizoFii} />}
          </>
        )}
        <p className="apoio">
          O DARF usa o código 6015 e vence no último dia útil do mês seguinte à venda. Confira feriados antes de pagar.
        </p>
      </section>

      <section className="bloco">
        <h2>Bens e direitos em 31/12/{ano}</h2>
        <p className="apoio">
          Pelo custo de aquisição, nunca pelo valor de mercado. A declaração pede os dois anos: 31/12/{anterior} e 31/12/{ano}.
        </p>
        {ativos.length === 0 ? (
          <p>Nenhum ativo de bolsa em carteira nessas datas.</p>
        ) : (
          <ul className="razao">
            {ativos.map((ativo) => {
              const a = custo(antes, ativo)
              const b = custo(agora, ativo)
              return (
                <li key={ativo}>
                  <div className="linha-razao">
                    <strong>{ativo}</strong>
                    <label className="campo tipo-ir">
                      <span className="so-leitor">Tipo de {ativo} para o IR</span>
                      <select value={tipoDoAtivo(ativo, tipos)} onChange={(e) => trocarTipo(ativo, e.target.value as TipoIR)}>
                        {Object.entries(TIPOS_IR).map(([id, nome]) => (
                          <option key={id} value={id}>
                            {nome}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <Resultado rotulo={`31/12/${anterior}`} valor={a?.custo ?? 0} />
                  <Resultado rotulo={`31/12/${ano}`} valor={b?.custo ?? 0} />
                  <p className="apoio">
                    {b
                      ? `Discriminação: ${b.quantidade} ${b.quantidade === 1 ? 'cota' : 'cotas'} de ${ativo}, custo médio de ${reais(Math.round(b.custo / b.quantidade))} por cota.`
                      : `Vendido até 31/12/${ano}.`}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
        {rendaFixa.length > 0 && (
          <>
            <h3>Renda fixa e contas</h3>
            <p className="apoio">
              Use o saldo em 31/12 do informe de rendimentos de cada banco. O valor abaixo é o saldo atual, só para conferir.
            </p>
            <ul className="razao renda-fixa">
              {rendaFixa.map((p) => (
                <li key={p.id} className="linha-razao">
                  <span>
                    {p.nome}
                    <small>{p.instituicao}</small>
                  </span>
                  <span className="num">{reais(p.valor)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="bloco">
        <h2>Proventos de {ano}</h2>
        {proventos.length === 0 ? (
          <p>Nenhum dividendo ou JCP registrado em {ano}. Registre em Compras, escolhendo Dividendo ou JCP.</p>
        ) : (
          <>
            <ul className="razao">
              {proventos.map((p) => (
                <li key={p.ativo}>
                  <strong>{p.ativo}</strong>
                  {p.dividendos > 0 && <Resultado rotulo="Dividendos, rendimentos isentos" valor={p.dividendos} />}
                  {p.jcp > 0 && <Resultado rotulo="JCP, tributação exclusiva (valor líquido)" valor={p.jcp} />}
                </li>
              ))}
            </ul>
            <p className="apoio">Confira com o informe de rendimentos da corretora, que traz o CNPJ de cada empresa.</p>
          </>
        )}
      </section>

      <section className="bloco">
        <h2>Documentos para juntar</h2>
        <ul className="passos">
          <li>Informe de rendimentos do empregador.</li>
          {instituicoes.map((i) => (
            <li key={i}>Informe de rendimentos de {i}.</li>
          ))}
          <li>Informe da corretora e notas de corretagem das compras e vendas.</li>
          <li>DARFs pagos no ano.</li>
          <li>Os informes e os bens dos dependentes incluídos na declaração.</li>
        </ul>
        <p className="apoio">
          Na declaração simplificada, despesas com saúde e educação não reduzem o imposto. O app não substitui os informes
          oficiais nem um contador.
        </p>
      </section>
    </>
  )
}
