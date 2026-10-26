// Capturas de la prueba de escala (prototipos/escala/index.html), cada una con sus parámetros, para mirarlas con Read.
// Uso (desde la raíz): node prototipos/escala/captura.mjs <carpeta> "nombre|parámetros[|ancho|alto]" …
//   p. ej. node prototipos/escala/captura.mjs /tmp/escala "b8|baldosa=8&res=640x360" "mapa|vista=mapa&x=4"
// La ventana es de 1920×1080 si no se dice otra. Si no hay servidor en NRL_URL (por defecto http://localhost:8000/),
// arranca uno (python3 -m http.server) y lo para al acabar. Las capturas, fuera del repo.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright'); }
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [out, ...casos] = process.argv.slice(2);
if (!out || !casos.length) { console.error('Uso: node prototipos/escala/captura.mjs <carpeta> "nombre|parámetros[|ancho|alto]" …'); process.exit(2); }
const BASE = (process.env.NRL_URL || 'http://localhost:8000/').replace(/[^/]*\.html.*$/, '');
const up = async () => { try { return (await fetch(BASE + 'prototipos/escala/index.html')).ok; } catch { return false; } };
let server = null;
if (!(await up())) {
  server = spawn('python3', ['-m', 'http.server', new URL(BASE).port || '8000'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 50 && !(await up()); i++) await new Promise((r) => setTimeout(r, 100));
}
mkdirSync(out, { recursive: true });
const b = await pw.chromium.launch();
try {
  for (const c of casos) {
    const [nombre, q = '', vw, vh] = c.split('|');
    const p = await b.newPage({ viewport: { width: +vw || 1920, height: +vh || 1080 } });
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(`${BASE}prototipos/escala/index.html?${q}`);
    try { await p.waitForFunction(() => window.__listo, null, { timeout: 60000 }); } catch { errs.push('no termina de dibujar'); }
    const f = path.join(out, nombre + '.png');
    await (await p.$('#pantalla')).screenshot({ path: f });
    console.log(`${f} · ${await p.evaluate(() => document.getElementById('info').textContent)}${errs.length ? ' · ERRORES: ' + errs.join(' | ') : ''}`);
    if (errs.length) process.exitCode = 1;
    await p.close();
  }
} finally {
  await b.close();
  if (server) server.kill();
}
