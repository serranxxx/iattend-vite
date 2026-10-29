import { useEffect, useState } from 'react'

/*
  Vectores (elementos `{ kind: 'icon', src, vector: true }`): el SVG se pinta
  en línea, no como máscara, para poder cambiarle color Y grosor del trazo.
  Lo usan todos los editores (Elemento.jsx, la barra ElementBar).
  Contraparte en la pieza: iattend-events/src/helpers/vector.ts (mismas
  reglas; si cambias una, cambia la otra).

  Campos del elemento:
    color        → trazo y relleno (todo lo que no sea "none" pasa a currentColor)
    strokeRel    → grosor como fracción del ancho del vector (escala con él)
    strokePx     → grosor en px de pantalla cuando `strokeFixed`
    strokeFixed  → "grosor fijo": no cambia al agrandar o achicar (non-scaling stroke)
  Sin strokeRel / strokePx se respeta el grosor original del archivo.

  Las conversiones entre px y fracción usan el ancho de la pieza (`base`:
  390 px la sección de la invitación, 357 px el lienzo de un Flash), donde
  `w` es el % de ese ancho.
*/

export const VECTOR_BASE = 390

const SHAPES = 'path, circle, ellipse, line, polyline, polygon, rect, text'
const PELIGROSOS = 'script, foreignObject, metadata, title, desc, iframe, a, image, use[href^="http"], style'

const conPx = (v) => (/^[\d.]+$/.test(String(v).trim()) ? `${v}px` : String(v))

// `.cls-1 { fill: none }` → style en línea (un <style> en línea se filtra a
// toda la página, así que se quita y sus reglas de clase se copian).
const reglasDeClase = (svg) => {
    const reglas = []
    svg.querySelectorAll('style').forEach((st) => {
        const css = st.textContent.replace(/\/\*[\s\S]*?\*\//g, '')
        for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
            m[1].split(',').map((x) => x.trim()).filter((x) => /^\.[\w-]+$/.test(x))
                .forEach((sel) => reglas.push([sel.slice(1), m[2].trim()]))
        }
    })
    return reglas
}

const estiloDe = (el) => Object.fromEntries((el.getAttribute('style') ?? '')
    .split(';').map((d) => d.split(':').map((x) => x.trim())).filter(([k, v]) => k && v))

const guardaEstilo = (el, obj) => {
    const txt = Object.entries(obj).map(([k, v]) => `${k}:${v}`).join(';')
    if (txt) el.setAttribute('style', txt)
    else el.removeAttribute('style')
}

// Valor efectivo de una propiedad heredable (estilo > atributo > padre).
const efectivo = (el, prop, raiz) => {
    for (let n = el; n && n !== raiz.parentNode; n = n.parentNode) {
        const st = estiloDe(n)[prop] ?? n.getAttribute?.(prop)
        if (st != null && st !== 'inherit') return st
    }
    return null
}

const pinta = (v) => v != null && v !== 'none' && v !== 'transparent' && !v.startsWith('url(')

