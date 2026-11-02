import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowUpRight, CircleCheck, ClipboardList, CircleX, CloudSun, Eye, GripVertical, ImagePlus, MapPin, Music2, Plus } from 'lucide-react'
import { ItinerarioWidget } from './ItinerarioWidget'
import { useTranslation } from 'react-i18next'
import { colorDeVelo, darker, sombraDeTexto } from '../../helpers/assets/functions'
import { lineasDeFechas } from '../../helpers/assets/eventDateTime'
import styles from './SideCanvas.module.css'
import { alternar, conModificador, esImagen, lienzoCover, miembrosDe, nuevoIdElemento, PIEZA_ALTO, PIEZA_ANCHO } from './stickersPopData'
import { PopElemento } from '../Editor/Elemento'
import { TrazoSvg } from '../Editor/Dibujo'
import { PINCEL, simplificar } from '../Editor/dibujoData'
import { EfectosCapa } from './EfectosCapa'
import { AsistentesMuestra } from './AsistentesMuestra'
import { estiloDe, tintaDeNotas, variablesDeEstilo } from './estilosBloque'
import { formPublicado } from './Formularios/modelo'
import { activasPrimero, agruparTarjetas, estiloNotas, modoClima, parcheOcultarTarjeta, parcheOrdenTarjetas, portadaOculta, tarjetasDe, tieneDatos } from './tarjetasSide'
import { ajusteDe, AJUSTE_ZOOM_MAX, CAMBIO_CARRUSEL_MS, cubrir, desenfoqueDe, estiloAjuste, esVideo, mediaDePortada, parcheAjuste, variablesDesenfoque } from './fotosPortada'

/**
 * Lienzo editable del side event.
 *
 * Calca la pieza pública (`iattend-events/src/components/SideEvent/`): hero con
 * blur enmascarado y, encima, la columna de tarjetas tintadas con el color del
 * tema. Cada zona se toca para editarla y el título y las notas se escriben
 * directo sobre la pieza.
 *
 * Lo que se maqueta en vez de replicarse: los botones de RSVP (aquí no hay
 * invitado), el mapa (un iframe de Google dentro de un lienzo escalado pesa y
 * se come los clics) y el clima (no se llama a la API desde el editor).
 *
 * El título y las notas son `contentEditable`, no inputs de antd. Dos razones,
 * las dos de móvil: `styles/index.css` fuerza `font-size: 16px !important` a
 * todo input bajo 750px (anti-zoom de iOS) y se comía el tamaño real del
 * título; y el `autoSize` del TextArea mide el alto **antes** de que cargue la
 * tipografía del evento, así que el título quedaba en una línea y se cortaba.
 * Un div crece solo y ninguna de las dos cosas lo toca.
 */

// La hoja inferior se mueve en 0.28s con esta curva (BottomSheet.module.css).
// El lienzo usa exactamente las mismas para que los dos se sientan un solo
// gesto en vez de dos movimientos encimados.
const SHEET_MS = 280
const SHEET_CURVE = [0.32, 0.72, 0, 1]

// cubic-bezier(x1,y1,x2,y2) resuelto por Newton, como lo hace el navegador.
const cubicBezier = ([x1, y1, x2, y2]) => {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
    const atX = (t) => ((ax * t + bx) * t + cx) * t
    const atY = (t) => ((ay * t + by) * t + cy) * t
    const slope = (t) => (3 * ax * t + 2 * bx) * t + cx
    return (x) => {
        let t = x
        for (let i = 0; i < 5; i += 1) {
            const d = slope(t)
            if (!d) break
            t -= (atX(t) - x) / d
        }
        return atY(t)
    }
}

const ease = cubicBezier(SHEET_CURVE)



// Itinerario de ejemplo para la tarjeta apagada (sin momentos todavía).
const ITINERARIO_MUESTRA = [
    { id: 'muestra-1', name: 'Llegada', time: '16:00', icon: 'lucide:party-popper' },
    { id: 'muestra-2', name: 'Salida', time: '20:00', icon: 'lucide:log-out' },
]

