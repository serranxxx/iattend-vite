/*
  Analítica › Mesas y side events (tablero 2x del handoff "Admin Reorganización").

  Fusiona las dos vistas anteriores (AnaliticaMesas + AnaliticaSideEvents) en un
  solo tablero de 718 px sin scroll: arriba la adopción de los dos módulos con
  la misma escala, abajo el detalle de cada uno.

  Los cálculos son los mismos que hacían esas vistas (aquí copiados, para no
  tocarlas):

  · Mesas: `size = 0` es la pista de baile y no cuenta. Crear mesas no es
    usarlas: "sentaron gente" exige OCUPACION_MINIMA_USO de los invitados con
    mesa.

  · Side events: los invitados viven en `side_events_guests` y no se cruzan
    con `guests`. Solo se clasifican por tema los que tienen título.

  · El periodo se mide por la creación de la invitación, la única fecha que
    tienen también los eventos que nunca abrieron ninguno de los dos módulos.
*/

import { useEffect, useMemo, useState } from 'react'
import {
    OCUPACION_MINIMA_USO, claveDeMes, esMesaReal, mediana, nombreDeMes, temaDeSideEvent,
    tituloLimpio,
} from '../analiticaCalculos'
import { traerTodo } from '../analiticaDatos'
import { MARCA } from '../adminCharts'
import styles from './AnaliticaModulos.module.css'

const MS_POR_DIA = 86_400_000

// Paleta de marca (adminCharts): sobre blanco navy, lila, verde y crema.
const { navy: NAVY, lila: LILA, verde: VERDE, crema: CREMA } = MARCA

// `invitations.plan` se guarda en minúsculas; la UI usa la grafía de la marca.
const ETIQUETA_PLAN = { pro: 'PRO', lite: 'Lite', paperless: 'Paperless', free: 'Free' }
const COLOR_PLAN = {
    pro: { bg: NAVY, fg: '#fff' },
    lite: { bg: LILA, fg: '#4A3457' },
}

// Más de seis nombres en la nota del tope ya es una lista, no una nota.
const NOMBRES_EN_EL_TOPE = 6

// Fila de abajo del treemap: más de esto ya no se lee; el resto va a "Otros".
const MOSAICOS_SEGUNDA_FILA = 5

const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0)
const decimal = (n) => new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n)

// "a, b y c": la coma seca antes del último suena a inventario.
const enumerar = (nombres) => nombres.join(', ').replace(/, ([^,]*)$/, ' y $1')

// ------------------------------------------------------------------ datos ---

