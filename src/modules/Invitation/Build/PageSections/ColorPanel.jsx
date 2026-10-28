import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ColorPicker } from 'antd'
import { Plus, Search } from 'lucide-react'
import { colorFactoryToHex } from '../../../../helpers/assets/functions'
import styles from './ColorPanel.module.css'

// Panel "Color" del riel (se abre desde la barra del elemento, ElementBar):
// color / relleno o color del borde del elemento suelto elegido. Primero los
// colores de la invitación (su paleta), luego uno propio y los sólidos de
// siempre (elemento suelto o texto, según `target`).

// Colores sólidos: grises y 18 tonos del oscuro al claro (7 por fila).
const SOLIDS = [
    '#000000', '#545454', '#737373', '#A6A6A6', '#D9D9D9', '#F2F2F2', '#FFFFFF',
    '#000C36', '#04167A', '#0726C4', '#2747F5', '#5973F5', '#9AAAF8', '#C5CEFC',
    '#050B3D', '#250A63', '#4214AE', '#5A1EE3', '#8656F6', '#B9A2F0', '#D7CCF6',
    '#1B0A2E', '#3A1460', '#6022A3', '#8A46D6', '#A87BDF', '#C8A6E8', '#DFCDF2',
    '#290B33', '#4E1863', '#8225A6', '#B14AD8', '#C474DF', '#D9A6EA', '#E9CDF3',
    '#3A0627', '#6E1449', '#BB2675', '#E840A0', '#EE73BE', '#F29FD2', '#F6C4E5',
    '#2E0D0B', '#5C1B17', '#E8433A', '#E8524A', '#EC625C', '#F2B1AF', '#F7D8D6',
    '#3A0402', '#6E1610', '#B5281E', '#E5483D', '#EA6862', '#F09E97', '#F6C6C3',
    '#3A1B05', '#733514', '#BB5726', '#EC7E3B', '#F09A5E', '#F4C29E', '#F8DCC6',
    '#3A2706', '#744C18', '#C07E2C', '#EFAB44', '#F3C26D', '#F6D79C', '#F9E9C8',
    '#3C320B', '#7A641E', '#C4A43A', '#F6D452', '#F8DF72', '#FBEAA0', '#FDF4CC',
    '#283A0B', '#52771F', '#89C33E', '#B5F755', '#CFFA84', '#E1FCA9', '#EEFDD3',
    '#1D2F10', '#3C5E22', '#62A03D', '#91D467', '#ACE08B', '#C9EAB4', '#E1F3D8',
    '#183D22', '#367648', '#56B86B', '#77F799', '#8DFAB3', '#B0FAD1', '#D3FCE7',
    '#163626', '#326B54', '#58B68A', '#72E4B2', '#92F0C9', '#B6F4DE', '#D3F8EC',
    '#163338', '#31656A', '#51A7AF', '#6CD6DF', '#85DEE7', '#B4EAF0', '#D4F3F6',
    '#12313D', '#2C6578', '#4393AE', '#59BADA', '#8AE4FA', '#AEECFA', '#CFF4FC',
    '#0C2238', '#234E78', '#3880C4', '#60B1F8', '#8BC8FA', '#A9D6FA', '#CAE6FB',
    '#081838', '#163672', '#1F4EA4', '#4580F5', '#6FA4F7', '#A2C2F9', '#C9DAFB',
]

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i
const normalize = (v) => {
    const m = v.trim().match(HEX)
    if (!m) return null
    const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1]
    return `#${h.toUpperCase()}`
}

// `target` (lo arma EditorWorkspace): { label, value, allowNone, onPick }. Sin
// target (nada elegido), solo un aviso.
export const ColorPanel = ({ invitation, colorTarget: target }) => {
    const { t } = useTranslation()
    const [query, setQuery] = useState('')

    if (!target) return <span className={styles.empty}>{t('build_editor.color_pick_element')}</span>

    const current = target.value
    const g = invitation?.generals ?? {}
    const palette = [...new Set([g.colors?.primary, g.colors?.secondary, g.colors?.accent, g.colors?.actions, g.fonts?.titles?.color].filter(Boolean).map((c) => c.toUpperCase()))]
    const allowNone = target.allowNone
    const pick = target.onPick
    const typed = normalize(query)

    const Swatch = ({ c }) => (
        <button
            type="button"
            className={styles.swatch}
            data-on={(current || '').toUpperCase() === c.toUpperCase() || undefined}
            style={{ background: c }}
            title={c}
            onClick={() => pick(c)}
        />
    )

    return (
        <div className={styles.wrap}>
            <span className={styles.target}>{target.label}</span>

            <label className={styles.search}>
                <Search size={15} />
                <input
                    value={query}
                    placeholder={t('build_editor.color_search')}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && typed) pick(typed) }}
                />
                {typed && <button type="button" className={styles.apply} style={{ background: typed }} onClick={() => pick(typed)} aria-label={typed} />}
            </label>

            <div className={styles.group}>
                <span className={styles.label}>{t('build_editor.color_invitation')}</span>
                <div className={styles.grid}>
                    {/* Uno propio (selector completo). */}
                    <ColorPicker disabledAlpha value={current && current !== 'transparent' ? current : '#6D3CFA'} onChangeComplete={(c) => pick(colorFactoryToHex(c))}>
                        <button type="button" className={`${styles.swatch} ${styles.custom}`} title={t('build_editor.color_custom')}>
                            <Plus size={16} />
                        </button>
                    </ColorPicker>
                    {allowNone && (
                        <button type="button" className={`${styles.swatch} ${styles.none}`} data-on={current === 'transparent' || undefined} title={t('build_editor.color_none')} onClick={() => pick('transparent')} />
                    )}
                    {palette.map((c) => <Swatch key={c} c={c} />)}
                </div>
            </div>

            <div className={styles.group}>
                <span className={styles.label}>{t('build_editor.color_solids')}</span>
                <div className={styles.grid}>
                    {SOLIDS.map((c) => <Swatch key={c} c={c} />)}
                </div>
            </div>
        </div>
    )
}
