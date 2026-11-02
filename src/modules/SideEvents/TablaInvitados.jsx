import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { ArrowDown, ArrowUp, Check, ChevronRight, ClipboardList, CornerDownRight, Link2 } from 'lucide-react'
import s from './TablaInvitados.module.css'

/*
  Vista compacta de los invitados de un side event / Pop (SideEvents.jsx,
  selector "Pasos · Compacta"): una sola tabla densa, al estilo de una grilla
  de datos, con todo a la mano. Encabezado fijo, columnas que se ordenan con
  un clic (asc → desc → orden de familias) y scroll horizontal si no cabe.

  Sin ordenar, cada titular va seguido de sus acompañantes (companion_id es
  texto con el id del titular en side_events_guests). Recibe la lista ya
  filtrada (buscador y filtros) y no toca datos: copiar link y abrir el
  invitado los resuelve SideEvents. # y Nombre van fijas a la izquierda.

  `formulario` (solo si el Pop tiene uno activo): { porInvitado: Map(guestId →
  respuesta del backend: estado 'completo' | 'pendiente', folio), onAbrir(g) }
  agrega la columna Formulario con un botón que abre sus respuestas.
*/

const ESTADOS = {
    creado: 'creado',
    esperando: 'esperando',
    confirmado: 'confirmado',
    asistente: 'asistente',
    rechazado: 'rechazado',
}

const ORDEN_ESTADO = { creado: 0, esperando: 1, confirmado: 2, asistente: 3, rechazado: 4 }

const fechaCorta = (iso) => {
    if (!iso) return null
    const d = dayjs(iso)
    return d.isValid() ? d.format('DD MMM · HH:mm') : null
}

