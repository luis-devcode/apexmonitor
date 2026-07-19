# Deploy do ApexMonitor

Guia para colocar o ApexMonitor no ar num **VPS** (servidor sempre-ligado). Um
VPS é necessário — não um host serverless (Vercel/Netlify/Lovable) — porque o
**coletor** precisa rodar 24h e dividir o disco com o app.

Arquitetura: **um VPS** rodando (1) Postgres, (2) o app Next.js, (3) o coletor.
App e coletor compartilham a pasta de dados do coletor.

---

## Pré-requisitos (você contrata)

- **VPS** com Ubuntu 24.04 — **Locaweb VPS 4 GB Linux** (2 vCPU / 4 GB / 70 GB NVMe),
  datacenter Ascenty em **São Paulo**. R$89,90/mês, mensal sem fidelidade. IP público
  `191.252.101.180`. Acesso: `ssh -i ~/.ssh/apexmonitor_sp root@191.252.101.180`.
  > **Histórico:** até 2026-07-19 rodava num Hetzner **CX23** na Alemanha (~€6/mês).
  > Migrou pra São Paulo porque a distância (200ms) deixava o site lento — em SP a
  > origem fica a ~10ms do usuário (TTFB caiu de ~0.35s pra ~0.15s). A migração foi
  > reproduzir este documento na máquina nova + `pg_dump`/restore; nada prendia à
  > Hetzner. Se um dia trocar de novo, o roteiro é o mesmo.
- **Cloudflare** (plano grátis) na frente — proxy ligado (nuvem laranja), SSL em
  **Full (strict)**. Com a origem já em São Paulo o ganho de latência do handshake é
  pequeno, mas a Cloudflare segue valendo por três coisas: **cache dos estáticos** na
  borda, o **Origin Certificate** (Passo 7) e o **firewall** que restringe 80/443 às
  faixas dela, escondendo o IP da origem.
- **Domínio** — `apexmonitor.com.br` ✅ já registrado (registro.br).
- **Repositório privado no GitHub** ✅ `luis-devcode/apexmonitor` (é de onde o servidor baixa).

---

## Passo 1 — Preparar o servidor

```bash
# como root no VPS
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs
apt install -y git jq
```

**Postgres 18** — o padrão do Ubuntu 24.04 é o 16, mas o banco usa a 18. Restaurar um
dump da 18 numa 16 quebra, então instale a 18 pelo repositório oficial (PGDG):
```bash
apt install -y postgresql-common
/usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y   # adiciona o repo PGDG
apt install -y postgresql-18
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

**Firewall (`ufw`).** Aplique **depois** de confirmar que o SSH entra, e **libere a
22 antes de ativar** — senão o firewall expulsa você antes de terminar de configurá-lo.

| Porta | Quem entra |
|---|---|
| 22 | qualquer lugar — é o único caminho para consertar um erro aqui |
| 80 / 443 | **só as faixas da Cloudflare** (ver Passo 7) |

Postgres (5432) e o Next (3000) **nunca** expostos: ambos escutam só em `127.0.0.1`.
Confira com `ss -tlnp` — se aparecer `0.0.0.0:3000`, a porta está alcançável de fora
e contorna o HTTPS.

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

### ⚠️ Segredos que começam com `$` (ex.: a chave do Asaas) NÃO vão no `.env`

A chave de API do Asaas começa com `$` (`$aact_...`). Dois loaders leem o `.env` e
**ambos estragam o `$`**:

1. **O Next.js** (`@next/env`) roda `dotenv-expand`, que trata `$aact_...` como
   referência de variável e o resolve para **string vazia**. O app sobe com a chave
   em branco e o webhook falha com "ASAAS_API_KEY ausente" — sem erro no build.
2. **O `source ./.env` do shell** (deploy) expande o `$` e quebra com `unbound
   variable` sob `set -u`.

**Solução:** segredos com `$` moram em `/opt/apexmonitor/.env.secrets`, carregado
**só pelo systemd** (o Next não lê arquivos com esse nome). O deploy carrega apenas
o `DATABASE_URL` do `.env`, de forma literal (não via `source`):

```bash
# no .env.secrets (formato systemd, sem aspas, valor literal):
ASAAS_API_KEY=$aact_hmlg_...

# no systemd unit, DOIS EnvironmentFile:
EnvironmentFile=/opt/apexmonitor/.env
EnvironmentFile=/opt/apexmonitor/.env.secrets

