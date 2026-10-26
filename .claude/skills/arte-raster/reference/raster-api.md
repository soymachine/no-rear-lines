# API de `js/ui/raster.js`

Esta referencia está sacada del código. Si cambia `raster.js`, actualiza esta página.

**Coordenadas.** Las formas trabajan en las coordenadas de la caja del dibujo (`box = { x0, x1, y0, y1 }`). La `y`
crece hacia abajo.

**Formas sueltas.** Una forma sin volumen es una función `(x, y) → { nx, ny } | null`, donde `{ nx, ny }` es la
normal local en el rango −1…1. El motor saca `nz` de ahí: el centro mira al frente y los bordes miran de lado.

**Caja de la forma (`f.bb`).** Las primitivas llevan su caja en `f.bb`, y fuera de ella la capa ni se evalúa. Las
formas hechas a mano no la llevan y se evalúan en todo el dibujo, lo que es más lento.

## Utilidades

| | |
|---|---|
| `hex('#rrggbb') → [r,g,b]` | color |
| `mix(a, b, t)` | mezcla de colores |
| `DARK` | `[0,0,0]` |
| `clamp`, `lerp` | aritmética básica |
| `sstep(a, b, v)` | paso suave |
| `segD(x,y,ax,ay,bx,by)` | distancia al segmento a-b |
| `hash(x, y) → 0…1` | ruido estable por celda; para texturas, `hash(Math.floor(x*k), Math.floor(y*k))` |
| `strHash(s)` | semilla a partir de un texto |
| `widthAt(tbl, y)` | interpola una tabla `[y, media anchura]` |

## Primitivas (devuelven una forma)

| Función | Qué es |
|---|---|
| `cap(ax, ay, bx, by, ra, rb=ra)` | Cápsula de a a b con radio ra→rb. Sirve para cañones, tubos, extremidades y dedos. |
| `chain(pts, r0, r1=r0)` | Cadena de cápsulas por varios puntos. Sirve para mangueras, colas y cables. |
| `ell(cx, cy, rx, ry)` | Elipse con volumen de cúpula. |
| `box(x0, y0, x1, y1, soft=0.75)` | Caja casi plana con los bordes redondeados en la luz. `soft` regula cuánto se curva. |
| `rbox(x0, y0, x1, y1, r, soft=0.8)` | Caja con las esquinas redondeadas (radio r). |
| `profile(cx, tbl, flat=0.3)` | Sólido de revolución de frente: anchura variable a lo largo de `y`, con `tbl = [[y, media anchura], …]`. Sirve para botellas, torsos y columnas. |
| `poly(P, bevel=0.012, holes=[])` | Polígono plano con los bordes biselados, con `P = [[x,y],…]` y huecos opcionales. Es la base de las piezas planas: cascos de carro, escotillas, chapas, culatas. |
| `band(line, w0, w1=w0, bevel?)` | Banda de anchura variable w0→w1 a lo largo de una línea de puntos. Sirve para correas, cañones que se estrechan, orugas y hojas. |
| `bez(pts, n=12)` | Puntos de una Bézier de 2, 3 o 4 puntos de control. Se combina con `band` o `poly`. |

## Combinadores

| Función | Qué hace |
|---|---|
| `any(...fs)` | Une varias formas. Gana la primera que da normal. |
| `clip(f, test)` | Recorta `f` a los puntos donde `test(x,y)` es verdadero. |
| `fuse(parts, k=0.02)` | **Unión suave**: funde piezas en un solo volumen orgánico. Cada pieza es `{ s, c, slot? }` y `s` es una de las funciones de abajo. El color de cada punto es el de la pieza más cercana. Sirve para cuerpos (los soldados) y bultos orgánicos. |
| `sCap(ax, ay, bx, by, ra, rb)` | Pieza de cápsula para `fuse`. |
| `sEll(cx, cy, rx, ry)` | Pieza de elipse para `fuse`. |
| `sProf(cx, tbl)` | Pieza de perfil para `fuse`. |

## Modelo

```js
const L = model();
L.add(forma, color, slot = null, tex = null, opts = {});  // capa (orden: de atrás hacia delante)
L.fused(parts, k, tex);                                     // atajo: add(fuse(parts,k), colores por pieza, slots por pieza)
```

- **`color`**: `[r,g,b]`. En una capa fundida es un array de colores, uno por pieza.
- **`slot`**: el nombre de una ranura animada. `rasterize` devuelve en `R.slots` la ranura de cada píxel: así se
  re-tiñen solo esos píxeles en cada fotograma (una luz que parpadea, unas brasas) sin volver a rasterizar.
- **`tex(x, y, c, h) → c`**: textura. Recibe el color base y la normal (`h`) y devuelve otro color. Se aplica antes
  de la sombra, así que lo que hace es variar la **base**: vetas de madera, juntas, óxido, manchas.
- **`add` admite argumentos corridos**: si el tercero es una función, es la textura; si es un objeto, son las
  opciones. Los módulos lo usan así (`L.add(f, c, null, null, { glow: true })` o `add(f, c, tex, o)`).
- **`opts`**:
  - `glow: true`: luz propia. No se sombrea, se pinta ×1,1 y en escalones de brillo.
  - `flat: true | 0–1`: no se sombrea y usa un tono fijo (0,35 por defecto). Para sombras en el suelo y huecos.
  - `shiny: k`: brillo especular. Metal ~0,5, cristal ~1–1,2.

## Rasterizar y mostrar

```js
const R = rasterize(L, { W, box, crop?, warp?, shadow?, levels? }); // → { W, H, rgba: Uint8ClampedArray, slots }
toCanvas(R, scale = 3, cls = '');   // <canvas class="px-art …"> W×H, ampliado con CSS a W·scale
sourceCanvas(R);                    // lienzo base en caché (para drawImage)
pixelAt(canvas, R, mouseEvent);     // índice del píxel bajo el ratón, o −1
```

- `toCanvas` y `sourceCanvas` usan `document`: en un worker no existen. Allí se pinta `R.rgba` en un
  `OffscreenCanvas` con `putImageData(new ImageData(R.rgba, R.W, R.H), x, y)` (ver `hojas.md`). `toCanvas` pone la
  clase `px-art`: el CSS tiene que darle `image-rendering: pixelated`.
- **Alto de la rejilla**: `H = round(W · (y1−y0)/(x1−x0))`, de modo que los píxeles son cuadrados.
- **`crop`** (`{ i, j, w, h }`): solo ese trozo, idéntico píxel a píxel. Para animar una parte.
- **`warp`** (`(x,y) → [u,v]`): deforma el dibujo, por ejemplo para acortar las piernas.
- **`shadow`**: distancias de muestreo de la sombra proyectada. Por defecto `[0.012, 0.022]`, en unidades de caja.
- **Cómo funciona por dentro**:
  - Toma una muestra por centro de píxel.
  - La luz es `LIGHT ≈ (−0,45, −0,6, 0,66)` normalizada.
  - Si hay una pieza delante en la dirección de la luz, el sombreado se multiplica por 0,55.
  - El sombreado da un valor de 0 a 1,2, que se convierte en uno de los 4 tonos.
  - Entre dos tonos, en una franja de `band = 0.3`, se elige con la matriz Bayer 4×4.

## Estilo

```js
RASTER_STYLE   // { grain: 0, band: 0.3, glowStep: 14 } el del juego
setRasterStyle(s | null); rasterStyle();
```

- `null` vuelve al estilo antiguo: color × sombra, con grano y trama por todas partes.
- Opciones de prueba: `levels` y `palette: true`. Esta última ajusta los colores a la `PALETTE` interna de unos
  60 colores con `snap()`.
