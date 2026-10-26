# Hojas de sprites, direcciones y piezas

Cada dibujo se rasteriza **una vez** y se guarda en una hoja. En cada fotograma, el juego solo copia trozos de la hoja
con `drawImage`. Esta página es el oficio de cómo se hace una hoja. Dónde viven las de este proyecto, sus cajas y su W,
va en `proyecto.md`.

## La hoja

- **Una rejilla de celdas iguales**: una fila por dirección y una columna por fotograma (o por pose). Todas las celdas
  de una hoja miden lo mismo, y la caja es la misma en todas las direcciones. En vista cenital es cuadrada y cabe el
  dibujo girado en cualquier dirección: lado = 2 × lo más lejos que llega el dibujo desde su punto de apoyo, más
  1–2 px de margen para la sombra.
- **El punto de apoyo** (`ax`, `ay`, en píxeles enteros de la celda) es el píxel que cae en la posición de la unidad
  en el mundo: el centro del cuerpo en cenital, los pies en tres cuartos, el centro de giro en un carro. Es **el
  mismo** en todas las celdas de la hoja. Si se mueve de un fotograma a otro, la unidad «baila» al andar.
- **Lo que acompaña a la hoja**: `{ id, W, H, dirs, frames, ax, ay }` y, si hace falta, puntos con nombre por celda
  (la boca del fusil, de dónde sale el humo). Esos puntos se calculan girando la forma, no a ojo: así casan con el
  dibujo en todas las direcciones.
- **Copiarla**: `ctx.drawImage(hoja, col * W, fila * H, W, H, Math.round(x) - ax, Math.round(y) - ay, W, H)`, con `x`
  e `y` en la resolución de dibujo.

## Escala entera y sin suavizado

- El juego dibuja en un lienzo de trabajo a la **resolución de dibujo** (por ejemplo 480×270) y al final lo copia a la
  pantalla ampliado ×N, con N entero: `N = floor(min(anchoFísico / 480, altoFísico / 270))`, contando
  `devicePixelRatio`. Lo que sobra es un marco, no un estiramiento.
- `ctx.imageSmoothingEnabled = false` en **cada** contexto que copia hojas o amplía. Se pierde al cambiar el tamaño del
  canvas: vuelve a ponerlo después de cada cambio. En el CSS, `image-rendering: pixelated`.
- **Posiciones enteras.** Las unidades, la cámara y los efectos se redondean al píxel de la resolución de dibujo justo
  antes de copiar. La simulación y la interpolación siguen con decimales; solo el dibujo redondea. Si la cámara no se
  redondea, todo el mapa tiembla un píxel al moverla.
- Moverse de píxel en píxel es el aspecto del pixel art. No se arregla con subpíxeles: se arregla con velocidades y
  una resolución de dibujo que lo hagan suave.

## OffscreenCanvas, caché y worker

- La hoja es un `OffscreenCanvas(W × columnas, H × filas)` (o un `<canvas>` donde no lo haya). Cada celda se pinta con
  `putImageData(new ImageData(R.rgba, R.W, R.H), col * W, fila * H)`. `toCanvas` y `sourceCanvas` de `raster.js` usan
  `document`: en un worker no sirven.
- **La clave de la caché** lleva todo lo que cambia los píxeles: id, variante (bando, uniforme, arma, daño), número de
  direcciones, W, paleta y estilo. Con tope: si crece sin control, vacíala. Si cambia la escala o la paleta, se
  vacía entera.
- **En un worker** (`new Worker(new URL('./hojas-worker.js', import.meta.url), { type: 'module' })`), con el mismo
  código que en la página: el resultado tiene que ser **idéntico píxel a píxel**. Se devuelve el `rgba` como
  transferible, o un `ImageBitmap` de `transferToImageBitmap()`. Si la página necesita la hoja antes de que llegue, la
  pinta ella. Lo pesado que no siempre hace falta se importa perezoso (`import()`) dentro del worker.
- **Primero lo que se ve**: las hojas de las unidades del mapa antes que las de la interfaz o las de otras campañas.
- **Coste**: mide cuánto tarda una hoja entera (ms) y cuánto pesa (W × H × 4 bytes). Con 8 direcciones y 12
  fotogramas, una hoja de soldado de 16 × 16 px es nada; una torreta de 32 direcciones a 40 × 40 px empieza a notarse
  si hay muchas variantes.

## Direcciones

### Vista cenital

Se gira la forma, no se dibuja otra receta: la misma receta, muestreada girada en el centro de cada píxel (girar
píxeles ya pintados deja huecos en tablero). **La luz no gira**: `raster.js` da la normal en coordenadas de la caja y
la luz viene fija de arriba a la izquierda, así que la normal de la forma girada hay que girarla también. Un helper de
este estilo (en el módulo de las hojas, no en `raster.js`):

