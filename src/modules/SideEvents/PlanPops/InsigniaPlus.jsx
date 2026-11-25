import { useTranslation } from 'react-i18next'
import s from './InsigniaPlus.module.css'

/*
  Insignia de Pops Plus: la marca "Pops+" (navy, letra gruesa, el "+" en
  lima). Se pinta solo cuando el Pop es Free (quien la usa revisa
  usePopFree): en un Pop Plus no hace falta avisar nada. La opción sigue
  funcionando (se puede probar) salvo las que se bloquean; lo que no se puede
  es guardar.
  `esquina`: flota arriba a la derecha de su caja (el padre necesita
  position: relative); sin ella va en línea, junto al texto.
  `tam`: 's' (la de siempre) · 'm' · 'l'.
*/
export const InsigniaPlus = ({ esquina = false, tam = 's', className }) => {
    const { t } = useTranslation()
    return (
        <span
            className={`${s.insignia} ${esquina ? s.esquina : ''} ${className ?? ''}`}
            data-tam={tam}
            title={t('pops_plus.insignia_hint')}
            aria-label="Pops Plus"
            role="img"
        >
            Pops<span className={s.mas} aria-hidden>+</span>
        </span>
    )
}
