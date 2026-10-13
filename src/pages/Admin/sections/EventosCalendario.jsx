/*
  Calendario de eventos (Admin → Eventos › Calendario).

  Un scroll continuo de semanas, sin páginas: va desde la semana del evento más
  viejo hasta la del más lejano (con margen alrededor de hoy) y abre parado en
  la semana actual. "Hoy" regresa. El título es el mes de la semana que está
  arriba del scroll.

  Decisiones que vale la pena conocer:

  · Las semanas tienen alto fijo (según el tamaño elegido: Compacto · Normal ·
    Amplio) y cada evento es un renglón de alto fijo. Así el texto nunca se
    aplasta: los que no caben se juntan en "+N más", que abre la lista del día.

  · La semana arranca en domingo. El locale `es` de dayjs la arranca en lunes,
    así que `startOf('week')` desalinearía la rejilla un día entero respecto a
    los encabezados; por eso `domingoDe`.

  · El color dice el tipo: invitaciones en azul, side events en violeta y
    Eventos Flash en verde. Los días pasados van en gris, con la barra del
    color de su tipo.

  · Cada evento llega armado desde EventosSection: { key, tipo, nombre, fecha,
    titulo }. `fecha` es YYYY-MM-DD de calendario, sin zona horaria.
*/

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Dropdown } from 'antd'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { Segmentado } from '../AdminTopbar'
import styles from './EventosCalendario.module.css'

dayjs.locale('es')

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const TIPOS = [
    { tipo: 'invitacion', label: 'Invitaciones', color: 'azul' },
    { tipo: 'side', label: 'Side events', color: 'violeta' },
    { tipo: 'flash', label: 'Flash', color: 'verde' },
]
const COLOR_POR_TIPO = Object.fromEntries(TIPOS.map(t => [t.tipo, t.color]))

// Alto de cada semana por tamaño. El evento mide ALTO_EVENTO + GAP; el número
// del día y el padding se comen CABECERA_DIA.
const TAMANOS = [
    { value: 'compacto', label: 'Compacto', alto: 86 },
    { value: 'normal', label: 'Normal', alto: 124 },
    { value: 'amplio', label: 'Amplio', alto: 184 },
]
const ALTO_EVENTO = 20
const GAP = 3
const CABECERA_DIA = 6 + 20 + 4 + 6
const TAMANO_KEY = 'iattend_admin_calendario_tamano'

// Margen alrededor de hoy aunque no haya eventos ahí.
const SEMANAS_ATRAS = 8
const SEMANAS_ADELANTE = 26

// `day()` devuelve 0 para domingo sin importar el locale.
const domingoDe = (fecha) => fecha.subtract(fecha.day(), 'day').startOf('day')

