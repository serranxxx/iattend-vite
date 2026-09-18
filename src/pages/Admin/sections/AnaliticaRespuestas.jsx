/*
  Analítica de producto — Etapa 3: Respuestas.

  Confirmaciones, rechazos, cuánto tardan en responder y quién no responde.

  Dos límites del modelo que condicionan todo lo que se puede afirmar aquí:

  1. NO existe un registro de respuestas. `guests` solo guarda el estado actual
     más `last_update_date` y `last_action_by`, o sea el ÚLTIMO cambio y quién
     lo hizo. Si un invitado confirma y después el organizador le asigna mesa,
     el último cambio pasa a ser del admin y esa respuesta deja de poder
     atribuirse al invitado. Por eso "respondió el invitado" es un piso, no el
     número exacto, y la cola larga del histograma de tiempos mezcla respuestas
     tardías con ediciones posteriores.

  2. El invitado se une con su envío por `guest_id` Y `invitation_id`. Uniendo
     solo por id se cuelan 230 envíos dirigidos a invitados de side events cuyo
     id coincide con el de un invitado principal.
*/

import { useEffect, useMemo, useState } from 'react'
import { Dropdown } from 'antd'
import { ChevronDown } from 'lucide-react'
import {
    ESTADOS_CONFIRMA, ESTADOS_PENDIENTE, ESTADOS_RECHAZA, RANGOS_RESPUESTA,
    claveDeInvitado, claveDeMes, mediana, nombreDeMes,
} from '../analiticaCalculos'
import { traerTodo } from '../analiticaDatos'
import { useTokens } from '../adminCharts'
import { BarrasApiladas, BarrasCategoria, BarrasConAcumulado, Leyenda, Rosca } from './AnaliticaPiezas'
import styles from './EventosAnalitica.module.css'

const MS_POR_HORA = 3_600_000

// `invitations.plan` se guarda en minúsculas; la UI usa la grafía de la marca.
const ETIQUETA_PLAN = {
    pro: 'PRO',
    lite: 'Lite',
    paperless: 'Paperless',
}

const plural = (n, singular, pluralForma) => `${n} ${n === 1 ? singular : pluralForma}`
const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0)
const miles = (n) => new Intl.NumberFormat('es-MX').format(n)

const enDias = (horas) => (horas === undefined ? '—' : `${Math.round(horas / 24)} días`)

const enHoras = (horas) => {
    if (horas === null) return '—'
    if (horas < 1) return `${Math.round(horas * 60)} min`
    if (horas < 48) return `${Math.round(horas)} h`
    return `${Math.round(horas / 24)} días`
}

// ------------------------------------------------------------------ datos ---

