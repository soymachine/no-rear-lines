// Lo común a los scripts de la skill sonido: el índice del banco (sounds/bank.json y sounds/mix.json, si existen),
// resolver una clave y su volumen, Playwright y las medidas de un AudioBuffer (en la página: el decodificador y el
// WebAudio son los del navegador, los mismos que usará el juego). Sin banco, los scripts miden archivos sueltos.
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import path from 'node:path';

const require = createRequire(import.meta.url);
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const SOUNDS = path.join(ROOT, 'sounds');
export const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);

// argumentos: --clave valor y --bandera; lo demás, en orden
export function parseArgs(argv, flags = []) {
  const a = [...argv], o = {}, rest = [];
  while (a.length) {
    const x = a.shift();
    if (x.startsWith('--')) { const k = x.slice(2); if (flags.includes(k)) o[k] = true; else o[k] = a.shift(); } else rest.push(x);
  }
  return { o, rest };
}

// ---------------------------------------------------------------- el banco
// sounds/bank.json: { keys: { clave: [rutas relativas a sounds/] } }. sounds/mix.json: { vol: { clave: volumen },
// porTipo: { tipo: volumen } (el tipo es lo que va antes del primer punto: «shot», «step», «amb»…), buses: { maestro,
// efectos, ambiente } }. Todo opcional. Si el juego guarda el banco de otra forma, esto se cambia aquí y nada más.
const readJson = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
export async function loadBank() {
  const bank = readJson(path.join(SOUNDS, 'bank.json')), mix = readJson(path.join(SOUNDS, 'mix.json')) || {};
  const MAP = { ...((bank && bank.keys) || {}) };
  const resolve = (key) => { // «a.b.c» → «a.b» → «a»; los ambientes no bajan de «amb.x»
    let k = key;
    while (k) {
      if (MAP[k] && MAP[k].length) return k;
      const i = k.lastIndexOf('.');
      if (i < 0 || (k.startsWith('amb.') && k.split('.').length <= 2)) return null;
      k = k.slice(0, i);
    }
    return null;
  };
  const hasExact = (k) => !!(MAP[k] && MAP[k].length);
  const MIX = mix.vol || {}, TIPO = mix.porTipo || {};
  const volOf = (key) => { const k = resolve(key) || key; return MIX[k] ?? MIX[key] ?? TIPO[k.split('.')[0]] ?? 0.7; };
  return { MAP, MIX, mix, resolve, hasExact, volOf };
}
// lo que multiplica a una clave hasta la salida, con los ajustes por defecto: el bus (efectos o ambiente) y el maestro.
// Así «en juego» de mide-sonido.mjs compara claves entre sí. Los valores, los de sounds/mix.json «buses» si los hay
const BUSES = { maestro: 0.5, efectos: 1, ambiente: 0.6, ...((readJson(path.join(SOUNDS, 'mix.json')) || {}).buses || {}) };
export const MASTER = BUSES.maestro;
export const busOf = (key) => (key.startsWith('amb.') ? BUSES.ambiente : BUSES.efectos) * MASTER;

