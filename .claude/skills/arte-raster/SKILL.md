---
name: arte-raster
description: El oficio de pixel art en código de Sin Retaguardia, donde todo el arte es procedural en JS sobre el motor js/ui/raster.js (formas con normal, 4 tonos por material y trama Bayer en las costuras; sin PNG) y se pinta una vez en hojas de sprites. Cubre el terreno en baldosas, los soldados con sus poses y direcciones, los carros con casco y torreta por separado, el humo, el fuego, las explosiones, las animaciones de disparo, los iconos y la paleta; las hojas de sprites, la animación y las baldosas que encajan; y cómo comprobarlo con capturas y láminas de fotogramas. Úsala ante cualquier petición de arte del juego y antes de tocar un archivo de dibujo.
---

# El arte del juego (motor raster)

En el juego no hay imágenes: **cada dibujo es código**. Un dibujo es un *modelo*, una lista de capas ordenadas de
atrás hacia delante. Cada capa es una forma `(x, y) → normal | null` en coordenadas de una caja (`box`) más un color.
`rasterize()` lo convierte en una rejilla de W píxeles de ancho con la luz, las sombras y la trama del estilo de la
casa. El juego pinta esa rejilla **una vez** en una hoja de sprites y en cada fotograma solo la copia, ampliada en
enteros y sin suavizar.

Pintar «píxel a píxel» no es como se trabaja aquí. Se mueven formas en la caja y es el motor quien decide los
píxeles. Para que un detalle se lea a escala ×1, tiene que medir al menos 1 o 2 píxeles de la rejilla:
`ancho_en_px = ancho_en_caja × W / (box.x1 − box.x0)`. Con soldados de 8–16 px de alto, eso manda sobre todo lo demás:
un casco es un grupo de 3–4 píxeles, un fusil una línea de 1 px, y lo que no se lee a ×1 sobra.

Las referencias:
- [reference/raster-api.md](reference/raster-api.md): la API completa de `raster.js` (primitivas, `add`, `rasterize`).
- [reference/hojas.md](reference/hojas.md): hojas de sprites, direcciones y punto de apoyo, los soldados y sus poses,
  los carros con casco y torreta, `OffscreenCanvas`, la caché y el worker.
- [reference/animacion.md](reference/animacion.md): cuántos fotogramas, los tiempos, los disparos, el humo, el fuego,
  las explosiones y lo que queda en el suelo.
- [reference/baldosas.md](reference/baldosas.md): el terreno en baldosas: tamaño, costuras, variantes, transiciones,
  la trama en fase y la lectura.
- [reference/proyecto.md](reference/proyecto.md): **el mapa de este proyecto**: dónde vive cada dibujo, cajas, W,
  paleta y la página de arte. Léelo primero; si está vacío, aún no hay arte y las decisiones son del usuario.

## El estilo de la casa: «trama en costuras»

Es `RASTER_STYLE = { grain: 0, band: 0.3, glowStep: 14 }` en `raster.js`. No lo cambies sin que te lo pidan.

- **Cuatro tonos por material** (`TONES4`):
  - sombra profunda: oscurecida y mezclada con el frío `COOL [26,22,44]`
  - sombra
  - base: el color que pones en `add`
  - luz: un poco más clara y mezclada con el cálido `WARM [255,236,196]`

  El cambio de tono ya está hecho por el motor. **No añadas tú sombras ni brillos con otro color**: elige bien la base.
- **Trama Bayer 4×4 solo en una franja estrecha** entre un tono y otro. Lo demás son tonos sólidos. La fase de la
  trama sale de la posición en la rejilla del dibujo: dos dibujos que se tocan solo casan si los dos empiezan en un
  múltiplo de 4 (`reference/baldosas.md`).
- **Luz desde arriba a la izquierda** (`LIGHT`), fija en la caja. Las piezas de delante proyectan sombra sobre las de
  detrás, así que el orden de las capas importa. Cuando un sprite gira, **la luz no gira con él**: se gira la forma y
  su normal (`reference/hojas.md`).
