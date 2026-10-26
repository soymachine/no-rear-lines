// Las cifras de la simulación que no son de un arma ni de una unidad: el paso, la vista, la supresión, la moral, la
// obediencia y la victoria. Aquí las ajusta el game-designer; el tactical-ai decide cómo se usan.
export const REGLAS = {
  paso: 0.1, // segundos por paso (10 por segundo)
  // movimiento de un soldado, en casillas por segundo (el coste de la baldosa lo divide)
  velocidad: { andar: 0.35, correr: 0.75, arrastrarse: 0.08 },
  // vista y detección
  vista: 75, // casillas (300 m)
  detectar: { pie: 1.0, tierra: 0.45, carro: 2.5, disparando: 2 }, // lo que se llena por segundo hasta 1 (detectado)
  olvido: 30, // segundos que dura un contacto que no se ve
  pensar: 5, // cada cuántos pasos mira cada soldado (escalonado por id)
  // supresión (0–100)
  supresion: { vidaMedia: 3.5, vidaMediaCubierto: 2, tumbarse: 25, suprimido: [40, 25], fijado: [80, 55] },
  // moral (0–100): estados con histéresis [entra, sale]
  moral: {
    acobardado: [35, 45], panico: [15, 30],
    bajaCompañero: 7, bajaCerca: 10, cerca: 5, jefe: 15, carro: 0.8, radioCarro: 25,
    recupera: 0.6, recuperaCubierto: 1.2, jefeCerca: 0.4, radioJefe: 8, contagio: 0.5, radioContagio: 4,
  },
  // obediencia: lo que pesa cada cosa en la disposición a cumplir una orden de avanzar
  obediencia: { suprimido: 0.55, jefeCerca: 0.15 },
  // humo
  humo: { alcance: 8, radio: 3, vida: 45, lanzar: 1.5, umbralIA: 35 },
  // bajas: de un impacto, ¿herido o muerto? lo dice la letalidad del arma
  // victoria
  victoria: { tiempo: 900, roto: 0.6 },
  // el mapa de amenaza (js/sim/amenaza.js) y la ruta cubierta: lo que pesa cada fuente (cada contacto; sin contactos,
  // cada punto del despliegue enemigo, y siempre cada punto de su llegada esperada hasta `avance` de su largo, uno cada
  // `rejilla` casillas), cuánto cae a la distancia máxima (lejos), el tope por casilla, cuánto encarece una casilla a
  // la vista (por unidad de amenaza) la ruta de cada orden y hasta dónde se corre el hueco de cada soldado en la
  // formación buscando la casilla menos vista (hueco casillas; huecoPeso casillas² por unidad de amenaza). Las órdenes
  // de `cubiertas` van por la ruta cubierta si no dicen otra cosa (las del jugador: MOVER por lo cubierto, CORRER por
  // lo rápido), y el mapa de cada bando se mira cada `cada` pasos (se rehace solo si cambian sus fuentes)
  amenaza: {
    soldado: 1, carro: 3, despliegue: 0.6, avance: 0.6, rejilla: 4, lejos: 0.5, tope: 3,
    peso: { mover: 4, correr: 3, carro: 4 }, hueco: 2, huecoPeso: 4, cubiertas: ['mover'], cada: 30,
  },
  // el casco oculto: un carro (parado, si parado) con una de estas baldosas pegada (a ≤ pegado casillas de su centro)
  // entre él y quien le dispara solo enseña la torreta. A un carro a la vista, `torreta` de los impactos le van a la
  // torreta (su parte de la silueta) y el resto al casco. Al oculto, de los tiros que le darían solo llega a la torreta
  // `cerca` a quemarropa (se le apunta a ella y la dispersión es pequeña), que baja en línea hasta `torreta` a `hasta`
  // casillas y más (de lejos la dispersión reparte los tiros por la silueta); el resto se lo come el talud del seto.
  // Así el seto nunca hace a un carro más fácil de matar a distancia, ni siquiera al Panzer IV de torreta fina, y parado
  // porque el casco oculto es una posición que se toma (meter el morro contra el talud), no un regalo del camino entre
  // setos. Medido con tools/duelo.mjs (game-designer, 2026-10-26)
  casco: { torreta: 0.35, cerca: 0.85, hasta: 50, pegado: 1, baldosas: ['seto'], parado: true },
  // el mando de la IA (js/sim/ia.js): cada cuántos pasos piensa, dónde busca sus setos (casillas por delante del
  // objetivo y separación entre escuadras), cuánto le importa que su posición de tiro se vea de lejos, y cada cuánto
  // puede rehacer la ruta de una escuadra que va de camino si cambia lo que sabe
  ia: {
    cada: 30, delante: 10, separa: 14, exponeTiro: 12, replanea: 100,
    // el carro: busca dónde emboscar a menos de `radio` del objetivo, tirando a `tiro` [mín, máx] casillas sobre la
    // llegada que espera del carro enemigo (de flanco vale más: flanco), sin que se le vea de lejos (expone) y junto a
    // un seto o una casa, sin pasar de `adelante` casillas por delante del objetivo; espera `atras` casillas detrás
    // del objetivo hasta que tenga una escuadra a menos de `escolta`
    carro: { radio: 14, adelante: 6, tiro: [4, 40], flanco: 0.6, expone: 0.5, lejos: 0.01, escolta: 12, atras: 8 },
  },
};
