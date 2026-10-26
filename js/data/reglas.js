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
};
