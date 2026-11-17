/*
  Lámina de temporada del carrusel del Inicio de Pops (handoff "Inicio de
  Pops", lámina B). Debería venir de un config / CMS; mientras, vive aquí:
  vigencia (días "YYYY-MM-DD", incluidos), textos (llaves de pops_inicio.*) y
  las plantillas que se enseñan. Fuera de la vigencia el carrusel solo tiene
  la lámina de marca (sin puntos ni flechas).

  Todavía no hay plantillas de Pops: las "plantillas" de la lámina son solo
  ejemplos visuales (bloque de color + emoji del handoff) y el botón es
  "Send a Pop". Cuando existan, agregar `imagen` (PopsInicio la pinta en lugar
  del bloque) y regresar "Usar una plantilla" / "Empezar en blanco".
*/
export const TEMPORADA = {
    id: 'posadas',
    desde: '11-01', // mes-día: se repite cada año, de noviembre a la Epifanía
    hasta: '01-06',
    etiqueta: 'pops_inicio.season_tag',
    titulo: 'pops_inicio.season_title',
    texto: 'pops_inicio.season_text',
    plantillas: [
        // top / left / rot: escritorio; `movil`: el abanico del celular (Cena al frente).
        { nombre: 'pops_inicio.template_posada', emoji: '🪅', color: '#FF4D3D', tinta: '#111111', top: 40, left: 10, rot: -8, movil: { top: 28, left: 52, rot: -11, z: 1 } },
        { nombre: 'pops_inicio.template_cena', emoji: '🥂', color: '#FFE14D', tinta: '#111111', top: 10, left: 150, rot: 2, movil: { top: 8, left: 124, rot: 0, z: 2 } },
        { nombre: 'pops_inicio.template_intercambio', emoji: '🎁', color: '#2F5BFF', tinta: '#FFFFFF', top: 48, left: 284, rot: 9, movil: { top: 28, left: 196, rot: 11, z: 1 } },
    ],
}

/** ¿Hoy cae dentro de la temporada? (rango mes-día que puede cruzar de año). */
export const enTemporada = (temporada = TEMPORADA, hoy = new Date()) => {
    if (!temporada) return false
    const md = `${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
    const { desde, hasta } = temporada
    return desde <= hasta ? md >= desde && md <= hasta : md >= desde || md <= hasta
}
