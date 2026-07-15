/** Confirma o esquema do feed MonitorOdds (autorizado): distinção PA vs normal
 * num item de casa, e o formato dos deltas ao vivo. */
import crypto from "node:crypto";
import zlib from "node:zlib";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://app.monitorodds.com.br";
const EMAIL = process.env.MO_EMAIL, PASS = process.env.MO_PASS;
const SAVE = process.argv.includes("--save");
const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "data");
const OUT = join(DATA_DIR, "odds.json");

const login = await fetch(`${BASE}/api/auth/login`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASS }),
});
const { token } = await login.json();
const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
const H = { Authorization: `Bearer ${token}`, Cookie: cookie };
const k = (await (await fetch(`${BASE}/api/enc-key`, { headers: H })).json()).k;
const key = Buffer.from(k, "hex");
let auxiliary = { bookmakers: [], superOdds: null };
if (SAVE) {
  const [bookmakersResponse, superOddsResponse] = await Promise.all([
    fetch(`${BASE}/api/bookmakers`, { headers: H }),
    fetch(`${BASE}/api/super-odds`, { headers: H }),
  ]);
  const bookmakers = bookmakersResponse.ok ? await bookmakersResponse.json() : [];
  auxiliary = {
    bookmakers: (Array.isArray(bookmakers) ? bookmakers : []).map((bookmaker) => ({
      id: bookmaker.id,
      name: bookmaker.name,
      websiteUrl: bookmaker.website_url,
      status: bookmaker.status,
      priority: bookmaker.priority,
    })),
    superOdds: superOddsResponse.ok ? await superOddsResponse.json() : null,
  };
}

function decrypt(_e) {
  let gz = false, s = _e;
  if (s.startsWith("v2.")) { gz = true; s = s.slice(3); }
  const [iv, tag, ct] = s.split(".").map((x) => Buffer.from(x, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  let p = Buffer.concat([d.update(ct), d.final()]);
  if (gz) p = zlib.gunzipSync(p);
  return JSON.parse(p.toString("utf8"));
}

const ctrl = new AbortController();
const sse = await fetch(`${BASE}/api/ds`, { headers: { ...H, Accept: "text/event-stream" }, signal: ctrl.signal });
const reader = sse.body.getReader();
const dec = new TextDecoder();
let buf = "", deltas = 0, snap = false;
setTimeout(() => ctrl.abort(), 25000);
try {
  while (deltas < 2 || !snap) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n"); buf = parts.pop();
    for (const p of parts) {
      const ev = (p.match(/event: ?(.*)/) || [])[1];
      const data = (p.match(/data: ?([\s\S]*)/) || [])[1];
      if (!data) continue;
      if (ev === "snapshot" && !snap) {
        snap = true;
        const s = decrypt(JSON.parse(data)._e);
        const games = s.C || [];
        if (SAVE) {
          const matches = games.map((g) => ({
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
            odds: (g.B || []).map((b) => ({
              bookmaker: b.b,
              market: b.market_type,
              variant: b.f,
              home: b.c == null ? null : Number(b.c),
              draw: b.d == null ? null : Number(b.d),
              away: b.e == null ? null : Number(b.e),
              outcomes: Object.fromEntries(Object.entries(b.outcomes || {}).map(([name, value]) => [name, Number(value)])),
              updatedAt: b.i || new Date().toISOString(),
              eventRef: b.j || null,
            })),
          }));
          const now = new Date().toISOString();
          const payload = { updatedAt: now, count: matches.length, matches, ...auxiliary, source: { connected: false, lastEventAt: now, lastSnapshotAt: now } };
          await mkdir(DATA_DIR, { recursive: true });
          const tmp = `${OUT}.${crypto.randomUUID()}.tmp`;
          await writeFile(tmp, JSON.stringify(payload), "utf8");
          await rename(tmp, OUT);
          console.log(`snapshot salvo em ${OUT}`);
        }
        const fVals = new Map(), markets = new Set(), fields = new Set();
        for (const g of games) {
          markets.add(g.market_type);
          for (const b of g.B || []) { fVals.set(String(b.f), (fVals.get(String(b.f)) || 0) + 1); Object.keys(b).forEach((x) => fields.add(x)); }
        }
        console.log("=== SNAPSHOT ===");
        console.log("campos do jogo:", Object.keys(games[0]).join(","));
        console.log("campos da casa B[i]:", [...fields].join(","));
        console.log("valores de f (variante):", JSON.stringify([...fVals]));
        console.log("market_type:", [...markets].join(","));
        const g = games.find((x) => (x.B || []).some((b) => b.f) && (x.B || []).some((b) => !b.f)) || games[0];
        console.log("jogo:", JSON.stringify({ n: g.n, r: g.r, m: g.m, q: g.q, o: g.o, p: g.p, market_type: g.market_type }));
        const statsGame = games.find((x) => x.v || x.w || x.x || x.y || x.z || x.A) || g;
        console.log("campos estatísticos:", JSON.stringify({
          n: statsGame.n, home: statsGame.o, away: statsGame.p,
          v: statsGame.v, w: statsGame.w, x: statsGame.x,
          y: statsGame.y, z: statsGame.z, A: statsGame.A,
        }));
        console.log("casa com f setado:", JSON.stringify((g.B || []).find((b) => b.f)));
        console.log("casa com f vazio:", JSON.stringify((g.B || []).find((b) => !b.f)));
      }
      if (ev === "delta") { deltas++; const d = JSON.parse(data); console.log(`\n=== DELTA #${deltas} (${d.type}) ===`, JSON.stringify(d.deltas?.[0])); }
    }
  }
} catch {}
ctrl.abort();
process.exit(0);
