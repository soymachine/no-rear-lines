// Los textos de la interfaz del prototipo, en los dos idiomas. tests/datos.mjs comprueba que cada uno tiene los dos.
export const TEXTOS = {
  orden: { mover: { es: 'MOVER', en: 'MOVE' }, correr: { es: 'CORRER', en: 'RUN' }, esconderse: { es: 'ESCONDERSE', en: 'HIDE' }, humo: { es: 'HUMO', en: 'SMOKE' }, retirada: { es: 'RETIRADA', en: 'FALL BACK' }, alto: { es: 'ALTO', en: 'STOP' } },
  // lo que contesta la escuadra cuando no cumple, por el motivo de la mayoría
  respuesta: {
    suprimido: { es: '¡No podemos, nos están machacando!', en: "We can't, they're pinning us down!" },
    fijado: { es: '¡Imposible levantar la cabeza!', en: "Can't lift our heads!" },
    acobardado: { es: 'Los hombres no se mueven.', en: "The men won't move." },
    panico: { es: '¡Se han desbandado!', en: "They're running!" },
    cumple: { es: '¡Entendido!', en: 'Understood!' },
    aMedias: { es: 'Solo algunos obedecen.', en: 'Only some obey.' },
  },
  estado: { forma: { es: 'en forma', en: 'steady' }, suprimido: { es: 'suprimidos', en: 'suppressed' }, acobardado: { es: 'acobardados', en: 'cowering' }, panico: { es: 'en pánico', en: 'panicking' }, herido: { es: 'heridos', en: 'wounded' }, muerto: { es: 'muertos', en: 'dead' } },
  hud: {
    quedan: { es: 'quedan', en: 'left' }, humo: { es: 'humo', en: 'smoke' }, moral: { es: 'moral', en: 'morale' },
    gana: { es: 'Victoria', en: 'Victory' }, pierde: { es: 'Derrota', en: 'Defeat' }, roto: { es: 'el enemigo se ha roto', en: 'the enemy has broken' }, rotos: { es: 'tus hombres se han roto', en: 'your men have broken' },
    objetivo: { es: 'por la granja', en: 'for the farm' }, menu: { es: 'Partida detenida · Esc para seguir', en: 'Game halted · Esc to resume' },
    ayuda: { es: 'Clic: elegir · clic derecho: órdenes · M C H: mover, correr, humo · E R X: esconderse, retirada, alto · 1 2 3 · rueda: vista · WASD · B: marcas', en: 'Click: select · right click: orders · M C H: move, run, smoke · E R X: hide, fall back, stop · 1 2 3 · wheel: view · WASD · B: marks' },
    destruido: { es: 'destruido', en: 'destroyed' },
  },
};
