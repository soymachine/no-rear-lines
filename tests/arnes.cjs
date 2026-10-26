// El arnés de las pruebas en el navegador. Lo que cada prueba repetiría, en un sitio:
// - Playwright (pw), con el respaldo de /opt/node-tools si no está en el proyecto.
// - Un servidor estático propio en un puerto libre (URL, BASE): `node tests/x.cjs` funciona solo, sin
//   `python3 -m http.server`. Con NRL_URL, se usa esa dirección y no se levanta nada.
// - La semilla: una por prueba, sacada de su nombre (se escribe al empezar). NRL_SEMILLA=n usa otra y NRL_SEMILLA=azar
//   no fija nada. Llega al juego por la URL (?semilla=n) y, como red, Math.random queda sembrado en cada página: la
//   simulación no debe usarlo (CLAUDE.md), pero si algo lo usa, la prueba sigue saliendo igual.
// - partida(opciones) abre el juego como lo pide la prueba y fin(…) la cierra; ok(cond, msg) y fallos() cuentan.
//
// Lo que necesita del juego (el contrato; si el juego cambia, se cambia aquí y nada más):
//   · index.html acepta ?semilla=n (la semilla de la partida) y ?escenario=<id> (empieza directamente en un escenario
//     de prueba, sin menús), y ?prueba=1 (sin intros ni animaciones de espera);
//   · cuando está listo para jugar, window.__nrl.listo === true. Lo demás de window.__nrl (la simulación, pausar,
//     avanzar pasos, dar órdenes) lo define el juego y lo usan las pruebas. Para grabar (tools/video.mjs):
//     window.__nrl.fotograma(dt, guion) avanza dt segundos como un fotograma real (acumulador, pasos, dibujo con su
//     alfa y marcador) y devuelve los sucesos; desde entonces el bucle propio de la página ya no dibuja encima.
//   · las ventanas abiertas llevan la clase .modal y se cierran con Esc.
// La regla de las pruebas: comparar con lo que exporta el juego (sus tablas de datos, sus constantes), no con cifras o
// listas copiadas a mano, que caducan con el primer ajuste de equilibrio.
// Uso, en una prueba: const H = require('./arnes.cjs'); … y `node tests/<prueba>.cjs`. Toda la batería: node tests/todas.mjs
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const { execFileSync } = require('node:child_process');

