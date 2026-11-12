import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dropdown, Input, Modal, Popover, Select, Switch, message } from 'antd'
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Ellipsis, Globe, GripVertical, LoaderCircle, Plus, Upload } from 'lucide-react'
import {
    CAMPOS_DIRECCION, MATERIAL_ACCEPT, ZONAS, ciudadDeZona, detectarPlataforma, esOnline, hostDeMaterial, idDeZoom,
    normalizarAcceso, pesoLegible, sinExtension, tipoDeArchivo,
} from '../acceso'
import { LogoPlataforma } from './LogoPlataforma'
import { AddressAutocomplete } from '../AddressAutocomplete'
import { DEFAULT_SOMBRA_DETALLES, OpcionesClima } from '../Workspace/SideBars'
import { LiveSlider } from '../../Invitation/Build/PageSections/barControls'
import { borrarMaterial, subirMaterial } from './materialApi'
import s from './AccesoPanel.module.css'

const nuevoId = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const NOMBRE_PLATAFORMA = { zoom: 'Zoom', meet: 'Google Meet', youtube: 'YouTube', link: 'Enlace' }

/*
  Panel "Ubicación" de un Pop (handoff "Pop · Evento en línea", columna
  Editor): Presencial | En línea. Presencial: nombre del lugar, dirección
  (búsqueda o a mano + link del mapa), cuándo se ve el clima y la sombra del
  texto de la portada (en un Pop ya no hay barra de lugar ni de clima). En línea: enlace con la plataforma
  detectada, ID / Código (Zoom; el de Meet sale del enlace), zona horaria,
  Material arrastrable (enlaces y archivos al bucket privado) y "Solo para
  confirmados". Lo privado va en side_events.acceso (`actualizarAcceso`); el
  modo y la zona, en el body (`setBody`).
*/
const FilaMaterial = ({ m, onRenombrar, onReemplazar, onQuitar, cargando }) => {
    const { t } = useTranslation()
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: m.id })
    const [renombrando, setRenombrando] = useState(false)
    const [titulo, setTitulo] = useState(m.title)
    const guardar = () => { setRenombrando(false); if (titulo.trim() && titulo !== m.title) onRenombrar(titulo.trim()) }
    const menu = {
        items: [
            { key: 'renombrar', label: t('side_events.acceso_rename'), onClick: () => { setTitulo(m.title); setRenombrando(true) } },
            ...(m.kind === 'file' ? [{ key: 'reemplazar', label: t('side_events.acceso_replace'), onClick: onReemplazar }] : []),
            { key: 'eliminar', label: t('side_events.acceso_delete'), danger: true, onClick: onQuitar },
        ],
    }
    return (
        <li ref={setNodeRef} className={s.fila} data-dragging={isDragging || undefined} style={{ transform: CSS.Translate.toString(transform), transition }}>
            <span className={s.agarre} {...attributes} {...listeners} aria-label={t('side_events.acceso_drag')}><GripVertical size={14} /></span>
            <span className={s.filaIcono}>
                {cargando ? <LoaderCircle size={14} className={s.gira} /> : m.kind === 'file' ? tipoDeArchivo(m.mime, m.path) : <Globe size={14} />}
            </span>
            <span className={s.filaTextos}>
                {renombrando
                    ? <Input size="small" autoFocus value={titulo} maxLength={80} onChange={(e) => setTitulo(e.target.value)} onBlur={guardar} onPressEnter={guardar} />
                    : <span className={s.filaTitulo}>{m.title || t('side_events.acceso_untitled')}</span>}
                <span className={s.filaSub}>
                    {m.kind === 'file' ? `${tipoDeArchivo(m.mime, m.path)} · ${pesoLegible(m.size)}` : `${t('side_events.acceso_link')} · ${hostDeMaterial(m.url)}`}
                </span>
            </span>
            <Dropdown menu={menu} trigger={['click']} placement="bottomRight">
                <button type="button" className={s.mas} aria-label={t('side_events.acceso_more')}><Ellipsis size={16} /></button>
            </Dropdown>
        </li>
    )
}

