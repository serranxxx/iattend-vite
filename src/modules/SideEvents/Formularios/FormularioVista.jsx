import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Popconfirm } from 'antd'
import { Check, ChevronLeft } from 'lucide-react'
import styles from './FormularioVista.module.css'
import { PreguntasTab } from './PreguntasTab'
import { RespuestasTab } from './RespuestasTab'
import { AjustesTab } from './AjustesTab'
import { incompleta, snapshotDe } from './modelo'

/*
  Vista completa de un formulario (handoff "Formularios propios", 1b): se
  abre encima del editor del Flash con tres pestañas, Preguntas · Respuestas
  · Ajustes. Las preguntas se guardan solas en Mis formularios (forms, con
  ~800 ms de espera) y a la vez actualizan el snapshot de este Flash
  (body.form.snapshot, entra al historial del editor y se guarda con el
  Flash). Ajustes son reglas de este Flash, no del formulario.
*/

const TABS = ['questions', 'responses', 'settings']

export const FormularioVista = ({
    inicial, formulario, reglas, publicado, updateForm, cambiarLocal, guardar,
    respuestas, recargar, eventoId, fondo, onCopiar, onClose,
}) => {
    const { t } = useTranslation()
    const [tab, setTab] = useState(inicial?.tab ?? 'questions')
    const [guardando, setGuardando] = useState(false)
    const [aviso, setAviso] = useState(null) // { texto, deshacer? }
    const [confirmarSalida, setConfirmarSalida] = useState(false)
    const [activaPedida, setActivaPedida] = useState(inicial?.activa ?? null)
    const pendiente = useRef({})
    const reloj = useRef(null)
    const avisoReloj = useRef(null)
    const formId = formulario?.id

    const avisar = useCallback((texto, deshacer) => {
        clearTimeout(avisoReloj.current)
        setAviso({ texto, deshacer, n: Date.now() })
        avisoReloj.current = setTimeout(() => setAviso(null), deshacer ? 4000 : 2200)
    }, [])
    useEffect(() => () => clearTimeout(avisoReloj.current), [])

    // Guardado en Mis formularios (con espera) y snapshot del Flash (al momento).
    const vaciar = useCallback(async () => {
        clearTimeout(reloj.current)
        const patch = pendiente.current
        pendiente.current = {}
        if (!formId || !Object.keys(patch).length) { setGuardando(false); return }
        try {
            await guardar(formId, patch)
        } catch {
            avisar(t('side_events.frm_error_save'))
        } finally {
            if (!Object.keys(pendiente.current).length) setGuardando(false)
        }
    }, [formId, guardar, t, avisar])

    const editar = useCallback((patch) => {
        if (!formulario) return
        const nuevo = { ...formulario, ...patch }
        cambiarLocal(formulario.id, patch)
        updateForm((prev) => (prev?.formId === formulario.id ? { ...prev, snapshot: snapshotDe(nuevo) } : prev), { coalesce: `form.${formulario.id}` })
        pendiente.current = { ...pendiente.current, ...patch }
        setGuardando(true)
        clearTimeout(reloj.current)
        reloj.current = setTimeout(vaciar, 800)
    }, [formulario, cambiarLocal, updateForm, vaciar])

    // Al cerrar (o desmontar) no se pierde lo que estaba por guardarse.
    useEffect(() => () => { vaciar() }, [vaciar])

    const incompletas = (formulario?.items ?? []).filter(incompleta)
    const listo = () => {
        if (incompletas.length && tab === 'questions') { setConfirmarSalida(true); return }
        vaciar()
        onClose()
    }

    const completas = (respuestas ?? []).filter((r) => r.estado === 'completo').length
    const titulo = formulario?.title || publicado?.title || t('side_events.frm_untitled')

    return (
        <div className={styles.vista} role="dialog" aria-modal="true" aria-label={titulo}>
            <header className={styles.barra}>
                <div className={styles.barraIzq}>
                    <button type="button" className={styles.volver} onClick={listo} aria-label={t('side_events.frm_back')}>
                        <ChevronLeft size={20} />
                    </button>
                    <span className={styles.barraCol}>
                        <span className={styles.barraTitulo}>{titulo}</span>
                        {formulario && (
                            <span className={styles.barraEstado}>
                                {guardando ? t('side_events.frm_saving') : <><Check size={12} strokeWidth={2.6} /> {t('side_events.frm_saved')}</>}
                            </span>
                        )}
                    </span>
                </div>

                <div className={styles.tabs} role="tablist">
                    {TABS.map((id) => (
                        <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? styles.tabOn : undefined} onClick={() => setTab(id)}>
                            {t(`side_events.frm_tab_${id}`)}
                            {id === 'responses' && completas > 0 && <span className={styles.badge}>{completas}</span>}
                        </button>
                    ))}
                </div>

                <div className={styles.barraDer}>
                    <Popconfirm
                        open={confirmarSalida}
                        onOpenChange={(v) => { if (!v) setConfirmarSalida(false) }}
                        placement="bottomRight"
                        zIndex={1300}
                        title={t('side_events.frm_incomplete_title', { count: incompletas.length })}
                        description={t('side_events.frm_incomplete_desc')}
                        okText={t('side_events.frm_exit_anyway')}
                        cancelText={t('side_events.frm_review')}
                        onConfirm={() => { setConfirmarSalida(false); vaciar(); onClose() }}
                        onCancel={() => { setConfirmarSalida(false); setActivaPedida(incompletas[0]?.id ?? null) }}
                    >
                        <button type="button" className={styles.listo} onClick={listo}>{t('side_events.frm_done')}</button>
                    </Popconfirm>
                </div>
            </header>

            <div className={styles.cuerpo}>
                {tab === 'questions' && (
                    formulario
                        ? <PreguntasTab formulario={formulario} editar={editar} avisar={avisar} fondo={fondo} activaPedida={activaPedida} />
                        : (
                            <div className={styles.sinFormulario}>
                                <span>{t('side_events.frm_not_mine')}</span>
                                <button type="button" className={styles.listo} onClick={onCopiar}>{t('side_events.frm_make_copy')}</button>
                            </div>
                        )
                )}
                {tab === 'responses' && (
                    <RespuestasTab
                        respuestas={respuestas}
                        recargar={recargar}
                        snapshot={publicado}
                        eventoId={eventoId}
                        guestInicial={inicial?.guestId}
                        avisar={avisar}
                    />
                )}
                {tab === 'settings' && <AjustesTab reglas={reglas} updateForm={updateForm} />}
            </div>

            {aviso && (
                <div key={aviso.n} className={styles.aviso} role="status">
                    <span>{aviso.texto}</span>
                    {aviso.deshacer && (
                        <button type="button" onClick={() => { aviso.deshacer(); setAviso(null) }}>{t('side_events.frm_undo')}</button>
                    )}
                </div>
            )}
        </div>
    )
}
