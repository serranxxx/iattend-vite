/*
  Analítica de producto — Etapa 4: Acomodo de mesas.

  Si lo usan, cuántas mesas arman, a cuánta gente sientan y cuánto tardan en
  empezar.

  Dos criterios que definen los números:

  · Una fila de `tables` con `size = 0` es la pista de baile, no una mesa. Se
    excluye, igual que hace la RPC `get_tables_occupancy` del backend.

  · Crear mesas no es usarlas. Hay eventos con 20 mesas armadas y cero
    invitados sentados, así que la adopción se mide en dos pasos: quién creó el
    acomodo y quién además lo llenó.
*/

import { useEffect, useMemo, useState } from 'react'
import { Dropdown } from 'antd'
import { ChevronDown } from 'lucide-react'
import { OCUPACION_MINIMA_USO, claveDeMes, esMesaReal, mediana, nombreDeMes } from '../analiticaCalculos'
import { traerTodo } from '../analiticaDatos'
import { useTokens } from '../adminCharts'
import { BarrasCategoria, BarrasConAcumulado, Leyenda, Rosca } from './AnaliticaPiezas'
import styles from './EventosAnalitica.module.css'

const MS_POR_DIA = 86_400_000

// Un acomodo de verdad, no una prueba: por debajo de esto puede ser el
// organizador sentando a dos familias para ver cómo funciona la herramienta.
const SENTADOS_PARA_ACOMODO_REAL = 30

// Cortes del histograma de "cuánto tardaron en armar la primera mesa", en días
// desde que se creó la invitación.
const RANGOS_ARRANQUE = [
    { label: 'la primera semana', hasta: 7 },
    { label: '1 a 4 semanas', hasta: 30 },
    { label: '1 a 2 meses', hasta: 60 },
    { label: '2 a 3 meses', hasta: 90 },
    { label: 'más de 3 meses', hasta: Infinity },
]

const plural = (n, singular, pluralForma) => `${n} ${n === 1 ? singular : pluralForma}`
const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0)
const miles = (n) => new Intl.NumberFormat('es-MX').format(n)

// ------------------------------------------------------------------ datos ---

