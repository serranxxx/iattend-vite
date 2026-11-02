import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { message } from 'antd'
import { Check, ClipboardList, Download, FileText, Lock, Plus } from 'lucide-react'
import ims from '../Workspace/InteractionMenu.module.css'
import styles from './FormularioPanel.module.css'
import { FormularioVista } from './FormularioVista'
import { descargarRespuestas } from './descargas'
import { useMisFormularios, useRespuestasFormulario } from './useFormularios'
import {
    contarPreguntas, fechaCorta, formPublicado, haceCuanto, inicialesDe, itemsDeSnapshot,
    preguntaNueva, reglasDefault, snapshotDe,
} from './modelo'

/*
  Herramienta "Formulario" del panel lateral de un Pop (handoff
  "Formularios propios", 1a; se abre al elegir la capa Formulario o su
  tarjeta en la pieza). Solo prende el formulario, elige cuál de "Mis
  formularios" usa este Pop y resume las respuestas. Crear, editar y
  revisar se hace en la vista completa (FormularioVista), que se abre encima
  del editor; comparte con el panel las respuestas (un solo canal en vivo).
  Reglas del Pop (quién responde, cerrar respuestas, folio…) en body.form;
  las preguntas en forms.items, copiadas al Pop como snapshot.
*/

const Interruptor = ({ on }) => (
    <span className={`${ims.switch} ${on ? ims.switchOn : ''}`} aria-hidden><span /></span>
)

