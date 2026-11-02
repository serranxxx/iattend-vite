import { supabase } from '../../../lib/supabase'
import { urlSide } from '../../../helpers/invitation/sideEventLink'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, FileSpreadsheet, FileText, Link2, Search, X } from 'lucide-react'
import styles from './FormularioVista.module.css'
import { columnasDe, descargarRespuestas } from './descargas'
import { TIPO, fechaCorta, inicialesDe, valorCelda } from './modelo'

/*
  Pestaña Respuestas de la vista completa (handoff 1b): buscador (nombre,
  folio o cualquier respuesta), filtro Todos / Completos / Pendientes, tabla
  con una columna por pregunta del formulario que usa este Pop (snapshot) y
  descarga de lo filtrado en Excel o CSV. Al tocar una fila se abre el
  detalle a la derecha; si está pendiente, ahí se copia su link.
  Se mantiene al día con el aviso del canal side_form_<id> (useRespuestasFormulario).
*/

const ANCHO = { long: 260, multi: 210, check: 130 }
const FILTROS = ['all', 'done', 'pending']

export const RespuestasTab = ({ respuestas, snapshot, eventoId, guestInicial, avisar }) => {
    const { t, i18n } = useTranslation()
    const lang = i18n.language?.startsWith('en') ? 'en' : 'es'
    const [busqueda, setBusqueda] = useState('')
    const [filtro, setFiltro] = useState('all')
    const [abierta, setAbierta] = useState(guestInicial ?? null)
    const [menu, setMenu] = useState(false)
    const menuRef = useRef(null)

    const columnas = useMemo(() => columnasDe(snapshot), [snapshot])
    const todas = useMemo(() => respuestas ?? [], [respuestas])
    const cuenta = {
        all: todas.length,
        done: todas.filter((r) => r.estado === 'completo').length,
        pending: todas.filter((r) => r.estado === 'pendiente').length,
    }

    const filas = useMemo(() => {
        const q = busqueda.trim().toLowerCase()
        return todas.filter((r) => {
            if (filtro === 'done' && r.estado !== 'completo') return false
            if (filtro === 'pending' && r.estado !== 'pendiente') return false
            if (!q) return true
            const celdas = [r.nombre, r.folio, ...columnas.map((f) => valorCelda(r.answers?.[f.id], f.kind ?? f.type, t))]
            return celdas.some((c) => String(c ?? '').toLowerCase().includes(q))
        })
    }, [todas, filtro, busqueda, columnas, t])

    useEffect(() => {
        if (!menu) return
        const fuera = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false) }
        document.addEventListener('mousedown', fuera)
        return () => document.removeEventListener('mousedown', fuera)
    }, [menu])
    useEffect(() => {
        if (!abierta) return
        const esc = (e) => { if (e.key === 'Escape') setAbierta(null) }
        document.addEventListener('keydown', esc)
        return () => document.removeEventListener('keydown', esc)
    }, [abierta])

    const descargar = (formato) => {
        const n = descargarRespuestas({ formato, filas, snapshot, eventoId, t, lang })
        setMenu(false)
        avisar(t(formato === 'csv' ? 'side_events.frm_downloaded_csv' : 'side_events.frm_downloaded_xlsx', { count: n }))
    }

    const copiarLink = async (r) => {
        const base = import.meta.env.VITE_IATTEND_EVENTS_URL || 'https://www.iattend.events'
        try {
            // El link público usa el código del evento (sideEventLink.js), no el número.
            const { data } = await supabase.from('side_events').select('*').eq('id', eventoId).maybeSingle()
            await navigator.clipboard.writeText(`${urlSide(data ?? { id: eventoId }, base)}?registro=${r.token}`)
            avisar(t('side_events.frm_link_copied'))
        } catch {
            avisar(t('side_events.frm_link_error'))
        }
    }

    const detalle = abierta ? todas.find((r) => r.guestId === abierta) : null
    const filtrado = filtro !== 'all' || busqueda.trim()

    return (
        <div className={styles.respuestas}>
            <div className={styles.respBarra}>
                <label className={styles.buscador}>
                    <Search size={16} />
                    <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder={t('side_events.frm_search_ph')} />
                    {busqueda && <button type="button" onClick={() => setBusqueda('')} aria-label={t('side_events.frm_clear')}><X size={14} /></button>}
                </label>
                <div className={styles.segmentado} role="tablist">
                    {FILTROS.map((id) => (
                        <button key={id} type="button" role="tab" aria-selected={filtro === id} className={filtro === id ? styles.segOn : undefined} onClick={() => setFiltro(id)}>
                            {t(`side_events.frm_filter_${id}`)} <span>{cuenta[id]}</span>
                        </button>
                    ))}
                </div>
                <span className={styles.contador}>{t('side_events.frm_n_rows', { count: filas.length })}</span>
                <span className={styles.espacio} />
                <div className={styles.descarga} ref={menuRef}>
                    <button type="button" className={styles.listo} disabled={!filas.length} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
                        <Download size={16} /> {t('side_events.frm_download')}
                    </button>
                    {menu && (
                        <div className={styles.descargaMenu} role="menu">
                            <button type="button" role="menuitem" onClick={() => descargar('xlsx')}>
                                <FileSpreadsheet size={18} />
                                <span><b>{t('side_events.frm_dl_xlsx')}</b><small>{t('side_events.frm_dl_xlsx_sub')}</small></span>
                            </button>
                            <button type="button" role="menuitem" onClick={() => descargar('csv')}>
                                <FileText size={18} />
                                <span><b>{t('side_events.frm_dl_csv')}</b><small>{t('side_events.frm_dl_csv_sub')}</small></span>
                            </button>
                            <span className={styles.descargaNota}>
                                {filtrado ? t('side_events.frm_dl_filtered', { count: filas.length }) : t('side_events.frm_dl_all', { count: filas.length })}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.tablaCaja}>
                {respuestas === null ? (
                    <div className={styles.tablaVacia}><span>…</span></div>
                ) : !filas.length ? (
                    <div className={styles.tablaVacia}>
                        <b>{t(todas.length ? 'side_events.frm_no_match' : 'side_events.frm_no_responses')}</b>
                        <span>{t(todas.length ? 'side_events.frm_no_match_sub' : 'side_events.frm_no_responses_sub')}</span>
                    </div>
                ) : (
                    <table className={styles.tabla}>
                        <thead>
                            <tr>
                                <th className={styles.colInvitado}>{t('side_events.frm_col_guest')}</th>
                                <th>{t('side_events.frm_col_state')}</th>
                                {columnas.map((f) => {
                                    const Icono = TIPO[f.kind ?? f.type]?.Icon
                                    return (
                                        <th key={f.id} style={{ minWidth: ANCHO[f.kind ?? f.type] ?? 180, maxWidth: ANCHO[f.kind ?? f.type] ?? 180 }} title={f.label}>
                                            <span className={styles.th}>{Icono && <Icono size={14} />}<span>{f.label}</span></span>
                                        </th>
                                    )
                                })}
                                <th>{t('side_events.frm_col_sent')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filas.map((r) => (
                                <tr key={r.guestId} data-on={abierta === r.guestId || undefined} onClick={() => setAbierta(r.guestId)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setAbierta(r.guestId) }}>
                                    <td className={styles.colInvitado}>
                                        <span className={styles.invitado}>
                                            <span className={styles.avatar}>{inicialesDe(r.nombre)}</span>
                                            <span className={styles.invitadoCol}>
                                                <b>{r.nombre}</b>
                                                <small>{r.folio || t('side_events.frm_no_folio')}</small>
                                            </span>
                                        </span>
                                    </td>
                                    <td><span className={styles.estado} data-tono={r.estado === 'completo' ? 'ok' : 'pend'}>{t(r.estado === 'completo' ? 'side_events.frm_complete' : 'side_events.frm_pending')}</span></td>
                                    {columnas.map((f) => {
                                        const v = valorCelda(r.answers?.[f.id], f.kind ?? f.type, t)
                                        return (
                                            <td key={f.id} style={{ maxWidth: ANCHO[f.kind ?? f.type] ?? 180 }} title={v || undefined}>
                                                {v ? <span className={styles.celda}>{v}</span> : <span className={styles.guion}>—</span>}
                                            </td>
                                        )
                                    })}
                                    <td className={styles.fecha}>{r.estado === 'completo' ? fechaCorta(r.actualizado, lang) : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {detalle && (
                <>
                    <div className={styles.velo} onClick={() => setAbierta(null)} />
                    <aside className={styles.drawer} role="dialog" aria-label={detalle.nombre}>
                        <div className={styles.drawerHead}>
                            <span className={styles.avatar} data-grande>{inicialesDe(detalle.nombre)}</span>
                            <span className={styles.invitadoCol}>
                                <b className={styles.drawerNombre}>{detalle.nombre}</b>
                                <small>
                                    {detalle.estado === 'completo'
                                        ? `${detalle.folio ?? ''} · ${t('side_events.frm_sent_at', { when: fechaCorta(detalle.actualizado, lang) })}`
                                        : t('side_events.frm_pending')}
                                </small>
                            </span>
                            <button type="button" className={styles.icono} onClick={() => setAbierta(null)} aria-label={t('side_events.frm_close')}><X size={18} /></button>
                        </div>
                        <div className={styles.drawerCuerpo}>
                            {detalle.acompanaA && <span className={styles.drawerNota}>{t('side_events.frm_with', { name: detalle.acompanaA })}</span>}
                            {detalle.estado === 'pendiente' ? (
                                <>
                                    <span className={styles.drawerNota}>{t('side_events.frm_pending_note')}</span>
                                    {detalle.token && (
                                        <button type="button" className={styles.listo} onClick={() => copiarLink(detalle)}>
                                            <Link2 size={16} /> {t('side_events.frm_copy_link')}
                                        </button>
                                    )}
                                </>
                            ) : (snapshot?.sections ?? []).map((s) => (
                                <div key={s.id ?? s.title} className={styles.drawerSeccion}>
                                    {s.title && <span className={styles.drawerSeccionTitulo}>{s.title}</span>}
                                    {s.fields.map((f) => {
                                        const v = valorCelda(detalle.answers?.[f.id], f.kind ?? f.type, t)
                                        return (
                                            <div key={f.id} className={styles.drawerCampo}>
                                                <span>{f.label}</span>
                                                {v ? <p>{v}</p> : <p className={styles.sinRespuesta}>{t('side_events.frm_no_answer')}</p>}
                                            </div>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    </aside>
                </>
            )}
        </div>
    )
}
