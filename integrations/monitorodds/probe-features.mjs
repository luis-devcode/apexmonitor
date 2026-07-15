/** Inspeciona os endpoints auxiliares usados pelos módulos do painel. */
const BASE = "https://app.monitorodds.com.br";
const EMAIL = process.env.MO_EMAIL;
const PASS = process.env.MO_PASS;

if (!EMAIL || !PASS) {
  throw new Error("Defina MO_EMAIL e MO_PASS no .env.");
}

const login = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASS }),
});

if (!login.ok) throw new Error(`login falhou (${login.status})`);
const { token } = await login.json();
const cookie = (login.headers.getSetCookie?.() || [])
  .map((value) => value.split(";")[0])
  .join("; ");
const headers = { Authorization: `Bearer ${token}`, Cookie: cookie };

for (const endpoint of ["/api/bookmakers", "/api/super-odds", "/api/match-logos"]) {
  const response = await fetch(`${BASE}${endpoint}`, { headers });
  const payload = await response.json();
  const rootKeys = payload && typeof payload === "object" ? Object.keys(payload) : [];
  const list = Array.isArray(payload)
    ? payload
    : Object.values(payload || {}).find((value) => Array.isArray(value));
  const sample = Array.isArray(list) ? list[0] : payload;

  console.log(`\n=== ${endpoint} (${response.status}) ===`);
  console.log("root keys:", rootKeys.join(", "));
  console.log("list size:", Array.isArray(list) ? list.length : "n/a");
  console.log("sample:", JSON.stringify(sample, null, 2).slice(0, 10000));
}
