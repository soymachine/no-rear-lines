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
