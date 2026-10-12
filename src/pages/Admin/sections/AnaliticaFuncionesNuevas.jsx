/*
  Analítica de producto — Etapas 6 y 7 juntas: Save the date y Photo wall.

  Van en la misma pestaña porque son las dos funciones más nuevas y comparten el
  mismo problema: apenas hay datos. Con tan pocas filas no hay promedios ni
  tendencias que sostener, así que el tablero se queda en la adopción (donas del
  hero), el detalle de cada caso (una barra por save the date) y un waffle de
  eventos celebrados donde se ve de un golpe cuántos usaron el photo wall.

  Dos particularidades del modelo:

  · `event_photos` se une por `event_id`, no por `invitation_id` como el resto,
    y su columna de tiempo es `uploaded_at` (no tiene `created_at`).

  · Ninguna de las dos tiene lista de invitados ni envíos: el save the date es
    una página pública que se comparte por fuera y el photo wall lo alimentan
    los invitados desde su teléfono.
*/

import { useEffect, useMemo, useState } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Camera } from 'lucide-react'
import { claveDeMes, mediana, nombreDeMes } from '../analiticaCalculos'
import { traerTodo } from '../analiticaDatos'
import { MARCA, opcionesBase, tooltipBase, useTokens } from '../adminCharts'
import styles from './AnaliticaFuncionesNuevas.module.css'

const MS_POR_DIA = 86_400_000

const plural = (n, singular, pluralForma) => `${n} ${n === 1 ? singular : pluralForma}`
const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0)
const miles = (n) => new Intl.NumberFormat('es-MX').format(n)
const decimal = (n) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(n)

// Color de cada barra según el plan de la invitación. Lo que no sea PRO ni Lite
// (free, cortesías, filas sin plan) cae en verde junto con Free.
const COLOR_POR_PLAN = { pro: MARCA.navy, lite: MARCA.lila, free: MARCA.verde }
const colorDePlan = (plan) => COLOR_POR_PLAN[String(plan ?? '').toLowerCase()] ?? MARCA.verde

// Tramos de "cuánto tardan en armarlo después de la invitación". El corte de
// los meses va en días redondos (60 / 180) porque la fuente es una resta de
// fechas, no un calendario.
const TRAMOS_ARMADO = [
    { etiqueta: 'el mismo día', cabe: d => d < 1, fondo: MARCA.navy, texto: '#FFFFFF' },
    { etiqueta: 'en 2 meses', cabe: d => d >= 1 && d <= 60, fondo: MARCA.lila, texto: MARCA.navy },
    { etiqueta: '2 a 6 meses', cabe: d => d > 60 && d <= 180, fondo: MARCA.verde, texto: MARCA.navy },
    { etiqueta: '+6 meses', cabe: d => d > 180, fondo: MARCA.crema, texto: MARCA.navy },
]

// Eje Y de nombres: ancho fijo para que la gráfica no baile según el evento
// más largo, y nombres cortados a 22 caracteres.
const ANCHO_EJE_NOMBRES = 160
const MAX_NOMBRE = 22
const recortar = (texto) => (texto.length > MAX_NOMBRE ? `${texto.slice(0, MAX_NOMBRE - 1)}…` : texto)

// ------------------------------------------------------------------ datos ---

