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

// Tarjetas de la columna derecha de Hoy: Save the Dates / Pops y reportes. (La
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

// Lee una tabla una sola vez al montar (Save the Dates, Pops).
const useFilas = (cargar, etiqueta) => {
    const [filas, setFilas] = useState(null)
    useEffect(() => {
        let vivo = true
        cargar().then(({ data, error }) => {
            if (!vivo) return
            if (error) console.error(`Error al cargar ${etiqueta}:`, error)
            setFilas(data ?? [])
        })
        return () => { vivo = false }
    }, [])
    return filas
}

// El último creado: el nombre del evento (o, si no tiene, el correo del dueño).
const quienDe = ({ evento, correo }) => String(evento ?? '').replace(/\s+/g, ' ').trim() || correo || 'Sin nombre'

// La tarjeta de "creados en los últimos N días": cifra, quién, barras por
// tramo y pie. `items` ya trae a cada uno con su dueño y si es de prueba; las
// pruebas quedan fuera porque los productos son nuevos y las pruebas los inflan.
const TarjetaCreados = ({ titulo, items, className = '', ...resto }) => {
    const [dias, setDias] = useState(30)

    const { reales, pruebas } = useMemo(() => {
        const lista = (items ?? []).filter(s => !s.prueba)
        return { reales: lista, pruebas: (items ?? []).length - lista.length }
    }, [items])

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
        <section className={`${styles.card} ${styles.std} ${className}`} {...resto}>
            <header className={styles.cardHead}>
                <h2 className={styles.label}>{titulo}</h2>
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
                {items === null ? 'Cargando…' : (
                    <>
                        {reales.length} en total
                        {ultimo && ` · Último: ${quienDe(ultimo)}, ${dayjs(ultimo.created_at).format('D MMM')}`}
                        {pruebas > 0 && ` · excluye ${pruebas} de prueba`}
                    </>
                )}
            </p>
        </section>
    )
}

// Save the Dates: el dueño es el de su invitación.
const useSaveTheDates = ({ invitations, profiles, esPrueba }) => {
    const filas = useFilas(() => supabase
        .from('save_the_dates')
        .select('id, invitation_id, created_at')
        .order('created_at', { ascending: false }), 'Save the Dates')

    const invitationsById = useMemo(() => mapaPor(invitations, 'id'), [invitations])
    const perfilesPorId = useMemo(() => mapaPor(profiles, 'user_id'), [profiles])

    return useMemo(() => filas && filas.map(std => {
        const invitacion = invitationsById.get(std.invitation_id)
        const perfil = perfilesPorId.get(invitacion?.user_id)
        return {
            ...std,
            prueba: invitacion ? esPrueba(invitacion) : false,
            duenioId: invitacion?.user_id ?? null,
            // El título de la portada ("Andrés & Julieta"); `name` casi siempre va vacío.
            evento: invitacion?.data?.cover?.title?.text?.value || invitacion?.name,
            correo: invitacion?.user_email || perfil?.user_email,
        }
    }), [filas, invitationsById, perfilesPorId, esPrueba])
}

// Pops = side events sin invitación. El dueño es su cliente o, si todavía es
// "por enviar", su planner (la misma regla de prueba que clasificarSide).
const usePops = ({ profiles, esPrueba }) => {
    const filas = useFilas(() => supabase
        .from('side_events')
        .select('id, name, user_id, planner_id, user_email, created_at')
        .is('invitation_id', null)
        .order('created_at', { ascending: false }), 'Pops')

    const perfilesPorId = useMemo(() => mapaPor(profiles, 'user_id'), [profiles])

    return useMemo(() => filas && filas.map(pop => {
        const duenioId = pop.user_id ?? pop.planner_id ?? null
        const perfil = perfilesPorId.get(duenioId)
        return {
            ...pop,
            prueba: esPrueba({ user_id: duenioId, user_email: pop.user_email }),
            duenioId,
            evento: pop.name,
            correo: pop.user_email || perfil?.user_email,
        }
    }), [filas, perfilesPorId, esPrueba])
}

// Save the Date y Pops apiladas en el mismo lugar: la de atrás asoma por
// arriba y al tocarla pasa al frente, para no ocupar más espacio en Hoy.
const PILA = [
    { clave: 'std', titulo: 'Save the Date' },
    { clave: 'pops', titulo: 'Pops' },
]

export const CreadosCard = (props) => {
    const [frente, setFrente] = useState('std')
    const items = { std: useSaveTheDates(props), pops: usePops(props) }
    const otra = PILA.find(t => t.clave !== frente)
    const cambiar = () => setFrente(otra.clave)

    return (
        <div className={styles.pila}>
            {PILA.map(({ clave, titulo }) => {
                const alFrente = clave === frente
                return (
                    <TarjetaCreados
                        key={clave}
                        titulo={titulo}
                        items={items[clave]}
                        className={alFrente ? styles.pilaFrente : styles.pilaAtras}
                        title={alFrente ? `Toca para ver ${otra.titulo}` : `Ver ${titulo}`}
                        aria-hidden={alFrente ? undefined : true}
                        // Tocar la tarjeta (fuera de los botones de días) la
                        // cambia por la de atrás.
                        onClick={(e) => { if (!e.target.closest('button')) cambiar() }}
                        {...(alFrente ? {
                            role: 'button',
                            tabIndex: 0,
                            'aria-label': `${titulo}. Enter para ver ${otra.titulo}`,
                            onKeyDown: (e) => {
                                if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                                    e.preventDefault()
                                    cambiar()
                                }
                            },
                        } : {})}
                    />
                )
            })}
        </div>
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
