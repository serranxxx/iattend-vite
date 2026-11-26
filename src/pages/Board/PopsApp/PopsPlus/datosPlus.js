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
    { k: 'res_guests', free: 'up_to_30', plus: 'unlimited_f' },
    { k: 'pops_active', free: 'three', plus: 'unlimited_m' },
    { k: 'res_questions', free: 'two', plus: 'unlimited_m' },
    { k: 'res_excel', free: false, plus: true },
    { k: 'res_wallet', free: false, plus: true },
    { k: 'res_reminders', free: false, plus: true },
    { k: 'res_import', free: false, plus: true },
    // Para planners: un título (sin valores) y sus tres filas.
    { k: 'res_planner', titulo: true },
    { k: 'res_planner_create', sub: true, free: false, plus: true },
    { k: 'res_planner_send', sub: true, free: false, plus: true },
    { k: 'res_planner_manage', sub: true, free: false, plus: true },
]

// 1d · Tabla completa, por grupos.
export const TABLA_COMPLETA = [
    { g: 'f_invite', filas: [
        { k: 'f_people', free: 'up_to_30', plus: 'unlimited_f' },
        { k: 'f_import', free: false, plus: true },
        { k: 'f_excel', free: false, plus: true },
    ] },
    { g: 'f_who', filas: [
        { k: 'f_confirm', free: true, plus: true },
        { k: 'f_attendees', free: true, plus: true },
        { k: 'f_forms', free: 'f_up_to_3', plus: 'unlimited_m' },
        { k: 'f_questions', free: 'f_two_per_form', plus: 'f_all_types' },
        { k: 'f_download', free: false, plus: true },
    ] },
    { g: 'f_arrive', filas: [
        { k: 'f_basics', free: true, plus: true },
        { k: 'f_qr', free: true, plus: true },
        { k: 'f_wallet', free: false, plus: true },
        { k: 'f_reminders', free: false, plus: true },
        { k: 'f_chat', free: true, plus: 'f_pinned' },
    ] },
    { g: 'f_look', filas: [
        { k: 'f_cover', free: 'f_one_photo', plus: 'f_six_video' },
        { k: 'f_draw', free: true, plus: true },
        { k: 'f_styles', free: 'three', plus: 'f_all' },
        { k: 'f_images', free: 'f_images_free', plus: 'unlimited_m' },
        { k: 'f_effects', free: 'f_basic', plus: 'f_custom' },
        { k: 'f_link', free: 'f_seal', plus: 'f_no_seal' },
        { k: 'f_ads', free: 'f_yes', plus: 'f_no' },
    ] },
    { g: 'f_clients', filas: [
        { k: 'res_planner_create', free: false, plus: true },
        { k: 'res_planner_send', free: false, plus: true },
        { k: 'res_planner_manage', free: false, plus: true },
    ] },
    { g: 'f_account', filas: [
        { k: 'f_pops', free: 'three', plus: 'unlimited_m' },
        { k: 'f_space', free: 'mb50', plus: 'f_mb500' },
        { k: 'f_files', free: 'f_kept_while', plus: 'f_kept' },
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