- **Capas `glow`** (fogonazos, fuego, brasas, luces): no se sombrean y su brillo va en escalones de 14 (`glowStep`).
- **Capas `flat`**: no se sombrean. Se usan para sombras en el suelo, huecos negros y marcas planas.
- `setRasterStyle(null)` vuelve al estilo antiguo, solo para comparar.

## La paleta

- **Corta y por teatro**: cada mapa o campaña tiene su tabla de materiales con nombre (tierra, hierba seca, seto,
  caqui, feldgrau, acero…). Antes de inventar un color, reutiliza un material de la tabla; si falta uno, añádelo con
  un nombre.
- **Colores reservados.** Lo que avisa no se usa para nada más:
  - el color de cada bando, en algo que se vea en todas las direcciones (casco, brazalete, una franja del carro);
  - el fuego y los fogonazos (amarillos y naranjas cálidos);
  - el humo (grises que no se confundan con el terreno);
  - la selección y la supresión, que son de la interfaz.

  La tabla de los reservados va en `reference/proyecto.md`.
- **Unidades contra terreno.** Un soldado tiene que despegarse del suelo que pisa en todas las baldosas: contraste de
  valor, no solo de tono. Si el uniforme es del color del campo (porque lo es), la silueta oscura, una sombra `flat`
  bajo los pies o un filo claro lo despegan.
- **Hue shifting** lo hace el motor (sombras frías, luces cálidas): elige la base a media luz.

## Animación, en corto

Pocos fotogramas, y que cada uno se lea solo: en un juego táctico, **la pose se lee más que el movimiento fluido**. Los
mecanismos son tres:
- **fotogramas en la hoja**, una columna por fotograma y una fila por dirección (andar, arrastrarse, disparar, caer);
- **piezas aparte** que se giran o se mueven al pintarlas (la torreta sobre el casco, el retroceso del cañón);
- **partículas** con su vida, para el humo, el fuego, las chispas y los cascotes.

Cada fotograma es función del tiempo (`t` desde que empezó), no de cuántos fotogramas se han pintado: así la lámina de
`captura-anim.mjs` sale igual cada vez. El azar de lo que solo se ve sale de su propio `RNG` con semilla, nunca de
`Math.random` ni del azar de la simulación. Todo en `reference/animacion.md`.

## Receta: cambiar o añadir un dibujo

1. **Localiza la receta.** `reference/proyecto.md` dice en qué módulo vive cada familia; luego
   `grep -n "<id>" js/**/*.js`.
2. **Captura el antes** (ver «Verificar»).
3. **Edita las capas.** Reutiliza los helpers del módulo y los materiales de su tabla. Las coordenadas van en la caja
   del módulo. Las capas se apilan de atrás hacia delante.
4. **Captura el después y compara.** Mira la lámina ampliada con Read, que ve imágenes. Comprueba:
   - **silueta legible:** a ×1 se reconoce qué es, y de qué bando;
   - **contraste** con el terreno que pisa, también con humo y de noche si los hay;
   - **sin huérfanos:** ni píxeles sueltos ni líneas de 1 px que se rompan;
   - **luz coherente:** siempre desde arriba a la izquierda, en todas las direcciones;
   - **paleta corta:** pocos materiales por dibujo;
   - **en la hoja:** cada dirección se parece a sus vecinas y el punto de apoyo no salta.
5. **Repite** hasta que se lea bien. Luego `eslint --quiet js`.

Un dibujo sin receta no debe caer en silencio en otro por defecto: cada id de los datos tiene su receta, y una prueba
lo comprueba (CLAUDE.md: «los datos llevan id y prueba de que están completos»).

## Verificar (siempre, con capturas)

Desde la raíz del repo. Los scripts arrancan `python3 -m http.server` si no hay servidor en `NRL_URL` (por defecto
`http://localhost:8000/`). Necesitan la página de arte (`arte.html`), con el contrato que dice la cabecera de cada
script; dónde está y qué secciones tiene va en `reference/proyecto.md`.

