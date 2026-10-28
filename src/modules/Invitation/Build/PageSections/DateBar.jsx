import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DatePicker, Popover, Select } from 'antd'
import { EyeOff, LayoutGrid } from 'lucide-react'
import { CountdownStylePicker } from './CountdownStylePicker'
import dayjs from 'dayjs'
import { formatDateToISO } from '../../../../helpers/assets/functions'
import { useFonts } from '../../../../context/FontsContext'
import { fonts as fallbackFonts } from '../../../../helpers/assets/fonts'
import styles from './ElementBar.module.css'

// Barra de la fecha de la portada (contador), arriba de la pieza. Reemplaza
// en escritorio al popover CoverDateStyle: ocultar, estilo (catálogo de 12,
// cover.date.style), día, tipografía
// (cover.date.font; vacía = la del cuerpo) y color (panel "Color" del riel;
// "Usar el del título" si ya es otro).
export const DateBar = ({ invitation, setInvitation, setSaved, onPickColor, colorOpen }) => {
    const { t } = useTranslation()
    const date = invitation?.cover?.date ?? {}
    const titleColor = invitation?.cover?.title?.text?.color
    const { fonts: activeFonts } = useFonts()
    const fontOptions = activeFonts.length ? activeFonts : fallbackFonts
    const bodyFont = invitation?.generals?.fonts?.body?.typeFace

    const [styleOpen, setStyleOpen] = useState(false)
    const setDate = (patch) => {
        setInvitation((prev) => ({ ...prev, cover: { ...prev.cover, date: { ...prev.cover.date, ...patch } } }))
        setSaved(false)
    }

    return (
        <div className={styles.bar} data-edit-keep data-text-bar>
            <button type="button" className={styles.iconBtn} title={t('build_editor.hide')} onClick={() => setDate({ active: false })}>
                <EyeOff size={18} />
            </button>

            <span className={styles.divider} />

            {/* Estilo del catálogo (cover.date.style; "1a" = el de siempre). */}
            <Popover
                open={styleOpen}
                onOpenChange={setStyleOpen}
                trigger="click"
                // Hacia la izquierda del botón: no tapa la pieza.
                placement="bottomRight"
                arrow={false}
                content={<CountdownStylePicker invitation={invitation} value={date.style} onPick={(id) => setDate({ style: id === '1a' ? null : id })} />}
            >
                <button type="button" className={styles.textBtn} data-on={styleOpen || undefined}>
                    <LayoutGrid size={17} /> {t('build_editor.cd_style')}
                </button>
            </Popover>

            <span className={styles.divider} />

            <DatePicker
                className={styles.dateInput}
                allowClear={false}
                format="D MMM YYYY"
                value={date.value ? dayjs(date.value.split('T')[0]) : null}
                onChange={(d) => d && setDate({ value: formatDateToISO(d) })}
            />
            <Select
                className={styles.fontWide}
                value={date.font ?? '__body'}
                popupMatchSelectWidth={220}
                onChange={(value) => setDate({ font: value === '__body' ? null : value })}
                options={[
                    { value: '__body', label: <span style={{ fontFamily: `"${bodyFont}"` }}>{t('build_editor.date_font_body')}</span> },
                    ...fontOptions.map((f) => ({ value: f, label: <span style={{ fontFamily: `"${f}"` }}>{f}</span> })),
                ]}
            />

            <span className={styles.divider} />

            <button type="button" className={styles.swatchBtn} data-on={colorOpen || undefined} title={t('build_menu.color')} onClick={onPickColor}>
                <span className={styles.swatch} style={{ background: date.color ?? titleColor }} />
            </button>
            {date.color && date.color !== titleColor && (
                <button type="button" className={styles.textBtn} onClick={() => setDate({ color: titleColor })}>
                    {t('build_editor.use_title_color')}
                </button>
            )}
        </div>
    )
}
