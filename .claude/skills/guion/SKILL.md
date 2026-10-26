---
name: guion
description: El oficio de escribir los textos de Sin Retaguardia, un juego táctico en tiempo real de la Segunda Guerra Mundial (guerrillas, carros y bombardeos pequeños), y de traducirlos al inglés. Cubre los informes de batalla, las órdenes y sus confirmaciones, la ficha de cada unidad (nombres, rangos, historial), los gritos de los soldados en combate, la radio, los textos de la campaña, los nombres de mapas y unidades, la interfaz, el tono de la época, el respeto a los hechos reales y la traducción al inglés, que va siempre al día con el español. Úsala ante cualquier petición sobre los textos del juego: escribir o retocar un texto, la voz de un bando o de un soldado, si un texto cuadra con los datos, un texto sin traducir o mal traducido, o las notas de prueba de tipo texto.
---

# Guion

En un juego táctico en tiempo real se lee poco y deprisa: un grito de dos palabras en medio del combate, la
confirmación de una orden, el nombre de una unidad, el informe al acabar la batalla. Cada texto tiene que entenderse
de un vistazo, sin parar el juego, y sonar a su época.

El mapa de los textos de este proyecto (dónde vive cada familia, cómo se traduce, cómo se comprueba) va en
[reference/proyecto.md](reference/proyecto.md). La traducción tiene su guía en
[reference/traduccion.md](reference/traduccion.md) y las recetas en [reference/recetas.md](reference/recetas.md).

## Qué se escribe aquí

- **Los gritos** de los soldados en combate: por situación (orden recibida, suprimidos, herido, carro a la vista,
  granada, sin munición, retirada, objetivo tomado), muy cortos, con 3–6 variantes cada uno para que no se repitan.
  Los dice el que lo vive, no un narrador.
- **Las órdenes y sus confirmaciones**: el nombre de la orden en la interfaz (MOVER, CORRER, ARRASTRARSE, DISPARAR,
  SUPRIMIR, ESCONDERSE, DEFENDER, HUMO) y lo que contesta la escuadra. Si la escuadra no obedece, su respuesta dice por
  qué, en su idioma: «¡No podemos, nos están machacando!».
- **La ficha de cada unidad**: nombre y apellido, rango, arma, experiencia, lo que ha hecho. Los nombres según el país
  y la época, sin repetir dentro de un bando.
- **El informe de batalla**: qué pasó, quién cayó, quién se distinguió. Seco y concreto, como un parte.
- **La campaña** (si la hay): el contexto de cada batalla en pocas líneas, como una orden o una carta.
- **La interfaz**: botones, ayudas y avisos. Lo más corto posible y siempre igual para lo mismo.

## El tono

- **La guerra vista desde abajo**: la escuadra, el barro, el miedo, el compañero que no vuelve. Ni épica de cartel ni
  cinismo moderno.
- **Frases cortas. Gestos concretos en vez de emociones nombradas**: «Se queda mirando el casco» y no «está triste».
- **La verdad, a trozos**: un informe no lo explica todo; lo que no se sabe no se inventa.
- **Humor negro, poco y seco**, el de los soldados entre ellos. Nunca a costa de las víctimas.
- **Las palabras de la época**, ni jerga moderna ni guiños al jugador. Los términos militares, los de entonces y los de
  cada ejército (rangos, unidades, armas), consultados en fuentes serias.
- **Cada bando, su voz**: un ejército regular habla con el reglamento; una guerrilla, con apodos, pocas palabras y la
  tierra que pisa. Los soldados extranjeros dicen en su idioma lo que todo el mundo entiende (las órdenes, los gritos),
  con cuidado de no caer en la caricatura.

## Las reglas

- **Español de España.** El narrador y la interfaz, de tú al jugador («Despliega tus escuadras»), salvo que el
  proyecto decida otra cosa.
- **Comillas**: lo que se dice va entre comillas latinas «…», y lo citado dentro de ellas, entre "…". En inglés: “…” por
  fuera, ‘…’ por dentro y el apóstrofo tipográfico ’.
- **Siempre en los dos idiomas a la vez.** Un texto nuevo o cambiado en español lleva su inglés en el mismo commit.
- **Los huecos se conservan** (`{unidad}`, `{n}`, `{rango}`…) y el plural va con su forma (`{ one, other }`).
- **Lo que no se traduce**: los nombres propios de las personas; lo que se compara en el código (para eso, ids).
- **Respeto**:
  - ninguna persona real como personaje;
  - los hechos y las víctimas reales, solo de fondo y con respeto;
  - nada que glorifique crímenes de guerra ni que culpe o exculpe a un pueblo entero;
  - los símbolos de regímenes, con el cuidado que pida la ley de cada país donde se publique (pregúntalo antes de usar
    uno).
- **Que quepa**: un grito o un botón tiene su sitio en la pantalla. Míralo en la captura.

## Las comprobaciones

Pendientes: los scripts están por escribir. Cuando haya textos y un mecanismo de traducción, hacen falta:
- **paridad**: cada texto español tiene su inglés y los mismos huecos; los sobrantes, aparte;
- **leer seguido**: todos los gritos de una situación o todos los textos de una pantalla, en los dos idiomas;
- y una prueba del navegador que recorra las pantallas en inglés buscando español.

Mientras tanto: `eslint --quiet js tools` (un apóstrofo sin escapar rompe el módulo) y leer los textos en su pantalla.

## Lo aprendido

- 2026-10-25: el texto de trabajo del usuario que sale de un archivo suyo (sus notas, sus propuestas) no se traduce:
  se pinta con `lang="es"`, `translate="no"` y una marca para que las pruebas de idioma no lo cuenten como español sin
  traducir. La interfaz de alrededor sí se traduce.