# no deploy, em vez de `source .env`:
export DATABASE_URL="$(grep '^DATABASE_URL=' .env | cut -d= -f2- | sed 's/^"//;s/"$//')"
```

`.env.secrets` casa com o padrão `.env*` do `.gitignore` — nunca é commitado.

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
# Binário direto, sem npm no meio: o npm não repassa sinais ao filho.
# -H 127.0.0.1: sem isto o Next escuta em 0.0.0.0 e a porta 3000 fica alcançável
# de fora, contornando o HTTPS do Caddy.
ExecStart=/opt/apexmonitor/node_modules/.bin/next start -H 127.0.0.1 -p 3000
Restart=always
RestartSec=2
TimeoutStopSec=10
KillSignal=SIGKILL
KillMode=mixed
SuccessExitStatus=SIGKILL
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/apexmonitor
[Install]
WantedBy=multi-user.target
```

Crie `/etc/systemd/system/apexmonitor-coletor.service` igual, com
`WorkingDirectory=/opt/apexmonitor/integrations/monitorodds` e
`ExecStart=/usr/bin/node --env-file-if-exists=.env src/collect.mjs`.

### ⚠️ `KillSignal=SIGKILL` — por que, e o que custa

Sem essas quatro linhas, **cada restart derrubava o site por 90 segundos e mandava
um e-mail de falha**. A cadeia:

1. O **Next não sai com SIGTERM**. Ele fecha a porta e espera as conexões drenarem
   — mas o Caddy mantém uma keep-alive aberta, que nunca fecha. Ele espera para
   sempre. (Medido: vivo após 30s sem ninguém conectado.)
2. Nesse intervalo o site **já está fora** (porta fechada) enquanto
   `systemctl is-active` ainda diz `active` — o PID existe. Estado zumbi.
3. No fim do prazo o systemd manda SIGKILL e marca `Result=timeout`. **Timeout é
   falha** → dispara o `OnFailure` → e-mail dizendo que o site caiu, a cada deploy.

`SuccessExitStatus` **não resolve**: ele perdoa código de saída, não o estouro do
prazo. E esperar mais só aumenta o tempo fora do ar. Como o Next não desliga de
jeito nenhum, esperar troca "morre agora" por "fica fora e morre depois".

Resultado: **restart de 90.000ms → 65ms**, sem alerta falso.

**O custo:** não há desligamento gracioso — requisição em andamento é cortada. Vale
para este app (stateless, requisições curtas). Se um dia houver operação longa no
servidor, isto precisa ser revisto.

**O outro custo:** `SuccessExitStatus=SIGKILL` também faz um kill por OOM parecer
sucesso. Com 4 GB e swap, é improvável — mas é um alerta a menos.

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

O HTTPS **não** usa mais Let's Encrypt automático. Como o site fica atrás do proxy da
Cloudflare em **Full (strict)**, o certificado da origem é um **Cloudflare Origin
Certificate** (só a Cloudflare confia nele, vale **15 anos, sem renovação**). Isso
também é o que permite migrar de servidor **sem downtime**: o Caddy do servidor novo
já tem um certificado válido antes de o DNS apontar pra ele — não existe a corrida do
desafio ACME (que falharia enquanto o DNS ainda aponta pro servidor velho).

Gerar o Origin cert (a chave privada nunca sai do servidor):
```bash
# 1) chave + CSR no servidor
openssl req -new -newkey rsa:2048 -nodes \
  -keyout /etc/caddy/cf-origin.key -out /tmp/apex.csr \
  -subj "/CN=apexmonitor.com.br" \
  -addext "subjectAltName=DNS:apexmonitor.com.br,DNS:www.apexmonitor.com.br"
chmod 600 /etc/caddy/cf-origin.key; chown caddy:caddy /etc/caddy/cf-origin.key
```
2) Painel Cloudflare → **SSL/TLS → Origin Server → Create Certificate**, cole o CSR
   (ou via API `POST /certificates` com `request_type: origin-rsa`,
   `requested_validity: 5475`). Salve o certificado retornado em
   `/etc/caddy/cf-origin.pem` (`chown caddy:caddy`, `chmod 644`).

`/etc/caddy/Caddyfile` (os dois blocos de site usam o Origin cert):
```
apexmonitor.com.br {
    tls /etc/caddy/cf-origin.pem /etc/caddy/cf-origin.key
    reverse_proxy 127.0.0.1:3000
}
```
```bash
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile   # OK se validar
systemctl reload caddy
```
> O `caddy validate` avisa `stapling OCSP ... no URL to issuing certificate` — é
> **esperado** com Origin cert (a Cloudflare não publica OCSP pra ele). Não é erro.

