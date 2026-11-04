import { useState } from 'react'
import { Popover } from 'antd'
import { useTranslation } from 'react-i18next'
import { EMOJIS_POP } from '../../helpers/invitation/popEmojis'
import styles from './EmojiPop.module.css'

/**
 * Emoji del Pop en el encabezado del editor, junto al nombre: un cuadrito con
 * el emoji sobre el color del tema (como en la lista de Pops) que abre un
 * popover anclado con la cuadrícula. `value` = body.emoji ('' = sin emoji);
 * `onChange` recibe el emoji elegido o '' al quitarlo.
 */
export const EmojiPop = ({ value, color, onChange }) => {
    const { t } = useTranslation()
    const [abierto, setAbierto] = useState(false)

    const elegir = (e) => {
        onChange(e)
        setAbierto(false)
    }

    const contenido = (
        <div className={styles.popover} data-text-bar>
            <div className={styles.cabeza}>
                <span className={styles.titulo}>{t('side_events.pop_emoji')}</span>
                {value && (
                    <button type='button' className={styles.quitar} onClick={() => elegir('')}>
                        {t('side_events.pop_emoji_remove')}
                    </button>
                )}
            </div>
            <span className={styles.ayuda}>{t('side_events.pop_emoji_hint')}</span>
            <div className={styles.grid} role='radiogroup' aria-label={t('side_events.pop_emoji')}>
                {EMOJIS_POP.map((e) => (
                    <button
                        key={e}
                        type='button'
                        role='radio'
                        aria-checked={value === e}
                        className={styles.opcion}
                        data-on={value === e || undefined}
                        onClick={() => elegir(e)}
                    >
                        {e}
                    </button>
                ))}
            </div>
        </div>
    )

    return (
        <Popover
            open={abierto}
            onOpenChange={setAbierto}
            trigger='click'
            placement='bottomLeft'
            arrow={false}
            content={contenido}
            styles={{ container: { padding: 0, borderRadius: 32 } }}
        >
            <button
                type='button'
                className={styles.boton}
                style={{ background: color || 'var(--pops-superficie)' }}
                aria-label={t('side_events.pop_emoji')}
                data-vacio={!value || undefined}
            >
                {value || <span className={styles.mas}>+</span>}
            </button>
        </Popover>
    )
}

export default EmojiPop
