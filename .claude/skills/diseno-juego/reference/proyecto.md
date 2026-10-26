# El juego de Sin Retaguardia (mapa del proyecto)

Lo que es de este juego, y no del oficio.

- **Dónde vive cada sistema**: la simulación en `js/sim/` (el detalle, en `reference/proyecto.md` de `ia-tactica`);
  todas las cifras en `js/data/reglas.js`, `armas.js` y `unidades.js`.
- **Jugar una batalla sin interfaz**: `node tools/batalla.mjs --semilla N [--todo] [--json salida]`. EE. UU. sigue un
  guion de órdenes y Alemania la IA; saca los sucesos que importan y el resumen (quién gana, cómo quedan los dos
  bandos, cuántos sucesos de cada tipo). Es el germen del bot.
- **Pruebas**: `node tests/sim.mjs` y `node tests/datos.mjs`.

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

## Decisiones (tercera ronda, 2026-10-26)

- La resolución de dibujo se adapta a la pantalla con ×2 fijo: una pantalla más grande ve más mapa.
- El prototipo empieza por la simulación en Node con pruebas deterministas, y luego un dibujo mínimo.
- Los mapas, rejillas de texto en datos; el editor visual, más adelante.

## Decisiones (cuarta ronda, 2026-10-26)

- Setos: tapan del todo salvo para quien está pegado a ellos (posiciones de tiro).
- Escuadras de 10 (EE. UU.: Thompson, BAR y 8 M1; Alemania: MP 40, MG 42 con dos sirvientes y Kar 98k); Sherman contra
  Panzer IV H.
- Bajas: herido y muerto, sin curación.
- Victoria: el patio de la granja a los 15 minutos, o antes si el otro bando se rompe.
- El jugador ataca con EE. UU.; la IA defiende con Alemania.

## El casco oculto (`REGLAS.casco`, game-designer, 2026-10-26)

Las cifras: `{ torreta: 0.35, cerca: 0.85, hasta: 50, pegado: 1, baldosas: ['seto'], parado: true }`. La regla, en
`disparaCañon` e `impactoCarro` de `js/sim/partida.js`:
- **A un carro a la vista**, `torreta` (35 %) de los impactos van a la torreta, su parte de la silueta (antes era un
  0,35 escrito en el código; mismo azar, mismas batallas).
- **Al oculto** (parado y con un seto pegado hacia el tirador), de los tiros que le darían solo llega a la torreta
  `cerca` (85 %) a quemarropa, que baja en línea hasta `torreta` (35 %) a `hasta` (50) casillas y más; el resto se lo come
  el talud. El cañonazo que se come el talud sale con `acierta: false, talud: true` y cae en el seto, a 0,8 casillas
  del carro hacia el tirador (para que se vea por qué no le dio).
- **Por qué así**: de cerca la dispersión es pequeña y se apunta a la torreta (el blanco pequeño casi no importa); de
  lejos la dispersión reparte los tiros por la silueta y a la torreta le llega lo mismo que si el carro estuviera a la
  vista. Así el seto **nunca hace más fácil de matar a un carro a distancia**, ni al Panzer IV de torreta fina (50 mm):
  la regla anterior (×0,6 constante, todo a la torreta) le hacía perder a 50 casillas de frente (79 % → 67 %), y el
  jugador lo leería al revés.
- **Solo parado** (`parado`): el casco oculto es una posición que se toma (meter el morro contra el talud), no un regalo
  del camino entre setos. Un carro que va por el camino `#==#` ya no lo tiene (ya paga ×0,7 por moverse); parado en él,
  sí.
- **No se toca la letalidad**: que el primer impacto que atraviesa mate es histórico. Lo que alarga el duelo es el casco
  oculto de lejos (el Sherman oculto a 50 casillas: 21 s y 3 disparos, antes 11–16 s).

`node tools/duelo.mjs --n 400`, gana el oculto (con la regla anterior → con la nueva; sin la regla):

| oculto | geometría | 15 casillas | 30 | 50 |
|---|---|---|---|---|
| Panzer IV | frente | 70 → **64** (51) | 68 → **69** (52) | 67 → **79** (79) |
| Panzer IV | flanco | 70 → **64** (51) | 68 → **69** (52) | 67 → **79** (51) |
| Panzer IV | cruza (gana el Sherman) | 15 → **16** (7) | 15 → **12** (19) | 14 → **7** (7) |
| Sherman | frente o flanco | 74 → **67** (56) | 71 → **71** (55) | 34 → **55** (23) |
| Sherman | cruza (gana el Panzer) | 12 → **12** (19) | 12 → **9** (19) | 11 → **5** (19) |

- Barrido (400 semillas): `cerca` 0,6 / 0,75 / 0,85 / 1 apenas mueve de 30 casillas para arriba; a 15, cuanto más alto,
  menos ventaja (Panzer de frente 69 / 66 / 64 / 59 %). `hasta` 60 deja al Panzer a 50 casillas en el 75 % (pierde
  frente al 79 % sin la regla); 40 o 50, en el 79 %. Se queda 0,85 y 50: a 60 m la torreta se acierta casi siempre.
- **El caso que queda al revés**: el Panzer IV oculto, emboscando a un Sherman que le cruza a 15 casillas (60 m): el
  Sherman gana el 16 % (sin la regla, el 7 %), porque sin el seto los tiros irían a un casco de 85 mm en ángulo y con él
  van a la torreta de 50 mm, que le apunta de frente. Es histórico y solo pasa a quemarropa; a 30 casillas ya ayuda.
- `node tools/batalla.mjs`, semillas 1–20: las 20 huellas iguales antes y después (en el guion no hay duelo de carros).
  Con el Sherman metido en la granja a los 200 s (sin fin por rotura): el Sherman mata al Panzer en 7 y el Panzer al
  Sherman en 4, igual que antes; los 4 cañonazos que antes iban contra «casco oculto» eran al Sherman **moviéndose** por
  el camino entre setos (ahora ya no lo está; los 4 fallaron igual). Los duelos de la granja son a 3–11 casillas.
- Prueba en `tests/sim.mjs`: el Panzer IV oculto a 50 casillas de frente gana al menos lo mismo que sin la regla.
- **La detección no cambia** (P38, pendiente). Medido aparte, con el carro oculto, parado y sin disparar detectado a
  ×0,6 / ×0,4 / ×0,2: en el duelo apenas cambia nada (±3 puntos, dentro del ruido), porque el emboscado ya está apuntado,
  dispara primero y al disparar se le ve. Su efecto estaría en la niebla de guerra (ver el carro antes de que dispare),
  que el duelo no mide.
- **De los datos, no de la regla**: el 75 mm M3 atraviesa 90 − 0,1·d mm (`armas.js`) y el frente del casco del IV H
  cuenta 85 mm: a 50 casillas (200 m) y más, de frente, rebota siempre. Por eso, sin el seto, el Panzer de frente a 50
  casillas gana el 79 %. Si se quiere que el Sherman pueda con él de frente más lejos, es la penetración del M3 o el
  blindaje del IV, no el casco oculto.
