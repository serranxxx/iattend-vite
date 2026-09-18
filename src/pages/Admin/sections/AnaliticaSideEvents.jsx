/*
  Analítica de producto — Etapa 5: Side events.

  Cuántos crean por evento, a cuánta gente invitan y de qué son.

  Dos cosas del modelo que definen la lectura:

  · `side_events.name` es opcional y llega vacío en buena parte de las filas, así
    que la pregunta "de qué son" solo se puede responder sobre las que sí tienen
    título. Se dice cuántas quedan fuera en vez de inventarles un nombre.

  · Los invitados de un side event viven en `side_events_guests`, una tabla
    aparte de `guests`, y se unen por `side_events_id`. Sus ids se solapan con
    los de `guests`, así que nunca se cruzan las dos tablas por id suelto.
*/

import { useEffect, useMemo, useState } from 'react'
import { Dropdown } from 'antd'
import { ChevronDown } from 'lucide-react'
import {
    ESTADOS_CONFIRMA, ESTADOS_RECHAZA, claveDeMes, nombreDeMes, temaDeSideEvent,
    tituloLimpio,
} from '../analiticaCalculos'
import { traerTodo } from '../analiticaDatos'
import { useTokens } from '../adminCharts'
import { BarrasApiladas, BarrasCategoria, Leyenda, Rosca } from './AnaliticaPiezas'
import styles from './EventosAnalitica.module.css'

// `invitations.plan` se guarda en minúsculas; la UI usa la grafía de la marca.
const ETIQUETA_PLAN = {
    pro: 'PRO',
    lite: 'Lite',
    paperless: 'Paperless',
}

const plural = (n, singular, pluralForma) => `${n} ${n === 1 ? singular : pluralForma}`
const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0)
const miles = (n) => new Intl.NumberFormat('es-MX').format(n)

const medianaDe = (numeros) => {
    if (!numeros.length) return 0
    const orden = [...numeros].sort((a, b) => a - b)
    const medio = Math.floor(orden.length / 2)
    return orden.length % 2 ? orden[medio] : Math.round((orden[medio - 1] + orden[medio]) / 2)
}

// ------------------------------------------------------------------ datos ---

