/*
  Analítica › Storage.

  Cuánto Storage de Supabase se está usando y en qué. Sale de
  GET /api/admin/storage (public.admin_storage_stats, migración
  2026-10-28b), que agrega storage.objects por bucket, carpeta, tipo de
  archivo y mes; aquí se cruza con las invitaciones para poner nombres y
  separar los eventos de prueba.

  · Total: todo el proyecto (todos los buckets, también el catálogo de
    i attend y lo temporal).
  · Promedio por evento: solo eventos reales que tienen al menos un archivo
    (fotos y videos de la invitación, stickers, Photo Wall).
  · Una carpeta cuyo uuid ya no es una invitación se cuenta como "Sin
    invitación" (evento borrado): es espacio que se podría liberar.
*/

import { useEffect, useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { fetchStorageAdmin } from '../catalogoAdminApi'
import styles from './AnaliticaStorage.module.css'

const AREAS = {
    event_media: 'Fotos y videos de invitaciones',
    photo_wall: 'Photo Wall',
    stickers: 'Stickers del editor',
    flash: 'Eventos Flash',
    iattend_assets: 'Assets de i attend',
    editor_catalog: 'Catálogo del editor',
    temp: 'Temporales (Save the Date)',
    landing: 'Landing y marketing',
    side_events: 'Side events',
    payments: 'Comprobantes de pago',
    personal: 'Personal',
    other_user: 'Otras carpetas de usuarios',
    other: 'Otros buckets',
}
const KINDS = { image: 'Imágenes', video: 'Videos', audio: 'Audio', other: 'Otros' }
const TOP = 12

const tamano = (bytes) => {
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(bytes >= 100 * 1024 ** 2 ? 0 : 1)} MB`
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0)
const miles = (n) => new Intl.NumberFormat('es-MX').format(n)
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const mesCorto = (iso) => {
    const [y, m] = String(iso).split('-')
    return `${MESES[Number(m) - 1]} ${y.slice(2)}`
}
const nombreDe = (inv) => (Array.isArray(inv?.owners) && inv.owners.filter(Boolean).length
    ? inv.owners.filter(Boolean).join(' & ')
    : inv?.name || inv?.label || inv?.user_email || 'Invitación')

export const AnaliticaStorage = ({ invitations, esPrueba }) => {
    const [crudo, setCrudo] = useState(null)
    const [error, setError] = useState(null)
    const [soloReales, setSoloReales] = useState(true)

    useEffect(() => {
        let vivo = true
        fetchStorageAdmin()
            .then((d) => { if (vivo) setCrudo(d) })
            .catch((e) => { if (vivo) setError(e?.response?.data?.msg || 'No se pudo leer el storage') })
        return () => { vivo = false }
    }, [])

    const datos = useMemo(() => {
        if (!crudo) return null
        const porId = new Map(invitations.map((i) => [i.id, i]))
        const eventos = crudo.events.map((e) => {
            const inv = e.invitation_id ? porId.get(e.invitation_id) : null
            const prueba = inv ? esPrueba(inv) : false
            return {
                ...e,
                nombre: e.flash_id ? (e.flash_name || 'Evento Flash') : inv ? nombreDe(inv) : 'Sin invitación (borrada)',
                // Abrir el evento en su dashboard (como el resto del admin).
                href: e.flash_id ? `https://www.iattend.site/dashboard/side?flash=${e.flash_id}`
                    : inv ? `https://www.iattend.site/dashboard?id=${inv.id}` : null,
                tipo: e.flash_id ? 'Flash' : inv ? (prueba ? 'Prueba' : 'Real') : 'Huérfano',
                prueba,
                huerfano: !e.flash_id && !inv,
            }
        })
        const reales = eventos.filter((e) => !e.prueba && !e.huerfano)
        const conteo = soloReales ? reales : eventos
        const promedio = reales.length ? reales.reduce((n, e) => n + e.bytes, 0) / reales.length : 0
        const huerfanos = eventos.filter((e) => e.huerfano)
        const pruebas = eventos.filter((e) => e.prueba)

        // Crecimiento acumulado por mes.
        let corrido = 0
        const meses = crudo.months.map((m) => {
            corrido += m.bytes
            return { ...m, acumulado: corrido }
        }).slice(-12)

        return {
            eventos: conteo.slice(0, TOP),
            totalEventos: conteo.length,
            reales,
            promedio,
            huerfanos: { n: huerfanos.length, bytes: huerfanos.reduce((n, e) => n + e.bytes, 0) },
            pruebas: { n: pruebas.length, bytes: pruebas.reduce((n, e) => n + e.bytes, 0) },
            meses,
        }
    }, [crudo, invitations, esPrueba, soloReales])

    if (error) return <div className={styles.estado}>{error}</div>
    if (!crudo || !datos) return <div className={styles.estado}>Midiendo el storage…</div>

    const { total, areas, kinds, buckets } = crudo
    const area0 = areas[0]
    const mayor = datos.reales[0]
    const maxEvento = datos.eventos[0]?.bytes || 1
    const maxMes = Math.max(...datos.meses.map((m) => m.acumulado), 1)

    const kpis = [
        { label: 'Storage total', valor: tamano(total.bytes), pie: `${miles(total.files)} archivos · ${buckets.length} buckets`, tono: styles.kpiBlanco },
        { label: 'Promedio por evento', valor: tamano(datos.promedio), pie: `${miles(datos.reales.length)} eventos reales con archivos`, tono: styles.kpiLila },
        { label: 'Evento que más usa', valor: mayor ? tamano(mayor.bytes) : '—', pie: mayor ? mayor.nombre : 'sin datos', tono: styles.kpiBlanco },
        { label: 'Donde más se usa', valor: area0 ? `${pct(area0.bytes, total.bytes)}%` : '—', pie: area0 ? (AREAS[area0.area] ?? area0.area).toLowerCase() : 'sin datos', tono: styles.kpiVerde },
    ]

    return (
        <div className={styles.tablero}>
            <div className={styles.franja}>
                {kpis.map((k) => (
                    <div className={styles.kpi} key={k.label}>
                        <span className={styles.kpiLabel}>{k.label}</span>
                        <div className={styles.kpiFila}>
                            <span className={`${styles.kpiValor} ${k.tono}`}>{k.valor}</span>
                            <span className={styles.kpiPie} title={k.pie}>{k.pie}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.cuerpo}>
                {/* ── Dónde se usa ── */}
                <section className={styles.card}>
                    <header className={styles.head}><h2 className={styles.label}>Dónde se usa</h2></header>
                    <div className={styles.scroll}>
                        <ul className={styles.barras}>
                            {areas.map((a) => (
                                <li key={a.area}>
                                    <div className={styles.barraFila}>
                                        <span className={styles.barraNombre}>{AREAS[a.area] ?? a.area}</span>
                                        <span className={styles.barraValor}>{tamano(a.bytes)} · {pct(a.bytes, total.bytes)}%</span>
                                    </div>
                                    <div className={styles.barra}><span style={{ width: `${Math.max(1, pct(a.bytes, total.bytes))}%` }} /></div>
                                </li>
                            ))}
                        </ul>

                        <h3 className={styles.sub}>Por tipo de archivo</h3>
                        <div className={styles.apilada}>
                            {kinds.map((k, i) => (
                                <span key={k.kind} data-i={i} style={{ width: `${pct(k.bytes, total.bytes)}%` }} title={`${KINDS[k.kind] ?? k.kind}: ${tamano(k.bytes)}`} />
                            ))}
                        </div>
                        <ul className={styles.leyenda}>
                            {kinds.map((k, i) => (
                                <li key={k.kind}><i data-i={i} />{KINDS[k.kind] ?? k.kind} <b>{tamano(k.bytes)}</b> <span>{miles(k.files)} archivos</span></li>
                            ))}
                        </ul>

                        <h3 className={styles.sub}>Por bucket</h3>
                        <ul className={styles.tabla}>
                            {buckets.map((b) => (
                                <li key={b.bucket}><span>{b.bucket}</span><span>{miles(b.files)} archivos</span><b>{tamano(b.bytes)}</b></li>
                            ))}
                        </ul>

                        {(datos.huerfanos.n > 0 || datos.pruebas.n > 0) && (
                            <div className={styles.aviso}>
                                {datos.huerfanos.n > 0 && <span><b>{tamano(datos.huerfanos.bytes)}</b> en {datos.huerfanos.n} {datos.huerfanos.n === 1 ? 'carpeta de una invitación que ya no existe' : 'carpetas de invitaciones que ya no existen'}.</span>}
                                {datos.pruebas.n > 0 && <span><b>{tamano(datos.pruebas.bytes)}</b> en {datos.pruebas.n} {datos.pruebas.n === 1 ? 'evento' : 'eventos'} de prueba.</span>}
                            </div>
                        )}
                    </div>
                </section>

                {/* ── Eventos que más usan ── */}
                <section className={styles.card}>
                    <header className={styles.head}>
                        <h2 className={styles.label}>Eventos que más usan</h2>
                        <label className={styles.toggle}>
                            <input type="checkbox" checked={soloReales} onChange={(e) => setSoloReales(e.target.checked)} />
                            Solo eventos reales
                        </label>
                    </header>
                    <ol className={`${styles.scroll} ${styles.eventos}`}>
                        {datos.eventos.map((e, i) => (
                            <li key={e.invitation_id ?? e.flash_id} className={styles.evento}>
                                <span className={styles.pos}>{i + 1}</span>
                                <div className={styles.eventoCuerpo}>
                                    <div className={styles.barraFila}>
                                        <span className={styles.barraNombre} title={e.nombre}>{e.nombre}</span>
                                        <span className={styles.barraValor}>{tamano(e.bytes)}</span>
                                        {e.href && (
                                            <a className={styles.abrir} href={e.href} target="_blank" rel="noreferrer" title="Abrir el evento">
                                                <ExternalLink size={13} />
                                            </a>
                                        )}
                                    </div>
                                    <div className={styles.barra}><span style={{ width: `${Math.max(2, (e.bytes / maxEvento) * 100)}%` }} /></div>
                                    <div className={styles.chips}>
                                        {e.tipo !== 'Real' && <span className={styles.chipTipo}>{e.tipo}</span>}
                                        {Object.entries(e.by_area).sort((a, b) => b[1] - a[1]).map(([area, b]) => (
                                            <span key={area} className={styles.chip}>{AREAS[area] ?? area} · {tamano(b)}</span>
                                        ))}
                                    </div>
                                </div>
                            </li>
                        ))}
                        {!datos.eventos.length && <li className={styles.vacio}>Sin eventos con archivos.</li>}
                    </ol>
                </section>

                {/* ── Crecimiento ── */}
                <section className={`${styles.card} ${styles.crecimiento}`}>
                    <header className={styles.head}><h2 className={styles.label}>Crecimiento (acumulado)</h2></header>
                    <div className={styles.columnas}>
                        {datos.meses.map((m) => (
                            <div key={m.month} className={styles.columna} title={`${mesCorto(m.month)}: +${tamano(m.bytes)} · total ${tamano(m.acumulado)}`}>
                                <span className={styles.colValor}>{tamano(m.acumulado)}</span>
                                <div className={styles.colBarra}><span style={{ height: `${Math.max(2, (m.acumulado / maxMes) * 100)}%` }} /></div>
                                <span className={styles.colMes}>{mesCorto(m.month)}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    )
}
