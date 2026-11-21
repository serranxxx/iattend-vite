import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'

// Presencia en el editor de un Pop (como Figma): quién lo tiene abierto, su
// cursor sobre la pieza y lo que tiene elegido. Todo va por un canal de
// Supabase Realtime propio (`pop_presencia_<id>`) y nada se guarda en la base:
//   · presence  → quién está (emoji, color, celular, lo elegido). No viajan
//     nombres: cada pestaña es un emoji con su color.
//   · broadcast `c` → el cursor (throttle CADA_MS; el que recibe lo suaviza)
//   · broadcast `guardado` → "acabo de guardar": los demás traen el body
//
// Coordenadas del cursor = px de la pieza (SideCanvas sin escalar, 357 de
// ancho) y en `y` el contenido (se suma el scroll interno de la pieza), así
// cae en el mismo lugar aunque cada quien tenga otro zoom, otra pantalla, el
// panel Capas oculto o esté en Dibujar a pantalla completa (ahí la pieza va a
// todo su largo y no tiene scroll propio: el mismo sistema).

export const CADA_MS = 50

// La pieza del editor de escritorio (SideWorkspace la marca con
// data-presencia-pieza; Compartir también pinta un SideCanvas y no cuenta).
export const piezaDelEditor = () => document.querySelector('[data-presencia-pieza] [data-side-card]')

// Medidas de la pieza en pantalla: dónde empieza, su escala y su scroll.
export const medirPieza = (el) => {
    const r = el.getBoundingClientRect()
    const escala = el.offsetWidth ? r.width / el.offsetWidth : 1
    const scroll = el.querySelector('[data-scroll-pieza]')?.scrollTop ?? 0
    return { r, escala, scroll, alto: el.offsetHeight, ancho: el.offsetWidth }
}

// Cada pestaña se ve como un emoji (no se enseñan nombres).
const EMOJIS = ['🦊', '🐼', '🐸', '🦄', '🐙', '🐝', '🦋', '🐢', '🐧', '🦁', '🐨', '🐯', '🐳', '🦉', '🐰', '🐶']

const COLORES = ['#7B61FF', '#F24E1E', '#0FA958', '#1ABCFE', '#E5468F', '#F7A600', '#00A3A3', '#FF7262']

const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)

const quienSoy = () => {
    let user = null
    try { user = JSON.parse(localStorage.getItem('session'))?.user ?? JSON.parse(localStorage.getItem('user')) } catch { /* sin sesión */ }
    return { uid: String(user?.uid ?? user?.id ?? user?.email ?? 'anon') }
}

const nuevaClave = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/-/g, '').slice(0, 10)

/**
 * popId: el Pop abierto (null = apagado). movil: en el celular no se manda
 * cursor (solo presencia). seleccion: { zona, stickers } de este editor.
 * onGuardadoAjeno: otro editor guardó (traer sus cambios).
 * → { otros, personas, cursores (ref, Map clave → destino), avisarGuardado }
 */
