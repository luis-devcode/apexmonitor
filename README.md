# ApexMonitor

Monitor de odds em tempo real e gestão financeira de apostas, num só produto.

## Módulos

- Dashboard ao vivo
- Monitor Futebol e Basquete
- Surebets 1X2 e resultado simples × dupla chance
- Duplo Green com pagamento antecipado
- Extração de Freebet
- Clones de Casas
- Super Odds
- Gestão: planilha, banca, parceiros (CPF), contas e freebets

## Executar

1. Copie `integrations/nucleo/.env.example` para `integrations/nucleo/.env` e preencha as credenciais do núcleo.
2. Instale as dependências com `npm install`.
3. Rode app e núcleo juntos:

```bash
npm run dev:all
```

O app abre em `http://localhost:3000`. O núcleo mantém uma conexão SSE com a fonte, aplica os deltas e atualiza o arquivo local uma vez por segundo. O navegador recebe avisos de atualização por SSE e recarrega somente os cálculos da tela aberta.

## Comandos úteis

```bash
npm run dev          # somente Next.js
npm run collector    # somente núcleo
npm run collector:test
npm run lint
npm run build
```

## Produção

O núcleo e o servidor Next.js precisam compartilhar o diretório de dados do núcleo. Em produção, execute ambos no mesmo servidor/volume persistente ou substitua o arquivo por armazenamento compartilhado. Não use uma função serverless isolada para o núcleo SSE.

**As rotas de dados (`/api/markets`, `/api/live`, `/api/match`, `/api/freebet`, `/api/clones`) exigem sessão válida e assinatura em dia.** As odds são o produto — nunca deixe essas rotas abertas.
