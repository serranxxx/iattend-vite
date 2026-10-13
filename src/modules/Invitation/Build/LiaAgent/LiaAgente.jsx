import { useEffect, useRef, useState } from 'react'
import { Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { Square, Undo2 } from 'lucide-react'
import { armarPasos, moduloDe } from './liaAgentMapa'
import styles from './LiaAgente.module.css'

// Modo agente de Lia en el editor: recibe { seccion, cambios } (ui_action
// edit_invitation) y lo actúa a la vista del organizador — glow en los
// bordes, un cursor de Lia que abre la sección, hace clic y escribe — y al
// final deja los cambios en el borrador del editor (con opción de deshacer);
// publicar es decisión del organizador, con su botón de siempre. Los clics y la escritura van contra los
// controles reales de la sección (data-lia), así que pasan por los mismos
// handlers que usa el organizador.

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const MOVER_MS = 650
const espera = (ms) => new Promise(r => setTimeout(r, reduceMotion() ? Math.min(ms, 60) : ms))

const buscar = (ancla) => document.querySelector(`[data-lia="${ancla}"]`)

const esperarAncla = async (ancla, ms = 3000) => {
    const hasta = Date.now() + ms
    while (Date.now() < hasta) {
        const el = buscar(ancla)
        if (el && el.getBoundingClientRect().width > 0) return el
        await espera(60)
    }
    return null
}

const campoDe = (el) => (el.matches('input, textarea') ? el : el.querySelector('textarea, input'))

// React escucha el evento input y compara contra el valor que tenía
// registrado: con el setter nativo el cambio pasa por su onChange.
const ponerValor = (el, valor) => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
}

