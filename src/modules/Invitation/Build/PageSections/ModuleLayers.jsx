import { useTranslation } from 'react-i18next'
import { arrayMove } from '@dnd-kit/sortable'
import {
    CalendarDays, CreditCard, Image as ImageIcon, Images, ListOrdered, MapPin, MessageSquare, Minus, Music,
    PaintBucket, Palette, ScanHeart, Type, Users,
} from 'lucide-react'
import { MODULES } from './moduleList'
import { LayersPanel } from '../../../Editor/LayersPanel'
import { MiniaturaElemento } from '../../../Editor/Elemento'
import { etiquetaElemento } from '../../../Editor/elementoInfo'

/*
  Panel "Capas" del editor de la invitación (LayersPanel, el de todos los
  editores). Cada módulo es un grupo: se arrastra para cambiar su posición
  (`generals.positions`; la portada va fija arriba) y su ojo lo oculta
  (`[módulo].active`). Adentro, sus capas en el orden en que se apilan:
    1. los elementos que se agregaron delante del contenido (decorations),
    2. el contenido del módulo (título, texto, fecha, paleta…),
    3. los elementos detrás del contenido (z = 'back'),
    4. su fondo y su separador.
  Los elementos se reordenan dentro de su plano y se ocultan con el ojo
  (`hidden`); tocarlos los elige en la pieza. Tocar una capa del contenido
  abre su barra. EditCanvas lo pinta con portal en el área de trabajo.
*/

const text = (path, kind = 'title', label = kind === 'title' ? 'lp_title' : 'lp_text') => ({ key: path, icon: Type, label, act: { text: path, kind } })
const content = (label, icon) => ({ key: 'content', icon, label, act: { module: true } })
const bar = (field, label, icon) => ({ key: field, icon, label, act: { bar: field } })

// Contenido de cada módulo, de arriba a abajo (lo que se ve y se edita en él).
const PARTS = {
    cover: [{ key: 'title', icon: Type, label: 'lp_title', act: { select: 'title' } }, { key: 'date', icon: CalendarDays, label: 'lp_date', act: { select: 'date', bar: 'date' } }, bar('song', 'lp_song', Music)],
    greeting: [text('greeting.title'), text('greeting.description', 'body')],
    family: [text('people.title'), content('lp_people', Users)],
    quote: [{ key: 'quote_text', icon: Type, label: 'lp_quote', act: { select: 'quote_text' } }],
    itinerary: [content('lp_moments', ListOrdered)],
    dresscode: [text('dresscode.title'), text('dresscode.description', 'body', 'lp_description'), bar('dress_colors', 'lp_palette', Palette), bar('dress_images', 'lp_images', Images)],
    gifts: [text('gifts.title'), text('gifts.description', 'body', 'lp_description'), content('lp_cards', CreditCard)],
    destinations: [text('destinations.title'), text('destinations.description', 'body', 'lp_description'), content('lp_places', MapPin)],
    notices: [text('notices.title'), content('lp_notices', MessageSquare)],
    gallery: [text('gallery.title'), bar('gallery_images', 'lp_images', Images)],
}
// Debajo de todo: el fondo (la portada: su imagen o video) y el separador.
const BOTTOM = (section) => (section === 'cover'
    ? [bar('cover_media', 'lp_media', ImageIcon)]
    : [bar('background', 'lp_background', PaintBucket), bar('separator', 'lp_separator', Minus)])

const textEvent = (detail) => window.dispatchEvent(new CustomEvent('iattend-text-field', { detail }))

