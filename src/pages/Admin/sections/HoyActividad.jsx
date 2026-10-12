import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import { supabase } from '../../../lib/supabase'
import { pendientes } from '../supportTickets'
import { useContador } from '../useContador'
import styles from './HoySection.module.css'

dayjs.extend(relativeTime)
dayjs.locale('es')

// Tarjetas de la columna derecha de Hoy: Save the Dates y reportes. (La
// bandeja de mensajes salió de Hoy: vive en Buzón.)

const mapaPor = (lista, llave) => new Map((lista ?? []).map(item => [item[llave], item]))

// ------------------------------------------------------- Save the Date ---

// Cada ventana se parte en tramos para la mini gráfica: diarios en 7 días,
// de 3 días en 30 y semanales en 90.
const VENTANAS = [
    { dias: 7, tramo: 1 },
    { dias: 30, tramo: 3 },
    { dias: 90, tramo: 7 },
]

const ETIQUETA_TRAMO = { 1: 'por día', 3: 'cada 3 días', 7: 'por semana' }

// Barras por tramo: la cifra encima de cada una; tramo vacío, raya crema.
const Barras = ({ valores }) => {
    const tope = Math.max(...valores, 1)
    return (
        <div className={styles.stdBarras}>
            {valores.map((v, i) => (
                <div key={i} className={`${styles.stdBarra} ${v ? '' : styles.stdBarraVacia}`} title={`${v} ${v === 1 ? 'creado' : 'creados'}`}>
                    {v > 0 && <b>{v}</b>}
                    <span style={{ height: `${(v / tope) * 78}%` }} />
                </div>
            ))}
        </div>
    )
}

export const SaveTheDateCard = ({ invitations, profiles, esPrueba }) => {
    const [filas, setFilas] = useState(null)
    const [dias, setDias] = useState(30)

    useEffect(() => {
        let vivo = true
        supabase
            .from('save_the_dates')
            .select('id, invitation_id, created_at')
            .order('created_at', { ascending: false })
            .then(({ data, error }) => {
                if (!vivo) return
                if (error) console.error('Error al cargar Save the Dates:', error)
                setFilas(data ?? [])
            })
        return () => { vivo = false }
    }, [])

    const invitationsById = useMemo(() => mapaPor(invitations, 'id'), [invitations])
    const perfilesPorId = useMemo(() => mapaPor(profiles, 'user_id'), [profiles])

    // Cada Save the Date con quién lo hizo (el dueño de su evento). Las cuentas
    // internas quedan fuera: el producto es nuevo y las pruebas lo inflan.
    const { reales, pruebas } = useMemo(() => {
        const todos = (filas ?? []).map(std => {
            const invitacion = invitationsById.get(std.invitation_id)
            const perfil = perfilesPorId.get(invitacion?.user_id)
            return {
                ...std,
                prueba: invitacion ? esPrueba(invitacion) : false,
                duenioId: invitacion?.user_id ?? null,
                nombre: perfil?.full_name || invitacion?.user_email || perfil?.user_email || 'Sin dueño',
            }
        })
        const lista = todos.filter(s => !s.prueba)
        return { reales: lista, pruebas: todos.length - lista.length }
    }, [filas, invitationsById, perfilesPorId, esPrueba])

    const { tramo } = VENTANAS.find(v => v.dias === dias)
    const desde = dayjs().startOf('day').subtract(dias - 1, 'day')
    const enVentana = reales.filter(s => !dayjs(s.created_at).isBefore(desde))
    const personas = new Set(enVentana.map(s => s.duenioId).filter(Boolean)).size

    const serie = useMemo(() => {
        const tramos = Array(Math.ceil(dias / tramo)).fill(0)
        enVentana.forEach(s => {
            const i = Math.floor(dayjs(s.created_at).diff(desde, 'day') / tramo)
            if (i >= 0 && i < tramos.length) tramos[i] += 1
        })
        return tramos
    }, [enVentana, dias, tramo, desde])

    const contados = useContador(enVentana.length)
    const ultimo = reales[0]

    return (
        <section className={`${styles.card} ${styles.std}`}>
            <header className={styles.cardHead}>
                <h2 className={styles.label}>Save the Date</h2>
                <div className={styles.segmentado} role='radiogroup' aria-label='Ventana de días'>
                    {VENTANAS.map(({ dias: valor }) => (
                        <button
                            key={valor}
                            type='button'
                            role='radio'
                            aria-checked={dias === valor}
                            className={dias === valor ? styles.segmentoActivo : ''}
                            onClick={() => setDias(valor)}
                        >
                            {valor} d
                        </button>
                    ))}
                </div>
            </header>

            <div className={styles.stdCifra}>
                <span className={styles.cifra}>{Math.round(contados)}</span>
                <span>
                    {enVentana.length === 1 ? 'creado' : 'creados'}
                    <br />por {personas} {personas === 1 ? 'persona' : 'personas'}
                </span>
            </div>

            <div className={styles.stdGrafica}>
                <Barras valores={serie} />
                <div className={styles.stdEje}>
                    <span>{desde.format('D MMM')}</span>
                    <span>{ETIQUETA_TRAMO[tramo]}</span>
                    <span>hoy</span>
                </div>
            </div>

            <p className={styles.stdPie}>
                {filas === null ? 'Cargando…' : (
                    <>
                        {reales.length} en total
                        {ultimo && ` · Último: ${ultimo.nombre}, ${dayjs(ultimo.created_at).format('D MMM')}`}
                        {pruebas > 0 && ` · excluye ${pruebas} de prueba`}
                    </>
                )}
            </p>
        </section>
    )
}

// ------------------------------------------------------------ Reportes ---

export const ReportesCard = ({ tickets, onNavigate }) => {
    const abiertos = useMemo(
        () => pendientes(tickets).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
        [tickets],
    )
    const contados = useContador(abiertos.length)

    return (
        <section className={`${styles.card} ${styles.cardFila}`}>
            <h2 className={styles.label}>Reportes</h2>
            <span className={styles.cifra}>{Math.round(contados)}</span>
            {tickets === null ? null : abiertos.length === 0 ? (
                <span className={`${styles.pill} ${styles.pillVerde}`}><i /> todo en orden</span>
            ) : (
                <span className={`${styles.pill} ${styles.pillAmbar}`}>
                    <i /> sin resolver · {dayjs(abiertos[0].created_at).fromNow()}
                </span>
            )}
            <button type='button' className={`${styles.enlace} ${styles.alFinal}`} onClick={() => onNavigate('buzon', 'reportes')}>
                ver
            </button>
        </section>
    )
}