const useModulos = (invitacionesReales, mes) => {
    const [crudo, setCrudo] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelado = false

        Promise.all([
            traerTodo('tables', 'id,invitation_id,size,created_at'),
            traerTodo('guests', 'id,invitation_id,table'),
            traerTodo('side_events', 'id,invitation_id,name,created_at'),
        ])
            .then(([mesas, invitados, sides]) => {
                if (!cancelado) setCrudo({ mesas, invitados, sides })
            })
            .catch(fallo => {
                console.error('Error al cargar mesas y side events:', fallo)
                if (!cancelado) setError(fallo.message)
            })

        return () => { cancelado = true }
    }, [])

    return useMemo(() => {
        if (error) return { error }
        if (!crudo) return { cargando: true }

        const mesesDisponibles = [...new Set(invitacionesReales.map(i => claveDeMes(new Date(i.created_at))))]
            .sort((a, b) => b.localeCompare(a))

        const enElPeriodo = invitacionesReales.filter(i =>
            mes === 'todo' || claveDeMes(new Date(i.created_at)) === mes)

        if (enElPeriodo.length === 0) return { vacio: true, mesesDisponibles }

        const nombres = new Map(enElPeriodo.map(i => [i.id, i.name ?? 'sin nombre']))

        // --- mesas, por evento ---
        const porEvento = new Map(enElPeriodo.map(i => [i.id, {
            creado: new Date(i.created_at),
            mesas: 0,
            primeraMesa: null,
            invitados: 0,
            conMesa: 0,
        }]))

        crudo.mesas.filter(esMesaReal).forEach(m => {
            const evento = porEvento.get(m.invitation_id)
            if (!evento) return

            evento.mesas += 1
            const creada = new Date(m.created_at)
            if (!evento.primeraMesa || creada < evento.primeraMesa) evento.primeraMesa = creada
        })

        crudo.invitados.forEach(g => {
            const evento = porEvento.get(g.invitation_id)
            if (!evento) return

            evento.invitados += 1
            if (g.table !== null && g.table !== undefined) evento.conMesa += 1
        })

        const conMesas = [...porEvento.values()].filter(e => e.mesas > 0)
        const sentaron = conMesas.filter(e => e.invitados > 0 && e.conMesa / e.invitados >= OCUPACION_MINIMA_USO).length
        const vacias = conMesas.length - sentaron

        // Días entre crear la invitación y armar la primera mesa.
        const dias = conMesas
            .map(e => Math.max(0, Math.round((e.primeraMesa - e.creado) / MS_POR_DIA)))
            .sort((a, b) => a - b)

        // --- side events, por evento ---
        const sides = crudo.sides.filter(s => nombres.has(s.invitation_id))
        const sidesPorEvento = new Map()
        sides.forEach(s => sidesPorEvento.set(s.invitation_id, (sidesPorEvento.get(s.invitation_id) ?? 0) + 1))

        const conSides = [...sidesPorEvento.entries()].map(([id, total]) => ({ id, nombre: nombres.get(id), total }))
        const maximoPorEvento = Math.max(0, ...conSides.map(e => e.total))

        const distribucion = [
            { label: 'con 1', total: conSides.filter(e => e.total === 1).length, color: NAVY, tinta: '#fff' },
            { label: 'con 2', total: conSides.filter(e => e.total === 2).length, color: LILA, tinta: NAVY },
            { label: '3 o más', total: conSides.filter(e => e.total >= 3).length, color: VERDE, tinta: NAVY },
        ]

        const enElTope = conSides.filter(e => e.total === maximoPorEvento).map(e => e.nombre)

        // --- por plan ---
        // Promedio y no mediana: la mediana de los dos planes es 1 y no
        // distingue nada, que es justo lo que se quiere comparar.
        const cubos = new Map()
        enElPeriodo.forEach(invitacion => {
            const plan = String(invitacion.plan ?? '').toLowerCase() || 'sin plan'
            const cubo = cubos.get(plan) ?? { plan, eventos: 0, conSides: 0, sides: 0 }
            cubo.eventos += 1
            const total = sidesPorEvento.get(invitacion.id)
            if (total) {
                cubo.conSides += 1
                cubo.sides += total
            }
            cubos.set(plan, cubo)
        })

        const porPlan = [...cubos.values()]
            .filter(cubo => cubo.sides > 0)
            .map(cubo => ({ ...cubo, promedio: cubo.sides / cubo.conSides }))
            .sort((a, b) => b.sides - a.sides)
            .slice(0, 3)

        // --- temas ---
        const conTitulo = sides.map(s => tituloLimpio(s.name)).filter(Boolean)
        const temas = new Map()
        conTitulo.forEach(titulo => {
            const tema = temaDeSideEvent(titulo)
            temas.set(tema, (temas.get(tema) ?? 0) + 1)
        })

        return {
            mesesDisponibles,
            eventos: enElPeriodo.length,
            mesas: {
                conMesas: conMesas.length,
                sentaron,
                vacias,
                nunca: enElPeriodo.length - conMesas.length,
                medianaDias: mediana(dias),
                muestra: dias.length,
                tardones: dias.filter(d => d >= 60).length,
            },
            side: {
                conSides: conSides.length,
                dosOMas: conSides.filter(e => e.total >= 2).length,
                sides: sides.length,
                maximoPorEvento,
                enElTope,
                distribucion,
                porPlan,
                conTitulo: conTitulo.length,
                temas: [...temas.entries()].map(([tema, total]) => ({ tema, total })),
            },
        }
    }, [crudo, error, invitacionesReales, mes])
}