`$S` es tu carpeta de trabajo: el scratchpad de la sesión o `/tmp/arte`.

```sh
# lámina de una sección + cada dibujo a tamaño real (1 px = 1 px) en la carpeta
node .claude/skills/arte-raster/scripts/captura.mjs soldados $S/antes --solo fusilero
# … cambios …
node .claude/skills/arte-raster/scripts/captura.mjs soldados $S/despues --solo fusilero
# antes/después ampliado sin suavizar; --diff marca los píxeles que cambian
python3 .claude/skills/arte-raster/scripts/compara.py $S/antes/soldados/fusilero.png $S/despues/soldados/fusilero.png $S/fusilero.png --diff
# lo que se mueve o gira: una lámina con una fila por dirección y una columna cada 40 ms
node .claude/skills/arte-raster/scripts/captura-anim.mjs fusilero.andar $S/anim --dirs 8 --cada 40 --dur 600
```

- `captura.mjs <sección> [carpeta] [--solo id1,id2] [--zoom 1-4] [--estilo anterior]`. `--solo` acepta el id exacto
  o un trozo del nombre visible.
- `captura-anim.mjs <id[,id…]> [carpeta] [--dirs N|a,b,c] [--cada ms] [--dur ms] [--zoom N] [--op JSON]`: los
  fotogramas los da la página (`window.__arte.fotograma(id, { t, dir, ...op })`), así que salen iguales cada vez.
- Si la página da errores de JS, los scripts los imprimen y salen con código 1.
- `compara.py a.png b.png salida.png [--x N] [--diff]`. Pinta lo transparente sobre el fondo oscuro `#050302`.
- Una baldosa se mira también en mosaico (3×3 y con sus vecinas): `reference/baldosas.md`.

Deja las capturas en el scratchpad o en `/tmp`, **nunca en el repo**.

## Previsualizar sin cambiar el juego

Si piden «enséñame cómo quedaría»:
1. Captura el antes.
2. Edita el archivo.
3. Captura el después.
4. Restaura el archivo con `git checkout -- <archivo>` y comprueba con `git status` que ha quedado limpio.
5. Enseña la comparación.

No hagas commit.

## Lo aprendido (ampliar aquí)

Cuando descubras una convención, un truco o una trampa del motor, añade aquí una línea con fecha. Lo que sea del
proyecto (dónde vive algo, una caja, un material) va en `reference/proyecto.md`.

Del motor (`raster.js`):
- 2026-10-20: `captura.mjs` saca el PNG directamente del `<canvas>` (`toDataURL`), así que el tamaño es el de la
  rejilla. Lo transparente es fondo: `compara.py` lo pinta sobre `#050302`.
- 2026-10-20: se muestrea UN punto por píxel, en su centro (u = i + 0,5). Para piezas de 1–2 px, pon los bordes
  pensando en eso: con 1 u = 1 px, un borde en 42,4 deja libre la columna 42 y uno en 42,6 la pinta. Volcar la
  luminancia del PNG por columnas (PIL) ayuda a cuadrarlo. Si la caja no mide un número entero de píxeles, las filas
  no son de 1 u: el centro de la fila j está en (alto de la caja / H) × (j + 0,5).
- 2026-10-20: **piezas finas**: las de menos de ~1,4–1,8 px (asas, tubos, palancas en diagonal, `cap` de radio por
  debajo de 1 px) se rompen en píxeles sueltos por el cambio de tono. Para varillas y marcos, mejor `poly` plano con
  bisel pequeño (0,2–0,5 px) y `holes`. Una pieza de 2 px con bisel 0,5 sale como una columna de trama; con 0,2,
  sólida.
- 2026-10-20: **rayas y texturas**: una textura que cubre toda la pieza con un patrón de 1 px o menos se ve como un
  moteado de tablero, contra «trama solo en costuras». Usa período ≥ 2 px o huecos explícitos de 1,5–2 px. Las
  rendijas inclinadas finas se rompen: hazlas rectas con `rbox`. Aletas de 1 px con huecos de 1 px sobre un alma más
  oscura se leen perfectas. Materiales de tono parecido, juntos, pierden la separación.