export const usePresenciaPop = (popId, { movil = false, seleccion = null, onGuardadoAjeno } = {}) => {
    const yo = useMemo(() => {
        const { uid } = quienSoy()
        const clave = nuevaClave()
        const h = Math.abs(hash(clave))
        return { clave, uid, emoji: EMOJIS[h % EMOJIS.length], color: COLORES[Math.floor(h / EMOJIS.length) % COLORES.length] }
    }, [])
    const [estados, setEstados] = useState({})
    const canalRef = useRef(null)
    const listoRef = useRef(false)
    const cursores = useRef(new Map())
    const selRef = useRef(seleccion)
    const guardadoRef = useRef(onGuardadoAjeno)
    useLayoutEffect(() => {
        selRef.current = seleccion
        guardadoRef.current = onGuardadoAjeno
    })

    const payloadPresencia = () => ({
        clave: yo.clave, uid: yo.uid, emoji: yo.emoji, color: yo.color, movil,
        sel: selRef.current ?? null,
    })

    // ── Canal ──
    useEffect(() => {
        if (!popId) return undefined
        const canal = supabase.channel(`pop_presencia_${popId}`, {
            config: { presence: { key: yo.clave }, broadcast: { self: false, ack: false } },
        })
        canal
            .on('presence', { event: 'sync' }, () => {
                const st = canal.presenceState()
                const lista = {}
                for (const [clave, metas] of Object.entries(st)) {
                    if (clave === yo.clave || !metas?.length) continue
                    lista[clave] = metas[metas.length - 1]
                }
                // Cursores de los que ya se fueron.
                for (const k of cursores.current.keys()) if (!lista[k]) cursores.current.delete(k)
                setEstados(lista)
            })
            .on('broadcast', { event: 'c' }, ({ payload }) => {
                if (!payload?.k || payload.k === yo.clave) return
                const prev = cursores.current.get(payload.k)
                cursores.current.set(payload.k, { ...prev, tx: payload.x, ty: payload.y, tv: Boolean(payload.v), at: Date.now() })
            })
            .on('broadcast', { event: 'guardado' }, ({ payload }) => {
                if (payload?.k === yo.clave) return
                guardadoRef.current?.()
            })
            .subscribe((status) => {
                if (status !== 'SUBSCRIBED') return
                listoRef.current = true
                canal.track(payloadPresencia())
            })
        canalRef.current = canal
        return () => {
            listoRef.current = false
            canalRef.current = null
            cursores.current.clear()
            setEstados({})
            supabase.removeChannel(canal)
        }
    }, [popId, yo])

    // Lo elegido viaja en la presencia (quien entra después también lo ve).
    const firmaSel = JSON.stringify(seleccion ?? null)
    useEffect(() => {
        if (!popId) return undefined
        const t = setTimeout(() => { if (listoRef.current) canalRef.current?.track(payloadPresencia()) }, 120)
        return () => clearTimeout(t)
    }, [firmaSel, movil, popId])

    // ── Mi cursor (escritorio) ──
    useEffect(() => {
        if (!popId || movil) return undefined
        let ultimo = null // { cx, cy } en la ventana
        let enviado = ''
        let ultimoEnvio = 0
        let timer = null
        const mandar = (payload) => {
            const firma = `${payload.x},${payload.y},${payload.v}`
            if (firma === enviado || !listoRef.current) return
            enviado = firma
            ultimoEnvio = Date.now()
            canalRef.current?.send({ type: 'broadcast', event: 'c', payload: { k: yo.clave, ...payload } })
        }
        const calcular = () => {
            timer = null
            const el = ultimo && !document.hidden ? piezaDelEditor() : null
            if (!el) return mandar({ x: 0, y: 0, v: 0 })
            const { r, escala, scroll } = medirPieza(el)
            const { cx, cy } = ultimo
            if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return mandar({ x: 0, y: 0, v: 0 })
            mandar({
                x: Math.round(((cx - r.left) / escala) * 10) / 10,
                y: Math.round(((cy - r.top) / escala + scroll) * 10) / 10,
                v: 1,
            })
        }
        const programar = () => {
            if (timer) return
            timer = setTimeout(calcular, Math.max(0, CADA_MS - (Date.now() - ultimoEnvio)))
        }
        const onMove = (e) => { ultimo = { cx: e.clientX, cy: e.clientY }; programar() }
        const fuera = () => { ultimo = null; programar() }
        const onSalir = (e) => { if (!e.relatedTarget) fuera() }
        window.addEventListener('pointermove', onMove, { passive: true })
        // Hacer scroll en la pieza (o zoom / mover el tablero) cambia lo que
        // hay bajo el cursor aunque el mouse no se mueva.
        window.addEventListener('scroll', programar, { capture: true, passive: true })
        window.addEventListener('wheel', programar, { passive: true })
        document.addEventListener('pointerout', onSalir)
        document.addEventListener('visibilitychange', programar)
        window.addEventListener('blur', fuera)
        return () => {
            clearTimeout(timer)
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('scroll', programar, { capture: true })
            window.removeEventListener('wheel', programar)
            document.removeEventListener('pointerout', onSalir)
            document.removeEventListener('visibilitychange', programar)
            window.removeEventListener('blur', fuera)
        }
    }, [popId, movil, yo])

    const avisarGuardado = () => {
        if (listoRef.current) canalRef.current?.send({ type: 'broadcast', event: 'guardado', payload: { k: yo.clave } })
    }

    // Una persona puede tener el Pop abierto en dos pestañas: un cursor por
    // pestaña, pero un solo avatar.
    const otros = useMemo(() => Object.values(estados), [estados])
    const personas = useMemo(() => {
        const vistos = new Map()
        for (const o of otros) if (!vistos.has(o.uid)) vistos.set(o.uid, o)
        return [...vistos.values()]
    }, [otros])

    return { yo, otros, personas, cursores, avisarGuardado }
}
