import React, { useEffect, useMemo, useState } from 'react'
import { message } from 'antd'
import { Minus, Plus } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { LAYOUTS, buildLayout } from './autoLayout'
import styles from './Onboarding.module.css'

// Cálculo de sillas por mesa (§4.1). Los pesos vienen de mesas reales: una
// cuadrada admite ~1.3 veces lo de una redonda y una rectangular ~1.5.
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)

const seatPlan = (tickets, counts) => {
    const weights = counts.round * 1.0 + counts.square * 1.3 + counts.rectangle * 1.5
    const base = weights > 0 ? tickets / weights : 0

    const seats = {
        round: clamp(Math.round(base), 8, 12),
        square: clamp(Math.round(base * 1.3), 8, 16),
        rectangle: clamp(Math.round(base * 1.5), 10, 18),
    }
    const total =
        counts.round * seats.round +
        counts.square * seats.square +
        counts.rectangle * seats.rectangle

    return { seats, total }
}

const SHAPE_META = [
    { key: 'round', label: 'Redondas', singular: 'redondas', glyph: styles.glyphRound },
    { key: 'square', label: 'Cuadradas', singular: 'cuadradas', glyph: styles.glyphSquare },
    { key: 'rectangle', label: 'Rectangulares', singular: 'rectangulares', glyph: styles.glyphRect },
]

/** Miniatura esquemática de cada acomodo. */
const Thumb = ({ layoutKey }) => {
    const dot = (key, style) => <span key={key} className={styles.thumbTable} style={style} />

    if (layoutKey === 'dance-side') {
        return (
            <div className={styles.thumb}>
                <span className={styles.thumbFloor} style={{ right: 10, top: 22, width: 52, height: 60 }}>PISTA</span>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i =>
                    dot(i, { left: 12 + (i % 3) * 22, top: 18 + Math.floor(i / 3) * 24 })
                )}
            </div>
        )
    }

    if (layoutKey === 'stage-front') {
        return (
            <div className={styles.thumb}>
                <span className={styles.thumbStage} style={{ left: 34, top: 8, right: 34, height: 11 }} />
                <span className={styles.thumbFloor} style={{ left: 52, top: 30, width: 46, height: 34 }}>PISTA</span>
                {[0, 1].map(i => dot(`l${i}`, { left: 14, top: 32 + i * 22 }))}
                {[0, 1].map(i => dot(`r${i}`, { right: 14, top: 32 + i * 22 }))}
                {[0, 1, 2, 3].map(i => dot(`b${i}`, { left: 30 + i * 24, bottom: 10 }))}
            </div>
        )
    }

    return (
        <div className={styles.thumb}>
            <span className={styles.thumbFloor} style={{ left: 52, top: 36, width: 46, height: 34 }}>PISTA</span>
            {[0, 1, 2, 3].map(i => dot(`t${i}`, { left: 30 + i * 24, top: 10 }))}
            {[0, 1, 2, 3].map(i => dot(`b${i}`, { left: 30 + i * 24, bottom: 10 }))}
            {dot('l', { left: 14, top: 46 })}
            {dot('r', { right: 14, top: 46 })}
        </div>
    )
}

/**
 * Onboarding del mapa (§5.1): dos preguntas y un acomodo inicial.
 *
 * Aparece cuando el evento no tiene ninguna mesa creada. No es un modal: es el
 * estado vacío del panel izquierdo, con la lista de invitados siempre visible
 * a la derecha. "Empezar en blanco" lo cierra sin crear nada.
 */