export const AccesoPanel = ({ body, setBody, acceso: crudo, actualizarAcceso, popId }) => {
    const { t } = useTranslation()
    const acceso = normalizarAcceso(crudo)
    const online = esOnline(body)
    const d = detectarPlataforma(acceso.url)
    const [nuevoEnlace, setNuevoEnlace] = useState({ abierto: false, title: '', url: '' })
    const [subiendo, setSubiendo] = useState([])
    const [arrastrando, setArrastrando] = useState(false)
    const inputRef = useRef(null)
    const reemplazoRef = useRef(null)
    const sensores = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    )

    const cambiar = (patch, opts) => actualizarAcceso((prev) => ({ ...prev, ...patch }), opts)
    const cambiarMaterial = (fn) => actualizarAcceso((prev) => ({ ...prev, material: fn(prev.material) }))

    // El código de Meet sale del enlace; el ID de Zoom también si no lo escriben.
    // Al cambiar de plataforma (Meet → Zoom…) se limpian el ID y el código de
    // la anterior (si no, el código de Meet se quedaba como código de Zoom).
    // Mientras se escribe el URL (sin plataforma todavía) no se toca nada.
    const cambiarUrl = (url) => {
        const antes = detectarPlataforma(acceso.url)
        const det = detectarPlataforma(url)
        const otra = Boolean(antes.platform && det.platform && antes.platform !== det.platform)
        const extra = otra ? { meetingId: '', passcode: '' } : {}
        if (det.platform === 'meet') extra.passcode = det.meetCode || ''
        if (det.platform === 'zoom') {
            const idNuevo = idDeZoom(url) || ''
            // El ID sigue al enlace si estaba vacío o era el del enlace anterior.
            if (otra || !acceso.meetingId || acceso.meetingId === idDeZoom(acceso.url)) extra.meetingId = idNuevo
        }
        cambiar({ url, ...extra }, { coalesce: 'acceso-url' })
    }

    const subir = async (archivos, reemplazar = null) => {
        const lista = [...archivos]
        if (!lista.length || !popId) return
        for (const f of lista) {
            const id = reemplazar?.id ?? nuevoId()
            setSubiendo((x) => [...x, id])
            try {
                const r = await subirMaterial(f, popId)
                const item = { id, kind: 'file', title: reemplazar?.title || sinExtension(f.name).slice(0, 80), ...r }
                cambiarMaterial((m) => (reemplazar ? m.map((x) => (x.id === id ? item : x)) : [...m, item]))
                if (reemplazar?.path) borrarMaterial(reemplazar.path, popId)
            } catch (err) {
                message.error(t(`side_events.acceso_error_${{ TIPO: 'type', TAMANO: 'size', SIN_ESPACIO: 'space' }[err.code] ?? 'upload'}`))
            } finally {
                setSubiendo((x) => x.filter((y) => y !== id))
            }
        }
    }

    const quitar = (m) => {
        const hacer = () => {
            cambiarMaterial((lista) => lista.filter((x) => x.id !== m.id))
            if (m.kind === 'file') borrarMaterial(m.path, popId)
        }
        if (m.kind !== 'file') return hacer()
        Modal.confirm({
            title: t('side_events.acceso_delete_title'),
            content: t('side_events.acceso_delete_body', { name: m.title }),
            okText: t('side_events.acceso_delete'), okButtonProps: { danger: true }, cancelText: t('side_events.acceso_cancel'),
            onOk: hacer,
        })
    }

    const agregarEnlace = () => {
        const url = nuevoEnlace.url.trim()
        const det = detectarPlataforma(url)
        if (!det.valido || !det.https) return
        cambiarMaterial((m) => [...m, { id: nuevoId(), kind: 'link', title: nuevoEnlace.title.trim() || det.host, url }])
        setNuevoEnlace({ abierto: false, title: '', url: '' })
    }
    const detNuevo = detectarPlataforma(nuevoEnlace.url)

    const soltar = ({ active, over }) => {
        if (!over || active.id === over.id) return
        cambiarMaterial((m) => {
            const de = m.findIndex((x) => x.id === active.id)
            const a = m.findIndex((x) => x.id === over.id)
            return de < 0 || a < 0 ? m : arrayMove(m, de, a)
        })
    }

    const zona = body?.zonaOnline || body?.timezone || 'America/Mexico_City'
    const direccion = body?.address ?? {}
    const setAddress = (patch, opts) => setBody({ address: { ...(body?.address ?? {}), ...patch } }, opts)

    return (
        <div className={s.panel}>
            <div className={s.modo} role="tablist">
                {['presencial', 'online'].map((m) => (
                    <button
                        key={m} type="button" role="tab" aria-selected={(m === 'online') === online} className={s.modoOpcion}
                        data-on={(m === 'online') === online || undefined}
                        onClick={() => setBody({ modo: m === 'online' ? 'online' : 'presencial' })}
                    >
                        {t(`side_events.acceso_mode_${m}`)}
                    </button>
                ))}
            </div>

            {!online ? (
                <>
                    <label className={s.campo}>
                        <span className={s.etiqueta}>{t('side_events.acceso_place_name')}</span>
                        <Input className={s.input} value={body?.place_name ?? ''} placeholder={t('side_events.place_name_label')} onChange={(e) => setBody({ place_name: e.target.value }, { coalesce: 'place_name' })} />
                    </label>
                    <div className={s.campo}>
                        <span className={s.etiqueta}>{t('side_events.acceso_address')}</span>
                        <AddressAutocomplete onSelect={(addr) => setAddress(addr)} className={s.buscar} placeholder={t('side_events.address_search')} />
                        <div className={s.dos}>
                            {CAMPOS_DIRECCION.map(([key, label]) => (
                                <Input key={key} className={s.input} placeholder={t(`side_events.${label}`)} value={direccion[key] ?? ''} onChange={(e) => setAddress({ [key]: e.target.value }, { coalesce: `addr.${key}` })} />
                            ))}
                        </div>
                        <Input className={s.input} placeholder={t('side_events.address_url')} value={direccion.url ?? ''} onChange={(e) => setAddress({ url: e.target.value }, { coalesce: 'addr.url' })} />
                        <span className={s.ayuda}>{t('side_events.acceso_address_hint')}</span>
                    </div>
                    <div className={s.bloque}>
                        <OpcionesClima body={body} setBody={setBody} sinCiudad={!direccion.city} />
                    </div>
                    <div className={s.bloque}>
                        <LiveSlider label={t('side_events.details_shadow')} value={body?.details_shadow ?? DEFAULT_SOMBRA_DETALLES} min={0} max={100} format={(v) => `${v}%`} onChange={(v, o) => setBody({ details_shadow: v }, o)} />
                    </div>
                </>
            ) : (
                <>
                    <label className={s.campo}>
                        <span className={s.etiqueta}>{t('side_events.acceso_url_label')}</span>
                        <span className={s.enlace} data-error={(d.valido && !d.https) || undefined}>
                            <input
                                value={acceso.url}
                                placeholder="https://zoom.us/j/…"
                                inputMode="url"
                                onChange={(e) => cambiarUrl(e.target.value.trim())}
                            />
                            {d.valido && d.https && (
                                <span className={s.badge}><LogoPlataforma platform={d.platform} size={13} />{NOMBRE_PLATAFORMA[d.platform]}</span>
                            )}
                        </span>
                        <span className={s.ayuda} data-error={(d.valido && !d.https) || (acceso.url && !d.valido) || undefined}>
                            {d.valido && !d.https ? t('side_events.acceso_url_https')
                                : acceso.url && !d.valido ? t('side_events.acceso_url_invalid')
                                    : t('side_events.acceso_url_hint')}
                        </span>
                    </label>

                    {d.platform === 'zoom' && (
                        <div className={s.dos}>
                            <label className={s.campo}>
                                <span className={s.etiqueta}>{t('side_events.acceso_meeting_id')}</span>
                                <Input className={s.input} value={acceso.meetingId} placeholder="842 1390 7711" onChange={(e) => cambiar({ meetingId: e.target.value }, { coalesce: 'acceso-id' })} />
                            </label>
                            <label className={s.campo}>
                                <span className={s.etiqueta}>{t('side_events.acceso_passcode')}</span>
                                <Input className={s.input} value={d.zoomConPwd ? '' : acceso.passcode} disabled={d.zoomConPwd} placeholder={d.zoomConPwd ? t('side_events.acceso_passcode_in_link') : 'FIN2026'} onChange={(e) => cambiar({ passcode: e.target.value }, { coalesce: 'acceso-codigo' })} />
                            </label>
                        </div>
                    )}
                    {d.platform === 'meet' && (
                        <label className={s.campo}>
                            <span className={s.etiqueta}>{t('side_events.acceso_meet_code')}</span>
                            <Input className={s.input} value={d.meetCode || ''} disabled />
                        </label>
                    )}

                    <label className={s.campo}>
                        <span className={s.etiqueta}>{t('side_events.acceso_timezone')}</span>
                        <Select
                            className={s.select}
                            value={zona}
                            showSearch
                            optionFilterProp="label"
                            options={[...new Set([zona, ...ZONAS])].map((z) => ({ value: z, label: `${ciudadDeZona(z)} · ${z.split('/')[0]}` }))}
                            onChange={(z) => setBody({ zonaOnline: z })}
                            popupMatchSelectWidth={false}
                        />
                        <span className={s.ayuda}>{t('side_events.acceso_timezone_hint')}</span>
                    </label>

                    <section
                        className={s.material}
                        data-arrastrando={arrastrando || undefined}
                        onDragOver={(e) => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); setArrastrando(true) } }}
                        onDragLeave={() => setArrastrando(false)}
                        onDrop={(e) => { if (!e.dataTransfer?.files?.length) return; e.preventDefault(); setArrastrando(false); subir(e.dataTransfer.files) }}
                    >
                        <span className={s.titulo}>{t('side_events.acceso_material')}</span>
                        {acceso.material.length > 0 && (
                            <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={soltar}>
                                <SortableContext items={acceso.material.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                                    <ul className={s.lista}>
                                        {acceso.material.map((m) => (
                                            <FilaMaterial
                                                key={m.id}
                                                m={m}
                                                cargando={subiendo.includes(m.id)}
                                                onRenombrar={(title) => cambiarMaterial((lista) => lista.map((x) => (x.id === m.id ? { ...x, title } : x)))}
                                                onReemplazar={() => { reemplazoRef.current = m; inputRef.current?.click() }}
                                                onQuitar={() => quitar(m)}
                                            />
                                        ))}
                                    </ul>
                                </SortableContext>
                            </DndContext>
                        )}
                        {subiendo.filter((id) => !acceso.material.some((m) => m.id === id)).map((id) => (
                            <div key={id} className={`${s.fila} ${s.subiendo}`}><span className={s.filaIcono}><LoaderCircle size={14} className={s.gira} /></span><span className={s.filaSub}>{t('side_events.acceso_uploading')}</span></div>
                        ))}
                        <div className={s.botones}>
                            <Popover
                                open={nuevoEnlace.abierto}
                                onOpenChange={(v) => setNuevoEnlace((x) => ({ ...x, abierto: v }))}
                                trigger="click"
                                placement="bottom"
                                content={(
                                    <div className={s.popover} data-text-bar>
                                        <Input placeholder={t('side_events.acceso_link_title')} value={nuevoEnlace.title} maxLength={80} onChange={(e) => setNuevoEnlace((x) => ({ ...x, title: e.target.value }))} />
                                        <Input placeholder="https://" value={nuevoEnlace.url} inputMode="url" status={nuevoEnlace.url && !(detNuevo.valido && detNuevo.https) ? 'error' : undefined} onChange={(e) => setNuevoEnlace((x) => ({ ...x, url: e.target.value }))} onPressEnter={agregarEnlace} />
                                        <button type="button" className={s.agregar} disabled={!(detNuevo.valido && detNuevo.https)} onClick={agregarEnlace}>{t('side_events.acceso_add')}</button>
                                    </div>
                                )}
                            >
                                <button type="button" className={s.punteado}><Plus size={14} />{t('side_events.acceso_add_link')}</button>
                            </Popover>
                            <button type="button" className={s.punteado} onClick={() => { reemplazoRef.current = null; inputRef.current?.click() }}><Upload size={14} />{t('side_events.acceso_upload')}</button>
                        </div>
                        <span className={s.ayuda}>{t('side_events.acceso_material_hint')}</span>
                        <input
                            ref={inputRef} type="file" hidden accept={MATERIAL_ACCEPT} multiple
                            onChange={(e) => { const r = reemplazoRef.current; const f = r ? [e.target.files[0]].filter(Boolean) : e.target.files; subir(f, r); e.target.value = ''; reemplazoRef.current = null }}
                        />
                    </section>

                    <label className={s.interruptor}>
                        <span className={s.campoTextos}>
                            <span className={s.etiquetaFuerte}>{t('side_events.acceso_only_confirmed')}</span>
                            <span className={s.ayuda}>{t('side_events.acceso_only_confirmed_hint')}</span>
                        </span>
                        <Switch checked={acceso.onlyConfirmed} onChange={(v) => cambiar({ onlyConfirmed: v })} />
                    </label>
                </>
            )}
        </div>
    )
}

export default AccesoPanel
