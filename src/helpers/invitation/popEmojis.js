// Emoji de un Pop (body.emoji): lo identifica en /invitations › Pops
// (miniatura y junto al nombre) y en el encabezado del editor. No sale en la
// página del invitado.
//   body.emoji = '🎉'  → el que eligió (o el que se le puso solo al abrirlo)
//   body.emoji = ''    → lo quitó a propósito: sin emoji
//   sin body.emoji     → nunca se eligió: se sugiere uno (emojiSugerido) y el
//                        editor lo guarda la primera vez que se abre

export const EMOJIS_POP = [
    '🎉', '🥳', '🎊', '🎈', '🎂', '🍰', '🥂', '🍾',
    '🍻', '🍷', '🍸', '🍕', '🍔', '🌮', '🍣', '☕',
    '💌', '💍', '💐', '🌼', '🌸', '🌹', '❤️', '✨',
    '🎄', '🎃', '🕯️', '🎁', '🪩', '🎶', '🎤', '🎸',
    '🚀', '💼', '📈', '🎓', '🏆', '⚽', '🏖️', '✈️',
    '🏕️', '🎟️', '🍿', '🎬', '🎮', '👶', '🐶',
]

// Palabras del nombre → emoji (la primera que coincide gana).
const PALABRAS = [
    [/cumple|birthday|aniversario/, '🎂'],
    [/navidad|christmas|posada|xmas/, '🎄'],
    [/halloween|muertos/, '🎃'],
    [/boda|wedding|compromiso|pedida/, '💍'],
    [/baby|bebé|bebe|shower|bautizo/, '👶'],
    [/graduaci|gradua|egresad/, '🎓'],
    [/brunch|brindis|toast/, '🥂'],
    [/cena|dinner|comida|lunch|almuerzo/, '🍷'],
    [/pizza/, '🍕'],
    [/taco|carne asada|parrillada|bbq/, '🌮'],
    [/sushi/, '🍣'],
    [/café|cafe|coffee|desayuno/, '☕'],
    [/cerveza|beer|chela|bar\b/, '🍻'],
    [/kick-?off|lanzamiento|launch/, '🚀'],
    [/junta|ventas|reuni|meeting|comercial|oficina|equipo/, '💼'],
    [/premio|torneo|award/, '🏆'],
    [/fútbol|futbol|partido|soccer/, '⚽'],
    [/playa|beach|alberca|pool/, '🏖️'],
    [/viaje|trip|vuelo/, '✈️'],
    [/campamento|camping/, '🏕️'],
    [/picnic|flores|jardín|jardin|primavera/, '🌼'],
    [/cine|película|pelicula|movie/, '🍿'],
    [/concierto|música|musica|karaoke|banda/, '🎤'],
    [/fiesta|party|disco|antro|baile/, '🪩'],
    [/juego|gaming|videojuego|game/, '🎮'],
    [/perr|mascota|dog|gato/, '🐶'],
    [/san valent|amor|love|cita/, '❤️'],
]

// Uno de la lista que no cambia para el mismo Pop (según su id).
const fijoPorId = (id) => {
    const texto = String(id ?? '')
    let h = 0
    for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0
    return EMOJIS_POP[h % EMOJIS_POP.length]
}

/** Emoji que le toca a un Pop que nunca eligió uno: por su nombre o, si no, fijo por su id. */
export const emojiSugerido = (pop) => {
    const nombre = String(pop?.name ?? '').toLowerCase()
    const coincide = PALABRAS.find(([re]) => re.test(nombre))
    return coincide ? coincide[1] : fijoPorId(pop?.id)
}

/** El emoji que se ve: el elegido, ninguno si lo quitó, o el sugerido. */
export const emojiDePop = (pop) => {
    const elegido = pop?.body?.emoji
    if (elegido === '') return null
    return elegido || emojiSugerido(pop)
}