### ⚠️ DNSSEC — desligue ANTES de trocar os nameservers

> ✅ **Já feito** quando a Cloudflare entrou (16/07/2026). A migração pra SP **não**
> mexeu em nameserver (a Cloudflare continua sendo o DNS; só trocamos o registro A da
> origem). Esta seção só volta a importar se um dia trocar de provedor de DNS.

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

### Ordem da virada de DNS (com Origin cert, sem corrida de ACME)

Com o Origin cert já instalado no Caddy, o servidor novo apresenta HTTPS válido
**antes** de receber tráfego. Então dá pra testar por fora sem tocar no DNS e virar
com o proxy sempre ligado:

```bash
# testa a origem nova por fora, forçando o IP (‑k porque o Origin cert só a Cloudflare valida)
curl -k --resolve apexmonitor.com.br:443:IP_NOVO https://apexmonitor.com.br/login -o /dev/null -w '%{http_code}\n'
```
Passando 200, troque o **registro A** (apex + www) pro IP novo na Cloudflare
(mantendo proxied/nuvem laranja). Não precisa de nuvem cinza nem de esperar ACME.

### Cloudflare — proxy ligado (16/07/2026) e por que continua

Foi o proxy que trouxe o site de ~720 ms (direto na Alemanha) pra ~350 ms quando a
origem ainda era lá. **Com a origem agora em São Paulo o TTFB é ~150 ms** e o ganho
do handshake pela borda ficou pequeno — mas o proxy segue ligado por três motivos que
não dependem de distância:

1. **SSL em Full (strict) + Origin cert.** `Flexible` daria loop de redirecionamento e
   mandaria os dados **abertos** entre a Cloudflare e a origem. Full (strict) exige um
   certificado válido e confiável na origem — que é exatamente o Origin cert.
2. **`trusted_proxies` no Caddy** com as faixas de `cloudflare.com/ips-v4` e
   `/ips-v6`, mais `client_ip_headers CF-Connecting-IP`. Sem isto todo visitante
   chega com o IP da Cloudflare: os logs viram inúteis e qualquer limite por IP
   puniria todos juntos.
3. **Firewall: 80/443 só das faixas da Cloudflare.** Sem isto, quem descobrisse
   `191.252.101.180` contornaria a Cloudflare e o ganho de proteção evaporaria.
   **A porta 22 fica aberta** — é o único caminho para consertar um erro no próprio
   firewall.

> ✅ **Certificado: sem renovação.** O Origin cert vale **15 anos** (até 2041), então
> não há a corrida de renovação que o Let's Encrypt tinha. O
> `apexmonitor-cert-check.timer` (segundas, 09:00) foi **repontado** pra ler
> `/etc/caddy/cf-origin.pem` e continua alertando se faltarem menos de 20 dias — na
> prática, silencioso pelos próximos ~15 anos. Se um dia trocar o Origin cert, é só
> repetir o CSR acima e substituir o `.pem`.

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
> ~1s do restart.

> **`safe.directory`:** o repo é dono do usuário `apexmonitor` e o deploy roda como
> root, então o git recusa por "dubious ownership" até rodar
> `git config --global --add safe.directory /opt/apexmonitor`.

## Pós-lançamento

- **Backup do Postgres** — ✅ feito, em duas camadas. `apexmonitor-backup.timer`
  roda **03:30** (o `OnCalendar` é sem timezone = hora local; o VPS de SP está em
  `-03`, então 03:30 BRT) e chama `/usr/local/bin/apexmonitor-backup`:

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
> - **O filtro de IP do token R2 tem que bater com o IP de saída do servidor.** Na
>   Alemanha a saída era **IPv6** (`2a01:4f8:1c18:b7f3::/64`); o VPS de SP (Locaweb)
>   **não tem IPv6**, então o token precisa liberar o **IPv4 `191.252.101.180/32`**.
>   Se o IP não bater, o backup dá `403 AccessDenied` e falha em silêncio, todo dia.
>   (Trocar o filtro de IP no painel **não muda a chave** do token — o rclone segue
>   funcionando sem reconfigurar.)