export const Onboarding = ({ invitationID, onSkip, onCreated }) => {
    const [step, setStep] = useState(1)
    const [counts, setCounts] = useState({ round: 10, square: 0, rectangle: 3 })
    const [tickets, setTickets] = useState(150)
    const [ticketsDirty, setTicketsDirty] = useState(false)
    const [layoutKey, setLayoutKey] = useState('dance-center')
    const [creating, setCreating] = useState(false)

    const totalTables = counts.round + counts.square + counts.rectangle

    // Los pases reales del evento alimentan el cálculo desde el arranque.
    useEffect(() => {
        let alive = true
        supabase
            .from('invitations')
            .select('tickets')
            .eq('id', invitationID)
            .maybeSingle()
            .then(({ data }) => {
                if (alive && data?.tickets > 0) setTickets(data.tickets)
            })
        return () => { alive = false }
    }, [invitationID])

    const plan = useMemo(() => seatPlan(tickets, counts), [tickets, counts])

    const planDetail = useMemo(() => {
        const parts = SHAPE_META
            .filter(({ key }) => counts[key] > 0)
            .map(({ key, singular }) => `${counts[key]} ${singular} de ${plan.seats[key]}`)
        return parts.join(' · ')
    }, [counts, plan])

    const bumpTables = (delta) => {
        // El stepper general reparte sobre la forma más numerosa (o redondas),
        // para que "cuántas mesas" y "de qué formas" nunca se desincronicen.
        setCounts(prev => {
            const target = delta > 0
                ? (['round', 'square', 'rectangle'].sort((a, b) => prev[b] - prev[a])[0])
                : (['round', 'square', 'rectangle'].filter(k => prev[k] > 0).sort((a, b) => prev[b] - prev[a])[0])
            if (!target) return prev
            return { ...prev, [target]: Math.max(prev[target] + delta, 0) }
        })
    }

    const bumpShape = (key, delta) => {
        setCounts(prev => ({ ...prev, [key]: Math.max(prev[key] + delta, 0) }))
    }

    const saveTickets = async () => {
        if (!ticketsDirty || !(tickets > 0)) return
        const { error } = await supabase
            .from('invitations')
            .update({ tickets })
            .eq('id', invitationID)
        if (error) console.error('Error guardando pases:', error.message)
        else setTicketsDirty(false)
    }

    const createTables = async () => {
        if (creating || totalTables === 0) return
        setCreating(true)

        await saveTickets()

        // Mesas nuevas con numeración corrida por forma. buildLayout calcula
        // las posiciones sobre ids temporales; aquí no hay UPDATE porque no
        // existe nada todavía: todo es INSERT.
        let number = 0
        const drafts = []
        for (const { key } of SHAPE_META) {
            for (let i = 0; i < counts[key]; i++) {
                number += 1
                drafts.push({
                    id: `tmp-${number}`,
                    number: String(number),
                    shape: key,
                    size: plan.seats[key],
                    vertical: false,
                })
            }
        }

        const layout = buildLayout(layoutKey, drafts, { id: 'tmp-dance' })
        const posById = new Map(layout.tables.map(u => [u.id, u]))

        const now = new Date()
        const rows = drafts.map(d => {
            const pos = posById.get(d.id) ?? { x: 100, y: 100 }
            return {
                invitation_id: invitationID,
                name: null,
                number: d.number,
                shape: d.shape,
                size: d.size,
                vertical: false,
                x: pos.x,
                y: pos.y,
                created_at: now,
                last_update_at: now,
            }
        })

        if (layout.dance) {
            rows.push({
                invitation_id: invitationID,
                name: 'Pista de Baile',
                number: '0',
                shape: 'dance',
                size: 0,
                vertical: false,
                x: layout.dance.x,
                y: layout.dance.y,
                created_at: now,
                last_update_at: now,
            })
        }

        const { error } = await supabase.from('tables').insert(rows)
        setCreating(false)

        if (error) {
            console.error('Error creando las mesas:', error.message)
            message.error('No se pudieron crear las mesas')
            return
        }
        onCreated?.()
    }

    /* ── Paso 1: cuántas y de qué formas ───────────────────────────────── */

    if (step === 1) {
        return (
            <div className={`${styles.canvas} scroll-invitation`}>
                <div className={styles.inner}>
                    <span className={styles.eyebrow}>Mapa de mesas</span>
                    <h2 className={styles.title}>Armemos el mapa de tu salón</h2>
                    <p className={styles.subtitle}>
                        Colocamos las mesas por ti para que solo tengas que sentar a la gente.
                        Son dos preguntas.
                    </p>

                    <span className={styles.question}>¿Cuántas mesas tiene tu venue?</span>

                    <div className={styles.counter}>
                        <button
                            type='button'
                            className={styles.stepBtn}
                            aria-disabled={totalTables === 0}
                            onClick={() => bumpTables(-1)}
                        >
                            <Minus size={15} />
                        </button>
                        <span className={styles.counterValue}>{totalTables}</span>
                        <button type='button' className={styles.stepBtn} onClick={() => bumpTables(1)}>
                            <Plus size={15} />
                        </button>
                        <div className={styles.counterLabel}>
                            <b>mesas</b>
                            <span>tu salón te lo confirma</span>
                        </div>
                    </div>

                    <span className={styles.question}>¿De qué formas son?</span>

                    <div className={styles.shapes}>
                        {SHAPE_META.map(({ key, label, glyph }) => (
                            <div
                                key={key}
                                className={`${styles.shapeCard} ${counts[key] > 0 ? styles.shapeCardActive : ''}`}
                            >
                                <span className={`${styles.glyph} ${glyph}`} />
                                <span className={styles.shapeName}>{label}</span>
                                <div className={styles.miniStepper}>
                                    <button
                                        type='button'
                                        className={styles.miniBtn}
                                        aria-disabled={counts[key] === 0}
                                        onClick={() => bumpShape(key, -1)}
                                    >
                                        <Minus size={13} />
                                    </button>
                                    <span className={styles.miniValue}>{counts[key]}</span>
                                    <button type='button' className={styles.miniBtn} onClick={() => bumpShape(key, 1)}>
                                        <Plus size={13} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.calc}>
                        <div className={styles.calcText}>
                            <span className={styles.calcTotal}>
                                {plan.total} lugares en total
                            </span>
                            <span className={styles.calcDetail}>
                                {planDetail ? `${planDetail}.` : 'Agrega mesas para calcular los lugares.'}
                                {counts.rectangle > 0 && ' Las rectangulares caben más gente, así que les toca más silla.'}
                            </span>
                        </div>
                        <div className={styles.tickets}>
                            <span className={styles.ticketsLabel}>Tus pases</span>
                            <input
                                className={styles.ticketsInput}
                                type='number'
                                min={1}
                                value={tickets}
                                onChange={(e) => {
                                    setTickets(Math.max(parseInt(e.target.value, 10) || 0, 0))
                                    setTicketsDirty(true)
                                }}
                                onBlur={saveTickets}
                            />
                            <span className={styles.ticketsHint}>editable</span>
                        </div>
                    </div>

                    <p className={styles.note}>
                        No te preguntamos cuántas sillas por mesa: lo calculamos con tus pases
                        y lo ajustas mesa por mesa en el mapa.
                    </p>

                    <div className={styles.ctas}>
                        <button
                            type='button'
                            className={styles.primary}
                            aria-disabled={totalTables === 0}
                            onClick={() => {
                                if (totalTables === 0) return
                                // Un anillo de rectangulares de 400px no cierra
                                // bien: con mayoría rectangular se preselecciona
                                // el acomodo por bloques.
                                setLayoutKey(counts.rectangle > totalTables / 2 ? 'dance-side' : 'dance-center')
                                setStep(2)
                            }}
                        >
                            Ver acomodos
                        </button>
                        <button type='button' className={styles.secondary} onClick={onSkip}>
                            Empezar en blanco
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    /* ── Paso 2: elegir el acomodo ─────────────────────────────────────── */

    return (
        <div className={`${styles.canvas} scroll-invitation`}>
            <div className={styles.inner}>
                <div className={styles.step2Head}>
                    <div>
                        <h2 className={styles.step2Title}>Elige por dónde empezar</h2>
                        <p className={styles.step2Sub}>
                            Los tres usan tus {totalTables} mesas y los mismos {plan.total} lugares.
                        </p>
                    </div>
                    <div className={styles.stepDots}>
                        Paso 2 de 2
                        <span className={`${styles.dot} ${styles.dotActive}`} />
                        <span className={`${styles.dot} ${styles.dotActive}`} />
                    </div>
                </div>

                <div className={styles.options}>
                    {LAYOUTS.map((layout) => (
                        <button
                            key={layout.key}
                            type='button'
                            className={`${styles.option} ${layoutKey === layout.key ? styles.optionActive : ''}`}
                            onClick={() => setLayoutKey(layout.key)}
                        >
                            <Thumb layoutKey={layout.key} />
                            <span className={styles.optionText}>
                                <span className={styles.optionName}>{layout.name}</span>
                                <span className={styles.optionDesc}>{layout.description}</span>
                                <span className={styles.traits}>
                                    {layout.traits.map(trait => (
                                        <span key={trait} className={styles.trait}>{trait}</span>
                                    ))}
                                </span>
                                <span className={styles.dataLine}>
                                    {totalTables} mesas · {plan.total} lugares · pasillos de 80 cm
                                </span>
                            </span>
                        </button>
                    ))}
                </div>

                <div className={styles.step2Footer}>
                    <button type='button' className={styles.secondary} onClick={() => setStep(1)}>
                        Atrás
                    </button>
                    <span className={styles.footerNote}>
                        Se crearán {totalTables} mesas con {plan.total} lugares.<br />
                        Podrás cambiar todo después.
                    </span>
                    <button
                        type='button'
                        className={styles.primary}
                        aria-disabled={creating}
                        onClick={createTables}
                    >
                        {creating ? 'Creando…' : `Crear mis ${totalTables} mesas →`}
                    </button>
                </div>
            </div>
        </div>
    )
}
