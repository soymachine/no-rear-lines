# El arte de Sin Retaguardia (mapa del proyecto)

_Vacío por ahora: aún no hay arte._ Aquí irá lo que es de este juego, y no del oficio:

- la vista (cenital o tres cuartos), el tamaño de un soldado y de una baldosa en píxeles, la resolución de dibujo y la
  escala;
- dónde vive cada familia de dibujos (soldados, carros, baldosas, objetos, efectos, iconos, interfaz), con su caja y
  su W;
- cuántas direcciones y qué fotogramas tiene cada hoja;
- la tabla de materiales por teatro y los colores reservados (cada bando, el fuego, el humo, la selección, la
  supresión);
- la página de arte (`arte.html`): sus secciones y su `window.__arte.fotograma`, que usan los scripts de captura;
- las pruebas que dibujan.

## Decisiones (2026-10-26)

Las tomó el usuario en las dos primeras rondas de preguntas, la segunda después de ver las pruebas visuales de
`prototipos/escala/`.

- **Todo el arte en código** sobre `raster.js`. PNG solo si algún día el usuario quiere dibujar algo a mano.
- **Vista cenital.**
- **Teatro del prototipo**: Normandía, verano de 1944, EE. UU. contra Alemania en el bocage.
- **Resolución de dibujo**: **960×540, ampliada ×2** (en 1920×1080 llena la pantalla), elegida tras ver la prueba: más
  mapa a la vista (480×270 m) y unidades pequeñas. **El mapa es grande**: se mira con desplazamiento.
- **Tres vistas**:
  - la normal (×2);
  - la de cerca, que amplía los píxeles ×2 más sin dibujar nada nuevo (240×135 m);
  - el mapa táctico, con una casilla por píxel, para mandar en lo grande.
- **Escala**: baldosa de 8 px ≈ 4 m; soldado en una caja de 10×10 px; carro de unos 24×12 px. Soldados y
  carros, exagerados respecto al mapa.
- **Paleta** de unos 32 colores (provisional): 12 de terreno de verano, 3 tonos por uniforme y por carro; reservados
  los cálidos del fuego, los grises del humo y, en la interfaz, la selección y la supresión. El bando se reconoce por el
  uniforme y el casco, más un marcador de interfaz (una raya del color del bando bajo cada unidad) que se puede quitar
  en los ajustes.
- **Animaciones mínimas del prototipo**:
  - soldado, en 8 direcciones: de pie, andar (4), cuerpo a tierra, arrastrarse (2), disparar de pie y tumbado (3),
    lanzar (granada de humo), caer (3) y muerto;
  - carro: casco en 16 direcciones con la oruga en 2 fotogramas; torreta en 32 direcciones con retroceso;
  - efectos: fogonazos, trazadora de ametralladora, impacto en tierra, explosión pequeña, fuego y humo del carro
    destruido y **granadas de humo** (la cortina que tapa la vista, con su vida).

## La prueba de escala

`prototipos/escala/` (no es el juego) es un bocage de 1 km generado con semilla, con dos escuadras y un carro por
bando, humo y trazadoras, todo con `raster.js` en hojas y ampliado en enteros. Admite los parámetros `?baldosa=`,
`res=`, `x=`, `vista=escena|mapa|hojas` y `marcas=0`. Las capturas se hacen con
`node prototipos/escala/captura.mjs <carpeta> "nombre|parámetros"` y salen idénticas cada vez.
