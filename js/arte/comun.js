// Lo común del arte del juego: la paleta del teatro (Normandía, verano de 1944), el tamaño de la baldosa y las
// utilidades para pintar una vez en hojas (OffscreenCanvas). Al importarlo no se pinta nada (lo usan también las
// pruebas de Node).
import { rasterize, hex } from '../ui/raster.js';

export const T = 8; // píxeles de dibujo por casilla de 4 m

export const C = {
  pasto: hex('#6b8a3a'), pastoD: hex('#5c7833'), pastoL: hex('#7e9c45'),
  camino: hex('#8f7a55'), caminoD: hex('#76633f'), caminoL: hex('#a38d66'),
  seto: hex('#3f5f28'), setoL: hex('#56783a'), arbol: hex('#35532a'), arbolL: hex('#4a6e34'),
  suelo: hex('#46552c'), pizarra: hex('#5c6370'), teja: hex('#8e5038'), muro: hex('#a39a86'),
  arma: hex('#33302a'), oruga: hex('#2e2d28'), camoV: hex('#5d6b3a'), camoM: hex('#7a5434'),
  humo: hex('#d6d6ce'), humoD: hex('#b9bab2'), fuego: hex('#ffd27a'), fuegoN: hex('#ff8a3d'), fuegoR: hex('#b8401c'),
  crater: hex('#3d3222'), craterL: hex('#5a4a33'),
};
// los colores de cada bando: uniforme y casco (dibujo) y su marcador (interfaz)
export const BANDO = {
  us: { uniforme: hex('#7b6e46'), casco: hex('#5a5a3a'), marca: '#4f8fe0', grande: false },
  de: { uniforme: hex('#5c6553'), casco: hex('#474d45'), marca: '#e0574a', grande: true },
};
// el dibujo de cada carro de js/data/unidades.js (por su id): medidas en píxeles de dibujo
export const DIBUJO_CARRO = {
  sherman: { largo: 23, ancho: 11.5, color: hex('#56603a'), aro: 1, cañon: 15, camo: false, torreta: 'redonda' },
  panzer4: { largo: 23, ancho: 11, color: hex('#b09f68'), aro: -0.5, cañon: 18, camo: true, torreta: 'caja' },
};
// los colores reservados de la interfaz: el estado de cada soldado propio
export const ESTADO = { suprimido: '#ffd23f', acobardado: '#ff8a3d', panico: '#ff3b30' };

// giro de una forma alrededor de (cx, cy), con su normal girada (la luz se queda arriba a la izquierda) y su textura
export function giro(a, cx, cy) {
  const c = Math.cos(a), s = Math.sin(a);
  const inv = (x, y) => [cx + (x - cx) * c + (y - cy) * s, cy - (x - cx) * s + (y - cy) * c];
  const fwd = (x, y) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
  const forma = (f) => {
    const g = (x, y) => { const [u, v] = inv(x, y), h = f(u, v); return h && { ...h, nx: h.nx * c - h.ny * s, ny: h.nx * s + h.ny * c }; };
    if (f.bb) { const [x0, y0, x1, y1] = f.bb, P = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => fwd(x, y)); g.bb = [Math.min(...P.map((p) => p[0])), Math.min(...P.map((p) => p[1])), Math.max(...P.map((p) => p[0])), Math.max(...P.map((p) => p[1]))]; }
    return g;
  };
  const tex = (t) => t && ((x, y, col, h) => { const [u, v] = inv(x, y); return t(u, v, col, h); });
  return { forma, tex, fwd };
}
// una rejilla rasterizada en un lienzo (lo transparente queda transparente)
export function lienzo(R) { const cv = new OffscreenCanvas(R.W, R.H); cv.getContext('2d').putImageData(new ImageData(R.rgba, R.W, R.H), 0, 0); return cv; }
export const pinta = (caja, W, L) => lienzo(rasterize(L, { W, box: caja }));
// la silueta de un dibujo, para su sombra en el suelo
export function silueta(cv) { const s = new OffscreenCanvas(cv.width, cv.height), g = s.getContext('2d'); g.drawImage(cv, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#141a0c'; g.fillRect(0, 0, cv.width, cv.height); return s; }
// un dibujo oscurecido (restos, muertos)
export function oscuro(cv, k = 0.45, col = '#1c1a12') { const s = new OffscreenCanvas(cv.width, cv.height), g = s.getContext('2d'); g.drawImage(cv, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = k; g.fillStyle = col; g.fillRect(0, 0, cv.width, cv.height); return s; }
