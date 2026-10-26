// Toda la batería de pruebas: las del navegador (tests/*.cjs) y las de Node (tests/*.mjs), varias a la vez con un
// servidor propio (el de tests/arnes.cjs: NRL_URL para todas). Lo que falla se repite una vez, sola: si entonces pasa, es
// «inestable» (carga, tiempos); si vuelve a fallar, «falla». Al final, el resumen; sale con 1 si algo falla. Las salidas
// de cada prueba, fuera del repo.
// Qué cuenta como prueba: todo tests/*.cjs y tests/*.mjs salvo arnes.cjs, este archivo y lo que empieza por «_»
// (herramientas que no pasan ni fallan, como la huella de una partida para comparar antes y después).
// Uso: node tests/todas.mjs [trozo del nombre …] [--a-la-vez 3] [--salida <carpeta>]
//   p. ej. node tests/todas.mjs moral carros      (solo las que contengan alguno de esos trozos)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const DIR = path.dirname(new URL(import.meta.url).pathname), RAIZ = path.join(DIR, '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const N = Math.max(1, +opt('--a-la-vez', process.env.NRL_A_LA_VEZ || 3));
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
const OUT = path.resolve(opt('--salida', path.join(process.env.TMPDIR || os.tmpdir(), 'nrl-pruebas', stamp)));
const filtros = args;
const NO = new Set(['arnes.cjs', 'todas.mjs']);
const todas = fs.readdirSync(DIR).filter((f) => /\.(cjs|mjs)$/.test(f) && !NO.has(f) && !f.startsWith('_')).sort();
if (!todas.length) { console.log('no hay pruebas todavía'); process.exit(0); }
const lista = filtros.length ? todas.filter((f) => filtros.some((q) => f.includes(q))) : todas;
if (!lista.length) { console.log('ninguna prueba con esos nombres'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

// un servidor para todas (las que no usan el arnés también leen NRL_URL)
let url = process.env.NRL_URL, srv = null;
if (!url) {
  const { servidor } = require('./arnes.cjs');
  srv = servidor(RAIZ);
  await new Promise((res) => srv.listen(0, '127.0.0.1', res));
  url = `http://localhost:${srv.address().port}/index.html`;
}

const corre = (f, log) => new Promise((res) => {
  const t0 = Date.now();
  const ch = spawn(process.execPath, [path.join(DIR, f)], { cwd: RAIZ, env: { ...process.env, NRL_URL: url } });
  const out = fs.createWriteStream(log);
  ch.stdout.pipe(out); ch.stderr.pipe(out);
  const tope = setTimeout(() => ch.kill('SIGKILL'), 15 * 60 * 1000); // (una prueba colgada no para la batería)
  ch.on('close', (code) => { clearTimeout(tope); res({ f, code: code ?? 1, s: (Date.now() - t0) / 1000 }); });
});

console.log(`${lista.length} pruebas, ${N} a la vez · ${url} · salidas en ${OUT}`);
const res = {};
let next = 0, hechas = 0;
await Promise.all(Array.from({ length: Math.min(N, lista.length) }, async () => {
  while (next < lista.length) {
    const f = lista[next++];
    const r = await corre(f, path.join(OUT, f + '.log'));
    res[f] = r; hechas++;
    if (r.code) console.log(`  ✗ ${f} (${r.s.toFixed(0)} s) · ${hechas}/${lista.length}`);
  }
}));
// lo que falló, otra vez y sola
const malas = lista.filter((f) => res[f].code);
const inestables = [], fallan = [];
for (const f of malas) {
  const r = await corre(f, path.join(OUT, f + '.otra.log'));
  (r.code ? fallan : inestables).push(f);
  console.log(`  ${r.code ? '✗' : '~'} ${f}, sola: ${r.code ? 'vuelve a fallar' : 'pasa'}`);
}
if (srv) srv.close();
const pasan = lista.length - malas.length;
console.log(`\n${pasan} pasan · ${inestables.length} inestables${inestables.length ? ` (${inestables.join(', ')})` : ''} · ${fallan.length} fallan${fallan.length ? ` (${fallan.join(', ')})` : ''}`);
for (const f of fallan) {
  const t = fs.readFileSync(path.join(OUT, f + '.otra.log'), 'utf8').split('\n').filter((l) => /✗|Error|error:/.test(l)).slice(0, 3);
  console.log(`  ${f}:\n${t.map((l) => '    ' + l.trim().slice(0, 200)).join('\n')}`);
}
fs.writeFileSync(path.join(OUT, 'resumen.json'), JSON.stringify({ url, a_la_vez: N, pasan, inestables, fallan, tiempos: Object.fromEntries(Object.values(res).map((r) => [r.f, r.s])) }, null, 1));
process.exit(fallan.length ? 1 : 0);
