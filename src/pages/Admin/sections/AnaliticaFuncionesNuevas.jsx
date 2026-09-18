/*
  Analítica de producto — Etapas 6 y 7 juntas: Save the date y Photo wall.

  Van en la misma pestaña porque son las dos funciones más nuevas y comparten el
  mismo problema: apenas hay datos. Hoy son 2 save the dates y 1 foto sobre 55
  eventos. Con eso no hay promedios ni tendencias que sostener, así que la etapa
  se queda en el conteo, la adopción y el detalle de cada caso. Inventar
  gráficas sobre dos filas sería decorar, no medir.

  Dos particularidades del modelo:

  · `event_photos` se une por `event_id`, no por `invitation_id` como el resto,
    y su columna de tiempo es `uploaded_at` (no tiene `created_at`).

  · Ninguna de las dos tiene lista de invitados ni envíos: el save the date es
    una página pública que se comparte por fuera y el photo wall lo alimentan
    los invitados desde su teléfono.
*/

import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { claveDeMes, mediana, nombreDeMes } from '../analiticaCalculos'
import { traerTodo } from '../analiticaDatos'
import styles from './EventosAnalitica.module.css'

dayjs.locale('es')

const MS_POR_DIA = 86_400_000

const plural = (n, singular, pluralForma) => `${n} ${n === 1 ? singular : pluralForma}`
const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0)
const miles = (n) => new Intl.NumberFormat('es-MX').format(n)

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
                    evento: invitacion.name ?? 'sin nombre',
                    plan: invitacion.plan ?? 'sin plan',
                    activo: s.active !== false,
                    fechaEvento: invitacion.event_date ?? s.event_date,
                    creado,
                    diasTrasLaInvitacion: Math.round((creado - new Date(invitacion.created_at)) / MS_POR_DIA),
                    diasAntesDelEvento: invitacion.event_date
                        ? Math.round((new Date(invitacion.event_date) - creado) / MS_POR_DIA)
                        : null,
                }
            })
            .sort((a, b) => b.creado - a.creado)

        // El universo del save the date no son las 55 invitaciones: solo tiene
        // sentido en un evento que todavía no se celebra.
        const conSave = new Set(saves.map(s => s.invitacionId))
        const porCelebrarse = enElPeriodo.filter(i => i.event_date && new Date(i.event_date) >= hoy)

        // --- photo wall ---
        const fotos = crudo.fotos.filter(f => porId.has(f.event_id))
        const fotosPorEvento = new Map()

        fotos.forEach(f => {
            const evento = fotosPorEvento.get(f.event_id) ?? {
                id: f.event_id,
                nombre: porId.get(f.event_id).name ?? 'sin nombre',
                fotos: 0,
                autores: new Set(),
                ultima: null,
            }
            evento.fotos += 1
            if (f.guest_name) evento.autores.add(f.guest_name)

            const subida = new Date(f.uploaded_at)
            if (!evento.ultima || subida > evento.ultima) evento.ultima = subida

            fotosPorEvento.set(f.event_id, evento)
        })

        const eventosConFotos = [...fotosPorEvento.values()]
            .map(e => ({ ...e, autores: e.autores.size }))
            .sort((a, b) => b.fotos - a.fotos)

        // Y el del photo wall son los eventos que YA se celebraron: nadie sube
        // fotos de una fiesta que no ha pasado.
        const yaCelebrados = enElPeriodo.filter(i => i.event_date && new Date(i.event_date) < hoy)

        return {
            mesesDisponibles,
            eventos: enElPeriodo.length,
            save: {
                total: saves.length,
                activos: saves.filter(s => s.activo).length,
                porCelebrarse: porCelebrarse.length,
                sinSave: porCelebrarse.filter(i => !conSave.has(i.id)).length,
                medianaTrasLaInvitacion: mediana(saves.map(s => s.diasTrasLaInvitacion)),
                medianaAntesDelEvento: mediana(saves.map(s => s.diasAntesDelEvento).filter(d => d !== null)),
                lista: saves,
            },
            photo: {
                total: fotos.length,
                eventos: eventosConFotos.length,
                yaCelebrados: yaCelebrados.length,
                medianaPorEvento: mediana(eventosConFotos.map(e => e.fotos)),
                lista: eventosConFotos,
            },
        }
    }, [crudo, error, invitacionesReales, mes])
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

    return (
        <div className={styles.analitica}>
            <div className={styles.kpis}>
                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Save the dates</span>
                    <span className={styles.kpiValue}>
                        {save.total}
                        <small> de {save.porCelebrarse}</small>
                    </span>
                    <span className={styles.kpiFoot}>
                        {pct(save.total, save.porCelebrarse)}% de los eventos por celebrarse
                    </span>
                </div>

                <div className={`${styles.kpi} ${save.sinSave > 0 ? styles.kpiAcento : ''}`}>
                    <span className={styles.kpiLabel}>Podrían tener uno</span>
                    <span className={styles.kpiValue}>{save.sinSave}</span>
                    <span className={styles.kpiFoot}>
                        eventos por celebrarse todavía sin save the date
                    </span>
                </div>

                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Eventos con photo wall</span>
                    <span className={styles.kpiValue}>
                        {photo.eventos}
                        <small> de {photo.yaCelebrados}</small>
                    </span>
                    <span className={styles.kpiFoot}>
                        {pct(photo.eventos, photo.yaCelebrados)}% de los eventos ya celebrados
                    </span>
                </div>

                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Fotos subidas</span>
                    <span className={styles.kpiValue}>{miles(photo.total)}</span>
                    <span className={styles.kpiFoot}>
                        {photo.eventos > 0
                            ? `mediana de ${photo.medianaPorEvento} por evento con fotos`
                            : 'ningún invitado ha subido una foto'}
                    </span>
                </div>
            </div>

            <div className={styles.bento}>
                <section className={`${styles.card} ${styles.cardAncha}`}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Save the date</h2>
                            <p className={styles.cardSub}>Con qué anticipación se publicaron</p>
                        </div>
                    </header>

                    {save.lista.length === 0 ? (
                        <div className={styles.vacio}>
                            Ninguna invitación de este periodo tiene save the date.
                        </div>
                    ) : (
                        <div className={styles.tablaScroll}>
                            <div className={styles.tabla}>
                                <div className={`${styles.tablaFila} ${styles.tablaHeadCorta} ${styles.tablaHead}`}>
                                    <span>Evento</span>
                                    <span>Plan</span>
                                    <span>Fecha del evento</span>
                                    <span>Creado</span>
                                    <span>Tras la invitación</span>
                                    <span>Antes del evento</span>
                                </div>

                                {save.lista.map(fila => (
                                    <div className={`${styles.tablaFila} ${styles.tablaHeadCorta}`} key={fila.id}>
                                        <span className={styles.celdaNombre}>{fila.evento}</span>
                                        <span className={styles.celdaTenue}>{fila.plan}</span>
                                        <span>
                                            {fila.fechaEvento
                                                ? dayjs(fila.fechaEvento).format('D [de] MMMM YYYY')
                                                : 'sin fecha'}
                                        </span>
                                        <span className={styles.celdaTenue}>
                                            {dayjs(fila.creado).format('D MMM YYYY')}
                                        </span>
                                        <span>{plural(fila.diasTrasLaInvitacion, 'día', 'días')}</span>
                                        <span>
                                            {fila.diasAntesDelEvento === null
                                                ? '—'
                                                : plural(fila.diasAntesDelEvento, 'día', 'días')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <footer className={styles.cardFoot}>
                        {save.total > 0 && (
                            <>
                                Se arman {plural(save.medianaTrasLaInvitacion, 'día', 'días')} después de
                                vender la invitación y se publican {save.medianaAntesDelEvento} días antes
                                del evento.{' '}
                            </>
                        )}
                        Es una página pública que se comparte por fuera: no tiene lista de invitados ni
                        envíos que medir.
                    </footer>
                </section>

                <section className={`${styles.card} ${styles.cardAncha}`}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Photo wall</h2>
                            <p className={styles.cardSub}>
                                Fotos que suben los invitados durante el evento
                            </p>
                        </div>
                    </header>

                    {photo.lista.length === 0 ? (
                        <div className={styles.vacio}>
                            Ningún evento de este periodo tiene fotos subidas.
                        </div>
                    ) : (
                        <ul className={styles.ranking}>
                            {photo.lista.map(evento => (
                                <li className={styles.rankingItem} key={evento.id}>
                                    <span className={styles.rankingNombre} title={evento.nombre}>
                                        {evento.nombre}
                                    </span>
                                    <span className={styles.rankingBarra}>
                                        <span
                                            className={styles.rankingFill}
                                            style={{ width: `${(evento.fotos / photo.lista[0].fotos) * 100}%` }}
                                        />
                                    </span>
                                    <span className={styles.rankingValor}>{evento.fotos}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    <footer className={styles.cardFoot}>
                        {photo.total > 0
                            ? `${plural(photo.total, 'foto subida', 'fotos subidas')} por ${plural(photo.lista.reduce((a, e) => a + e.autores, 0), 'invitado', 'invitados')}. `
                            : ''}
                        El universo son los {photo.yaCelebrados} eventos que ya se celebraron: nadie sube
                        fotos de una fiesta que no ha pasado.
                    </footer>
                </section>
            </div>

            <p className={styles.nota}>
                Las dos son funciones nuevas y con este volumen no hay promedios ni tendencias que
                sostener. Esta etapa se queda en el conteo, la adopción y el detalle hasta que haya datos
                suficientes para decir algo más.
            </p>
        </div>
    )
}
