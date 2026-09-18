/*
  Analítica de producto — Etapa 8: Lia.

  Qué le preguntan, qué le preguntan más y qué se sale de lo común.

  Todo sale de `ai_conversations` (una fila por mensaje, con `role` y
  `session_id`), `ai_agent_logs` (una por llamada al modelo, con costo) y
  `ai_daily_usage` (el consumo diario contra el límite gratuito).

  Dos advertencias sobre lo que se puede afirmar:

  · Las invitaciones de prueba dominan el volumen bruto —de 1,508 mensajes, 910
    son de una sola cuenta interna— así que todo aquí se filtra a eventos
    reales. Eso deja fuera casi todo el registro de herramientas, acciones y
    feedback, que hoy es prácticamente todo de prueba.

  · `ai_agent_logs`, `ai_daily_usage` y `ai_pending_actions` NO son legibles con
    la anon key: devuelven cero filas sin error, porque sus políticas de RLS no
    contemplan a `anon`. El panel lo detecta y cae al volumen de tokens de
    `ai_conversations`, que sí es legible. Si algún día se les da política de
    lectura, la tarjeta de costo se enciende sola.

  · Los chips que ofrece la UI se cuentan aparte de las preguntas escritas. Un
    clic en "Mis notificaciones" no es una duda; mezclarlos haría que el atajo
    más cómodo pareciera la pregunta más frecuente del producto.
*/

import { useEffect, useMemo, useRef, useState } from 'react'
import { Dropdown } from 'antd'
import { ChevronDown, X } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import {
    acumuladoDe, claveDeMes, esAtajoDeLia, nombreDeMes, temaDePregunta, tituloLimpio,
} from '../analiticaCalculos'
import { traerTodo } from '../analiticaDatos'
import { useTokens } from '../adminCharts'
import { useTipoDeCambio } from '../tipoDeCambio'
import { BarrasCategoria, BarrasConAcumulado, Rosca } from './AnaliticaPiezas'
import styles from './EventosAnalitica.module.css'

dayjs.locale('es')

const plural = (n, singular, pluralForma) => `${n} ${n === 1 ? singular : pluralForma}`
const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0)
const miles = (n) => new Intl.NumberFormat('es-MX').format(n)

const usd = (n) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
}).format(n)

const mxn = (n) => new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
}).format(n)

// ------------------------------------------------------------------ datos ---

