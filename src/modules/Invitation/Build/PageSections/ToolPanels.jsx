import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ColorPicker } from 'antd'
import { Ban, Check, Lightbulb, Search } from 'lucide-react'
import { useTextures } from '../../../../context/TexturesContext'
import { colorCollection } from '../../../../helpers/services/colorPalette'
import { colorFactoryToHex, darker, lighter } from '../../../../helpers/assets/functions'
import styles from './ToolPanels.module.css'

// Paneles de herramienta del editor de escritorio (EditorWorkspace, etapa 2):
// Paleta, Texturas e Ideas. Todos escriben en `generals` con
// `setInvitation` (= setActiveField de BuildPage), así que cada clic entra al
// historial de deshacer y marca la invitación sin guardar.

const same = (a, b) => (a ?? '').toLowerCase() === (b ?? '').toLowerCase()

const patchGenerals = (setInvitation, setSaved, patch) => {
    setInvitation((prev) => ({ ...prev, generals: { ...prev.generals, ...patch(prev.generals) } }))
    setSaved(false)
}

// Aplicar una paleta completa: los 4 colores y el color de los títulos (como
// "Colección de colores" en Ajustes generales).
const palettePatch = (c) => (g) => ({
    colors: { ...g.colors, primary: c.primary, secondary: c.secondary, accent: c.accent, actions: c.actions },
    fonts: { ...g.fonts, titles: { ...g.fonts?.titles, color: c.accent } },
})

const isActivePalette = (colors, c) =>
    same(colors?.primary, c.primary) && same(colors?.secondary, c.secondary) && same(colors?.accent, c.accent) && same(colors?.actions, c.actions)

const Strip = ({ c, size = 'md' }) => (
    <div className={styles.strip} data-size={size}>
        {[c.primary, c.secondary, c.accent, c.actions].map((color, i) => (
            <span key={i} style={{ background: color }} />
        ))}
    </div>
)

/* ── Paleta ── */
export const PalettePanel = ({ invitation, setInvitation, setSaved }) => {
    const { t } = useTranslation()
    const [query, setQuery] = useState('')
    const colors = invitation?.generals?.colors ?? {}

    const roles = [
        { key: 'primary', label: t('build_generals.label_bg') },
        { key: 'secondary', label: t('build_generals.label_contrast') },
        { key: 'accent', label: t('build_generals.label_texts') },
        { key: 'actions', label: t('build_generals.label_accents') },
    ]

    const list = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return colorCollection
        return colorCollection.filter((c) => c.name.toLowerCase().includes(q) || c.keywords?.some((k) => k.includes(q)))
    }, [query])

    // Tonos de cada color de la paleta como atajos del selector (igual que
    // en Ajustes generales).
    const presets = roles.filter((role) => colors[role.key]).map((role) => ({
        label: role.label,
        defaultOpen: true,
        colors: [
            ...[0.3, 0.5, 0.7, 0.9].map((n) => darker(colors[role.key], n)),
            colors[role.key],
            ...[0.9, 0.7, 0.5, 0.3, 0.1].map((n) => lighter(colors[role.key], n)),
        ],
    }))

    const setColor = (key, value) => patchGenerals(setInvitation, setSaved, (g) => ({ colors: { ...g.colors, [key]: value } }))

    return (
        <>
            <div className={styles.group}>
                <span className={styles.groupLabel}>{t('build_editor.palette_current')}</span>
                <div className={styles.swatches}>
                    {roles.map((role) => (
                        <ColorPicker
                            key={role.key}
                            disabledAlpha
                            presets={presets}
                            value={colors[role.key]}
                            onChangeComplete={(c) => setColor(role.key, colorFactoryToHex(c))}
                        >
                            <button type="button" className={styles.swatch}>
                                <span className={styles.swatchColor} style={{ background: colors[role.key] }} />
                                <span className={styles.swatchLabel}>{role.label}</span>
                            </button>
                        </ColorPicker>
                    ))}
                </div>
            </div>

            <div className={styles.group}>
                <span className={styles.groupLabel}>{t('build_editor.palette_suggested')}</span>
                <label className={styles.search}>
                    <Search size={15} />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('build_generals.collection_search')} />
                </label>
                <div className={styles.paletteList}>
                    {list.map((c) => {
                        const active = isActivePalette(colors, c)
                        return (
                            <button
                                key={c.name}
                                type="button"
                                className={styles.paletteCard}
                                data-active={active || undefined}
                                onClick={() => patchGenerals(setInvitation, setSaved, palettePatch(c))}
                            >
                                <Strip c={c} />
                                <span className={styles.paletteName}>
                                    {c.name}
                                    {active && <Check size={14} />}
                                </span>
                            </button>
                        )
                    })}
                    {list.length === 0 && <span className={styles.empty}>{t('build_editor.palette_none')}</span>}
                </div>
            </div>
        </>
    )
}

