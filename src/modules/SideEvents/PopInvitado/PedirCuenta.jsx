import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import globo from '../../../assets/pops-stickers/craft/globo.svg'
import s from '../PlanPops/PruebaPlus.module.css'
import own from './PopInvitado.module.css'

/*
  Pop sin cuenta (`/crear-pop`): al tocar Guardar, Enviar (Invitados) o
  Compartir se pide crear una cuenta. "Crear mi cuenta" lleva al registro y
  "Ya tengo cuenta" al login; los dos regresan a /invitations?accion=guardar-pop,
  que crea el Pop con el borrador y abre su editor (con `luego`: compartir,
  enviar o guardar). Mismo formato que el modal de Compartir de Pops+.
*/
export const PedirCuenta = ({ open, luego, onClose, onCrear, onEntrar }) => {
    const { t } = useTranslation()
    useEffect(() => {
        if (!open) return undefined
        const esc = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', esc)
        return () => window.removeEventListener('keydown', esc)
    }, [open, onClose])
    if (!open) return null
    return createPortal(
        <div className={s.velo} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="pop-pedir-cuenta">
                <div className={s.modalCabeza}>
                    <span id="pop-pedir-cuenta" className={`${s.recorte} ${s.recortePapel}`}>{t('pop_invitado.title_1')}</span>
                    <span className={`${s.recorte} ${s.recorteLima}`}>{t('pop_invitado.title_2')}</span>
                    <img src={globo} alt="" aria-hidden className={s.modalGlobo} />
                </div>
                <div className={s.modalCuerpo}>
                    <p className={s.modalTexto}>{t(`pop_invitado.text_${luego}`, { defaultValue: t('pop_invitado.text_guardar') })}</p>
                    <span className={s.modalDePaso}>{t('pop_invitado.keep')}</span>
                    <div className={own.acciones}>
                        <button type="button" className={s.modalPlus} onClick={onCrear}>
                            {t('pop_invitado.create')}
                            <span className={s.modalFlecha}>→</span>
                        </button>
                        <button type="button" className={s.modalQuitar} onClick={onEntrar}>{t('pop_invitado.have_account')}</button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    )
}