- 2026-10-20: **cúpulas sin querer**: `ell` y `oval` tienen volumen de cúpula y se leen como bola o agujero. Para
  tapas, discos o escotillas, un polígono con bisel.
- 2026-10-20: **luces limpias**: pon un `glow` detrás y las piezas sólidas delante, con juntas de 1 px alineadas a la
  rejilla. Un `glow` encima de una pieza clara le hace sombra: ponle antes un marco oscuro y se lee como mirilla.
- 2026-10-20: **nada colgando**: piezas abiertas con patas o varillas de 1 px se leen como alambres que cuelgan;
  dibújalas plegadas o más gruesas. Los adornos sueltos (motas, puntos delante) mueven además todos los anclajes.
- 2026-10-20: **volúmenes segmentados** (cadenas de oruga, sacos terreros, sogas): óvalos o cápsulas solapados,
  pintando el último el de atrás. La sombra entre ellos hace la costura sola. Una boca acampanada: una Bézier de 3
  puntos reflejada sobre el eje.
- 2026-10-20: `band(pts, w0, w1)`: la anchura es total, no la mitad.
- 2026-10-20: **recetas de una línea**: un comentario `//` a media línea se come las llamadas que van detrás.
- 2026-10-20: **varios artistas a la vez**: cada uno en su worktree, con su puerto (`NRL_URL`) y su carpeta de
  herramientas en el scratchpad. Luego se juntan los diffs con `git apply --3way`.
- 2026-10-21: para sacar varias semillas de un hash, `(h >>> (k * 3)) % n` deja de servir desde k = 11: JS hace el
  desplazamiento módulo 32 y los valores se repiten o salen casi 0. Usa un `strHash(semilla + ':' + k)` por clave.
- 2026-10-23: **una marca pintada** (franjas, números, insignias) va como **textura** de la pieza (`tex(x, y, c)`), no
  como capa encima: una capa delante le echa 1 px de sombra a la pieza de detrás y se lee como relieve. Las texturas
  se encadenan.
- 2026-10-23: las capas `glow` reciben la normal `h` en su `tex`: una luz hecha a mano (desde abajo, a contraluz) va
  ahí, cuantizada con 4 tonos y trama solo en la costura para que siga siendo el estilo de la casa. Una capa `glow`
  lisa sale tramada entera si su canal mayor ×1,1 cae a media altura de un escalón de 14: ajusta antes el color.
- 2026-10-23: las capas `flat` no aplican su `tex` (el muestreador devuelve el color base): para una tinta plana con
  marcas, `glow` con el color ajustado, o una capa normal con poco `shiny`.
- 2026-10-23: con la caja en píxeles (0…W × 0…H) todo se mide en píxeles: biseles de 0,5–1, sombra proyectada
  `shadow: [1.2, 2.4]`.
- 2026-10-24: `L.fused(parts, k, tex)` no acepta opciones: para un bulto brillante, `L.at(-1).shiny = 1.4` justo
  después. Renglones, dobladillos y franjas de 1 px en la `tex`: `Math.abs(y − y0) <` media anchura de medio píxel.

Del oficio:
- 2026-10-21: **formas que giran** en 8 o más direcciones: muestrear la forma analítica girada en el centro de cada
  punto, como hace `raster.js`. Girar listas de puntos ya pintados deja huecos en tablero.
- 2026-10-21: lo que se pinta en el suelo con `fillRect` (manchas, huellas, cráteres) va en «puntos» de la rejilla de
  dibujo: óvalos de puntos con el borde mordido por un hash, no rectángulos sueltos. Una trama de puntos tiene que ir
  en fase con la pantalla (o con el mundo), no con cada casilla, o cada casilla repite el patrón y se ven las costuras.
