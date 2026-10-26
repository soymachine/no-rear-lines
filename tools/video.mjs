// Un vídeo de la partida, para ver cómo se ve y cómo se siente: abre el juego con el arnés (servidor propio, semilla fija,
// ?prueba=1), el bando del jugador sigue el guion del escenario y el otro lo lleva la IA. Graba fotograma a fotograma:
// cada uno avanza el reloj del juego 1/fps s (window.__nrl.fotograma: acumulador, pasos y dibujo interpolado con su alfa)
// y se captura la página entera (con el marcador y los avisos), así que sale fluido y siempre igual aunque el navegador
// vaya lento. Hace de cámara: sigue la acción (los disparos y explosiones recientes, suavizado) y cambia de vista de vez en
// cuando (normal casi siempre, dos tramos de cerca y un vistazo al táctico). ffmpeg lo junta en un .mp4 (H.264, yuv420p).
// Al final comprueba que grabar no cambió la partida: la huella de la página es la de la misma batalla jugada en Node.
// Uso: node tools/video.mjs [--segundos 120] [--desde 50] [--semilla N] [--escenario granja] [--salida /tmp/x.mp4]
//        [--fps 30] [--tamaño 1280x720] [--crf 20]
//   --desde: segundos de partida que se juegan sin grabar (50: la granja empieza con ~70 s de avance; 0, la partida entera)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { Buffer } from 'node:buffer';
import { creaBatalla, aplicaGuion } from '../js/sim/escenario.js';
import { paso, huella } from '../js/sim/partida.js';
import { ia } from '../js/sim/ia.js';

const require = createRequire(import.meta.url);
const H = require('../tests/arnes.cjs');
const FFMPEG = process.env.FFMPEG || '/usr/bin/ffmpeg';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const segundos = +opt('segundos', 120), desde = +opt('desde', 50), fps = +opt('fps', 30), crf = +opt('crf', 20);
const escenario = opt('escenario', 'granja');
const semilla = opt('semilla', null) != null ? +opt('semilla') >>> 0 : H.semilla ?? 1;
const [ancho, alto] = String(opt('tamaño', opt('tamano', '1280x720'))).split('x').map(Number);
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
const salida = path.resolve(opt('salida', path.join(process.env.TMPDIR || os.tmpdir(), `nrl-video-${escenario}-${semilla}-${stamp}.mp4`)));
if (!(segundos > 0 && fps > 0 && ancho > 0 && alto > 0)) { console.error('opciones raras: mira el Uso de la cabecera'); process.exit(1); }
fs.mkdirSync(path.dirname(salida), { recursive: true });

// ---------------------------------------------------------------- el plan de vistas (en segundos de vídeo)
// normal casi todo el rato; dos tramos de cerca y un vistazo corto al táctico, repartidos por el vídeo
const largo = (f, a, b) => Math.max(a, Math.min(b, f * segundos));
const plan = [
  { vista: 'cerca', de: 0.28 * segundos, a: 0.28 * segundos + largo(0.08, 3, 9) },
  { vista: 'tactico', de: 0.5 * segundos, a: 0.5 * segundos + largo(0.03, 2, 4) },
  { vista: 'cerca', de: 0.76 * segundos, a: 0.76 * segundos + largo(0.08, 3, 9) },
];

// ---------------------------------------------------------------- la cámara (corre en la página, en casillas)
// Junta los sucesos recientes como puntos con peso (los disparos poco, las explosiones y los carros rotos mucho) que se
// apagan en unos segundos. El blanco sale de un mean-shift que empieza en el foco de ahora, así que se queda con la escena
// que está mirando mientras siga viva y no salta entre dos tiroteos; si se apaga, va a la más fuerte, y sin nada, a las
// tropas propias. El foco persigue al blanco y la cámara al foco, los dos suavizados y con velocidad tope: sin saltos.
function director({ plan, guion }) {
  const N = window.__nrl, p = N.p, yo = p.escenario.jugador;
  const fuera = new Set(['muerto', 'herido', 'destruido']);
  const mios = () => p.unidades.filter((u) => u.lado === yo && !fuera.has(u.estado));
  const centro = (us) => (us.length ? { x: us.reduce((s, u) => s + u.x, 0) / us.length, y: us.reduce((s, u) => s + u.y, 0) / us.length } : { x: p.m.w / 2, y: p.m.h / 2 });
  const puntos = [];
  let t = 0, vista = 'normal', proxElige = 0, finEn = null;
  let foco = centro(mios()), cam = N.camara(foco.x, foco.y);
  function anota(s) {
    const pon = (x, y, w) => puntos.push({ x, y, w, t });
    const u = (id) => p.porId[id];
    if (s.tipo === 'disparo') { pon(s.x0, s.y0, 1); pon(s.x1, s.y1, 0.5); }
    else if (s.tipo === 'cañonazo') { pon(s.x0, s.y0, 2); pon(s.x1, s.y1, 2); }
    else if (s.tipo === 'explosion' || s.tipo === 'humo') pon(s.x, s.y, 3);
    else if (s.tipo === 'penetra' || s.tipo === 'rebote') pon(u(s.a).x, u(s.a).y, 4);
    else if (s.tipo === 'destruido') pon(u(s.id).x, u(s.id).y, 6);
    else if (s.tipo === 'baja') pon(u(s.id).x, u(s.id).y, 2);
  }
  const peso = (q) => q.w * Math.exp(-(t - q.t) / 2.5);
  function desplaza(c, r) {
    let suma = 0;
    for (let k = 0; k < 5; k++) {
      let sx = 0, sy = 0; suma = 0;
      for (const q of puntos) { const d2 = (q.x - c.x) ** 2 + (q.y - c.y) ** 2, w = peso(q) * Math.exp(-d2 / (2 * r * r)); sx += w * q.x; sy += w * q.y; suma += w; }
      if (suma < 1e-4) break;
      c = { x: sx / suma, y: sy / suma };
    }
    return { c, suma };
  }
  function blanco() {
    while (puntos.length && t - puntos[0].t > 8) puntos.shift();
    const r = (vista === 'cerca' ? 0.18 : 0.3) * innerHeight / 8; // ~ la mitad de lo que se ve, en casillas
    let m = desplaza(foco, r);
    if (m.suma < 0.6 && puntos.length) { const top = puntos.reduce((a, b) => (peso(b) > peso(a) ? b : a)); m = desplaza(top, r); }
    if (m.suma < 0.3) return centro(mios());
    return m.c;
  }
  const sigue = (de, a, tau, vmax, dt) => {
    const k = 1 - Math.exp(-dt / tau); let dx = (a.x - de.x) * k, dy = (a.y - de.y) * k;
    const v = Math.hypot(dx, dy), tope = vmax * dt; if (v > tope) { dx *= tope / v; dy *= tope / v; }
    return { x: de.x + dx, y: de.y + dy };
  };
  window.__director = {
    fotograma(dt) {
      const quiere = (plan.find((q) => t >= q.de && t < q.a) || { vista: 'normal' }).vista;
      if (quiere !== vista) { vista = quiere; N.vista(vista); }
      const b = blanco();
      if (Math.hypot(b.x - foco.x, b.y - foco.y) > 2) foco = sigue(foco, b, 1.2, 16, dt);
      const c = sigue(cam, foco, 0.6, 12, dt);
      cam = N.camara(c.x, c.y); // (vuelve recortada al mapa)
      if (t >= proxElige) { // la ficha: la escuadra (o el carro) propia más cerca de lo que se mira
        proxElige = t + 6;
        const u = mios().sort((a, b2) => Math.hypot(a.x - cam.x, a.y - cam.y) - Math.hypot(b2.x - cam.x, b2.y - cam.y))[0];
        N.elige(u ? (u.tipo === 'carro' ? { carro: u.id } : { escuadra: u.esc }) : null);
      }
      const r = N.fotograma(dt, guion);
      for (const s of r.sucesos) anota(s);
      t += dt;
      if (r.fin && finEn == null) finEn = t;
      return { t: r.t, fin: r.fin, vista, acabado: finEn != null && t - finEn > 4 };
    },
  };
}