const useMesas = (invitacionesReales, mes) => {
    const [crudo, setCrudo] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelado = false

        Promise.all([
            traerTodo('tables', 'id,invitation_id,size,created_at'),
            traerTodo('guests', 'id,invitation_id,table'),
        ])
            .then(([mesas, invitados]) => {
                if (!cancelado) setCrudo({ mesas, invitados })
            })
            .catch(fallo => {
                console.error('Error al cargar el acomodo de mesas:', fallo)
                if (!cancelado) setError(fallo.message)
            })

        return () => { cancelado = true }
    }, [])

    return useMemo(() => {
        if (error) return { error }
        if (!crudo) return { cargando: true }
        // El periodo se mide por la fecha de creación de la invitación: es la
        // única que tienen los 55 eventos, incluidos los que nunca abrieron el
        // acomodo, que son justo los que hacen falta para medir la adopción.
        const mesesDisponibles = [...new Set(invitacionesReales.map(i => claveDeMes(new Date(i.created_at))))]
            .sort((a, b) => b.localeCompare(a))

        const enElPeriodo = invitacionesReales.filter(i =>
            mes === 'todo' || claveDeMes(new Date(i.created_at)) === mes)

        if (enElPeriodo.length === 0) return { vacio: true, mesesDisponibles }

        const porEvento = new Map(enElPeriodo.map(i => [i.id, {
            id: i.id,
            nombre: i.name ?? 'sin nombre',
            creado: new Date(i.created_at),
            mesas: 0,
            capacidad: 0,
            primeraMesa: null,
            invitados: 0,
            conMesa: 0,
        }]))

        crudo.mesas.filter(esMesaReal).forEach(m => {
            const evento = porEvento.get(m.invitation_id)
            if (!evento) return

            evento.mesas += 1
            evento.capacidad += Number(m.size ?? 0)

            const creada = new Date(m.created_at)
            if (!evento.primeraMesa || creada < evento.primeraMesa) evento.primeraMesa = creada
        })

        crudo.invitados.forEach(g => {
            const evento = porEvento.get(g.invitation_id)
            if (!evento) return

            evento.invitados += 1
            if (g.table !== null && g.table !== undefined) evento.conMesa += 1
        })

        const eventos = [...porEvento.values()].map(e => ({
            ...e,
            ocupacion: e.invitados > 0 ? e.conMesa / e.invitados : 0,
            // Días entre crear la invitación y armar la primera mesa.
            diasHastaLaPrimera: e.primeraMesa
                ? Math.max(0, Math.round((e.primeraMesa - e.creado) / MS_POR_DIA))
                : null,
        }))

        const conMesas = eventos.filter(e => e.mesas > 0)
        const acomodaron = conMesas.filter(e => e.ocupacion >= OCUPACION_MINIMA_USO)
        const conAcomodoReal = conMesas.filter(e => e.conMesa >= SENTADOS_PARA_ACOMODO_REAL)
        const armaronYAbandonaron = conMesas
            .filter(e => e.ocupacion < OCUPACION_MINIMA_USO)
            .sort((a, b) => b.mesas - a.mesas)

        const dias = conMesas.map(e => e.diasHastaLaPrimera).filter(d => d !== null).sort((a, b) => a - b)

        const histograma = RANGOS_ARRANQUE.map(({ label, hasta }, i) => {
            const desde = i === 0 ? 0 : RANGOS_ARRANQUE[i - 1].hasta
            return { label, total: dias.filter(d => d >= desde && d < hasta).length }
        })

        // Acumulado del histograma: la barra dice cuántos arrancaron en esa
        // ventana y la línea cuántos habían arrancado ya a esas alturas.
        let corridos = 0
        const acumulado = histograma.map(tramo => {
            corridos += tramo.total
            return pct(corridos, dias.length)
        })

        return {
            mesesDisponibles,
            eventos: enElPeriodo.length,
            conMesas: conMesas.length,
            acomodaron: acomodaron.length,
            conAcomodoReal: conAcomodoReal.length,
            armaronYAbandonaron,
            mesasTotales: conMesas.reduce((acc, e) => acc + e.mesas, 0),
            medianaMesas: mediana(conMesas.map(e => e.mesas)),
            maximoMesas: Math.max(0, ...conMesas.map(e => e.mesas)),
            capacidadTotal: conMesas.reduce((acc, e) => acc + e.capacidad, 0),
            invitadosConMesa: conMesas.reduce((acc, e) => acc + e.conMesa, 0),
            invitadosEnEsosEventos: conMesas.reduce((acc, e) => acc + e.invitados, 0),
            arranque: {
                medianaDias: mediana(dias),
                muestra: dias.length,
                laPrimeraSemana: dias.filter(d => d < 7).length,
                tardones: dias.filter(d => d >= 60).length,
                histograma,
                acumulado,
            },
            porMesas: [...conMesas].sort((a, b) => b.mesas - a.mesas),
            porOcupacion: [...conMesas].sort((a, b) => b.ocupacion - a.ocupacion),
        }
    }, [crudo, error, invitacionesReales, mes])
}

// ----------------------------------------------------------------- panel ---

