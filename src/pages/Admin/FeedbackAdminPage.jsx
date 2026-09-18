import { useEffect, useMemo, useState } from 'react'
import { message } from 'antd'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { fetchSubmittedFeedback } from './feedbackAdminApi'
import styles from './FeedbackAdminPage.module.css'

dayjs.locale('es')

const ESTRELLAS = [5, 4, 3, 2, 1]

const tieneComentario = (review) => Boolean(review.comment && review.comment.trim())

const eventoLabel = (review) => {
    const inv = review.invitations
    return inv?.label || inv?.name || 'Evento'
}

export const FeedbackAdminPage = ({ eventosActivos = 0 }) => {
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [filtroEstrellas, setFiltroEstrellas] = useState('todas')
    const [soloConComentario, setSoloConComentario] = useState(false)

    useEffect(() => {
        let cancelado = false

        fetchSubmittedFeedback()
            .then(data => { if (!cancelado) setRows(data) })
            .catch(err => {
                console.error('Error al cargar feedback:', err)
                message.error('No se pudo cargar el feedback')
            })
            .finally(() => { if (!cancelado) setLoading(false) })

        return () => { cancelado = true }
    }, [])

    const kpis = useMemo(() => {
        const total = rows.length
        const promedio = total ? rows.reduce((sum, r) => sum + (r.rating || 0), 0) / total : 0
        const conComentario = rows.filter(tieneComentario).length

        return {
            total,
            promedio,
            pctConComentario: total ? (conComentario / total) * 100 : 0,
        }
    }, [rows])

    // Barras horizontales: el ancho es relativo al rating más frecuente, no al
    // total, para que la distribución se lea aunque haya pocas respuestas.
    const distribucion = useMemo(() => {
        const conteos = ESTRELLAS.map(estrella => ({
            estrella,
            conteo: rows.filter(r => r.rating === estrella).length,
        }))
        const max = Math.max(...conteos.map(c => c.conteo), 1)
        return conteos.map(c => ({ ...c, pct: (c.conteo / max) * 100 }))
    }, [rows])

    const visibles = useMemo(() => rows.filter(r => {
        if (filtroEstrellas !== 'todas' && r.rating !== Number(filtroEstrellas)) return false
        if (soloConComentario && !tieneComentario(r)) return false
        return true
    }), [rows, filtroEstrellas, soloConComentario])

    return (
        <div className={styles.feedback}>
            <div className={styles.kpis}>
                <div className={styles.kpi}>
                    <div className={styles.kpiLabel}>Promedio general</div>
                    <div className={styles.kpiValue}>{kpis.promedio.toFixed(1)} ★</div>
                    <div className={styles.kpiFoot}>sobre {kpis.total} respuestas</div>
                </div>

                <div className={styles.kpi}>
                    <div className={styles.kpiLabel}>Respuestas</div>
                    <div className={styles.kpiValue}>{kpis.total}</div>
                    <div className={styles.kpiFoot}>de {eventosActivos} eventos activos</div>
                </div>

                <div className={styles.kpi}>
                    <div className={styles.kpiLabel}>Con comentario</div>
                    <div className={styles.kpiValue}>{kpis.pctConComentario.toFixed(0)}%</div>
                    <div className={styles.kpiFoot}>feedback cualitativo real</div>
                </div>
            </div>

            <div className={`${styles.card} ${styles.cardPad}`}>
                <h2 className={styles.cardTitle} style={{ marginBottom: 12 }}>Distribución de estrellas</h2>
                <div className={styles.dist}>
                    {distribucion.map(({ estrella, conteo, pct }) => (
                        <div className={styles.distRow} key={estrella}>
                            <span className={styles.distLabel}>{estrella} ★</span>
                            <span className={styles.distTrack}>
                                <span className={styles.distFill} style={{ width: `${pct}%` }} />
                            </span>
                            <span className={styles.distCount}>{conteo}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.cardHead}>
                    <h2 className={styles.cardTitle}>Reviews</h2>
                    <div className={styles.filters}>
                        <select
                            className={styles.select}
                            value={filtroEstrellas}
                            onChange={(e) => setFiltroEstrellas(e.target.value)}
                            aria-label='Filtrar por estrellas'
                        >
                            <option value='todas'>Todas las estrellas</option>
                            {ESTRELLAS.map(e => <option key={e} value={e}>{e} ★</option>)}
                        </select>

                        <label className={styles.checkbox}>
                            <input
                                type='checkbox'
                                checked={soloConComentario}
                                onChange={(e) => setSoloConComentario(e.target.checked)}
                            />
                            Solo con comentario
                        </label>
                    </div>
                </div>

                {loading ? (
                    <div className={styles.empty}>Cargando reviews…</div>
                ) : visibles.length === 0 ? (
                    <div className={styles.empty}>No hay reviews que coincidan con el filtro.</div>
                ) : visibles.map(review => (
                    <div className={styles.review} key={review.id}>
                        <span className={styles.stars}>{review.rating} ★</span>
                        <div className={styles.reviewBody}>
                            <div className={styles.reviewMeta}>
                                {eventoLabel(review)} · {dayjs(review.submitted_at).format('D MMM YYYY')}
                            </div>
                            {tieneComentario(review)
                                ? <div className={styles.comment}>{review.comment}</div>
                                : <div className={styles.noComment}>Sin comentario</div>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