const useFuncionesNuevas = (invitacionesReales, mes) => {
    const [crudo, setCrudo] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelado = false

        Promise.all([
            traerTodo('save_the_dates', 'id,invitation_id,active,event_date,created_at'),
            traerTodo('event_photos', 'id,event_id,guest_name,uploaded_at', 'uploaded_at'),
        ])
            .then(([saves, fotos]) => {
                if (!cancelado) setCrudo({ saves, fotos })
            })
            .catch(fallo => {
                console.error('Error al cargar las funciones nuevas:', fallo)
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

        const porId = new Map(enElPeriodo.map(i => [i.id, i]))
        const hoy = new Date()

        // --- save the date ---
        const saves = crudo.saves
            .filter(s => porId.has(s.invitation_id))
            .map(s => {
                const invitacion = porId.get(s.invitation_id)
                const creado = new Date(s.created_at)

                return {
                    id: s.id,
                    invitacionId: s.invitation_id,
                    evento: String(invitacion.name ?? '').trim() || 'sin nombre',
                    plan: invitacion.plan ?? 'sin plan',
                    activo: s.active !== false,
                    diasTrasLaInvitacion: Math.round((creado - new Date(invitacion.created_at)) / MS_POR_DIA),
                    diasAntesDelEvento: invitacion.event_date
                        ? Math.round((new Date(invitacion.event_date) - creado) / MS_POR_DIA)
                        : null,
                }
            })

        // El universo del save the date no son todas las invitaciones: solo
        // tiene sentido en un evento que todavía no se celebra. Se le suman las
        // que ya lo tienen aunque su fiesta haya pasado, para que el "N de M"
        // nunca dé más del 100%.
        const conSave = new Set(saves.map(s => s.invitacionId))
        const podianTenerUno = new Set([
            ...enElPeriodo.filter(i => i.event_date && new Date(i.event_date) >= hoy).map(i => i.id),
            ...conSave,
        ])

        const tras = saves.map(s => s.diasTrasLaInvitacion)
        const tramos = TRAMOS_ARMADO
            .map(t => ({ ...t, n: tras.filter(t.cabe).length }))
            .filter(t => t.n > 0)

        // Una barra por save the date, de mayor a menor anticipación. Los que se
        // publicaron después del evento quedan negativos al final.
        const barras = saves
            .filter(s => s.diasAntesDelEvento !== null)
            .sort((a, b) => b.diasAntesDelEvento - a.diasAntesDelEvento)

        // --- photo wall ---
        const fotos = crudo.fotos.filter(f => porId.has(f.event_id))
        const fotosPorEvento = new Map()

        fotos.forEach(f => {
            const evento = fotosPorEvento.get(f.event_id) ?? {
                id: f.event_id,
                nombre: String(porId.get(f.event_id).name ?? '').trim() || 'sin nombre',
                fotos: 0,
                autores: new Set(),
            }
            evento.fotos += 1
            if (f.guest_name) evento.autores.add(f.guest_name)
            fotosPorEvento.set(f.event_id, evento)
        })

        const eventosConFotos = [...fotosPorEvento.values()]
            .map(e => ({ ...e, autores: e.autores.size }))
            .sort((a, b) => b.fotos - a.fotos)

        // Y el del photo wall son los eventos que YA se celebraron: nadie sube
        // fotos de una fiesta que no ha pasado. Los que usaron el photo wall van
        // primero en el waffle para que se lean como un bloque.
        const yaCelebrados = enElPeriodo
            .filter(i => i.event_date && new Date(i.event_date) < hoy)
            .map(i => ({ id: i.id, uso: fotosPorEvento.has(i.id) }))
            .sort((a, b) => Number(b.uso) - Number(a.uso))

        const usaronPhoto = yaCelebrados.filter(e => e.uso).length
        const autores = eventosConFotos.reduce((a, e) => a + e.autores, 0)

        return {
            mesesDisponibles,
            save: {
                total: saves.length,
                eventos: conSave.size,
                podian: podianTenerUno.size,
                medianaTrasLaInvitacion: mediana(tras),
                medianaAntesDelEvento: mediana(barras.map(s => s.diasAntesDelEvento)),
                barras,
                tramos,
            },
            photo: {
                total: fotos.length,
                autores,
                porAutor: autores > 0 ? fotos.length / autores : null,
                eventos: eventosConFotos.length,
                usaron: usaronPhoto,
                celebrados: yaCelebrados,
                lista: eventosConFotos,
            },
        }
    }, [crudo, error, invitacionesReales, mes])
}

// ------------------------------------------------------------- gráficas ---

// Dona de adopción sobre el hero navy: la parte que lo usa en el color de la
// función y el resto en blanco translúcido.
const DonaAdopcion = ({ usan, total, color, valor, etiqueta }) => (
    <div className={styles.dona}>
        <Doughnut
            data={{
                labels: ['Lo usan', 'No'],
                datasets: [{
                    data: total > 0 ? [usan, total - usan] : [0, 1],
                    backgroundColor: [color, 'rgba(255, 255, 255, 0.18)'],
                    borderWidth: 0,
                    spacing: usan > 0 && usan < total ? 2 : 0,
                }],
            }}
            options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                cutout: '74%',
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
            }}
        />
        <div className={styles.donaCentro}>
            <span className={styles.donaValor}>{valor}</span>
            <span className={styles.donaEtiqueta}>{etiqueta}</span>
        </div>
    </div>
)

