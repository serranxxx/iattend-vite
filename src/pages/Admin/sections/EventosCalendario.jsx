/*
  Calendario de eventos, al estilo del calendario de Apple: una sola rejilla de
  semanas que corre de mes en mes sin cortes, con scroll vertical continuo.

  Decisiones que vale la pena conocer:

  · El rango va del mes del primer evento al del último, incluyendo siempre el
    mes actual. No se recortan los meses vacíos de en medio porque son los que
    dan la sensación de distancia: ver tres meses sin nada dice tanto como ver
    uno lleno.

  · El encabezado no es fijo por mes: sigue a la semana que está arriba del
    scroll, como hace Apple. Por eso cada fila declara su mes y un listener de
    scroll lee la primera visible.

  · `event_date` es timestamptz a medianoche UTC. `fechaDeEvento` se queda con
    la parte de fecha del string, porque convertirlo a hora local corre el día
    hacia atrás en México.

  · La semana arranca en domingo. El locale `es` de dayjs la arranca en lunes,
    así que `startOf('week')` desalineaba la rejilla un día entero respecto a
    los encabezados: el 1 de octubre, que es jueves, caía bajo "Mié".
*/

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { fechaDeEvento } from '../adminConstants'
import styles from './EventosCalendario.module.css'

dayjs.locale('es')

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

// Paleta auxiliar completa. Cada evento se queda siempre con el mismo color,
// como pasa con los calendarios de una app de calendario: el color no codifica
// un dato, sirve para reconocer el mismo evento de un mes a otro.
const COLORES = ['azul', 'morado', 'verde', 'naranja', 'rojo']

const colorDeEvento = (id) => {
    const texto = String(id ?? '')
    let suma = 0
    for (let i = 0; i < texto.length; i += 1) suma = (suma + texto.charCodeAt(i)) % 9973
    return COLORES[suma % COLORES.length]
}

// `day()` devuelve 0 para domingo sin importar el locale; `startOf('week')` no,
// porque en español la semana empieza en lunes.
const domingoDe = (fecha) => fecha.subtract(fecha.day(), 'day').startOf('day')

