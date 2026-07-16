# Deploy do ApexMonitor

Guia para colocar o ApexMonitor no ar num **VPS** (servidor sempre-ligado). Um
VPS é necessário — não um host serverless (Vercel/Netlify/Lovable) — porque o
**coletor** precisa rodar 24h e dividir o disco com o app.

Arquitetura: **um VPS** rodando (1) Postgres, (2) o app Next.js, (3) o coletor.
App e coletor compartilham a pasta de dados do coletor.

---

## Pré-requisitos (você contrata)

- **VPS** com Ubuntu 22.04+ — Hetzner **CX23** (2 vCPU / 4 GB / 40 GB), Falkenstein
  ou Nuremberg. ~€6/mês (com IPv4), preço fixo, cobrança por hora, sem contrato.
  Escolhido porque só cabia pagamento **mensal**: a Hostinger São Paulo custava
  R$80/mês recorrente contra ~R$39 aqui. Não pegue Ashburn — lá a linha CX não
  existe, só CPX a €19,49.
- **Cloudflare** (plano grátis) na frente — **não é opcional nesta arquitetura.**
  O servidor está na Alemanha: 200ms de São Paulo. A Cloudflare tem ponto em São
  Paulo e termina o handshake TCP+TLS lá (~10ms), que é o que custa 3 viagens.
  Sem ela, a primeira abertura passa de 1s; com ela, ~350ms.
- **Migração futura:** quando houver cliente pagante, mover pra um VPS em São Paulo
  (~10ms) é reproduzir este documento noutra máquina. Nada aqui prende a Hetzner.
- **Domínio** — `apexmonitor.com.br` ✅ já registrado (registro.br).
- **Repositório privado no GitHub** ✅ `luis-devcode/apexmonitor` (é de onde o servidor baixa).

---

## Passo 1 — Preparar o servidor

```bash
# como root no VPS
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs
apt install -y postgresql git
```

**Caddy** não está nos repositórios do Ubuntu — precisa do repositório oficial antes:
```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

**Firewall (painel da Hetzner, grátis).** Aplique **depois** de confirmar que o SSH
entra — regra errada aqui tranca o acesso e obriga a recriar o servidor. Bloqueia
na rede, antes de chegar na máquina, então nem gasta CPU. Entrada permitida só em:

| Porta | Para quê |
|---|---|
| 22 | SSH |
| 80 | Let's Encrypt (desafio do certificado) + redirect pra 443 |
| 443 | HTTPS |

Postgres (5432) **nunca** exposto — o app fala com ele por `localhost`.

**Swap.** O `npm run build` do Next pede ~2 GB; com o Postgres junto, os 4 GB ficam
sem margem. Com swap o build fica lento em vez de morrer por OOM:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab   # sobrevive ao reboot
```

## Passo 2 — Banco Postgres

```bash
sudo -u postgres psql
```
```sql
CREATE USER apex WITH ENCRYPTED PASSWORD 'ESCOLHA_UMA_SENHA_FORTE';
CREATE DATABASE apexmonitor OWNER apex;
\q
```

> **Use `OWNER`, não `GRANT ALL PRIVILEGES ON DATABASE`.** Do Postgres 15 em diante
> o schema `public` não é mais gravável por quem não é dono: com só o GRANT, o
> `prisma db push` falha ao criar as tabelas com um erro de permissão pouco óbvio.

## Passo 3 — Baixar o código e configurar segredos

O repositório é privado. Autorize o servidor com uma **deploy key** — somente leitura
e restrita a este repositório. (Um token pessoal daria ao servidor poder sobre a conta
inteira do GitHub; se a máquina cair em mãos erradas, a deploy key só lê o código.)

```bash
# no VPS: gera a chave e mostra a publica
ssh-keygen -t ed25519 -N "" -C "apexmonitor-deploy-key" -f /root/.ssh/id_ed25519
ssh-keyscan -t ed25519 github.com >> /root/.ssh/known_hosts
cat /root/.ssh/id_ed25519.pub
```

Cole essa chave em **GitHub → repositório → Settings → Deploy keys → Add deploy key**,
deixando "Allow write access" **desmarcado**. Depois clone via SSH:

```bash
cd /opt
git clone git@github.com:luis-devcode/apexmonitor.git
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

**Ordem importa com a Cloudflare.** Suba o DNS primeiro **sem o proxy** (nuvem
cinza) e deixe o Caddy emitir o certificado — com o proxy ligado antes disso, o
desafio do Let's Encrypt pode falhar. Só depois ligue o proxy (nuvem laranja) e
ponha o SSL em **Full (strict)**. É o proxy que traz o ganho de latência para o
Brasil (handshake em São Paulo + cache dos estáticos).

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
