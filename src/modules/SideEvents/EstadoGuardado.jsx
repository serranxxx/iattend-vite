import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CloudCheck, CloudOff, CloudUpload } from 'lucide-react'
import s from './EstadoGuardado.module.css'

/*
  Indicador del autoguardado del editor de side events / Pop (ya no hay
  botón Guardar): "Guardando…" mientras se guarda (los cambios que aún
  esperan el autoguardado no enseñan nada), "Guardado" cuando todo está en la base y, si falla, "No se
  guardó" con Reintentar. Lo usan el header de escritorio y el del celular.
  Solo se ve cuando se autoguarda algo: aparece al guardar, enseña
  "Guardado" un momento (VISIBLE_MS) y se desvanece; el error se queda.
*/

const VISIBLE_MS = 2500
export const EstadoGuardado = ({ estado, onReintentar, className }) => {
    const { t } = useTranslation()
    // De entrada no se ve; al guardar aparece y, ya guardado, se va solo.
    const [visible, setVisible] = useState(false)
    const vioGuardar = useRef(false)
    useEffect(() => {
        // Con cambios pendientes (aún esperando el autoguardado) no sale nada:
        // solo mientras de verdad se guarda.
        if (estado === 'pendiente') { setVisible(false); return undefined }
        if (estado === 'guardando' || estado === 'error') {
            vioGuardar.current = true
            setVisible(true)
            return undefined
        }
        if (!vioGuardar.current) return undefined
        setVisible(true)
        const timer = setTimeout(() => setVisible(false), VISIBLE_MS)
        return () => clearTimeout(timer)
    }, [estado])
    if (estado === 'error') {
        return (
            <span className={`${s.estado} ${className ?? ''}`} data-estado="error" data-visible role="status">
                <CloudOff size={15} strokeWidth={2} />
                {t('side_events.autosave_error')}
                <button type="button" className={s.reintentar} onClick={onReintentar}>{t('side_events.autosave_retry')}</button>
            </span>
        )
    }
    const guardando = estado === 'guardando'
    return (
        <span className={`${s.estado} ${className ?? ''}`} data-estado={guardando ? 'guardando' : 'guardado'} data-visible={visible || undefined} aria-hidden={!visible || undefined} role="status" aria-live="polite">
            {guardando ? <CloudUpload size={15} strokeWidth={2} /> : <CloudCheck size={15} strokeWidth={2} />}
            {t(guardando ? 'side_events.autosave_saving' : 'side_events.autosave_saved')}
        </span>
    )
}
