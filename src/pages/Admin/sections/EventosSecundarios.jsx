import { urlSide } from '../../../helpers/invitation/sideEventLink'
import { useMemo } from 'react'
import { Dropdown } from 'antd'
import { Coins, Link2, MoreHorizontal, PencilLine } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { clasificarSide } from './useSideEventsAdmin'
import styles from './EventosSection.module.css'

dayjs.locale('es')

/*
  Side events y Pops dentro de Admin → Eventos (la subdivisión
  Invitaciones · Side events · Pop). Mismas pestañas que las invitaciones:

  · Activos: con fecha de hoy en adelante o sin fecha.
  · Todos / Pruebas: un side event es de prueba si su invitación lo es; un Pop,
    con la misma regla aplicada a su dueño (o a su planner si es "por enviar").

  Los datos los carga AdminLayout (useSideEventsAdmin): también los usan el
  calendario y el resumen de la topbar.
*/

// `onCreditos(pop)`: abre la recarga de créditos de un Pop (EventosSection).
export const EventosSecundarios = ({ tipo, tab, sides, invitadosPorSide, error, invitaciones, esPrueba, nombrePlanner, onCreditos, query = '' }) => {
    const invitacionPorId = useMemo(
        () => new Map((invitaciones ?? []).map(i => [i.id, i])),
        [invitaciones]
    )

    const filas = useMemo(() => {
        if (!sides) return []
        const esPop = tipo === 'pop'

        const delTipo = sides
            .map(s => ({ ...s, ...clasificarSide(s, invitacionPorId, esPrueba) }))
            .filter(s => s.pop === esPop)
            .map(s => ({ ...s, plannerId: esPop ? s.planner_id : s.invitacion?.planner_id }))

        const reales = delTipo.filter(s => !s.prueba)
        const porCreacion = (a, b) => new Date(b.created_at) - new Date(a.created_at)

        if (tab === 'pruebas') return delTipo.filter(s => s.prueba).sort(porCreacion)
        if (tab === 'activos') {
            return reales
                .filter(s => s.activo)
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

    const esPop = tipo === 'pop'

    const acciones = (s) => (
        <div className={styles.popup}>
            <a target='_blank' rel='noreferrer' href={urlSide(s)} className={styles.popupItem}>
                <Link2 size={14} /> Ver página del evento
            </a>
            {esPop && (
                <a target='_blank' rel='noreferrer' href={`https://www.iattend.site/dashboard/side?pop=${s.id}`} className={styles.popupItem}>
                    <PencilLine size={14} /> Abrir el editor
                </a>
            )}
            {esPop && onCreditos && (
                <button type='button' className={styles.popupItem} onClick={() => onCreditos(s)}>
                    <Coins size={14} /> Agregar créditos
                </button>
            )}
            {!esPop && s.invitation_id && (
                <a target='_blank' rel='noreferrer' href={`https://www.iattend.site/dashboard?id=${s.invitation_id}`} className={styles.popupItem}>
                    <PencilLine size={14} /> Dashboard de la invitación
                </a>
            )}
        </div>
    )

    const usuario = (s) => esPop
        ? (s.user_email || 'Por enviar')
        : (s.invitacion?.user_email || '—')

    const origen = (s) => esPop
        ? (s.user_id && s.user_id === s.planner_id ? 'De la planner' : s.user_id ? 'De su cliente' : 'Por enviar')
        : (s.invitacion?.owners?.length ? s.invitacion.owners.join(' & ') : (s.invitacion?.name || 'Invitación borrada'))

    return (
        <div className={styles.card}>
            {visibles.length === 0 ? (
                <div className={styles.empty}>
                    {esPop ? 'No hay Pops' : 'No hay side events'} en esta vista.
                </div>
            ) : (
                <div className={`${styles.scroller} ${styles.scrollerSiempre}`}>
                    <div className={styles.table}>
                        <div className={`${styles.row} ${styles.rowSecundario} ${styles.head}`}>
                            <span className={styles.cell}>Nombre</span>
                            <span className={styles.cell}>Usuario</span>
                            <span className={styles.cell}>{esPop ? 'Para' : 'Invitación'}</span>
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
                                        ella; solo el Pop tiene los suyos. */}
                                    <span className={`${styles.cell} ${esPop ? '' : styles.dateEmpty}`}>
                                        {esPop ? Number(s.credits ?? 0) : 'de la invitación'}
                                    </span>
                                    <span className={`${styles.cell} ${planner ? '' : styles.dateEmpty}`}>
                                        {planner
                                            ? <span className={styles.plannerTag} title={planner}>{planner}</span>
                                            : 'Sin planner'}
                                    </span>
                                    <span className={`${styles.cell} ${s.fecha ? styles.date : styles.dateEmpty}`}>
                                        {s.fecha ? dayjs(s.fecha).format('DD MMM') : 'sin fecha'}
                                        {/* Pop de varias fechas: "14 oct +1" (todas en el title). */}
                                        {s.fechas?.length > 1 && (
                                            <span title={s.fechas.map(f => dayjs(f).format('DD MMM')).join(' · ')}> +{s.fechas.length - 1}</span>
                                        )}
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
