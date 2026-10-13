import { useMemo } from 'react'
import { Dropdown } from 'antd'
import { Link2, MoreHorizontal, PencilLine } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { fechaDeSide } from './useSideEventsAdmin'
import styles from './EventosSection.module.css'

dayjs.locale('es')

/*
  Side events y Eventos Flash dentro de Admin → Eventos (la subdivisión
  Invitaciones · Side events · Flash). Mismas pestañas que las invitaciones:

  · Activos: con fecha de hoy en adelante o sin fecha.
  · Todos / Pruebas: un side event es de prueba si su invitación lo es; un Flash,
    con la misma regla aplicada a su dueño (o a su planner si es "por enviar").

  Los datos llegan cargados de EventosSection (useSideEventsAdmin), que también
  los usa el calendario.
*/

const hoyIso = () => dayjs().format('YYYY-MM-DD')

export const EventosSecundarios = ({ tipo, tab, sides, invitadosPorSide, error, invitaciones, esPrueba, nombrePlanner, query = '' }) => {
    const invitacionPorId = useMemo(
        () => new Map((invitaciones ?? []).map(i => [i.id, i])),
        [invitaciones]
    )

    const filas = useMemo(() => {
        if (!sides) return []
        const esFlash = tipo === 'flash'
        const hoy = hoyIso()

        const delTipo = sides
            .filter(s => (esFlash ? !s.invitation_id : Boolean(s.invitation_id)))
            .map(s => {
                const invitacion = s.invitation_id ? invitacionPorId.get(s.invitation_id) : null
                return {
                    ...s,
                    invitacion,
                    fecha: fechaDeSide(s),
                    // Un Flash "por enviar" no tiene dueño: se juzga por su planner.
                    prueba: esFlash
                        ? esPrueba({ user_id: s.user_id ?? s.planner_id, user_email: s.user_email })
                        : Boolean(invitacion && esPrueba(invitacion)),
                    plannerId: esFlash ? s.planner_id : invitacion?.planner_id,
                }
            })

        const reales = delTipo.filter(s => !s.prueba)
        const porCreacion = (a, b) => new Date(b.created_at) - new Date(a.created_at)

        if (tab === 'pruebas') return delTipo.filter(s => s.prueba).sort(porCreacion)
        if (tab === 'activos') {
            return reales
                .filter(s => !s.fecha || s.fecha >= hoy)
                .sort((a, b) => {
                    if (a.fecha && b.fecha) return a.fecha.localeCompare(b.fecha)
                    if (a.fecha) return -1
                    if (b.fecha) return 1
                    return porCreacion(a, b)
                })
        }
        return reales.sort(porCreacion)
    }, [sides, tipo, tab, invitacionPorId, esPrueba])

    const visibles = useMemo(() => {
        const texto = query.trim().toLowerCase()
        if (!texto) return filas
        return filas.filter(s => [
            s.name,
            s.user_email,
            s.invitacion?.name,
            s.invitacion?.user_email,
            ...(s.invitacion?.owners ?? []),
            nombrePlanner({ planner_id: s.plannerId }),
        ].some(campo => String(campo ?? '').toLowerCase().includes(texto)))
    }, [filas, query, nombrePlanner])

    if (error) return <div className={styles.card}><div className={styles.empty}>{error}</div></div>
    if (!sides) return <div className={styles.card}><div className={styles.empty}>Cargando…</div></div>

    const esFlash = tipo === 'flash'

    const acciones = (s) => (
        <div className={styles.popup}>
            <a target='_blank' rel='noreferrer' href={`https://www.iattend.events/side-event/${s.id}`} className={styles.popupItem}>
                <Link2 size={14} /> Ver página del evento
            </a>
            {esFlash && (
                <a target='_blank' rel='noreferrer' href={`https://www.iattend.site/dashboard/side?flash=${s.id}`} className={styles.popupItem}>
                    <PencilLine size={14} /> Abrir el editor
                </a>
            )}
            {!esFlash && s.invitation_id && (
                <a target='_blank' rel='noreferrer' href={`https://www.iattend.site/dashboard?id=${s.invitation_id}`} className={styles.popupItem}>
                    <PencilLine size={14} /> Dashboard de la invitación
                </a>
            )}
        </div>
    )

    const usuario = (s) => esFlash
        ? (s.user_email || 'Por enviar')
        : (s.invitacion?.user_email || '—')

    const origen = (s) => esFlash
        ? (s.user_id && s.user_id === s.planner_id ? 'De la planner' : s.user_id ? 'De su cliente' : 'Por enviar')
        : (s.invitacion?.owners?.length ? s.invitacion.owners.join(' & ') : (s.invitacion?.name || 'Invitación borrada'))

    return (
        <div className={styles.card}>
            {visibles.length === 0 ? (
                <div className={styles.empty}>
                    {esFlash ? 'No hay Eventos Flash' : 'No hay side events'} en esta vista.
                </div>
            ) : (
                <div className={`${styles.scroller} ${styles.scrollerSiempre}`}>
                    <div className={styles.table}>
                        <div className={`${styles.row} ${styles.rowSecundario} ${styles.head}`}>
                            <span className={styles.cell}>Nombre</span>
                            <span className={styles.cell}>Usuario</span>
                            <span className={styles.cell}>{esFlash ? 'Para' : 'Invitación'}</span>
                            <span className={styles.cell}>Invitados</span>
                            <span className={styles.cell}>Créditos</span>
                            <span className={styles.cell}>Planner</span>
                            <span className={styles.cell}>Fecha</span>
                            <span className={styles.cell} />
                        </div>

                        {visibles.map(s => {
                            const planner = nombrePlanner({ planner_id: s.plannerId })
                            return (
                                <div className={`${styles.row} ${styles.rowSecundario}`} key={s.id}>
                                    <span className={`${styles.cell} ${styles.name}`}>{s.name || 'Sin nombre'}</span>
                                    <span className={`${styles.cell} ${styles.email}`}>{usuario(s)}</span>
                                    <span className={`${styles.cell} ${styles.email}`}>{origen(s)}</span>
                                    <span className={styles.cell}>{invitadosPorSide.get(s.id) || 0}</span>
                                    {/* Los side events de una invitación gastan los créditos de
                                        ella; solo el Flash tiene los suyos. */}
                                    <span className={`${styles.cell} ${esFlash ? '' : styles.dateEmpty}`}>
                                        {esFlash ? Number(s.credits ?? 0) : 'de la invitación'}
                                    </span>
                                    <span className={`${styles.cell} ${planner ? styles.planner : styles.dateEmpty}`}>
                                        {planner || 'Sin planner'}
                                    </span>
                                    <span className={`${styles.cell} ${s.fecha ? styles.date : styles.dateEmpty}`}>
                                        {s.fecha ? dayjs(s.fecha).format('DD MMM') : 'sin fecha'}
                                    </span>
                                    <span className={styles.cell}>
                                        <Dropdown trigger={['click']} placement='bottomRight' popupRender={() => acciones(s)}>
                                            <button type='button' aria-label='Acciones' className={styles.iconBtn}>
                                                <MoreHorizontal size={15} />
                                            </button>
                                        </Dropdown>
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
