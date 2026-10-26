// Captura del arte del juego tal como sale en la página de arte (arte.html): la lámina entera de una sección y cada
// dibujo suelto a su tamaño real (1 píxel del dibujo = 1 píxel del PNG, sacado del <canvas>, sin ampliar).
// Uso (desde la raíz del repo):
//   node .claude/skills/arte-raster/scripts/captura.mjs <sección> [carpeta] [--solo id1,id2] [--zoom 1-4] [--estilo anterior]
// Escribe <carpeta>/<sección>.png (la lámina) y <carpeta>/<sección>/<id>.png (cada dibujo). --solo filtra por el id exacto
// (el texto pequeño de la ficha) o por un trozo del nombre. Si no hay servidor en NRL_URL (por defecto
// http://localhost:8000/), arranca uno (python3 -m http.server) y lo para al acabar.
//
// Lo que necesita de la página (arte.html#<sección>, con ?estilo=anterior si se pide; el zoom llega en localStorage
// «arte.zoom»):
//   · una ficha por dibujo: <figure class="ar-card"><canvas>…</canvas><figcaption>Nombre <small>id</small></figcaption></figure>
//     (el <canvas> a tamaño de rejilla, ampliado con CSS);
//   · cuando ha pintado todas, document.documentElement.dataset.arte = 'listo';
//   · si la sección no existe, location.hash dice la que ha salido.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright'); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const solo = (opt('solo', '') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const zoom = Number(opt('zoom', 2)) || 2, estilo = opt('estilo', '');
const [sec, outDir = '/tmp/arte'] = args;
if (!sec) { console.error('Uso: node captura.mjs <sección> [carpeta] [--solo id1,id2] [--zoom N] [--estilo anterior]'); process.exit(2); }
const BASE = (process.env.NRL_URL || 'http://localhost:8000/').replace(/[^/]*\.html.*$/, '');

async function up() { try { return (await fetch(BASE + 'arte.html')).ok; } catch { return false; } }
let server = null;
if (!(await up())) {
  const port = new URL(BASE).port || '8000';
  server = spawn('python3', ['-m', 'http.server', port], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 50 && !(await up()); i++) await new Promise((r) => setTimeout(r, 100));
  if (!(await up())) { console.error(`no hay ${BASE}arte.html (¿existe la página de arte?)`); server.kill(); process.exit(1); }
}

const b = await pw.chromium.launch();
try {
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.addInitScript((z) => { try { localStorage.setItem('arte.zoom', String(z)); } catch { /* */ } }, zoom);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::/.test(m.text())) errs.push(m.text()); });
  await p.goto(BASE + 'arte.html' + (estilo ? '?estilo=' + estilo : '') + '#' + sec);
  await p.waitForFunction(() => document.documentElement.dataset.arte === 'listo', null, { timeout: 120000 });
  const real = await p.evaluate(() => location.hash.slice(1).split('/')[0]);
  if (real !== sec) console.warn(`(la sección «${sec}» no existe: sale «${real}»)`);
  mkdirSync(path.join(outDir, sec), { recursive: true });
  const cards = await p.evaluate(() => [...document.querySelectorAll('.ar-card')].map((f) => {
    const cv = f.querySelector('canvas'), cap = f.querySelector('figcaption'), sub = cap && cap.querySelector('small');
    const title = cap ? (sub ? cap.firstChild.textContent : cap.textContent).trim() : '';
    return { title, id: sub ? sub.textContent.trim() : '', png: cv ? cv.toDataURL('image/png') : null, W: cv ? cv.width : 0, H: cv ? cv.height : 0 };
  }));
  const used = new Set(), saved = [];
  for (const c of cards) {
    if (solo.length && !solo.some((s) => c.id.toLowerCase() === s || c.title.toLowerCase().includes(s))) continue;
    if (!c.png) { console.warn(`  sin dibujo: ${c.title} ${c.id}`); continue; }
    let name = (c.id && /^[\w.-]+$/.test(c.id) ? c.id : (c.title + (c.id ? '-' + c.id : ''))).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').replace(/^_|_$/g, '');
    for (let k = 2; used.has(name); k++) name = name.replace(/_\d+$/, '') + '_' + k;
    used.add(name);
    const f = path.join(outDir, sec, name + '.png');
    writeFileSync(f, Buffer.from(c.png.split(',')[1], 'base64'));
    saved.push(`${f}  ${c.W}×${c.H}  ${c.title}`);
  }
  const sheet = path.join(outDir, sec + '.png');
  await (await p.$('main') || p).screenshot({ path: sheet, fullPage: !(await p.$('main')) });
  console.log(`lámina: ${sheet} (${cards.length} dibujos, ×${zoom})`);
  console.log(saved.length ? saved.join('\n') : '(ningún dibujo coincide con --solo)');
  if (errs.length) { console.log('errores en la página:'); for (const e of errs) console.log('  ' + e); process.exitCode = 1; }
} finally {
  await b.close();
  if (server) server.kill();
}
