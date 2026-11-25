import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CloudCheck, CloudOff, CloudUpload, Sparkles } from 'lucide-react'
import { Popover } from 'antd'
import s from './EstadoGuardado.module.css'

/*
  Indicador del autoguardado del editor de side events / Pop (ya no hay
  botón Guardar): "Guardando…" mientras se guarda (los cambios que aún
  esperan el autoguardado no enseñan nada), "Guardado" cuando todo está en la base y, si falla, "No se
  guardó" con Reintentar. Lo usan el header de escritorio y el del celular.
  Solo se ve cuando se autoguarda algo: aparece al guardar, enseña
  "Guardado" un momento (VISIBLE_MS) y se desvanece; el error se queda.
  Con `funcionesPlus` (Pop Free que usa funciones Plus, planPops.js): en vez de
  todo eso, una píldora fija "Funciones Plus · sin guardar" que abre la lista y
  "Volver a lo guardado" (`onQuitarPlus`). Mientras esté, no se guarda nada.
*/

const VISIBLE_MS = 2500
const AvisoPlus = ({ funciones, onQuitarPlus, className }) => {
    // Sin onQuitarPlus (lo guardado ya trae funciones Plus), solo la lista.
    const { t } = useTranslation()
    const contenido = (
        <div className={s.plusPanel} data-text-bar>
            <strong className={s.plusTitulo}>{t('pops_plus.probando_titulo')}</strong>
            <p className={s.plusTexto}>{t('pops_plus.probando_texto')}</p>
            <ul className={s.plusLista}>
                {funciones.map((f) => <li key={f}>{t(`pops_plus.funcion.${f}`)}</li>)}
            </ul>
            {onQuitarPlus && <button type="button" className={s.plusQuitar} onClick={onQuitarPlus}>{t('pops_plus.volver_guardado')}</button>}
        </div>
    )
    return (
        <Popover content={contenido} trigger="click" placement="bottomRight" arrow={false} zIndex={1250}>
            {/* En un span: la barra de arriba fuerza 34 px a sus botones directos. */}
            <span className={s.plusEnvoltura}>
                <button type="button" className={`${s.estado} ${s.plus} ${className ?? ''}`} data-visible data-estado="plus" aria-live="polite">
                    <Sparkles size={15} strokeWidth={2} />
                    {t('pops_plus.sin_guardar')}
                </button>
            </span>
        </Popover>
    )
}

export const EstadoGuardado = ({ estado, onReintentar, className, funcionesPlus, onQuitarPlus }) => {
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
    if (funcionesPlus?.length) return <AvisoPlus funciones={funcionesPlus} onQuitarPlus={onQuitarPlus} className={className} />
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
