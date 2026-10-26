# Diseño de niveles · qué hace bueno un mapa táctico

Una batalla aquí es: dos bandos despliegan cada uno en su lado, se buscan, se ven, se disparan, se suprimen y maniobran
por el terreno para tomar o defender unos objetivos, en tiempo real y sin pausa. El mapa es la mitad del juego: decide
qué decisiones hay. Revisa cada mapa con estas preguntas, respóndelas con cifras y con la captura y, al final, pasa la
lista de revisión (§ 9).

(La curva de tensión, el ciclo de enseñar y examinar, cómo guiar al jugador y la lista de revisión están adaptados de
la skill `level-design` y su referencia `pacing-and-flow.md` de
[gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills),
Apache-2.0.)

## 1. Rutas de aproximación

- **Siempre más de un camino hacia cada objetivo.** Una ruta cubierta y lenta (setos, zanjas, bosque) y otra rápida y
  expuesta (el camino, el campo abierto) es la decisión básica del género. Un mapa con un solo pasillo obligatorio es
  una cola, no una batalla.
- **Bucles mejor que árboles**: los bucles permiten flanquear, retirarse por otro lado y sorprender. Un callejón sin
  salida es una trampa (a veces buscada: un pueblo con una sola entrada).
- **Los flancos existen y se ven**: si el que defiende no puede cubrir todo, el que ataca tiene que poder descubrir el
  hueco mirando el mapa.
- **Hitos que se reconocen**: la iglesia, el molino, el cruce, el puente. Orientan y dan nombre a las órdenes («a la
  casa del cruce»).

## 2. Terreno clave y objetivos

- **El terreno clave** es lo que da ventaja a quien lo tiene: una loma que ve todo el valle, el único puente, una casa
  de piedra en el cruce. Un buen mapa tiene 2–4, y no todos en el mismo sitio.
- **Los objetivos** (las banderas, los puntos de victoria) van en terreno que se puede defender **y** atacar desde más
  de un lado. Un objetivo que solo se toma de frente por un campo abierto es una carnicería; uno imposible de defender
  no es objetivo.
- **Entre los objetivos, decisiones**: tomar uno debería exponerte respecto a otro, o abrirte el camino al siguiente.

## 3. Cobertura, vista y zonas muertas

- **Cobertura donde se pelea**: cerca de los objetivos, de los cruces y de las rutas. Muy poca deja el tiroteo al azar;
  demasiada hace que nadie se exponga nunca y nadie suprima a nadie.
- **Lo que tapa y lo que cubre no es lo mismo**: un seto alto tapa la vista pero no para las balas; un muro bajo para
  las balas pero deja ver por encima; un trigal tapa a quien está cuerpo a tierra. Cada baldosa tiene su par «tapa /
  cubre», y el mapa los mezcla.
- **Mezcla de distancias**: líneas de tiro largas (un valle, una carretera recta) para las ametralladoras y los carros;
  distancias cortas (un pueblo, un bosque) para los subfusiles y las granadas. Un mapa con solo una de las dos hace
  inútil la mitad de las armas.
- **Zonas muertas**: hondonadas y contrapendientes que no se ven desde una posición. Son por donde se acerca el que
  ataca. Un mapa sin zonas muertas es una galería de tiro; uno que es todo zona muerta, un laberinto.
- **Campo abierto con coste**: cruzarlo tiene que ser una decisión visible (humo, apoyo de fuego, correr), no lo
  normal en todo el mapa.

## 4. Carros

- **Terreno practicable y terreno prohibido**: el bosque denso, el pantano, el río sin puente y las calles estrechas
  frenan o paran a un carro. Lo que no es practicable se tiene que ver en el mapa sin leer nada.
- **Los caminos canalizan a los carros**, y por eso son donde se les embosca. Un buen mapa da a la infantería sitios
  desde donde atacar a un carro de lado o por detrás, y al carro, sitios desde donde usar su alcance sin que se le
  acerquen.
- **Ningún carro invencible ni inútil**: si el mapa no deja que la infantería se acerque nunca a un carro, el carro lo
  gana solo; si todo es bosque y pueblo, el carro no pinta nada. Salvo que el escenario lo busque a propósito.

## 5. Despliegue y primer contacto

