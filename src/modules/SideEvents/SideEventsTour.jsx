import { useEffect, useState } from 'react'
import { Tour } from 'antd'
import { useTranslation } from 'react-i18next'

// Tour del editor de side events. El rediseño movió todo de lugar —los
// controles salieron de la tarjeta y ahora hay dos modos— así que este tour se
// lo presenta al usuario que ya conocía la versión anterior. Se abre solo una
// vez (localStorage) y se puede relanzar desde el "?" de la barra.
//
// Mismo patrón que GuestsTour y BuildTour: anclajes por `data-tour` resueltos
// al momento (funciones), bloques con salto, contador en vez de puntitos.
export const SIDE_TOUR_STORAGE_KEY = 'iattend_side_tour_v1'

// Los anclajes se buscan al resolver cada paso, no al montar: la mitad vive en
// el otro modo o en el panel que el propio tour abre.
//
// Escritorio y móvil comparten los mismos `data-tour`: el shell móvil es otro
// árbol, pero solo uno de los dos está montado a la vez, así que el
// querySelector nunca es ambiguo.
const target = (name) => () => document.querySelector(`[data-tour="${name}"]`)

// `section` abre el panel de esa herramienta al llegar al paso, como hace
// BuildTour con los módulos del editor de la invitación. En móvil no se aplica:
// la hoja inferior taparía el dock, que es justo lo que el paso señala.
const BLOCKS = [
    {
        key: 'diseno',
        tab: 'diseno',
        steps: [
            { key: 'welcome', target: target('tabs') },
            { key: 'canvas', target: target('canvas'), placement: 'right' },
            { key: 'background', target: target('chip-background'), section: 'background' },
            { key: 'color', target: target('chip-color'), section: 'color' },
            { key: 'title', target: target('tool-title'), section: 'title', placement: 'right' },
            { key: 'date', target: target('tool-date'), section: 'date', placement: 'right' },
            { key: 'place', target: target('tool-place'), section: 'place', placement: 'right' },
            { key: 'notes', target: target('tool-extras'), section: 'extras', placement: 'right' },
            { key: 'live', target: target('live'), placement: 'bottomRight' },
            { key: 'share', target: target('share'), placement: 'bottomRight' },
            { key: 'save', target: target('save'), placement: 'bottomRight' },
        ],
    },
    {
        key: 'envio',
        tab: 'envio',
        // La lista arranca en el Paso 1: es donde viven "Agregar" y la fecha
        // límite que señalan los pasos de este bloque.
        listKey: 'creado',
        steps: [
            { key: 'block_envio', target: target('guests'), placement: 'left' },
            { key: 'steps', target: target('se-steps') },
            { key: 'deadline', target: target('se-deadline') },
            { key: 'search', target: target('se-search') },
            { key: 'filters', target: target('se-filters') },
            { key: 'add_guest', target: target('se-add') },
            { key: 'cards', target: target('se-cards'), placement: 'top' },
            { key: 'replay', target: target('tour-replay') },
        ],
    },
]

// Lista plana que consume <Tour>, con metadatos de bloque por paso.
const FLAT_STEPS = BLOCKS.flatMap((block, blockIndex) =>
    block.steps.map((step) => ({ ...step, tab: block.tab, listKey: block.listKey, blockIndex })),
)

const blockStartIndex = (blockIndex) =>
    FLAT_STEPS.findIndex((s) => s.blockIndex === blockIndex)

export const SideEventsTour = ({ open, onClose, isMobile, setActiveTab, setSection, setActiveKey }) => {

    const { t } = useTranslation()
    const [current, setCurrent] = useState(0)

    // El cambio de modo, de panel y de paso van en el mismo commit: cuando el
    // Tour resuelve el anclaje, lo que señala ya está montado.
    const applyStep = (step) => {
        if (!step) return
        setActiveTab(step.tab)
        if (step.listKey) setActiveKey(step.listKey)
        // El panel solo se abre en escritorio (ver nota de BLOCKS)
        if (!isMobile) setSection(step.section ?? null)
    }

    // Al abrir, siempre desde el principio y en Diseño.
    useEffect(() => {
        if (!open) return
        setCurrent(0)
        applyStep(FLAT_STEPS[0])
        // los setters son estables (setState / callbacks de SideEvents)
    }, [open])

    const goTo = (next) => {
        applyStep(FLAT_STEPS[next])
        setCurrent(next)
    }

    const steps = FLAT_STEPS.map((s) => {
        const nextBlock = BLOCKS[s.blockIndex + 1]
        return {
            title: t(`side_tour.${s.key}_title`),
            description: (
                <div className="gx-tour-desc">
                    {/* Los textos llevan saltos de línea en el JSON; pre-line
                        los respeta sin meter HTML en las traducciones. */}
                    <div className="gx-tour-text">{t(`side_tour.${s.key}_desc`)}</div>
                    {nextBlock && (
                        <button
                            type="button"
                            className="gx-tour-skip"
                            onClick={() => goTo(blockStartIndex(s.blockIndex + 1))}
                        >
                            {t('guests_tour.skip_to', { block: t(`side_tour.block_name_${nextBlock.key}`) })}
                        </button>
                    )}
                </div>
            ),
            target: s.target,
            placement: s.placement,
        }
    })

    return (
        <Tour
            // Panel más angosto que el default: ver nota en styles/antd.css
            rootClassName="se-tour"
            open={open}
            current={current}
            onChange={goTo}
            onClose={onClose}
            onFinish={onClose}
            steps={steps}
            disabledInteraction
            gap={{ offset: 8, radius: 16 }}
            // Con ~19 pasos los puntitos no dicen nada: contador simple.
            indicatorsRender={(cur, total) => (
                <span className="gx-tour-count">{cur + 1} / {total}</span>
            )}
            // Scroll instantáneo y centrado: el suave por defecto deja pasos a
            // medio viewport mientras anima.
            scrollIntoViewOptions={{ block: 'center', inline: 'nearest', behavior: 'instant' }}
        />
    )
}

export default SideEventsTour
