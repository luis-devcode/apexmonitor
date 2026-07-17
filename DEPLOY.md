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

**✅ Já feito e commitado** (`c712751`). O repositório inteiro é Postgres: o Prisma
não aceita provider por variável de ambiente, então SQLite no dev exigiria manter
o repositório e o servidor permanentemente diferentes. Consequência: rodar o
projeto localmente precisa de um Postgres na máquina.

No servidor, só resta gerar o client e criar as tabelas:
```bash
npx prisma generate
npx prisma db push
```

> `db push` no Prisma 7 **não tem** `--skip-generate`, e lê a URL do
> `prisma.config.ts` (não do bloco `datasource`, que não tem `url` no modo
> driver adapter).

## Passo 5 — Build

```bash
npm run build
```

## Passo 6 — Rodar app e coletor como serviços (sempre-ligados)

**Não rode como root.** O app fica exposto na internet e guarda CPF e senha de casa
de aposta; se uma dependência do Node tiver uma falha de execução remota, root é a
diferença entre "invadiram o app" e "invadiram o servidor".

```bash
useradd --system --home-dir /opt/apexmonitor --shell /usr/sbin/nologin apexmonitor
chown -R apexmonitor:apexmonitor /opt/apexmonitor
chmod 600 /opt/apexmonitor/.env /opt/apexmonitor/integrations/monitorodds/.env
```

Crie `/etc/systemd/system/apexmonitor.service`:
```ini
[Unit]
Description=ApexMonitor (app)
After=network.target postgresql.service
Requires=postgresql.service
[Service]
Type=simple
User=apexmonitor
Group=apexmonitor
WorkingDirectory=/opt/apexmonitor
EnvironmentFile=/opt/apexmonitor/.env
# -H 127.0.0.1: sem isto o Next escuta em 0.0.0.0 e a porta 3000 fica alcançável
# de fora, contornando o HTTPS do Caddy.
ExecStart=/usr/bin/npm run start -- -H 127.0.0.1 -p 3000
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/apexmonitor
[Install]
WantedBy=multi-user.target
```

Crie `/etc/systemd/system/apexmonitor-coletor.service` (mesmo cabeçalho de
segurança, `ExecStart=/usr/bin/npm run collector`, `RestartSec=10`).

> **Teste o login do MonitorOdds ANTES de habilitar o coletor.** Com credencial
> inválida ele tenta autenticar a cada 5s e o MonitorOdds bloqueia o IP por 30
> minutos — e `Restart=always` faz isso sozinho, indefinidamente:
> ```bash
> cd /opt/apexmonitor/integrations/monitorodds
> node --env-file=.env -e 'fetch("https://app.monitorodds.com.br/api/auth/login",{
>   method:"POST",headers:{"Content-Type":"application/json"},
>   body:JSON.stringify({email:process.env.MO_EMAIL,password:process.env.MO_PASS})
> }).then(r=>console.log(r.status))'   # tem que ser 200
> ```

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

### ⚠️ DNSSEC — desligue ANTES de trocar os nameservers

Domínio `.com.br` novo **nasce com DNSSEC ligado**: enquanto o DNS é do registro.br,
eles assinam a zona automaticamente e publicam o DS. Não existe botão de "desligar"
porque é automático — e é fácil concluir que está desligado.

Se os nameservers virarem para a Cloudflare com o DS ainda publicado, **o domínio
some da internet**: os resolvedores exigem uma assinatura que a Cloudflare não tem.
O sintoma é "domínio não existe", que parece problema de registro, não de config.

Ordem correta: **DNSSEC primeiro, nameservers depois.** No registro.br, em
*Alterar servidores DNS*, existe um botão `+ DNSSEC` — ele **adiciona** assinatura.
Deixe-o em paz: sair dos servidores deles sem informar DS remove o antigo.

Confira antes de considerar pronto (tem que vir vazio):
```bash
dig +short DS SEU_DOMINIO @a.dns.br
dig +short DS SEU_DOMINIO @8.8.8.8
```

### Ordem do Caddy e da Cloudflare

**Só recarregue o Caddy depois que o DNS resolver para o IP do VPS.** Com o domínio
apontando para o lugar errado, ele falha a validação em loop e queima a cota de
tentativas do Let's Encrypt — o mesmo erro do coletor, com o certificado no lugar.

Suba o DNS **sem o proxy** (nuvem cinza), deixe o Caddy emitir o certificado, e só
então ligue o proxy (nuvem laranja) com SSL em **Full (strict)**. É o proxy que traz
o ganho de latência para o Brasil (handshake em São Paulo + cache dos estáticos).

## Passo 8 — Criar seu administrador

