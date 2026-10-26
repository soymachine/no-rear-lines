# Generación procedural · los algoritmos clásicos

Los mapas de este género se hacen a mano: un mapa táctico bueno tiene intención en cada seto. Esta página es para lo
que algún día pueda generarse (escaramuzas al azar, variantes de un mapa hecho a mano, vestir un mapa con detalles,
repartir baldosas de relleno) y para entender por qué algo generado sale como sale.

Adaptado (y resumido) de la skill `procedural-gen` y su referencia `dungeon-generation.md` de
[gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
(Apache-2.0).

## Las reglas de oro

1. **Una semilla, el mismo mapa.** Todo sale de un `RNG` con semilla de `js/util/rng.js` que se pasa por toda la
   generación; nada de `Math.random()`. Así un fallo se repite y una huella del mapa puede compararse antes y después.
   **Trampas**: recorrer un `Set` u objeto cuyo orden depende de cómo se llenó, o leer estado global (la hora, los
   ajustes) dentro de la generación, rompen la semilla.
2. **Primero datos, luego dibujo.** El generador escribe una rejilla de ids de baldosa y listas (objetos, despliegues,
   objetivos); el dibujo es otra pasada. Un generador no dibuja nada.
3. **Validar y reparar, siempre.** Después de generar: todo lo que importa se alcanza desde cada despliegue (inundación
   o BFS), los objetivos existen y no hay zonas aisladas. Mejor reparar (abrir un paso) que descartar, porque
   descartar cambia la semilla de todo lo demás.
4. **Afinar con una semilla, comprobar con muchas.** Se ajusta mirando un mapa, pero se decide midiendo cientos: un
   generador que sale precioso en la semilla 42 y roto en una de cada diez es un generador roto.
5. **Bucles sin fin no.** Toda colocación con reintentos lleva un tope.

## Las técnicas

| Técnica | Cómo funciona | Para qué sirve |
|---|---|---|
| **Salas y pasillos** | rectángulos al azar sin solaparse (con 1 casilla de margen), unidos por pasillos en L | interiores, sótanos |
| **BSP** (partición binaria) | partir el área por el lado largo, recursivo, hasta un mínimo; una pieza por hoja; unir hermanas al volver | parcelas, manzanas de un pueblo, campos de setos |
| **Paseo aleatorio** | un excavador camina al azar abriendo suelo hasta un % | senderos, trincheras irregulares |
| **Autómata celular** | ruido inicial; una casilla es «llena» si ≥ 5 de sus 9 lo son; 4 pasadas | manchas de bosque, pantanos, charcas |
| **Ruido** (valor, Perlin, fBm) | campos continuos, varias octavas; una semilla para la altura y otra para la humedad | alturas, lomas, dónde crece qué |
| **WFC** | cada casilla empieza con todas las piezas posibles; se fija la de menos opciones y se propagan reglas de vecindad | pueblos o setos que siguen reglas locales con variedad |
| **Piezas a mano** | trozos dibujados que se estampan girados o reflejados donde caben | una granja, un cruce con su iglesia: intención dentro de lo generado |

**Conectar.** Unir cada pieza solo con la anterior da un árbol: un único camino. Mejor un árbol mínimo **más unas pocas
conexiones extra** para que haya bucles (§ 1 de `diseno-niveles.md`).

**Estampar a prueba.** Una pieza a mano se estampa, se comprueba que todo lo andable sigue unido (BFS) y, si algo
queda suelto, se deshace y se prueba otro sitio. Es más sencillo que calcular antes qué pisa.

## Repartir sin rachas

Una tirada ponderada pura da rachas largas (cinco granjas seguidas). Dos arreglos, los dos con el `RNG` con semilla:
- **Bolsa**: llenar una bolsa en proporción a los pesos, barajar y sacar sin reponer; al vaciarse, se rellena.
- **Peso que baja con el uso**: lo ya usado pesa menos (`peso / (1 + 1,5 × usados)`).