// Reparte los temas en las dos filas del treemap: los tres principales arriba
// en navy; abajo "Otros" en crema (es el cajón, no un tema) y el resto en lila
// si se repite o verde si es de uno solo.
const filasDelMapa = (temas) => {
    const otros = temas.find(t => t.tema === 'Otros')?.total ?? 0
    const reales = temas.filter(t => t.tema !== 'Otros').sort((a, b) => b.total - a.total)

    const arriba = reales.slice(0, 3).map(t => ({ ...t, color: NAVY, tinta: '#fff' }))
    const resto = reales.slice(3)

    const visibles = resto.slice(0, MOSAICOS_SEGUNDA_FILA - (otros > 0 || resto.length > MOSAICOS_SEGUNDA_FILA ? 1 : 0))
    const alCajon = otros + resto.slice(visibles.length).reduce((acc, t) => acc + t.total, 0)

    const abajo = [
        ...(alCajon > 0 ? [{ tema: 'Otros', total: alCajon, color: CREMA, tinta: NAVY }] : []),
        ...visibles.map(t => ({ ...t, color: t.total > 1 ? LILA : VERDE, tinta: NAVY })),
    ]

    return { arriba, abajo }
}

// ----------------------------------------------------------------- piezas ---

const Embudo = ({ titulo, pasos, total }) => (
    <div className={styles.embudo}>
        <span className={styles.embudoTitulo}>{titulo}</span>
        {pasos.map(paso => (
            <div className={styles.paso} key={paso.label}>
                <span className={styles.pasoLabel}>{paso.label}</span>
                <span className={styles.pasoPista}>
                    <span
                        className={styles.pasoBarra}
                        style={{ width: `${Math.max(pct(paso.valor, total), paso.valor > 0 ? 6 : 0)}%`, background: paso.color }}
                    >
                        {paso.valor}
                    </span>
                </span>
                <span className={styles.pasoPct}>{pct(paso.valor, total)}%</span>
            </div>
        ))}
    </div>
)

const Mosaico = ({ tile, chico }) => (
    <div
        className={`${styles.mosaico} ${chico ? styles.mosaicoChico : ''}`}
        style={{ flex: tile.total, background: tile.color, color: tile.tinta }}
        title={`${tile.tema}: ${tile.total}`}
    >
        <span className={styles.mosaicoLabel}>{tile.tema}</span>
        <b className={styles.mosaicoValor}>{tile.total}</b>
    </div>
)

// ----------------------------------------------------------------- panel ---

