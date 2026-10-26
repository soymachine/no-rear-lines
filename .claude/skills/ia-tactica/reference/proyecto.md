# La IA de Sin Retaguardia (mapa del proyecto)

_Vacío por ahora: aún no hay simulación._ Aquí irá lo que es de este juego, y no del oficio:

- dónde vive cada sistema (rutas, formación, visión y contactos, supresión, moral, órdenes y obediencia, puntería,
  escuadra, mando del bando, carros) y sus tablas de datos con sus cifras;
- el paso de la simulación (cuántos por segundo), cada cuánto piensa cada nivel y el presupuesto por paso;
- los motivos de las decisiones (sus códigos) y cómo los enseña la interfaz;
- los escenarios de prueba, cómo se corren y qué esperan;
- la capa de depuración y cómo se enciende;
- si la IA del bando enemigo hace trampa en alguna dificultad, cuál y por qué.

## Decisiones (2026-10-26)

- **Tiempo real sin pausa**: 10 pasos por segundo. El tiempo no se para para dar órdenes.
- **Línea de visión** con `fov.js`, baldosas opacas o no (lo que tapa a medias, más adelante); **niebla de guerra**:
  el jugador solo ve lo que ven sus unidades; **detección** en un segundo, más lenta si el enemigo está tumbado.
- **Moral**: cuatro estados (en forma, suprimido, acobardado, pánico). Avanzar se puede negar, siempre con su motivo a
  la vista; retirarse y esconderse, casi nunca. Heroico y rendirse, más adelante. **Se tiene que sentir realista.**
- **Granadas de humo** en el prototipo: tapan la vista mientras dura la cortina.
- Prototipo: dos escuadras y un carro por bando, EE. UU. contra Alemania.

## Decisiones (segunda ronda, 2026-10-26)

- **El tiempo va siempre a 1:1**: ni se acelera ni se ralentiza.
- **El menú (Esc) detiene la partida** para salir o guardar, pero con él abierto no se pueden dar órdenes: no es una
  pausa táctica.
- **Granadas de humo**: las lanza el jugador con la orden HUMO, y también la IA por su cuenta en lo obvio, cuando una
  escuadra se retira o tiene que cruzar al descubierto bajo fuego.

## Decisiones (tercera ronda, 2026-10-26)

- **El prototipo empieza por la simulación en Node**: mapa, unidades, pasos fijos, línea de visión, supresión y moral,
  con pruebas deterministas. Enseguida, un dibujo mínimo encima para verla moverse.

## Decisiones (cuarta ronda, 2026-10-26)

- **El seto tapa la vista del todo, salvo para quien está pegado a él**: un soldado en el seto (o junto a él) ve y
  dispara al campo de al lado, como en el bocage real. Los setos son posiciones de tiro, no solo paredes.
- **Escuadras del prototipo**: EE. UU., 10 hombres (jefe con Thompson, un BAR y 8 M1 Garand); Alemania, 10 hombres
  (jefe con MP 40, la MG 42 con su tirador y dos sirvientes, y fusileros con Kar 98k). Carros: M4 Sherman (75 mm)
  contra Panzer IV H.
- **Bajas**: herido (fuera de combate, se queda y asusta a los suyos) y muerto; sin curación en el prototipo.
- **Victoria**: quien controle el patio de la granja a los 15 minutos (más soldados en condiciones dentro), o antes si
  el otro bando se rompe.
- **El jugador lleva a EE. UU. (ataca)** y la IA a Alemania (llega antes y defiende la granja).