Abra `https://apexmonitor.com.br/login`. Como o banco está vazio, aparece o
"primeiro acesso". Preencha o **token de instalação** = o `ADMIN_SETUP_TOKEN` do
`.env`. Só você tem esse token — é o que impede um estranho de virar dono.

---

## Fluxo do dia a dia (mudar o site depois de no ar)

Não há ambiente local: o repositório é Postgres e a máquina do Luis não tem banco.
Então **toda mudança vai direto para produção**. O fluxo:

1. Editar o código no repositório local
2. `npx tsc --noEmit` e `npx eslint` — **rodam sem banco**, então continuam sendo a
   rede de proteção antes do push
3. `git push origin main`
4. No servidor: `apexmonitor-deploy`

O script `/usr/local/bin/apexmonitor-deploy` faz pull → npm install → prisma
generate + db push → **build** → restart, e termina conferindo se `/login` responde.

> **O build é o portão.** Ele roda **antes** do restart e o script usa `set -e`: se
> o build falhar, nada é reiniciado e o site continua no ar com a versão anterior.
> Código quebrado não alcança o serviço. A única janela de indisponibilidade são os
> ~2s do restart.

> **`safe.directory`:** o repo é dono do usuário `apexmonitor` e o deploy roda como
> root, então o git recusa por "dubious ownership" até rodar
> `git config --global --add safe.directory /opt/apexmonitor`.

## Pós-lançamento

- **Backup do Postgres** — ✅ feito, em duas camadas. `apexmonitor-backup.timer`
  roda 03:30 UTC (00:30 BRT) e chama `/usr/local/bin/apexmonitor-backup`:

  | Camada | Onde | Retenção | Serve para |
  |---|---|---|---|
  | Local | `/var/backups/apexmonitor` | 14 dias | restaurar rápido de erro humano |
  | Remota | Cloudflare R2 (`apexmonitor-backup`) | 90 dias | sobreviver à perda do servidor |

  O R2 é grátis até 10 GB e não cobra egresso; o dump comprimido tem poucos KB.
  A cópia fica em **outra empresa e outro continente** (EUA) — é o que o backup
  local não dava.

  O script aborta se o dump sair vazio (backup quebrado não pode apagar os bons) e
  **confere se o arquivo apareceu no R2** depois do upload — "sem erro" não é prova
  de que chegou.

### Restaurar (procedimento testado em 16/07/2026)

```bash
ARQ=$(rclone lsf r2:apexmonitor-backup/ | tail -1)     # ou escolha a data
rclone copy "r2:apexmonitor-backup/$ARQ" /tmp/restore/
sudo -u postgres psql -c "CREATE DATABASE restore_teste OWNER apex;"
zcat "/tmp/restore/$ARQ" | sudo -u postgres psql -d restore_teste
sudo -u postgres psql -d restore_teste -c 'SELECT COUNT(*) FROM "User";'
```
Restaure sempre num banco descartável primeiro; só depois aponte o app para ele.

> **Duas armadilhas achadas na configuração:**
> - **O rclone do apt é de 2022** (v1.60) e o R2 responde `501 Not Implemented` no
>   upload. Instale o atual: `curl https://rclone.org/install.sh | bash`.
> - **O servidor fala com a Cloudflare por IPv6.** O filtro de IP do token R2 tem
>   que incluir o **IPv6** (`2a01:4f8:1c18:b7f3::/64`), não só o IPv4 — só com o
>   IPv4 o backup falha em silêncio, todo dia.

> **Falta alerta de falha.** Hoje, se o backup parar, ninguém é avisado — só
> aparece em `systemctl status apexmonitor-backup`. Antes do primeiro cliente
> pagante, ligar isso a um canal (e-mail/Telegram).
- **Nunca** exponha o repositório publicamente (a pasta `integrations/monitorodds`
  revela a fonte dos dados).
- **Antes de virar público:** renomear a pasta `integrations/monitorodds` para um
  nome neutro (ficou de fora do dev pra não quebrar o coletor rodando; é um passo
  de última hora, com o serviço parado).

## Sobre a fonte de dados

O uso do feed do MonitorOdds está **liberado pelo dono** — não é pendência.

A dependência operacional, porém, é real: em 16/07/2026 a senha compartilhada mudou
sem aviso e derrubou o coletor em produção. Quando isso acontecer de novo, o sintoma
é `login falhou (401)` no `journalctl -u apexmonitor-coletor`; conserto é atualizar
`MO_PASS` em `integrations/monitorodds/.env` e reiniciar o serviço.

O plano de longo prazo é uma **API de odds própria**, que remove essa dependência (e
torna desnecessário esconder o vínculo com a fonte). Sem data.

## Pendências de negócio (não são código)

- **Termos de Uso + Política de Privacidade (LGPD)** — obrigatórios para um produto
  pago que guarda CPF de parceiros e senhas de casas de aposta.