const useRespuestas = (invitacionesReales, mes) => {
    const [crudo, setCrudo] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelado = false

        Promise.all([
            traerTodo('guests', 'id,invitation_id,name,state,last_action_by,created_at,last_update_date,reminder_count'),
            traerTodo('invitation_message_dispatches', 'guest_id,invitation_id,status,created_at'),
        ])
            .then(([invitados, envios]) => {
                if (!cancelado) setCrudo({ invitados, envios })
            })
            .catch(fallo => {
                console.error('Error al cargar las respuestas:', fallo)
                if (!cancelado) setError(fallo.message)
            })

        return () => { cancelado = true }
    }, [])

    return useMemo(() => {
        if (error) return { error }
        if (!crudo) return { cargando: true }

        const idsReales = new Set(invitacionesReales.map(i => i.id))
        const nombres = new Map(invitacionesReales.map(i => [i.id, i.name]))
        const planes = new Map(invitacionesReales.map(i => [i.id, String(i.plan ?? '').toLowerCase()]))

        const invitados = crudo.invitados.filter(g => idsReales.has(g.invitation_id))

        // Primer envío que no falló de cada invitado: es el momento en que la
        // invitación quedó en sus manos y desde ahí se mide la respuesta.
        const primerEnvio = new Map()

        crudo.envios
            .filter(e => idsReales.has(e.invitation_id) && e.status !== 'failed')
            .forEach(e => {
                const clave = claveDeInvitado(e.invitation_id, e.guest_id)
                const momento = new Date(e.created_at)
                const previo = primerEnvio.get(clave)
                if (!previo || momento < previo) primerEnvio.set(clave, momento)
            })

        // Meses disponibles según la fecha de envío, que es el único momento
        // fechado con precisión en toda la etapa.
        const mesesConEnvio = [...new Set([...primerEnvio.values()].map(claveDeMes))]
            .sort((a, b) => b.localeCompare(a))

        const enElMes = (fecha) => mes === 'todo' || claveDeMes(fecha) === mes

        const conInvitacion = invitados.filter(g => {
            const envio = primerEnvio.get(claveDeInvitado(g.invitation_id, g.id))
            return envio !== undefined && enElMes(envio)
        })

        if (conInvitacion.length === 0) {
            return { vacio: true, mesesConEnvio }
        }

        // --- embudo ---
        const confirmados = conInvitacion.filter(g => ESTADOS_CONFIRMA.has(g.state)).length
        const rechazados = conInvitacion.filter(g => ESTADOS_RECHAZA.has(g.state)).length
        const pendientes = conInvitacion.filter(g => ESTADOS_PENDIENTE.has(g.state))

        // --- quién movió el estado ---
        const porInvitado = conInvitacion.filter(g => g.last_action_by === 'guest')

        // El desglose por plan va sobre TODOS los invitados, no solo los que
        // recibieron WhatsApp: los 18 eventos con envíos son PRO sin excepción,
        // así que restringirlo a ellos dejaría a Lite fuera y no habría
        // comparación que hacer.
        // La pregunta útil no es cuántos estados movió cada quién, sino de las
        // CONFIRMACIONES cuántas registró el invitado y cuántas capturó el
        // organizador a mano: eso mide si el RSVP se usa o si es captura manual.
        // Esta tarjeta se filtra por el ALTA del invitado y no por el envío:
        // los eventos Lite no mandan WhatsApp, así que no tienen fecha de envío
        // que filtrar y desaparecerían del desglose en cuanto se eligiera un mes.
        const planDe = (g) => planes.get(g.invitation_id) || 'sin plan'
        const cubos = new Map()

        invitados.forEach(g => {
            if (!ESTADOS_CONFIRMA.has(g.state)) return
            if (mes !== 'todo' && claveDeMes(new Date(g.created_at)) !== mes) return

            const clave = planDe(g)
            const cubo = cubos.get(clave) ?? { plan: clave, confirmados: 0, porInvitado: 0 }
            cubo.confirmados += 1
            if (g.last_action_by === 'guest') cubo.porInvitado += 1
            cubos.set(clave, cubo)
        })

        const porPlan = [...cubos.values()].sort((a, b) => b.confirmados - a.confirmados)
        const totalConfirmados = porPlan.reduce((acc, c) => acc + c.confirmados, 0)
        const totalPorInvitado = porPlan.reduce((acc, c) => acc + c.porInvitado, 0)

        // --- tiempo de respuesta ---
        const tiempos = porInvitado
            .map(g => ({
                id: `${g.invitation_id}-${g.id}`,
                nombre: g.name ?? 'sin nombre',
                evento: nombres.get(g.invitation_id) ?? 'sin nombre',
                estado: g.state,
                horas: (new Date(g.last_update_date) - primerEnvio.get(claveDeInvitado(g.invitation_id, g.id))) / MS_POR_HORA,
            }))
            .filter(t => t.horas >= 0)
            .sort((a, b) => a.horas - b.horas)

        const horas = tiempos.map(t => t.horas)

        const histograma = RANGOS_RESPUESTA.map(({ label, hasta }, i) => {
            const desde = i === 0 ? 0 : RANGOS_RESPUESTA[i - 1].hasta
            return { label, total: horas.filter(h => h >= desde && h < hasta).length }
        })

        // El último corte no tiene techo: se listan enteros para poder ver hasta
        // dónde llegan y qué eventos los concentran.
        const HORAS_SEMANA = RANGOS_RESPUESTA[RANGOS_RESPUESTA.length - 2].hasta
        const colaLarga = tiempos.filter(t => t.horas >= HORAS_SEMANA).reverse()

        // --- recordatorios ---
        const conRecordatorio = conInvitacion.filter(g => Number(g.reminder_count) > 0)
        const recordatorioQueMovio = conRecordatorio.filter(g => !ESTADOS_PENDIENTE.has(g.state)).length

        // --- por evento ---
        const eventos = new Map()

        conInvitacion.forEach(g => {
            const evento = eventos.get(g.invitation_id) ?? {
                id: g.invitation_id,
                nombre: nombres.get(g.invitation_id) ?? 'sin nombre',
                total: 0,
                confirmados: 0,
                rechazados: 0,
                pendientes: 0,
            }
            evento.total += 1
            if (ESTADOS_CONFIRMA.has(g.state)) evento.confirmados += 1
            else if (ESTADOS_RECHAZA.has(g.state)) evento.rechazados += 1
            else evento.pendientes += 1
            eventos.set(g.invitation_id, evento)
        })

        const porEvento = [...eventos.values()]
            .map(e => ({ ...e, tasa: e.confirmados / e.total }))
            .sort((a, b) => b.tasa - a.tasa || b.total - a.total)

        // El destacado pide un mínimo de invitados: un evento con 1 invitado
        // confirmado da 100% y no dice nada. La lista completa sí los trae todos.
        const MINIMO_PARA_DESTACAR = 20
        const mejores = porEvento.filter(e => e.total >= MINIMO_PARA_DESTACAR).slice(0, 3)

        // Acumulado del histograma: la barra dice cuántos cayeron en esa
        // ventana y la línea cuántos habían respondido YA a esas alturas, que
        // es la lectura que importa ("a las 24 h ya respondió la mitad").
        let corridos = 0
        const acumulado = histograma.map(tramo => {
            corridos += tramo.total
            return pct(corridos, horas.length)
        })

        return {
            invitadosTotales: invitados.length,
            conInvitacion: conInvitacion.length,
            confirmados,
            rechazados,
            pendientes: pendientes.length,
            quienResponde: {
                porInvitado: totalPorInvitado,
                porOrganizador: totalConfirmados - totalPorInvitado,
                confirmados: totalConfirmados,
                porPlan,
            },
            tiempos: {
                muestra: horas.length,
                medianaHoras: mediana(horas),
                enLaPrimeraHora: horas.filter(h => h < 1).length,
                histograma,
                acumulado,
                colaLarga,
            },
            recordatorios: {
                enviados: conRecordatorio.length,
                movieron: recordatorioQueMovio,
                pendientesConRecordatorio: pendientes.filter(g => Number(g.reminder_count) > 0).length,
                sinRecordatorio: pendientes.filter(g => !Number(g.reminder_count)).length,
            },
            porEvento,
            mejores,
            mesesConEnvio,
        }
    }, [crudo, error, invitacionesReales, mes])
}