const useSideEvents = (invitacionesReales, mes) => {
    const [crudo, setCrudo] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelado = false

        Promise.all([
            traerTodo('side_events', 'id,invitation_id,name,created_at'),
            traerTodo('side_events_guests', 'id,side_events_id,state'),
        ])
            .then(([sides, invitados]) => {
                if (!cancelado) setCrudo({ sides, invitados })
            })
            .catch(fallo => {
                console.error('Error al cargar los side events:', fallo)
                if (!cancelado) setError(fallo.message)
            })

        return () => { cancelado = true }
    }, [])

    return useMemo(() => {
        if (error) return { error }
        if (!crudo) return { cargando: true }

        // Mismo criterio que en Mesas: el periodo se mide por la creación de la
        // invitación, que es lo único que tienen también los eventos que nunca
        // crearon un side event — y sin ellos no hay adopción que medir.
        const mesesDisponibles = [...new Set(invitacionesReales.map(i => claveDeMes(new Date(i.created_at))))]
            .sort((a, b) => b.localeCompare(a))

        const enElPeriodo = invitacionesReales.filter(i =>
            mes === 'todo' || claveDeMes(new Date(i.created_at)) === mes)

        if (enElPeriodo.length === 0) return { vacio: true, mesesDisponibles }

        const nombres = new Map(enElPeriodo.map(i => [i.id, i.name ?? 'sin nombre']))
        const sides = crudo.sides.filter(s => nombres.has(s.invitation_id))

        const invitadosPorSide = new Map()
        const estados = { confirmados: 0, rechazados: 0, pendientes: 0 }
        const idsSide = new Set(sides.map(s => s.id))

        crudo.invitados.forEach(g => {
            if (!idsSide.has(g.side_events_id)) return

            invitadosPorSide.set(g.side_events_id, (invitadosPorSide.get(g.side_events_id) ?? 0) + 1)

            if (ESTADOS_CONFIRMA.has(g.state)) estados.confirmados += 1
            else if (ESTADOS_RECHAZA.has(g.state)) estados.rechazados += 1
            else estados.pendientes += 1
        })

        // --- por side event ---
        const lista = sides.map(s => ({
            id: s.id,
            titulo: tituloLimpio(s.name),
            evento: nombres.get(s.invitation_id),
            invitados: invitadosPorSide.get(s.id) ?? 0,
        }))

        const conInvitados = lista.filter(s => s.invitados > 0)

        // --- por evento ---
        const porEvento = new Map()

        sides.forEach(s => {
            const evento = porEvento.get(s.invitation_id) ?? {
                id: s.invitation_id,
                nombre: nombres.get(s.invitation_id),
                sides: 0,
                invitados: 0,
            }
            evento.sides += 1
            evento.invitados += invitadosPorSide.get(s.id) ?? 0
            porEvento.set(s.invitation_id, evento)
        })

        const eventos = [...porEvento.values()].sort((a, b) => b.sides - a.sides || b.invitados - a.invitados)

        // --- por plan ---
        // Dos preguntas distintas: cuántos eventos de cada plan llegan a crear
        // un side event, y cuántos crea el que los crea. Un plan puede tener
        // poca adopción y mucha intensidad, o al revés.
        //
        // Aquí la medida es el promedio y no la mediana: la mediana de los dos
        // planes es 1 y no distingue nada, que es justo lo que se quería
        // comparar.
        const cubosDePlan = new Map()

        enElPeriodo.forEach(invitacion => {
            const plan = String(invitacion.plan ?? '').toLowerCase() || 'sin plan'
            const cubo = cubosDePlan.get(plan) ?? { plan, eventos: 0, conSides: 0, sides: 0 }

            cubo.eventos += 1

            const conteo = porEvento.get(invitacion.id)
            if (conteo) {
                cubo.conSides += 1
                cubo.sides += conteo.sides
            }

            cubosDePlan.set(plan, cubo)
        })

        const porPlan = [...cubosDePlan.values()]
            .filter(cubo => cubo.sides > 0)
            .map(cubo => ({ ...cubo, porEvento: cubo.sides / cubo.conSides }))
            .sort((a, b) => b.sides - a.sides)

        const maximoPorEvento = Math.max(0, ...eventos.map(e => e.sides))

        const distribucion = [1, 2, 3].map(n => ({
            label: plural(n, 'side event', 'side events'),
            total: eventos.filter(e => (n === 3 ? e.sides >= 3 : e.sides === n)).length,
        }))
        distribucion[2].label = '3 o más'

        // Los que llegaron al tope. Con tres o cuatro nombres la nota dice algo;
        // con veinte sería una lista y se corta.
        const enElTope = eventos.filter(e => e.sides === maximoPorEvento).map(e => e.nombre)

        // --- títulos ---
        const conTitulo = lista.filter(s => s.titulo)
        const temas = new Map()

        conTitulo.forEach(s => {
            const tema = temaDeSideEvent(s.titulo)
            const cubo = temas.get(tema) ?? { tema, total: 0 }
            cubo.total += 1
            temas.set(tema, cubo)
        })

        // "Otros" al final aunque tenga mucho volumen: no es un tema, es el cajón.
        const porTema = [...temas.values()].sort((a, b) => {
            if (a.tema === 'Otros') return 1
            if (b.tema === 'Otros') return -1
            return b.total - a.total
        })

        const totalInvitados = [...invitadosPorSide.values()].reduce((a, b) => a + b, 0)

        return {
            mesesDisponibles,
            eventos: enElPeriodo.length,
            conSideEvents: eventos.length,
            sides: lista.length,
            medianaPorEvento: medianaDe(eventos.map(e => e.sides)),
            maximoPorEvento,
            enElTope,
            vacios: lista.length - conInvitados.length,
            invitados: totalInvitados,
            medianaInvitados: medianaDe(conInvitados.map(s => s.invitados)),
            maximoInvitados: Math.max(0, ...conInvitados.map(s => s.invitados)),
            estados,
            distribucion,
            porEvento: eventos,
            porPlan,
            porInvitados: [...lista].sort((a, b) => b.invitados - a.invitados),
            porTema,
            conTitulo: conTitulo.length,
            titulos: [...conTitulo].sort((a, b) => b.invitados - a.invitados),
        }
    }, [crudo, error, invitacionesReales, mes])
}

