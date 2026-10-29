import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { Input, message, Popconfirm, Segmented, Select } from 'antd'
import { ChevronDown, ClipboardList, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabaseAuthHeaders } from '../../../lib/authHeaders'
import { formDesdePlantilla, IDS_PLANTILLAS, tieneDireccion } from '../plantillasRegistro'
import ims from './InteractionMenu.module.css'
import styles from './RegistroPanel.module.css'

/*
  Herramienta "Registro" del panel lateral de un Flash (se abre al elegir la
  capa Registro o su tarjeta en la pieza). El organizador elige una plantilla
  y la ajusta (prende / apaga preguntas, obligatorias, textos y opciones),
  decide si se registra cada persona o uno por pase, y ve las respuestas (y
  las baja en Excel). Las respuestas son datos personales: se piden al
  backend con su sesión (iattend--backend router/sideEventForm.js).
*/

const API = import.meta.env.VITE_API_URL

const Interruptor = ({ on }) => (
    <span className={`${ims.switch} ${on ? ims.switchOn : ''}`} aria-hidden><span /></span>
)

const valorExcel = (v) => (Array.isArray(v) ? v.join(', ') : v === true ? 'Sí' : v === false ? 'No' : v ?? '')

export const RegistroPanel = ({ body, setBody, eventoId }) => {
    const { t } = useTranslation()
    const form = body?.form ?? null
    const activo = Boolean(form?.enabled)
    const [abierta, setAbierta] = useState(null)
    const [plantilla, setPlantilla] = useState(form?.template ?? 'basico')
    const [respuestas, setRespuestas] = useState(null)

    const setForm = (patch) => setBody({ form: { ...(form ?? formDesdePlantilla('basico')), ...patch } })
    const setCampo = (si, fi, patch) => setForm({
        sections: form.sections.map((s, i) => (i !== si ? s : { ...s, fields: s.fields.map((f, j) => (j === fi ? { ...f, ...patch } : f)) })),
    })

    const prender = () => {
        if (activo) setForm({ enabled: false })
        else setBody({ form: form?.sections?.length ? { ...form, enabled: true } : formDesdePlantilla(plantilla) })
    }

    const cargar = useCallback(async () => {
        if (!eventoId) return
        try {
            const { data } = await axios.get(`${API}/api/side-events/${eventoId}/registro-respuestas`, { headers: await supabaseAuthHeaders() })
            setRespuestas(data.respuestas ?? [])
        } catch {
            setRespuestas([])
        }
    }, [eventoId])
    useEffect(() => { if (activo) cargar() }, [activo, cargar])

    const descargar = () => {
        const campos = (form?.sections ?? []).flatMap((s) => s.fields)
        const filas = (respuestas ?? []).map((r) => ({
            [t('side_events.reg_x_folio')]: r.folio ?? '',
            [t('side_events.reg_x_name')]: r.nombre,
            [t('side_events.reg_x_with')]: r.acompanaA,
            [t('side_events.reg_x_state')]: r.estado === 'completo' ? t('side_events.reg_complete') : t('side_events.reg_pending'),
            [t('side_events.reg_x_consent')]: r.consentimiento ? new Date(r.consentimiento).toLocaleString() : '',
            [t('side_events.reg_x_updated')]: r.actualizado ? new Date(r.actualizado).toLocaleString() : '',
            ...Object.fromEntries(campos.map((f) => [f.label, valorExcel(r.answers?.[f.id])])),
        }))
        const hoja = XLSX.utils.json_to_sheet(filas)
        const libro = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(libro, hoja, 'Registro')
        XLSX.writeFile(libro, `registro-${eventoId}.xlsx`)
    }

    const completos = (respuestas ?? []).filter((r) => r.estado === 'completo').length
    const pendientes = (respuestas ?? []).filter((r) => r.estado === 'pendiente').length

    return (
        <div className={ims.panel}>
            <section className={ims.card}>
                <button type="button" className={ims.cardHead} role="switch" aria-checked={activo} onClick={prender}>
                    <span className={ims.cardIcon}><ClipboardList size={18} strokeWidth={1.9} /></span>
                    <span className={ims.cardCol}>
                        <span className={ims.cardTitle}>{t('side_events.reg_title')}</span>
                        <span className={ims.cardSub}>{t('side_events.reg_sub')}</span>
                    </span>
                    <Interruptor on={activo} />
                </button>
            </section>

            {activo && form && (
                <>
                    {/* Plantilla */}
                    <section className={ims.card}>
                        <span className={ims.rowLabel}>{t('side_events.reg_template')}</span>
                        <div className={styles.fila}>
                            <Select
                                className={styles.select}
                                value={plantilla}
                                onChange={setPlantilla}
                                options={IDS_PLANTILLAS.map((id) => ({ value: id, label: t(`side_events.reg_tpl_${id}`) }))}
                            />
                            <Popconfirm
                                title={t('side_events.reg_apply_title')}
                                description={t('side_events.reg_apply_desc')}
                                okText={t('side_events.reg_apply')}
                                cancelText={t('buttons.cancel', 'Cancelar')}
                                onConfirm={() => setBody({ form: formDesdePlantilla(plantilla, form) })}
                            >
                                <button type="button" className={ims.darkBtn}>{t('side_events.reg_apply')}</button>
                            </Popconfirm>
                        </div>
                        <span className={styles.nota}>{t(`side_events.reg_tpl_${form.template ?? 'basico'}_hint`)}</span>
                    </section>

                    {/* Textos y reglas */}
                    <section className={ims.card}>
                        <label className={styles.campo}>
                            <span>{t('side_events.reg_f_title')}</span>
                            <Input value={form.title} maxLength={60} onChange={(e) => setForm({ title: e.target.value })} />
                        </label>
                        <label className={styles.campo}>
                            <span>{t('side_events.reg_f_host')}</span>
                            <Input value={form.hostLabel ?? ''} maxLength={60} placeholder={t('side_events.reg_f_host_ph')} onChange={(e) => setForm({ hostLabel: e.target.value })} />
                        </label>
                        <label className={styles.campo}>
                            <span>{t('side_events.reg_f_intro')}</span>
                            <Input.TextArea value={form.intro} maxLength={280} autoSize={{ minRows: 2, maxRows: 5 }} onChange={(e) => setForm({ intro: e.target.value })} />
                        </label>
                        <label className={styles.campo}>
                            <span>{t('side_events.reg_f_privacy')}</span>
                            <Input value={form.privacyUrl ?? ''} placeholder="https://…" onChange={(e) => setForm({ privacyUrl: e.target.value.trim() })} />
                        </label>
                        <div className={styles.campo}>
                            <span>{t('side_events.reg_f_scope')}</span>
                            <Segmented
                                block
                                value={form.scope === 'grupo' ? 'grupo' : 'persona'}
                                onChange={(v) => setForm({ scope: v })}
                                options={[
                                    { value: 'persona', label: t('side_events.reg_scope_person') },
                                    { value: 'grupo', label: t('side_events.reg_scope_group') },
                                ]}
                            />
                            <span className={styles.nota}>{t(form.scope === 'grupo' ? 'side_events.reg_scope_group_hint' : 'side_events.reg_scope_person_hint')}</span>
                        </div>
                        {form.scope !== 'grupo' && (
                            <>
                                {tieneDireccion(form) && (
                                    <label className={styles.check}>
                                        <input type="checkbox" checked={form.allowCopyAddress !== false} onChange={(e) => setForm({ allowCopyAddress: e.target.checked })} />
                                        {t('side_events.reg_copy_address')}
                                    </label>
                                )}
                                <label className={styles.check}>
                                    <input type="checkbox" checked={form.allowLater !== false} onChange={(e) => setForm({ allowLater: e.target.checked })} />
                                    {t('side_events.reg_allow_later')}
                                </label>
                            </>
                        )}
                    </section>

                    {/* Preguntas */}
                    <section className={ims.card}>
                        <span className={ims.rowLabel}>{t('side_events.reg_questions')}</span>
                        {form.sections.map((s, si) => (
                            <div key={si} className={styles.seccion}>
                                <Input
                                    className={styles.seccionTitulo}
                                    variant="borderless"
                                    value={s.title}
                                    onChange={(e) => setForm({ sections: form.sections.map((x, i) => (i === si ? { ...x, title: e.target.value } : x)) })}
                                />
                                {s.fields.map((f, fi) => {
                                    const clave = `${si}-${fi}`
                                    const conOpciones = f.type === 'single' || f.type === 'multi'
                                    return (
                                        <div key={f.id} className={styles.pregunta} data-off={f.enabled === false || undefined}>
                                            <div className={styles.preguntaFila}>
                                                <input type="checkbox" checked={f.enabled !== false} title={t('side_events.reg_q_on')} onChange={(e) => setCampo(si, fi, { enabled: e.target.checked })} />
                                                <Input
                                                    variant="borderless"
                                                    className={styles.preguntaTexto}
                                                    value={f.label}
                                                    onChange={(e) => setCampo(si, fi, { label: e.target.value })}
                                                />
                                                <button
                                                    type="button"
                                                    className={styles.obligatoria}
                                                    data-on={f.required || undefined}
                                                    onClick={() => setCampo(si, fi, { required: !f.required })}
                                                    title={t('side_events.reg_q_required')}
                                                >
                                                    {f.required ? t('side_events.reg_q_required_on') : t('side_events.reg_q_optional')}
                                                </button>
                                                <button type="button" className={styles.mas} data-on={abierta === clave || undefined} onClick={() => setAbierta(abierta === clave ? null : clave)} aria-label={t('side_events.reg_q_more')}>
                                                    <ChevronDown size={15} />
                                                </button>
                                            </div>
                                            {abierta === clave && (
                                                <div className={styles.preguntaMas}>
                                                    <span className={styles.nota}>{t(`side_events.reg_type_${f.type}`)}</span>
                                                    {conOpciones && (
                                                        <label className={styles.campo}>
                                                            <span>{t('side_events.reg_q_options')}</span>
                                                            <Input.TextArea
                                                                value={(f.options ?? []).join('\n')}
                                                                autoSize={{ minRows: 3, maxRows: 8 }}
                                                                onChange={(e) => setCampo(si, fi, { options: e.target.value.split('\n').map((o) => o.trimStart()).slice(0, 20) })}
                                                                onBlur={(e) => setCampo(si, fi, { options: e.target.value.split('\n').map((o) => o.trim()).filter(Boolean).slice(0, 20) })}
                                                            />
                                                        </label>
                                                    )}
                                                    <label className={styles.campo}>
                                                        <span>{t('side_events.reg_q_help')}</span>
                                                        <Input value={f.help ?? ''} maxLength={200} onChange={(e) => setCampo(si, fi, { help: e.target.value || undefined })} />
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </section>

                    {/* Respuestas */}
                    <section className={ims.card}>
                        <div className={styles.fila}>
                            <span className={ims.rowLabel}>
                                {t('side_events.reg_responses', { n: completos })}{pendientes ? ` · ${t('side_events.reg_pending_n', { n: pendientes })}` : ''}
                            </span>
                            <button type="button" className={ims.textBtn} disabled={!respuestas?.length} onClick={descargar}>
                                <Download size={14} /> Excel
                            </button>
                        </div>
                        <div className={ims.msgs}>
                            {respuestas === null && <span className={ims.empty}>…</span>}
                            {respuestas?.length === 0 && <span className={ims.empty}>{t('side_events.reg_no_responses')}</span>}
                            {(respuestas ?? []).slice(0, 50).map((r) => (
                                <div key={r.guestId} className={ims.msg}>
                                    <span className={ims.msgText}>
                                        <b>{r.nombre}</b> {r.acompanaA ? `· ${t('side_events.reg_with', { name: r.acompanaA.split(' ')[0] })}` : ''}
                                    </span>
                                    <span className={styles.estado} data-pendiente={r.estado === 'pendiente' || undefined}>
                                        {r.estado === 'completo' ? r.folio : t('side_events.reg_pending')}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <button type="button" className={ims.textBtn} onClick={() => { cargar(); message.success(t('side_events.reg_refreshed')) }}>
                            {t('side_events.reg_refresh')}
                        </button>
                    </section>
                </>
            )}
        </div>
    )
}