const GraficaAnticipacion = ({ barras }) => {
    const tokens = useTokens()

    const data = useMemo(() => ({
        labels: barras.map(s => s.evento),
        datasets: [{
            label: 'Días antes del evento',
            data: barras.map(s => s.diasAntesDelEvento),
            backgroundColor: barras.map(s => (s.diasAntesDelEvento < 0 ? MARCA.crema : colorDePlan(s.plan))),
            borderRadius: 4,
            borderSkipped: false,
            barThickness: 12,
        }],
    }), [barras])

    const options = useMemo(() => ({
        ...opcionesBase,
        indexAxis: 'y',
        interaction: { mode: 'nearest', intersect: true },
        scales: {
            x: {
                border: { display: false },
                grid: { color: tokens.grid, drawTicks: false },
                ticks: {
                    color: tokens.muted,
                    font: { family: 'Poppins', size: 10 },
                    callback: (v) => `${v} d`,
                },
            },
            y: {
                afterFit: (escala) => { escala.width = ANCHO_EJE_NOMBRES },
                border: { display: false },
                grid: { display: false },
                ticks: {
                    color: MARCA.navy,
                    font: { family: 'Poppins', size: 11 },
                    autoSkip: false,
                    callback: function (valor) { return recortar(this.getLabelForValue(valor)) },
                },
            },
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                ...tooltipBase(tokens),
                displayColors: false,
                callbacks: {
                    label: (ctx) => {
                        const fila = barras[ctx.dataIndex]
                        const dias = ctx.parsed.x
                        const cuando = dias < 0
                            ? `${plural(Math.abs(dias), 'día', 'días')} después del evento`
                            : `${plural(dias, 'día', 'días')} antes`
                        return `${String(fila.plan).toUpperCase()} · ${cuando}`
                    },
                },
            },
        },
    }), [barras, tokens])

    return <Bar data={data} options={options} />
}

// ----------------------------------------------------------------- panel ---

