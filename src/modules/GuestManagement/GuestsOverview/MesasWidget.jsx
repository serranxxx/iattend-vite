import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import styles from './MesasWidget.module.css'

// Confirmado y asistente son el mismo estado a efectos de acomodo: el segundo
// es el que se marca al escanear el pase en la puerta.
const CONFIRMED_STATES = ['confirmado', 'asistente']

// `tables.number` es text: ordenar lexicográficamente da 1, 10, 11, 2.
const byNaturalNumber = (a, b) =>
    String(a.number ?? '').localeCompare(String(b.number ?? ''), undefined, { numeric: true })

const plural = (n, one, many) => (n === 1 ? one : many)

// Con más de esto, las barras dejan de tener tope de ancho y se reparten todo
// el espacio de la tarjeta.
const MANY_BARS = 12

// Barras de relleno para el estado vacío: solo decoran, con alturas fijas para
// que no bailen entre renders.
const PLACEHOLDER_BARS = [62, 78, 45, 88, 54, 70, 40, 82, 58, 74, 48, 90, 64, 52, 80, 44, 86, 60, 72, 50, 84, 56, 68, 76]

/**
 * Widget de acomodo de mesas del tab Seguimiento (Figma · apartado 09).
 *
 * La gráfica es una barra por mesa, en orden natural: cada una muestra qué tan
 * llena está. Llena en navy, con espacio en lila, vacía en contorno — la misma
 * convención de color del mapa.
 *
 * Hace sus propias queries a Supabase (patrón del repo) para no depender de
 * cómo GuestsPage tenga cargados los invitados en ese momento.
 */
