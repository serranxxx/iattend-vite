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

  · El color dice el tipo: invitaciones en azul, side events en violeta y
    Eventos Flash en verde. Los días pasados van en gris, con la barra del
    color de su tipo.

  · Cada evento llega armado desde EventosSection: { key, tipo, nombre, fecha,
    titulo }.
*/

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import styles from './EventosCalendario.module.css'

dayjs.locale('es')

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const SEMANAS = 5
const SALTO = 4

const TIPOS = [
    { tipo: 'invitacion', label: 'Invitaciones', color: 'azul' },
    { tipo: 'side', label: 'Side events', color: 'violeta' },
    { tipo: 'flash', label: 'Flash', color: 'verde' },
]
const COLOR_POR_TIPO = Object.fromEntries(TIPOS.map(t => [t.tipo, t.color]))

// `day()` devuelve 0 para domingo sin importar el locale.
const domingoDe = (fecha) => fecha.subtract(fecha.day(), 'day').startOf('day')

export const EventosCalendario = ({ eventos, onSelect, seleccionado }) => {
    // Desplazamiento en semanas respecto a la semana actual.
    const [desfase, setDesfase] = useState(0)

    // Eventos agrupados por día, para no recorrer la lista en cada celda.
    const porDia = useMemo(() => {
        const mapa = new Map()
        eventos.forEach(evento => {
            const clave = evento.fecha
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
                <div className={styles.leyenda}>
                    {TIPOS.map(t => (
                        <span key={t.tipo}><i className={styles[t.color]} />{t.label}</span>
                    ))}
                </div>
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
                                    key={evento.key}
                                    className={`${styles.evento} ${styles[COLOR_POR_TIPO[evento.tipo]]} ${pasado ? styles.eventoPasado : ''} ${seleccionado === evento.key ? styles.eventoActivo : ''}`}
                                    onClick={() => onSelect(evento)}
                                    title={evento.titulo}
                                >
                                    {evento.nombre}
                                </button>
                            ))}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
