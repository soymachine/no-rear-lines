// Mide los sonidos grabados del banco (o archivos sueltos) sin oírlos: duración, canales, pico, RMS, el golpe (la
// ventana de 50 ms más fuerte), la sonoridad corta (400 ms), el silencio delante y detrás, los recortes, el brillo
// (centroide del espectro) y el reparto por bandas (graves < 250 Hz / medios < 2 kHz / agudos < 8 kHz / brillo), la
// costura de los bucles tal como la hace el juego, el volumen de la clave (sounds/mix.json o el de su tipo) y lo fuerte
// que sale en el juego con los ajustes por defecto (el golpe más el volumen de la clave, del bus y del maestro; sin contar
// la distancia ni la variación al azar). Avisa de lo que no cumple el formato de la skill sonido.
// Decodifica con el navegador (Playwright), como el juego: no hace falta ffmpeg ni servidor.
// Uso (desde la raíz del repo):
//   node .claude/skills/sonido/scripts/mide-sonido.mjs <clave|prefijo|archivo>… [--json salida.json] [--antes antes.json]
//        [--png carpeta] [--todo]
//   · una clave exacta («shot.fusil»), o un prefijo que coge todas las suyas («shot», «amb», «step»), si hay banco;
//   · una clave sin archivos suena con la más general (step.grava → step): sale con «→ step»;
//   · un archivo (ruta con / o con extensión de audio): se mide tal cual, esté donde esté;
//   · --todo: todo el banco; --json: guarda las medidas; --antes: compara con unas guardadas (antes y después de un
//     cambio); --png: la onda de cada archivo en <carpeta>/<clave>__<archivo>.png (míralas con Read).
// Las salidas van al scratchpad o a /tmp, nunca al repo.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { loadBank, launch, instalar, parseArgs, avisos, kindOf, linea, delta, busOf, SOUNDS, f1 } from './comun.mjs';

const { o, rest } = parseArgs(process.argv.slice(2), ['todo']);
if (!rest.length && !o.todo) { console.error('Uso: node mide-sonido.mjs <clave|prefijo|archivo>… [--json f] [--antes f] [--png dir] [--todo]'); process.exit(2); }
const B = await loadBank();
const isFile = (x) => x.includes('/') || /\.(mp3|ogg|wav|m4a|webm|opus|flac|aiff?)$/i.test(x);

// qué medir: [{ key, used, file (ruta en disco), rel }]
const jobs = [];
const keys = Object.keys(B.MAP).sort();
const wanted = o.todo ? keys : [];
for (const x of rest) {
  if (isFile(x)) { jobs.push({ key: null, used: null, file: path.resolve(x), rel: x }); continue; }
  const pre = keys.filter((k) => k === x || k.startsWith(x + '.'));
  if (pre.length) wanted.push(...pre);
  else { const r = B.resolve(x); if (r) wanted.push(x); else console.log(`· ${x}: sin grabación (ni la clave ni una más general): suena la síntesis, si la hay`); }
}
for (const k of [...new Set(wanted)]) { const used = B.resolve(k); for (const rel of B.MAP[used] || []) jobs.push({ key: k, used, file: path.join(SOUNDS, rel), rel }); }
if (!jobs.length) process.exit(0);

const b = await launch();
const p = await b.newPage();
await p.addInitScript(instalar);
await p.goto('about:blank');
await p.evaluate(instalar);
if (o.png) mkdirSync(o.png, { recursive: true });
const out = [];
let last = null;
for (const j of jobs) {
  let r;
  try {
    const b64 = readFileSync(j.file).toString('base64');
    r = await p.evaluate(async ([s, png]) => window.__mide(await window.__dec(s), { png }), [b64, !!o.png]);
  } catch (e) { console.log(`✗ ${j.rel}: no se puede leer o decodificar (${e.message.split('\n')[0]})`); continue; }
  const kind = kindOf(j.key || (j.rel.includes('/amb/') ? 'amb.x' : null));
  const vol = j.key ? B.volOf(j.key) : null;
  r.vol = vol;
  r.enJuego = vol != null ? r.hit + 20 * Math.log10(vol * busOf(j.key)) : null;
  r.avisos = avisos(r, kind, /\.mp3$/i.test(j.rel));
  if (o.png && r.png) writeFileSync(path.join(o.png, `${(j.key || 'archivo').replace(/[^\w.-]/g, '_')}__${path.basename(j.rel).replace(/\.[^.]+$/, '')}.png`), Buffer.from(r.png, 'base64'));
  delete r.png;
  const head = j.key && j.key !== last ? `\n${j.key}${j.used !== j.key ? ` → ${j.used}` : ''}  (${B.MAP[j.used].length} variante${B.MAP[j.used].length > 1 ? 's' : ''} · vol ${f1(vol, 2)}${B.MIX[j.used] != null ? ' de mix.json' : ''})` : null;
  if (head) console.log(head);
  last = j.key;
  console.log(`  ${path.basename(j.rel).padEnd(34)} ${linea(r)}${r.enJuego != null ? `  en juego ${f1(r.enJuego).padStart(6)}` : ''}${r.avisos.length ? '  ⚠ ' + r.avisos.join(', ') : ''}`);
  out.push({ key: j.key, used: j.used, file: j.rel, ...r });
}
await b.close();

// resumen por clave: lo fuerte que sale en el juego (de la variante más floja a la más fuerte) y si las variantes se parecen
const by = {};
for (const r of out) if (r.key) (by[r.key] = by[r.key] || []).push(r);
const many = Object.entries(by).filter(([, L]) => L.length > 1);
if (many.length) {
  console.log('\nVariantes por clave (en juego: golpe + volumen de la clave, del bus y del maestro; brillo en Hz):');
  for (const [k, L] of many) {
    const g = L.map((r) => r.enJuego), c = L.map((r) => r.cent || 0), d = L.map((r) => r.dur);
    const spread = Math.max(...g) - Math.min(...g);
    console.log(`  ${k.padEnd(30)} en juego ${f1(Math.min(...g))}…${f1(Math.max(...g))} (${f1(spread)} dB)  brillo ${f1(Math.min(...c), 0)}…${f1(Math.max(...c), 0)}  dur ${f1(Math.min(...d), 2)}…${f1(Math.max(...d), 2)} s${spread > 6 ? '  ⚠ variantes muy desiguales' : ''}`);
  }
}
if (o.json) { writeFileSync(o.json, JSON.stringify(out, null, 1)); console.log(`\nMedidas en ${o.json}`); }
if (o.antes) {
  const A = JSON.parse(readFileSync(o.antes, 'utf8')), idx = new Map(A.map((r) => [r.file, r]));
  console.log(`\nComparado con ${o.antes}:`);
  let n = 0;
  for (const r of out) {
    const a = idx.get(r.file);
    if (!a) { console.log(`  + ${r.file} (nuevo)`); n++; continue; }
    idx.delete(r.file);
    const d = delta(a, r);
    if (d.length) { console.log(`  ~ ${r.file}: ${d.join(' · ')}`); n++; }
  }
  for (const f of idx.keys()) { console.log(`  − ${f} (ya no está)`); n++; }
  if (!n) console.log('  igual');
}
