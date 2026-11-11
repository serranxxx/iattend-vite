/*
  Tarjetas de un side event / Pop debajo de la portada (Asistentes,
  Itinerario, Cómo llegar, Notas, Clima): su orden y cuáles se ocultan. Las
  ordena y oculta el panel Capas (SideLayers) y las pintan la pieza del
  editor (SideCanvas) y la página del invitado (iattend-events,
  helpers/tarjetasSide.ts — mismas reglas; si cambias una, cambia la otra).

  body.cards       → [{ key, hidden }] en el orden en que se ven. Sin él, el
                     orden de siempre. Una llave que falte se agrega al final.
  body.coverHidden → { title, date, place }: textos de la portada ocultos.

  Asistentes y Clima guardan su "oculto" donde siempre (showAttendees,
  hideWeather): el backend lee showAttendees para dar la lista.
*/

import { reglasDefault } from './Formularios/modelo'
import { itinerarioPorDia } from '../../helpers/assets/eventDateTime'
import { patrocinadoresDe } from './patrocinadores'

// Formulario sigue en la lista (su ojo lo prende y apaga) pero no se ordena:
// no va en el scroll de la página.
// Patrocinadores (body.sponsors, patrocinadores.js): en el scroll solo con el
// acomodo Tarjeta o Banda; con Portada va en la primera pantalla.
export const ORDEN_TARJETAS = ['registration', 'itinerary', 'map', 'notes', 'attendees', 'weather', 'sponsors']

// Qué tarjetas existen: Formulario, Asistentes, Itinerario y Patrocinadores son solo de los Pops.
const SOLO_POP = new Set(['registration', 'attendees', 'itinerary', 'sponsors'])
const aplica = (key, esPop) => esPop || !SOLO_POP.has(key)

const ocultaDe = (body, key) => {
    if (key === 'registration') return !body?.form?.enabled
    if (key === 'attendees') return !body?.showAttendees
    if (key === 'weather') return Boolean(body?.hideWeather)
    if (key === 'sponsors') return body?.sponsors?.enabled === false
    return Boolean((body?.cards ?? []).find((c) => c.key === key)?.hidden)
}

export const tarjetasDe = (body, esPop) => {
    const guardadas = (Array.isArray(body?.cards) ? body.cards : []).map((c) => c.key).filter((k) => ORDEN_TARJETAS.includes(k))
    const orden = [...new Set([...guardadas, ...ORDEN_TARJETAS])]
    return orden.filter((k) => aplica(k, esPop)).map((key) => ({ key, hidden: ocultaDe(body, key) }))
}

// Grupos de la página (handoff "Pop Layout" 3a): cada uno con su etiqueta
// centrada (INFORMACIÓN · UBICACIÓN · ASISTENTES). El formulario no está: ya
// no va en el scroll (al invitado le llega como aviso al confirmar). Recibe
// las llaves que de verdad se pintan, en orden; el grupo sale donde aparece
// su primera tarjeta.
export const GRUPO_DE_TARJETA = { itinerary: 'info', notes: 'info', map: 'lugar', weather: 'lugar', attendees: 'gente', sponsors: 'marcas' }

export const agruparTarjetas = (keys) => {
    const grupos = []
    for (const key of keys) {
        const id = GRUPO_DE_TARJETA[key]
        if (!id) continue
        let grupo = grupos.find((g) => g.id === id)
        if (!grupo) grupos.push((grupo = { id, keys: [] }))
        grupo.keys.push(key)
    }
    return grupos
}

// Lista completa para guardar (todas las llaves, aunque no apliquen).
const lista = (body, orden) => orden.map((key) => ({ key, hidden: ocultaDe(body, key) }))

export const parcheOcultarTarjeta = (body, key, hidden) => {
    // Formulario: prenderlo sin uno elegido deja las reglas listas; se elige
    // o se crea en el panel Formulario (Formularios/FormularioPanel.jsx).
    if (key === 'registration') {
        return { form: hidden ? (body?.form ? { ...body.form, enabled: false } : null) : { ...reglasDefault(), ...(body?.form ?? {}), enabled: true } }
    }
    if (key === 'attendees') return { showAttendees: hidden ? undefined : true }
    if (key === 'weather') return { hideWeather: hidden || undefined }
    if (key === 'sponsors') return { sponsors: { ...(body?.sponsors ?? {}), enabled: !hidden } }
    const orden = tarjetasDe(body, true).map((c) => c.key)
    return { cards: lista(body, orden).map((c) => (c.key === key ? { ...c, hidden: hidden || undefined } : c)) }
}

// Guarda un orden nuevo (Capas por grupos): las llaves en el orden dado y las
// que falten, al final.
export const parcheOrdenTarjetas = (body, orden) => {
    const completo = [...new Set([...orden, ...tarjetasDe(body, true).map((c) => c.key)])]
    return { cards: lista(body, completo) }
}

