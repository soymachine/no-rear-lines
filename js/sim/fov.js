// Campo de visión: shadowcasting recursivo (8 octantes)
const MULT = [
  [1, 0, 0, -1, -1, 0, 0, 1],
  [0, 1, -1, 0, 0, -1, 1, 0],
  [0, 1, 1, 0, 0, -1, -1, 0],
  [1, 0, 0, 1, -1, 0, 0, -1],
];

// Lo que se ve, redondo en pantalla (fase 77): las casillas miden 10×18 px (alto / ancho ≈ 1,8), así que un círculo
// contado en casillas sale alto y estrecho. La visión cuenta la distancia con la misma área de siempre, estirada a lo
// ancho (×√1,8) y encogida a lo alto (÷√1,8): con radio R se ven R·1,34 casillas a los lados y R/1,34 arriba y abajo.
// computeFOV(…, k = VIEW_K) la usa (y visit recibe esa distancia); sin k (o k = 1), la de siempre (línea de tiro…).
export const VIEW_K = 1.8;
const SK = Math.sqrt(VIEW_K);
export const viewDist = (dx, dy, k = VIEW_K) => (k === 1 ? Math.hypot(dx, dy) : Math.sqrt((dx * dx) / k + dy * dy * k));
// (x, y) desplazado desde (x0, y0) hacia (x1, y1) hasta quedar a distancia de vista r (o igual, si ya está dentro)
export function clampView(x0, y0, x1, y1, r) {
  const d = viewDist(x1 - x0, y1 - y0);
  if (d <= r) return [x1, y1];
  const f = r / d;
  return [Math.round(x0 + (x1 - x0) * f), Math.round(y0 + (y1 - y0) * f)];
}

export function computeFOV(ox, oy, radius, opaque, visit, k = 1) {
  visit(ox, oy, 0);
  for (let oct = 0; oct < 8; oct++) {
    castLight(ox, oy, 1, 1.0, 0.0, radius, MULT[0][oct], MULT[1][oct], MULT[2][oct], MULT[3][oct], opaque, visit, k);
  }
}

function castLight(cx, cy, row, start, end, radius, xx, xy, yx, yy, opaque, visit, k) {
  if (start < end) return;
  const r2 = radius * radius;
  // las filas del octante van a lo ancho (xy ≠ 0) o a lo alto: con la distancia de vista, hasta R·√k o R/√k
  const top = k === 1 ? radius : Math.ceil(radius * (k === VIEW_K ? (xy ? SK : 1 / SK) : xy ? Math.sqrt(k) : 1 / Math.sqrt(k)));
  let newStart = 0;
  for (let j = row; j <= top; j++) {
    let dx = -j - 1;
    const dy = -j;
    let blocked = false;
    while (dx <= 0) {
      dx += 1;
      const X = cx + dx * xx + dy * xy;
      const Y = cy + dx * yx + dy * yy;
      const lSlope = (dx - 0.5) / (dy + 0.5);
      const rSlope = (dx + 0.5) / (dy - 0.5);
      if (start < rSlope) continue;
      if (end > lSlope) break;
      let d2;
      if (k === 1) d2 = dx * dx + dy * dy;
      else { const ex = X - cx, ey = Y - cy; d2 = (ex * ex) / k + ey * ey * k; }
      if (d2 <= r2) visit(X, Y, Math.sqrt(d2));
      if (blocked) {
        if (opaque(X, Y)) { newStart = rSlope; continue; }
        blocked = false; start = newStart;
      } else if (opaque(X, Y) && j < top) {
        blocked = true;
        castLight(cx, cy, j + 1, start, lSlope, radius, xx, xy, yx, yy, opaque, visit, k);
        newStart = rSlope;
      }
    }
    if (blocked) break;
  }
}

// Línea de visión entre dos puntos (Bresenham, ignorando extremos)
export function hasLOS(x0, y0, x1, y1, opaque) {
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x = x0, y = y0;
  for (;;) {
    if (x === x1 && y === y1) return true;
    if (!(x === x0 && y === y0) && opaque(x, y)) return false;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}
