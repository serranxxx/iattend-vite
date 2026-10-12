/*
  Analítica de producto — Lia (tablero 2z).

  Qué le preguntan a Lia y cómo responde, leído conversación por conversación.

  Todo sale de `ai_conversations` (una fila por mensaje, con `role`,
  `session_id` y `created_at`), `ai_agent_logs` (una por llamada al modelo, con
  costo) y `ai_daily_usage`. Las tres llegan por GET /api/admin/lia/datos,
  detrás de validarAdmin: no se leen con la anon key porque tendrían las
  conversaciones de todos los organizadores a la vista.

  Una conversación es `invitation_id` + `session_id`. La consulta ya trae el
  contenido, el autor y la hora de cada mensaje, así que el hilo completo se
  arma aquí sin pedir nada más al backend.

  Advertencias sobre lo que se puede afirmar:

  · Las invitaciones de prueba dominan el volumen bruto, así que todo se filtra
    a eventos reales (`invitacionesReales`).

  · Los chips que ofrece la UI de Lia se cuentan aparte de las preguntas
    escritas: un clic en "Mis notificaciones" no es una duda. Una conversación
    que solo tiene atajos queda bajo el tema "Atajos".

  · Si `ai_agent_logs` viene vacío para el periodo, el KPI de costo cae al
    volumen de tokens de `ai_conversations`.
*/

import { useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import {
    claveDeMes, esAtajoDeLia, nombreDeMes, temaDePregunta, tituloLimpio,
} from '../analiticaCalculos'
import { fetchDatosLiaAdmin } from '../catalogoAdminApi'
import { useTipoDeCambio } from '../tipoDeCambio'
import styles from './AnaliticaLia.module.css'

dayjs.locale('es')

const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0)
const miles = (n) => new Intl.NumberFormat('es-MX').format(n)

const usd = (n) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
}).format(n)

const mxn = (n) => new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
}).format(n)

// Tema de las conversaciones que solo tienen clics en chips.
const TEMA_ATAJOS = 'Atajos'

// Quién organiza el evento: el primer anfitrión capturado o, si no hay, el
// correo de la cuenta. Las invitaciones de un planner sin cliente no tienen
// ninguno de los dos.
const organizadorDe = (invitacion) => invitacion?.owners?.[0] || invitacion?.user_email || 'Organizador'

const inicial = (texto) => (tituloLimpio(texto).charAt(0) || '?').toUpperCase()

// ------------------------------------------------------------------ datos ---

