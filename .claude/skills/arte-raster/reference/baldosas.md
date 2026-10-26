# Baldosas: el terreno

El terreno se dibuja en **baldosas**: una por casilla del mapa, del mismo tamaño, que encajan entre sí. El
pixel-artist dibuja cada baldosa, sus variantes y sus transiciones. El map-designer decide qué baldosa va en cada
casilla. Qué baldosas hay, su tamaño y su tabla de materiales van en `proyecto.md`.

## Lo primero: que se lea

En este juego el terreno es información. A ×1, de un vistazo y con unidades encima, tiene que distinguirse:
- lo que **se anda** y lo que no;
- lo que **tapa la vista** (seto alto, bosque, casa) y lo que no (campo, camino, agua);
- lo que **cubre** (muro, seto, cráter, ruinas) y cuánto;
- lo que **frena** o no deja pasar a un carro (bosque denso, agua honda, pantano).

Si dos baldosas con reglas distintas se parecen, es un fallo de diseño, no de gusto. Las baldosas son el fondo: menos
contraste y saturación que las unidades, para que las unidades se despeguen siempre.

## Tamaño y trama

- **El tamaño de la baldosa en píxeles, múltiplo de 4.** La trama Bayer 4×4 de `raster.js` toma su fase de la posición
  dentro de la rejilla del dibujo. Si todas las baldosas empiezan en un múltiplo de 4 de la pantalla, la trama de una
  sigue en la de al lado y no hay costura. Con 10 o 14 px, sí la hay. Lo mismo para lo que se pinta encima del suelo:
  una trama de puntos va en fase con el mundo, no con cada casilla.
- **Una baldosa es un dibujo plano** en una caja de lado 1 (o en píxeles): `rasterize(L, { W: lado, box })`. El
  relieve (un muro, el borde de un seto) sale de las formas con volumen; el suelo, de capas casi planas (`box` con
  `soft` bajo) o de una textura.
- **Variantes**: 3–4 por baldosa común (campo, hierba, tierra), elegidas por un hash de la casilla
  (`hash(x, y) * n | 0`), nunca al azar en cada partida. Así el mismo mapa se ve siempre igual y no se nota la
  repetición. Las variantes cambian detalles (una mata, una piedra, un bache), no el tono medio: si una variante es
  más clara, el campo sale a cuadros.

## Costuras

- **Cada baldosa, sin costura consigo misma**: lo que sale por un borde entra por el de enfrente. Las texturas que lo
  cruzan (surcos de un campo, hiladas de un muro) llevan un período que divide el lado de la baldosa.
- **Compruébalo en mosaico**: la baldosa 3×3 consigo misma y con cada variante al lado. Se ve en la lámina si hay una
  línea, una esquina repetida o un patrón que salta a la vista.
- **Lo grande no cabe en una baldosa**: un árbol, una casa o un carro quemado van como objetos encima del suelo, con su
  propia caja y su punto de apoyo, en la capa de objetos, no partidos en baldosas.

## Transiciones entre terrenos

Cuando el campo toca el camino o el bosque toca el prado, hacen falta bordes:
- **Por bordes** (4 bits: arriba, derecha, abajo, izquierda, «el vecino es de otro terreno»): 16 combinaciones. Basta
  para caminos, ríos y setos en rejilla.
- **Por bordes y esquinas** (8 vecinos, el «blob» de 47 baldosas): para manchas orgánicas (bosque, charcas). Cuesta más
  dibujarlas, pero el motor las genera: una función que pinta según la máscara.
- **Por capas**: el terreno de más prioridad (hierba sobre tierra) se pinta encima con el borde mordido por un hash.
  Es lo más barato y suele bastar en cenital.
- **La luz del borde**: un borde que da a algo más bajo o abierto por arriba o por la izquierda recibe luz; por abajo
  o por la derecha, sombra. Así un muro o un seto tienen volumen aunque la baldosa sea plana. La máscara de bordes
  abiertos es la misma que la de las transiciones.

## Altura

Si el mapa tiene alturas (lomas, terraplenes), se leen por la luz, no por el color: la ladera que da a la luz más
clara, la otra más oscura, y un borde marcado donde corta la vista. Que la diferencia de altura que cambia las reglas
(da ventaja, tapa la vista) se vea siempre.

## Marcas sobre el terreno

Los cráteres, las manchas quemadas, las rodadas de un carro y los cuerpos van en una **capa de marcas** encima de las
baldosas. Una baldosa no se cambia porque le caiga una granada. Se dibujan como óvalos de puntos con el borde mordido
por un hash (no rectángulos) y en fase con el mundo.

## Comprobar una baldosa

1. La baldosa sola, a ×1 y ampliada (`captura.mjs` de su sección).
2. En mosaico 3×3, con sus variantes y con cada vecina con la que tiene transición.
3. Con unidades encima (de los dos bandos) y con humo: ¿se despegan?
4. En un trozo de mapa de verdad: ¿se lee qué tapa, qué cubre y por dónde pasa un carro?