- 2026-10-21: **tintes de luz** en `soft-light`: un azul por encima de 128 aclara y un rojo o un verde por debajo de
  128 enfrían. Un ámbar con el azul bajo (p. ej. 92) ensucia de marrón; mejor oro con el azul ≈ 110–128. Al pasar de
  oro a azul, hazlo por rosa (tres paradas): la mezcla directa sale gris. Los brillos que se suman (el filo de una
  onda), en `screen`.
- 2026-10-21: **una animación que deja un resto** (cascotes, un carro destruido, un casquillo): el MISMO plano
  determinista (azar sembrado con el sitio, el tipo y el momento; en caché por resto) da la trayectoria y el sitio
  final, y el resto no se pinta posado mientras vuela. Se registra cuando el dibujo lee el suceso, no cuando la
  simulación lo emite: así respeta la pausa y la velocidad. Lo que vuela va encima de las unidades y los objetos.
- 2026-10-21: para comparar el antes y el después de un módulo con la misma partida: en Playwright,
  `context.route('**/js/<módulo>.js*', …)` sirve la copia vieja guardada en el scratchpad, con la misma semilla.
- 2026-10-21: **cámara lenta** con Playwright: en `addInitScript`, envolver `performance.now` y el tiempo de
  `requestAnimationFrame` con un reloj a k× (`window.__lento(k)`).
- 2026-10-23: **un distintivo se lee de un vistazo** cuando cubre piezas enteras con un esquema de color (la torreta,
  una franja del casco), no con un detalle: un emblema de 7 × 8 u quedó en un punto de 3 px.
- 2026-10-23: para enseñar opciones sin duplicar recetas: un interruptor provisional `globalThis.__opcion` leído en la
  receta y puesto con `addInitScript` en Playwright; una carpeta de capturas por opción, y se quita al elegir.
- 2026-10-23: **una silueta oscura con filo de luz** sale con `poly` y bisel y una luz de lado: el interior plano queda
  en sombra y solo se encienden los bordes. El filo: dentro de la pieza y, a d hacia la luz, ya fuera; con 1–2 px
  claros, una silueta negra se despega de cualquier fondo. Con volúmenes fundidos o elipses, la luz cae por toda la
  pieza y se lee como una bola.
- 2026-10-23: una silueta grande se lee si cada pieza va en su familia de tono; todo oscuro con planos sueltos se
  funde en una mancha. Un dibujo de línea oscura desaparece sobre una masa oscura: cada pieza, sobre lo que contraste.
- 2026-10-23: **ventanas de edificios**: una rejilla regular (2 × 2 px cada 4 × 5) con las encendidas por pisos, de
  tres en tres (`hash(piso, columna/3)`), se lee como edificio; encendidas al azar una a una es ruido.
- 2026-10-23: si un detalle no se lee a ×1, sobra: dos rasgos valen más que cinco rayas. Para reutilizar un trozo de
  otro dibujo sin cambiarlo, sácalo a una función y comprueba la huella del raster antes y después (debe salir
  idéntica).
- 2026-10-24: **un dibujo sin receta que cae en uno por defecto no da error**: hay que buscarlo. Sondeo por huella:
  rasterizar cada id de los datos y comparar un hash del `rgba` con el del dibujo por defecto; los que coinciden caen
  en él.
- 2026-10-24: **una tela se lee como tela por la silueta**, no por el relleno: un cuadrado doblado sale cojín, sobre o
  pantalla. Mira a ×1 los detalles «graciosos»: dos grietas simétricas en una piedra se leen como ojos.
- 2026-10-26: **interfaz sobre fondo oscuro**: apagar con `opacity` hunde el contraste mucho más que sobre claro (la
  mezcla es en sRGB y la luminancia cae más rápido que el valor). Lo bloqueado, a .78 como mínimo; un bloque invertido
  en un tono medio no deja llegar a 3:1 ni a la tinta clara ni a los colores. Si un texto no contrasta, casi siempre es
  una opacidad heredada de un antepasado, no su color.