// El periodo lo controla el contenedor, que dibuja el selector en la topbar;
// aquí solo se reportan los meses disponibles.
export const AnaliticaModulos = ({ invitacionesReales, mes, onMesesDisponibles }) => {
    const datos = useModulos(invitacionesReales, mes)
    const meses = datos.mesesDisponibles

    useEffect(() => {
        if (meses) onMesesDisponibles(meses)
    }, [meses, onMesesDisponibles])

    if (datos.cargando) return <div className={styles.empty}>Cargando mesas y side events…</div>
    if (datos.error) return <div className={styles.empty}>No se pudieron cargar mesas y side events: {datos.error}</div>

    if (datos.vacio) {
        return (
            <div className={styles.empty}>
                {mes === 'todo'
                    ? 'Todavía no hay eventos que analizar.'
                    : `Sin invitaciones creadas en ${nombreDeMes(mes)}.`}
            </div>
        )
    }

    const { eventos, mesas, side } = datos
    const soloUno = side.distribucion[0].total

    // Waffle: un cuadro por evento, ordenados por estado. Con muchos eventos
    // se agregan columnas para que la cuadrícula siga cabiendo sin scroll.
    const columnas = eventos > 80 ? Math.ceil(eventos / 8) : 10
    const cuadros = [
        ...Array(mesas.sentaron).fill(NAVY),
        ...Array(mesas.vacias).fill(LILA),
        ...Array(mesas.nunca).fill(CREMA),
    ]

    const { arriba, abajo } = filasDelMapa(side.temas)
    const principales = arriba.reduce((acc, t) => acc + t.total, 0)

    // Escala común de las barras por plan: con promedios entre 1 y 2 la barra
    // contra 3 se ve plana, así que el tope es el mayor promedio redondeado.
    const topePlan = Math.max(2, Math.ceil(Math.max(0, ...side.porPlan.map(p => p.promedio))))

    const notaTope = side.maximoPorEvento === 0 ? null : side.enElTope.length <= NOMBRES_EN_EL_TOPE
        ? `Nadie ha pasado de ${side.maximoPorEvento}: ${enumerar(side.enElTope)} ${side.enElTope.length === 1 ? 'llegó' : 'llegaron'} al tope.`
        : `Nadie ha pasado de ${side.maximoPorEvento}: ${side.enElTope.length} eventos llegaron al tope.`

    return (
        <div className={styles.tablero}>
            <section className={styles.hero}>
                <div className={styles.embudos}>
                    <h2 className={styles.heroLabel}>Adopción de módulos · de {eventos} eventos</h2>
                    <Embudo
                        titulo='Mesas'
                        total={eventos}
                        pasos={[
                            { label: 'Crearon mesas', valor: mesas.conMesas, color: LILA },
                            { label: 'Sentaron gente', valor: mesas.sentaron, color: VERDE },
                        ]}
                    />
                    <Embudo
                        titulo='Side events'
                        total={eventos}
                        pasos={[
                            { label: 'Crearon side events', valor: side.conSides, color: LILA },
                            { label: 'Crearon 2 o más', valor: side.dosOMas, color: VERDE },
                        ]}
                    />
                </div>

                <div className={styles.cifras}>
                    <div className={styles.cifra}>
                        <span className={`${styles.cifraValor} ${styles.cifraLila}`}>
                            {mesas.medianaDias ?? '—'}
                            {mesas.medianaDias !== null && <small> días</small>}
                        </span>
                        <span className={styles.cifraPie}>
                            tardan en empezar a armar mesas (mediana)
                            {mesas.muestra > 0 && ` · ${mesas.tardones} de ${mesas.muestra} después de 2 meses`}
                        </span>
                    </div>
                    <div className={styles.cifra}>
                        <span className={`${styles.cifraValor} ${styles.cifraVerde}`}>
                            {side.conSides > 0 ? `${pct(soloUno, side.conSides)}%` : '—'}
                        </span>
                        <span className={styles.cifraPie}>de los que usan side events se queda con uno solo</span>
                    </div>
                </div>
            </section>

            <div className={styles.fila}>
                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.cardLabel}>Mesas · cada cuadro es un evento</h2>
                        <span className={styles.cardMeta}>{eventos}</span>
                    </header>

                    <div className={styles.waffle} style={{ gridTemplateColumns: `repeat(${columnas}, 1fr)` }}>
                        {cuadros.map((color, i) => (
                            <span className={styles.cuadro} key={i} style={{ background: color }} />
                        ))}
                    </div>

                    <ul className={styles.leyenda}>
                        {[
                            { label: 'Armaron y sentaron gente', valor: mesas.sentaron, color: NAVY },
                            { label: 'Armaron mesas y las dejaron vacías', valor: mesas.vacias, color: LILA },
                            { label: 'Nunca abrieron el acomodo', valor: mesas.nunca, color: CREMA },
                        ].map(fila => (
                            <li className={styles.leyendaItem} key={fila.label}>
                                <i className={styles.leyendaPunto} style={{ background: fila.color }} />
                                <span className={styles.leyendaNombre}>{fila.label}</span>
                                <b className={styles.leyendaValor}>{fila.valor}</b>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.cardLabel}>Side events · cuántos por evento</h2>
                        <span className={styles.cardMeta}>{side.conSides} eventos</span>
                    </header>

                    {side.conSides === 0 ? (
                        <p className={styles.nota}>Ningún evento del periodo ha creado un side event.</p>
                    ) : (
                        <div className={styles.distribucion}>
                            <div className={styles.barraPartida}>
                                {side.distribucion.filter(t => t.total > 0).map(tramo => (
                                    <span
                                        className={styles.tramo}
                                        key={tramo.label}
                                        style={{ flex: tramo.total, background: tramo.color, color: tramo.tinta }}
                                    >
                                        <b>{tramo.total}</b>
                                        <span>{tramo.label}</span>
                                    </span>
                                ))}
                            </div>
                            {notaTope && <span className={styles.nota}>{notaTope}</span>}
                        </div>
                    )}

                    {side.porPlan.length > 0 && (
                        <div className={styles.planes}>
                            <span className={styles.subLabel}>Promedio por evento, según el plan</span>
                            {side.porPlan.map(cubo => {
                                const color = COLOR_PLAN[cubo.plan] ?? { bg: VERDE, fg: NAVY }
                                return (
                                    <div className={styles.plan} key={cubo.plan}>
                                        <span className={styles.planBadge} style={{ background: color.bg, color: color.fg }}>
                                            {ETIQUETA_PLAN[cubo.plan] ?? cubo.plan}
                                        </span>
                                        <div className={styles.planCuerpo}>
                                            <span className={styles.planPista}>
                                                <span
                                                    className={styles.planBarra}
                                                    style={{ width: `${pct(cubo.promedio, topePlan)}%`, background: color.bg }}
                                                />
                                            </span>
                                            <span className={styles.planDetalle}>
                                                {cubo.sides} en {cubo.conSides} de {cubo.eventos} eventos
                                            </span>
                                        </div>
                                        <b className={styles.planValor}>{decimal(cubo.promedio)}</b>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </section>

                <section className={`${styles.card} ${styles.cardMapa}`}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.cardLabel}>Side events · de qué son</h2>
                        <span className={styles.cardMeta}>{side.conTitulo} de {side.sides} tienen título</span>
                    </header>

                    {side.conTitulo === 0 ? (
                        <p className={styles.nota}>Ningún side event del periodo tiene título.</p>
                    ) : (
                        <>
                            <div className={styles.mapa}>
                                {arriba.length > 0 && (
                                    <div className={styles.mapaArriba}>
                                        {arriba.map(tile => <Mosaico tile={tile} key={tile.tema} />)}
                                    </div>
                                )}
                                {abajo.length > 0 && (
                                    <div className={styles.mapaAbajo}>
                                        {abajo.map(tile => <Mosaico tile={tile} key={tile.tema} chico />)}
                                    </div>
                                )}
                            </div>
                            {arriba.length > 0 && (
                                <p className={styles.nota}>
                                    {enumerar(arriba.map((t, i) => (i === 0 ? t.tema : t.tema.toLowerCase())))}{' '}
                                    {arriba.length === 1 ? 'concentra' : 'concentran'}{' '}
                                    <b>{principales} de {side.conTitulo}</b>
                                    {pct(principales, side.conTitulo) >= 50
                                        ? `: ${arriba.length === 1 ? 'una plantilla cubriría' : `${arriba.length === 2 ? 'dos' : 'tres'} plantillas cubrirían`} casi todo el uso real.`
                                        : '.'}
                                </p>
                            )}
                        </>
                    )}
                </section>
            </div>
        </div>
    )
}