// ----------------------------------------------------------------- panel ---

export const AnaliticaSideEvents = ({ invitacionesReales, mes, onMesesDisponibles }) => {
    const datos = useSideEvents(invitacionesReales, mes)
    const tokens = useTokens()
    const [temasAbiertos, setTemasAbiertos] = useState(false)
    const [invitadosAbiertos, setInvitadosAbiertos] = useState(false)

    const meses = datos.mesesDisponibles

    useEffect(() => {
        if (meses) onMesesDisponibles(meses)
    }, [meses, onMesesDisponibles])

    if (datos.cargando) return <div className={styles.empty}>Cargando side events…</div>
    if (datos.error) return <div className={styles.empty}>No se pudieron cargar los side events: {datos.error}</div>

    if (datos.vacio) {
        return (
            <div className={styles.empty}>
                {mes === 'todo'
                    ? 'Todavía no hay eventos que analizar.'
                    : `Sin invitaciones creadas en ${nombreDeMes(mes)}.`}
            </div>
        )
    }

    const { estados, porInvitados, porTema, distribucion, porPlan } = datos
    const respondieron = estados.confirmados + estados.rechazados

    const soloUno = distribucion[0].total
    const conInvitados = datos.sides - datos.vacios
    const tresPrimerosTemas = porTema.filter(t => t.tema !== 'Otros').slice(0, 3)
    const cubiertosPorLosTres = tresPrimerosTemas.reduce((acc, t) => acc + t.total, 0)
    // "a, b y c": la coma seca antes del último suena a lista de inventario y
    // esta frase se lee como frase.
    const nombresDeLosTres = tresPrimerosTemas
        .map((t, i) => (i === 0 ? t.tema : t.tema.toLowerCase()))
        .join(', ')
        .replace(/, ([^,]*)$/, ' y $1')

    // Cuántos side events tiene cada evento. El tope se etiqueta como tal
    // porque nadie lo ha pasado: es un dato, no una casualidad del corte.
    const filasDeDistribucion = distribucion.map((tramo, i) => ({
        ...tramo,
        label: i === 2 && datos.maximoPorEvento === 3
            ? '3 side events (el máximo)'
            : tramo.label,
    }))

    // Los tres temas de cabeza van en azul pleno y el resto en azul claro: la
    // pregunta de la tarjeta es si hay un puñado de plantillas que cubran casi
    // todo, y el color es el que contesta. "Otros" en gris porque no es un tema.
    const filasDeTemas = porTema.map((tema, i) => ({
        nombre: tema.tema,
        valor: tema.total,
        color: tema.tema === 'Otros' ? tokens.grid : (i < 3 ? tokens.azul : tokens.azulMedio),
    }))

    const filasMasGrandes = porInvitados.slice(0, 6).map(side => ({
        nombre: side.titulo || side.evento,
        valor: side.invitados,
        color: tokens.azul,
    }))

    return (
        <div className={styles.analitica}>
            <div className={styles.kpis}>
                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Eventos con side events</span>
                    <span className={styles.kpiValue}>
                        {datos.conSideEvents}
                        <small> de {datos.eventos}</small>
                    </span>
                    <span className={styles.kpiBarra}>
                        <span
                            className={`${styles.kpiFill} ${styles.kpiFillInk}`}
                            style={{ width: `${pct(datos.conSideEvents, datos.eventos)}%` }}
                        />
                    </span>
                    <span className={styles.kpiFoot}>
                        {pct(datos.conSideEvents, datos.eventos)}% creó al menos uno
                    </span>
                </div>

                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Side events creados</span>
                    <span className={`${styles.kpiValue} ${styles.kpiValorAzul}`}>{datos.sides}</span>
                    {/* La barra mide la mediana contra el máximo, que es la
                        proporción de la que habla el pie. El 39 no la puede
                        llenar: es un total y no es parte de nada. */}
                    <span className={styles.kpiBarra}>
                        <span
                            className={`${styles.kpiFill} ${styles.kpiFillAzul}`}
                            style={{ width: `${pct(datos.medianaPorEvento, datos.maximoPorEvento)}%` }}
                        />
                    </span>
                    <span className={styles.kpiFoot}>
                        mediana de {datos.medianaPorEvento} por evento · el mayor creó{' '}
                        {datos.maximoPorEvento}
                    </span>
                </div>

                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Invitados en side events</span>
                    <span className={`${styles.kpiValue} ${styles.kpiValorVerde}`}>
                        {miles(datos.invitados)}
                        <small> {pct(estados.confirmados, datos.invitados)}% confirmó</small>
                    </span>
                    <span className={styles.kpiBarra}>
                        <span
                            className={`${styles.kpiFill} ${styles.kpiFillVerde}`}
                            style={{ width: `${pct(estados.confirmados, datos.invitados)}%` }}
                        />
                    </span>
                    <span className={styles.kpiFoot}>
                        mediana de {datos.medianaInvitados} por side event · el mayor juntó{' '}
                        {miles(datos.maximoInvitados)}
                    </span>
                </div>

                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Sin un solo invitado</span>
                    <span className={`${styles.kpiValue} ${styles.kpiValorAmbar}`}>
                        {datos.vacios}
                        <small> de {datos.sides}</small>
                    </span>
                    <span className={styles.kpiBarra}>
                        <span
                            className={`${styles.kpiFill} ${styles.kpiFillAmbar}`}
                            style={{ width: `${pct(datos.vacios, datos.sides)}%` }}
                        />
                    </span>
                    <span className={styles.kpiFoot}>
                        {pct(datos.vacios, datos.sides)}% se creó y nunca se llenó
                    </span>
                </div>
            </div>

            <div className={`${styles.bento} ${styles.bentoPar}`}>
                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Cuántos crean por evento</h2>
                            <p className={styles.cardSub}>
                                Solo los {datos.conSideEvents} eventos que crearon al menos uno
                            </p>
                        </div>
                    </header>

                    <Rosca
                        alto={210}
                        valor={`${pct(soloUno, datos.conSideEvents)}%`}
                        pie='se queda con uno'
                        segmentos={filasDeDistribucion.map((tramo, i) => ({
                            label: tramo.label,
                            valor: tramo.total,
                            color: [tokens.azul, tokens.azulMedio, tokens.azulBg][i],
                        }))}
                    />

                    <ul className={styles.saludLista}>
                        {filasDeDistribucion.map((tramo, i) => (
                            <li className={styles.saludItem} key={tramo.label}>
                                <span
                                    className={styles.punto}
                                    style={{ background: [tokens.azul, tokens.azulMedio, tokens.azulBg][i] }}
                                />
                                <span className={styles.saludNombre}>{tramo.label}</span>
                                <span className={styles.saludValor}>{tramo.total}</span>
                                <span className={styles.saludPct}>
                                    {pct(tramo.total, datos.conSideEvents)}%
                                </span>
                            </li>
                        ))}
                    </ul>

                    {porPlan.length > 1 && (
                        <>
                            <span className={styles.columnaTitulo}>
                                Side events por evento, según el plan
                            </span>

                            <ul className={styles.desglose}>
                                {porPlan.map(cubo => (
                                    <li
                                        className={`${styles.desgloseItem} ${styles.desgloseItemPlan}`}
                                        key={cubo.plan}
                                    >
                                        <span className={styles.desgloseNombre}>
                                            {ETIQUETA_PLAN[cubo.plan] ?? cubo.plan}
                                        </span>
                                        <span className={styles.desgloseDetalle}>
                                            {cubo.sides} en {cubo.conSides} de{' '}
                                            {plural(cubo.eventos, 'evento', 'eventos')}
                                        </span>
                                        <span className={styles.desgloseValor}>
                                            {cubo.porEvento.toFixed(1)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    <footer className={styles.cardFoot}>
                        Nadie ha pasado de {datos.maximoPorEvento} side events en un mismo evento:{' '}
                        {datos.enElTope.join(', ')}{' '}
                        {datos.enElTope.length === 1 ? 'es el único que llegó' : 'son los que llegaron'} al tope.
                    </footer>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>De qué son</h2>
                            <p className={styles.cardSub}>
                                Agrupados por tema · {datos.conTitulo} de los {datos.sides} tienen título
                            </p>
                        </div>
                    </header>

                    {datos.conTitulo === 0 ? (
                        <div className={styles.vacio}>Ningún side event del periodo tiene título.</div>
                    ) : (
                        <BarrasCategoria
                            filas={filasDeTemas}
                            alto={34 + filasDeTemas.length * 38}
                            paso={1}
                        />
                    )}

                    {tresPrimerosTemas.length === 3 && (
                        <p className={styles.nota}>
                            {nombresDeLosTres} concentran {cubiertosPorLosTres} de los{' '}
                            {datos.conTitulo} títulos: tres plantillas cubrirían casi todo el uso real.
                        </p>
                    )}

                    <footer className={styles.cardFoot}>
                        <Dropdown
                            trigger={['click']}
                            open={temasAbiertos}
                            onOpenChange={setTemasAbiertos}
                            placement='bottomLeft'
                            disabled={datos.conTitulo === 0}
                            popupRender={() => (
                                <div className={`${styles.listaPopup} ${styles.listaPopupAncha}`}>
                                    <div className={styles.listaHead}>
                                        Títulos tal como se escribieron · {datos.conTitulo}
                                    </div>
                                    <ul className={styles.lista}>
                                        {datos.titulos.map(side => (
                                            <li className={styles.listaItemEvento} key={side.id}>
                                                <span className={styles.listaNombre} title={side.titulo}>
                                                    {side.titulo}
                                                </span>
                                                <span className={styles.listaDetalle}>{side.evento}</span>
                                                <span className={styles.listaValor}>{side.invitados}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        >
                            <button type='button' className={styles.verTodas} aria-expanded={temasAbiertos}>
                                Ver los {datos.conTitulo} títulos
                                <ChevronDown
                                    size={12}
                                    className={`${styles.chevron} ${temasAbiertos ? styles.chevronOpen : ''}`}
                                />
                            </button>
                        </Dropdown>
                    </footer>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Invitados por side event</h2>
                            <p className={styles.cardSub}>
                                Los {datos.sides} side events se parten en dos mundos
                            </p>
                        </div>
                    </header>

                    <div className={`${styles.titular} ${styles.titularAviso}`}>
                        <span className={`${styles.titularValor} ${styles.titularAmbar}`}>
                            {datos.vacios}
                        </span>
                        <span className={styles.titularTexto}>
                            de {datos.sides} se crearon y nunca recibieron un invitado · los otros{' '}
                            {conInvitados} concentran los {miles(datos.invitados)}
                        </span>
                    </div>

                    <BarrasApiladas
                        alto={88}
                        maximo={datos.sides}
                        labels={['']}
                        series={[
                            { label: 'Con invitados', color: tokens.verde, valores: [conInvitados] },
                            { label: 'Vacíos', color: tokens.naranja, valores: [datos.vacios] },
                        ]}
                    />

                    <Leyenda entradas={[
                        { label: 'Con invitados', color: tokens.verde },
                        { label: 'Vacíos', color: tokens.naranja },
                    ]} />

                    <span className={styles.columnaTitulo}>Los {filasMasGrandes.length} más grandes</span>

                    <BarrasCategoria
                        filas={filasMasGrandes}
                        alto={34 + filasMasGrandes.length * 38}
                        maximo={datos.maximoInvitados}
                    />

                    <footer className={styles.cardFoot}>
                        <Dropdown
                            trigger={['click']}
                            open={invitadosAbiertos}
                            onOpenChange={setInvitadosAbiertos}
                            placement='topLeft'
                            popupRender={() => (
                                <div className={`${styles.listaPopup} ${styles.listaPopupAncha}`}>
                                    <div className={styles.listaHead}>
                                        Invitados por side event · {datos.sides} en total
                                    </div>
                                    <ul className={styles.lista}>
                                        {porInvitados.map(side => (
                                            <li className={styles.listaItemEvento} key={side.id}>
                                                <span
                                                    className={styles.listaNombre}
                                                    title={side.titulo || 'sin título'}
                                                >
                                                    {side.titulo || 'sin título'}
                                                </span>
                                                <span className={styles.listaDetalle}>{side.evento}</span>
                                                <span className={styles.listaValor}>{side.invitados}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        >
                            <button type='button' className={styles.verTodas} aria-expanded={invitadosAbiertos}>
                                Ver los {datos.sides} side events
                                <ChevronDown
                                    size={12}
                                    className={`${styles.chevron} ${invitadosAbiertos ? styles.chevronOpen : ''}`}
                                />
                            </button>
                        </Dropdown>
                    </footer>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Respuesta en los side events</h2>
                            <p className={styles.cardSub}>
                                Estado de los {miles(datos.invitados)} invitados
                            </p>
                        </div>
                    </header>

                    <Rosca
                        alto={210}
                        valor={`${pct(estados.confirmados, datos.invitados)}%`}
                        pie='confirmaron'
                        segmentos={[
                            { label: 'Confirmaron', valor: estados.confirmados, color: tokens.verde },
                            { label: 'Rechazaron', valor: estados.rechazados, color: tokens.rojo },
                            { label: 'Sin responder', valor: estados.pendientes, color: tokens.grid },
                        ]}
                    />

                    <ul className={styles.saludLista}>
                        <li className={styles.saludItem}>
                            <span className={`${styles.punto} ${styles.puntoVerde}`} />
                            <span className={styles.saludNombre}>Confirmaron</span>
                            <span className={styles.saludValor}>{miles(estados.confirmados)}</span>
                            <span className={styles.saludPct}>
                                {pct(estados.confirmados, datos.invitados)}%
                            </span>
                        </li>
                        <li className={styles.saludItem}>
                            <span className={`${styles.punto} ${styles.puntoRojo}`} />
                            <span className={styles.saludNombre}>Rechazaron</span>
                            <span className={styles.saludValor}>{miles(estados.rechazados)}</span>
                            <span className={styles.saludPct}>
                                {pct(estados.rechazados, datos.invitados)}%
                            </span>
                        </li>
                        <li className={styles.saludItem}>
                            <span className={`${styles.punto} ${styles.puntoGris}`} />
                            <span className={styles.saludNombre}>Siguen sin responder</span>
                            <span className={styles.saludValor}>{miles(estados.pendientes)}</span>
                            <span className={styles.saludPct}>
                                {pct(estados.pendientes, datos.invitados)}%
                            </span>
                        </li>
                    </ul>

                    {/* El sí contra el no, pero solo entre los que contestaron.
                        Mezclar a los que nunca respondieron con los que dijeron
                        que no esconde que el rechazo es marginal. */}
                    <span className={styles.columnaTitulo}>
                        De los {miles(respondieron)} que sí respondieron
                    </span>

                    <BarrasApiladas
                        alto={84}
                        maximo={respondieron}
                        labels={['']}
                        series={[
                            { label: 'Dijeron sí', color: tokens.verde, valores: [estados.confirmados] },
                            { label: 'Dijeron no', color: tokens.rojo, valores: [estados.rechazados] },
                        ]}
                    />

                    <Leyenda entradas={[
                        { label: 'Dijeron sí', color: tokens.verde },
                        { label: 'Dijeron no', color: tokens.rojo },
                    ]} />

                    <footer className={styles.cardFoot}>
                        Cuando el invitado contesta, el {pct(estados.confirmados, respondieron)}% dice que
                        sí. El problema no es el rechazo, es el{' '}
                        {pct(estados.pendientes, datos.invitados)}% que nunca contesta.
                    </footer>
                </section>
            </div>
        </div>
    )
}