export const EventosCalendario = ({ eventos, onSelect, seleccionado }) => {
    const scrollRef = useRef(null)
    const filasRef = useRef([])
    const hoyRef = useRef(null)

    const [mesVisible, setMesVisible] = useState(() => dayjs().format('YYYY-MM'))

    // Eventos agrupados por día, para no recorrer la lista en cada celda.
    const porDia = useMemo(() => {
        const mapa = new Map()

        eventos.forEach(evento => {
            const clave = fechaDeEvento(evento)
            if (!clave) return
            mapa.set(clave, [...(mapa.get(clave) ?? []), evento])
        })

        return mapa
    }, [eventos])

    const semanas = useMemo(() => {
        const fechas = eventos.map(fechaDeEvento).filter(Boolean).map(f => dayjs(f))
        const hoy = dayjs()

        const primera = fechas.reduce((min, f) => (f.isBefore(min) ? f : min), hoy)
        const ultima = fechas.reduce((max, f) => (f.isAfter(max) ? f : max), hoy)

        // De domingo a sábado, arrancando en la semana del día 1 del primer mes.
        const cursor = domingoDe(primera.startOf('month'))
        const fin = domingoDe(ultima.endOf('month')).add(6, 'day')

        const filas = []
        let semana = cursor

        while (semana.isBefore(fin)) {
            filas.push({
                clave: semana.format('YYYY-MM-DD'),
                // El mes de una semana es el de su jueves: es el criterio que
                // usa ISO y evita que una semana partida se cuente en el mes
                // al que casi no pertenece.
                mes: semana.add(3, 'day').format('YYYY-MM'),
                dias: Array.from({ length: 7 }, (_, i) => semana.add(i, 'day')),
            })
            semana = semana.add(1, 'week')
        }

        return filas
    }, [eventos])

    // Al abrir, el calendario arranca en la semana de hoy.
    useLayoutEffect(() => {
        hoyRef.current?.scrollIntoView({ block: 'start' })
    }, [])

    // El encabezado sigue a la semana que está arriba del scroll.
    useEffect(() => {
        const contenedor = scrollRef.current
        if (!contenedor) return

        let pendiente = false

        const alDesplazar = () => {
            if (pendiente) return
            pendiente = true

            requestAnimationFrame(() => {
                pendiente = false
                const limite = contenedor.getBoundingClientRect().top + 8
                const visible = filasRef.current.find(fila => fila && fila.getBoundingClientRect().bottom > limite)
                if (visible?.dataset.mes) setMesVisible(visible.dataset.mes)
            })
        }

        alDesplazar()
        contenedor.addEventListener('scroll', alDesplazar, { passive: true })
        return () => contenedor.removeEventListener('scroll', alDesplazar)
    }, [semanas])

    const irA = (mes) => {
        const indice = semanas.findIndex(fila => fila.mes === mes)
        if (indice >= 0) filasRef.current[indice]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const mesesConSemanas = useMemo(
        () => [...new Set(semanas.map(fila => fila.mes))],
        [semanas],
    )

    const indiceMes = mesesConSemanas.indexOf(mesVisible)
    const titulo = dayjs(`${mesVisible}-01`)

    return (
        <div className={styles.calendario}>
            <header className={styles.barra}>
                <h2 className={styles.mes}>
                    <b>{titulo.format('MMMM')}</b> {titulo.format('YYYY')}
                </h2>

                <div className={styles.controles}>
                    <button
                        type='button'
                        aria-label='Mes anterior'
                        className={styles.flecha}
                        disabled={indiceMes <= 0}
                        onClick={() => irA(mesesConSemanas[indiceMes - 1])}
                    >
                        <ChevronLeft size={16} />
                    </button>

                    <button
                        type='button'
                        className={styles.hoyBtn}
                        onClick={() => hoyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    >
                        Hoy
                    </button>

                    <button
                        type='button'
                        aria-label='Mes siguiente'
                        className={styles.flecha}
                        disabled={indiceMes < 0 || indiceMes >= mesesConSemanas.length - 1}
                        onClick={() => irA(mesesConSemanas[indiceMes + 1])}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </header>

            <div className={styles.encabezadoDias}>
                {DIAS.map(dia => <span key={dia}>{dia}</span>)}
            </div>

            <div className={styles.scroll} ref={scrollRef}>
                {semanas.map((fila, indice) => {
                    const tieneHoy = fila.dias.some(dia => dia.isSame(dayjs(), 'day'))

                    return (
                        <div
                            className={styles.semana}
                            key={fila.clave}
                            data-mes={fila.mes}
                            ref={(nodo) => {
                                filasRef.current[indice] = nodo
                                if (tieneHoy) hoyRef.current = nodo
                            }}
                        >
                            {fila.dias.map(dia => {
                                const clave = dia.format('YYYY-MM-DD')
                                const delDia = porDia.get(clave) ?? []
                                const esHoy = dia.isSame(dayjs(), 'day')

                                return (
                                    <div className={styles.dia} key={clave}>
                                        <span className={styles.numeroFila}>
                                            <span className={`${styles.numero} ${esHoy ? styles.numeroHoy : ''}`}>
                                                {/* El día 1 lleva el mes al lado, que es
                                                    lo que marca el cambio en una rejilla
                                                    continua sin separadores. */}
                                                {dia.date() === 1 ? dia.format('D MMM') : dia.date()}
                                            </span>
                                        </span>

                                        <div className={styles.eventos}>
                                            {delDia.map(evento => (
                                                <button
                                                    type='button'
                                                    key={evento.id}
                                                    className={`${styles.evento} ${styles[colorDeEvento(evento.id)]} ${seleccionado?.id === evento.id ? styles.eventoActivo : ''}`}
                                                    onClick={() => onSelect(evento)}
                                                    title={`${evento.name} · ${evento.user_email ?? ''}`}
                                                >
                                                    <span className={styles.marca} />
                                                    <span className={styles.eventoNombre}>{evento.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