export const TablaInvitados = ({ invitados, todos, dispatchMap = {}, onCopyLink, onOpen, formulario = null }) => {
    const { t } = useTranslation()
    const [orden, setOrden] = useState(null) // { key, dir: 1 | -1 }

    // Titular de cada acompañante (sobre la lista completa: el titular puede
    // no pasar el filtro) y cuántos acompañantes tiene cada titular.
    const { nombrePorId, acompanantes } = useMemo(() => {
        const nombres = new Map()
        const cuenta = new Map()
        ;(todos ?? invitados).forEach((g) => {
            nombres.set(String(g.id), g.name)
            if (g.companion_id != null) cuenta.set(String(g.companion_id), (cuenta.get(String(g.companion_id)) || 0) + 1)
        })
        return { nombrePorId: nombres, acompanantes: cuenta }
    }, [todos, invitados])

    const envio = (g) => {
        const status = dispatchMap[g.id]?.status
        if (!status || status === 'undefined') return null
        const tono = status === 'failed' ? 'mal' : status === 'read' ? 'visto' : status === 'delivered' ? 'bien' : 'neutro'
        return { label: t(`guests.msg_${status}`, { defaultValue: status }), tono }
    }

    const COLUMNAS = [
        { key: 'nombre', titulo: t('guests.compact_col_name'), ancho: 220, valor: (g) => g.name?.toLowerCase() ?? '' },
        { key: 'estado', titulo: t('guests.compact_col_state'), ancho: 128, valor: (g) => ORDEN_ESTADO[g.state] ?? 9 },
        { key: 'telefono', titulo: t('guests.compact_col_phone'), ancho: 138, valor: (g) => g.phone_number ?? '' },
        { key: 'codigo', titulo: t('guests.compact_col_code'), ancho: 92, valor: (g) => g.password ?? '' },
        { key: 'grupo', titulo: t('guests.compact_col_group'), ancho: 150, valor: (g) => (g.companion_id != null ? nombrePorId.get(String(g.companion_id)) ?? '' : g.name ?? '').toLowerCase() },
        { key: 'etiqueta', titulo: t('guests.compact_col_tag'), ancho: 110, valor: (g) => g.tag ?? '' },
        { key: 'prioridad', titulo: t('guests.compact_col_tier'), ancho: 64, valor: (g) => g.tier ?? 'Z' },
        { key: 'envio', titulo: t('guests.compact_col_delivery'), ancho: 128, valor: (g) => envio(g)?.label ?? '' },
        { key: 'enviado', titulo: t('guests.compact_col_sent'), ancho: 124, valor: (g) => g.invitation_sent_at ?? '' },
        { key: 'respuesta', titulo: t('guests.compact_col_updated'), ancho: 124, valor: (g) => g.last_update_date ?? '' },
        { key: 'llegada', titulo: t('guests.compact_col_arrived'), ancho: 110, valor: (g) => g.arrived_at ?? '' },
        ...(formulario ? [{
            key: 'formulario',
            titulo: t('guests.compact_col_form'),
            ancho: 132,
            valor: (g) => ({ completo: 0, pendiente: 1 })[formulario.porInvitado.get(String(g.id))?.estado] ?? 2,
        }] : []),
    ]

    const celdaFormulario = (g) => {
        const r = formulario.porInvitado.get(String(g.id))
        if (!r) return <span className={s.vacio}>—</span>
        const completo = r.estado === 'completo'
        return (
            <button
                type='button'
                className={s.botonFormulario}
                data-estado={completo ? 'completo' : 'pendiente'}
                onClick={() => formulario.onAbrir(g)}
                title={completo ? t('guests.compact_form_done') : t('guests.compact_form_pending')}
            >
                {completo ? <Check size={12} /> : <ClipboardList size={12} />}
                <span>{completo ? (r.folio || t('guests.compact_form_done')) : t('guests.compact_form_pending')}</span>
            </button>
        )
    }

    const filas = useMemo(() => {
        if (orden) {
            const col = COLUMNAS.find((c) => c.key === orden.key)
            return [...invitados].sort((a, b) => {
                const va = col.valor(a)
                const vb = col.valor(b)
                if (va === vb) return 0
                if (va === '' || va == null) return 1
                if (vb === '' || vb == null) return -1
                return (va < vb ? -1 : 1) * orden.dir
            }).map((g) => ({ g, hijo: false }))
        }
        // Orden de familias: el titular y debajo sus acompañantes.
        const ids = new Set(invitados.map((g) => String(g.id)))
        const hijosDe = new Map()
        invitados.forEach((g) => {
            if (g.companion_id != null && ids.has(String(g.companion_id))) {
                const k = String(g.companion_id)
                if (!hijosDe.has(k)) hijosDe.set(k, [])
                hijosDe.get(k).push(g)
            }
        })
        const lista = []
        invitados.forEach((g) => {
            if (g.companion_id != null && ids.has(String(g.companion_id))) return
            lista.push({ g, hijo: g.companion_id != null })
            ;(hijosDe.get(String(g.id)) ?? []).forEach((h) => lista.push({ g: h, hijo: true }))
        })
        return lista
    }, [invitados, orden, dispatchMap, nombrePorId, formulario])

    const ordenar = (key) => setOrden((prev) => (
        !prev || prev.key !== key ? { key, dir: 1 } : prev.dir === 1 ? { key, dir: -1 } : null
    ))

    const celdaFecha = (iso) => {
        const texto = fechaCorta(iso)
        return texto ? <span className={s.fecha}>{texto}</span> : <span className={s.vacio}>—</span>
    }

    const anchoTotal = COLUMNAS.reduce((a, c) => a + c.ancho, 0) + 40 + 76

    return (
        <div className={s.marco}>
            <div className={s.scroll}>
                <table className={s.tabla} style={{ minWidth: anchoTotal }}>
                    <colgroup>
                        <col style={{ width: 40 }} />
                        {COLUMNAS.map((c) => <col key={c.key} style={{ width: c.ancho }} />)}
                        <col style={{ width: 76 }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th className={s.num}>#</th>
                            {COLUMNAS.map((c) => (
                                <th key={c.key} aria-sort={orden?.key === c.key ? (orden.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                                    <button type='button' className={s.encabezado} onClick={() => ordenar(c.key)}>
                                        <span>{c.titulo}</span>
                                        {orden?.key === c.key && (orden.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                    </button>
                                </th>
                            ))}
                            <th aria-label={t('guests.compact_col_actions')} />
                        </tr>
                    </thead>
                    <tbody>
                        {filas.length === 0 && (
                            <tr>
                                <td colSpan={COLUMNAS.length + 2} className={s.sinFilas}>{t('guests.compact_empty')}</td>
                            </tr>
                        )}
                        {filas.map(({ g, hijo }, i) => {
                            const e = envio(g)
                            const titular = g.companion_id != null ? nombrePorId.get(String(g.companion_id)) : null
                            const nAcomp = acompanantes.get(String(g.id)) || 0
                            const estado = ESTADOS[g.state] ?? 'creado'
                            return (
                                <tr key={g.id} className={hijo ? s.filaHijo : undefined} onDoubleClick={() => onOpen?.(g)}>
                                    <td className={s.num}>{i + 1}</td>
                                    <td>
                                        <span className={s.nombre} title={g.name}>
                                            {hijo && <CornerDownRight size={12} className={s.flechaHijo} />}
                                            <span className={hijo ? s.nombreHijo : s.nombreTitular}>{g.name || '—'}</span>
                                        </span>
                                    </td>
                                    <td>
                                        <span className={s.estado} data-estado={estado}>
                                            <i />{t(`guests.state_${estado}`)}
                                        </span>
                                    </td>
                                    <td className={s.mono}>{g.phone_number || <span className={s.vacio}>—</span>}</td>
                                    <td className={s.mono}>{g.password || <span className={s.vacio}>—</span>}</td>
                                    <td>
                                        {titular
                                            ? <span className={s.grupo} title={titular}>{t('guests.compact_with', { name: titular })}</span>
                                            : nAcomp > 0
                                                ? <span className={s.grupoTitular}>{t('guests.compact_companions', { count: nAcomp })}</span>
                                                : <span className={s.vacio}>—</span>}
                                    </td>
                                    <td>{g.tag ? <span className={s.chip}>{g.tag}</span> : <span className={s.vacio}>—</span>}</td>
                                    <td className={s.centro}>{g.tier || <span className={s.vacio}>—</span>}</td>
                                    <td>{e ? <span className={s.envio} data-tono={e.tono}>{e.label}</span> : <span className={s.vacio}>—</span>}</td>
                                    <td>{celdaFecha(g.invitation_sent_at)}</td>
                                    <td>{celdaFecha(g.last_update_date)}</td>
                                    <td>{celdaFecha(g.arrived_at)}</td>
                                    {formulario && <td>{celdaFormulario(g)}</td>}
                                    <td className={s.acciones}>
                                        <button type='button' className={s.accion} title={t('guests.card_copy_link')} onClick={() => onCopyLink?.(g)}>
                                            <Link2 size={13} />
                                        </button>
                                        <button type='button' className={s.accion} title={t('guests.compact_open')} onClick={() => onOpen?.(g)}>
                                            <ChevronRight size={14} />
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            <div className={s.pie}>
                {t('guests.compact_footer', { count: filas.length })}
                {orden && (
                    <button type='button' className={s.quitarOrden} onClick={() => setOrden(null)}>
                        {t('guests.compact_clear_sort')}
                    </button>
                )}
            </div>
        </div>
    )
}