export const LiaAgente = ({ tarea, getCopy, setActiveField, onRestaurar, saved, onTerminar }) => {
    const { t } = useTranslation()
    const [fase, setFase] = useState(null) // 'trabajando' | 'final'
    const [estado, setEstado] = useState('')
    const [cursor, setCursor] = useState({ x: window.innerWidth / 2, y: window.innerHeight + 40, clic: 0 })
    const [resumen, setResumen] = useState({ cambio: false, omitidos: 0, detenido: false })
    const detenerRef = useRef(false)
    const snapshotRef = useRef(null)

    useEffect(() => {
        if (!tarea) return
        let vivo = true
        detenerRef.current = false
        const copy = getCopy()
        snapshotRef.current = { copy, saved }
        // Un lote puede traer varias secciones; cada paso lleva el nombre de
        // la suya para la barra de estado.
        let omitidos = 0
        const pasos = tarea.lote.flatMap(({ seccion, cambios }) => {
            const armado = armarPasos(seccion, cambios, copy)
            omitidos += armado.omitidos
            const nombre = t(`buttons_menu.${moduloDe(seccion)}`)
            return armado.pasos.map(p => ({ ...p, nombre }))
        })
        const seccionNombre = pasos[0]?.nombre ?? ''

        const moverA = async (el, enCampo = false) => {
            el.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' })
            await espera(320)
            const r = el.getBoundingClientRect()
            const x = enCampo ? r.left + Math.min(28, r.width / 2) : r.left + r.width / 2
            const y = enCampo ? r.top + Math.min(22, r.height / 2) : r.top + r.height / 2
            setCursor(c => ({ ...c, x, y }))
            await espera(MOVER_MS)
        }
        const clic = async () => {
            setCursor(c => ({ ...c, clic: c.clic + 1 }))
            await espera(180)
        }

        const correr = async () => {
            setFase('trabajando')
            setEstado(t('lia.agent.status_start', { seccion: seccionNombre }))
            await espera(500)

            for (const paso of pasos) {
                if (!vivo || detenerRef.current) break

                if (paso.tipo === 'abrir') {
                    setEstado(t('lia.agent.status_open', { seccion: paso.nombre }))
                    const boton = document.querySelector(`[data-tour="mod-${paso.seccion}"]`)
                    if (boton) {
                        await moverA(boton)
                        await clic()
                        boton.click()
                        await espera(450)
                    }
                    continue
                }

                const el = await esperarAncla(paso.ancla)
                if (!el) continue
                setEstado(t(`lia.agent.status_${paso.etiqueta}`, { seccion: paso.nombre }))
                // Si la sección se volvió a pintar mientras el cursor viajaba,
                // el nodo que se midió ya no está en la página.
                const vigente = async (nodo) => (nodo.isConnected ? nodo : esperarAncla(paso.ancla, 1000))

                if (paso.tipo === 'aplicar') {
                    await moverA(el)
                    await clic()
                    setActiveField(paso.aplicar)
                    await espera(450)
                } else if (paso.tipo === 'teclear_dato') {
                    // Un texto que se edita en un popup (momentos del
                    // itinerario): se escribe directo en el borrador, letra
                    // por letra, con el cursor en su tarjeta.
                    await moverA(el)
                    await clic()
                    const texto = paso.texto
                    const porTick = Math.max(1, Math.ceil(texto.length / 60))
                    for (let i = 0; i <= texto.length; i += porTick) {
                        if (!vivo || detenerRef.current) break
                        const parcial = texto.slice(0, i)
                        setActiveField(prev => paso.aplicar(prev, parcial))
                        await new Promise(r => setTimeout(r, reduceMotion() ? 0 : 40))
                    }
                    if (vivo && !detenerRef.current) setActiveField(prev => paso.aplicar(prev, texto))
                    await espera(250)
                } else if (paso.tipo === 'clic') {
                    await moverA(el)
                    await clic()
                    ;(await vigente(el))?.click()
                    await espera(350)
                } else if (paso.tipo === 'escribir') {
                    if (!campoDe(el)) continue
                    await moverA(campoDe(el), true)
                    await clic()
                    const campo = campoDe(await vigente(el) ?? el)
                    if (!campo?.isConnected) continue
                    campo.focus({ preventScroll: true })
                    ponerValor(campo, '')
                    // ~2.5 s por texto sin importar su largo, de 1 a 3 letras por tick
                    const texto = paso.texto
                    const porTick = Math.max(1, Math.ceil(texto.length / 90))
                    const pausa = reduceMotion() ? 0 : Math.max(14, Math.min(40, 2500 / Math.ceil(texto.length / porTick)))
                    for (let i = porTick; i < texto.length + porTick; i += porTick) {
                        if (!vivo || detenerRef.current) break
                        ponerValor(campo, texto.slice(0, i))
                        await new Promise(r => setTimeout(r, pausa))
                    }
                    campo.blur()
                    await espera(250)
                }
            }

            if (!vivo) return
            setCursor(c => ({ ...c, y: window.innerHeight + 40 }))
            // Lo que cuenta es si el borrador cambió, no cuántos pasos corrieron.
            const cambio = JSON.stringify(getCopy()) !== JSON.stringify(copy)
            setResumen({ cambio, omitidos, detenido: detenerRef.current })
            setFase('final')
        }

        correr()
        return () => { vivo = false }
    }, [tarea?.id])

    if (!tarea || !fase) return null

    const terminar = () => {
        setFase(null)
        onTerminar()
    }

    const deshacer = () => {
        const snap = snapshotRef.current
        if (snap) onRestaurar(snap.copy, snap.saved)
        terminar()
    }

    const sinCambios = fase === 'final' && !resumen.cambio

    return (
        <>
            <div className={styles.glow} aria-hidden="true" />
            {fase === 'trabajando' && <div className={styles.bloqueo} aria-hidden="true" />}

            <div
                className={styles.cursor}
                style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)`, transitionDuration: reduceMotion() ? '0ms' : `${MOVER_MS}ms` }}
                aria-hidden="true"
            >
                <span key={cursor.clic} className={cursor.clic ? styles.onda : undefined} />
                <svg width="22" height="24" viewBox="0 0 22 24" className={styles.flecha}>
                    <path d="M2 2 L19 11 L11 13 L7 21 Z" fill="#6D3CFA" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
                </svg>
                <span className={styles.etiqueta}>Lia</span>
            </div>

            {/* data-lia-conserva-chat: los clics aquí no cierran el chat abierto */}
            <div className={styles.barra} role="status" aria-live="polite" data-lia-conserva-chat>
                <span className={styles.orb} />
                {fase === 'trabajando' ? (
                    <>
                        <span className={styles.texto}>{estado}</span>
                        <Button size="small" type="text" icon={<Square size={12} />} onClick={() => { detenerRef.current = true }}>
                            {t('lia.agent.stop')}
                        </Button>
                    </>
                ) : (
                    <div className={styles.final}>
                        <div className={styles.finalTexto}>
                            <strong>
                                {sinCambios ? t('lia.agent.final_none') : resumen.detenido ? t('lia.agent.final_stopped') : t('lia.agent.final_title')}
                            </strong>
                            {resumen.omitidos > 0 && <span className={styles.nota}>{t('lia.agent.final_skipped', { count: resumen.omitidos })}</span>}
                        </div>
                        <div className={styles.acciones}>
                            {sinCambios ? (
                                <Button onClick={terminar}>{t('lia.agent.close')}</Button>
                            ) : (
                                <>
                                    <Button type="text" icon={<Undo2 size={14} />} onClick={deshacer}>{t('lia.agent.undo')}</Button>
                                    <Button onClick={terminar}>{t('lia.agent.close')}</Button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
