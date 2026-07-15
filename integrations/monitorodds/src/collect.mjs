/**
 * Coletor do feed MonitorOdds → Central de Odds (uso autorizado).
 *
 * Fluxo (tudo por HTTP, sem navegador):
 *   login → cookie/token → GET /api/enc-key (chave AES) → SSE /api/ds
 *   snapshot (AES-256-GCM + gzip) = estado completo · deltas (texto) = updates
 *
 * Mantém o estado em memória e escreve `data/odds.json` a cada intervalo, que é
 * o arquivo que a Central de Odds lê para calcular extração/surebets.
 */
import crypto from "node:crypto";
import zlib from "node:zlib";
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import process from "node:process";

const BASE = "https://app.monitorodds.com.br";
const EMAIL = process.env.MO_EMAIL;
const PASS = process.env.MO_PASS;
const WRITE_MS = Number(process.env.WRITE_INTERVAL_MS) || 1000;
const AUX_MS = Number(process.env.AUX_INTERVAL_MS) || 5000;
const ONCE_MS = Number(process.argv.find((arg) => arg.startsWith("--once="))?.split("=")[1]) || 0;

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const OUT = join(DATA_DIR, "odds.json");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hora = () => new Date().toLocaleTimeString("pt-BR");

/**
 * Escrita atômica (tmp → rename). No Windows o rename falha com EPERM enquanto
 * o Next mantém o arquivo aberto para leitura; sem retry, o tmp de ~6MB vazava
 * a cada segundo (chegamos a 1,5GB de órfãos). Com retry curto quase sempre
 * passa; se ainda assim falhar, apaga o tmp para não deixar lixo.
 */
