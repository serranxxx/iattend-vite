import { useEffect, useState } from 'react'
import { Tour } from 'antd'
import { useTranslation } from 'react-i18next'

// El rediseño de /dashboard/guests cambió la página completa (escalera de
// pasos, toolbars por sección, tarjetas en vez de tabla). Este tour se la
// presenta al usuario que ya conocía la versión anterior. Se abre solo una
// vez (localStorage) y se puede relanzar desde el "?" de la escalera.
export const GUESTS_TOUR_STORAGE_KEY = 'iattend_guests_tour_v1'

// Los anclajes son atributos data-tour repartidos por la página. Se resuelven
// al momento (funciones), no al montar: la mayoría vive dentro de un tab que
// puede no estar montado todavía. Se busca dentro del tabpane ACTIVO porque
// antd deja montados (display:none) los tabs ya visitados y un querySelector
// global podría anclar el paso a un elemento oculto.
const paneTarget = (name) => () =>
    document.querySelector(`.ant-tabs-tabpane-active [data-tour="${name}"]`)

// Para lo que vive fuera de los tabpanes (la escalera de pasos y su "?").
const pageTarget = (name) => () => document.querySelector(`[data-tour="${name}"]`)

// El tour va por BLOQUES — uno por sección de la escalera. Cada bloque abre
// con una intro (anclada a su botón de la escalera) que explica de qué se
// trata, quiénes viven ahí y qué parte del proceso es; después vienen sus
// puntos. Desde cualquier paso se puede saltar al siguiente bloque completo.
//
// Si un anclaje no existe, GuestsPage renderiza un elemento de ejemplo
// mientras el tour está abierto (banners y tarjetas demo), así que los pasos
// siempre tienen algo real que señalar.
const BLOCKS = [
    {
        key: 'seguimiento', tab: 'seguimiento', steps: [
            { key: 'welcome', target: pageTarget('steps') },
            { key: 'ov_today', target: paneTarget('ov-today') },
            { key: 'ov_pie', target: paneTarget('ov-pie') },
            { key: 'ov_progress', target: paneTarget('ov-progress') },
            { key: 'ov_mesas', target: paneTarget('ov-mesas') },
            { key: 'ov_funnel', target: paneTarget('ov-funnel') },
        ],
    },
    {
        key: 'creado', tab: 'creado', steps: [
            { key: 'block_creado', target: pageTarget('step-creado') },
            // Ancla al banner morado si aún no hay fecha límite, o a la línea
            // discreta bajo el buscador si ya está definida (mismo data-tour).
            { key: 'rsvp_deadline', target: paneTarget('rsvp-deadline') },
            { key: 'search', target: paneTarget('toolbar-search') },
            { key: 'new_guest', target: paneTarget('new-guest') },
            { key: 'more_tools', target: paneTarget('more-tools') },
            { key: 'copy_link', target: paneTarget('copy-link') },
            { key: 'send_invitation', target: paneTarget('send-invitation') },
        ],
    },
    {
        key: 'esperando', tab: 'esperando', steps: [
            { key: 'block_esperando', target: pageTarget('step-esperando') },
            { key: 'alert_failed', target: paneTarget('alert-failed') },
            { key: 'alert_read', target: paneTarget('alert-read') },
            { key: 'retry', target: paneTarget('retry') },
            { key: 'remind', target: paneTarget('remind') },
        ],
    },
    {
        key: 'confirmado', tab: 'confirmado', steps: [
            { key: 'block_confirmado', target: pageTarget('step-confirmado') },
            { key: 'table_action', target: paneTarget('table-action') },
            { key: 'quick_no_table', target: paneTarget('quick-no-table') },
            { key: 'filters', target: paneTarget('filters') },
        ],
    },
    {
        key: 'rechazado', tab: 'rechazado', steps: [
            { key: 'block_rechazado', target: pageTarget('step-rechazado') },
            { key: 'replay', target: pageTarget('tour-replay') },
        ],
    },
]

// Lista plana que consume <Tour>, con metadatos de bloque por paso.
const FLAT_STEPS = BLOCKS.flatMap((block, blockIndex) =>
    block.steps.map((step) => ({ ...step, tab: block.tab, blockIndex })),
)

const blockStartIndex = (blockIndex) =>
    FLAT_STEPS.findIndex((s) => s.blockIndex === blockIndex)

export const GuestsTour = ({ open, onClose, setActiveKey }) => {
    const { t } = useTranslation()
    const [current, setCurrent] = useState(0)

    // Al abrir, el tour siempre arranca desde Seguimiento y el primer paso.
    useEffect(() => {
        if (!open) return
        setCurrent(0)
        setActiveKey(FLAT_STEPS[0].tab)
        // setActiveKey es un setState: identidad estable, no hace falta como dep.
    }, [open])

    // El cambio de tab va en el mismo commit que el cambio de paso: cuando el
    // Tour resuelve el target, el tabpane nuevo ya está en el DOM.
    const goTo = (next) => {
        const step = FLAT_STEPS[next]
        if (step) setActiveKey(step.tab)
        setCurrent(next)
    }

    const steps = FLAT_STEPS.map((s) => {
        const nextBlock = BLOCKS[s.blockIndex + 1]
        return {
            title: t(`guests_tour.${s.key}_title`),
            description: (
                <div className="gx-tour-desc">
                    {/* Los textos llevan saltos de línea en el JSON; pre-line
                        los respeta sin meter HTML en las traducciones. */}
                    <div className="gx-tour-text">{t(`guests_tour.${s.key}_desc`)}</div>
                    {nextBlock && (
                        <button
                            type="button"
                            className="gx-tour-skip"
                            onClick={() => goTo(blockStartIndex(s.blockIndex + 1))}
                        >
                            {t('guests_tour.skip_to', { block: t(`guests_tour.block_name_${nextBlock.key}`) })}
                        </button>
                    )}
                </div>
            ),
            target: s.target,
        }
    })

    return (
        <Tour
            open={open}
            current={current}
            onChange={goTo}
            onClose={onClose}
            onFinish={onClose}
            steps={steps}
            disabledInteraction
            gap={{ offset: 8, radius: 16 }}
            // Con ~25 pasos los puntitos no dicen nada: contador simple.
            indicatorsRender={(cur, total) => (
                <span className="gx-tour-count">{cur + 1} / {total}</span>
            )}
            // Scroll instantáneo y centrado al objetivo: el scroll suave por
            // defecto deja pasos a medio viewport mientras anima.
            scrollIntoViewOptions={{ block: 'center', inline: 'nearest', behavior: 'instant' }}
        />
    )
}