const useLia = (invitacionesReales, mes) => {
    const [crudo, setCrudo] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelado = false

        fetchDatosLiaAdmin(['conversaciones', 'logs'])
            .then(({ conversaciones, logs }) => {
                if (!cancelado) setCrudo({ conversaciones, logs })
            })
            .catch(fallo => {
                console.error('Error al cargar la analítica de Lia:', fallo)
                if (!cancelado) setError(fallo.message)
            })

        return () => { cancelado = true }
    }, [])

    return useMemo(() => {
        if (error) return { error }
        if (!crudo) return { cargando: true }

        const mesesDisponibles = [...new Set(crudo.conversaciones.map(c => claveDeMes(new Date(c.created_at))))]
            .sort((a, b) => b.localeCompare(a))

        const porId = new Map(invitacionesReales.map(i => [i.id, i]))
        const delPeriodo = (fecha) => mes === 'todo' || claveDeMes(new Date(fecha)) === mes

        const reales = crudo.conversaciones.filter(c => porId.has(c.invitation_id))
        const mensajes = reales.filter(c => delPeriodo(c.created_at))

        if (mensajes.length === 0) return { vacio: true, mesesDisponibles }

        // --- KPIs: preguntas escritas y sus temas ---
        const preguntas = mensajes.filter(c => c.role === 'user')
        const escritas = preguntas.filter(p => !esAtajoDeLia(p.content))

        // Preguntas que solo hizo una persona una vez: el texto no se repite.
        const repeticiones = new Map()
        escritas.forEach(p => {
            const clave = tituloLimpio(p.content).toLowerCase()
            if (clave) repeticiones.set(clave, (repeticiones.get(clave) ?? 0) + 1)
        })
        const irrepetibles = [...repeticiones.values()].filter(n => n === 1).length

        const temas = new Map()
        escritas.forEach(p => {
            const tema = temaDePregunta(p.content)
            if (tema) temas.set(tema, (temas.get(tema) ?? 0) + 1)
        })

        const porTema = [...temas.entries()]
            .map(([tema, total]) => ({ tema, total }))
            .sort((a, b) => {
                if (a.tema === 'Otros') return 1
                if (b.tema === 'Otros') return -1
                return b.total - a.total
            })

        // Cuántos temas hacen falta para cubrir tres cuartas partes de lo escrito.
        const temasParaTresCuartos = (() => {
            let corrido = 0
            for (const [i, tema] of porTema.entries()) {
                corrido += tema.total
                if (corrido / escritas.length >= 0.75) return i + 1
            }
            return porTema.length
        })()

        // --- conversaciones ---
        // El hilo se arma con TODOS los mensajes de la sesión, no solo los del
        // mes: una conversación que empezó el 31 y siguió el 1 se lee entera.
        // Entra a la lista si alguno de sus mensajes cae en el periodo.
        const hilos = new Map()
        reales.forEach(m => {
            const clave = `${m.invitation_id}|${m.session_id}`
            const hilo = hilos.get(clave) ?? []
            hilo.push(m)
            hilos.set(clave, hilo)
        })

        const conversaciones = [...hilos.entries()]
            .filter(([, hilo]) => hilo.some(m => delPeriodo(m.created_at)))
            .map(([clave, hilo]) => {
                hilo.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

                const invitacion = porId.get(hilo[0].invitation_id)
                const delOrganizador = hilo.filter(m => m.role === 'user')
                const primeraEscrita = delOrganizador.find(m => !esAtajoDeLia(m.content))

                return {
                    clave,
                    hilo,
                    evento: invitacion?.name ?? 'sin nombre',
                    organizador: organizadorDe(invitacion),
                    tema: primeraEscrita ? (temaDePregunta(primeraEscrita.content) ?? 'Otros') : TEMA_ATAJOS,
                    // El primer mensaje del organizador es lo que se lee en la
                    // lista; si la sesión no tiene ninguno, el de Lia.
                    vistaPrevia: tituloLimpio((delOrganizador[0] ?? hilo[0]).content),
                    ultimo: new Date(hilo[hilo.length - 1].created_at),
                }
            })
            .sort((a, b) => b.ultimo - a.ultimo)

        // --- costo ---
        // El costo en dólares vive en `ai_agent_logs`; si llega vacío se cae al
        // volumen de tokens que trae cada mensaje de `ai_conversations`.
        const logs = crudo.logs.filter(l => porId.has(l.invitation_id) && delPeriodo(l.created_at))
        const hayLogs = logs.length > 0

        const tokens = mensajes.reduce((acc, m) => acc + Number(m.tokens_in ?? 0) + Number(m.tokens_out ?? 0), 0)

        return {
            mesesDisponibles,
            escritas: escritas.length,
            atajos: preguntas.length - escritas.length,
            irrepetibles,
            porTema,
            temasParaTresCuartos,
            conversaciones,
            costo: {
                hayLogs,
                usd: logs.reduce((acc, l) => acc + Number(l.cost_usd ?? 0), 0),
                llamadas: hayLogs ? logs.length : mensajes.filter(m => m.role === 'assistant').length,
                tokens,
            },
        }
    }, [crudo, error, invitacionesReales, mes])
}

// ----------------------------------------------------------------- panel ---

