# Finanças

Aplicativo web instalável para gastos e investimentos da casa. Substitui as planilhas
`TABELA_FINANCEIRO` e `Controle_Investimentos`.

- **App:** React + TypeScript, instalável (PWA), funciona sem internet.
- **Dados e login:** Firebase (Firestore com cache offline e Authentication por e-mail e senha).
- **Publicação:** a cada alteração na `main`, o GitHub Actions roda os testes, gera o build e publica no Firebase Hosting.

## Comandos

```
npm ci          # instala as dependências
npm test        # testes das regras de cálculo
npm run dev     # roda no computador, em http://localhost:5173
npm run build   # gera a versão publicada em dist/
```

## Configuração

1. `src/firebase-config.ts` recebe o bloco `firebaseConfig` do console do Firebase. Enquanto
   estiver `null`, o app roda em modo local, sem login e sem sincronização.
2. `.firebaserc` aponta o projeto. Sem esse arquivo, o GitHub Actions testa mas não publica.
3. O segredo `FIREBASE_SERVICE_ACCOUNT`, no GitHub, guarda a chave de publicação.
4. `firestore.rules` é colado no console do Firestore, na aba Regras.

## Onde ficam os dados

Cada usuário lê e grava apenas `users/{uid}/...`. Valores são guardados em centavos inteiros.
Planilhas e arquivos de carga inicial nunca entram no repositório (ver `.gitignore`).

## Etapas

1. Base: login, sincronização, modo offline, lançar gasto. **(atual)**
2. Dados e Gastos: carga inicial, metas, mês, ano, contas, cartão, viagens.
3. Investimentos: painel, posições, compras e vendas, histórico, sugestão de aporte, cotações.
4. Mais: metas e parâmetros, listas, fechar o mês, exportar e restaurar backup.