export const SideCanvas = ({
    current,
    onChange,                // (updater) => void, marca dirty
    selected,
    onSelect,
    readOnly = false,
    fullBleed = false,       // móvil: la pieza ocupa toda la pantalla
    liftBottom = 0,          // móvil: cuánto sube el contenido para librar la hoja
    conCancion = false,      // Pop: chip de la canción (panel Canción)
    movil = false,           // Editor del celular: disco de la canción y aviso del formulario más grandes (para el dedo)
    conAsistentes = false,   // Pop: cuadro "Asistentes" si body.showAttendees
    asistentes = null,
    // Pop: los mensajes reales del chat (useMensajesChat, el más reciente primero).
    chatMensajes = null,       // Pop: confirmados reales ({ total, asistentes }) para el cuadro
    storyMode = false,       // móvil "story": sin chips arriba ni contornos punteados
    stickerSel = [],         // Pop: ids de los PNG seleccionados (StickersPop)
    onStickerSel,
    // Editor de escritorio con barras (SideWorkspace): sin los chips de fondo
    // y color (el fondo se toca en la pieza y el color vive en Diseño).
    barMode = false,
    // Herramienta Dibujar: { brush, color, size, opacity (10–100) } activa el
    // modo dibujo; `onTrazo(tipo)` avisa de cada trazo ('trazo' | 'borrar').
    pincel = null,
    onTrazo,
    sinTrazos = false,
    // Dibujo a pantalla completa: solo se puede dibujar y hacer scroll; tocar
    // el título, los PNG, las tarjetas o los botones no hace nada.
    soloDibujo = false,
    // Portada (fotosPortada.js): `fotoFija` (url) deja quieta esa foto o video
    // del carrusel (la elegida en la barra Fondo); `ajustarFoto` (url) la
    // ajusta: arrastrar la mueve y la rueda la acerca o aleja.
    fotoFija = null,
    ajustarFoto = null,
    // Con varias fotos / videos en la portada, dónde va el trazo nuevo:
    // 'todo' (toda la portada, se ve en todas) o la url de una (anclado a
    // ella, solo se ve cuando le toca; el editor la deja fija al dibujar).
    dibujoEn = null,
    // Solo la portada (Compartir, CompartirPop): fondo, color, velo,
    // efectos, elementos y dibujos, sin título, fecha, lugar, botones ni
    // tarjetas (siguen montados, invisibles, para no mover las medidas).
    soloPortada = false,
}) => {

    const { t } = useTranslation()
    const cardRef = useRef(null)
    const scrollRef = useRef(null)
    const titleRef = useRef(null)
    const extrasRef = useRef(null)
    // Dónde estaba el lienzo antes de abrir la primera hoja, para devolverlo
    // ahí cuando se cierre.
    const restoreScrollRef = useRef(null)
    const scrollAnimRef = useRef(null)

    // El espacio de abajo se sostiene hasta que termina el scroll de vuelta:
    // si se quitara al instante, el navegador recorta el scroll al nuevo tope
    // y la mitad del recorrido se vería como un salto seco.
    const [heldPad, setHeldPad] = useState(0)
    // Notas vacía abierta para escribir (con "Agregar notas"); vacía al salir, se cierra.
    const [notasAbiertas, setNotasAbiertas] = useState(false)
    // ── Modo dibujo (herramienta Dibujar) ──
    // Los dibujos van anclados a la FOTO de fondo (no al lienzo de los PNG):
    // así lo que se calca sobre la foto cuadra en cualquier pantalla, aunque
    // la foto y el lienzo se recorten distinto. Sin foto, al lienzo. Cada
    // recuadro mide 390 de ancho en unidades del dibujo (marcoUnidades).
    // El trazo en curso: puntos en pantalla (clientX/Y) y, para verlo, en las
    // unidades del recuadro donde se dibuja.
    const [trazo, setTrazo] = useState(null)
    // Tarjeta donde empezó el trazo en curso (si empezó encima de una): se
    // ve en la caja de la tarjeta y no en la capa de la portada, que crece
    // con el zoom del scroll y lo hacía ver más grueso que como queda.
    const [trazoEn, setTrazoEn] = useState(null)
    const trazoRef = useRef(null)
    const rectDeTrazo = (t) => (t.tarjeta
        ? infoRef.current?.querySelector(`[data-tarjeta="${t.tarjeta}"]`)?.getBoundingClientRect() ?? t.el.getBoundingClientRect()
        : t.el.getBoundingClientRect())
    const fotoRef = useRef(null)
    const fotoRefs = useRef({})
    const lienzoRef = useRef(null)
    const marcoUnidades = (rect) => ({ ancho: PIEZA_ANCHO, alto: PIEZA_ANCHO * (rect.height / rect.width) })
    const aUnidades = (pts, rect) => {
        const u = marcoUnidades(rect)
        return pts.map(([cx, cy]) => [((cx - rect.left) / rect.width) * u.ancho, ((cy - rect.top) / rect.height) * u.alto])
    }
    const empezarTrazo = (e) => {
        if (!pincel || e.button !== 0) return
        e.preventDefault()
        e.stopPropagation()
        try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* puntero ya suelto */ }
        // El borrador no se ancla: borra en cualquier recuadro.
        const sobre = PINCEL[pincel.brush]?.borra ? null : tarjetaEn(e.clientX, e.clientY)
        trazoRef.current = { el: e.currentTarget, pts: [[e.clientX, e.clientY]], tarjeta: sobre?.key ?? null }
        setTrazoEn(sobre?.key ?? null)
        setTrazo(aUnidades(trazoRef.current.pts, rectDeTrazo(trazoRef.current)))
    }
    const moverTrazo = (e) => {
        const t = trazoRef.current
        if (!t) return
        const u = t.pts[t.pts.length - 1]
        if (Math.hypot(e.clientX - u[0], e.clientY - u[1]) < 0.8) return
        t.pts = [...t.pts, [e.clientX, e.clientY]]
        setTrazo(aUnidades(t.pts, rectDeTrazo(t)))
    }
    const terminarTrazo = () => {
        const t = trazoRef.current
        trazoRef.current = null
        setTrazo(null)
        setTrazoEn(null)
        if (!t || !pincel) return
        const p = PINCEL[pincel.brush] ?? PINCEL.pluma
        const r1 = (n) => Math.round(n * 10) / 10
        const r2 = (n) => Math.round(n * 100) / 100
        const lista = Array.isArray(body.stickers) ? body.stickers : []
        if (p.borra) {
            // A cada dibujo que toca se le agrega lo borrado, en su caja (en
            // las unidades de SU recuadro: foto o lienzo).
            let toco = false
            const nueva = lista.map((o) => {
                if (o.kind !== 'dibujo' || o.hidden) return o
                // Lo de otra foto del carrusel no se ve: no se borra.
                if (o.fotoSrc && o.fotoSrc !== media[activa]) return o
                const marco = (o.tarjeta ? cajasRef.current[o.tarjeta]
                    : o.fotoSrc ? fotoRefs.current[o.fotoSrc]
                        : o.foto && fotoRef.current ? fotoRef.current : lienzoRef.current)?.getBoundingClientRect()
                if (!marco?.width) return o
                const u = marcoUnidades(marco)
                const pts = aUnidades(t.pts, marco)
                // El ancho del borrador, de las unidades de donde se dibujó a las de este recuadro.
                const ancho = pincel.size * p.k * (t.el.getBoundingClientRect().width / marco.width)
                const k = ((o.w / 100) * u.ancho) / o.vbW
                const cx = (o.x / 100) * u.ancho
                const cy = (o.y / 100) * u.alto
                const rad = (-(o.rot ?? 0) * Math.PI) / 180
                const local = pts.map(([px, py]) => {
                    const dx = px - cx
                    const dy = py - cy
                    return [(dx * Math.cos(rad) - dy * Math.sin(rad)) / k + o.vbW / 2, (dx * Math.sin(rad) + dy * Math.cos(rad)) / k + o.vbH / 2]
                })
                const m = ancho / k / 2
                if (!local.some(([x, y]) => x > -m && x < o.vbW + m && y > -m && y < o.vbH + m)) return o
                toco = true
                return { ...o, erase: [...(o.erase ?? []), { points: simplificar(local, 0.6 / k).map(([x, y]) => [r1(x), r1(y)]), size: r1(ancho / k) }] }
            })
            if (!toco) return
            onChange((prev) => ({ ...prev, body: { ...prev.body, stickers: nueva } }))
            onTrazo?.('borrar')
            return
        }
        // Se dibuja en el recuadro de la capa de dibujo (foto, o lienzo sin
        // foto) o, si empezó encima de una tarjeta, en la tarjeta.
        const sobre = t.tarjeta ? { key: t.tarjeta } : null
        const rect = rectDeTrazo(t)
        const u = marcoUnidades(rect)
        const ancho = pincel.size * p.k
        const puntos = simplificar(aUnidades(t.pts, rect), 0.6)
        const pad = ancho / 2 + (p.brillo ? pincel.size * 3 : 2)
        const xs = puntos.map((q) => q[0])
        const ys = puntos.map((q) => q[1])
        const x0 = Math.min(...xs) - pad
        const y0 = Math.min(...ys) - pad
        const vbW = Math.max(1, Math.max(...xs) - Math.min(...xs) + pad * 2)
        const vbH = Math.max(1, Math.max(...ys) - Math.min(...ys) + pad * 2)
        const nuevo = {
            id: nuevoIdElemento('d'),
            kind: 'dibujo',
            // Anclado a la tarjeta o a la foto (x / y / w en % de su recuadro).
            ...(sobre ? { tarjeta: sobre.key } : srcDibujo ? { foto: true, fotoSrc: srcDibujo } : marcoDibujo ? { foto: true } : {}),
            brush: pincel.brush,
            color: pincel.color,
            size: pincel.size,
            points: puntos.map(([x, y]) => [r1(x - x0), r1(y - y0)]),
            vbW: r1(vbW),
            vbH: r1(vbH),
            x: r2(((x0 + vbW / 2) / u.ancho) * 100),
            y: r2(((y0 + vbH / 2) / u.alto) * 100),
            w: r2((vbW / u.ancho) * 100),
            rot: 0,
            opacity: Math.min(pincel.opacity / 100, p.maxA ?? 1),
        }
        onChange((prev) => ({ ...prev, body: { ...prev.body, stickers: [...(prev.body?.stickers ?? []), nuevo] } }))
        onTrazo?.('trazo', nuevo.id)
    }

    // Arrastrar una sección (INFORMACIÓN, UBICACIÓN…) por su etiqueta en la
    // pieza: { id, destino (lugar entre las demás activas), soltar }.
    const [arrastre, setArrastre] = useState(null)
    const arrastreRef = useRef(null)
    useEffect(() => { arrastreRef.current = arrastre }, [arrastre])
    const arrastreId = arrastre?.id
    useEffect(() => {
        if (!arrastreId) return
        const card = cardRef.current
        const mover = (e) => {
            // Lugar = cuántas de las demás secciones activas quedan arriba del puntero.
            const otras = [...(card?.querySelectorAll('[data-grupo]') ?? [])]
                .filter((el) => el.dataset.grupo !== arrastreId && el.querySelector('[data-arrastrable-grupo]'))
            const destino = otras.filter((el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2 < e.clientY }).length
            setArrastre((a) => (a && a.destino !== destino ? { ...a, destino } : a))
        }
        const soltar = () => {
            const a = arrastreRef.current
            if (a) a.soltar(a.id, a.destino)
            setArrastre(null)
        }
        window.addEventListener('pointermove', mover)
        window.addEventListener('pointerup', soltar)
        window.addEventListener('pointercancel', soltar)
        return () => {
            window.removeEventListener('pointermove', mover)
            window.removeEventListener('pointerup', soltar)
            window.removeEventListener('pointercancel', soltar)
        }
    }, [arrastreId])
    // Al abrirla con "Agregar notas", el cursor queda adentro.
    useEffect(() => {
        if (notasAbiertas) requestAnimationFrame(() => extrasRef.current?.focus())
    }, [notasAbiertas])
    const padBottom = liftBottom || heldPad

    // Scroll con la curva y la duración de la hoja. `scrollTo({behavior})` no
    // sirve: su tiempo lo decide el navegador y se desincroniza de la hoja.
    const glideTo = (el, to, onDone) => {
        cancelAnimationFrame(scrollAnimRef.current)
        const from = el.scrollTop
        const delta = to - from

        if (!delta || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            el.scrollTop = to
            onDone?.()
            return
        }

        const start = performance.now()
        const step = (now) => {
            const p = Math.min(1, (now - start) / SHEET_MS)
            el.scrollTop = from + delta * ease(p)
            if (p < 1) scrollAnimRef.current = requestAnimationFrame(step)
            else onDone?.()
        }
        scrollAnimRef.current = requestAnimationFrame(step)
    }

    useEffect(() => () => cancelAnimationFrame(scrollAnimRef.current), [])

    // Mientras se teclea manda el DOM: si React reescribiera el texto, el
    // caret saltaría al final. Por eso el valor inicial se congela y el lienzo
    // se monta con `key={current.id}`.
    const [initialTitle] = useState(() => current?.name ?? '')

    // Si el texto cambia desde fuera (deshacer / rehacer) y nadie está
    // escribiendo en él, se vuelve a copiar al DOM.
    useEffect(() => {
        const el = titleRef.current
        const value = current?.name ?? ''
        if (el && document.activeElement !== el && el.textContent !== value) el.textContent = value
    }, [current?.name])
    useEffect(() => {
        const el = extrasRef.current
        const value = current?.body?.extras ?? ''
        if (el && document.activeElement !== el && el.innerText !== value) el.innerText = value
    }, [current?.body?.extras])

    // Con la hoja abierta el contenido ya no se empuja hacia arriba a ciegas
    // —así se salía el título por arriba—: el lienzo gana espacio abajo y la
    // zona elegida se centra en la banda que queda visible.
    //
    // `scrollIntoView({block:'center'})` no sirve: centra en el escenario
    // completo, y la mitad de abajo la tapa la hoja.
    useEffect(() => {
        const scroller = scrollRef.current
        if (!scroller) return

        // Hoja cerrada: el lienzo vuelve a donde estaba antes de abrirla, y
        // solo entonces suelta el espacio de abajo.
        if (!selected || !liftBottom) {
            const back = restoreScrollRef.current
            if (back === null) return
            restoreScrollRef.current = null
            glideTo(scroller, back, () => setHeldPad(0))
            return
        }

        setHeldPad(liftBottom)

        const zone = cardRef.current?.querySelector(`[data-zone="${selected}"]`)
        if (!zone) return

        // Solo la primera vez: cambiar de una zona a otra no debe pisar el
        // punto de partida.
        if (restoreScrollRef.current === null) restoreScrollRef.current = scroller.scrollTop

        const band = scroller.clientHeight - liftBottom   // lo que la hoja deja ver
        const zoneRect = zone.getBoundingClientRect()
        const scrollerRect = scroller.getBoundingClientRect()
        const margin = Math.max(12, (band - zoneRect.height) / 2)
        const delta = (zoneRect.top - scrollerRect.top) - margin

        glideTo(scroller, scroller.scrollTop + delta)
    }, [selected, liftBottom])

    // Escritorio (sin hoja): al elegir una zona desde fuera de la pieza (p. ej.
    // una capa en Capas) y no verse completa, la pieza se desliza hasta
    // centrarla. Lo que ya se ve no se mueve (tocar en la pieza no brinca).
    useEffect(() => {
        const scroller = scrollRef.current
        if (!scroller || !selected || liftBottom) return
        const zone = cardRef.current?.querySelector(`[data-zone="${selected}"]`)
        // Lo que va fijo encima (canción, formulario) no está en el scroll.
        if (!zone || !scroller.contains(zone)) return
        const zoneRect = zone.getBoundingClientRect()
        const scrollerRect = scroller.getBoundingClientRect()
        if (zoneRect.top >= scrollerRect.top && zoneRect.bottom <= scrollerRect.bottom) return
        // La pieza puede ir escalada (zoom del lienzo): de px de pantalla a px del scroll.
        const escala = scrollerRect.height / (scroller.clientHeight || scrollerRect.height) || 1
        const margen = Math.max(12, (scrollerRect.height - zoneRect.height) / 2)
        const delta = (zoneRect.top - scrollerRect.top - margen) / escala
        glideTo(scroller, scroller.scrollTop + delta)
    }, [selected, liftBottom])

    const body = current?.body ?? {}
    const title = body.title ?? {}
    const address = body.address ?? {}

    // Mismo cálculo del tinte que el remoto. `darker` devuelve null si el hex
    // no trae los 6 dígitos, así que el default va completo.
    const themeColor = body.color || '#000000'
    // body.veil (0–100): velo opcional del color del tema sobre la portada y
    // los PNG, detrás del texto (panel Fondo). Igual que el remoto.
    // Con video no hay desenfoque detrás de las tarjetas: más opacas (85%).
    const tint = `${darker(themeColor, 0.8) ?? '#000000'}${body.video ? 'D9' : '80'}`

    const pick = (section) => (e) => {
        if (readOnly) return
        e.stopPropagation()
        onSelect(section)
        // Móvil "story": tocar otra zona suelta el PNG elegido.
        if (storyMode) onStickerSel?.([])
    }

    // Cómo llegar y Clima: en escritorio son capas propias (abren la barra de
    // Lugar); en el editor del celular abren el panel de Lugar.
    const zonaDe = (key) => (barMode ? key : 'place')

    const cls = (section, base) => (readOnly
        ? base
        : `${base} ${styles.pickable} ${selected === section ? styles.picked : ''}`)

    // PNG de un Pop (body.stickers, ver StickersPop.jsx): se arrastran en
    // la pieza; x/y en % de la capa (ancho y alto de la pantalla).
    // Los ocultos (`hidden`, panel de capas) siguen guardados pero no se pintan.
    const stickers = (Array.isArray(body.stickers) ? body.stickers : []).filter(s => !s.hidden)
    // Mientras se arrastra: líneas guía del centro. Cerca del centro (±1.5%)
    // el PNG se imanta y la línea se marca.
    const [guias, setGuias] = useState(null)
    const IMAN = 1.5
    // Zona segura: los PNG no pueden bajar a los botones de confirmar. Es la
    // distancia (px de la pieza, sin escalar) del techo de la capa al borde de
    // arriba de la píldora; lo de abajo se recorta.
    const infoRef = useRef(null)
    useEffect(() => {
        const scroller = scrollRef.current
        if (!scroller) return
        const alScroll = () => {
            // Zoom de la portada al subir los botones (0 → 1 en
            // el 60% de la pantalla), como el remoto (--portada-avance).
            const avance = Math.min(1, Math.max(0, scroller.scrollTop / (scroller.clientHeight * 0.6)))
            cardRef.current?.style.setProperty('--portada-avance', avance.toFixed(3))
        }
        alScroll()
        scroller.addEventListener('scroll', alScroll, { passive: true })
        return () => scroller.removeEventListener('scroll', alScroll)
    }, [])
    const botonesRef = useRef(null)
    // La capa de los PNG es la pantalla (x/y/w en % de su ancho y alto). Los
    // botones de confirmar siempre van al fondo de la pantalla, igual que en
    // la página del invitado (iattend-events, SideEvent.tsx), así que los PNG
    // quedan igual respecto al borde de arriba y a los botones en las dos.
    // `zona`: { top, alto } de la capa y `limite` (techo de los botones).
    const [zona, setZona] = useState(null)
    useLayoutEffect(() => {
        const info = infoRef.current
        const botones = botonesRef.current
        const alto = scrollRef.current?.clientHeight
        const ancho = scrollRef.current?.clientWidth
        if (!info || !botones || !alto || !ancho) return
        const top = 0
        const limite = Math.max(0, info.offsetTop + botones.offsetTop)
        if (zona?.limite !== limite || zona?.alto !== alto || zona?.top !== top || zona?.ancho !== ancho) setZona({ limite, alto, top, ancho })
    })
    const marco = zona ? { top: zona.top, height: zona.alto } : undefined
    // Los PNG viven en un lienzo de 390×700 (la pieza) que cubre la pantalla
    // como la foto de fondo (cover): en la pieza es la pantalla tal cual; en
    // una más alargada (móvil a pantalla completa, la página del invitado)
    // se escala por el alto y se recorta un poco a los lados, así los PNG
    // conservan su tamaño respecto a la pantalla.
    const lienzo = zona ? lienzoCover(zona.ancho, zona.alto) : undefined
    // Portada: fotos y videos (fotosPortada.js). Con varios, carrusel: cada
    // foto dura CAMBIO_CARRUSEL_MS y cada video se reproduce completo.
    const media = mediaDePortada(body)
    const claveMedia = media.join('|')
    const carrusel = media.length > 1
    const [fotoActiva, setFotoActiva] = useState(0)
    const indiceFijo = fotoFija ? media.indexOf(fotoFija) : -1
    const activa = indiceFijo >= 0 ? indiceFijo : Math.min(fotoActiva, Math.max(0, media.length - 1))
    useEffect(() => { setFotoActiva(0) }, [claveMedia])
    // Tamaño natural de cada foto / video (para el ajuste y los dibujos).
    const [tamanos, setTamanos] = useState({})
    const medirMedia = (src, el) => {
        const w = el?.naturalWidth || el?.videoWidth
        const h = el?.naturalHeight || el?.videoHeight
        if (!w || !h) return
        setTamanos((t) => (t[src]?.w === w && t[src]?.h === h ? t : { ...t, [src]: { w, h } }))
    }
    // Lo que ya estaba cargado (caché) pudo avisar antes de montarse.
    const mediaRefs = useRef({})
    useEffect(() => {
        Object.entries(mediaRefs.current).forEach(([src, el]) => {
            if (el && (el.complete || el.readyState >= 1)) medirMedia(src, el)
        })
    }, [claveMedia])
    // El carrusel avanza solo (no con una foto fija): el video que le toca
    // empieza desde el principio y los demás se pausan.
    useEffect(() => {
        if (!carrusel) return undefined
        Object.entries(mediaRefs.current).forEach(([src, el]) => {
            if (el?.tagName !== 'VIDEO') return
            if (src === media[activa]) { el.currentTime = 0; el.play?.().catch(() => {}) } else el.pause?.()
        })
        if (indiceFijo >= 0) return undefined
        const siguiente = () => setFotoActiva((i) => (i + 1) % media.length)
        const el = mediaRefs.current[media[activa]]
        if (esVideo(media[activa]) && el) {
            // Al terminar el video; si no carga, como una foto.
            const t = setTimeout(siguiente, el.duration ? el.duration * 1000 + 400 : 30000)
            el.addEventListener('ended', siguiente)
            el.addEventListener('error', siguiente)
            return () => { clearTimeout(t); el.removeEventListener('ended', siguiente); el.removeEventListener('error', siguiente) }
        }
        const t = setTimeout(siguiente, CAMBIO_CARRUSEL_MS)
        return () => clearTimeout(t)
    }, [carrusel, activa, indiceFijo, claveMedia])
    // Los dibujos van anclados al recuadro de la primera foto (o video), con
    // su ajuste, tal como se ve (cover de la pantalla).
    const tamFoto = tamanos[media[0]] ?? null
    const marcoFoto = zona && tamFoto ? cubrir(tamFoto, zona.ancho, zona.alto, ajusteDe(body, media[0])) : null
    // El recuadro de cada foto / video (para los dibujos anclados a una).
    const marcos = zona ? Object.fromEntries(media.filter((src) => tamanos[src]).map((src) => [src, cubrir(tamanos[src], zona.ancho, zona.alto, ajusteDe(body, src))])) : {}
    // Dónde va el trazo nuevo: con una sola, en la foto (como siempre); con
    // varias, en la elegida (`dibujoEn`) o en toda la portada.
    const multiple = media.length > 1
    const srcDibujo = multiple && dibujoEn && dibujoEn !== 'todo' && marcos[dibujoEn] ? dibujoEn : null
    const marcoDibujo = multiple ? (srcDibujo ? marcos[srcDibujo] : null) : marcoFoto
    // Lo que se está ajustando (url de la portada).
    const srcAjustable = ajustarFoto && media.includes(ajustarFoto) ? ajustarFoto : null
    const ajuste = ajusteDe(body, srcAjustable)

    // Ajustar la foto: arrastrar mueve el encuadre (en % del sobrante, como
    // object-position) y la rueda cambia el zoom. Un solo paso de deshacer
    // por arrastre.
    const arrastreFoto = useRef(null)
    const guardarAjuste = (a, opts) => onChange((prev) => ({
        ...prev,
        body: { ...prev.body, ...parcheAjuste(prev.body, srcAjustable, a) },
    }), opts)
    const empezarAjuste = (e) => {
        if (!srcAjustable || !tamanos[srcAjustable] || !zona) return
        e.stopPropagation()
        try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* puntero ya suelto */ }
        const r = e.currentTarget.getBoundingClientRect()
        arrastreFoto.current = {
            id: e.pointerId, x: e.clientX, y: e.clientY,
            escala: r.width / (e.currentTarget.offsetWidth || r.width),
            a: ajuste ?? { z: 1, x: 50, y: 50 },
            primero: true,
        }
    }
    const moverAjuste = (e) => {
        const g = arrastreFoto.current
        const tam = tamanos[srcAjustable]
        if (!g || g.id !== e.pointerId || !tam || !zona) return
        const m = cubrir(tam, zona.ancho, zona.alto, g.a)
        const sobraX = zona.ancho - m.width
        const sobraY = zona.alto - m.height
        const dx = (e.clientX - g.x) / g.escala
        const dy = (e.clientY - g.y) / g.escala
        const acotar = (v) => Math.round(Math.min(100, Math.max(0, v)) * 10) / 10
        const a = {
            z: g.a.z,
            x: sobraX < -0.5 ? acotar(g.a.x + (dx / sobraX) * 100) : g.a.x,
            y: sobraY < -0.5 ? acotar(g.a.y + (dy / sobraY) * 100) : g.a.y,
        }
        guardarAjuste(a, { snapshot: g.primero })
        g.primero = false
    }
    const soltarAjuste = (e) => {
        if (arrastreFoto.current?.id === e.pointerId) arrastreFoto.current = null
    }
    const capaAjusteRef = useRef(null)
    const ajusteVivo = useRef(ajuste)
    useEffect(() => { ajusteVivo.current = ajuste })
    useEffect(() => {
        const el = capaAjusteRef.current
        if (!ajustarFoto || !el) return undefined
        const onWheel = (e) => {
            e.preventDefault()
            const a = ajusteVivo.current ?? { z: 1, x: 50, y: 50 }
            const z = Math.round(Math.min(AJUSTE_ZOOM_MAX, Math.max(1, a.z * (1 - e.deltaY * 0.0025))) * 100) / 100
            if (z !== a.z) guardarAjuste({ ...a, z }, { coalesce: 'ajuste-foto' })
        }
        el.addEventListener('wheel', onWheel, { passive: false })
        return () => el.removeEventListener('wheel', onWheel)
    }, [srcAjustable])
    // Dibujos anclados a la foto (si no hay foto, van en el lienzo).
    // Anclado a la primera foto, sin `fotoSrc` (los de antes y los de una
    // sola foto): se ven siempre.
    const enFoto = (st) => st.kind === 'dibujo' && st.foto && !st.fotoSrc && marcoFoto
    // Anclados a una foto / video del carrusel (`fotoSrc`): en su recuadro.
    const enFotoDe = (src) => (st) => st.kind === 'dibujo' && st.foto && st.fotoSrc === src
    const conFotoSrc = (st) => st.kind === 'dibujo' && Boolean(st.fotoSrc)
    // Dibujos hechos encima de una tarjeta (`tarjeta` = su clave de
    // body.cards): x / y / w en % de la tarjeta; se pintan en una capa dentro
    // del scroll, encima de las tarjetas, y suben con ellas.
    const enTarjeta = (st) => st.kind === 'dibujo' && Boolean(st.tarjeta)
    const [cajas, setCajas] = useState({})
    const cajasRef = useRef({})
    const [medirCajas, setMedirCajas] = useState(0)
    const conDibujosEnTarjetas = stickers.some(enTarjeta)
    useLayoutEffect(() => {
        const info = infoRef.current
        if (!info || (!conDibujosEnTarjetas && !pincel)) return
        const r0 = info.getBoundingClientRect()
        const k = r0.width / (info.offsetWidth || r0.width) || 1
        const nuevas = {}
        info.querySelectorAll('[data-tarjeta]').forEach((el) => {
            const r = el.getBoundingClientRect()
            nuevas[el.dataset.tarjeta] = { left: (r.left - r0.left) / k, top: (r.top - r0.top) / k, width: r.width / k, height: r.height / k }
        })
        const igual = (a, b) => a && b && ['left', 'top', 'width', 'height'].every((p) => Math.abs(a[p] - b[p]) < 0.5)
        const cambio = Object.keys(nuevas).length !== Object.keys(cajas).length || Object.keys(nuevas).some((key) => !igual(nuevas[key], cajas[key]))
        if (cambio) setCajas(nuevas)
    })
    // Lo que cambia de alto sin volver a pintar (fuentes, mapa, imágenes).
    useEffect(() => {
        const info = infoRef.current
        if (!info || typeof ResizeObserver === 'undefined') return undefined
        const ro = new ResizeObserver(() => setMedirCajas((n) => n + 1))
        ro.observe(info)
        return () => ro.disconnect()
    }, [])
    // La tarjeta debajo de un punto de la pantalla (si hay).
    const tarjetaEn = (x, y) => {
        const els = [...(infoRef.current?.querySelectorAll('[data-tarjeta]') ?? [])]
        const el = els.find((e) => { const r = e.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom })
        return el ? { key: el.dataset.tarjeta, rect: el.getBoundingClientRect() } : null
    }
    const seleccion = Array.isArray(stickerSel) ? stickerSel : (stickerSel ? [stickerSel] : [])
    // ⌘/Ctrl/Shift + clic suma o quita de la selección (y si lo quita, no lo
    // arrastra). Arrastrar uno que ya está en la selección mueve a todo el
    // grupo, con el mismo desplazamiento; el imán al centro lo marca el que
    // se agarró.
    // Al presionar un PNG aparece su agarradera encima, así que el clic que
    // sigue termina en otro elemento y el navegador se lo da al contenedor
    // común (el scroller), que elegía el fondo. Esta marca hace que ese clic
    // se ignore; se apaga en cuanto termina.
    const clicDeSticker = useRef(false)
    // Móvil "story": un PNG sin seleccionar no se arrastra al tocarlo (un PNG
    // grande cubre casi toda la pieza y robaba el scroll y el deslizar a
    // Invitados); se elige con un toque y ya elegido se mueve.
    const elegirSticker = (s) => (e) => {
        e.stopPropagation()
        if (readOnly || !storyMode || seleccion.includes(s.id)) return
        // Sin abrir la hoja: se ajusta con gestos y la píldora de arriba.
        // Si había otra hoja abierta, se cierra.
        if (selected && selected !== 'stickers') onSelect(null)
        // Un elemento de un grupo elige al grupo entero.
        onStickerSel?.(miembrosDe(stickers, s))
    }

    // Móvil "story": con un PNG elegido, dos dedos en cualquier parte de la
    // pieza lo escalan (pellizcar) y lo giran. Listeners nativos (no
    // pasivos) para poder frenar el zoom y el scroll del navegador.
    const pellizcoRef = useRef(null)
    const pellizcadoRef = useRef(false)   // el dedo que arrastraba no mueve tras pellizcar
    const ultimoRef = useRef(null)
    useEffect(() => {
        ultimoRef.current = { activo: storyMode && !readOnly && seleccion.length > 0, seleccion, todos: body.stickers ?? [], onChange }
    })
    useEffect(() => {
        const card = cardRef.current
        if (!card || !storyMode) return
        const medir = (t) => {
            const [a, b] = [t[0], t[1]]
            return {
                d: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
                ang: (Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180) / Math.PI,
            }
        }
        const inicio = (e) => {
            const u = ultimoRef.current
            if (!u?.activo || e.touches.length !== 2) return
            e.preventDefault()
            const { d, ang } = medir(e.touches)
            pellizcoRef.current = {
                d0: d || 1,
                a0: ang,
                base: Object.fromEntries(u.todos.filter(o => u.seleccion.includes(o.id)).map(o => [o.id, { w: o.w, rot: o.rot ?? 0 }])),
            }
            pellizcadoRef.current = true
        }
        const mover = (e) => {
            const g = pellizcoRef.current
            if (!g || e.touches.length !== 2) return
            e.preventDefault()
            const { d, ang } = medir(e.touches)
            const escala = d / g.d0
            const giro = ang - g.a0
            const girar = (r) => ((((r + 180) % 360) + 360) % 360) - 180
            // Solo el primer movimiento abre una entrada en deshacer.
            const snapshot = !g.movido
            g.movido = true
            ultimoRef.current.onChange((prev) => ({
                ...prev,
                body: {
                    ...prev.body,
                    stickers: (prev.body?.stickers ?? []).map(o => (g.base[o.id]
                        ? {
                            ...o,
                            w: Math.min(200, Math.max(5, Math.round(g.base[o.id].w * escala * 100) / 100)),
                            rot: Math.round(girar(g.base[o.id].rot + giro) * 10) / 10,
                        }
                        : o)),
                },
            }), { snapshot })
        }
        const fin = (e) => { if (e.touches.length < 2) pellizcoRef.current = null }
        // Safari: sin esto el pellizco también hace zoom a la página.
        const sinZoom = (e) => { if (ultimoRef.current?.activo) e.preventDefault() }
        card.addEventListener('touchstart', inicio, { passive: false })
        card.addEventListener('touchmove', mover, { passive: false })
        card.addEventListener('touchend', fin)
        card.addEventListener('touchcancel', fin)
        card.addEventListener('gesturestart', sinZoom)
        return () => {
            card.removeEventListener('touchstart', inicio)
            card.removeEventListener('touchmove', mover)
            card.removeEventListener('touchend', fin)
            card.removeEventListener('touchcancel', fin)
            card.removeEventListener('gesturestart', sinZoom)
        }
    }, [storyMode])

    const arrastrarSticker = (s) => (e) => {
        if (readOnly) return
        if (storyMode && !seleccion.includes(s.id) && !conModificador(e)) return
        e.stopPropagation()
        e.preventDefault()
        clicDeSticker.current = true
        window.addEventListener('pointerup', () => setTimeout(() => { clicDeSticker.current = false }, 0), { once: true })
        if (!storyMode) onSelect('stickers')
        pellizcadoRef.current = false
        let grupo
        if (conModificador(e)) {
            grupo = alternar(seleccion, s.id)
            onStickerSel?.(grupo)
            if (!grupo.includes(s.id)) return
        } else {
            // Un elemento de un grupo (stickersPopData.js) arrastra al grupo entero.
            grupo = seleccion.includes(s.id) ? seleccion : miembrosDe(stickers, s)
            onStickerSel?.(grupo)
        }
        const capa = e.currentTarget.parentElement.getBoundingClientRect()
        const inicio = { px: e.clientX, py: e.clientY, x: s.x, y: s.y }
        const origen = Object.fromEntries(stickers.filter(o => grupo.includes(o.id)).map(o => [o.id, { x: o.x, y: o.y }]))
        const limitar = (v) => Math.min(100, Math.max(0, Math.round(v * 10) / 10))
        const imantar = (v) => (Math.abs(v - 50) <= IMAN ? 50 : v)
        setGuias({ x: s.x === 50, y: s.y === 50 })
        // Un arrastre es UNA entrada en deshacer: solo el primer movimiento
        // guarda el estado anterior.
        let primero = true
        const mover = (ev) => {
            // Con dos dedos manda el pellizco; el dedo que queda no lo mueve.
            if (pellizcadoRef.current) return
            const x = imantar(limitar(inicio.x + ((ev.clientX - inicio.px) / capa.width) * 100))
            const y = imantar(limitar(inicio.y + ((ev.clientY - inicio.py) / capa.height) * 100))
            const dx = x - inicio.x
            const dy = y - inicio.y
            setGuias({ x: x === 50, y: y === 50 })
            onChange((prev) => ({
                ...prev,
                body: {
                    ...prev.body,
                    stickers: (prev.body?.stickers ?? []).map(o => (origen[o.id]
                        ? { ...o, x: limitar(origen[o.id].x + dx), y: limitar(origen[o.id].y + dy) }
                        : o)),
                },
            }), { snapshot: primero })
            primero = false
        }
        const soltar = () => {
            setGuias(null)
            window.removeEventListener('pointermove', mover)
            window.removeEventListener('pointerup', soltar)
        }
        window.addEventListener('pointermove', mover)
        window.addEventListener('pointerup', soltar)
    }

    // Escritorio: manijas sobre el PNG elegido, como los elementos de la
    // invitación. Las esquinas lo escalan desde el centro (con varios
    // elegidos, todos en la misma proporción) y la de arriba lo gira (se
    // pega a 0 / 90 / 180 / 270). Un gesto es UNA entrada en deshacer. En el
    // móvil "story" se hace con dos dedos (pellizco).
    const manijas = !readOnly && !storyMode
    const transformarSticker = (s, modo) => (e) => {
        e.stopPropagation()
        e.preventDefault()
        clicDeSticker.current = true
        window.addEventListener('pointerup', () => setTimeout(() => { clicDeSticker.current = false }, 0), { once: true })
        const caja = e.currentTarget.parentElement
        const r = caja.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        const grupo = seleccion.includes(s.id) ? seleccion : [s.id]
        const base = Object.fromEntries(stickers.filter(o => grupo.includes(o.id)).map(o => [o.id, { w: o.w, rot: o.rot ?? 0 }]))
        const d0 = Math.hypot(e.clientX - cx, e.clientY - cy) || 1
        const a0 = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI
        const girar = (v) => ((((v + 180) % 360) + 360) % 360) - 180
        const pegar = (v) => {
            const cerca = Math.round(v / 90) * 90
            return Math.abs(v - cerca) < 4 ? girar(cerca) : v
        }
        let primero = true
        const mover = (ev) => {
            let cambio
            if (modo === 'escalar') {
                // Proporción entre la distancia al centro ahora y al empezar.
                const factor = Math.hypot(ev.clientX - cx, ev.clientY - cy) / d0
                cambio = (o) => ({ w: Math.min(200, Math.max(5, Math.round(base[o.id].w * factor * 100) / 100)) })
            } else {
                const delta = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI - a0
                cambio = (o) => ({ rot: Math.round(pegar(girar(base[o.id].rot + delta)) * 10) / 10 })
            }
            onChange((prev) => ({
                ...prev,
                body: {
                    ...prev.body,
                    stickers: (prev.body?.stickers ?? []).map(o => (base[o.id] ? { ...o, ...cambio(o) } : o)),
                },
            }), { snapshot: primero })
            primero = false
        }
        const soltar = () => {
            window.removeEventListener('pointermove', mover)
            window.removeEventListener('pointerup', soltar)
        }
        window.addEventListener('pointermove', mover)
        window.addEventListener('pointerup', soltar)
    }

    // Texto que se está escribiendo encima (doble clic en un texto elegido).
    const [editando, setEditando] = useState(null)
    useEffect(() => { if (editando && !seleccion.includes(editando)) setEditando(null) }, [stickerSel])
    const terminarTexto = (id) => (texto) => {
        setEditando(null)
        onChange((prev) => ({
            ...prev,
            body: { ...prev.body, stickers: (prev.body?.stickers ?? []).map(o => (o.id === id && o.text !== texto ? { ...o, text: texto } : o)) },
        }))
    }
    const tituloFuente = body.title?.font ?? 'Poppins'

    const estiloSticker = (s) => ({
        left: `${s.x}%`,
        top: `${s.y}%`,
        width: `${s.w}%`,
        transform: `translate(-50%, -50%) rotate(${s.rot ?? 0}deg)${s.flipX || s.flipY ? ` scale(${s.flipX ? -1 : 1}, ${s.flipY ? -1 : 1})` : ''}`,
        opacity: s.opacity ?? 1,
        pointerEvents: readOnly ? 'none' : 'auto',
    })

    // Los elementos de la portada en un recuadro (lienzo de los PNG o foto).
    const pintarStickers = (lista) => lista.map(s => (esImagen(s)
                                    ? (
                                        <img
                                            key={s.id}
                                            src={s.url}
                                            alt=''
                                            draggable={false}
                                            className={styles.sticker}
                                            style={estiloSticker(s)}
                                            onPointerDown={arrastrarSticker(s)}
                                            onClick={elegirSticker(s)}
                                        />
                                    ) : (
                                        // Texto, ícono, forma, línea o decoración (PopElemento).
                                        <div
                                            key={s.id}
                                            className={`${styles.sticker} ${styles.elemento}`}
                                            style={{ ...estiloSticker(s), ...(editando === s.id ? { visibility: 'hidden' } : {}) }}
                                            onPointerDown={arrastrarSticker(s)}
                                            onClick={elegirSticker(s)}
                                        >
                                            <PopElemento s={s} titleFont={tituloFuente} />
                                        </div>
                                    )))

    // Agarraderas (contorno, manijas) de los elegidos en un recuadro.
    const pintarAgarres = (lista) => lista.map(s => (
                                    // El img (transparente) le da al div el tamaño del PNG;
                                    // el contorno punteado es del div y sí se ve.
                                    <div
                                        key={s.id}
                                        className={`${styles.sticker} ${styles.stickerSel}`}
                                        style={{ ...estiloSticker(s), opacity: 1 }}
                                        data-sticker
                                        onPointerDown={editando === s.id ? undefined : arrastrarSticker(s)}
                                        onClick={(e) => e.stopPropagation()}
                                        onDoubleClick={() => { if (manijas && s.kind === 'text') setEditando(s.id) }}
                                    >
                                        {esImagen(s)
                                            ? <img src={s.url} alt='' draggable={false} className={styles.stickerHueco} />
                                            : (
                                                <div className={`${styles.stickerHueco} ${editando === s.id ? styles.huecoEditando : ''}`}>
                                                    <PopElemento s={s} titleFont={tituloFuente} editable={editando === s.id} onTextDone={terminarTexto(s.id)} />
                                                </div>
                                            )}
                                        {manijas && editando !== s.id && (
                                            <>
                                                {['nw', 'ne', 'sw', 'se'].map(c => (
                                                    <span key={c} className={styles.manija} data-c={c} onPointerDown={transformarSticker(s, 'escalar')} />
                                                ))}
                                                <span className={styles.manijaGiro} onPointerDown={transformarSticker(s, 'girar')} />
                                            </>
                                        )}
                                    </div>
    ))

    // Teclear seguido en el mismo texto no apila un paso de deshacer por letra.
    const setName = (value) => onChange((prev) => ({ ...prev, name: value }), { coalesce: 'name' })
    const setExtras = (value) => onChange((prev) => ({ ...prev, body: { ...prev.body, extras: value } }), { coalesce: 'extras' })

    // Un Pop puede tener varias fechas: las de mismo mes y hora van juntas.
    const dateLabels = lineasDeFechas(body, { state: address.state, timezone: body.timezone })
    const placeLabel = body.place_name
        || (address.street && address.number ? `${address.street} ${address.number}` : null)
    const regionLabel = !body.place_name && (address.state || address.country)
        ? [address.state, address.country].filter(Boolean).join(' ')
        : null

    return (
        <div
            ref={cardRef}
            className={`${styles.card} ${barMode ? styles.cardIphone : ''} ${fullBleed ? styles.cardFull : ''} ${storyMode ? styles.cardStory : ''} ${readOnly ? styles.cardReadOnly : ''} ${body.video ? styles.cardVideo : ''}`}
            // Estilo de bloques (Pop): sus variables y data-estilo (solo si no es vidrio).
            style={{ '--blur-color': themeColor, '--blur-color--dark': tint, ...variablesDeEstilo(estiloDe(body), body.color) }}
            data-estilo={estiloDe(body) === 'vidrio' ? undefined : estiloDe(body)}
            data-side-card
            data-solo-dibujo={(soloDibujo && pincel) || undefined}
            data-movil={movil || undefined}
            onClick={() => {
                if (readOnly || soloDibujo) return
                onSelect(null)
                if (storyMode) onStickerSel?.([])
            }}
        >

            {/* ── Hero ── */}
            <div className={cls('background', styles.hero)} onClick={pick('background')}>
                {/* Fotos y videos de la portada (uno o carrusel), dentro de .heroBg
                    (el zoom al subir los botones), cada uno con su ajuste. Un
                    video solo va en bucle; con un video solo, la imagen es su
                    cuadro fijo. */}
                {media.length
                    ? (
                        <div className={styles.heroBg}>
                            {media.map((src, i) => {
                                const props = {
                                    ref: (el) => { mediaRefs.current[src] = el },
                                    className: styles.carruselFoto,
                                    style: { opacity: i === activa ? 1 : 0, ...estiloAjuste(ajusteDe(body, src)) },
                                }
                                return esVideo(src)
                                    ? <video key={src + i} {...props} src={src} poster={!carrusel ? body.image || undefined : undefined} autoPlay={!carrusel} loop={!carrusel || i === indiceFijo} muted playsInline preload='auto' onLoadedMetadata={(e) => medirMedia(src, e.currentTarget)} />
                                    : <img key={src + i} {...props} src={src} alt='' onLoad={(e) => medirMedia(src, e.currentTarget)} />
                            })}
                        </div>
                    )
                    : (
                        <div className={styles.heroEmpty}>
                            <ImagePlus size={26} />
                            <span className={styles.heroEmptyLabel}>{t('side_events.canvas_add_image')}</span>
                        </div>
                    )
                }
                {/* Compartir (soloPortada): sin el desenfoque; un backdrop-filter
                    dentro de la pieza escalada podía dejar la foto sin pintar. */}
                {!soloPortada && desenfoqueDe(body).amount > 0 && <div aria-hidden className={styles.blurCover} style={variablesDesenfoque(body)} />}
                <div aria-hidden className={styles.shadow} />
            </div>

            {/* ── Fila superior: accesos que no son parte de la pieza ──
                El fondo y el color del tema no se pueden tocar en el lienzo
                (uno es la imagen de atrás, el otro tiñe todas las tarjetas),
                así que cada uno tiene su chip, como el de canción del Save
                the Date. */}
            {/* En modo story sus funciones pasan a los botones del editor. */}
            {!readOnly && !storyMode &&
                <div className={styles.topRow}>
                    {/* Pop: canción, arriba a la izquierda como su reproductor en
                        la página del invitado (SongPlayer). Solo el disco. */}
                    {conCancion &&
                        <button
                            className={cls('song', `${styles.chip} ${styles.chipDisco}`)}
                            onClick={pick('song')}
                            aria-label={body.song?.name ?? t('side_events.song_add')}
                            title={body.song?.name ?? t('side_events.song_add')}
                        >
                            {body.song?.albumArt
                                ? <img src={body.song.albumArt} alt='' className={styles.chipDiscoArte} />
                                : <Music2 size={14} />
                            }
                        </button>
                    }
                    {/* Con barras (escritorio nuevo) el fondo se toca en la pieza
                        y el color del tema vive en el panel Diseño. */}
                    {!barMode && (
                        <>
                            <button className={cls('background', styles.chip)} onClick={pick('background')} data-tour='chip-background'>
                                <span className={styles.chipIcon}><ImagePlus size={13} /></span>
                                <span className={styles.chipLabel}>
                                    {body.image ? t('side_events.canvas_change_image') : t('side_events.canvas_add_image')}
                                </span>
                            </button>

                            <button className={cls('color', `${styles.chip} ${styles.chipDerecha}`)} onClick={pick('color')} data-tour='chip-color'>
                                <span className={styles.chipSwatch} style={{ background: themeColor }} />
                                <span className={styles.chipLabel}>{t('side_events.theme_color')}</span>
                            </button>
                        </>
                    )}
                </div>
            }

            {/* ── Columna de info, encima del hero ── */}
            {/* Tocar el hueco de arriba (sin texto ni PNG) elige el fondo. */}
            <div
                ref={scrollRef}
                className={`${styles.scrollArea} scroll-invitation`}
                onClick={(e) => {
                    if (soloDibujo) { e.stopPropagation(); return }
                    if (clicDeSticker.current) { e.stopPropagation(); return }
                    if (e.target === e.currentTarget) pick('background')(e)
                }}
            >

                {/* Portada fija (sticky dentro del scroller): no se mueve al hacer
                    scroll. Los PNG, los efectos, el velo, el tinte y el título,
                    la fecha y el lugar; los botones y las tarjetas (.infoCont,
                    z 1) suben encima. Igual que la página del invitado
                    (.portada_fija). */}
                <div className={styles.portadaFija}>
                    {/* Todos van detrás del título, la fecha, el lugar y los
                        botones (z 0, debajo de .infoCont). El seleccionado tiene
                        además una agarradera invisible encima de todo para poder
                        moverlo aunque lo tape el texto. */}
                    {stickers.length > 0 && (
                        <div aria-hidden className={`${styles.stickersCapa} ${styles.stickersAtras}`} style={marco}>
                            <div ref={lienzoRef} className={styles.lienzo} style={lienzo}>
                                {pintarStickers(stickers.filter((x) => !enFoto(x) && !enTarjeta(x) && !conFotoSrc(x)))}
                            </div>
                            {/* Dibujos anclados a la foto: en su recuadro (cover de la foto). */}
                            {marcoFoto && (
                                <div ref={fotoRef} className={styles.lienzo} style={marcoFoto}>
                                    {pintarStickers(stickers.filter(enFoto))}
                                </div>
                            )}
                            {/* Anclados a una foto / video del carrusel: se ven con ella. */}
                            {media.map((src, i) => {
                                const lista = stickers.filter(enFotoDe(src))
                                if (!lista.length || !marcos[src]) return null
                                return (
                                    <div key={src + i} ref={(el) => { fotoRefs.current[src] = el }} className={styles.lienzo} style={{ ...marcos[src], opacity: i === activa ? 1 : 0, transition: 'opacity 0.9s ease', pointerEvents: i === activa ? undefined : 'none' }}>
                                        {pintarStickers(lista)}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                    {/* Efectos animados (panel Efectos): encima de la portada y los PNG,
                        debajo del texto y los botones. */}
                    {body.effect?.type && (
                        <div aria-hidden className={`${styles.stickersCapa} ${styles.stickersAtras}`} style={marco}>
                            <EfectosCapa effect={body.effect} colorTema={themeColor} />
                        </div>
                    )}
                    {colorDeVelo(themeColor, body.veil) && (
                        <div aria-hidden className={styles.capaFija} style={{ background: colorDeVelo(themeColor, body.veil) }} />
                    )}
                    <div aria-hidden className={`${styles.capaFija} ${styles.tinteFijo}`} />
                    {/* Fundido inferior: el último 30% se funde con el color de
                        fondo de la página, como el remoto (.fundido_inferior): no
                        se ve el borde de abajo de los PNG ni del video. */}
                    <div
                        aria-hidden
                        className={`${styles.capaFija} ${styles.fundidoFijo}`}
                        style={{ '--fondo-pagina': darker(themeColor, 0.8) ?? themeColor }}
                    />
                </div>

                {/* Encima de todo, también fijas: guías, zona de botones y la
                    agarradera de los PNG seleccionados. */}
                <div className={`${styles.portadaFija} ${styles.portadaFijaArriba}`}>
                    {/* Guías del centro mientras se arrastra un PNG */}
                    {guias && (
                        <div aria-hidden className={`${styles.stickersCapa} ${styles.guias}`} style={marco}>
                            <span className={`${styles.guiaV} ${guias.x ? styles.guiaActiva : ''}`} />
                            <span className={`${styles.guiaH} ${guias.y ? styles.guiaActiva : ''}`} />
                        </div>
                    )}
                    {!readOnly && !pincel && seleccion.length > 0 && (
                        <div aria-hidden className={`${styles.stickersCapa} ${styles.stickersAgarre}`} style={marco}>
                            <div className={styles.lienzo} style={lienzo}>
                                {pintarAgarres(stickers.filter((x) => seleccion.includes(x.id) && !enFoto(x) && !enTarjeta(x) && !conFotoSrc(x)))}
                            </div>
                            {marcoFoto && (
                                <div className={styles.lienzo} style={marcoFoto}>
                                    {pintarAgarres(stickers.filter((x) => seleccion.includes(x.id) && enFoto(x)))}
                                </div>
                            )}
                            {media[activa] && marcos[media[activa]] && (
                                <div className={styles.lienzo} style={marcos[media[activa]]}>
                                    {pintarAgarres(stickers.filter((x) => seleccion.includes(x.id) && enFotoDe(media[activa])(x)))}
                                </div>
                            )}
                        </div>
                    )}
                    {/* Modo dibujo: encima de todo, captura el puntero. El trazo en
                        curso se ve igual que como queda (TrazoSvg). */}
                    {pincel && !readOnly && (
                        <div className={`${styles.stickersCapa} ${styles.capaDibujo}`} style={marco}>
                            <div
                                className={`${styles.lienzo} ${styles.lienzoDibujo}`}
                                style={marcoDibujo ?? lienzo}
                                onPointerDown={empezarTrazo}
                                onPointerMove={moverTrazo}
                                onPointerUp={terminarTrazo}
                                onPointerCancel={terminarTrazo}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {trazo && !trazoEn && (
                                    <div className={styles.trazoVivo} style={{ opacity: Math.min(pincel.opacity / 100, PINCEL[pincel.brush]?.maxA ?? 1) }}>
                                        <TrazoSvg s={{ ...pincel, points: trazo }} vbW={PIEZA_ANCHO} vbH={marcoDibujo ? PIEZA_ANCHO * (marcoDibujo.height / marcoDibujo.width) : PIEZA_ALTO} preview />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {/* El aviso va fuera de la capa de dibujo: esa crece con el zoom
                        del scroll y lo agrandaba. */}
                    {pincel && !readOnly && sinTrazos && !trazo && (
                        <div aria-hidden className={styles.dibujoAvisoCapa} style={marco}>
                            <span className={styles.dibujoAviso}>{t('side_events.draw_canvas_hint')}</span>
                        </div>
                    )}
                    {/* Ajustar la foto: encima de todo; la cuadrícula de tercios
                        ayuda a encuadrar. */}
                    {ajustarFoto && !readOnly && srcAjustable && (
                        <div
                            ref={capaAjusteRef}
                            className={`${styles.stickersCapa} ${styles.capaAjuste}`}
                            style={marco}
                            onPointerDown={empezarAjuste}
                            onPointerMove={moverAjuste}
                            onPointerUp={soltarAjuste}
                            onPointerCancel={soltarAjuste}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <span aria-hidden className={styles.ajusteTercios} />
                            <span className={styles.dibujoAviso}>{t('side_events.photo_adjust_hint')}</span>
                        </div>
                    )}
                </div>

                <div
                    ref={infoRef}
                    className={styles.infoCont}
                    style={{ ...(padBottom ? { paddingBottom: padBottom + 24 } : {}), ...(soloPortada ? { visibility: 'hidden' } : {}) }}
                >

                    {/* Primera pantalla: título, fecha, lugar y botones, con los
                        botones al fondo (16 px abajo), como la página del invitado
                        (.primera_pantalla). Al hacer scroll todo sube encima de la
                        portada fija. */}
                    <div className={styles.primeraPantalla}>
                        {/* Título. Vacío no ocupa lugar (como en la página del
                            invitado, donde no se pinta): el texto de ejemplo flota
                            encima de la fecha para poder tocarlo y escribir. */}
                        <div className={`${cls('title', styles.titleZone)} ${!current?.name?.trim() ? styles.titleVacio : ''}`} data-zone='title' onClick={pick('title')} style={portadaOculta(body, 'title') ? { display: 'none' } : undefined}>
                            <div
                                ref={titleRef}
                                className={styles.titleInput}
                                contentEditable={!readOnly}
                                suppressContentEditableWarning
                                spellCheck={false}
                                data-placeholder={t('side_events.event_title_placeholder')}
                                onInput={(e) => setName(e.currentTarget.textContent)}
                                style={{
                                    fontFamily: title.font ?? 'Poppins',
                                    fontWeight: title.weight ?? 500,
                                    fontSize: `${title.size ?? 36}px`,
                                    lineHeight: title.line_height ?? 1.4,
                                    opacity: title.opacity ?? 1,
                                    textShadow: sombraDeTexto(title.shadow),
                                    // Barra de texto (la de la invitación): color, cursiva,
                                    // subrayado, tachado, mayúsculas y espacio entre letras.
                                    // Igual que la página del invitado (fontExtras).
                                    ...(title.color ? { color: title.color } : {}),
                                    ...(title.italic ? { fontStyle: 'italic' } : {}),
                                    ...((title.underline || title.strike) ? { textDecoration: [title.underline && 'underline', title.strike && 'line-through'].filter(Boolean).join(' ') } : {}),
                                    ...(title.transform && title.transform !== 'none' ? { textTransform: title.transform } : {}),
                                    ...(typeof title.letterSpacing === 'number' ? { letterSpacing: `${title.letterSpacing / 100}em` } : {}),
                                }}
                            >
                                {initialTitle}
                            </div>
                        </div>

                        {/* Fecha y lugar van en un solo bloque, sin separación,
                            igual que la columna .col de la página del invitado. */}
                        <div className={styles.detalles}>
                            {/* Fecha */}
                            <div className={cls('date', styles.col)} data-zone='date' onClick={pick('date')} style={{ textShadow: sombraDeTexto(body.details_shadow), ...(portadaOculta(body, 'date') ? { display: 'none' } : {}) }}>
                                {dateLabels.length
                                    ? dateLabels.map(label => <span key={label}>{label}</span>)
                                    : <span className={styles.colMuted}>{t('side_events.datetime_label')}</span>
                                }
                            </div>

                            {/* Lugar */}
                            <div className={cls('place', styles.col)} data-zone='place' onClick={pick('place')} style={{ textShadow: sombraDeTexto(body.details_shadow), ...(portadaOculta(body, 'place') ? { display: 'none' } : {}) }}>
                                {placeLabel
                                    ? <>
                                        <span>{placeLabel}</span>
                                        {regionLabel && <span>{regionLabel}</span>}
                                    </>
                                    : <span className={styles.colMuted}>{t('side_events.place_name_label')}</span>
                                }
                            </div>
                        </div>
                        {/* RSVP: maqueta de la píldora de la pieza */}
                        <div ref={botonesRef} aria-hidden className={styles.buttonsCont}>
                            <span className={styles.mockBtn}>
                                <CircleCheck size={20} strokeWidth={1.6} /> {t('side_events.canvas_rsvp_yes')}
                            </span>
                            <span className={styles.mockDivisor} />
                            <span className={styles.mockBtn}>
                                <CircleX size={20} strokeWidth={1.6} /> {t('side_events.canvas_rsvp_no')}
                            </span>
                        </div>
                    </div>

                    {/* Tarjetas debajo de la portada, en el orden del panel Capas
                        (tarjetasSide.js), agrupadas bajo su etiqueta
                        (INFORMACIÓN · UBICACIÓN · ASISTENTES), como la página del
                        invitado (handoff "Pop Layout" 3a). El formulario no va en
                        el scroll: al invitado le llega como aviso al confirmar.
                        Al editar, como los módulos deshabilitados de la
                        invitación: las ocultas y las que no tienen datos salen
                        opacas, con una muestra y al centro "Activar …" (ocultas)
                        o "Agregar …" (sin datos). En la página no salen. */}
                    {(() => {
                        const tarjetas = tarjetasDe(body, conAsistentes)
                        const oculta = (k) => Boolean(tarjetas.find((c) => c.key === k)?.hidden)
                        const conItinerario = tieneDatos(body, 'itinerary')
                        const conMapa = tieneDatos(body, 'map')
                        // Notas vacía: opaca con "Agregar notas"; al tocarlo (o al
                        // elegirla en Capas) se abre para escribir ahí mismo.
                        const conDatos = (k) => tieneDatos(body, k) || (k === 'notes' && (notasAbiertas || selected === 'extras'))
                        const lista = (k) => !oculta(k) && conDatos(k)
                        // Activas arriba (en su orden), inactivas al final.
                        const keys = activasPrimero(tarjetas.filter((c) => !readOnly || lista(c.key)).map((c) => c.key), lista)
                        const grupos = agruparTarjetas(keys)
                        // Secciones activas: se pueden arrastrar por su etiqueta.
                        const gruposActivos = grupos.filter((g) => g.keys.some(lista))
                        const arrastrable = (g) => !readOnly && gruposActivos.length > 1 && gruposActivos.includes(g)
                        // El clima va dentro de Lugar solo si los dos se ven completos.
                        const climaEnLugar = lista('map') && lista('weather')

                        // Activar una oculta: se prende (como su ojo en Capas) y se elige.
                        const activar = (key, zona) => (e) => {
                            e.stopPropagation()
                            onChange((prev) => ({ ...prev, body: { ...prev.body, ...parcheOcultarTarjeta(prev.body, key, false) } }))
                            onSelect(zona)
                        }
                        // Tarjeta apagada: la muestra opaca y el botón al centro.
                        // Sin datos ("Agregar …"): abre su edición y, si estaba
                        // oculta, la prende para que salga en cuanto tenga algo.
                        const apagada = (key, zona, muestra, agregar, alAgregar) => {
                            const alTocarAgregar = (e) => {
                                e.stopPropagation()
                                if (oculta(key)) onChange((prev) => ({ ...prev, body: { ...prev.body, ...parcheOcultarTarjeta(prev.body, key, false) } }))
                                if (alAgregar) alAgregar()
                                else onSelect(zona)
                            }
                            return (
                                <div key={key} data-tarjeta={key} className={cls(zona, styles.apagada)} data-zone={zona} onClick={agregar ? alTocarAgregar : (e) => { e.stopPropagation(); onSelect(zona) }}>
                                    <div className={styles.apagadaMuestra} aria-hidden>{muestra}</div>
                                    {!readOnly && (
                                        <button type='button' className={styles.activar} onClick={agregar ? alTocarAgregar : activar(key, zona)}>
                                            {agregar ? <Plus size={15} strokeWidth={2.2} /> : <Eye size={15} strokeWidth={2} />}
                                            {agregar ?? t('side_events.canvas_activate', { name: t(`build_editor.${{ itinerary: 'lp_itinerary', map: 'lp_map', notes: 'lp_notes', attendees: 'lp_attendees', weather: 'lp_weather' }[key]}`) })}
                                        </button>
                                    )}
                                </div>
                            )
                        }

                        const tarjetaLugar = (muestra, conClima) => (
                            <>
                                <div className={styles.lugarCabecera}>
                                    <span className={styles.lugarTextos}>
                                        <span className={styles.lugarNombre}>{muestra ? t('side_events.place_name_label') : (placeLabel || address.street)}</span>
                                        <span className={styles.lugarDireccion}>{muestra ? t('side_events.canvas_empty_place') : [`${address.street ?? ''} ${address.number ?? ''}`.trim(), address.city].filter(Boolean).join(', ')}</span>
                                    </span>
                                    <span className={styles.lugarAbrir}>{t('side_events.canvas_open')} <ArrowUpRight size={14} /></span>
                                </div>
                                <div className={styles.mapPreview}>
                                    <MapPin size={16} />
                                </div>
                                {conClima && (
                                    <div className={cls(zonaDe('weather'), styles.lugarClima)} data-zone={zonaDe('weather')} onClick={pick(zonaDe('weather'))}>
                                        <CloudSun size={24} />
                                        <span className={styles.weatherLeft}>
                                            <span className={styles.weatherTitle}>{t('side_events.canvas_weather')}</span>
                                            <span className={styles.weatherHint}>{address.city} · {t(`side_events.weather_mode_${modoClima(body)}`)}</span>
                                        </span>
                                    </div>
                                )}
                            </>
                        )
                        const tarjetaClima = (ciudad) => (
                            <>
                                <div className={styles.weatherLeft}>
                                    <span className={styles.weatherTitle}>{t('side_events.canvas_weather')}</span>
                                    <span className={styles.weatherHint}>{ciudad} · {t(`side_events.weather_mode_${modoClima(body)}`)}</span>
                                </div>
                                <CloudSun size={26} />
                            </>
                        )

                        // Soltar una sección: el nuevo orden de las activas y después las inactivas.
                        const soltar = (id, destino) => {
                            const otras = gruposActivos.filter((g) => g.id !== id)
                            const movida = gruposActivos.find((g) => g.id === id)
                            const nuevo = [...otras.slice(0, destino), movida, ...otras.slice(destino), ...grupos.filter((g) => !gruposActivos.includes(g))]
                            if (nuevo.map((g) => g.id).join() === grupos.map((g) => g.id).join()) return
                            onChange((prev) => ({ ...prev, body: { ...prev.body, ...parcheOrdenTarjetas(prev.body, nuevo.flatMap((g) => g.keys)) } }))
                        }
                        const otrasActivas = arrastre ? gruposActivos.filter((g) => g.id !== arrastre.id) : []
                        const lineaAntes = arrastre ? otrasActivas[arrastre.destino]?.id : null
                        const lineaDespues = arrastre && arrastre.destino >= otrasActivas.length ? otrasActivas[otrasActivas.length - 1]?.id : null

                        return grupos.map(({ id, keys: delGrupo }) => (
                            <div
                                key={id}
                                className={styles.grupo}
                                data-grupo={id}
                                data-arrastrando={arrastre?.id === id || undefined}
                                data-linea={lineaAntes === id ? 'antes' : lineaDespues === id ? 'despues' : undefined}
                            >
                                {arrastrable(grupos.find((x) => x.id === id)) ? (
                                    <span
                                        className={`${styles.grupoEtiqueta} ${styles.grupoArrastrable}`}
                                        data-arrastrable-grupo
                                        title={t('side_events.canvas_drag_group')}
                                        onPointerDown={(e) => {
                                            if (e.button !== 0) return
                                            e.preventDefault()
                                            e.stopPropagation()
                                            setArrastre({ id, destino: gruposActivos.findIndex((x) => x.id === id), soltar })
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <GripVertical size={13} className={styles.grupoAsa} />
                                        {t(`side_events.canvas_group_${id}`)}
                                    </span>
                                ) : (
                                    <span className={styles.grupoEtiqueta}>{t(`side_events.canvas_group_${id}`)}</span>
                                )}
                                {delGrupo.map((key) => {
                                    // Asistentes (Pop, opcional), con asistentes de ejemplo.
                                    if (key === 'attendees') {
                                        const muestra = <AsistentesMuestra colorTema={body.color} reales={asistentes} modo={body.attendeesStyle === 'initials' ? 'initials' : 'emoji'} chat={Boolean(body.chat?.enabled)} chatMensajes={chatMensajes} sinTitulo />
                                        if (oculta(key)) return apagada(key, 'attendees', muestra)
                                        return (
                                            <div key={key} data-tarjeta={key} className={cls('attendees', styles.itineraryZona)} data-zone='attendees' onClick={pick('attendees')}>
                                                {muestra}
                                            </div>
                                        )
                                    }
                                    // Itinerario: el mismo widget que el remoto (vacío, uno de ejemplo).
                                    if (key === 'itinerary') {
                                        if (!lista(key)) {
                                            const ejemplo = { ...body, itinerary: conItinerario ? body.itinerary : ITINERARIO_MUESTRA }
                                            return apagada(key, 'itinerary', <ItinerarioWidget body={ejemplo} sinTitulo />, conItinerario ? null : t('side_events.canvas_add_itinerary'))
                                        }
                                        return (
                                            <div key={key} data-tarjeta={key} className={cls('itinerary', styles.itineraryZona)} data-zone='itinerary' onClick={pick('itinerary')}>
                                                <ItinerarioWidget body={body} sinTitulo />
                                            </div>
                                        )
                                    }
                                    // Lugar: mapa y, debajo, la fila del clima (cada uno su capa).
                                    if (key === 'map') {
                                        if (!lista(key)) {
                                            return apagada(key, zonaDe('map'), <div className={`${styles.block} ${styles.lugarBlock}`}>{tarjetaLugar(!conMapa, false)}</div>, conMapa ? null : t('side_events.canvas_add_place'))
                                        }
                                        return (
                                            <div key={key} data-tarjeta={key} className={cls(zonaDe('map'), `${styles.block} ${styles.lugarBlock}`)} data-zone={zonaDe('map')} onClick={pick(zonaDe('map'))}>
                                                {tarjetaLugar(false, climaEnLugar)}
                                            </div>
                                        )
                                    }
                                    // Notas
                                    if (key === 'notes') {
                                        // Sin texto: "Agregar notas" la abre para escribir ahí mismo.
                                        if (!lista(key)) {
                                            const conTexto = conDatos(key)
                                            return apagada(key, 'extras', (
                                                <div className={`${styles.block} ${styles.notasBlock}`}>
                                                    <div className={styles.extrasInput} style={estiloNotas(body)}>{body.extras || t('side_events.canvas_sample_notes')}</div>
                                                </div>
                                            ), conTexto ? null : t('side_events.canvas_add_notes'), () => {
                                                setNotasAbiertas(true)
                                                onSelect('extras')
                                            })
                                        }
                                        return (
                                            <div key={key} data-tarjeta={key} className={cls('extras', `${styles.block} ${styles.notasBlock}`)} data-zone='extras' onClick={pick('extras')}>
                                                {/* El texto se copia al montarse (y no como hijo de React,
                                                    que movería el caret al escribir): así también sale bien
                                                    al volver a mostrar la tarjeta desde Capas. */}
                                                <div
                                                    ref={(el) => {
                                                        extrasRef.current = el
                                                        if (el && !el.dataset.listo) { el.innerText = current?.body?.extras ?? ''; el.dataset.listo = '1' }
                                                    }}
                                                    className={styles.extrasInput}
                                                    style={{
                                                        ...estiloNotas(body),
                                                        // Con otro estilo de bloques: el color elegido si se lee, si no la tinta del estilo.
                                                        ...(tintaDeNotas(estiloDe(body), body.color, body.notes_style?.color) ? { color: tintaDeNotas(estiloDe(body), body.color, body.notes_style?.color), mixBlendMode: 'normal' } : {}),
                                                    }}
                                                    contentEditable={!readOnly}
                                                    suppressContentEditableWarning
                                                    spellCheck={false}
                                                    data-placeholder={t('side_events.extras_placeholder')}
                                                    onInput={(e) => setExtras(e.currentTarget.innerText)}
                                                    // Vacía al salir: vuelve a la tarjeta opaca.
                                                    onBlur={(e) => { if (!e.currentTarget.innerText.trim()) setNotasAbiertas(false) }}
                                                />
                                            </div>
                                        )
                                    }
                                    // Clima: dentro de Lugar cuando los dos se ven; si no, su tarjeta sola.
                                    if (climaEnLugar) return null
                                    if (!lista(key)) {
                                        return apagada(key, zonaDe('weather'), <div className={`${styles.block} ${styles.weatherBlock}`}>{tarjetaClima(address.city || t('side_events.canvas_sample_city'))}</div>, address.city ? null : t('side_events.canvas_add_city'))
                                    }
                                    return (
                                        <div key={key} data-tarjeta={key} className={cls(zonaDe('weather'), `${styles.block} ${styles.weatherBlock}`)} data-zone={zonaDe('weather')} onClick={pick(zonaDe('weather'))}>
                                            {tarjetaClima(address.city)}
                                        </div>
                                    )
                                })}
                            </div>
                        ))
                    })()}

                    <div aria-hidden className={styles.footer}>I attend</div>

                    {/* Dibujos encima de las tarjetas: cada uno en la caja de su
                        tarjeta (medida arriba), con su agarradera si está elegido. */}
                    {(conDibujosEnTarjetas || trazoEn) && (
                        <div className={styles.capaTarjetas} data-medida={medirCajas}>
                            {Object.entries(cajas).map(([key, caja]) => {
                                const lista = stickers.filter((x) => x.tarjeta === key && x.kind === 'dibujo')
                                const vivo = trazo && trazoEn === key
                                if (!lista.length && !vivo) return null
                                return (
                                    <div key={key} ref={(el) => { cajasRef.current[key] = el }} className={styles.lienzo} style={caja}>
                                        {pintarStickers(lista)}
                                        {!readOnly && !pincel && pintarAgarres(lista.filter((x) => seleccion.includes(x.id)))}
                                        {/* El trazo en curso, a la escala de la tarjeta (como queda). */}
                                        {vivo && (
                                            <div className={styles.trazoVivo} style={{ opacity: Math.min(pincel.opacity / 100, PINCEL[pincel.brush]?.maxA ?? 1) }}>
                                                <TrazoSvg s={{ ...pincel, points: trazo }} vbW={PIEZA_ANCHO} vbH={PIEZA_ANCHO * (caja.height / caja.width)} preview />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Formulario (Pop): al invitado le llega como aviso fijo
                arriba de la pantalla al confirmar. Aquí solo una píldora
                chica en la esquina (no estorba al editar la portada): con
                formulario dice "Formulario"; sin él, "+ Formulario" (como el
                disco de la canción). Tocarla abre su panel. */}
            {conAsistentes && (() => {
                const form = formPublicado(body.form)
                const preguntas = (form?.sections ?? []).reduce((n, s) => n + (s.fields ?? []).filter((f) => f.enabled !== false).length, 0)
                const puesto = Boolean(body.form?.enabled) && preguntas > 0
                return (
                    <button
                        type='button'
                        className={cls('registration', `${styles.formAviso} ${puesto ? '' : styles.formAvisoVacio}`)}
                        data-zone='registration'
                        onClick={pick('registration')}
                        title={puesto ? `${form.title || t('side_events.reg_title')} · ${t('side_events.canvas_form_arrives', { count: preguntas })}` : undefined}
                    >
                        {puesto ? <ClipboardList size={13} strokeWidth={2.2} /> : <Plus size={13} strokeWidth={2.4} />}
                        {/* Con formulario puesto, su nombre; sin él, "+ Formulario". */}
                        <span className={styles.formAvisoTexto}>{puesto ? (form.title?.trim() || t('side_events.reg_title')) : t('side_events.reg_title')}</span>
                    </button>
                )
            })()}
        </div>
    )
}

export default SideCanvas
