---
name: mapas
description: El oficio de los mapas de Sin Retaguardia, un juego táctico en tiempo real en pixel art. Los mapas son rejillas de casillas, cada una con su baldosa (campo, seto, camino, casa, bosque, agua…), su altura y lo que hay encima, hechos a mano. Cubre la composición con baldosas (qué va en cada casilla, cómo se combinan, que se lea qué se anda, qué tapa la vista, qué cubre y qué frena a un carro) y el diseño jugable (rutas de aproximación, terreno clave, objetivos, cobertura y líneas de tiro, zonas muertas, terreno para carros, despliegue, ritmo), con su lista de revisión y las medidas que lo comprueban. Úsala ante cualquier petición sobre los mapas.
---

# Mapas

Un mapa es una **rejilla de casillas**. Cada casilla lleva:
- un id de **baldosa**, que dice qué es (campo, seto, camino, casa, bosque, agua…) y qué reglas tiene;
- quizá una **altura**;
- lo que hay **encima**: objetos (árboles sueltos, restos), las zonas de despliegue y los objetivos.

El **map-designer** decide qué baldosa va en cada casilla y dónde va cada cosa. El **pixel-artist** dibuja cada
baldosa, sus variantes y sus transiciones (`arte-raster`, `reference/baldosas.md`). El **tactical-ai** usa las reglas
de las baldosas para las rutas, la cobertura y la vista. Los mapas de este género **se hacen a mano**: la generación
procedural queda para lo que algún día lo pida.

- `reference/diseno-niveles.md`: el criterio de diseño jugable (rutas, terreno clave, cobertura y vista, zonas
  muertas, carros, despliegue, ritmo, enseñar antes de examinar, lectura), la lista de revisión y las medidas que lo
  miden.
- `reference/generacion.md`: los algoritmos clásicos de generación, por si un día hacen falta.
- `reference/proyecto.md`: **el mapa de este proyecto**: el formato de los mapas, la tabla de baldosas con sus reglas,
  las herramientas y las pruebas. Léelo primero; si está vacío, aún no hay mapas y las decisiones son del usuario.

## Cada baldosa, sus reglas

Una baldosa no es un dibujo: es un **conjunto de reglas** con un dibujo. Cada una tiene que decir, como mínimo:

| Regla | Ejemplos |
|---|---|
| ¿se anda? ¿a qué coste, para la infantería y para un carro? | camino 1; campo 1,5; bosque 2 a pie, prohibido para el carro; agua honda, prohibida |
| ¿tapa la vista? ¿del todo o a medias? | seto alto, sí; trigal, solo a quien está tumbado; humo, del todo y un rato |
| ¿cubre? ¿cuánto y de qué lado? | muro, mucho; seto, poco contra las balas; cráter, a quien está dentro |
| ¿hace ruido o deja huella? | grava, barro |
| ¿se rompe o cambia? | una casa que se derrumba en ruinas; un seto que un carro atraviesa |

Las reglas viven en los datos, con su id, y una prueba comprueba que cada baldosa las tiene todas (CLAUDE.md). Las
baldosas nuevas se añaden al final de su tabla: los ids no se mueven, porque las partidas guardadas y las repeticiones
los usan.

## La composición

- **Lo que se anda, lo que tapa, lo que cubre y lo que frena, de un vistazo.** Es la regla que manda sobre las demás
  (`diseno-niveles.md` § 8).
- **Las baldosas se combinan con transiciones** (bordes, esquinas) que dibuja el pixel-artist. Tú decides qué terreno
  manda sobre cuál (la hierba sobre la tierra, el camino sobre la hierba) y dónde hace falta un borde marcado (un seto
  que es una línea de cobertura tiene que verse continuo).
- **Las variantes rompen la repetición**, pero salen de un hash de la casilla, no del azar de cada partida: el mismo
  mapa se ve siempre igual.
- **Lo grande va encima**: una casa grande, un árbol aislado o un carro quemado son objetos con su caja, no un
  rompecabezas de baldosas.
- **La altura se lee por la luz** (la ladera al sol más clara) y por un borde donde corta la vista.

## Cómo se trabaja un mapa

1. **Boceto**: las rutas de cada bando, el terreno clave, los objetivos, las zonas de despliegue y por dónde pasan los
   carros, antes de colocar una sola baldosa. En texto o en un dibujo rápido: lo que importa son las decisiones.
2. **Bloque**: solo suelo y cobertura (campo, seto, muro, casa, bosque). Si así ya hay decisiones, el mapa funciona;
   si no, el dibujo no lo arreglará.
3. **Medir y jugar**: las cifras de `diseno-niveles.md` y una partida (el bot o una persona).
4. **Vestir**: variantes, transiciones, detalles, marcas. Sin cambiar las reglas que ya funcionaban.
5. **Revisar** con la lista de `diseno-niveles.md` § 9, con capturas.

Todo se comprueba antes y después de cambiar: cifras y capturas, fuera del repo.

## Herramientas

- `scripts/mide-mapa.mjs <id|todos> [--texto archivo] [--baldosas]`: mide un mapa sin navegador con las cifras de
  `diseno-niveles.md` (rutas a pie y en carro de cada despliegue al objetivo, otra ruta, abierto, vista larga, zona
  muerta, terreno de carros, distancia de contacto), con un volcado en letras para leerlo. Se importa también
  (`mide`, `costes`) para pruebas propias.
- La captura del mapa con su arte, por ahora con la prueba de escala (`reference/proyecto.md`).
- `tests/datos.mjs` comprueba que las baldosas y los mapas están completos.

## Lo aprendido

(Añade aquí, con fecha, lo que descubras de los mapas que le sirva al siguiente. Lo que sea de este proyecto, en
`reference/proyecto.md`.)

- 2026-10-24: **un color que se mezcla con el de alrededor no se ve**: teñir un muro con un tono parecido al del
  terreno no lo distingue. Mira el color que resulta al pintarlo (con la luz y la paleta del mapa) antes de elegirlo.
- 2026-10-24: **estampar a prueba**: para meter un sitio hecho a mano (una granja, un búnker) en un mapa, se estampa,
  se comprueba con un BFS completo que todo lo andable sigue unido y, si algo queda suelto, se deshace. Es más simple
  que contar antes lo que pisa. Si varios sitios se ponen en orden, se apartan entre sí (un margen alrededor de cada
  uno).
- 2026-10-26: **un área pegada al borde del mapa deja una franja por fuera**: un río o un lago dibujado justo hasta el
  borde puede dejar una orilla andable entre el agua y el borde, un pasillo que nadie quería. El área se dibuja más
  allá del borde y se recorta. Antes de juzgar distancias, mira dónde cae el recorrido más largo.
