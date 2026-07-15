# Deploy do ApexMonitor

Guia para colocar o ApexMonitor no ar num **VPS** (servidor sempre-ligado). Um
VPS é necessário — não um host serverless (Vercel/Netlify/Lovable) — porque o
**coletor** precisa rodar 24h e dividir o disco com o app.

Arquitetura: **um VPS** rodando (1) Postgres, (2) o app Next.js, (3) o coletor.
App e coletor compartilham a pasta de dados do coletor.

---

## Pré-requisitos (você contrata)

- **VPS** com Ubuntu 22.04+ — ex.: Hetzner CX22 (~€4/mês) ou Contabo. 2 vCPU / 4 GB.
- **Domínio** — ex.: `apexmonitor.com.br` (registro.br, ~R$40/ano).
- **Repositório privado no GitHub** com este código (é de onde o servidor baixa).

---

## Passo 1 — Preparar o servidor

```bash
# como root no VPS
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs
apt install -y postgresql caddy git
```

## Passo 2 — Banco Postgres

```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE apexmonitor;
CREATE USER apex WITH ENCRYPTED PASSWORD 'ESCOLHA_UMA_SENHA_FORTE';
GRANT ALL PRIVILEGES ON DATABASE apexmonitor TO apex;
\q
```

## Passo 3 — Baixar o código e configurar segredos

```bash
cd /opt
git clone https://github.com/SEU_USUARIO/apexmonitor.git
cd apexmonitor
npm install
cp .env.example .env
nano .env
```

Preencha o `.env` (veja `.env.example`):
- `DATABASE_URL="postgresql://apex:SENHA@localhost:5432/apexmonitor?schema=public"`
- `APP_SECRET_KEY` → gere com `openssl rand -base64 48`
- `ADMIN_SETUP_TOKEN` → gere com `openssl rand -hex 16`
- `GEMINI_API_KEY` → a sua chave

E o `.env` do coletor:
```bash
cp integrations/monitorodds/.env.example integrations/monitorodds/.env
nano integrations/monitorodds/.env   # MO_EMAIL, MO_PASS
```

## Passo 4 — Migrar o Prisma de SQLite → Postgres

> Esta é a única mudança de código do deploy. Não foi feita no dev porque não há
> Postgres local pra testar; aqui, contra o banco real, ela é testada na hora.

1. Em `prisma/schema.prisma`, troque o provider:
   ```prisma
   datasource db {
     provider = "postgresql"   // era "sqlite"
   }
   ```
2. Em `src/lib/prisma.ts`, troque o adapter better-sqlite3 pelo de Postgres:
   ```bash
   npm install @prisma/adapter-pg pg
   npm uninstall @prisma/adapter-better-sqlite3
   ```
   ```ts
   import { PrismaPg } from "@prisma/adapter-pg";
   const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
   ```
3. Gere o client e crie as tabelas no Postgres:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

## Passo 5 — Build

```bash
npm run build
```

## Passo 6 — Rodar app e coletor como serviços (sempre-ligados)

Crie `/etc/systemd/system/apexmonitor.service`:
```ini
[Unit]
Description=ApexMonitor (app)
After=network.target postgresql.service
[Service]
WorkingDirectory=/opt/apexmonitor
ExecStart=/usr/bin/npm run start
Restart=always
EnvironmentFile=/opt/apexmonitor/.env
[Install]
WantedBy=multi-user.target
```

Crie `/etc/systemd/system/apexmonitor-coletor.service`:
```ini
[Unit]
Description=ApexMonitor (coletor)
After=network.target
[Service]
WorkingDirectory=/opt/apexmonitor
ExecStart=/usr/bin/npm run collector
Restart=always
[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now apexmonitor apexmonitor-coletor
```

## Passo 7 — HTTPS e domínio (Caddy)

`/etc/caddy/Caddyfile`:
```
apexmonitor.com.br {
    reverse_proxy localhost:3000
}
```
```bash
systemctl reload caddy
```
Aponte o DNS do domínio (registro A) para o IP do VPS. O Caddy emite o certificado
HTTPS sozinho.

## Passo 8 — Criar seu administrador

Abra `https://apexmonitor.com.br/login`. Como o banco está vazio, aparece o
"primeiro acesso". Preencha o **token de instalação** = o `ADMIN_SETUP_TOKEN` do
`.env`. Só você tem esse token — é o que impede um estranho de virar dono.

---

## Pós-lançamento

- **Backup diário do Postgres** (cron com `pg_dump`).
- **Nunca** exponha o repositório publicamente (a pasta `integrations/monitorodds`
  revela a fonte dos dados).
- **Troque as senhas compartilhadas** do MonitorOdds.
- **Antes de virar público:** renomear a pasta `integrations/monitorodds` para um
  nome neutro (ficou de fora do dev pra não quebrar o coletor rodando; é um passo
  de última hora, com o serviço parado).

## Pendências de negócio (não são código)

- **Licença comercial do feed:** acerte por escrito com o dono do MonitorOdds o
  direito de revender o dado por assinatura, antes de cobrar do primeiro cliente.
