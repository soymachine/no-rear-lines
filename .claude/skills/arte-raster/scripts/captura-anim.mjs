// Lámina de fotogramas de una animación (o de un dibujo que gira): una fila por dirección y una columna cada --cada ms,
// cada fotograma con su tiempo. Lo que se mueve no se juzga con una captura fija; con la lámina se ve cuándo sale el
// fogonazo, si el ciclo cierra, si el punto de apoyo baila y si cada dirección se parece a sus vecinas.
// Los fotogramas los da la página en función del tiempo (no se graban en tiempo real), así que salen iguales cada vez.
//
// Uso (desde la raíz; si no hay servidor en NRL_URL, por defecto http://localhost:8000/, lo arranca):
//   node .claude/skills/arte-raster/scripts/captura-anim.mjs <id[,id…]> [carpeta] [opciones]
//     --dirs N|a,b,c  N direcciones repartidas (0 derecha, 90 abajo: la y de la pantalla) o una lista de grados · 1 (0°)
//     --cada MS       un fotograma cada MS · 40
//     --dur MS        hasta qué tiempo · 600
//     --zoom N        aumento de cada fotograma en la lámina · 4
//     --op JSON       opciones para la página (p. ej. '{"acierta":false,"variante":"aliado"}')
// Escribe <carpeta>/<id>.png (la lámina) y <carpeta>/<id>/d<grados>-t<ms>.png (cada fotograma a tamaño real).
//
// Lo que necesita de la página (arte.html):
//   window.__arte.fotograma(id, { t, dir, ...op }) → un <canvas>, un OffscreenCanvas o un dataURL con el fotograma en el
//   instante t (ms desde que empieza) mirando a dir (grados). Siempre del mismo tamaño para un mismo id. Si el id no
//   existe, que lance un error con un texto que lo diga. Opcional: window.__arte.listo (una promesa que espera a las hojas).
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright'); }
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const dirsArg = opt('dirs', '1'), cada = +opt('cada', 40), dur = +opt('dur', 600), zoom = +opt('zoom', 4), op = JSON.parse(opt('op', '{}'));
const [ids, outDir = '/tmp/anim'] = args;
if (!ids) { console.error('Uso: node captura-anim.mjs <id[,id…]> [carpeta] [--dirs N|a,b,c] [--cada MS] [--dur MS] [--zoom N] [--op JSON]'); process.exit(2); }
const DIRS = dirsArg.includes(',') ? dirsArg.split(',').map(Number) : Array.from({ length: +dirsArg }, (_, i) => Math.round((i * 360) / +dirsArg * 10) / 10);
const TIMES = Array.from({ length: Math.floor(dur / cada) + 1 }, (_, i) => i * cada);
const BASE = (process.env.NRL_URL || 'http://localhost:8000/').replace(/[^/]*\.html.*$/, '');

async function up() { try { return (await fetch(BASE + 'arte.html')).ok; } catch { return false; } }
let server = null;
if (!(await up())) {
  server = spawn('python3', ['-m', 'http.server', new URL(BASE).port || '8000'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 50 && !(await up()); i++) await new Promise((r) => setTimeout(r, 100));
  if (!(await up())) { console.error(`no hay ${BASE}arte.html (¿existe la página de arte?)`); server.kill(); process.exit(1); }
}
const b = await pw.chromium.launch();
const errs = [];
try {
  const p = await b.newPage();
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(BASE + 'arte.html');
  await p.waitForFunction(() => window.__arte && typeof window.__arte.fotograma === 'function', null, { timeout: 60000 });
  await p.evaluate(() => window.__arte.listo);
  fs.mkdirSync(outDir, { recursive: true });
  for (const id of ids.split(',')) {
    const r = await p.evaluate(async ({ id, DIRS, TIMES, op }) => {
      const url = (f) => {
        if (typeof f === 'string') return f;
        if (f instanceof HTMLCanvasElement) return f.toDataURL('image/png');
        const c = document.createElement('canvas'); c.width = f.width; c.height = f.height; c.getContext('2d').drawImage(f, 0, 0); return c.toDataURL('image/png');
      };
      try {
        const out = [];
        for (const dir of DIRS) for (const t of TIMES) out.push({ dir, t, png: url(await window.__arte.fotograma(id, { ...op, t, dir })) });
        return { out };
      } catch (e) { return { err: String(e && e.message) }; }
    }, { id, DIRS, TIMES, op });
    if (r.err) { console.error(`${id}: ${r.err}`); process.exitCode = 1; continue; }
    const fdir = path.join(outDir, id);
    fs.mkdirSync(fdir, { recursive: true });
    const list = r.out.map((f) => { const fp = path.join(fdir, `d${f.dir}-t${f.t}.png`); fs.writeFileSync(fp, Buffer.from(f.png.split(',')[1], 'base64')); return [fp, f.dir, f.t]; });
    // la lámina: una fila por dirección, una columna por tiempo, ampliada sin suavizar, sobre el fondo del juego
    const sheet = path.join(outDir, id + '.png');
    const py = spawnSync('python3', ['-c', `
import sys, json
from PIL import Image, ImageDraw
L = json.loads(sys.argv[1]); out = sys.argv[2]; title = sys.argv[3]; z = int(sys.argv[4]); nt = int(sys.argv[5])
ims = [Image.open(f).convert('RGBA') for f, _, _ in L]
w, h = ims[0].size; w, h = w * z, h * z; nd = len(ims) // nt; pad, left, top = 6, 44, 34
S = Image.new('RGBA', (left + nt * (w + pad), top + nd * (h + pad)), (5, 3, 2, 255))
d = ImageDraw.Draw(S); d.text((6, 4), title, fill=(255, 179, 92))
for k, (im, (_, dr, t)) in enumerate(zip(ims, L)):
    r, c = k // nt, k % nt
    x, y = left + c * (w + pad), top + r * (h + pad)
    if r == 0: d.text((x, top - 14), f"{t} ms", fill=(168, 105, 47))
    if c == 0: d.text((4, y + h // 2 - 5), f"{dr:g}°", fill=(168, 105, 47))
    big = im.resize((w, h), Image.NEAREST); S.paste(big, (x, y), big)
S.save(out)
`, JSON.stringify(list), sheet, `${id} · ${DIRS.length} dir. · cada ${cada} ms · x${zoom}${Object.keys(op).length ? ' · ' + JSON.stringify(op) : ''}`, String(zoom), String(TIMES.length)]);
    if (py.status !== 0) { console.error(String(py.stderr)); process.exitCode = 1; continue; }
    console.log(`${sheet} · ${DIRS.length} direcciones × ${TIMES.length} fotogramas`);
  }
} finally {
  await b.close();
  if (server) server.kill();
}
if (errs.length) { console.error('errores de JS:\n' + errs.join('\n')); process.exitCode = 1; }