/* ── Texturas ── */
export const TexturesPanel = ({ invitation, setInvitation, setSaved }) => {
    const { t } = useTranslation()
    const { textures, loading } = useTextures()
    const current = invitation?.generals?.texture ?? null
    const pick = (id) => patchGenerals(setInvitation, setSaved, () => ({ texture: id }))

    return (
        <div className={styles.group}>
            <span className={styles.groupLabel}>{t('build_editor.textures_label')}</span>
            <div className={styles.textureGrid}>
                <button type="button" className={styles.texture} data-active={current == null || undefined} onClick={() => pick(null)}>
                    <span className={styles.textureThumb} data-none>
                        <Ban size={22} />
                    </span>
                    <span className={styles.textureName}>{t('build_editor.texture_none')}</span>
                </button>
                {textures.map((tex, i) => (
                    <button key={tex.id} type="button" className={styles.texture} data-active={current === tex.id || undefined} onClick={() => pick(tex.id)}>
                        <span className={styles.textureThumb}>
                            <img alt="" src={tex.image} loading="lazy" />
                        </span>
                        <span className={styles.textureName}>{t('build_editor.texture_n', { n: i + 1 })}</span>
                    </button>
                ))}
                {loading && Array.from({ length: 5 }).map((_, i) => (
                    <span key={`s${i}`} className={styles.texture}>
                        <span className={styles.textureThumb} data-loading />
                    </span>
                ))}
            </div>
        </div>
    )
}

/* ── Ideas ── */
// Combinaciones de paleta + tipografías. "Probar" las aplica como un cambio
// más (se deshace con el dock); la textura y el resto no se tocan.
const IDEAS = [
    { id: 'classic', palette: 'Champagne Clásico', titles: 'Playfair Display', body: 'Libre Baskerville' },
    { id: 'romantic', palette: 'Jardín Rosé', titles: 'Dancing Script', body: 'Quicksand' },
    { id: 'modern', palette: 'Arena & Cielo', titles: 'Outfit', body: 'Work Sans' },
    { id: 'night', palette: 'Noche Clásica', titles: 'DM Serif Display', body: 'Open Sans' },
    { id: 'beach', palette: 'Brisa Marina', titles: 'Tangerine', body: 'Comfortaa' },
    { id: 'forest', palette: 'Bosque Blush', titles: 'Monsieur La Doulaise', body: 'Mulish' },
    { id: 'boho', palette: 'Atardecer Terracota', titles: 'Sedan', body: 'Outfit' },
    { id: 'editorial', palette: 'Gris Editorial', titles: 'Anton SC', body: 'Libre Franklin' },
]
    .map((idea) => ({ ...idea, colors: colorCollection.find((c) => c.name === idea.palette) }))
    .filter((idea) => idea.colors)

export const IdeasPanel = ({ invitation, setInvitation, setSaved }) => {
    const { t } = useTranslation()
    const generals = invitation?.generals ?? {}

    const isActive = (idea) =>
        isActivePalette(generals.colors, idea.colors) &&
        generals.fonts?.titles?.typeFace === idea.titles &&
        generals.fonts?.body?.typeFace === idea.body

    const apply = (idea) => patchGenerals(setInvitation, setSaved, (g) => {
        const base = palettePatch(idea.colors)(g)
        return {
            ...base,
            fonts: {
                ...base.fonts,
                titles: { ...base.fonts.titles, typeFace: idea.titles },
                body: { ...g.fonts?.body, typeFace: idea.body },
            },
        }
    })

    return (
        <div className={styles.ideaList}>
            {IDEAS.map((idea) => {
                const c = idea.colors
                const active = isActive(idea)
                return (
                    <div key={idea.id} className={styles.idea} data-active={active || undefined}>
                        <div className={styles.ideaPreview} style={{ background: c.primary }}>
                            <span className={styles.ideaTag}>{c.name}</span>
                            <span className={styles.ideaTitle} style={{ fontFamily: `"${idea.titles}"`, color: c.accent }}>
                                {t('build_editor.idea_sample_title')}
                            </span>
                            <span className={styles.ideaBody} style={{ fontFamily: `"${idea.body}"`, color: c.accent }}>
                                {t('build_editor.idea_sample_body')}
                            </span>
                            <span className={styles.ideaButton} style={{ background: c.actions, color: c.primary, fontFamily: `"${idea.body}"` }}>
                                {t('build_editor.idea_sample_button')}
                            </span>
                        </div>
                        <div className={styles.ideaFoot}>
                            <div className={styles.ideaText}>
                                <span className={styles.ideaName}>{t(`build_editor.idea_${idea.id}`)}</span>
                                <span className={styles.ideaDesc}>{idea.titles} · {idea.body}</span>
                            </div>
                            <button type="button" className={styles.tryButton} data-active={active || undefined} onClick={() => !active && apply(idea)}>
                                {active ? <><Check size={14} /> {t('build_editor.idea_applied')}</> : <><Lightbulb size={14} /> {t('build_editor.idea_try')}</>}
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