export const MesasWidget = ({ invitationID, className = '', onOpenTables }) => {
    const [tables, setTables] = useState(null)
    const [guests, setGuests] = useState(null)

    const load = useCallback(async () => {
        if (!invitationID) return

        const [tablesRes, guestsRes] = await Promise.all([
            supabase
                .from('tables')
                .select('id, name, number, size, shape')
                .eq('invitation_id', invitationID),
            supabase
                .from('guests')
                .select('id, name, state, table')
                .eq('invitation_id', invitationID),
        ])

        if (tablesRes.error) {
            console.error('Error al obtener mesas:', tablesRes.error.message)
            return
        }
        if (guestsRes.error) {
            console.error('Error al obtener invitados:', guestsRes.error.message)
            return
        }

        setTables(tablesRes.data ?? [])
        setGuests(guestsRes.data ?? [])
    }, [invitationID])

    useEffect(() => { load() }, [load])

    const data = useMemo(() => {
        if (!tables || !guests) return null

        // La pista de baile vive en la misma tabla pero no es una mesa.
        const realTables = tables.filter((t) => t.shape !== 'dance')

        // Solo cuentan como ocupados los lugares de gente que va a venir: un
        // invitado que canceló pero conserva su mesa asignada no ocupa nada, y
        // contarlo haría que "sentados" superara a "confirmados".
        const confirmedGuests = guests.filter((g) => CONFIRMED_STATES.includes(g.state))

        const rows = [...realTables]
            .sort(byNaturalNumber)
            .map((table) => {
                const size = table.size ?? 0
                const taken = confirmedGuests.filter((g) => g.table === table.id).length
                return {
                    id: table.id,
                    number: table.number,
                    name: table.name,
                    size,
                    taken,
                    ratio: size > 0 ? Math.min(taken / size, 1) : 0,
                    full: size > 0 && taken >= size,
                    empty: taken === 0,
                }
            })

        const seated = rows.reduce((acc, r) => acc + r.taken, 0)
        const confirmed = confirmedGuests.length

        return {
            rows,
            count: rows.length,
            seated,
            confirmed,
            pending: Math.max(confirmed - seated, 0),
            fullTables: rows.filter((r) => r.full).length,
            emptyTables: rows.filter((r) => r.empty).length,
            firstNumber: rows[0]?.number,
            lastNumber: rows[rows.length - 1]?.number,
        }
    }, [tables, guests])

    // Mientras carga no se dibuja nada: un esqueleto haría saltar el layout de
    // la columna cada vez que se entra al tab.
    if (!invitationID || !data) return null

    const { rows, count, seated, confirmed, pending, fullTables, emptyTables, firstNumber, lastNumber } = data

    /* ── B · estado inicial, sin mesas ─────────────────────────────────── */

    if (count === 0) {
        return (
            <section className={`${styles.card} ${className}`}>
                <header className={styles.head}>
                    <span className={styles.eyebrow}>Acomodo de mesas</span>
                </header>

                <div className={styles.metric}>
                    <span className={styles.metricNumber}>0</span>
                    <span className={styles.metricLabel}>de {confirmed} sentados</span>
                    <span className={styles.metricAside}>sin mesas</span>
                </div>

                <div
                    className={`${styles.chartWrap} ${PLACEHOLDER_BARS.length > MANY_BARS ? styles.chartWrapWide : ''}`}
                    style={{ '--bars': PLACEHOLDER_BARS.length }}
                >
                    <div className={styles.chart}>
                        {PLACEHOLDER_BARS.map((h, i) => (
                            <span key={i} className={styles.ghostBar} style={{ height: `${h}%` }} />
                        ))}
                    </div>
                </div>
                <p className={styles.ghostHint}>Aquí vas a ver qué tan llena está cada mesa</p>

                <p className={styles.blankTitle}>
                    {confirmed === 1
                        ? 'Tu confirmado todavía no tiene mesa'
                        : `Tus ${confirmed} confirmados todavía no tienen mesa`}
                </p>

                <button type="button" className={styles.blankCta} onClick={onOpenTables}>
                    Armar el mapa de mesas
                </button>
            </section>
        )
    }

    /* ── A · estado normal ─────────────────────────────────────────────── */

    return (
        <section className={`${styles.card} ${className}`}>
            <header className={styles.head}>
                <span className={styles.eyebrow}>Acomodo de mesas</span>
                <button type="button" className={styles.linkBtn} onClick={onOpenTables}>
                    Abrir
                    <ArrowUpRight size={16} />
                </button>
            </header>

            <div className={styles.metric}>
                <span className={styles.metricNumber}>{seated}</span>
                <span className={styles.metricLabel}>de {confirmed} sentados</span>
                <span className={styles.metricAside}>
                    {count} {plural(count, 'mesa', 'mesas')}
                </span>
            </div>

            <div
                className={`${styles.chartWrap} ${count > MANY_BARS ? styles.chartWrapWide : ''}`}
                style={{ '--bars': count }}
            >
                <div className={styles.chart}>
                    {rows.map((row) => (
                        <span
                            key={row.id}
                            className={styles.barTrack}
                            title={`${row.name ? `${row.name} · ` : ''}Mesa #${row.number} — ${row.taken}/${row.size}`}
                        >
                            {!row.empty && (
                                <span
                                    className={`${styles.barFill} ${row.full ? styles.barFull : styles.barPartial}`}
                                    style={{ height: `${Math.max(row.ratio * 100, 8)}%` }}
                                />
                            )}
                        </span>
                    ))}
                </div>

                {/* Con una o dos mesas el eje se apretaría contra sí mismo y no
                    aporta nada: los números ya se leen en el texto. */}
                {count > 2 && (
                    <div className={styles.chartAxis}>
                        <span>#{firstNumber}</span>
                        <span>#{lastNumber}</span>
                    </div>
                )}
            </div>

            <p className={styles.caption}>
                {count === 1
                    ? 'La barra es tu única mesa. Llena en navy, con espacio en lila, vacía en contorno.'
                    : `Cada barra es una mesa, de la #${firstNumber} a la #${lastNumber}. Las llenas en navy, las que tienen espacio en lila, las vacías en contorno.`}
            </p>

            <div className={styles.legend}>
                <span className={styles.legendFull}>
                    {fullTables} {plural(fullTables, 'completa', 'completas')}
                </span>
                <span className={styles.legendEmpty}>
                    {emptyTables} {plural(emptyTables, 'vacía', 'vacías')}
                </span>
                <span className={styles.legendPending}>
                    {pending} sin mesa
                </span>
            </div>

        </section>
    )
}
