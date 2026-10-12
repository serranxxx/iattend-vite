/*
  Calendario de eventos (Admin → Eventos › Calendario).

  Cinco semanas a partir de la semana actual; ‹ › se mueven de 4 en 4 semanas
  y "Hoy" regresa. El título es el mes de la semana de en medio.

  Decisiones que vale la pena conocer:

  · `event_date` es timestamptz a medianoche UTC. `fechaDeEvento` se queda con
    la parte de fecha del string, porque convertirlo a hora local corre el día
    hacia atrás en México.

  · La semana arranca en domingo. El locale `es` de dayjs la arranca en lunes,
    así que `startOf('week')` desalinearía la rejilla un día entero respecto a
    los encabezados; por eso `domingoDe`.

  · Cada evento se queda siempre con el mismo color (por su id): no codifica un
    dato, sirve para reconocerlo de una semana a otra. Los días pasados van en
    gris.
*/

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { fechaDeEvento } from '../adminConstants'
import styles from './EventosCalendario.module.css'

dayjs.locale('es')

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const SEMANAS = 5
const SALTO = 4

const COLORES = ['rojo', 'azul', 'ambar', 'verde', 'violeta']

const colorDeEvento = (id) => {
    const texto = String(id ?? '')
    let suma = 0
    for (let i = 0; i < texto.length; i += 1) suma = (suma + texto.charCodeAt(i)) % 9973
    return COLORES[suma % COLORES.length]
}

// `day()` devuelve 0 para domingo sin importar el locale.
const domingoDe = (fecha) => fecha.subtract(fecha.day(), 'day').startOf('day')

export const EventosCalendario = ({ eventos, onSelect, seleccionado }) => {
    // Desplazamiento en semanas respecto a la semana actual.
    const [desfase, setDesfase] = useState(0)

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

    const hoy = dayjs().startOf('day')
    const inicio = domingoDe(hoy).add(desfase, 'week')
    const dias = Array.from({ length: SEMANAS * 7 }, (_, i) => inicio.add(i, 'day'))
    const enMedio = inicio.add(Math.floor(SEMANAS / 2), 'week').add(3, 'day')

    return (
        <div className={styles.calendario}>
            <header className={styles.barra}>
                <h2 className={styles.mes}>
                    {enMedio.format('MMMM')} <span>{enMedio.format('YYYY')}</span>
                </h2>
                <button type='button' aria-label='Semanas anteriores' className={styles.boton} onClick={() => setDesfase(d => d - SALTO)}>
                    <ChevronLeft size={16} />
                </button>
                <button type='button' className={`${styles.boton} ${styles.botonHoy}`} onClick={() => setDesfase(0)}>
                    Hoy
                </button>
                <button type='button' aria-label='Semanas siguientes' className={styles.boton} onClick={() => setDesfase(d => d + SALTO)}>
                    <ChevronRight size={16} />
                </button>
            </header>

            <div className={styles.encabezadoDias}>
                {DIAS.map(dia => <span key={dia}>{dia}</span>)}
            </div>

            <div className={styles.rejilla}>
                {dias.map(dia => {
                    const clave = dia.format('YYYY-MM-DD')
                    const delDia = porDia.get(clave) ?? []
                    const esHoy = dia.isSame(hoy, 'day')
                    const pasado = dia.isBefore(hoy, 'day')

                    return (
                        <div className={`${styles.dia} ${pasado ? styles.diaPasado : ''}`} key={clave}>
                            <div className={styles.numeroFila}>
                                <span className={`${styles.numero} ${esHoy ? styles.numeroHoy : ''}`}>
                                    {/* El día 1 lleva el mes: marca el cambio de mes en la rejilla. */}
                                    {dia.date() === 1 ? dia.format('D MMM') : dia.date()}
                                </span>
                            </div>

                            {delDia.map(evento => (
                                <button
                                    type='button'
                                    key={evento.id}
                                    className={`${styles.evento} ${pasado ? styles.eventoPasado : styles[colorDeEvento(evento.id)]} ${seleccionado?.id === evento.id ? styles.eventoActivo : ''}`}
                                    onClick={() => onSelect(evento)}
                                    title={`${evento.name} · ${evento.user_email ?? ''}`}
                                >
                                    {evento.name}
                                </button>
                            ))}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