let real;
try { real = require('playwright'); } catch { real = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright'); }

// ---------------------------------------------------------------- el servidor
const RAIZ = path.join(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.cjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.ico': 'image/x-icon', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webm': 'audio/webm', '.zip': 'application/zip' };
// un servidor estático de una carpeta (lo usa también tests/todas.mjs); devuelve el http.Server sin arrancar
function servidor(raiz = RAIZ) {
  return http.createServer((req, res) => {
    let rel;
    try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
    let f = path.join(raiz, rel);
    if (!f.startsWith(raiz)) { res.writeHead(403).end(); return; }
    fs.stat(f, (err, st) => {
      if (!err && st.isDirectory()) { f = path.join(f, 'index.html'); try { st = fs.statSync(f); err = null; } catch (e) { err = e; } }
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-cache' });
      if (req.method === 'HEAD') { res.end(); return; }
      fs.createReadStream(f).pipe(res);
    });
  });
}
// un puerto libre, sin esperar (la URL se necesita al cargar la prueba)
function puertoLibre() {
  const js = "const s=require('net').createServer();s.listen(0,'127.0.0.1',()=>{process.stdout.write(String(s.address().port));s.close();});";
  return +execFileSync(process.execPath, ['-e', js], { encoding: 'utf8' });
}
let url = process.env.NRL_URL, srv = null;
if (!url) {
  const port = puertoLibre();
  srv = servidor();
  srv.on('error', (e) => { console.error(`arnés: el servidor no arranca en el puerto ${port} (${e.message})`); process.exit(1); });
  srv.listen(port, '127.0.0.1');
  srv.unref(); // (no mantiene vivo el proceso)
  url = `http://localhost:${port}/index.html`;
}
const URL_ = url.replace(/\?.*$/, ''), BASE = URL_.replace(/[^/]*\.html$/, '');

// ---------------------------------------------------------------- la semilla
const nombre = path.basename((require.main && require.main.filename) || 'prueba');
const fnv = (s) => { let h = 0x811c9dc5; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0; return h; };
const SEM = process.env.NRL_SEMILLA;
const semilla = SEM === 'azar' ? null : SEM != null && SEM !== '' ? (+SEM >>> 0) : fnv(nombre);
// mulberry32, en la página antes que el juego (una vez por documento, aunque se ponga en el contexto y en la página)
const conSemilla = (s) => {
  if (window.__semilla != null) return;
  window.__semilla = s;
  let a = s >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
let dicho = false;
const avisa = () => { if (dicho) return; dicho = true; console.log(`  · ${semilla == null ? 'azar de verdad (NRL_SEMILLA=azar)' : `semilla ${semilla} (otra: NRL_SEMILLA=n; sin ella: NRL_SEMILLA=azar)`}`); };
// el navegador: cada contexto y cada página nueva, con la semilla
function conArnes(b) {
  if (semilla == null) { avisa(); return b; }
  const nc = b.newContext.bind(b), np = b.newPage.bind(b);
  b.newContext = async (o) => { const c = await nc(o); await c.addInitScript(conSemilla, semilla); return c; };
  b.newPage = async (o) => { const p = await np(o); await p.addInitScript(conSemilla, semilla); return p; };
  avisa();
  return b;
}
const pw = Object.create(real);
pw.chromium = Object.create(real.chromium);
pw.chromium.launch = async (o) => conArnes(await real.chromium.launch(o));

// ---------------------------------------------------------------- lo de cada prueba
let fails = 0;
const ok = (cond, msg) => { console.log(`${cond ? '  ✓' : '  ✗'} ${msg}`); if (!cond) fails++; };
const fallos = () => fails;
// la dirección de una página del juego con sus parámetros (la semilla de la prueba, si no se da otra)
function direccion(pagina = 'index.html', params = {}) {
  const q = new URLSearchParams();
  if (semilla != null && params.semilla == null) q.set('semilla', String(semilla));
  for (const [k, v] of Object.entries(params)) if (v != null && v !== false) q.set(k, v === true ? '1' : String(v));
  const s = q.toString();
  return BASE + pagina + (s ? '?' + s : '');
}
// abre el juego y espera a que esté listo (window.__nrl.listo); escenario: el id de un escenario de prueba
async function empezar(p, { escenario = null, semilla: s = null, prueba = true, espera = 15000 } = {}) {
  await p.goto(direccion('index.html', { escenario, semilla: s, prueba }));
  await p.waitForFunction(() => window.__nrl && window.__nrl.listo === true, null, { timeout: espera });
}
// cierra las ventanas abiertas con Esc, como el jugador; hasta n, esperando ms entre una y otra
async function cerrarVentanas(p, { n = 8, ms = 120 } = {}) {
  for (let i = 0; i < n && (await p.$('.modal')); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(ms); }
}
// para las pruebas: navegador, contexto, página con los errores recogidos y el juego abierto (empieza: false, sin abrir)
async function partida({ escenario = null, semilla: s = null, viewport = { width: 1440, height: 860 }, empieza = true, consola = true } = {}) {
  const b = await pw.chromium.launch();
  const ctx = await b.newContext({ viewport });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message + '\n' + e.stack));
  if (consola) p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::/.test(m.text())) errs.push(m.text()); });
  if (empieza) await empezar(p, { escenario, semilla: s });
  return { b, ctx, p, errs };
}
// el final de una prueba: sin errores de página, cierra el navegador y sale con 1 si algo falló
async function fin(b, errs = []) {
  ok(!errs.length, `sin errores de página${errs.length ? ': ' + errs[0] : ''}`);
  if (b) await b.close();
  console.log(fails ? `✗ ${fails} fallo(s)` : '✓ todo bien');
  process.exit(fails ? 1 : 0);
}

module.exports = { pw, URL: URL_, BASE, RAIZ, semilla, servidor, direccion, ok, fallos, empezar, cerrarVentanas, partida, fin };
