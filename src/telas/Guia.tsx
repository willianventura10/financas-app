import { useState } from 'react'

interface Topico {
  titulo: string
  /** Cada item é um parágrafo; os que começam com "- " viram lista. */
  texto: string[]
}

interface Capitulo {
  nome: string
  topicos: Topico[]
}

const GUIA: Capitulo[] = [
  {
    nome: 'Começo',
    topicos: [
      {
        titulo: 'Como o app se organiza',
        texto: [
          'São quatro telas, mais o botão Lançar:',
          '- Início: o resumo do mês selecionado.',
          '- Gastos: os lançamentos, o fechamento do mês e a visão do ano.',
          '- Investimentos: painel, posições, compras e histórico.',
          '- Mais: viagens, metas, listas, dados, conta e este guia.',
          'O mês no topo vale para o app inteiro. Use as setas para trocar de mês; o ano das telas acompanha o mês escolhido.',
        ],
      },
      {
        titulo: 'Celular, computador e uso sem internet',
        texto: [
          'Os dados ficam na sua conta, então o que você lança num aparelho aparece no outro depois de entrar com o mesmo e-mail.',
          'Sem internet o app continua funcionando: o que você lançar fica guardado no aparelho e é enviado quando a conexão voltar.',
          'O aviso no canto superior mostra a situação:',
          '- Salvo: tudo enviado.',
          '- Salvando…: envio em andamento.',
          '- Sem conexão, envio pendente: há lançamentos esperando a internet. Não limpe os dados do navegador nem saia da conta antes de voltar a "Salvo".',
        ],
      },
      {
        titulo: 'Desfazer e refazer',
        texto: [
          'As duas setas no topo desfazem e refazem as últimas alterações, até 10. O app avisa o que foi desfeito ou refeito.',
          'Vale para gastos, campos do mês e do cartão, viagens, metas, listas, posições, compras e vendas e fechamentos.',
          '- A memória é só deste aparelho e se perde ao fechar o app.',
          '- Fazer uma alteração nova depois de desfazer apaga o que podia ser refeito.',
          '- Uma ação que grava vários registros de uma vez, como "Aplicar aos saldos", volta inteira num passo só.',
          '- Importar um backup não pode ser desfeito e zera a memória. Baixe um backup antes de importar.',
          '- Se o mesmo registro foi alterado em outro aparelho nesse meio-tempo, desfazer aqui sobrescreve a alteração de lá.',
        ],
      },
    ],
  },
  {
    nome: 'Gastos',
    topicos: [
      {
        titulo: 'Lançar, alterar e excluir um gasto',
        texto: [
          'Toque em Lançar, digite o valor, escolha a categoria e confira a data. A observação é opcional.',
          'O gasto entra no mês da data escolhida, mesmo que outro mês esteja selecionado no topo.',
          'Para alterar ou excluir, abra Gastos › Lançamentos e toque no gasto.',
          'Depois de excluir, aparece por alguns segundos a opção Desfazer.',
        ],
      },
      {
        titulo: '"Comi na rua" e "Abater da fatura"',
        texto: [
          '"Comi na rua" é Alimentação com uma marca: soma no total de Alimentação e também aparece separado.',
          'Todo gasto tem a caixinha "Abater da fatura". Marque quando o gasto foi pago no cartão: ele sai da fatura do mês, porque já está na categoria dele.',
          'Ela vem marcada em Alimentação, Comi na rua, Viagens e Transporte, e desmarcada nas outras categorias. Você pode mudar em qualquer lançamento.',
          'A marca só muda a conta do cartão, não o total do mês.',
        ],
      },
      {
        titulo: 'Renda e destinações do mês',
        texto: [
          'Em Gastos › Mês você informa CVM, Extra, Social, Cartão Elis, Poupado e Poup. viagem.',
          '- Flutuável líquido: CVM mais Extra, menos o gasto do mês.',
          '- Diferença para a meta: a meta do mês menos o gasto.',
          '- Poup. viagem: é o que alimenta o saldo da caixinha de viagem.',
        ],
      },
      {
        titulo: 'Contas do mês',
        texto: [
          'É a lista de conferência das contas fixas. Marque cada uma quando pagar.',
          'O Início avisa quais contas ainda estão sem OK. A lista de contas é editada em Mais › Metas.',
        ],
      },
      {
        titulo: 'Cartão: fatura, semanas e cartão atualizado',
        texto: [
          'Digite a Fatura. O que sai dela são os lançamentos marcados com "Abater da fatura".',
          'A tabela de Alimentação no cartão tem uma linha por semana do calendário, de domingo a sábado:',
          '- Lançado: soma automática da Alimentação daquela semana marcada para abater.',
          '- Ajuste: valor que você digita para corrigir, positivo ou negativo.',
          '- Total: lançado mais ajuste.',
          '"Demais lançamentos abatidos" soma os gastos marcados das outras categorias.',
          '"Ver o que foi abatido" lista todos os lançamentos marcados no mês. Toque num deles para abrir e desmarcar.',
          'Em "Ajustes manuais" ficam as correções no total a abater e na fatura.',
          'Até novembro de 2026 existe o campo "Saúde, academia e celular", digitado à mão. De dezembro em diante, marque "Abater da fatura" no próprio lançamento.',
          '"Abater deste mês" soma tudo isso. "Cartão atualizado" é a fatura menos o valor a abater: é o que sobra da fatura e ainda não está em nenhuma categoria.',
          'O botão "Lançar em Cartão" cria esse valor como gasto na categoria Cartão do mês seguinte.',
          'Nos gastos antigos, sem a marca gravada, vale a regra anterior: Viagens e Transporte abatem, e a Alimentação abate só se tiver dia. Gastos vindos da planilha não têm dia; nesses meses vale o que está no Ajuste.',
        ],
      },
      {
        titulo: 'Visão do ano e Mês a mês',
        texto: [
          'Gastos › Ano mostra o acumulado, a média e a comparação com a meta de cada categoria.',
          '- A média usa só os meses já fechados; o mês corrente não entra.',
          '- "Acumulado, sem Viagens" e a média deixam Viagens de fora.',
          'A tabela Mês a mês aparece só em tela larga (computador). A linha Total inclui Viagens. Em vermelho, os meses em que a categoria passou da meta.',
          'Logo abaixo ficam as Destinações: Social, Cartão Elis, Poupado e Poup. viagem, com o total destinado.',
        ],
      },
    ],
  },
  {
    nome: 'Viagens',
    topicos: [
      {
        titulo: 'Caixinha de viagem',
        texto: [
          'O saldo é todo o Poup. viagem informado nos meses, menos o que as viagens abateram. Ele não zera na virada do ano.',
          'Gastos lançados na categoria Viagens não mexem na caixinha: eles são despesa do mês e entram no Total.',
        ],
      },
      {
        titulo: 'Registrar e editar uma viagem',
        texto: [
          'Em Mais › Viagens, preencha destino, mês, gasto total e anotações. As anotações aceitam várias linhas e aparecem como você digitou.',
          '"Abater da caixinha" é quanto dessa viagem sai do saldo. Pode ser o gasto inteiro, uma parte ou nada (campo vazio).',
          'Use Editar para corrigir uma viagem. Ao excluir uma viagem, o valor abatido volta para o saldo.',
          'A lista mostra só as viagens do ano selecionado no topo. As de outros anos continuam guardadas.',
        ],
      },
    ],
  },
  {
    nome: 'Investimentos',
    topicos: [
      {
        titulo: 'Painel',
        texto: [
          'Mostra o patrimônio total, a composição e cada caixa comparada com a sua meta. As caixas são os seus objetivos, mais Convexo e A alocar.',
          '- Lado convexo: a fatia nos ativos de risco, com a faixa e a proporção entre os ativos definidas em Mais › Metas.',
          '- Base do convexo: o patrimônio sem os objetivos marcados como "Não conta para o convexo".',
          '- Exposição por instituição: quanto está em cada banco, comparado com o limite do FGC.',
          '- Pede atenção: vencimentos próximos e limites estourados.',
        ],
      },
      {
        titulo: 'Sugestão para o aporte do mês',
        texto: [
          'Digite o aporte novo e o preço dos ativos do convexo. O app distribui o valor nesta ordem: primeiro o lado convexo, depois cada objetivo até a meta, na ordem da lista de Mais › Metas. O último objetivo fica com o resto.',
          'Deixe o aporte vazio se o dinheiro já está em "A alocar".',
        ],
      },
      {
        titulo: 'Posições',
        texto: [
          'Cada posição é um investimento com caixa, instituição e valor atual. Atualize o valor direto na lista.',
          'Use Editar para alterar os demais dados e Excluir para remover a posição. Depois de excluir aparece a opção Desfazer; as setas do topo também desfazem.',
          'Excluir uma posição tira o valor do patrimônio, mas não apaga as compras e vendas nem os meses já fechados no Histórico.',
          'Posições com vencimento entram no alerta quando faltam menos dias que o definido em Mais › Metas.',
        ],
      },
      {
        titulo: 'Compras, vendas e cotações',
        texto: [
          'Registre cada compra ou venda em Investimentos › Compras. O resumo por ativo calcula a quantidade, o preço médio e a data em que a venda fica liberada pela regra dos 30 dias.',
          '"Atualizar cotações" busca os preços na brapi e precisa do token cadastrado em Mais › Metas. Se a busca falhar, o preço digitado continua valendo.',
          '"Aplicar aos saldos" leva a cotação para o valor das posições com o mesmo nome do ativo.',
        ],
      },
      {
        titulo: 'Fechar o mês',
        texto: [
          'Em Investimentos › Histórico, informe o aporte e as saídas do mês e toque em "Fechar o mês". O app guarda uma foto das caixas naquele momento.',
          'Se algo mudou, use "Refazer o fechamento". A evolução por caixa mostra os meses fechados.',
        ],
      },
    ],
  },
  {
    nome: 'Metas, listas e dados',
    topicos: [
      {
        titulo: 'Objetivos, ativos do convexo e opções das posições',
        texto: [
          'Em Mais › Metas, na parte de investimentos:',
          '- Objetivos: crie, exclua e reordene (até seis). Cada um tem meta, data prevista e a opção "Não conta para o convexo". O nome do objetivo é a caixa que você escolhe na posição.',
          '- Um objetivo com posições não pode ser excluído: mova as posições para outra caixa antes.',
          '- Ativos do lado convexo: a lista de ativos e o alvo de cada um, somando 100%. O app acha o ativo pela posição com o mesmo nome.',
          '- Opções das posições: as listas de instituições, classes e liquidez.',
          'Os meses já fechados no Histórico não mudam quando você altera os objetivos.',
        ],
      },
      {
        titulo: 'Metas',
        texto: [
          'Em Mais › Metas ficam as metas de gasto por categoria, a renda prevista, as metas de poupança, as contas do mês e os parâmetros dos investimentos.',
          'Mudar uma meta vale para todos os meses, inclusive os passados.',
        ],
      },
      {
        titulo: 'Listas',
        texto: ['Mais › Listas guarda as anotações que vieram da planilha: móveis, imóveis, salário, ar-condicionado, mudança e notas.'],
      },
      {
        titulo: 'Backup e exportação',
        texto: [
          'Em Mais › Dados:',
          '- Baixar backup: gera um arquivo com tudo, que pode ser importado de volta.',
          '- Exportar para Excel: gera uma planilha com lançamentos, meses, posições, compras e vendas e histórico.',
          'Não há backup automático. Baixe um backup pelo menos uma vez por mês e guarde fora do celular.',
        ],
      },
      {
        titulo: 'Conta e instalação',
        texto: [
          'Em Mais › Conta você vê o e-mail da conta, a versão do app e, quando o navegador permite, o botão para instalar o app.',
          '"Sair e limpar os dados deste aparelho" apaga só a cópia local. Nada é apagado da sua conta, mas confira antes se o aviso do topo está em "Salvo".',
          'Quando sair uma versão nova, feche e abra o app para atualizar.',
        ],
      },
    ],
  },
]

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function Guia() {
  const [busca, setBusca] = useState('')
  const termo = semAcento(busca.trim())
  const capitulos = GUIA.map((c) => ({
    ...c,
    topicos: c.topicos.filter((t) => semAcento(t.titulo + ' ' + t.texto.join(' ')).includes(termo)),
  })).filter((c) => c.topicos.length > 0)

  return (
    <div className="guia">
      <label className="campo">
        Procurar no guia
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Por exemplo: cartão" />
      </label>
      {capitulos.length === 0 && <p className="apoio">Nada encontrado. Tente outra palavra.</p>}
      {capitulos.map((c) => (
        <section className="bloco" key={c.nome}>
          <h2>{c.nome}</h2>
          {c.topicos.map((t) => (
            <details key={t.titulo} open={termo !== '' || undefined}>
              <summary>{t.titulo}</summary>
              {blocos(t.texto).map((b, i) =>
                typeof b === 'string' ? (
                  <p key={i}>{b}</p>
                ) : (
                  <ul key={i}>
                    {b.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ),
              )}
            </details>
          ))}
        </section>
      ))}
    </div>
  )
}

/** Junta os itens seguidos que começam com "- " numa lista. */
function blocos(texto: string[]): (string | string[])[] {
  const saida: (string | string[])[] = []
  for (const linha of texto) {
    const ultimo = saida[saida.length - 1]
    if (!linha.startsWith('- ')) saida.push(linha)
    else if (Array.isArray(ultimo)) ultimo.push(linha.slice(2))
    else saida.push([linha.slice(2)])
  }
  return saida
}
