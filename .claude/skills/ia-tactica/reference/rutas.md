# Rutas, formación y movimiento

## Rutas en rejilla

- **La rejilla del mapa**: 8 vecinos, coste por baldosa y por **clase de movimiento** (a pie, ruedas, orugas). La
  diagonal cuesta √2 veces. Una diagonal no pasa entre dos casillas que bloquean (no se cortan esquinas). Prohibido es
  coste infinito, no un número grande.
- **A\*** con heurística octil (`max(dx,dy) + (√2 − 1)·min(dx,dy)`) multiplicada por el **coste mínimo** de una casilla
  para esa clase. Así es admisible. Los empates se rompen en un orden fijo (por f, luego por h, luego por orden de
  entrada): si no, dos rutas iguales salen distintas según el motor.
- **Sin basura por búsqueda**: arrays tipados del tamaño del mapa (`Float32Array` para g, `Int32Array` para el padre) y
  un contador de generación para no vaciarlos cada vez; un montículo binario para la frontera.
- **Suavizar** la ruta con «tirar de la cuerda»: desde cada punto, saltar al más lejano que se ve en línea recta por
  casillas andables (con la línea «supercover», que toca todas las casillas que cruza). Sin suavizar, los soldados
  andan en zigzag de ajedrez.
- **Presupuesto**: un número máximo de nodos expandidos por paso para todas las rutas juntas. Las peticiones esperan en
  cola, y la unidad empieza a moverse hacia el destino en línea recta mientras tanto, si puede.

## Rutas tácticas

La ruta más corta casi nunca es la buena. Al coste del terreno se le suma:
- **la exposición**: un mapa de amenaza (las casillas que ven los enemigos conocidos, con su peso por arma y distancia)
  que se rehace cada pocos segundos. La ruta **cubierta** lo pesa mucho; la **rápida**, poco o nada. La orden del
  jugador elige cuál (MOVER frente a CORRER, o un modificador);
- **la cobertura**: pasar junto a setos, muros y zanjas abarata la ruta cubierta;
- **lo conocido peligroso**: campos de minas, zonas bajo fuego de artillería.

Una ruta cubierta puede ser el doble de larga. Si es más del triple, avisa (con el motivo) o elige la rápida: una
escuadra que da la vuelta al mapa para no exponerse parece rota.

## Muchas unidades

- **Campos de flujo** (un Dijkstra desde el destino a todo el mapa): cuando muchas unidades van al mismo sitio (todo
  un bando hacia un objetivo), uno sirve para todas. Se rehace cuando cambia el destino o el mapa (un puente volado,
  un carro destruido que bloquea).
- **La escuadra pide una ruta** (la del jefe o la del centro) y los soldados siguen sus huecos de formación a lo largo
  de ella. No hay diez rutas por escuadra.
- **Mapas grandes**: A\* jerárquico (HPA\*). El mapa se parte en bloques, con rutas entre las puertas de cada bloque
  ya calculadas. Solo si el A\* plano no cabe en el presupuesto: mídelo antes.

## Obstáculos que se mueven

- Las unidades no son muros para el A\*: si lo fueran, la ruta cambiaría a cada paso. Se esquivan en local:
  separación entre soldados (una fuerza que los aparta si se acercan a menos de un radio) y, si alguien bloquea un paso
  estrecho, espera o rodeo.
- La infantería se aparta de los carros. Un carro no atropella a sus propios soldados: frena.
- Un carro destruido o una casa derrumbada **cambian el mapa** (son obstáculo y cobertura): se avisa a las rutas y a
  los campos de flujo que los cruzan.
- Si una unidad lleva un rato sin avanzar hacia su siguiente punto, replanifica (con un tope de veces) y, si no puede,
  lo dice con su motivo («bloqueado»).

## Formación

- **Las formaciones de una escuadra**:
  - **columna**: por caminos, pasos estrechos y bosque;
  - **línea**: el máximo de fuego hacia delante, para asaltar o defender;
  - **cuña**: por defecto en campo abierto, con fuego hacia delante y a los lados;
  - **dispersa**: bajo artillería o con aviones.
- **Huecos relativos al jefe**, en el marco de su rumbo: `hueco = jefe + girar(desplazamiento, rumbo)`. La separación
  crece con la amenaza (con artillería, 2–3 veces más): una granada no puede matar a media escuadra.
- **El hueco se ajusta al terreno**: si cae en una casilla prohibida o al descubierto, el soldado busca la casilla
  andable más cercana, y con cobertura si la escuadra está en contacto (dentro de un radio pequeño alrededor del hueco).
- **En los pasos estrechos**, la escuadra pasa a columna sola y se rehace al salir.
- **Cohesión**: si un soldado se queda lejos de su hueco más de un rato (por el terreno, la supresión), la escuadra
  frena o lo espera, según la orden. Fuera del radio de mando, el soldado actúa por su cuenta.
- **Si muere el jefe**, manda el siguiente en la cadena de mando, con un golpe a la moral y un momento de desconcierto.

## Movimiento

- **Modos**:
  - andar;
  - correr: más rápido, cansa y desluce la puntería;
  - arrastrarse: muy lento, difícil de ver y con poca exposición;
  - **a cubierto**: de cobertura en cobertura, parando en cada una.

  Lo elige la orden y lo cambia la situación: un soldado suprimido no corre, se arrastra.
- **Velocidad por baldosa y por postura**, de los datos. La fatiga baja la velocidad y la puntería, y se recupera
  parado.
- **El rumbo se interpola**, para que el dibujo no salte, pero el soldado mira hacia la amenaza aunque ande hacia otro
  lado si está en contacto.