export const EventosCalendario = ({ eventos, onSelect, seleccionado }) => {
    const scrollRef = useRef(null)
    const [tamano, setTamano] = useState(() => localStorage.getItem(TAMANO_KEY) || 'normal')
    const altoSemana = (TAMANOS.find(t => t.value === tamano) ?? TAMANOS[1]).alto
    const caben = Math.max(1, Math.floor((altoSemana - CABECERA_DIA + GAP) / (ALTO_EVENTO + GAP)))

    useEffect(() => { localStorage.setItem(TAMANO_KEY, tamano) }, [tamano])

    const hoy = dayjs().startOf('day')
    const semanaDeHoy = domingoDe(hoy)
    const semanaDeHoyMs = semanaDeHoy.valueOf()

    // Eventos agrupados por día, para no recorrer la lista en cada celda.
    const porDia = useMemo(() => {
        const mapa = new Map()
        eventos.forEach(evento => {
            if (!evento.fecha) return
            mapa.set(evento.fecha, [...(mapa.get(evento.fecha) ?? []), evento])
        })
        return mapa
    }, [eventos])

    // Rango de semanas: del evento más viejo al más lejano, con margen en hoy.
    const { inicio, semanas } = useMemo(() => {
        const fechas = [...porDia.keys()].sort()
        const base = dayjs(semanaDeHoyMs)
        let desde = base.subtract(SEMANAS_ATRAS, 'week')
        let hasta = base.add(SEMANAS_ADELANTE, 'week')
        if (fechas.length) {
            const primera = domingoDe(dayjs(fechas[0]))
            const ultima = domingoDe(dayjs(fechas[fechas.length - 1]))
            if (primera.isBefore(desde)) desde = primera
            if (ultima.isAfter(hasta)) hasta = ultima
        }
        return { inicio: desde, semanas: hasta.diff(desde, 'week') + 1 }
    }, [porDia, semanaDeHoyMs])

    const indiceDeHoy = semanaDeHoy.diff(inicio, 'week')
    const [semanaArriba, setSemanaArriba] = useState(indiceDeHoy)

    const irA = (indice, suave = true) => {
        scrollRef.current?.scrollTo({ top: Math.max(0, indice) * altoSemana, behavior: suave ? 'smooth' : 'auto' })
    }

    // Abre en la semana actual, y la conserva al cambiar de tamaño.
    useLayoutEffect(() => { irA(semanaArriba, false) }, [altoSemana])
    const inicioMs = inicio.valueOf()
    useLayoutEffect(() => { irA(indiceDeHoy, false) }, [inicioMs])

    const alScroll = () => {
        const top = scrollRef.current?.scrollTop ?? 0
        setSemanaArriba(Math.round(top / altoSemana))
    }

    // El mes del título: el del jueves de la semana de arriba (la que más días
    // tiene en ese mes).
    const referencia = inicio.add(semanaArriba, 'week').add(4, 'day')

    const botonEvento = (evento, pasado, extra = '') => (
        <button
            type='button'
            key={evento.key}
            className={`${styles.evento} ${styles[COLOR_POR_TIPO[evento.tipo]]} ${pasado ? styles.eventoPasado : ''} ${seleccionado === evento.key ? styles.eventoActivo : ''} ${extra}`}
            onClick={() => onSelect(evento)}
            title={evento.titulo}
        >
            {evento.nombre}
        </button>
    )

    return (
        <div className={styles.calendario}>
            <header className={styles.barra}>
                <h2 className={styles.mes}>
                    {referencia.format('MMMM')} <span>{referencia.format('YYYY')}</span>
                </h2>
                <div className={styles.leyenda}>
                    {TIPOS.map(t => (
                        <span key={t.tipo}><i className={styles[t.color]} />{t.label}</span>
                    ))}
                </div>
                <Segmentado ariaLabel='Tamaño del calendario' valor={tamano} onCambio={setTamano} opciones={TAMANOS} />
                <button type='button' className={`${styles.boton} ${styles.botonHoy}`} onClick={() => irA(indiceDeHoy)}>
                    Hoy
                </button>
            </header>

            <div className={styles.encabezadoDias}>
                {DIAS.map(dia => <span key={dia}>{dia}</span>)}
            </div>

            <div className={styles.scroll} ref={scrollRef} onScroll={alScroll}>
                <div className={styles.rejilla} style={{ gridAutoRows: `${altoSemana}px` }}>
                    {Array.from({ length: semanas * 7 }, (_, i) => {
                        const dia = inicio.add(i, 'day')
                        const clave = dia.format('YYYY-MM-DD')
                        const delDia = porDia.get(clave) ?? []
                        const esHoy = dia.isSame(hoy, 'day')
                        const pasado = dia.isBefore(hoy, 'day')
                        // Si no caben todos, el último renglón es "+N más".
                        const visibles = delDia.length > caben ? delDia.slice(0, caben - 1) : delDia
                        const resto = delDia.length - visibles.length

                        return (
                            <div
                                className={`${styles.dia} ${pasado ? styles.diaPasado : ''} ${dia.date() <= 7 ? styles.inicioDeMes : ''}`}
                                key={clave}
                            >
                                <div className={styles.numeroFila}>
                                    <span className={`${styles.numero} ${esHoy ? styles.numeroHoy : ''}`}>
                                        {/* El día 1 lleva el mes: marca el cambio de mes en la rejilla. */}
                                        {dia.date() === 1 ? dia.format('D MMM') : dia.date()}
                                    </span>
                                </div>

                                {visibles.map(evento => botonEvento(evento, pasado))}

                                {resto > 0 && (
                                    <Dropdown
                                        trigger={['click']}
                                        placement='bottomLeft'
                                        popupRender={() => (
                                            <div className={styles.masLista}>
                                                <div className={styles.masTitulo}>{dia.format('dddd D [de] MMMM')}</div>
                                                {delDia.map(evento => botonEvento(evento, pasado, styles.eventoEnLista))}
                                            </div>
                                        )}
                                    >
                                        <button type='button' className={styles.mas}>+{resto} más</button>
                                    </Dropdown>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