export const AnaliticaLia = ({ invitacionesReales, mes, onMesesDisponibles }) => {
    const datos = useLia(invitacionesReales, mes)
    const cambio = useTipoDeCambio()

    // Tema elegido en los chips; null es "Todos".
    const [temaFiltro, setTemaFiltro] = useState(null)
    // Conversación que se lee en el panel del chat.
    const [elegida, setElegida] = useState(null)

    const chatRef = useRef(null)

    const meses = datos.mesesDisponibles

    useEffect(() => {
        if (meses) onMesesDisponibles(meses)
    }, [meses, onMesesDisponibles])

    const todas = datos.conversaciones ?? []

    // Chips: los temas presentes en la lista, del más frecuente al menos, con
    // "Otros" y "Atajos" al final porque no describen una duda concreta.
    const chips = useMemo(() => {
        const cuenta = new Map()
        todas.forEach(c => cuenta.set(c.tema, (cuenta.get(c.tema) ?? 0) + 1))

        const alFinal = (tema) => (tema === TEMA_ATAJOS ? 2 : tema === 'Otros' ? 1 : 0)

        return [...cuenta.entries()]
            .map(([tema, total]) => ({ tema, total }))
            .sort((a, b) => alFinal(a.tema) - alFinal(b.tema) || b.total - a.total)
    }, [todas])

    // Si el periodo cambia y el tema elegido ya no existe, se vuelve a "Todos".
    const filtro = chips.some(c => c.tema === temaFiltro) ? temaFiltro : null

    const visibles = useMemo(
        () => (filtro ? todas.filter(c => c.tema === filtro) : todas),
        [todas, filtro],
    )

    // Quedarse con una conversación que ya no está en la lista sería confuso:
    // en ese caso se abre la más reciente de lo visible.
    const seleccionada = visibles.find(c => c.clave === elegida) ?? visibles[0] ?? null

    // Cada conversación nueva se empieza a leer desde arriba.
    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = 0
    }, [seleccionada?.clave])

    if (datos.cargando) return <div className={styles.estado}>Cargando conversaciones de Lia…</div>
    if (datos.error) return <div className={styles.estado}>No se pudo cargar: {datos.error}</div>

    if (datos.vacio) {
        return (
            <div className={styles.estado}>
                {mes === 'todo'
                    ? 'Todavía no hay conversaciones que analizar.'
                    : `Sin conversaciones en ${nombreDeMes(mes)}.`}
            </div>
        )
    }

    const { costo, porTema } = datos
    const principal = porTema[0]

    const kpis = [
        {
            label: 'Preguntas escritas',
            valor: miles(datos.escritas),
            pie: `${miles(datos.irrepetibles)} las hizo una sola persona · ${miles(datos.atajos)} desde un chip`,
            tono: styles.kpiBlanco,
        },
        {
            label: 'Tema principal',
            valor: principal ? `${pct(principal.total, datos.escritas)}%` : '—',
            pie: principal ? principal.tema.toLowerCase() : 'nadie ha escrito todavía',
            tono: styles.kpiLila,
        },
        {
            label: 'Cobertura',
            valor: `${datos.temasParaTresCuartos} ${datos.temasParaTresCuartos === 1 ? 'tema' : 'temas'}`,
            pie: 'cubren el 75%',
            tono: styles.kpiVerde,
        },
        costo.hayLogs
            ? {
                label: 'Costo del modelo',
                valor: usd(costo.usd),
                pie: `≈ ${mxn(costo.usd * cambio.valor)} · ${miles(costo.llamadas)} llamadas`,
                tono: styles.kpiBlanco,
            }
            : {
                // Sin filas en `ai_agent_logs` no hay costo que sumar.
                label: 'Tokens procesados',
                valor: `${miles(Math.round(costo.tokens / 1000))}k`,
                pie: `${miles(costo.llamadas)} respuestas · sin registro de costo`,
                tono: styles.kpiBlanco,
            },
    ]

    const fechaCorta = (fecha) => {
        const d = dayjs(fecha)
        return d.format(d.year() === dayjs().year() ? 'D MMM' : 'D MMM YYYY')
    }

    return (
        <div className={styles.tablero}>
            <div className={styles.franja}>
                {kpis.map(k => (
                    <div className={styles.kpi} key={k.label}>
                        <span className={styles.kpiLabel}>{k.label}</span>
                        <div className={styles.kpiFila}>
                            <span className={`${styles.kpiValor} ${k.tono}`}>{k.valor}</span>
                            <span className={styles.kpiPie} title={k.pie}>{k.pie}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.cuerpo}>
                <section className={styles.card}>
                    <header className={styles.listaHead}>
                        <div className={styles.listaTitulo}>
                            <h2 className={styles.label}>Conversaciones con Lia</h2>
                            <span className={styles.cuenta}>{visibles.length} de {todas.length}</span>
                        </div>

                        <div className={styles.chips}>
                            <button
                                type='button'
                                className={`${styles.chip} ${filtro === null ? styles.chipActivo : ''}`}
                                aria-pressed={filtro === null}
                                onClick={() => setTemaFiltro(null)}
                            >
                                Todos <span className={styles.chipN}>{todas.length}</span>
                            </button>
                            {chips.map(c => (
                                <button
                                    type='button'
                                    key={c.tema}
                                    className={`${styles.chip} ${filtro === c.tema ? styles.chipActivo : ''}`}
                                    aria-pressed={filtro === c.tema}
                                    onClick={() => setTemaFiltro(actual => (actual === c.tema ? null : c.tema))}
                                >
                                    {c.tema} <span className={styles.chipN}>{c.total}</span>
                                </button>
                            ))}
                        </div>
                    </header>

                    <ul className={styles.lista}>
                        {visibles.map(c => {
                            const activa = c.clave === seleccionada?.clave
                            return (
                                <li key={c.clave}>
                                    <button
                                        type='button'
                                        className={`${styles.conv} ${activa ? styles.convActiva : ''}`}
                                        aria-current={activa || undefined}
                                        onClick={() => setElegida(c.clave)}
                                    >
                                        <span className={styles.avatar}>{inicial(c.organizador)}</span>
                                        <span className={styles.convCuerpo}>
                                            <span className={styles.convFila}>
                                                <b className={styles.convEvento}>{c.evento}</b>
                                                <span className={styles.badge}>{c.tema}</span>
                                            </span>
                                            <span className={styles.convPrevia}>{c.vistaPrevia}</span>
                                        </span>
                                        <span className={styles.convMeta}>
                                            <span>{fechaCorta(c.ultimo)}</span>
                                            <span>{c.hilo.length} {c.hilo.length === 1 ? 'mensaje' : 'mensajes'}</span>
                                        </span>
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                </section>

                <section className={styles.card}>
                    {seleccionada ? (
                        <>
                            <header className={styles.chatHead}>
                                <span className={`${styles.avatar} ${styles.avatarChat}`}>
                                    {inicial(seleccionada.organizador)}
                                </span>
                                <div className={styles.chatQuien}>
                                    <b className={styles.chatEvento}>{seleccionada.evento}</b>
                                    <span className={styles.chatSub}>
                                        {seleccionada.organizador} · {dayjs(seleccionada.hilo[0].created_at).format('D MMM YYYY')}
                                    </span>
                                </div>
                                <span className={styles.badge}>{seleccionada.tema}</span>
                            </header>

                            <div className={styles.hilo} ref={chatRef}>
                                {seleccionada.hilo.map(m => {
                                    const delOrganizador = m.role === 'user'
                                    return (
                                        <div
                                            key={m.id}
                                            className={`${styles.burbujaFila} ${delOrganizador ? styles.filaOrganizador : ''}`}
                                        >
                                            <div className={`${styles.burbuja} ${delOrganizador ? styles.burbujaOrganizador : styles.burbujaLia}`}>
                                                <span className={styles.burbujaMeta}>
                                                    {delOrganizador ? `Organizador · ${seleccionada.organizador}` : 'Lia'}
                                                    {' · '}
                                                    {dayjs(m.created_at).format('D MMM, HH:mm')}
                                                </span>
                                                <span className={styles.burbujaTexto}>{m.content}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    ) : (
                        <div className={styles.estadoChat}>No hay conversaciones con este tema.</div>
                    )}
                </section>
            </div>
        </div>
    )
}