async function writeAtomic(dest, data) {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${dest}.${crypto.randomUUID()}.tmp`;
  await writeFile(tmp, data, "utf8");
  for (let attempt = 0; ; attempt += 1) {
    try {
      await rename(tmp, dest);
      return;
    } catch (e) {
      if (attempt >= 5) {
        await unlink(tmp).catch(() => {});
        throw e;
      }
      await sleep(50);
    }
  }
}

/** Rede de segurança: remove qualquer .tmp órfão com mais de 30s na pasta. */
async function sweepStaleTmp() {
  try {
    const now = Date.now();
    for (const name of await readdir(DATA_DIR)) {
      if (!name.endsWith(".tmp")) continue;
      const p = join(DATA_DIR, name);
      try {
        const s = await stat(p);
        if (now - s.mtimeMs > 30_000) await unlink(p);
      } catch {}
    }
  } catch {}
}

if (!EMAIL || !PASS) {
  console.error("Defina MO_EMAIL e MO_PASS no .env.");
  process.exit(1);
}

/** Estado: matchId → { meta, odds: Map("bookmaker|market|variant" → {home,draw,away,updatedAt}) } */
const state = new Map();
let bookmakerMeta = [];
let sourceStatus = {
  connected: false,
  lastEventAt: null,
  lastSnapshotAt: null,
};
let activeController = null;
let hasSnapshot = false;

async function auth() {
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  if (!login.ok) throw new Error(`login falhou (${login.status})`);
  const { token } = await login.json();
  const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
  const H = { Authorization: `Bearer ${token}`, Cookie: cookie, "Content-Type": "application/json" };
  const encRes = await fetch(`${BASE}/api/enc-key`, { headers: H });
  const { k } = await encRes.json();
  return { H, key: Buffer.from(k, "hex") };
}

function decrypt(_e, key) {
  let gz = false, s = _e;
  if (s.startsWith("v2.")) { gz = true; s = s.slice(3); }
  const [iv, tag, ct] = s.split(".").map((x) => Buffer.from(x, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  let p = Buffer.concat([d.update(ct), d.final()]);
  if (gz) p = zlib.gunzipSync(p);
  return JSON.parse(p.toString("utf8"));
}

/** Registra/atualiza uma odd de uma casa num jogo. */
function setOdd(matchId, bookmaker, market, variant, home, draw, away, updatedAt, outcomes = {}, eventRef = null) {
  if (variant === "PA+1") return; // PA+1 não é usado no site — não armazenamos
  const m = state.get(matchId);
  if (!m) return;
  const key = `${bookmaker}|${market}|${variant}`;
  m.odds.set(key, {
    bookmaker,
    market,
    variant,
    home: num(home),
    draw: num(draw),
    away: num(away),
    outcomes: cleanOutcomes(outcomes),
    updatedAt: updatedAt || new Date().toISOString(),
    eventRef,
  });
}
const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
const current = (v) => v && typeof v === "object" && "curr" in v ? v.curr : v;
const cleanOutcomes = (values = {}) => Object.fromEntries(
  Object.entries(values || {})
    .map(([key, value]) => [key, num(current(value))])
    .filter(([, value]) => value !== null),
);

function loadSnapshot(snap) {
  state.clear();
  for (const g of snap.C || []) {
    state.set(g.n, {
      meta: {
        id: g.n,
        sport: g.m,
        league: g.q,
        country: g.league_country,
        home: g.o,
        away: g.p,
        startsAt: g.r,
        status: g.match_status,
        marketType: g.market_type,
        sourceMetrics: { v: g.v, w: g.w, x: g.x, y: g.y, z: g.z, A: g.A },
      },
      odds: new Map(),
    });
    for (const b of g.B || []) {
      setOdd(g.n, b.b, b.market_type, b.f, b.c, b.d, b.e, b.i, b.outcomes, b.j);
    }
  }
  hasSnapshot = true;
}

async function loadExistingFeed() {
  try {
    const existing = JSON.parse(await readFile(OUT, "utf8"));
    for (const match of existing.matches || []) {
      state.set(match.id, {
        meta: Object.fromEntries(Object.entries(match).filter(([key]) => key !== "odds")),
        odds: new Map((match.odds || []).map((odd) => [
          `${odd.bookmaker}|${odd.market}|${odd.variant}`,
          odd,
        ])),
      });
    }
    bookmakerMeta = existing.bookmakers || [];
    hasSnapshot = Array.isArray(existing.matches) && existing.matches.length > 0;
  } catch {}
}

function applyDelta(d) {
  const id = d.matchId;
  if (!state.has(id) && (d.homeTeam || d.awayTeam)) {
    // jogo novo que apareceu só no delta
    state.set(id, {
      meta: { id, sport: "football", league: d.league, home: d.homeTeam, away: d.awayTeam },
      odds: new Map(),
    });
  }
  let changed = false;
  for (const c of d.changes || []) {
    const o = c.addedOdd;
    if (o) {
      setOdd(id, o.bookmaker_name, o.market_type, o.odds_type, o.home_odd, o.draw_odd, o.away_odd, o.scraped_at, o.outcomes, o.event_ref);
      changed = true;
    } else if (c.bookmaker) {
      const match = state.get(id);
      if (!match) continue;
      const market = c.marketType || match.meta.marketType || "1x2";
      const key = `${c.bookmaker}|${market}|${c.oddsType}`;
      if (c.removedOdd) {
        changed = match.odds.delete(key) || changed;
        continue;
      }
      const previous = match.odds.get(key) || {};
      const nextOutcomes = { ...(previous.outcomes || {}) };
      for (const [outcome, value] of Object.entries(c.outcomes || {})) {
        const next = num(current(value));
        if (next === null) delete nextOutcomes[outcome];
        else nextOutcomes[outcome] = next;
      }
      setOdd(
        id,
        c.bookmaker,
        market,
        c.oddsType,
        c.home == null ? previous.home : current(c.home),
        c.draw == null ? previous.draw : current(c.draw),
        c.away == null ? previous.away : current(c.away),
        new Date().toISOString(),
        nextOutcomes,
        previous.eventRef,
      );
      changed = true;
    }
  }
  return changed;
}

let dirty = true;

/**
 * Faxina: remove da memória os jogos que já começaram. O MonitorOdds só tem
 * odds de pré-jogo, então jogo iniciado vira lixo (incha o arquivo e gera
 * surebet falsa). Como o estado é reconstruído a cada snapshot e só cresce por
 * deltas, sem isso os jogos finalizados se acumulariam indefinidamente.
 */
function pruneState(now = Date.now()) {
  let removed = 0;
  for (const [id, m] of state) {
    const startsAt = m.meta?.startsAt;
    if (startsAt && Date.parse(startsAt) <= now) {
      state.delete(id);
      removed += 1;
    }
  }
  return removed;
}

async function writeFeed() {
  if (!dirty) return;
  if (!hasSnapshot) return;
  dirty = false;
  pruneState();
  const matches = [];
  for (const m of state.values()) {
    if (m.odds.size === 0) continue;
    matches.push({ ...m.meta, odds: [...m.odds.values()] });
  }
  const payload = {
    updatedAt: new Date().toISOString(),
    count: matches.length,
    matches,
    bookmakers: bookmakerMeta,
    source: sourceStatus,
  };
  await writeAtomic(OUT, JSON.stringify(payload));
}

async function refreshAuxiliary(H) {
  const [bookmakersRes, superOddsRes, groupsRes, logosRes] = await Promise.all([
    fetch(`${BASE}/api/bookmakers`, { headers: H }),
    fetch(`${BASE}/api/super-odds`, { headers: H }),
    fetch(`${BASE}/api/bookmaker-groups`, { headers: H }),
    fetch(`${BASE}/api/match-logos`, { headers: H }),
  ]);
  if (bookmakersRes.ok) {
    const bookmakers = await bookmakersRes.json();
    const list = Array.isArray(bookmakers) ? bookmakers : [];
    // Versão leve no odds.json (casas com odds — usada nos seletores).
    bookmakerMeta = list.map((b) => ({
      id: b.id,
      name: b.name,
      websiteUrl: b.website_url,
      status: b.status,
      priority: b.priority,
    }));
  }
  // Diretório COMPLETO de casas (151) agrupadas por clone/plataforma, com logo,
  // link e flags. Vai num arquivo separado, lido só pela tela de Clones.
  if (groupsRes.ok) {
    const raw = await groupsRes.json();
    const groups = (Array.isArray(raw) ? raw : []).map((b) => ({
      id: b.id,
      groupId: b.group_id,
      name: b.bookmaker_name,
      provider: b.provider,
      url: b.url,
      logoUrl: b.logo_url,
      isCloneGroup: b.is_clone_group,
      riskWarning: b.risk_warning,
      betterOdds: b.better_odds,
      liquidityType: b.liquidity_type,
      earlyPayment: b.early_payment,
      estadual: b.estadual,
      groupColor: b.group_color,
      groupOrder: b.group_order,
      houseOrder: b.house_order,
    }));
    try {
      await writeAtomic(join(DATA_DIR, "bookmaker-groups.json"), JSON.stringify(groups));
    } catch (e) {
      console.warn(`[${hora()}] falha ao gravar bookmaker-groups.json: ${e.message}`);
    }
  }
  // Logos dos times/ligas por jogo (URLs leves) — arquivo separado.
  if (logosRes.ok) {
    try {
      const logos = await logosRes.json();
      await writeAtomic(join(DATA_DIR, "match-logos.json"), JSON.stringify(logos));
    } catch (e) {
      console.warn(`[${hora()}] falha ao gravar match-logos.json: ${e.message}`);
    }
  }
  // Super Odds (escudos base64 pesados, ~3MB) — arquivo separado para não
  // inchar o odds.json, que é lido em toda página. Só a tela Super Odds lê isto.
  if (superOddsRes.ok) {
    try {
      const so = await superOddsRes.json();
      await writeAtomic(join(DATA_DIR, "super-odds.json"), JSON.stringify(so));
    } catch (e) {
      console.warn(`[${hora()}] falha ao gravar super-odds.json: ${e.message}`);
    }
  }
  dirty = true;
}

async function stream() {
  const { H, key } = await auth();
  sourceStatus = { ...sourceStatus, connected: true, lastEventAt: new Date().toISOString() };
  dirty = true;
  await refreshAuxiliary(H).catch((error) => console.warn(`[${hora()}] auxiliares: ${error.message}`));
  const auxTimer = setInterval(() => {
    refreshAuxiliary(H).catch((error) => console.warn(`[${hora()}] auxiliares: ${error.message}`));
  }, AUX_MS);
  console.log(`[${hora()}] autenticado, abrindo o feed...`);
  const ctrl = new AbortController();
  activeController = ctrl;
  const sse = await fetch(`${BASE}/api/ds`, { headers: { ...H, Accept: "text/event-stream" }, signal: ctrl.signal });
  if (!sse.ok) throw new Error(`SSE falhou (${sse.status})`);

  const reader = sse.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let deltas = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      sourceStatus.lastEventAt = new Date().toISOString();
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop();
      for (const p of parts) {
        const ev = (p.match(/event: ?(.*)/) || [])[1];
        const data = (p.match(/data: ?([\s\S]*)/) || [])[1];
        if (!data) continue;
        try {
          if (ev === "snapshot") {
            loadSnapshot(decrypt(JSON.parse(data)._e, key));
            sourceStatus.lastSnapshotAt = new Date().toISOString();
            dirty = true;
            console.log(`[${hora()}] snapshot: ${state.size} registros.`);
          } else if (ev === "delta") {
            const envelope = JSON.parse(data);
            const batch = Array.isArray(envelope.deltas) ? envelope.deltas : [envelope];
            const applied = batch.reduce((total, delta) => total + (applyDelta(delta) ? 1 : 0), 0);
            if (applied > 0) dirty = true;
            deltas += applied;
            if (deltas > 0 && deltas % 20 === 0) console.log(`[${hora()}] ${deltas} deltas aplicados, ${state.size} registros.`);
          }
        } catch (e) {
          console.warn(`[${hora()}] falha ao processar ${ev}: ${e.message}`);
        }
      }
    }
  } finally {
    activeController = null;
    clearInterval(auxTimer);
    sourceStatus = { ...sourceStatus, connected: false };
    dirty = true;
    await writeFeed().catch(() => {});
  }
}

// Escreve o arquivo periodicamente, independente do stream.
const writeTimer = setInterval(() => { writeFeed().catch(() => {}); }, WRITE_MS);

// Faxina periódica: remove jogos que já começaram mesmo sem novos deltas.
const pruneTimer = setInterval(() => {
  const removed = pruneState();
  if (removed > 0) {
    dirty = true;
    console.log(`[${hora()}] faxina: ${removed} jogo(s) já iniciados removidos (${state.size} restantes).`);
  }
  sweepStaleTmp();
}, 30_000);

let stopped = false;
process.on("SIGINT", () => { stopped = true; activeController?.abort(); });
if (ONCE_MS > 0) {
  setTimeout(() => { stopped = true; activeController?.abort(); }, ONCE_MS);
}

console.log(`Coletor MonitorOdds → ${OUT} (escreve a cada ${WRITE_MS}ms).`);
await sweepStaleTmp();
await loadExistingFeed();
while (!stopped) {
  try {
    await stream();
    console.warn(`[${hora()}] stream encerrou; reconectando em 3s...`);
  } catch (e) {
    if (!stopped) {
      console.warn(`[${hora()}] erro: ${e.message}; reconectando em 5s...`);
      await sleep(2000);
    }
  }
  if (stopped) break;
  await sleep(3000);
}
clearInterval(writeTimer);
clearInterval(pruneTimer);
await writeFeed().catch(() => {});