- **Alerta de falha por e-mail** — ✅ feito, para `luisfilipemarchini21@hotmail.com`.

  O systemd chama `apexmonitor-alerta@%N.service` via `OnFailure=` (drop-in em
  `/etc/systemd/system/<unit>.service.d/alerta.conf`) em **três** serviços:
  `apexmonitor-backup`, `apexmonitor` (o site) e `apexmonitor-coletor`. O script
  junta as últimas 25 linhas do journal e manda pela **API HTTP do Resend**
  (grátis: 3.000/mês). Chave em `/root/.resend_key` (600).

  > **Por que API HTTP e não SMTP:** na Hetzner as portas 25/465 vinham bloqueadas
  > ~1 mês em conta nova; a 443 (HTTP) não, então o `curl` sempre passa. Independe do
  > provedor — a API HTTP é mais simples e robusta que SMTP de qualquer forma, então
  > seguimos com ela na Locaweb também.
  >
  > **Por que `onboarding@resend.dev` e não `@apexmonitor.com.br`:** enviar pelo
  > domínio exigiria verificá-lo no Resend e **trocar o `v=spf1 -all`**, que hoje
  > impede que falsifiquem e-mail seu. Não vale mexer nisso por um alerta interno;
  > fazer junto quando o produto precisar de e-mail (recuperar senha, assinatura).
  >
  > **Use `%N`, não `%n`**, no `OnFailure`: `%n` já inclui o sufixo e vira
  > `nome.service.service` — o alerta nunca dispara e nada indica o porquê.

  **O que isto NÃO cobre:** serviço lento (mas vivo), coletor autenticando e
  trazendo dado velho, e a queda do servidor inteiro (não sobra quem mande o
  e-mail). Isso pede monitoramento externo — vale quando houver cliente pagante.
- **Nunca** exponha o repositório publicamente (a pasta `integrations/monitorodds`
  revela a fonte dos dados).
- **Antes de virar público:** renomear a pasta `integrations/monitorodds` para um
  nome neutro (ficou de fora do dev pra não quebrar o coletor rodando; é um passo
  de última hora, com o serviço parado).

## Webhook do Asaas (assinaturas)

Endpoint: `POST /api/asaas/webhook`. Configurar no painel do Asaas (Integrações →
Webhooks) apontando para `https://apexmonitor.com.br/api/asaas/webhook`, com o
**token** de `ASAAS_WEBHOOK_TOKEN` no campo authToken. O Asaas envia esse token no
header `asaas-access-token`; o endpoint valida (timingSafeEqual, falha fechada)
antes de qualquer processamento — sem isso, um POST forjado daria acesso grátis.

Fluxo (Opção 2 — pagamento cria a conta): evento `PAYMENT_CONFIRMED`/`RECEIVED` →
busca o e-mail do cliente na API → cria o `User` se não existe (senha aleatória por
e-mail via Resend) ou renova → registra `Pagamento` (idempotente pelo `asaasId`
único) com afiliado e comissão **congelados**. O checkout grava
`externalReference="meses=N;cupom=XXX"` na cobrança — é como o webhook sabe a
duração e a origem.

**Sandbox primeiro:** `ASAAS_ENV=sandbox` usa `api-sandbox.asaas.com` (dinheiro
falso). Testado ponta a ponta em 17/07/2026: cobrança → webhook → conta criada +
acesso + comissão, tudo automático.

**Checkout:** `/assinar` (público) cria um checkout hospedado (POST /checkouts).
Cartão = `chargeTypes:["RECURRENT"]` + `billingTypes:["CREDIT_CARD"]` (renova
sozinho). Pix = `["DETACHED"]` + `["PIX"]` (avulso) — **exige uma chave Pix criada
no painel do Asaas**, senão dá erro. Não mandamos `customerData`: o Asaas coleta
nome/CPF/endereço na página dele (zero PCI do nosso lado). O `externalReference`
carrega `meses`, `cupom` e (em renovação de logado) o `email` da conta.

### Passar para PRODUÇÃO (quando o segmento for confirmado)

1. Confirmar o segmento (aposta/software) com o Asaas **por escrito**.
2. Criar uma **chave Pix** na conta de produção do Asaas (ativa o Pix).
3. Pegar a **chave de API de produção** (`$aact_prod_...`) → colocar em
   `/opt/apexmonitor/.env.secrets` (NÃO no `.env` — ver a nota do `$`).
4. Trocar `ASAAS_ENV` para `producao` no `.env`.
5. Registrar o **webhook de produção** (POST /webhooks) apontando para
   `https://apexmonitor.com.br/api/asaas/webhook`, com `authToken` =
   `ASAAS_WEBHOOK_TOKEN`, eventos `PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED`.
6. `systemctl restart apexmonitor` e fazer **uma compra real de teste** (valor
   baixo) para confirmar a conta sendo criada.

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