- **Cada bando, su zona de despliegue**, con cobertura y fuera de la vista del otro. Nadie despliega bajo fuego.
- **El primer contacto, ni inmediato ni eterno**: entre las dos zonas de despliegue tiene que haber unos minutos de
  aproximación con decisiones (por dónde ir, qué explorar), no un paseo vacío.
- **El que defiende y el que ataca tienen las dos cosas que hacer**: el defensor elige dónde ponerse y puede
  contraatacar; el atacante elige por dónde entrar.

## 6. Ritmo

- **En dientes de sierra**: aproximación (tensión que sube), contacto (pico), lucha por el objetivo, respiro (reagrupar,
  recargar, curar la moral), contraataque. Cada pico un poco más alto. **Un respiro justo antes del pico más duro** (una
  casa a cubierto antes del último campo) hace que el pico pese más.
- **El tamaño frente al tiempo**: si cruzar el mapa consume casi todo el tiempo de la batalla, no hay maniobra, solo
  carrera. Si sobra mucho, la batalla se estanca.

## 7. Enseñar antes de examinar

Cada cosa nueva (el humo que tapa, un río que solo se vadea en un sitio, el primer carro) se aprende en cuatro pasos, y
el mapa (o la campaña) los ordena:
1. **Presentarlo** solo y sin coste.
2. **Practicarlo** junto a algo que ya se sabe.
3. **Variarlo**: el mismo principio en otro contexto.
4. **Examinarlo** con presión, cuando ya importa.

Lo nuevo nunca aparece por primera vez en medio de un examen mortal.

## 8. Lectura: que se entienda de un vistazo

- **Una baldosa, una regla**: lo que se anda, lo que tapa, lo que cubre y lo que frena se distinguen por la baldosa
  sin leer un tooltip. Si dos baldosas con reglas distintas se parecen, es un error de diseño, no de arte.
- **Con unidades, humo y noche encima**: el mapa se tiene que leer igual con veinte soldados, un carro ardiendo y una
  cortina de humo.
- **La altura se ve**: si una loma da ventaja, tiene que verse que es una loma.
- **Variedad sin ruido**: variantes de baldosa y detalles, sí; colores que no significan nada, no.

## 9. Lista de revisión

Antes de dar por bueno un mapa:
- [ ] Hay más de una ruta hacia cada objetivo, con bucles; los flancos existen y se ven.
- [ ] Hay 2–4 sitios de terreno clave, repartidos; cada objetivo se ataca y se defiende desde más de un lado.
- [ ] Hay peleas largas y cortas posibles, cobertura donde se pelea, zonas muertas y campo abierto como decisión.
- [ ] Los carros tienen por dónde ir y por dónde los pueden emboscar; ninguno gana solo ni es inútil.
- [ ] Cada bando despliega a cubierto; el primer contacto llega tras una aproximación con decisiones.
- [ ] La tensión sube en dientes de sierra, con un respiro antes del pico más fuerte.
- [ ] Lo nuevo se presenta tranquilo antes de examinarse.
- [ ] Se lee qué tapa, qué cubre y qué frena, también con unidades, humo y de noche.
- [ ] Funciona sin el atrezo: si solo con el suelo y la cobertura no hay decisiones, el dibujo no lo arregla.
- [ ] Lo ha jugado alguien (el bot o una persona), no solo quien lo diseñó.

## Las medidas que conviene tener

Cuando haya mapas, un script que los mida sin navegador (pendiente de escribir) debería
dar estas cifras. Ajusta las señales de alarma con lo que mida el juego:

| Medida | Qué mira | Señal de alarma |
|---|---|---|
| `alcanzable` | % de lo andable que se alcanza desde cada despliegue | < 95 % (zonas muertas por error) |
| `rutas` | rutas distintas de cada despliegue a cada objetivo, y cuánto más larga es la segunda | una sola ruta |
| `abierto` | % de casillas sin cobertura a ≤ 2 casillas | > 60 % fuera de lo buscado |
| `vistaLarga` | % de líneas de vista ≥ 12 casillas desde los objetivos | 0 % o > 50 % |
| `zonaMuerta` | % de casillas que no se ven desde ninguna posición del defensor | 0 % o > 40 % |
| `carro` | % del mapa practicable para un carro, y si une los dos despliegues | 0 % o 100 % sin quererlo |
| `contacto` | pasos entre las dos zonas de despliegue por la ruta más corta | según la duración de la batalla |