export const FormularioPanel = ({ body, updateForm, eventoId }) => {
    const { t, i18n } = useTranslation()
    const lang = i18n.language?.startsWith('en') ? 'en' : 'es'
    const form = body?.form ?? null
    const activo = Boolean(form?.enabled)
    const publicado = formPublicado(form)
    const { formularios, usos, error, crear, cambiarLocal, guardar } = useMisFormularios()
    const { respuestas, cargar } = useRespuestasFormulario(eventoId, activo)
    const [pickerOpen, setPickerOpen] = useState(false)
    const [vista, setVista] = useState(null) // { tab, guestId? }
    const [creando, setCreando] = useState(false)

    const elegido = useMemo(() => (formularios ?? []).find((f) => f.id === form?.formId) ?? null, [formularios, form?.formId])
    const tieneFormulario = Boolean(form?.formId || publicado?.sections?.length)
    const completas = (respuestas ?? []).filter((r) => r.estado === 'completo')
    const pendientes = (respuestas ?? []).filter((r) => r.estado === 'pendiente')

    const prender = () => updateForm((prev) => (prev?.enabled ? { ...prev, enabled: false } : { ...reglasDefault(), ...(prev ?? {}), enabled: true }))

    const usar = (f, { avisar = true } = {}) => {
        updateForm((prev) => ({ ...reglasDefault(), ...(prev ?? {}), enabled: true, formId: f.id, snapshot: snapshotDe(f) }))
        setPickerOpen(false)
        if (avisar) message.success(t('side_events.frm_now_uses', { title: f.title || t('side_events.frm_untitled') }))
    }

    const crearNuevo = async () => {
        if (creando) return
        setCreando(true)
        try {
            const f = await crear({ title: t('side_events.frm_untitled'), description: '', items: [preguntaNueva('short')] })
            usar(f, { avisar: false })
            message.success(t('side_events.frm_created'))
            setVista({ tab: 'questions', activa: f.items[0]?.id })
        } catch {
            message.error(t('side_events.frm_error_save'))
        } finally {
            setCreando(false)
        }
    }

    // Editar: si el formulario no es de quien edita (o es uno viejo de
    // plantilla), se guarda primero una copia en sus formularios.
    const editar = async (tab = 'questions', extra = {}) => {
        if (elegido || tab !== 'questions') { setVista({ tab, ...extra }); return }
        if (formularios === null) return // todavía cargando Mis formularios
        try {
            const f = await crear({ title: publicado?.title || t('side_events.frm_untitled'), description: publicado?.intro ?? '', items: itemsDeSnapshot(publicado) })
            usar(f, { avisar: false })
            setVista({ tab, ...extra })
        } catch {
            message.error(t('side_events.frm_error_save'))
        }
    }

    const metaDe = (f) => {
        const n = contarPreguntas(f.items)
        return `${t('side_events.frm_n_questions', { count: n })} · ${t('side_events.frm_edited', { when: haceCuanto(f.updated_at, lang) })}`
    }

    const tituloElegido = elegido?.title || publicado?.title || t('side_events.frm_untitled')
    const metaElegido = elegido
        ? metaDe(elegido)
        : t('side_events.frm_n_questions', { count: (publicado?.sections ?? []).reduce((n, s) => n + s.fields.length, 0) })

    return (
        <div className={ims.panel}>
            <section className={ims.card}>
                <button type="button" className={ims.cardHead} role="switch" aria-checked={activo} onClick={prender}>
                    <span className={ims.cardIcon}><ClipboardList size={18} strokeWidth={1.9} /></span>
                    <span className={ims.cardCol}>
                        <span className={ims.cardTitle}>{t('side_events.frm_switch')}</span>
                        <span className={ims.cardSub}>{t('side_events.frm_switch_sub')}</span>
                    </span>
                    <Interruptor on={activo} />
                </button>
            </section>

            {activo && (
                <>
                    {/* Obligatorio (lo decide el organizador; apagado de entrada):
                        al confirmar el formulario se abre solo y no deja ver nada
                        más hasta responderlo. Mismo ajuste que la pestaña Ajustes. */}
                    <section className={ims.card}>
                        <button
                            type="button"
                            className={ims.cardHead}
                            role="switch"
                            aria-checked={form?.required === true}
                            onClick={() => updateForm((prev) => ({ ...(prev ?? {}), required: !(prev?.required === true) }))}
                        >
                            <span className={ims.cardIcon}><Lock size={18} strokeWidth={1.9} /></span>
                            <span className={ims.cardCol}>
                                <span className={ims.cardTitle}>{t('side_events.frm_set_required')}</span>
                                <span className={ims.cardSub}>{t(form?.required === true ? 'side_events.frm_set_required_on' : 'side_events.frm_set_required_off')}</span>
                            </span>
                            <Interruptor on={form?.required === true} />
                        </button>
                    </section>

                    <section className={ims.card}>
                        <span className={ims.rowLabel}>{t('side_events.frm_chosen')}</span>
                        {tieneFormulario && (
                            <>
                                <div className={styles.elegido}>
                                    <span className={styles.miniatura}><FileText size={18} strokeWidth={1.8} /></span>
                                    <span className={styles.col}>
                                        <span className={styles.titulo}>{tituloElegido}</span>
                                        <span className={styles.meta}>{metaElegido}</span>
                                    </span>
                                </div>
                                <div className={styles.dosBotones}>
                                    <button type="button" className={ims.darkBtn} onClick={() => editar('questions')}>{t('side_events.frm_edit')}</button>
                                    <button type="button" className={styles.botonClaro} aria-expanded={pickerOpen} onClick={() => setPickerOpen((v) => !v)}>
                                        {t('side_events.frm_change')}
                                    </button>
                                </div>
                            </>
                        )}

                        {(pickerOpen || !tieneFormulario) && (
                            <div className={styles.picker}>
                                {(formularios?.length ?? 0) > 0 && (
                                    <>
                                        <span className={ims.rowLabel}>{t('side_events.frm_mine')}</span>
                                        <div className={styles.lista} role="listbox" aria-label={t('side_events.frm_mine')}>
                                            {formularios.map((f) => {
                                                const on = f.id === form?.formId
                                                const n = usos[f.id] ?? 0
                                                return (
                                                    <button key={f.id} type="button" role="option" aria-selected={on} className={styles.opcion} data-on={on || undefined} onClick={() => (on ? setPickerOpen(false) : usar(f))}>
                                                        <span className={styles.col}>
                                                            <span className={styles.opcionTitulo}>{f.title || t('side_events.frm_untitled')}</span>
                                                            <span className={styles.opcionMeta}>
                                                                {t('side_events.frm_n_questions', { count: contarPreguntas(f.items) })} · {n ? t('side_events.frm_used_in', { count: n }) : t('side_events.frm_unused')}
                                                            </span>
                                                        </span>
                                                        {on && <Check size={16} strokeWidth={2.4} className={styles.check} />}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </>
                                )}
                                {error && <span className={styles.nota}>{t('side_events.frm_error_load')}</span>}
                                <button type="button" className={styles.crear} onClick={crearNuevo} disabled={creando}>
                                    <Plus size={16} strokeWidth={2.2} /> {t('side_events.frm_create')}
                                </button>
                                {tieneFormulario && <span className={styles.nota}>{t('side_events.frm_change_note')}</span>}
                            </div>
                        )}
                    </section>

                    {tieneFormulario && (
                        <section className={ims.card}>
                            <div className={styles.respHead}>
                                <span className={ims.rowLabel}>{t('side_events.frm_responses')}</span>
                                {completas.length > 0 && <span className={styles.chip} data-tono="ok">{t('side_events.frm_n_complete', { count: completas.length })}</span>}
                                {pendientes.length > 0 && <span className={styles.chip} data-tono="pend">{t('side_events.frm_n_pending', { count: pendientes.length })}</span>}
                            </div>
                            <div className={ims.msgs}>
                                {respuestas === null && <span className={ims.empty}>…</span>}
                                {respuestas !== null && !completas.length && <span className={ims.empty}>{t('side_events.frm_no_responses')}</span>}
                                {completas.slice(0, 3).map((r) => (
                                    <button key={r.guestId} type="button" className={styles.respuesta} onClick={() => setVista({ tab: 'responses', guestId: r.guestId })}>
                                        <span className={styles.avatar}>{inicialesDe(r.nombre)}</span>
                                        <span className={styles.respNombre}>{r.nombre}</span>
                                        <span className={styles.respFecha}>{fechaCorta(r.actualizado, lang)}</span>
                                    </button>
                                ))}
                            </div>
                            <div className={styles.respBotones}>
                                <button type="button" className={styles.verTodas} onClick={() => setVista({ tab: 'responses' })}>{t('side_events.frm_see_all')}</button>
                                <button
                                    type="button"
                                    className={styles.descargar}
                                    disabled={!respuestas?.length}
                                    aria-label={t('side_events.frm_download')}
                                    title={t('side_events.frm_download_xlsx')}
                                    onClick={() => descargarRespuestas({ formato: 'xlsx', filas: respuestas, snapshot: publicado, eventoId, t, lang })}
                                >
                                    <Download size={16} />
                                </button>
                            </div>
                        </section>
                    )}
                </>
            )}

            {vista && createPortal(
                <FormularioVista
                    inicial={vista}
                    formulario={elegido}
                    reglas={form}
                    publicado={publicado}
                    updateForm={updateForm}
                    cambiarLocal={cambiarLocal}
                    guardar={guardar}
                    respuestas={respuestas}
                    recargar={cargar}
                    eventoId={eventoId}
                    fondo={body?.image}
                    onCopiar={() => editar('questions')}
                    onClose={() => setVista(null)}
                />,
                document.body,
            )}
        </div>
    )
}
