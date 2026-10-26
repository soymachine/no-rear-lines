# El juego de Sin Retaguardia (mapa del proyecto)

_Vacío por ahora: aún no hay juego._ Aquí irá lo que es de este juego, y no del oficio:

- dónde vive cada sistema y sus cifras (simulación y pasos, combate y puntería, moral y supresión, órdenes, carros,
  artillería, objetivos y victoria, campaña), para citar `archivo:línea` en cada hallazgo;
- cómo se juega una batalla sin interfaz (el bot de playtest), qué deja su registro y qué métricas salen de él;
- las pruebas que ya existen y qué cubre cada una.

## Decisiones (2026-10-26)

- **Sin pausa.** El ritmo y las órdenes tienen que dejar que el jugador llegue sin parar el tiempo.
- **Realismo**: la moral y la supresión se tienen que sentir creíbles, no como un dado.
- **Prototipo**: un mapa hecho a mano con cinco baldosas, dos escuadras y un carro por bando (EE. UU. contra Alemania,
  Normandía 1944), línea de visión con niebla de guerra, moral, supresión, granadas de humo y sonido sintetizado.
- **Mapas grandes**, que se recorren con desplazamiento.

## Decisiones (segunda ronda, 2026-10-26)

- **Vista normal de 960×540 ×2** (480×270 m), una vista de cerca y un mapa táctico. Mapas de 1×1 km como objetivo.
- **El tiempo, siempre a 1:1.** El menú detiene la partida, pero con él abierto no se dan órdenes.
- **El humo, también de la IA**: las escuadras lo lanzan solas para retirarse o cruzar al descubierto bajo fuego.
- **Marcador de bando** bajo cada unidad, que se puede quitar.