// ----------------------------------------------------------------- panel ---

// El periodo lo controla el contenedor, que dibuja el selector junto a las
// pestañas de etapa. Aquí solo se reportan los meses disponibles, que dependen
// de los datos y no se conocen hasta que cargan.
export const AnaliticaRespuestas = ({ invitacionesReales, mes, onMesesDisponibles }) => {
    const datos = useRespuestas(invitacionesReales, mes)
    const tokens = useTokens()
    const [eventosAbiertos, setEventosAbiertos] = useState(false)
    const [colaAbierta, setColaAbierta] = useState(false)

    const meses = datos.mesesConEnvio

    useEffect(() => {
        if (meses) onMesesDisponibles(meses)
    }, [meses, onMesesDisponibles])

    if (datos.cargando) return <div className={styles.empty}>Cargando respuestas…</div>
    if (datos.error) return <div className={styles.empty}>No se pudieron cargar las respuestas: {datos.error}</div>

    if (datos.vacio) {
        return (
            <div className={styles.empty}>
                {mes === 'todo'
                    ? 'Todavía no hay invitaciones enviadas que analizar.'
                    : `Sin invitaciones enviadas en ${nombreDeMes(mes)}.`}
            </div>
        )
    }

    const { quienResponde, tiempos, recordatorios, porEvento, mejores } = datos
    const base = datos.conInvitacion

    const tasaGeneral = pct(datos.confirmados, base)
    const brecha = mejores.length > 0 ? pct(mejores[0].confirmados, mejores[0].total) - tasaGeneral : 0

    // El promedio va al final y en gris: es la línea base contra la que se leen
    // los otros, no un evento más de la lista.
    const filasDeTasa = [
        ...mejores.map(evento => ({
            nombre: evento.nombre,
            valor: pct(evento.confirmados, evento.total),
            color: tokens.verde,
        })),
        {
            nombre: `Promedio ${porEvento.length} eventos`,
            valor: tasaGeneral,
            color: tokens.grid,
        },
    ]

    const maximoPlan = Math.max(...quienResponde.porPlan.map(c => c.confirmados), 0)

    return (
        <div className={styles.analitica}>
            <div className={styles.kpis}>
                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Recibieron invitación</span>
                    <span className={styles.kpiValue}>
                        {miles(base)}
                        <small> {pct(base, datos.invitadosTotales)}%</small>
                    </span>
                    <span className={styles.kpiBarra}>
                        <span
                            className={`${styles.kpiFill} ${styles.kpiFillInk}`}
                            style={{ width: `${pct(base, datos.invitadosTotales)}%` }}
                        />
                    </span>
                    <span className={styles.kpiFoot}>
                        de {miles(datos.invitadosTotales)} invitados dados de alta
                    </span>
                </div>

                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Confirmaciones</span>
                    <span className={`${styles.kpiValue} ${styles.kpiValorVerde}`}>
                        {miles(datos.confirmados)}
                        <small> {tasaGeneral}%</small>
                    </span>
                    <span className={styles.kpiBarra}>
                        <span
                            className={`${styles.kpiFill} ${styles.kpiFillVerde}`}
                            style={{ width: `${tasaGeneral}%` }}
                        />
                    </span>
                    <span className={styles.kpiFoot}>de los que recibieron invitación</span>
                </div>

                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Rechazos</span>
                    <span className={`${styles.kpiValue} ${styles.kpiValorRojo}`}>
                        {miles(datos.rechazados)}
                        <small> {pct(datos.rechazados, base)}%</small>
                    </span>
                    <span className={styles.kpiBarra}>
                        <span
                            className={`${styles.kpiFill} ${styles.kpiFillRojo}`}
                            style={{ width: `${pct(datos.rechazados, base)}%` }}
                        />
                    </span>
                    <span className={styles.kpiFoot}>
                        {pct(datos.rechazados, datos.confirmados + datos.rechazados)}% de quienes dieron una respuesta
                    </span>
                </div>

                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Sin responder</span>
                    <span className={`${styles.kpiValue} ${styles.kpiValorAmbar}`}>
                        {miles(datos.pendientes)}
                        <small> {pct(datos.pendientes, base)}%</small>
                    </span>
                    <span className={styles.kpiBarra}>
                        <span
                            className={`${styles.kpiFill} ${styles.kpiFillAmbar}`}
                            style={{ width: `${pct(datos.pendientes, base)}%` }}
                        />
                    </span>
                    <span className={styles.kpiFoot}>
                        solo {miles(recordatorios.pendientesConRecordatorio)} de ellos recibieron recordatorio
                    </span>
                </div>
            </div>

            {/* Columnas iguales: aquí ninguna de las cuatro tarjetas manda
                sobre las otras. */}
            <div className={`${styles.bento} ${styles.bentoPar}`}>
                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Embudo de respuesta</h2>
                            <p className={styles.cardSub}>
                                Sobre los {miles(base)} invitados que sí recibieron la invitación
                            </p>
                        </div>
                    </header>

                    <Rosca
                        alto={210}
                        valor={`${tasaGeneral}%`}
                        pie='confirmaron'
                        segmentos={[
                            { label: 'Confirmaron', valor: datos.confirmados, color: tokens.verde },
                            { label: 'Rechazaron', valor: datos.rechazados, color: tokens.rojo },
                            { label: 'Sin responder', valor: datos.pendientes, color: tokens.grid },
                        ]}
                    />

                    <ul className={styles.saludLista}>
                        <li className={styles.saludItem}>
                            <span className={`${styles.punto} ${styles.puntoVerde}`} />
                            <span className={styles.saludNombre}>Confirmaron</span>
                            <span className={styles.saludValor}>{miles(datos.confirmados)}</span>
                            <span className={styles.saludPct}>{tasaGeneral}%</span>
                        </li>
                        <li className={styles.saludItem}>
                            <span className={`${styles.punto} ${styles.puntoRojo}`} />
                            <span className={styles.saludNombre}>Rechazaron</span>
                            <span className={styles.saludValor}>{miles(datos.rechazados)}</span>
                            <span className={styles.saludPct}>{pct(datos.rechazados, base)}%</span>
                        </li>
                        <li className={styles.saludItem}>
                            <span className={`${styles.punto} ${styles.puntoGris}`} />
                            <span className={styles.saludNombre}>Siguen sin responder</span>
                            <span className={styles.saludValor}>{miles(datos.pendientes)}</span>
                            <span className={styles.saludPct}>{pct(datos.pendientes, base)}%</span>
                        </li>
                    </ul>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Tasa de confirmación por evento</h2>
                            <p className={styles.cardSub}>
                                Los {mejores.length} mejores contra el promedio de los {porEvento.length} eventos
                            </p>
                        </div>
                    </header>

                    <BarrasCategoria
                        filas={filasDeTasa}
                        alto={34 + filasDeTasa.length * 42}
                        maximo={100}
                        sufijo='%'
                        paso={25}
                    />

                    {/* Los tres números que explican la gráfica: dónde está la
                        línea base, cuánto la supera el mejor y sobre cuántos
                        eventos se está promediando. */}
                    <div className={styles.trio}>
                        <div className={styles.trioItem}>
                            <span className={styles.trioValor}>{tasaGeneral}%</span>
                            <span className={styles.trioLabel}>promedio general</span>
                        </div>
                        <div className={styles.trioItem}>
                            <span className={styles.trioValor}>{brecha} pts</span>
                            <span className={styles.trioLabel}>entre el mejor y el promedio</span>
                        </div>
                        <div className={styles.trioItem}>
                            <span className={styles.trioValor}>{porEvento.length}</span>
                            <span className={styles.trioLabel}>eventos con invitación enviada</span>
                        </div>
                    </div>

                    <footer className={styles.cardFoot}>
                        <Dropdown
                            trigger={['click']}
                            open={eventosAbiertos}
                            onOpenChange={setEventosAbiertos}
                            placement='bottomLeft'
                            popupRender={() => (
                                <div className={`${styles.listaPopup} ${styles.listaPopupAncha}`}>
                                    <div className={styles.listaHead}>
                                        Tasa de confirmación · {plural(porEvento.length, 'evento', 'eventos')}
                                    </div>
                                    <ul className={styles.lista}>
                                        {porEvento.map(evento => (
                                            <li className={styles.listaItemEvento} key={evento.id}>
                                                <span className={styles.listaNombre} title={evento.nombre}>
                                                    {evento.nombre}
                                                </span>
                                                <span className={styles.listaDetalle}>
                                                    {evento.confirmados}/{evento.total} · {evento.pendientes} sin responder
                                                </span>
                                                <span className={styles.listaValor}>
                                                    {pct(evento.confirmados, evento.total)}%
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        >
                            <button type='button' className={styles.verTodas} aria-expanded={eventosAbiertos}>
                                Ver los {porEvento.length} eventos
                                <ChevronDown
                                    size={12}
                                    className={`${styles.chevron} ${eventosAbiertos ? styles.chevronOpen : ''}`}
                                />
                            </button>
                        </Dropdown>
                    </footer>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Tiempo de respuesta</h2>
                            <p className={styles.cardSub}>
                                Barras: cuántos respondieron en cada ventana · Línea: acumulado
                            </p>
                        </div>
                    </header>

                    <div className={styles.titular}>
                        <span className={styles.titularValor}>{enHoras(tiempos.medianaHoras)}</span>
                        <span className={styles.titularTexto}>
                            de mediana · {miles(tiempos.enLaPrimeraHora)} de {miles(tiempos.muestra)}{' '}
                            ({pct(tiempos.enLaPrimeraHora, tiempos.muestra)}%) responden en la primera hora
                        </span>
                    </div>

                    <BarrasConAcumulado
                        histograma={tiempos.histograma}
                        acumulado={tiempos.acumulado}
                        color={tokens.verde}
                        colorSuave={tokens.verdeBg}
                        unidad='invitados'
                    />

                    <p className={styles.nota}>
                        La cola de "más de 7 días" está contaminada: la base guarda el último cambio del
                        invitado, no el momento exacto en que respondió.
                    </p>

                    <footer className={styles.cardFoot}>
                        <Dropdown
                            trigger={['click']}
                            open={colaAbierta}
                            onOpenChange={setColaAbierta}
                            placement='topLeft'
                            disabled={tiempos.colaLarga.length === 0}
                            popupRender={() => (
                                <div className={`${styles.listaPopup} ${styles.listaPopupAncha}`}>
                                    <div className={styles.listaHead}>
                                        {plural(tiempos.colaLarga.length, 'respuesta', 'respuestas')} de más de
                                        7 días · hasta {enDias(tiempos.colaLarga[0]?.horas)}
                                    </div>
                                    <ul className={styles.lista}>
                                        {tiempos.colaLarga.map(punto => (
                                            <li className={styles.listaItemEvento} key={punto.id}>
                                                <span className={styles.listaNombre} title={punto.nombre}>
                                                    {punto.nombre}
                                                </span>
                                                <span className={styles.listaDetalle}>
                                                    {punto.evento} · {punto.estado}
                                                </span>
                                                <span className={styles.listaValor}>{enDias(punto.horas)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        >
                            <button type='button' className={styles.verTodas} aria-expanded={colaAbierta}>
                                Ver las {tiempos.colaLarga.length} de más de 7 días
                                <ChevronDown
                                    size={12}
                                    className={`${styles.chevron} ${colaAbierta ? styles.chevronOpen : ''}`}
                                />
                            </button>
                        </Dropdown>
                    </footer>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Quién registra las confirmaciones</h2>
                            <p className={styles.cardSub}>
                                Las captura el invitado desde la invitación o el organizador a mano
                            </p>
                        </div>
                    </header>

                    <div className={styles.titular}>
                        <span className={`${styles.titularValor} ${styles.titularAzul}`}>
                            {pct(quienResponde.porInvitado, quienResponde.confirmados)}%
                        </span>
                        <span className={styles.titularTexto}>
                            de las {miles(quienResponde.confirmados)} confirmaciones las hizo el invitado;
                            el {pct(quienResponde.porOrganizador, quienResponde.confirmados)}% las capturó
                            el organizador
                        </span>
                    </div>

                    <BarrasApiladas
                        alto={34 + quienResponde.porPlan.length * 46}
                        maximo={maximoPlan}
                        labels={quienResponde.porPlan.map(c =>
                            `${ETIQUETA_PLAN[c.plan] ?? c.plan} · ${miles(c.confirmados)}`)}
                        series={[
                            {
                                label: 'El invitado',
                                color: tokens.azul,
                                valores: quienResponde.porPlan.map(c => c.porInvitado),
                            },
                            {
                                label: 'El organizador',
                                color: tokens.azulBg,
                                valores: quienResponde.porPlan.map(c => c.confirmados - c.porInvitado),
                            },
                        ]}
                    />

                    <Leyenda entradas={[
                        { label: 'El invitado', color: tokens.azul },
                        { label: 'El organizador', color: tokens.azulBg },
                    ]} />

                    <footer className={styles.cardFoot}>
                        Es un piso, no un dato exacto: solo se guarda quién hizo el último cambio de cada
                        invitado.
                    </footer>
                </section>

                <section className={`${styles.card} ${styles.cardAncha}`}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>
                                Los que no responden · y si el recordatorio sirve de algo
                            </h2>
                            <p className={styles.cardSub}>
                                El recordatorio se ha usado en {miles(recordatorios.enviados)} de{' '}
                                {miles(base)} invitados con invitación
                            </p>
                        </div>
                    </header>

                    <div className={styles.tresColumnas}>
                        <div className={styles.columna}>
                            <div className={styles.titular}>
                                <span className={`${styles.titularValor} ${styles.titularAmbar}`}>
                                    {miles(datos.pendientes)}
                                </span>
                                <span className={styles.titularTexto}>
                                    invitados recibieron su invitación y siguen sin confirmar ni rechazar
                                </span>
                            </div>

                            {/* Las tres filas descomponen el total: los 62 ya
                                salieron del grupo, y los otros dos suman los
                                pendientes que quedan. */}
                            <ul className={styles.desglose}>
                                <li className={styles.desgloseItem}>
                                    <span className={`${styles.punto} ${styles.puntoVerde}`} />
                                    <span className={styles.desgloseNombre}>Respondieron tras el recordatorio</span>
                                    <span className={styles.desgloseValor}>{miles(recordatorios.movieron)}</span>
                                </li>
                                <li className={styles.desgloseItem}>
                                    <span className={`${styles.punto} ${styles.puntoAmbar}`} />
                                    <span className={styles.desgloseNombre}>Con recordatorio y aún sin responder</span>
                                    <span className={styles.desgloseValor}>
                                        {miles(recordatorios.pendientesConRecordatorio)}
                                    </span>
                                </li>
                                <li className={`${styles.desgloseItem} ${styles.desgloseAccion}`}>
                                    <span className={`${styles.punto} ${styles.puntoNaranja}`} />
                                    <span className={styles.desgloseNombre}>Nunca recibieron un recordatorio</span>
                                    <span className={styles.desgloseValor}>
                                        {miles(recordatorios.sinRecordatorio)}
                                    </span>
                                </li>
                            </ul>
                        </div>

                        <div className={styles.columna}>
                            <span className={styles.columnaTitulo}>Cobertura del recordatorio</span>
                            <Rosca
                                alto={175}
                                valor={`${pct(recordatorios.enviados, base)}%`}
                                pie={`${miles(recordatorios.enviados)} de ${miles(base)}`}
                                segmentos={[
                                    { label: 'Con recordatorio', valor: recordatorios.enviados, color: tokens.naranja },
                                    { label: 'Sin recordatorio', valor: base - recordatorios.enviados, color: tokens.grid },
                                ]}
                            />
                        </div>

                        <div className={styles.columna}>
                            <span className={styles.columnaTitulo}>
                                Resultado de esos {miles(recordatorios.enviados)} recordatorios
                            </span>

                            <BarrasApiladas
                                alto={104}
                                maximo={recordatorios.enviados}
                                labels={['']}
                                series={[
                                    {
                                        label: 'Ya respondieron',
                                        color: tokens.verde,
                                        valores: [recordatorios.movieron],
                                    },
                                    {
                                        label: 'Siguen sin responder',
                                        color: tokens.naranja,
                                        valores: [recordatorios.enviados - recordatorios.movieron],
                                    },
                                ]}
                            />

                            <Leyenda entradas={[
                                { label: 'Ya respondieron', color: tokens.verde },
                                { label: 'Siguen sin responder', color: tokens.naranja },
                            ]} />

                            <p className={styles.nota}>
                                {Math.round(pct(recordatorios.movieron, recordatorios.enviados) / 10)} de cada 10
                                se movieron después del recordatorio. No es comparable con el resto: solo se
                                manda a invitados que ya iban tarde.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
