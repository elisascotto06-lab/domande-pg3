// Politicamente Giovani - raccolta domande per gli eventi
// Nessuna dipendenza esterna: basta Node.js 18 o superiore.
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const REGIA_PASSWORD = process.env.REGIA_PASSWORD || "cambiami";
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "domande.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const MAX_LEN = 400;

if (REGIA_PASSWORD === "cambiami") {
  console.warn("ATTENZIONE: stai usando la password di default. Imposta REGIA_PASSWORD.");
}

fs.mkdirSync(DATA_DIR, { recursive: true });
let stato = { aperte: true, domande: [] };
try {
  stato = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
} catch (_) {}

let saveTimer = null;
function salva() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(DATA_FILE + ".tmp", JSON.stringify(stato), (err) => {
      if (!err) fs.rename(DATA_FILE + ".tmp", DATA_FILE, () => {});
    });
  }, 100);
}

const hash = (s) => crypto.createHash("sha256").update(String(s)).digest();
function autorizzato(req) {
  const given = req.headers["x-regia-password"] || "";
  return crypto.timingSafeEqual(hash(given), hash(REGIA_PASSWORD));
}

// Limite semplice: 5 domande al minuto per indirizzo IP
const recenti = new Map();
function troppeRichieste(ip) {
  const now = Date.now();
  const lista = (recenti.get(ip) || []).filter((t) => now - t < 60000);
  if (lista.length >= 5) {
    recenti.set(ip, lista);
    return true;
  }
  lista.push(now);
  recenti.set(ip, lista);
  return false;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, l] of recenti) if (!l.some((t) => now - t < 60000)) recenti.delete(ip);
}, 60000).unref();

function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}

function leggiBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 10000) {
        reject(new Error("troppo grande"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

const PAGINE = {
  "/": "index.html",
  "/regia": "regia.html",
  "/privacy": "privacy.html",
  "/logo.png": "logo.png",
};
const TIPI = { ".html": "text/html; charset=utf-8", ".png": "image/png" };

const STATI = ["nuova", "selezionata", "letta", "scartata"];

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const p = url.pathname.replace(/\/+$/, "") || "/";

  try {
    // ---- API pubblica ----
    if (req.method === "GET" && p === "/api/stato") {
      return json(res, 200, { aperte: stato.aperte });
    }
    if (req.method === "POST" && p === "/api/domande") {
      if (!stato.aperte) return json(res, 403, { errore: "chiuse" });
      const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress;
      if (troppeRichieste(ip)) return json(res, 429, { errore: "troppe" });
      const body = await leggiBody(req);
      const testo = String(body.testo || "").replace(/\s+/g, " ").trim().slice(0, MAX_LEN);
      if (testo.length < 3) return json(res, 400, { errore: "vuota" });
      stato.domande.push({
        id: crypto.randomUUID(),
        testo,
        stato: "nuova",
        creata: Date.now(),
      });
      salva();
      return json(res, 201, { ok: true });
    }

    // ---- API regia (protetta) ----
    if (p.startsWith("/api/regia")) {
      if (!autorizzato(req)) return json(res, 401, { errore: "password" });

      if (req.method === "GET" && p === "/api/regia/domande") {
        return json(res, 200, { aperte: stato.aperte, domande: stato.domande });
      }
      if (req.method === "POST" && p === "/api/regia/stato") {
        const body = await leggiBody(req);
        stato.aperte = !!body.aperte;
        salva();
        return json(res, 200, { aperte: stato.aperte });
      }
      if (req.method === "POST" && p === "/api/regia/svuota") {
        stato.domande = [];
        salva();
        return json(res, 200, { ok: true });
      }
      const m = p.match(/^\/api\/regia\/domande\/([\w-]+)$/);
      if (m) {
        const d = stato.domande.find((x) => x.id === m[1]);
        if (!d) return json(res, 404, { errore: "non trovata" });
        if (req.method === "POST") {
          const body = await leggiBody(req);
          if (!STATI.includes(body.stato)) return json(res, 400, { errore: "stato" });
          d.stato = body.stato;
          salva();
          return json(res, 200, d);
        }
        if (req.method === "DELETE") {
          stato.domande = stato.domande.filter((x) => x.id !== m[1]);
          salva();
          return json(res, 200, { ok: true });
        }
      }
      return json(res, 404, { errore: "non trovato" });
    }

    // ---- Pagine statiche ----
    if (req.method === "GET" && PAGINE[p]) {
      const file = path.join(PUBLIC_DIR, PAGINE[p]);
      const ext = path.extname(file);
      res.writeHead(200, {
        "Content-Type": TIPI[ext],
        "Cache-Control": ext === ".png" ? "public, max-age=86400" : "no-cache",
      });
      return fs.createReadStream(file).pipe(res);
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Pagina non trovata");
  } catch (e) {
    json(res, 400, { errore: "richiesta non valida" });
  }
});

server.listen(PORT, () => {
  console.log(`Domande:  http://localhost:${PORT}/`);
  console.log(`Regia:    http://localhost:${PORT}/regia`);
});
