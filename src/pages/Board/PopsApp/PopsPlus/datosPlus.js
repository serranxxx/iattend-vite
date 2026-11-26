/*
  Datos del sistema Pops+ en la app (handoff "Pops+ en la App"): las tablas de
  comparación y las frases de la cinta y de "¿Gratis o Pops+?". Todo el copy vive en
  `pops_plus_app.*` de los locales; aquí solo las llaves.

  Valores de una fila: true = ✓, false = —, texto = llave de `pops_plus_app.val.*`.
  La tabla del handoff traía filas que hoy no son ciertas ("Editar en equipo"
  solo Pops+, "Descargar respuestas en Excel" solo Pops+, archivos que "se
  liberan", "Sin anuncios", "Duplicar un Pop"): se quitaron a propósito. Si el
  producto cambia, se agregan aquí.
*/

// 1c · Tabla resumida (modal).
export const TABLA = [
    { k: 'people', free: 'up_to_30', plus: 'unlimited_f' },
    { k: 'pops', free: 'three', plus: 'unlimited_m' },
    { k: 'questions', free: 'two_questions', plus: 'all_f' },
    { k: 'reminders', free: false, plus: true },
    { k: 'wallet', free: false, plus: true },
    { k: 'import', free: false, plus: true },
    { k: 'clients', free: false, plus: true },
    { k: 'space', free: 'mb50', plus: 'mb500' },
]

// 1d · Tabla completa, por grupos.
export const TABLA_COMPLETA = [
    { g: 'invite', filas: [
        { k: 'people', free: 'up_to_30', plus: 'unlimited_f' },
        { k: 'pops_active', free: 'three', plus: 'unlimited_m' },
        { k: 'import', free: false, plus: true },
        { k: 'excel', free: false, plus: true },
    ] },
    { g: 'arrive', filas: [
        { k: 'basics', free: true, plus: true },
        { k: 'qr_pass', free: true, plus: true },
        { k: 'wallet', free: false, plus: true },
        { k: 'reminders', free: false, plus: true },
        { k: 'chat', free: true, plus: 'with_pinned' },
    ] },
    { g: 'who', filas: [
        { k: 'attendees', free: true, plus: true },
        { k: 'questions_form', free: 'two_per_form', plus: 'all_types' },
        { k: 'forms', free: 'up_to_3', plus: 'unlimited_m' },
    ] },
    { g: 'look', filas: [
        { k: 'cover', free: 'one_photo', plus: 'six_video' },
        { k: 'block_styles', free: 'three', plus: 'all_8' },
        { k: 'images', free: 'up_to_10', plus: 'unlimited_f' },
        { k: 'effects', free: true, plus: 'and_custom' },
        { k: 'link_image', free: 'with_seal', plus: 'yours_no_seal' },
    ] },
    { g: 'clients', filas: [
        { k: 'clients_full', free: false, plus: true },
    ] },
    { g: 'files', filas: [
        { k: 'space_all', free: 'mb50', plus: 'mb500' },
    ] },
]

// Cinta navy de arriba (Free): frase de la gente → solución, según la pantalla.
export const FRASES_CINTA = {
    inicio: ['eighty', 'pass', 'size'],
    mispops: ['same', 'client'],
}

// ¿Gratis o Pops+? (Inicio): frases de cada tarjeta.
export const FRASES_GRATIS = ['pretty', 'who', 'location', 'saturday']
export const FRASES_PLUS = ['eighty', 'size', 'pass', 'same', 'eight', 'client']

// Fondo de un lugar de Pop activo cuando el Pop no tiene color de tema.
export const COLORES_LUGAR = ['#FF4D3D', '#2EBE88', '#FFE14D', '#9FD8F5', '#FFB3C9']