export const AnaliticaFuncionesNuevas = ({ invitacionesReales, mes, onMesesDisponibles }) => {
    const datos = useFuncionesNuevas(invitacionesReales, mes)

    const meses = datos.mesesDisponibles

    useEffect(() => {
        if (meses) onMesesDisponibles(meses)
    }, [meses, onMesesDisponibles])

    if (datos.cargando) return <div className={styles.empty}>Cargando funciones nuevas…</div>
    if (datos.error) return <div className={styles.empty}>No se pudieron cargar: {datos.error}</div>

    if (datos.vacio) {
        return (
            <div className={styles.empty}>
                {mes === 'todo'
                    ? 'Todavía no hay eventos que analizar.'
                    : `Sin invitaciones creadas en ${nombreDeMes(mes)}.`}
            </div>
        )
    }

    const { save, photo } = datos
    const destacado = photo.lista[0]

    return (
        <div className={styles.tablero}>
            <section className={styles.hero}>
                <div className={styles.heroMitad}>
                    <DonaAdopcion
                        usan={save.eventos}
                        total={save.podian}
                        color={MARCA.verde}
                        valor={`${pct(save.eventos, save.podian)}%`}
                        etiqueta="lo usan"
                    />
                    <div className={styles.heroDatos}>
                        <h2 className={styles.heroLabel}>Save the date</h2>
                        <div className={styles.heroFila}>
                            <span className={styles.heroCifra}>{save.eventos} de {save.podian}</span>
                            <span className={styles.heroTexto}>eventos que podían tener uno</span>
                        </div>
                        {save.total > 0 && (
                            <>
                                <div className={styles.heroFila}>
                                    <span className={styles.heroCifra}>
                                        {plural(save.medianaTrasLaInvitacion, 'día', 'días')}
                                    </span>
                                    <span className={styles.heroTexto}>después de la venta lo arman</span>
                                </div>
                                {save.barras.length > 0 && (
                                    <div className={styles.heroFila}>
                                        <span className={styles.heroCifra}>
                                            {plural(save.medianaAntesDelEvento, 'día', 'días')}
                                        </span>
                                        <span className={styles.heroTexto}>antes del evento se publica</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className={`${styles.heroMitad} ${styles.heroMitadDerecha}`}>
                    <DonaAdopcion
                        usan={photo.usaron}
                        total={photo.celebrados.length}
                        color={MARCA.lila}
                        valor={`${pct(photo.usaron, photo.celebrados.length)}%`}
                        etiqueta="lo usó"
                    />
                    <div className={styles.heroDatos}>
                        <h2 className={styles.heroLabel}>Photo wall</h2>
                        <div className={styles.heroFila}>
                            <span className={styles.heroCifra}>
                                {photo.usaron} de {photo.celebrados.length}
                            </span>
                            <span className={styles.heroTexto}>eventos ya celebrados</span>
                        </div>
                        <div className={styles.heroFila}>
                            <span className={styles.heroCifra}>{plural(photo.total, 'foto', 'fotos')}</span>
                            <span className={styles.heroTexto}>
                                {photo.total > 0
                                    ? `subidas por ${plural(photo.autores, 'invitado', 'invitados')}`
                                    : 'ningún invitado ha subido una'}
                            </span>
                        </div>
                        {photo.porAutor !== null && (
                            <div className={styles.heroFila}>
                                <span className={styles.heroCifra}>{decimal(photo.porAutor)}</span>
                                <span className={styles.heroTexto}>fotos por invitado que participó</span>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <div className={styles.fila}>
                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.cardLabel}>Save the date · cuánto antes del evento se publica</h2>
                        <div className={styles.leyenda}>
                            <span><i style={{ background: MARCA.navy }} />PRO</span>
                            <span><i style={{ background: MARCA.lila }} />Lite</span>
                            <span><i style={{ background: MARCA.verde }} />Free</span>
                        </div>
                    </header>

                    {save.barras.length === 0 ? (
                        <div className={styles.vacio}>
                            Ninguna invitación de este periodo tiene save the date con fecha de evento.
                        </div>
                    ) : (
                        <div className={styles.grafica}>
                            <GraficaAnticipacion barras={save.barras} />
                        </div>
                    )}

                    {save.tramos.length > 0 && (
                        <div className={styles.armado}>
                            <div className={styles.armadoHead}>
                                <span className={styles.armadoTitulo}>
                                    Cuánto tardan en armarlo después de la invitación
                                </span>
                                <span>mediana {plural(save.medianaTrasLaInvitacion, 'día', 'días')}</span>
                            </div>
                            <div className={styles.armadoBarra}>
                                {save.tramos.map(t => (
                                    <span
                                        key={t.etiqueta}
                                        className={styles.armadoTramo}
                                        style={{ flex: t.n, background: t.fondo, color: t.texto }}
                                        title={`${t.n} ${t.etiqueta}`}
                                    >
                                        <b>{t.n}</b>{t.etiqueta}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.cardLabel}>
                            Photo wall · {plural(photo.celebrados.length, 'evento celebrado', 'eventos celebrados')}
                        </h2>
                        <span className={styles.cardNota}>cada cuadro es un evento</span>
                    </header>

                    {photo.celebrados.length === 0 ? (
                        <div className={styles.vacio}>Ningún evento de este periodo se ha celebrado.</div>
                    ) : (
                        <div className={styles.waffleScroll}>
                            <div className={styles.waffle}>
                                {photo.celebrados.map(e => (
                                    <span
                                        key={e.id}
                                        className={styles.waffleCuadro}
                                        style={{ background: e.uso ? MARCA.navy : MARCA.crema }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {destacado && (
                        <div className={styles.destacado}>
                            <span className={styles.destacadoIcono}><Camera size={20} /></span>
                            <div className={styles.destacadoNombre}>
                                <b title={destacado.nombre}>{destacado.nombre}</b>
                                <span>
                                    {photo.eventos === 1
                                        ? 'el único evento que lo usó'
                                        : `el que más fotos tiene de ${photo.eventos}`}
                                </span>
                            </div>
                            <div className={styles.destacadoCifra}>
                                <b>{miles(destacado.fotos)}</b>
                                <span>
                                    {destacado.fotos === 1 ? 'foto' : 'fotos'} · {plural(destacado.autores, 'invitado', 'invitados')}
                                </span>
                            </div>
                        </div>
                    )}

                    <p className={styles.pie}>
                        Solo cuentan los eventos que ya pasaron: nadie sube fotos de una fiesta que no ha
                        ocurrido.
                        {photo.celebrados.length > 0 &&
                            ` Con ${photo.usaron} de ${photo.celebrados.length}, ${photo.usaron === 0 || pct(photo.usaron, photo.celebrados.length) < 20 ? 'el photo wall todavía no se descubre.' : 'el photo wall ya se usa.'}`}
                    </p>
                </section>
            </div>
        </div>
    )
}
