import { ColorPicker, DatePicker } from 'antd'
import { EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { colorFactoryToHex, formatDateToISO } from '../../../../helpers/assets/functions'
import styles from './ModuleStyle.module.css'

// Fecha de la portada: día del evento, color del contador y ocultarla. Es el
// popover que se abre al tocar la fecha sobre la pieza en el modo edición
// (EditCanvas). Mismos datos que el bloque Fecha del panel de Portada
// (BuildCover): cover.date.{value, color, active}.
export const CoverDateStyle = ({ invitation, setInvitation, setSaved }) => {
    const { t } = useTranslation()
    const date = invitation?.cover?.date ?? {}
    const titleColor = invitation?.cover?.title?.text?.color

    const setDate = (patch) => {
        setInvitation((prev) => ({ ...prev, cover: { ...prev.cover, date: { ...prev.cover.date, ...patch } } }))
        setSaved(false)
    }

    return (
        <div className={styles.panel}>
            <div className={styles.head}>
                <span className={styles.title}>{t('build_cover.section_date')}</span>
                <button type="button" className={styles.ghost} onClick={() => setDate({ active: false })}>
                    <EyeOff size={14} />
                    {t('build_editor.hide')}
                </button>
            </div>

            <div className={styles.body}>
                <DatePicker
                    className={styles.datePicker}
                    allowClear={false}
                    format="D MMM YYYY"
                    value={date.value ? dayjs(date.value.split('T')[0]) : null}
                    onChange={(d) => d && setDate({ value: formatDateToISO(d) })}
                />
                <div className={styles.row}>
                    <span className={styles.label}>{t('build_menu.color')}</span>
                    <div className={styles.control}>
                        <div className={styles.colorRow}>
                            {date.color && date.color !== titleColor && (
                                <button type="button" className={styles.link} onClick={() => setDate({ color: titleColor })}>
                                    {t('build_editor.use_title_color')}
                                </button>
                            )}
                            <ColorPicker
                                size="small"
                                disabledAlpha
                                value={date.color ?? titleColor}
                                onChangeComplete={(c) => setDate({ color: colorFactoryToHex(c) })}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
