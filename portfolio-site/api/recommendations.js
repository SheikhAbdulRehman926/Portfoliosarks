// Vercel serverless function: stores and serves portfolio recommendations in Upstash Redis (REST).
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const PUB = "portfolio:recommendations", PRIV = "portfolio:private";

async function redis(cmd) {
  const r = await fetch(URL_, { method: "POST", headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
const clean = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!URL_ || !TOKEN) return res.status(503).json({ error: "storage_not_configured" });
  try {
    if (req.method === "GET") {
      const raw = await redis(["LRANGE", PUB, 0, 99]);
      return res.status(200).json({ items: raw.map((s) => JSON.parse(s)) });
    }
    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      if (b.website) return res.status(200).json({ ok: true });            // honeypot
      const rec = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: clean(b.name, 80), role: clean(b.role, 120), relationship: clean(b.relationship, 60),
        strengths: clean(b.strengths, 200), rating: Math.min(5, Math.max(1, parseInt(b.rating, 10) || 5)),
        text: clean(b.recommendation || b.text, 1200), ts: Date.now(),
      };
      if (rec.name.length < 2 || rec.text.length < 20) return res.status(400).json({ error: "invalid" });
      const ip = String(req.headers["x-forwarded-for"] || "x").split(",")[0].trim();
      const k = "portfolio:rl:" + ip, n = await redis(["INCR", k]);
      if (n === 1) await redis(["EXPIRE", k, 3600]);
      if (n > 5) return res.status(429).json({ error: "rate_limited" });
      const email = clean(b.email, 120);
      await redis(["LPUSH", PRIV, JSON.stringify({ id: rec.id, email, name: rec.name, ts: rec.ts })]);   // never published
      if (b.publish_permission === false) return res.status(200).json({ ok: true, hidden: true });
      await redis(["LPUSH", PUB, JSON.stringify(rec)]);
      await redis(["LTRIM", PUB, 0, 199]);
      return res.status(200).json({ ok: true, item: rec });
    }
    if (req.method === "DELETE") {                                           // optional moderation
      if (!process.env.ADMIN_KEY || req.headers["x-admin-key"] !== process.env.ADMIN_KEY) return res.status(401).json({ error: "unauthorized" });
      const id = String((req.query && req.query.id) || "");
      const raw = await redis(["LRANGE", PUB, 0, 199]);
      const hit = raw.find((s) => JSON.parse(s).id === id);
      if (hit) await redis(["LREM", PUB, 0, hit]);
      return res.status(200).json({ ok: true, removed: !!hit });
    }
    return res.status(405).json({ error: "method_not_allowed" });
  } catch (e) {
    return res.status(500).json({ error: "server_error" });
  }
};