const useLia = (invitacionesReales, mes) => {
    const [crudo, setCrudo] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelado = false

        Promise.all([
            traerTodo('ai_conversations', 'id,invitation_id,session_id,role,content,model_used,tokens_in,tokens_out,created_at'),
            traerTodo('ai_agent_logs', 'id,invitation_id,model,tool_called,cost_usd,success,created_at'),
            traerTodo('ai_daily_usage', 'invitation_id,usage_date,free_used,total_spend_usd', 'usage_date'),
        ])
            .then(([conversaciones, logs, uso]) => {
                if (!cancelado) setCrudo({ conversaciones, logs, uso })
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

        const mensajes = crudo.conversaciones
            .filter(c => porId.has(c.invitation_id) && delPeriodo(c.created_at))

        if (mensajes.length === 0) return { vacio: true, mesesDisponibles }

        const preguntas = mensajes.filter(c => c.role === 'user')

        // --- atajos contra preguntas escritas ---
        const atajos = preguntas.filter(p => esAtajoDeLia(p.content))
        const escritas = preguntas.filter(p => !esAtajoDeLia(p.content))

        // Se guarda la sesión de la primera vez que se hizo cada pregunta para
        // poder abrir esa conversación completa desde la lista.
        const contar = (mensajesDelGrupo) => {
            const cuenta = new Map()

            mensajesDelGrupo.forEach(mensaje => {
                const limpio = tituloLimpio(mensaje.content)
                if (!limpio) return

                const clave = limpio.toLowerCase()
                const previo = cuenta.get(clave)

                const momento = new Date(mensaje.created_at)
                // Se guarda la ocurrencia MÁS RECIENTE: si alguien repitió la
                // pregunta, la conversación que interesa abrir es la última.
                const esMasNueva = !previo || momento > previo.momento

                cuenta.set(clave, {
                    texto: previo?.texto ?? limpio,
                    total: (previo?.total ?? 0) + 1,
                    momento: esMasNueva ? momento : previo.momento,
                    sesion: esMasNueva ? mensaje.session_id : previo.sesion,
                    evento: esMasNueva
                        ? (porId.get(mensaje.invitation_id)?.name ?? 'sin nombre')
                        : previo.evento,
                })
            })

            return [...cuenta.values()]
        }

        // Los atajos se ordenan por uso; las preguntas escritas por novedad,
        // que es como se leen: lo último que preguntó alguien.
        const atajosUsados = contar(atajos).sort((a, b) => b.total - a.total)
        const escritasUnicas = contar(escritas).sort((a, b) => b.momento - a.momento)

        // Conversaciones completas por sesión, en orden, para el panel lateral.
        const porSesion = new Map()

        mensajes.forEach(m => {
            const hilo = porSesion.get(m.session_id) ?? []
            hilo.push(m)
            porSesion.set(m.session_id, hilo)
        })

        porSesion.forEach(hilo => hilo.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))

        // --- temas de lo escrito ---
        const temas = new Map()
        escritas.forEach(p => {
            const tema = temaDePregunta(p.content)
            const cubo = temas.get(tema) ?? { tema, total: 0 }
            cubo.total += 1
            temas.set(tema, cubo)
        })

        const porTema = [...temas.values()].sort((a, b) => {
            if (a.tema === 'Otros') return 1
            if (b.tema === 'Otros') return -1
            return b.total - a.total
        })

        // --- quién la usa ---
        const eventos = new Map()
        preguntas.forEach(p => {
            const evento = eventos.get(p.invitation_id) ?? {
                id: p.invitation_id,
                nombre: porId.get(p.invitation_id).name ?? 'sin nombre',
                preguntas: 0,
                sesiones: new Set(),
            }
            evento.preguntas += 1
            evento.sesiones.add(p.session_id)
            eventos.set(p.invitation_id, evento)
        })

        const porEvento = [...eventos.values()]
            .map(e => ({ ...e, sesiones: e.sesiones.size }))
            .sort((a, b) => b.preguntas - a.preguntas)

        // --- modelos y volumen ---
        // El costo en dólares vive en `ai_agent_logs`; si la RLS no lo deja
        // leer, `logs` llega vacío y se usa el modelo y los tokens que sí trae
        // cada mensaje de `ai_conversations`.
        const logs = crudo.logs.filter(l => porId.has(l.invitation_id) && delPeriodo(l.created_at))
        const hayLogs = logs.length > 0

        const modelos = new Map()

        if (hayLogs) {
            logs.forEach(l => {
                const clave = l.model ?? 'sin modelo'
                const cubo = modelos.get(clave) ?? { modelo: clave, llamadas: 0, usd: 0 }
                cubo.llamadas += 1
                cubo.usd += Number(l.cost_usd ?? 0)
                modelos.set(clave, cubo)
            })
        } else {
            mensajes.filter(m => m.role === 'assistant' && m.model_used).forEach(m => {
                const cubo = modelos.get(m.model_used) ?? { modelo: m.model_used, llamadas: 0, usd: 0 }
                cubo.llamadas += 1
                modelos.set(m.model_used, cubo)
            })
        }

        const tokens = mensajes.reduce((acc, m) => ({
            entrada: acc.entrada + Number(m.tokens_in ?? 0),
            salida: acc.salida + Number(m.tokens_out ?? 0),
        }), { entrada: 0, salida: 0 })

        const uso = crudo.uso.filter(u => porId.has(u.invitation_id)
            && (mes === 'todo' || String(u.usage_date).slice(0, 7) === mes))

        return {
            mesesDisponibles,
            invitacionesQueLaUsan: porEvento.length,
            invitaciones: invitacionesReales.length,
            preguntas: preguntas.length,
            sesiones: new Set(preguntas.map(p => p.session_id)).size,
            atajos: atajos.length,
            escritas: escritas.length,
            irrepetibles: escritasUnicas.filter(e => e.total === 1).length,
            atajosUsados,
            escritasUnicas,
            porTema,
            porEvento,
            porSesion,
            costo: {
                hayLogs,
                usd: logs.reduce((acc, l) => acc + Number(l.cost_usd ?? 0), 0),
                llamadas: hayLogs ? logs.length : mensajes.filter(m => m.role === 'assistant').length,
                fallidas: logs.filter(l => l.success === false).length,
                modelos: [...modelos.values()].sort((a, b) => b.llamadas - a.llamadas),
                tokens,
                consultasGratis: uso.reduce((acc, u) => acc + Number(u.free_used ?? 0), 0),
                diasConUso: new Set(uso.map(u => u.usage_date)).size,
            },
        }
    }, [crudo, error, invitacionesReales, mes])
}

