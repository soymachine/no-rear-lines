# Los mapas de Sin Retaguardia (mapa del proyecto)

_Vacío por ahora: aún no hay mapas._ Aquí irá lo que es de este juego, y no del oficio:

- el formato de un mapa (rejilla, ids de baldosa, altura, objetos encima, despliegues, objetivos) y dónde se guardan;
- la tabla de baldosas con sus reglas (se anda y a qué coste para cada clase de unidad, tapa, cubre, frena, ruido,
  se rompe), generada de los datos;
- qué mapas hay y para qué escenario;
- las herramientas (medir, capturar) y las pruebas de los mapas.

## Decisiones (2026-10-26)

- **Mapas grandes**, hechos a mano, que se recorren con desplazamiento: el objetivo es **1×1 km** (250×250 casillas),
  como el de `prototipos/escala/`. En la vista normal (960×540 ×2) se ven 480×270 m, unas 2×4 pantallas por mapa.
- **El mapa del prototipo** (el primero): 128×72 casillas de 4 m (512×288 m) con cinco baldosas:
  - campo;
  - seto: tapa la vista, cubre poco y frena al carro;
  - camino;
  - casa: tapa y cubre; en el prototipo no se entra;
  - bosque: tapa, frena y el carro no pasa.

  Un objetivo en el cruce de la granja, dos rutas hacia él (los setos o el camino) y un despliegue en cada extremo.
- Teatro: Normandía, verano de 1944 (bocage).

## Decisiones (tercera ronda, 2026-10-26)

- **Los mapas son rejillas de texto** en un archivo de datos (una letra por casilla, con su leyenda), dibujadas por el
  map-designer. El editor visual, más adelante, en el admin.
