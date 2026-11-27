import { useTranslation } from 'react-i18next'
import { SlidersHorizontal, X } from 'lucide-react'
import s from './ModoAvanzadoBar.module.css'

/*
  Barra de arriba de la pieza mientras está abierta la Edición avanzada del
  PDF (el centro enseña el dock para usarlo): "Modo avanzado" en azul oscuro,
  para que se note que se está en otro modo, y Salir, que cierra el bloque y
  regresa la pieza.
*/
export const ModoAvanzadoBar = ({ onSalir }) => {
    const { t } = useTranslation()
    return (
        <div className={s.barra} data-edit-keep data-text-bar>
            <span className={s.etiqueta}>
                <span className={s.icono}><SlidersHorizontal size={15} /></span>
                <span className={s.textos}>
                    <span className={s.titulo}>{t('pdf_estilo.modo')}</span>
                    <span className={s.sub}>{t('pdf_estilo.modo_sub')}</span>
                </span>
            </span>
            <button type="button" className={s.salir} onClick={onSalir}>
                <X size={15} />
                {t('pdf_estilo.salir')}
            </button>
        </div>
    )
}