// ----------------------------------------------------------------- panel ---

export const AnaliticaLia = ({ invitacionesReales, mes, onMesesDisponibles }) => {
    const datos = useLia(invitacionesReales, mes)
    const cambio = useTipoDeCambio()
    const tokens = useTokens()

    const [atajosAbiertos, setAtajosAbiertos] = useState(false)
    // Pregunta cuya conversación se está leyendo al lado de la lista.
    const [conversacion, setConversacion] = useState(null)
    // Tema elegido desde la tarjeta de temas; acota la lista de preguntas.
    const [temaFiltro, setTemaFiltro] = useState(null)

    const listaRef = useRef(null)

    const meses = datos.mesesDisponibles

    useEffect(() => {
        if (meses) onMesesDisponibles(meses)
    }, [meses, onMesesDisponibles])

    // Las preguntas que se listan: todas, o solo las del tema elegido.
    const preguntasVisibles = useMemo(() => {
        const todas = datos.escritasUnicas ?? []
        return temaFiltro ? todas.filter(p => temaDePregunta(p.texto) === temaFiltro) : todas
    }, [datos.escritasUnicas, temaFiltro])

    // La conversación más reciente se abre sola, y se reemplaza cuando cambia
    // el periodo o el tema: quedarse con una que ya no está en la lista sería
    // confuso.
    const masNueva = preguntasVisibles[0] ?? null

    useEffect(() => {
        setConversacion(masNueva)
    }, [masNueva])

    if (datos.cargando) return <div className={styles.empty}>Cargando conversaciones de Lia…</div>
    if (datos.error) return <div className={styles.empty}>No se pudo cargar: {datos.error}</div>

    if (datos.vacio) {
        return (
            <div className={styles.empty}>
                {mes === 'todo'
                    ? 'Todavía no hay conversaciones que analizar.'
                    : `Sin conversaciones en ${nombreDeMes(mes)}.`}
            </div>
        )
    }

    const { costo, porTema, porEvento, atajosUsados, escritasUnicas } = datos
    const hilo = conversacion ? (datos.porSesion.get(conversacion.sesion) ?? []) : []

    // Concentración: cuánto pesan los dos eventos de cabeza. Es el dato que
    // decide si lo que se ve describe al producto o a dos usuarios.
    const cabeza = porEvento.slice(0, 2)
    const preguntasDeLaCabeza = cabeza.reduce((acc, e) => acc + e.preguntas, 0)

    // `blocked` llega en la misma columna que el modelo, pero no lo es: es una
    // respuesta que no salió. Se cuenta aparte para no decir "4 modelos".
    const bloqueadas = costo.modelos.find(m => m.modelo === 'blocked')?.llamadas ?? 0
    const modelosReales = costo.modelos.filter(m => m.modelo !== 'blocked').length

    const totalTokens = costo.tokens.entrada + costo.tokens.salida
    const razonDeTokens = costo.tokens.salida > 0
        ? Math.round(costo.tokens.entrada / costo.tokens.salida)
        : 0

    // Cuántos temas hacen falta para cubrir tres cuartas partes de lo escrito.
    const temasParaTresCuartos = (() => {
        let corrido = 0
        for (const [i, tema] of porTema.entries()) {
            corrido += tema.total
            if (corrido / datos.escritas >= 0.75) return i + 1
        }
        return porTema.length
    })()

    // Rampa de un solo azul: los primeros en azul pleno, el resto en el tono
    // intermedio y el cajón en gris. El color ordena, no decora.
    const colorDeFila = (fila, i, destacados) => {
        if (fila.esCola) return tokens.grid
        return i < destacados ? tokens.azul : tokens.azulMedio
    }

    const filasDeTemas = porTema.map(t => ({ label: t.tema, total: t.total, esCola: t.tema === 'Otros' }))
    const acumuladoTemas = acumuladoDe(filasDeTemas, datos.escritas)


    return (
        <div className={styles.analitica}>
            <div className={styles.kpis}>
                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Eventos que usan Lia</span>
                    <span className={styles.kpiValue}>
                        {datos.invitacionesQueLaUsan}
                        <small> de {datos.invitaciones}</small>
                    </span>
                    <span className={styles.kpiBarra}>
                        <span
                            className={`${styles.kpiFill} ${styles.kpiFillInk}`}
                            style={{ width: `${pct(datos.invitacionesQueLaUsan, datos.invitaciones)}%` }}
                        />
                    </span>
                    <span className={styles.kpiFoot}>
                        {pct(datos.invitacionesQueLaUsan, datos.invitaciones)}% le ha preguntado algo
                    </span>
                </div>

                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Preguntas escritas a mano</span>
                    <span className={`${styles.kpiValue} ${styles.kpiValorAzul}`}>
                        {miles(datos.escritas)}
                        <small> {pct(datos.escritas, datos.preguntas)}%</small>
                    </span>
                    <span className={styles.kpiBarra}>
                        <span
                            className={`${styles.kpiFill} ${styles.kpiFillAzul}`}
                            style={{ width: `${pct(datos.escritas, datos.preguntas)}%` }}
                        />
                    </span>
                    <span className={styles.kpiFoot}>
                        las otras {miles(datos.atajos)} salen de un chip
                    </span>
                </div>

                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Concentración</span>
                    <span className={`${styles.kpiValue} ${styles.kpiValorAmbar}`}>
                        {pct(preguntasDeLaCabeza, datos.preguntas)}%
                        <small> {plural(cabeza.length, 'evento', 'eventos')}</small>
                    </span>
                    <span className={styles.kpiBarra}>
                        <span
                            className={`${styles.kpiFill} ${styles.kpiFillAmbar}`}
                            style={{ width: `${pct(preguntasDeLaCabeza, datos.preguntas)}%` }}
                        />
                    </span>
                    <span className={styles.kpiFoot}>
                        {cabeza.map(e => e.nombre).join(' y ')} juntan {miles(preguntasDeLaCabeza)} de{' '}
                        {miles(datos.preguntas)}
                    </span>
                </div>

                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>
                        {costo.hayLogs ? 'Costo del modelo' : 'Tokens procesados'}
                    </span>
                    <span className={`${styles.kpiValue} ${styles.kpiValorMorado}`}>
                        {costo.hayLogs ? usd(costo.usd) : `${miles(Math.round(totalTokens / 1000))}k`}
                        {!costo.hayLogs && razonDeTokens > 0 && <small> {razonDeTokens}:1</small>}
                    </span>
                    <span className={styles.kpiBarra}>
                        <span
                            className={`${styles.kpiFill} ${styles.kpiFillMorado}`}
                            style={{ width: `${pct(costo.tokens.entrada, totalTokens)}%` }}
                        />
                    </span>
                    <span className={styles.kpiFoot}>
                        {costo.hayLogs
                            ? `≈ ${mxn(costo.usd * cambio.valor)} · ${miles(costo.llamadas)} llamadas`
                            : `${pct(costo.tokens.entrada, totalTokens)}% es contexto de entrada, no respuesta`}
                    </span>
                </div>
            </div>

            <div className={`${styles.bento} ${styles.bentoPar}`}>
                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Cómo llega la pregunta</h2>
                            <p className={styles.cardSub}>
                                Las {miles(datos.preguntas)} preguntas: escritas a mano o disparadas por un chip
                            </p>
                        </div>
                    </header>

                    <Rosca
                        alto={210}
                        valor={`${pct(datos.escritas, datos.preguntas)}%`}
                        pie='escritas a mano'
                        segmentos={[
                            { label: 'El organizador la escribió', valor: datos.escritas, color: tokens.azul },
                            { label: 'Salió de un chip', valor: datos.atajos, color: tokens.azulBg },
                        ]}
                    />

                    <ul className={styles.saludLista}>
                        <li className={styles.saludItem}>
                            <span className={styles.punto} style={{ background: tokens.azul }} />
                            <span className={styles.saludNombre}>El organizador la escribió</span>
                            <span className={styles.saludValor}>{miles(datos.escritas)}</span>
                            <span className={styles.saludPct}>{pct(datos.escritas, datos.preguntas)}%</span>
                        </li>
                        <li className={styles.saludItem}>
                            <span className={styles.punto} style={{ background: tokens.azulBg }} />
                            <span className={styles.saludNombre}>Salió de un chip de la interfaz</span>
                            <span className={styles.saludValor}>{miles(datos.atajos)}</span>
                            <span className={styles.saludPct}>{pct(datos.atajos, datos.preguntas)}%</span>
                        </li>
                    </ul>

                    <footer className={styles.cardFoot}>
                        <Dropdown
                            trigger={['click']}
                            open={atajosAbiertos}
                            onOpenChange={setAtajosAbiertos}
                            placement='topLeft'
                            disabled={atajosUsados.length === 0}
                            popupRender={() => (
                                <div className={`${styles.listaPopup} ${styles.listaPopupAncha}`}>
                                    <div className={styles.listaHead}>
                                        Atajos usados · {atajosUsados.length} distintos
                                    </div>
                                    <ul className={styles.lista}>
                                        {atajosUsados.map(atajo => (
                                            <li className={styles.listaItemSimple} key={atajo.texto}>
                                                <span className={styles.listaNombre} title={atajo.texto}>
                                                    {atajo.texto}
                                                </span>
                                                <span className={styles.listaValor}>{atajo.total}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        >
                            <button type='button' className={styles.verTodas} aria-expanded={atajosAbiertos}>
                                Ver los {atajosUsados.length} atajos
                                <ChevronDown
                                    size={12}
                                    className={`${styles.chevron} ${atajosAbiertos ? styles.chevronOpen : ''}`}
                                />
                            </button>
                        </Dropdown>
                    </footer>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>De qué preguntan</h2>
                            <p className={styles.cardSub}>
                                Solo las {miles(datos.escritas)} escritas a mano · barras: preguntas ·
                                línea: acumulado
                            </p>
                        </div>
                    </header>

                    {porTema.length === 0 ? (
                        <div className={styles.vacio}>Nadie ha escrito una pregunta todavía.</div>
                    ) : (
                        <>
                            <div className={styles.titular}>
                                <span className={`${styles.titularValor} ${styles.titularAzul}`}>
                                    {pct(porTema[0].total, datos.escritas)}%
                                </span>
                                <span className={styles.titularTexto}>
                                    de todo lo que escriben es sobre{' '}
                                    {porTema[0].tema.toLowerCase()} · {temasParaTresCuartos} temas
                                    cubren el 75%
                                </span>
                            </div>

                            {/* Clic en una barra acota la lista de abajo, que es
                                donde se leen las conversaciones. */}
                            <BarrasConAcumulado
                                horizontal
                                histograma={filasDeTemas}
                                acumulado={acumuladoTemas}
                                unidad='preguntas'
                                colores={filasDeTemas.map((fila, i) => colorDeFila(fila, i, 4))}
                                onSeleccion={(tema) => {
                                    setTemaFiltro(actual => (actual === tema ? null : tema))
                                    listaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                }}
                            />
                        </>
                    )}

                    <footer className={styles.cardFoot}>
                        Haz clic en un tema para ver sus preguntas y leer la conversación. Los temas salen
                        de una lista de patrones mantenida a mano: los textos son libres y la misma duda
                        llega escrita de mil formas, así que "Otros" es el margen de error.
                    </footer>
                </section>

                <section className={`${styles.card} ${styles.cardAncha}`}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>
                                {costo.hayLogs ? 'Modelos y costo' : 'Modelos y tokens'}
                            </h2>
                            <p className={styles.cardSub}>
                                {costo.hayLogs
                                    ? `${miles(costo.consultasGratis)} consultas gratis usadas en ${plural(costo.diasConUso, 'día', 'días')}`
                                    : `${miles(costo.llamadas)} respuestas repartidas entre ${plural(modelosReales, 'modelo', 'modelos')}${bloqueadas > 0 ? ` · ${bloqueadas} ${bloqueadas === 1 ? 'quedó bloqueada' : 'quedaron bloqueadas'}` : ''}`}
                            </p>
                        </div>
                    </header>

                    <BarrasCategoria
                        alto={34 + costo.modelos.length * 36}
                        filas={costo.modelos.map((modelo, i) => ({
                            nombre: modelo.modelo,
                            valor: modelo.llamadas,
                            // `blocked` no es un modelo: es una respuesta que no
                            // salió. En rojo para que no se lea como uno más.
                            color: modelo.modelo === 'blocked'
                                ? tokens.rojo
                                : (i === 0 ? tokens.azul : tokens.azulMedio),
                        }))}
                    />

                    <div className={styles.trio}>
                        <div className={styles.trioItem}>
                            <span className={styles.trioValor}>
                                {miles(Math.round(costo.tokens.entrada / Math.max(1, costo.llamadas)))}
                            </span>
                            <span className={styles.trioLabel}>tokens de entrada por respuesta</span>
                        </div>
                        <div className={styles.trioItem}>
                            <span className={styles.trioValor}>
                                {miles(Math.round(costo.tokens.salida / Math.max(1, costo.llamadas)))}
                            </span>
                            <span className={styles.trioLabel}>tokens de salida por respuesta</span>
                        </div>
                    </div>

                    <footer className={styles.cardFoot}>
                        {costo.hayLogs ? (
                            <>
                                {usd(costo.usd / costo.llamadas)} por llamada en promedio; ninguna de las{' '}
                                {miles(costo.llamadas)} falló.
                            </>
                        ) : (
                            <>
                                El costo en dólares vive en <code>ai_agent_logs</code>, que hoy devuelve cero
                                filas con la llave pública del panel: su RLS no contempla lectura anónima.
                                Con una política de lectura, esta tarjeta muestra el gasto real.
                            </>
                        )}
                    </footer>
                </section>

                <section className={`${styles.card} ${styles.cardAncha}`} ref={listaRef}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Lo que se sale de lo común</h2>
                            <p className={styles.cardSub}>
                                {temaFiltro
                                    ? `${preguntasVisibles.length} preguntas de "${temaFiltro}", de la más nueva a la más vieja`
                                    : `${escritasUnicas.length} preguntas escritas, de la más nueva a la más vieja · ${datos.irrepetibles} las hizo una sola persona`}
                            </p>
                        </div>
                        {temaFiltro && (
                            <button
                                type='button'
                                className={styles.filtroChip}
                                onClick={() => setTemaFiltro(null)}
                            >
                                {temaFiltro}
                                <X size={12} />
                            </button>
                        )}
                    </header>

                    {/* La tarjeta ocupa el ancho completo, así que la conversación
                        se lee al lado de la lista en vez de tapar el panel: la
                        mitad derecha estaba vacía. */}
                    <div className={styles.fueraDeLoComun}>
                        <ul className={styles.preguntas}>
                            {preguntasVisibles.map(pregunta => (
                                <li key={pregunta.texto}>
                                    <button
                                        type='button'
                                        className={`${styles.pregunta} ${conversacion?.texto === pregunta.texto ? styles.preguntaActiva : ''}`}
                                        onClick={() => setConversacion(pregunta)}
                                    >
                                        <span className={styles.preguntaTema}>
                                            {temaDePregunta(pregunta.texto)} · {pregunta.evento}
                                        </span>
                                        <span className={styles.preguntaTexto}>
                                            {pregunta.texto}
                                            {pregunta.total > 1 && (
                                                <b className={styles.preguntaRepetida}>×{pregunta.total}</b>
                                            )}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <div className={styles.conversacion}>
                            {conversacion ? (
                                <>
                                    <div className={styles.conversacionHead}>
                                        <span className={styles.conversacionTitulo}>
                                            {conversacion.evento}
                                        </span>
                                        <button
                                            type='button'
                                            className={styles.conversacionCerrar}
                                            onClick={() => setConversacion(null)}
                                        >
                                            Cerrar
                                        </button>
                                    </div>

                                    <div className={styles.hilo}>
                                        {hilo.map(mensaje => (
                                            <div
                                                className={`${styles.mensaje} ${mensaje.role === 'user' ? styles.mensajeUsuario : styles.mensajeLia}`}
                                                key={mensaje.id}
                                            >
                                                <span className={styles.mensajeMeta}>
                                                    {mensaje.role === 'user' ? 'Organizador' : 'Lia'}
                                                    {' · '}
                                                    {dayjs(mensaje.created_at).format('D MMM, HH:mm')}
                                                </span>
                                                <span className={styles.mensajeTexto}>{mensaje.content}</span>
                                            </div>
                                        ))}

                                        {hilo.length === 0 && (
                                            <div className={styles.vacio}>
                                                No se encontró el hilo de esta conversación.
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className={styles.conversacionVacia}>
                                    Elige una pregunta para leer la conversación completa.
                                </div>
                            )}
                        </div>
                    </div>

                </section>

            </div>

        </div>
    )
}