// El periodo lo controla el contenedor, que dibuja el selector junto a las
// pestañas; aquí solo se reportan los meses disponibles.
export const AnaliticaMesas = ({ invitacionesReales, mes, onMesesDisponibles }) => {
    const datos = useMesas(invitacionesReales, mes)
    const tokens = useTokens()
    const [mesasAbiertas, setMesasAbiertas] = useState(false)
    const [ocupacionAbierta, setOcupacionAbierta] = useState(false)

    const meses = datos.mesesDisponibles

    useEffect(() => {
        if (meses) onMesesDisponibles(meses)
    }, [meses, onMesesDisponibles])

    if (datos.cargando) return <div className={styles.empty}>Cargando el acomodo de mesas…</div>
    if (datos.error) return <div className={styles.empty}>No se pudo cargar el acomodo: {datos.error}</div>

    if (datos.vacio) {
        return (
            <div className={styles.empty}>
                {mes === 'todo'
                    ? 'Todavía no hay eventos que analizar.'
                    : `Sin invitaciones creadas en ${nombreDeMes(mes)}.`}
            </div>
        )
    }

    const { arranque, porMesas, porOcupacion, armaronYAbandonaron } = datos

    const nuncaAbrieron = datos.eventos - datos.conMesas
    const ocupacionDeLugares = pct(datos.invitadosConMesa, datos.capacidadTotal)

    // Color por estado: la longitud dice cuántas mesas y el color si sirvieron
    // de algo. Un evento con 40 mesas vacías y otro con 40 llenas son la misma
    // barra hasta que se pintan distinto.
    const colorDeEstado = (evento) => {
        if (evento.invitados === 0) return tokens.grid
        return evento.ocupacion >= OCUPACION_MINIMA_USO ? tokens.azul : tokens.naranja
    }

    const filasDeMesas = porMesas.slice(0, 6).map(evento => ({
        nombre: evento.nombre,
        valor: evento.mesas,
        color: colorDeEstado(evento),
    }))

    // Los tres tramos del embudo de invitados: cuántos hay, cuántos lugares se
    // crearon para ellos y cuántos acabaron sentados.
    const filasDelEmbudo = [
        { nombre: 'Invitados', valor: datos.invitadosEnEsosEventos, color: tokens.azulBg },
        { nombre: 'Lugares creados', valor: datos.capacidadTotal, color: tokens.azul },
        { nombre: 'Invitados sentados', valor: datos.invitadosConMesa, color: tokens.ink },
    ]

    const peoresAbandonos = armaronYAbandonaron.slice(0, 3)
    const mesasDesperdiciadas = peoresAbandonos.reduce((acc, e) => acc + e.mesas, 0)

    return (
        <div className={styles.analitica}>
            <div className={styles.kpis}>
                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Eventos con mesas</span>
                    <span className={styles.kpiValue}>
                        {datos.conMesas}
                        <small> de {datos.eventos}</small>
                    </span>
                    <span className={styles.kpiBarra}>
                        <span
                            className={`${styles.kpiFill} ${styles.kpiFillInk}`}
                            style={{ width: `${pct(datos.conMesas, datos.eventos)}%` }}
                        />
                    </span>
                    <span className={styles.kpiFoot}>
                        {pct(datos.conMesas, datos.eventos)}% armó un acomodo
                    </span>
                </div>

                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>
                        Con {SENTADOS_PARA_ACOMODO_REAL}+ invitados sentados
                    </span>
                    <span className={`${styles.kpiValue} ${styles.kpiValorVerde}`}>
                        {datos.conAcomodoReal}
                        <small> de {datos.eventos}</small>
                    </span>
                    <span className={styles.kpiBarra}>
                        <span
                            className={`${styles.kpiFill} ${styles.kpiFillVerde}`}
                            style={{ width: `${pct(datos.conAcomodoReal, datos.eventos)}%` }}
                        />
                    </span>
                    <span className={styles.kpiFoot}>
                        {pct(datos.conAcomodoReal, datos.eventos)}% llegó a un acomodo de tamaño real
                    </span>
                </div>

                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Tardan en empezar</span>
                    <span className={`${styles.kpiValue} ${styles.kpiValorMorado}`}>
                        {arranque.medianaDias ?? '—'}
                        {arranque.medianaDias !== null && <small> días</small>}
                    </span>
                    <span className={styles.kpiBarra}>
                        <span
                            className={`${styles.kpiFill} ${styles.kpiFillMorado}`}
                            style={{ width: `${pct(arranque.tardones, arranque.muestra)}%` }}
                        />
                    </span>
                    <span className={styles.kpiFoot}>
                        de mediana · {arranque.tardones} de {arranque.muestra} tardan más de 2 meses
                    </span>
                </div>
            </div>

            <div className={`${styles.bento} ${styles.bentoPar}`}>
                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Quién usa el acomodo</h2>
                            <p className={styles.cardSub}>
                                Crear mesas y llenarlas son dos cosas distintas
                            </p>
                        </div>
                    </header>

                    <Rosca
                        alto={210}
                        valor={`${pct(datos.conMesas, datos.eventos)}%`}
                        pie='abrió el acomodo'
                        segmentos={[
                            { label: 'Armaron y sentaron gente', valor: datos.acomodaron, color: tokens.verde },
                            { label: 'Mesas vacías', valor: armaronYAbandonaron.length, color: tokens.naranja },
                            { label: 'Nunca lo abrieron', valor: nuncaAbrieron, color: tokens.grid },
                        ]}
                    />

                    <ul className={styles.saludLista}>
                        <li className={styles.saludItem}>
                            <span className={`${styles.punto} ${styles.puntoVerde}`} />
                            <span className={styles.saludNombre}>Armaron y sentaron gente</span>
                            <span className={styles.saludValor}>{datos.acomodaron}</span>
                            <span className={styles.saludPct}>{pct(datos.acomodaron, datos.eventos)}%</span>
                        </li>
                        <li className={styles.saludItem}>
                            <span className={`${styles.punto} ${styles.puntoAmbar}`} />
                            <span className={styles.saludNombre}>Armaron mesas y las dejaron vacías</span>
                            <span className={styles.saludValor}>{armaronYAbandonaron.length}</span>
                            <span className={styles.saludPct}>
                                {pct(armaronYAbandonaron.length, datos.eventos)}%
                            </span>
                        </li>
                        <li className={styles.saludItem}>
                            <span className={`${styles.punto} ${styles.puntoGris}`} />
                            <span className={styles.saludNombre}>Nunca abrieron el acomodo</span>
                            <span className={styles.saludValor}>{nuncaAbrieron}</span>
                            <span className={styles.saludPct}>{pct(nuncaAbrieron, datos.eventos)}%</span>
                        </li>
                    </ul>

                    <footer className={styles.cardFoot}>
                        Se cuenta como usado cuando al menos el{' '}
                        {Math.round(OCUPACION_MINIMA_USO * 100)}% de los invitados quedó sentado. Las filas
                        con capacidad cero son la pista de baile y no cuentan como mesa.
                    </footer>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Mesas por evento</h2>
                            <p className={styles.cardSub}>
                                Los {filasDeMesas.length} eventos con más mesas ·{' '}
                                {miles(datos.mesasTotales)} mesas en total, mediana de {datos.medianaMesas}
                            </p>
                        </div>
                    </header>

                    <BarrasCategoria
                        filas={filasDeMesas}
                        alto={34 + filasDeMesas.length * 42}
                        maximo={datos.maximoMesas}
                    />

                    <Leyenda entradas={[
                        { label: 'Sentaron gente', color: tokens.azul },
                        { label: 'Quedaron vacías', color: tokens.naranja },
                        { label: 'Sin dato', color: tokens.grid },
                    ]} />

                    <footer className={styles.cardFoot}>
                        <Dropdown
                            trigger={['click']}
                            open={mesasAbiertas}
                            onOpenChange={setMesasAbiertas}
                            placement='bottomLeft'
                            popupRender={() => (
                                <div className={`${styles.listaPopup} ${styles.listaPopupAncha}`}>
                                    <div className={styles.listaHead}>
                                        Mesas por evento · {plural(porMesas.length, 'evento', 'eventos')}
                                    </div>
                                    <ul className={styles.lista}>
                                        {porMesas.map(evento => (
                                            <li className={styles.listaItemEvento} key={evento.id}>
                                                <span className={styles.listaNombre} title={evento.nombre}>
                                                    {evento.nombre}
                                                </span>
                                                <span className={styles.listaDetalle}>
                                                    {evento.conMesa} de {evento.invitados} sentados
                                                </span>
                                                <span className={styles.listaValor}>
                                                    {plural(evento.mesas, 'mesa', 'mesas')}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        >
                            <button type='button' className={styles.verTodas} aria-expanded={mesasAbiertas}>
                                Ver los {porMesas.length} eventos con mesas
                                <ChevronDown
                                    size={12}
                                    className={`${styles.chevron} ${mesasAbiertas ? styles.chevronOpen : ''}`}
                                />
                            </button>
                        </Dropdown>
                    </footer>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Invitados sentados</h2>
                            <p className={styles.cardSub}>
                                Qué parte de la lista quedó acomodada en cada evento
                            </p>
                        </div>
                    </header>

                    <div className={styles.titular}>
                        <span className={`${styles.titularValor} ${styles.titularAzul}`}>
                            {pct(datos.invitadosConMesa, datos.invitadosEnEsosEventos)}%
                        </span>
                        <span className={styles.titularTexto}>
                            de los invitados de esos eventos tiene mesa asignada ·{' '}
                            {ocupacionDeLugares}% de los lugares creados está ocupado
                        </span>
                    </div>

                    <BarrasCategoria filas={filasDelEmbudo} alto={124} />

                    <footer className={styles.cardFoot}>
                        <Dropdown
                            trigger={['click']}
                            open={ocupacionAbierta}
                            onOpenChange={setOcupacionAbierta}
                            placement='topLeft'
                            popupRender={() => (
                                <div className={`${styles.listaPopup} ${styles.listaPopupAncha}`}>
                                    <div className={styles.listaHead}>
                                        Cobertura por evento · global{' '}
                                        {pct(datos.invitadosConMesa, datos.invitadosEnEsosEventos)}%
                                        {' '}({miles(datos.invitadosConMesa)}/{miles(datos.invitadosEnEsosEventos)})
                                    </div>
                                    <ul className={styles.lista}>
                                        {porOcupacion.map(evento => (
                                            <li className={styles.listaItemEvento} key={evento.id}>
                                                <span className={styles.listaNombre} title={evento.nombre}>
                                                    {evento.nombre}
                                                </span>
                                                <span className={styles.listaDetalle}>
                                                    {evento.conMesa} de {evento.invitados} ·{' '}
                                                    {plural(evento.mesas, 'mesa', 'mesas')}
                                                </span>
                                                <span className={styles.listaValor}>
                                                    {pct(evento.conMesa, evento.invitados)}%
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        >
                            <button type='button' className={styles.verTodas} aria-expanded={ocupacionAbierta}>
                                Ver la cobertura de los {porOcupacion.length} eventos
                                <ChevronDown
                                    size={12}
                                    className={`${styles.chevron} ${ocupacionAbierta ? styles.chevronOpen : ''}`}
                                />
                            </button>
                        </Dropdown>
                    </footer>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Cuándo arman la primera mesa</h2>
                            <p className={styles.cardSub}>
                                Barras: eventos en cada ventana · Línea: acumulado
                            </p>
                        </div>
                    </header>

                    <div className={styles.titular}>
                        <span className={`${styles.titularValor} ${styles.titularMorado}`}>
                            {arranque.medianaDias ?? '—'}
                        </span>
                        <span className={styles.titularTexto}>
                            días de mediana desde que se creó la invitación · solo{' '}
                            {arranque.laPrimeraSemana} de {arranque.muestra} empiezan en la primera semana
                        </span>
                    </div>

                    <BarrasConAcumulado
                        histograma={arranque.histograma}
                        acumulado={arranque.acumulado}
                        color={tokens.morado}
                        colorSuave={tokens.moradoBg}
                        unidad='eventos'
                    />

                    <p className={styles.nota}>
                        El acomodo es de las últimas cosas que se tocan: llega cuando ya hay confirmaciones
                        que sentar, no al crear la invitación.
                    </p>
                </section>

                {peoresAbandonos.length > 0 && (
                    <section className={`${styles.card} ${styles.cardAncha}`}>
                        <header className={styles.cardHead}>
                            <div>
                                <h2 className={styles.cardTitle}>Armaron y abandonaron</h2>
                                <p className={styles.cardSub}>
                                    Eventos que crearon mesas y nunca sentaron a nadie: el trabajo hecho que
                                    no sirvió de nada
                                </p>
                            </div>
                        </header>

                        <div className={styles.dosColumnas}>
                            <div className={styles.columna}>
                                <div className={styles.titular}>
                                    <span className={`${styles.titularValor} ${styles.titularAmbar}`}>
                                        {armaronYAbandonaron.length}
                                    </span>
                                    <span className={styles.titularTexto}>
                                        de los {datos.conMesas} eventos que abrieron el acomodo lo dejaron
                                        con las mesas vacías
                                    </span>
                                </div>

                                <ul className={styles.desglose}>
                                    <li className={`${styles.desgloseItem} ${styles.desgloseAccion}`}>
                                        <span className={styles.desgloseNombre}>
                                            Mesas vacías solo en los {peoresAbandonos.length} peores
                                        </span>
                                        <span className={styles.desgloseValor}>{mesasDesperdiciadas}</span>
                                    </li>
                                    <li className={styles.desgloseItem}>
                                        <span className={styles.desgloseNombre}>Mediana de mesas por evento</span>
                                        <span className={styles.desgloseValor}>{datos.medianaMesas}</span>
                                    </li>
                                </ul>
                            </div>

                            <div className={styles.columna}>
                                <BarrasCategoria
                                    horizontal={false}
                                    alto={210}
                                    filas={peoresAbandonos.map(evento => ({
                                        nombre: evento.nombre,
                                        valor: evento.mesas,
                                        color: tokens.naranja,
                                    }))}
                                />
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </div>
    )
}
