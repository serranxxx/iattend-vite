/*
  Tarjetas de un side event / Flash debajo de la portada (Asistentes,
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

import { formDesdePlantilla } from './plantillasRegistro'

// Registro va primero: después de confirmar es lo que sigue.
export const ORDEN_TARJETAS = ['registration', 'itinerary', 'map', 'notes', 'attendees', 'weather']

// Qué tarjetas existen: Registro, Asistentes e Itinerario son solo de los Flash.
const SOLO_FLASH = new Set(['registration', 'attendees', 'itinerary'])
const aplica = (key, esFlash) => esFlash || !SOLO_FLASH.has(key)

const ocultaDe = (body, key) => {
    if (key === 'registration') return !body?.form?.enabled
    if (key === 'attendees') return !body?.showAttendees
    if (key === 'weather') return Boolean(body?.hideWeather)
    return Boolean((body?.cards ?? []).find((c) => c.key === key)?.hidden)
}

export const tarjetasDe = (body, esFlash) => {
    const guardadas = (Array.isArray(body?.cards) ? body.cards : []).map((c) => c.key).filter((k) => ORDEN_TARJETAS.includes(k))
    const orden = [...new Set([...guardadas, ...ORDEN_TARJETAS])]
    return orden.filter((k) => aplica(k, esFlash)).map((key) => ({ key, hidden: ocultaDe(body, key) }))
}

// Lista completa para guardar (todas las llaves, aunque no apliquen).
const lista = (body, orden) => orden.map((key) => ({ key, hidden: ocultaDe(body, key) }))

export const parcheOcultarTarjeta = (body, key, hidden) => {
    // Registro: prenderlo sin formulario arma uno con la plantilla básica.
    if (key === 'registration') {
        return { form: body?.form?.sections?.length ? { ...body.form, enabled: !hidden } : (hidden ? body?.form ?? null : formDesdePlantilla('basico')) }
    }
    if (key === 'attendees') return { showAttendees: hidden ? undefined : true }
    if (key === 'weather') return { hideWeather: hidden || undefined }
    const orden = tarjetasDe(body, true).map((c) => c.key)
    return { cards: lista(body, orden).map((c) => (c.key === key ? { ...c, hidden: hidden || undefined } : c)) }
}

// Mueve `activa` al lugar de `destino` (arrastrar en Capas).
export const parcheMoverTarjeta = (body, activa, destino) => {
    const orden = tarjetasDe(body, true).map((c) => c.key)
    const de = orden.indexOf(activa)
    const a = orden.indexOf(destino)
    if (de < 0 || a < 0 || de === a) return null
    const nuevo = [...orden]
    nuevo.splice(a, 0, nuevo.splice(de, 1)[0])
    return { cards: lista(body, nuevo) }
}

export const portadaOculta = (body, key) => Boolean(body?.coverHidden?.[key])

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