// ---------------------------------------------------------------- grabar
const t0 = Date.now();
const b = await H.pw.chromium.launch();
const ctx = await b.newContext({ viewport: { width: ancho, height: alto } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto(H.direccion('index.html', { escenario, semilla, prueba: true }));
await p.waitForFunction(() => window.__nrl && window.__nrl.listo === true, null, { timeout: 20000, polling: 50 });
if (desde > 0) await p.evaluate((n) => window.__nrl.avanza(n, true), Math.round(desde * 10));
await p.evaluate(director, { plan, guion: true });
// la captura, por CDP con optimizeForSpeed: sigue sin pérdida (PNG) y tarda ~33 ms en vez de ~53 de page.screenshot
const cdp = await ctx.newCDPSession(p);
const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-tune', 'animation', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', salida], { stdio: ['pipe', 'inherit', 'inherit'] });
const acabaFF = new Promise((res) => ff.on('close', res));
const total = Math.round(segundos * fps);
let n = 0, ultimo = null;
for (; n < total; n++) {
  ultimo = await p.evaluate((dt) => window.__director.fotograma(dt), 1 / fps);
  const png = Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true })).data, 'base64');
  if (!ff.stdin.write(png)) await new Promise((res) => ff.stdin.once('drain', res));
  if ((n + 1) % (fps * 10) === 0) console.log(`  · ${(n + 1) / fps} s de ${segundos} (partida a los ${(ultimo.t / 10).toFixed(1)} s, ${((Date.now() - t0) / 1000).toFixed(0)} s grabando)`);
  if (ultimo.acabado) { n++; break; }
}
ff.stdin.end();
const codigo = await acabaFF;
// grabar no cambia la partida: la misma batalla, paso a paso en Node, da la misma huella
const enPagina = await p.evaluate(async () => (await import(new URL('js/sim/partida.js', location.href).href)).huella(window.__nrl.p));
const q = creaBatalla(escenario, semilla);
while (q.t < ultimo.t && !q.fin) { aplicaGuion(q); for (const l of q.escenario.ia) ia(q, l); paso(q); }
const enNode = huella(q);
await b.close();
if (codigo !== 0) { console.error(`ffmpeg acabó con ${codigo}`); process.exit(1); }
const dura = +execFileSync(FFMPEG.replace(/ffmpeg$/, 'ffprobe'), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', salida], { encoding: 'utf8' });
const mb = fs.statSync(salida).size / 1048576;
console.log(`vídeo: ${salida}`);
console.log(`  ${dura.toFixed(1)} s, ${n} fotogramas a ${fps} fps, ${ancho}×${alto}, ${mb.toFixed(1)} MB · partida de ${desde} a ${(ultimo.t / 10).toFixed(1)} s, semilla ${semilla}${ultimo.fin ? ` · acabó: gana ${ultimo.fin.ganador} (${ultimo.fin.motivo})` : ''}`);
console.log(`  grabado en ${((Date.now() - t0) / 1000).toFixed(0)} s · huella ${enPagina}${enPagina === enNode ? ' (la misma que sin grabar)' : ` ≠ ${enNode} sin grabar: ¡grabar cambió la partida!`}`);
if (errs.length) console.log(`  errores de la página: ${errs.join(' | ')}`);
process.exit(enPagina === enNode && !errs.length ? 0 : 1);