export const procesarVector = (texto) => {
    if (typeof DOMParser === 'undefined') return null
    const doc = new DOMParser().parseFromString(texto, 'image/svg+xml')
    const svg = doc.documentElement
    if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) return null

    const reglas = reglasDeClase(svg)
    reglas.forEach(([clase, decl]) => svg.querySelectorAll(`.${CSS.escape(clase)}`).forEach((el) => {
        el.setAttribute('style', `${decl};${el.getAttribute('style') ?? ''}`)
    }))
    svg.querySelectorAll(PELIGROSOS).forEach((n) => n.remove())
    ;[svg, ...svg.querySelectorAll('*')].forEach((el) => {
        ;[...el.attributes].forEach((a) => {
            const n = a.name.toLowerCase()
            if (n.startsWith('on') || n === 'class' || ((n === 'href' || n === 'xlink:href') && !a.value.trim().startsWith('#'))) el.removeAttribute(a.name)
        })
    })

    // Medidas: el viewBox manda; si no hay, el width / height.
    const vb = (svg.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number)
    const vbW = vb.length === 4 && vb[2] > 0 ? vb[2] : parseFloat(svg.getAttribute('width')) || 100
    const vbH = vb.length === 4 && vb[3] > 0 ? vb[3] : parseFloat(svg.getAttribute('height')) || 100
    if (vb.length !== 4) svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`)

    // Color: todo trazo o relleno que pinte pasa a currentColor. El relleno
    // por omisión de SVG es negro: la raíz sin `fill` también.
    let baseStroke = 0
    ;[svg, ...svg.querySelectorAll('*')].forEach((el) => {
        const st = estiloDe(el)
        ;['fill', 'stroke'].forEach((prop) => {
            if (st[prop] != null) { if (pinta(st[prop])) st[prop] = 'currentColor' }
            else if (pinta(el.getAttribute(prop))) el.setAttribute(prop, 'currentColor')
        })
        if (el === svg && st.fill == null && el.getAttribute('fill') == null) el.setAttribute('fill', 'currentColor')
        if (el.matches?.(SHAPES)) {
            const orig = efectivo(el, 'stroke-width', svg) ?? '1'
            if (!baseStroke && pinta(efectivo(el, 'stroke', svg))) baseStroke = parseFloat(orig) || 1
            st['stroke-width'] = `var(--v-sw, ${conPx(orig)})`
            st['vector-effect'] = 'var(--v-ve, none)'
        }
        guardaEstilo(el, st)
    })

    ;['width', 'height', 'xmlns:c2pa'].forEach((a) => svg.removeAttribute(a))
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    svg.setAttribute('overflow', 'visible')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')

    return { markup: new XMLSerializer().serializeToString(svg), vbW, vbH, baseStroke: baseStroke || 0 }
}

const pendientes = new Map()
const listos = new Map()

export const cargarVector = (src) => {
    if (!src) return Promise.resolve(null)
    if (!pendientes.has(src)) {
        pendientes.set(src, fetch(src)
            .then((r) => (r.ok ? r.text() : null))
            .then((txt) => (txt ? procesarVector(txt) : null))
            .catch(() => null)
            .then((info) => { listos.set(src, info); return info }))
    }
    return pendientes.get(src)
}

export const useVector = (src) => {
    const [info, setInfo] = useState(() => listos.get(src) ?? null)
    useEffect(() => {
        let vivo = true
        if (listos.has(src)) setInfo(listos.get(src))
        else cargarVector(src).then((i) => { if (vivo) setInfo(i) })
        return () => { vivo = false }
    }, [src])
    return info
}

// SVG de la categoría Vectores del catálogo (editor-assets/vectores/…). Como
// ícono de un momento ("svg:<url>") se pintan en línea con trazo fijo; los
// demás SVG del catálogo siguen como máscara. Igual en iattend-events.
export const esUrlDeVector = (url) => /\/editor-assets\/vectores\//.test(url ?? '')

// Trazo de un ícono de `size` px: el de los íconos de Lucide (1.6 a 24 px).
export const trazoDeIcono = (size) => Math.round(size * (1.6 / 24) * 100) / 100

// Variables CSS que lee el SVG (--v-sw grosor, --v-ve vector-effect).
export const estiloVector = (s, info) => {
    if (s.strokeFixed && s.strokePx > 0) return { '--v-sw': `${s.strokePx}px`, '--v-ve': 'non-scaling-stroke' }
    if (s.strokeRel > 0 && info) return { '--v-sw': `${s.strokeRel * info.vbW}px` }
    return {}
}

const anchoPx = (s, base = VECTOR_BASE) => ((s.w ?? 20) / 100) * base

// Grosor que se ve hoy, en px del teléfono (lo que muestra la barra).
export const grosorVisible = (s, info, base) => {
    if (s.strokeFixed && s.strokePx > 0) return s.strokePx
    const rel = s.strokeRel > 0 ? s.strokeRel : info?.baseStroke ? info.baseStroke / info.vbW : 0
    return rel * anchoPx(s, base)
}

export const parcheGrosor = (s, px, base) => (s.strokeFixed
    ? { strokePx: px }
    : { strokeRel: px / anchoPx(s, base) })

// Al prender / apagar el candado el trazo no brinca: se convierte el grosor
// que se ve en ese momento.
export const parcheCandado = (s, info, on, base) => {
    const px = grosorVisible(s, info, base)
    return on
        ? { strokeFixed: true, strokePx: px || 1 }
        : { strokeFixed: false, strokeRel: (px || 1) / anchoPx(s, base) }
}