// ¿La tarjeta tiene algo que enseñar? Sin datos no sale en la página aunque
// su ojo esté prendido: en Capas se ve inactiva y en la pieza, opaca con
// "Agregar …". Mismas condiciones que la página del invitado (SideEvent.tsx).
const DIRECCION = ['street', 'number', 'neighborhood', 'zipcode', 'city', 'state', 'country']
export const direccionCompleta = (address) => DIRECCION.every((k) => !!address?.[k])
export const tieneDatos = (body, key) => {
    if (key === 'itinerary') return itinerarioPorDia(body).length > 0
    if (key === 'map') return direccionCompleta(body?.address)
    if (key === 'weather') return Boolean(body?.address?.city)
    if (key === 'notes') return Boolean(String(body?.extras ?? '').trim())
    if (key === 'sponsors') return patrocinadoresDe(body).items.length > 0
    return true
}

// Activas primero: las que se ven en la página (activa(key) = true) conservan
// su orden y van arriba; las inactivas (ocultas o sin datos), al final. Lo
// usan la pieza del editor y Capas.
export const activasPrimero = (keys, activa) => [...keys.filter(activa), ...keys.filter((k) => !activa(k))]

export const portadaOculta = (body, key) => Boolean(body?.coverHidden?.[key])

// Posición del bloque del título (título, fecha y lugar) en la primera
// pantalla, como la portada de la invitación (title.position): 3 × 3.
// body.titlePosition = { x: 'left' | 'center' | 'right', y: 'top' | 'center' | 'bottom' };
// sin él, abajo al centro (lo de siempre). Los botones de confirmar siguen
// abajo. Igual en iattend-events (helpers/tarjetasSide.ts).
export const POSICIONES_X = ['left', 'center', 'right']
export const POSICIONES_Y = ['top', 'center', 'bottom']
export const posicionTitulo = (body) => {
    const p = body?.titlePosition ?? {}
    return { x: POSICIONES_X.includes(p.x) ? p.x : 'center', y: POSICIONES_Y.includes(p.y) ? p.y : 'bottom' }
}
const FLEX = { left: 'flex-start', top: 'flex-start', center: 'center', right: 'flex-end', bottom: 'flex-end' }
export const variablesPosicionTitulo = (body) => {
    const { x, y } = posicionTitulo(body)
    return { '--titulo-x': FLEX[x], '--titulo-y': FLEX[y], '--titulo-alinear': x }
}

export const parcheOcultarPortada = (body, key, hidden) => ({
    coverHidden: { ...(body?.coverHidden ?? {}), [key]: hidden || undefined },
})

// Estilo del texto de Notas (body.notes_style, barra de texto como la del
// título): tipografía, tamaño, peso, interlineado, color, cursiva, subrayado,
// tachado, mayúsculas, espaciado y alineación. Sin él, el de siempre (Poppins
// 14, blanco con mezcla soft-light, centrado). Igual en iattend-events.
export const NOTAS_DEFAULT = { font: 'Poppins', size: 14, weight: 400, line_height: 1.5, opacity: 1, align: 'center' }

export const estiloNotas = (body) => {
    const n = body?.notes_style ?? {}
    return {
        fontFamily: n.font ?? NOTAS_DEFAULT.font,
        fontSize: `${n.size ?? NOTAS_DEFAULT.size}px`,
        fontWeight: n.weight ?? NOTAS_DEFAULT.weight,
        lineHeight: n.line_height ?? NOTAS_DEFAULT.line_height,
        opacity: n.opacity ?? NOTAS_DEFAULT.opacity,
        textAlign: n.align ?? NOTAS_DEFAULT.align,
        // Con color propio no lleva la mezcla soft-light (cambiaría el color).
        ...(n.color ? { color: n.color, mixBlendMode: 'normal' } : {}),
        ...(n.italic ? { fontStyle: 'italic' } : {}),
        ...((n.underline || n.strike) ? { textDecoration: [n.underline && 'underline', n.strike && 'line-through'].filter(Boolean).join(' ') } : {}),
        ...(n.transform && n.transform !== 'none' ? { textTransform: n.transform } : {}),
        ...(typeof n.letterSpacing === 'number' ? { letterSpacing: `${n.letterSpacing / 100}em` } : {}),
    }
}

// Clima: cuándo se muestra. 'auto' (por omisión): cuando el pronóstico ya
// alcanza el día del evento (unos días antes). 'always': siempre (antes de
// eso, el clima de hoy marcado "Hoy"). 'hidden': oculto (hideWeather, el ojo
// de Capas). Lo pinta iattend-events (SideEvent/ClimaVidrio.tsx).
export const MODOS_CLIMA = ['auto', 'always', 'hidden']

export const modoClima = (body) => {
    if (body?.hideWeather) return 'hidden'
    return body?.weatherMode === 'always' ? 'always' : 'auto'
}

export const parcheModoClima = (modo) => (modo === 'hidden'
    ? { hideWeather: true }
    : { hideWeather: undefined, weatherMode: modo === 'auto' ? undefined : modo })
