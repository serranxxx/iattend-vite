import { useEffect, useState } from 'react'
import { Tour } from 'antd'
import { useTranslation } from 'react-i18next'

// Tour del editor del Save the Date. Se abre solo la primera vez que se entra
// y se relanza desde el "?" de la barra (o del dock, en móvil).
//
// Mismo patrón que GuestsTour / BuildTour / SideEventsTour: anclajes `data-tour`
// resueltos al momento, bloques con salto, contador en vez de puntitos y
// `disabledInteraction`.
export const STD_TOUR_STORAGE_KEY = 'iattend_std_tour_v1'

// Escritorio y móvil comparten los mismos `data-tour`: el shell móvil es otro
// árbol, pero solo uno de los dos está montado a la vez.
const target = (name) => () => document.querySelector(`[data-tour="${name}"]`)

// `section` abre el panel de esa herramienta al llegar al paso, como hace
// BuildTour con los módulos del editor. En móvil no se aplica: la hoja inferior
// taparía el dock, que es justo lo que el paso señala.
const BLOCKS = [
    {
        key: 'crear',
        tab: 'edicion',
        steps: [
            { key: 'welcome', target: target('std-tabs') },
            { key: 'canvas', target: target('std-canvas'), placement: 'right' },
            { key: 'background', target: target('std-tool-background'), section: 'background', placement: 'right' },
            { key: 'title', target: target('std-tool-title'), section: 'title', placement: 'right' },
            { key: 'date', target: target('std-tool-date'), section: 'date', placement: 'right' },
            { key: 'button', target: target('std-tool-button'), section: 'button', placement: 'right' },
            { key: 'song', target: target('std-tool-song'), section: 'song', placement: 'right' },
            { key: 'live', target: target('std-live'), placement: 'bottomRight' },
            { key: 'when', target: target('std-when'), placement: 'bottomRight' },
            { key: 'link', target: target('std-link'), placement: 'bottomRight' },
            { key: 'save', target: target('std-save'), placement: 'bottomRight' },
        ],
    },
    {
        key: 'respuestas',
        tab: 'reacciones',
        // La pestaña de respuestas no existe en la versión gratis (/save-the-date):
        // ahí todavía no hay pieza publicada a la que alguien pueda contestar.
        demoOnly: false,
        steps: [
            { key: 'answers', target: target('std-answers'), placement: 'left' },
            { key: 'replay', target: target('std-replay') },
        ],
    },
]

export const SaveTheDateTour = ({ open, onClose, demo = false, isMobile, setActiveTab, setSection }) => {

    const { t } = useTranslation()
    const [current, setCurrent] = useState(0)

    // En la versión gratis solo existe "Crear"; el último paso se queda con el
    // "?" para no dejar el tour sin cierre.
    const blocks = demo
        ? [{ ...BLOCKS[0], steps: [...BLOCKS[0].steps, { key: 'replay', target: target('std-replay') }] }]
        : BLOCKS

    const flatSteps = blocks.flatMap((block, blockIndex) =>
        block.steps.map((step) => ({ ...step, tab: block.tab, blockIndex })),
    )

    const blockStartIndex = (blockIndex) => flatSteps.findIndex((s) => s.blockIndex === blockIndex)

    // El cambio de pestaña, de panel y de paso van en el mismo commit: cuando
    // el Tour resuelve el anclaje, lo que señala ya está montado.
    const applyStep = (step) => {
        if (!step) return
        setActiveTab(step.tab)
        if (!isMobile) setSection(step.section ?? null)
    }

    // Al abrir, siempre desde el principio y en Crear.
    useEffect(() => {
        if (!open) return
        setCurrent(0)
        applyStep(flatSteps[0])
        // los setters son estables (setState de SaveTheDatePage)
    }, [open])

    const goTo = (next) => {
        applyStep(flatSteps[next])
        setCurrent(next)
    }

    const steps = flatSteps.map((s) => {
        const nextBlock = blocks[s.blockIndex + 1]
        return {
            title: t(`std_tour.${s.key}_title`),
            description: (
                <div className="gx-tour-desc">
                    {/* Los saltos de línea vienen del JSON; pre-line los
                        respeta sin meter HTML en las traducciones. */}
                    <div className="gx-tour-text">{t(`std_tour.${s.key}_desc`)}</div>
                    {nextBlock && (
                        <button
                            type="button"
                            className="gx-tour-skip"
                            onClick={() => goTo(blockStartIndex(s.blockIndex + 1))}
                        >
                            {t('guests_tour.skip_to', { block: t(`std_tour.block_name_${nextBlock.key}`) })}
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
            // Panel más angosto que el default: la pieza va centrada y el de
            // ~508px no cabe a los costados (ver nota en styles/antd.css).
            rootClassName="se-tour"
            open={open}
            current={current}
            onChange={goTo}
            onClose={onClose}
            onFinish={onClose}
            steps={steps}
            disabledInteraction
            gap={{ offset: 8, radius: 16 }}
            indicatorsRender={(cur, total) => (
                <span className="gx-tour-count">{cur + 1} / {total}</span>
            )}
            scrollIntoViewOptions={{ block: 'center', inline: 'nearest', behavior: 'instant' }}
        />
    )
}

export default SaveTheDateTour
