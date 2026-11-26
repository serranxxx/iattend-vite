import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { TOPE_POPS_FREE } from './usePlanPops'
import { HojaPops } from './HojaPops'
import s from './PopsApp.module.css'

/*
  Avisos de límite de Pops Free (handoff "App de Pops" §8). Sin tono de
  regaño.
  · AvisoLimite: banner en Inicio y Mis Pops. `tipo` limite (3 de 3 Pops) o
    espacio (≥ 90 %): ícono, título, texto, la acción secundaria (Archivar un
    Pop / Liberar espacio, las dos llevan a Mis Pops) y "Conocer Pops+".
  · ModalLimite: al tocar Make a Pop con 3 de 3. En el celular (`movil`), hoja
    inferior con Pasar a Pops+, Archivar un Pop y "Ahora no".
*/

export const AvisoLimite = ({ tipo, mb, mbTope, onSecundaria, onPlus, movil }) => {
    const { t } = useTranslation()
    const limite = tipo === 'limite'
    return (
        <div className={s.aviso} data-movil={movil || undefined}>
            <span className={s.avisoIcono} aria-hidden>{limite ? '🎈' : '📦'}</span>
            <span className={s.avisoTextos}>
                <b>{limite ? t('pops_app.limit_title', { n: TOPE_POPS_FREE }) : t('pops_app.space_title', { used: mb, total: mbTope })}</b>
                <span>{t(limite ? 'pops_app.limit_text' : 'pops_app.space_text')}</span>
            </span>
            <button type='button' className={s.avisoSecundario} onClick={onSecundaria}>
                {t(limite ? 'pops_app.archive_a_pop' : 'pops_app.free_space')}
            </button>
            <button type='button' className={s.avisoPrimario} onClick={onPlus}>{t('pops_app.discover_plus')}</button>
        </div>
    )
}

const BENEFICIOS = ['benefit_unlimited', 'benefit_space', 'benefit_forms', 'benefit_no_ads']

export const ModalLimite = ({ open, onClose, onArchivar, onPlus, movil }) => {
    const { t } = useTranslation()
    useEffect(() => {
        if (!open || movil) return undefined
        const esc = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', esc)
        return () => window.removeEventListener('keydown', esc)
    }, [open, onClose, movil])
    if (movil) {
        return (
            <HojaPops open={open} onClose={onClose} etiqueta={t('pops_app.modal_title', { n: TOPE_POPS_FREE })} className={s.hojaLimite}>
                <div className={s.hojaCuadros} aria-hidden>
                    {Array.from({ length: TOPE_POPS_FREE }, (_, i) => <span key={i} />)}
                </div>
                <h2 className={s.modalTitulo}>{t('pops_app.modal_title', { n: TOPE_POPS_FREE })}</h2>
                <p className={s.modalTexto}>{t('pops_app.modal_text')}</p>
                <ul className={s.hojaBeneficios}>
                    {BENEFICIOS.map(b => <li key={b}><span>✓</span>{t(`pops_app.${b}`)}</li>)}
                </ul>
                <button type='button' className={s.hojaPrimario} onClick={onPlus}>{t('pops_plus_app.go_plus')}</button>
                <button type='button' className={s.hojaSecundario} onClick={onArchivar}>{t('pops_app.archive_a_pop')}</button>
                <button type='button' className={s.hojaAhoraNo} onClick={onClose}>{t('pops_app.not_now')}</button>
            </HojaPops>
        )
    }
    if (!open) return null
    return createPortal(
        <div className={s.velo} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div className={s.modal} role='dialog' aria-modal='true' aria-labelledby='pops-modal-limite'>
                <button type='button' className={s.modalCerrar} onClick={onClose} aria-label={t('pops_app.close')}><X size={16} /></button>
                <div className={s.modalBarras} aria-hidden>
                    {Array.from({ length: TOPE_POPS_FREE }, (_, i) => <span key={i} />)}
                </div>
                <h2 id='pops-modal-limite' className={s.modalTitulo}>{t('pops_app.modal_title', { n: TOPE_POPS_FREE })}</h2>
                <p className={s.modalTexto}>{t('pops_app.modal_text')}</p>
                <ul className={s.modalBeneficios}>
                    {BENEFICIOS.map(b => <li key={b}><span>✓</span>{t(`pops_app.${b}`)}</li>)}
                </ul>
                <div className={s.modalAcciones}>
                    <button type='button' className={s.modalSecundario} onClick={onArchivar}>{t('pops_app.archive_a_pop')}</button>
                    <button type='button' className={s.modalPrimario} onClick={onPlus}>{t('pops_plus_app.go_plus')}</button>
                </div>
            </div>
        </div>,
        document.body,
    )
}