```js
// la forma f girada a radianes alrededor de (cx, cy), con su normal girada: la luz se queda arriba a la izquierda
function girar(f, a, cx, cy) {
  const c = Math.cos(a), s = Math.sin(a);
  const g = (x, y) => {
    const dx = x - cx, dy = y - cy, h = f(cx + dx * c + dy * s, cy - dx * s + dy * c);
    return h && { ...h, nx: h.nx * c - h.ny * s, ny: h.nx * s + h.ny * c };
  };
  if (f.bb) { // la caja de la forma girada (las cuatro esquinas), para que el motor no la mire fuera
    const [x0, y0, x1, y1] = f.bb, P = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
    g.bb = [Math.min(...P.map((p) => p[0])), Math.min(...P.map((p) => p[1])), Math.max(...P.map((p) => p[0])), Math.max(...P.map((p) => p[1]))];
  }
  return g;
}
```

- La **sombra en el suelo** (capa `flat` más oscura, desplazada hacia abajo a la derecha, lejos de la luz) se pone
  **después** de girar, siempre hacia el mismo lado. Si se gira con el sprite, el sol se mueve.
- **Cuántas direcciones**:
  - soldados, 8: con 10–16 px no se distinguen más;
  - el casco de un carro, 16;
  - la torreta, 32 (gira despacio y los saltos se notan);
  - las trazadoras y los proyectiles, en cualquier ángulo, como trazo.
- **Elegir la dirección**: `fila = ((Math.round(angulo / (2π / N)) % N) + N) % N`, con **histéresis**: no cambies de
  fila hasta pasar la frontera por un margen (un cuarto de sector). Si no, una unidad que apunta justo a la frontera
  parpadea entre dos dibujos.
- Mira la lámina de todas las direcciones juntas (`captura-anim.mjs --dirs N`): cada una se tiene que parecer a sus
  vecinas, y las diagonales no pueden salir más gordas ni más finas que las rectas.

### Vista de tres cuartos

No se puede girar en analítico: cada dirección es otra receta (de frente, de espaldas, de lado y las diagonales).
Normalmente se dibujan 5 y las otras 3 salen en espejo, pero el espejo cambia la luz de lado: o se acepta, o se
dibujan las 8. Además hay que ordenar lo que tapa (lo de más abajo en la pantalla, delante) y lo alto tapa lo de detrás.
Cuesta bastante más que la cenital. Es una decisión del usuario.

## Soldados y poses

- **Las poses mínimas**:
  - de pie;
  - andando (ciclo de 4 a 6 fotogramas);
  - agachado;
  - cuerpo a tierra;
  - arrastrándose (ciclo de 2 a 4);
  - disparando de pie, agachado y tumbado (2–3 fotogramas: apunta, fogonazo, retroceso);
  - lanzando una granada;
  - herido o cayendo (3–4);
  - muerto (1–2 variantes);
  - y, si el juego los tiene, huyendo y rendido (manos arriba).
- **En cenital, la postura se lee por la silueta**:
  - de pie: hombros anchos y el arma como una línea hacia delante;
  - agachado: una mancha más corta;
  - cuerpo a tierra: alargado en la dirección en la que mira, con las piernas detrás.

  Si dos poses se confunden a ×1, una sobra o hay que exagerarla.
- **Una receta con parámetros** por soldado: bando y uniforme (cambio de material), casco, arma por clase (fusil,
  subfusil, ametralladora con bípode, antitanque), mochila. La variante entra en la clave de la caché.
- **El bando se ve en todas las direcciones y poses**: un esquema de color en piezas enteras (casco, hombros), no un
  detalle de 1 px.
- **El arma se ve**: de ella depende cómo se lee la amenaza. Una ametralladora tiene que distinguirse de un fusil a ×1.

## Carros: casco y torreta

- **Dos hojas**:
  - el casco: direcciones × estados (entero, dañado, ardiendo, destruido), más 2–3 fotogramas de oruga si se anima;
  - la torreta con el cañón: direcciones × (normal y 1–2 fotogramas de retroceso).

  Cada una gira por su cuenta.
- **El aro de la torreta**: el punto de apoyo de la hoja de la torreta es el centro del aro. En el casco, el aro no
  siempre está en el centro. Su sitio en el mundo es el punto de apoyo del casco más el desplazamiento del aro girado
  con el ángulo del casco; se gira con decimales y se redondea al final.
- **Orden de pintado**: la sombra, el casco y las orugas, la torreta, el cañón y luego los efectos (humo del tubo de
  escape, fogonazo).
- **La boca del cañón**, para el fogonazo y la trazadora: el punto de apoyo de la torreta más el largo del cañón girado
  con el ángulo de la torreta. Se calcula, no se mide en la hoja.
- **Retroceso**: el cañón 1–2 px hacia atrás durante 1–2 fotogramas, y el casco, si acaso, un balanceo de 1 px.
- **Daños**: variantes del casco (manchas de hollín como textura, una oruga rota). El carro destruido es otro estado:
  más oscuro, a veces sin torreta o con la torreta girada, y con humo de partículas encima.
- **La escala**: a escala real, un soldado al lado de un carro sería un punto. Los juegos tácticos exageran el tamaño
  de los soldados respecto al terreno y a los vehículos. Cuánto, se decide con el usuario y se apunta en
  `proyecto.md`.