// ---------------------------------------------------------------- servidor y navegador
export async function launch() {
  let pw;
  try { pw = require('playwright'); } catch { pw = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright'); }
  const b = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  return b;
}
// un servidor en NRL_URL (por defecto http://localhost:8000/); si no hay, arranca python3 -m http.server y lo para al acabar
export async function server() {
  const BASE = (process.env.NRL_URL || 'http://localhost:8000/').replace(/index\.html$/, '');
  const up = async () => { try { return (await fetch(BASE + 'index.html')).ok; } catch { return false; } };
  let proc = null;
  if (!(await up())) {
    proc = spawn('python3', ['-m', 'http.server', new URL(BASE).port || '8000'], { cwd: ROOT, stdio: 'ignore' });
    for (let i = 0; i < 50 && !(await up()); i++) await new Promise((r) => setTimeout(r, 100));
  }
  return { BASE, stop: () => { if (proc) proc.kill(); } };
}

// ---------------------------------------------------------------- medidas (corre en la página: page.addInitScript(instalar))
// window.__mide(buf, { png }) → { dur, ch, sr, peak, rms, hit, loud, lead, tail, clips, dc, side, seam, seamLvl, cent, bands, png }
// window.__wav(buf) → WAV de 16 bits en base64. window.__dec(b64) → AudioBuffer (a 44,1 kHz)
export function instalar() {
  const dB = (v) => (v > 1e-6 ? 20 * Math.log10(v) : -120);
  // FFT de base 2 en su sitio (re, im)
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) {
      const a = (-2 * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
          re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
  }
  window.__dec = async (b64) => {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return new OfflineAudioContext(1, 1, 44100).decodeAudioData(bin.buffer);
  };
  window.__mide = (buf, o = {}) => {
    const sr = buf.sampleRate, n = buf.length, C = buf.numberOfChannels, ch = [...Array(C)].map((_, c) => buf.getChannelData(c));
    const mono = new Float32Array(n);
    let peak = 0, sum = 0, dc = 0, clips = 0, run = 0, side = 0;
    for (let i = 0; i < n; i++) {
      let m = 0, s = 0;
      for (let c = 0; c < C; c++) { const x = ch[c][i]; const ax = Math.abs(x); if (ax > m) m = ax; sum += x * x; dc += x; s += x; }
      mono[i] = s / C;
      if (m > peak) peak = m;
      if (m >= 0.999) run++; else { if (run >= 2) clips++; run = 0; }
      if (C === 2) { const d = Math.abs(ch[0][i] - ch[1][i]); if (d > side) side = d; }
    }
    if (run >= 2) clips++;
    // la ventana más fuerte: 50 ms (el golpe) y 400 ms (la sonoridad corta)
    const win = (sec) => { const L = Math.max(1, Math.round(sr * sec)); if (L >= n) return Math.sqrt(sum / (n * C)); let acc = 0, best = 0; const e = (i) => { let s = 0; for (let c = 0; c < C; c++) s += ch[c][i] * ch[c][i]; return s / C; }; for (let i = 0; i < n; i++) { acc += e(i); if (i >= L) acc -= e(i - L); if (i >= L - 1 && acc > best) best = acc; } return Math.sqrt(best / L); };
    const th = 0.001; // −60 dBFS
    let a = 0, b = n - 1;
    const loud = (i) => ch.some((d) => Math.abs(d[i]) > th);
    while (a < n && !loud(a)) a++;
    while (b > a && !loud(b)) b--;
    // la costura del bucle como la hace el juego (soundbank.js loopBounds): salta el relleno (< 1e-4) de hasta 0,1 s
    const lim = Math.min(n >> 2, Math.round(sr * 0.1)), lz = (i) => ch.some((d) => Math.abs(d[i]) > 1e-4);
    let l0 = 0, l1 = n - 1;
    while (l0 < lim && !lz(l0)) l0++;
    while (l1 > n - 1 - lim && !lz(l1)) l1--;
    let seam = 0; for (let c = 0; c < C; c++) seam = Math.max(seam, Math.abs(ch[c][l1] - ch[c][l0]));
    const rmsOf = (i0, i1) => { let s = 0, k = 0; for (let i = Math.max(0, i0); i < Math.min(n, i1); i++) for (let c = 0; c < C; c++) { s += ch[c][i] * ch[c][i]; k++; } return Math.sqrt(s / Math.max(1, k)); };
    const h = Math.round(sr * 0.5), seamLvl = dB(rmsOf(l1 - h, l1)) - dB(rmsOf(l0, l0 + h));
    // espectro medio de las ventanas con sonido: brillo (centroide) y reparto por bandas
    const N = 2048, P = new Float64Array(N / 2);
    let wins = 0;
    const step = Math.max(N / 2, Math.floor((n - N) / 48));
    for (let s0 = 0; s0 + N <= n; s0 += step) {
      let e = 0; for (let i = 0; i < N; i++) e += mono[s0 + i] * mono[s0 + i];
      if (Math.sqrt(e / N) < 0.01) continue; // −40 dBFS: no cuenta el silencio
      const re = new Float64Array(N), im = new Float64Array(N);
      for (let i = 0; i < N; i++) re[i] = mono[s0 + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
      fft(re, im);
      for (let k = 0; k < N / 2; k++) P[k] += re[k] * re[k] + im[k] * im[k];
      wins++;
    }
    const EDGES = [0, 250, 2000, 8000, sr / 2];
    let tot = 0, cw = 0; const band = [0, 0, 0, 0];
    for (let k = 1; k < N / 2; k++) { const f = (k * sr) / N; tot += P[k]; cw += P[k] * f; for (let j = 0; j < 4; j++) if (f >= EDGES[j] && f < EDGES[j + 1]) band[j] += P[k]; }
    const r = {
      dur: n / sr, ch: C, sr, peak: dB(peak), rms: dB(Math.sqrt(sum / (n * C))), hit: dB(win(0.05)), loud: dB(win(0.4)),
      lead: a >= n ? null : (a / sr) * 1000, tail: a >= n ? null : ((n - 1 - b) / sr) * 1000, clips, dc: dc / (n * C),
      side: C === 2 ? dB(side) : null, seam: dB(seam), seamLvl, cent: wins && tot ? cw / tot : null,
      bands: wins && tot ? band.map((x) => Math.round((100 * x) / tot)) : null,
    };
    if (o.png) { // la onda (máximo y mínimo por columna), con la raya de −1 dBFS y el principio y el final del sonido
      const W = 900, H = 120 * C, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const g = cv.getContext('2d'); g.fillStyle = '#16181c'; g.fillRect(0, 0, W, H);
      for (let c = 0; c < C; c++) {
        const y0 = c * 120 + 60, d = ch[c];
        g.strokeStyle = '#3a3f48'; g.beginPath(); g.moveTo(0, y0); g.lineTo(W, y0); g.stroke();
        const lim1 = 0.891 * 58; g.strokeStyle = '#7a3030'; g.beginPath(); g.moveTo(0, y0 - lim1); g.lineTo(W, y0 - lim1); g.moveTo(0, y0 + lim1); g.lineTo(W, y0 + lim1); g.stroke();
        g.strokeStyle = '#e8d9b0';
        for (let x = 0; x < W; x++) { let mn = 0, mx = 0; for (let i = Math.floor((x * n) / W); i < Math.floor(((x + 1) * n) / W); i++) { if (d[i] < mn) mn = d[i]; if (d[i] > mx) mx = d[i]; } g.beginPath(); g.moveTo(x + 0.5, y0 - mx * 58); g.lineTo(x + 0.5, y0 - mn * 58 + 1); g.stroke(); }
      }
      g.fillStyle = '#5fb0ff'; if (a < n) { g.fillRect((a / n) * W, 0, 1, H); g.fillRect((b / n) * W, 0, 1, H); }
      g.fillStyle = '#9aa3ad'; g.font = '11px monospace'; g.fillText(`${r.dur.toFixed(2)} s · pico ${r.peak.toFixed(1)} dB · golpe ${r.hit.toFixed(1)} dB`, 6, 12);
      r.png = cv.toDataURL('image/png').split(',')[1];
    }
    return r;
  };
  window.__wav = (buf) => {
    const C = buf.numberOfChannels, n = buf.length, sr = buf.sampleRate, ab = new ArrayBuffer(44 + n * C * 2), v = new DataView(ab);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * C * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, C, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * C * 2, true); v.setUint16(32, C * 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * C * 2, true);
    const chs = [...Array(C)].map((_, c) => buf.getChannelData(c));
    for (let i = 0, o = 44; i < n; i++) for (let c = 0; c < C; c++, o += 2) v.setInt16(o, Math.max(-1, Math.min(1, chs[c][i])) * 0x7fff, true);
    let s = ''; const u = new Uint8Array(ab); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
    return btoa(s);
  };
}

// ---------------------------------------------------------------- tabla y comparación
const f1 = (x, d = 1) => (x == null ? '—' : Number.isFinite(x) ? x.toFixed(d) : String(x));
// avisos según el formato de la skill sonido (kind: «sfx», «loop» o «detail»). Un MP3
// lleva ~25 ms casi en silencio delante (el retardo del codificador LAME: unas 1105 muestras que el navegador no quita):
// eso no cuenta como silencio del sonido
export const MP3_DELAY = 26;
export function avisos(r, kind, mp3 = false) {
  const A = [];
  if (r.clips) A.push(`recorta (${r.clips})`);
  else if (r.peak > -0.3) A.push('pico casi a 0 dB');
  if (r.peak < -12) A.push('muy flojo');
  if (r.lead == null) A.push('silencio');
  const lead = r.lead - (mp3 ? MP3_DELAY : 0);
  if (kind === 'sfx' && lead > 15) A.push(`silencio delante (${Math.round(r.lead)} ms${mp3 ? ', ~25 del MP3' : ''})`);
  if (kind === 'sfx' && r.ch === 2) A.push(r.side < -60 ? 'estéreo idéntico (mejor mono)' : 'estéreo');
  if (kind === 'loop' && r.ch === 1) A.push('bucle mono');
  if (kind === 'loop' && r.seam > -30) A.push(`costura con salto (${r.seam.toFixed(0)} dB)`);
  if (kind === 'loop' && Math.abs(r.seamLvl) > 3) A.push(`nivel distinto al cerrar (${r.seamLvl.toFixed(1)} dB)`);
  if (Math.abs(r.dc) > 0.01) A.push('continua (DC)');
  return A;
}
export const kindOf = (k) => (!k ? 'sfx' : k.startsWith('amb.detalle') ? 'detail' : k.startsWith('amb.') ? 'loop' : 'sfx');
export const COLS = ['dur', 'ch', 'peak', 'rms', 'hit', 'loud', 'lead', 'tail', 'cent'];
export function linea(r) {
  const b = r.bands ? r.bands.join('/') : '—';
  return `${f1(r.dur, 2).padStart(6)} s ${String(r.ch)}c  pico ${f1(r.peak).padStart(6)}  rms ${f1(r.rms).padStart(6)}  golpe ${f1(r.hit).padStart(6)}  400ms ${f1(r.loud).padStart(6)}  ` +
    `ini ${f1(r.lead, 0).padStart(4)} fin ${f1(r.tail, 0).padStart(5)} ms  brillo ${f1(r.cent, 0).padStart(5)} Hz  bandas ${b}`;
}
// lo que cambia entre dos medidas del mismo archivo (antes → después)
export function delta(a, b) {
  const out = [];
  for (const k of ['dur', 'peak', 'rms', 'hit', 'loud', 'lead', 'tail', 'cent', 'enJuego']) {
    if (a[k] == null || b[k] == null) continue;
    const d = b[k] - a[k], tol = k === 'dur' ? 0.01 : k === 'cent' ? 25 : k === 'lead' || k === 'tail' ? 2 : 0.2;
    if (Math.abs(d) > tol) out.push(`${k} ${f1(a[k], k === 'dur' ? 2 : 1)}→${f1(b[k], k === 'dur' ? 2 : 1)}`);
  }
  if (JSON.stringify(a.bands) !== JSON.stringify(b.bands)) out.push(`bandas ${a.bands} → ${b.bands}`);
  return out;
}
export { f1, existsSync };