export const ModuleLayers = ({
    invitation, selectedSection, onSelect, onMoved, setInvitation, setSaved,
    // Capas reales: abrir la barra de un campo, el campo / texto / elemento
    // que está elegido ahora.
    onOpenField, activeField, activeText, selectedLayer,
}) => {
    const { t } = useTranslation()
    const positions = invitation?.generals?.positions ?? []

    // Tocar una capa del contenido: elige el módulo y abre la barra de esa capa.
    const runPart = (section, act) => {
        textEvent(null)
        onSelect(section, act.select ?? null)
        if (act.bar) onOpenField?.(act.bar, section)
        if (act.text) textEvent({ path: act.text, kind: act.kind })
    }
    const partSelected = (section, part) => (part.act.text ? activeText === part.act.text
        : part.act.select ? activeField === part.act.select
        : part.act.bar ? activeField === part.act.bar && selectedSection === section
        : false)

    const setDecorations = (section, fn) => {
        setInvitation((prev) => ({ ...prev, decorations: { ...(prev.decorations ?? {}), [section]: fn(prev.decorations?.[section] ?? []) } }))
        setSaved(false)
    }
    // Un plano (delante / detrás), la de hasta arriba primero (el último del
    // arreglo va encima). Se reordena dentro de su plano.
    const plane = (section, back) => {
        const items = (invitation?.decorations?.[section] ?? []).filter((it) => (it.z === 'back') === back)
        const lista = [...items].reverse()
        return {
            kind: 'items',
            id: `${section}-${back ? 'back' : 'front'}`,
            rows: lista.map((it) => ({
                id: it.id,
                label: etiquetaElemento(it, t),
                icon: <MiniaturaElemento s={it} />,
                selected: selectedLayer?.section === section && selectedLayer?.id === it.id,
                hidden: Boolean(it.hidden),
                onSelect: () => {
                    textEvent(null)
                    onSelect(section)
                    window.dispatchEvent(new CustomEvent('iattend-host-layer-select', { detail: { section, id: it.id } }))
                },
                onToggleHidden: () => setDecorations(section, (arr) => arr.map((o) => (o.id === it.id ? { ...o, hidden: !o.hidden || undefined } : o))),
            })),
            onReorder: (activeId, overId) => setDecorations(section, (arr) => {
                const mismos = [...arr.filter((it) => (it.z === 'back') === back)].reverse()
                const nuevos = arrayMove(mismos, mismos.findIndex((x) => x.id === activeId), mismos.findIndex((x) => x.id === overId)).reverse()
                return [...arr.filter((it) => (it.z === 'back') !== back), ...nuevos]
            }),
        }
    }
    const fixed = (section, parts) => ({
        kind: 'fixed',
        rows: parts.map((p) => ({
            id: `${section}-${p.key}`,
            label: t(`build_editor.${p.label}`),
            icon: <p.icon size={13} />,
            selected: partSelected(section, p),
            onSelect: () => runPart(section, p.act),
        })),
    })
    const segments = (section) => [plane(section, false), fixed(section, PARTS[section] ?? []), plane(section, true), fixed(section, BOTTOM(section))]
        .filter((s) => s.rows.length)

    const groups = [
        {
            id: 'cover',
            header: { label: t('buttons_menu.cover'), icon: <ScanHeart size={16} strokeWidth={2} />, selected: selectedSection === 'cover', onSelect: () => { textEvent(null); onSelect('cover') } },
            segments: segments('cover'),
        },
        ...positions.filter((id) => MODULES[id]).map((id) => {
            const mod = MODULES[id]
            return {
                id,
                header: {
                    label: t(`buttons_menu.${mod.type}`),
                    icon: <mod.Icon size={16} strokeWidth={2} />,
                    selected: selectedSection === mod.type,
                    hidden: !invitation?.[mod.key]?.active,
                    sortable: true,
                    onSelect: () => { textEvent(null); onSelect(mod.type) },
                    onToggleHidden: () => {
                        setInvitation((prev) => ({ ...prev, [mod.key]: { ...prev[mod.key], active: !prev[mod.key]?.active } }))
                        setSaved(false)
                    },
                },
                segments: segments(mod.type),
            }
        }),
    ]

    // Un elemento arrastrado a otro módulo (o a la otra lista de su módulo):
    // se va al centro de ese módulo, delante o detrás del contenido según la
    // lista donde cayó, y la pieza baja hasta él y lo deja elegido.
    const onMoveItem = ({ itemId, fromGroup, toGroup, toSegment }) => {
        const desde = fromGroup === 'cover' ? 'cover' : MODULES[fromGroup]?.type
        const hacia = toGroup === 'cover' ? 'cover' : MODULES[toGroup]?.type
        if (!desde || !hacia) return
        const item = (invitation?.decorations?.[desde] ?? []).find((it) => it.id === itemId)
        if (!item) return
        const atras = toSegment ? toSegment.endsWith('-back') : item.z === 'back'
        const movido = { ...item, z: atras ? 'back' : undefined, ...(desde !== hacia ? { x: 50, y: 50 } : {}) }
        setInvitation((prev) => {
            const decor = { ...(prev.decorations ?? {}) }
            decor[desde] = (decor[desde] ?? []).filter((it) => it.id !== itemId)
            decor[hacia] = [...(decor[hacia] ?? []), movido]
            return { ...prev, decorations: decor }
        })
        setSaved(false)
        textEvent(null)
        onSelect(hacia)
        setTimeout(() => window.dispatchEvent(new CustomEvent('iattend-host-layer-select', { detail: { section: hacia, id: itemId } })), 250)
    }

    const onReorderGroups = (activeId, overId) => {
        setInvitation((prev) => {
            const cur = prev.generals.positions
            const next = arrayMove(cur, cur.indexOf(activeId), cur.indexOf(overId))
            return { ...prev, generals: { ...prev.generals, positions: next } }
        })
        setSaved(false)
        onMoved?.(MODULES[activeId]?.type)
    }

    return (
        <LayersPanel
            title={t('build_editor.layers_title')}
            groups={groups}
            onReorderGroups={onReorderGroups}
            onMoveItem={onMoveItem}
            showLabel={t('build_editor.layers_show')}
            hideLabel={t('build_editor.layers_hide')}
        />
    )
}

