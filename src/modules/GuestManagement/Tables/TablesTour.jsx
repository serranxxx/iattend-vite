import { useEffect, useState } from 'react'
import { Grid, Tour } from 'antd'
import { useTranslation } from 'react-i18next'

const { useBreakpoint } = Grid

// Tour del mapa de mesas. Se abre solo la PRIMERA vez que se entra sin ninguna
// mesa creada —justo cuando la página no tiene nada que enseñar— y después se
// relanza a mano desde el "?" de la barra, como los demás tours.
//
// Mismo patrón que GuestsTour / BuildTour / SideEventsTour: anclajes `data-tour`
// resueltos al momento, contador en vez de puntitos y `disabledInteraction`.
export const TABLES_TOUR_STORAGE_KEY = 'iattend_tables_tour_v1'

const target = (name) => () => document.querySelector(`[data-tour="${name}"]`)

// Auto acomodo, Centrar y la columna de confirmados solo existen en escritorio
// (en móvil el mapa se maneja con los controles flotantes y los invitados viven
// en su propia pestaña), así que esos pasos se saltan.
const STEPS = [
    { key: 'welcome', target: target('seating-map') },
    { key: 'add', target: target('add-table'), placement: 'bottomRight' },
    // La mesa no lleva `data-tour`: DynamicTable se dibuja en bucle y el paso
    // señala la primera que haya en el plano.
    { key: 'table', target: () => document.querySelector('.org-map-work-container .dynamic-container') },
    { key: 'guests', target: target('guest-panel'), placement: 'left', desktopOnly: true },
    { key: 'progress', target: target('progress-strip') },
    { key: 'views', target: target('view-switch'), placement: 'bottomLeft' },
    { key: 'auto', target: target('auto-layout'), desktopOnly: true },
    { key: 'center', target: target('center-map'), desktopOnly: true },
    { key: 'tools', target: target('map-tools'), placement: 'left' },
    // `tables-replay` y no `tour-replay`: GuestsPage, que envuelve este drawer,
    // ya usa ese nombre para el "?" de su escalera de pasos.
    { key: 'replay', target: target('tables-replay'), placement: 'bottomRight' },
]

export const TablesTour = ({ open, onClose, demo = false }) => {

    const { t } = useTranslation()
    const screens = useBreakpoint()
    const [current, setCurrent] = useState(0)

    const visibleSteps = STEPS.filter((s) => !s.desktopOnly || !screens.xs)

    useEffect(() => {
        if (!open) return
        setCurrent(0)
    }, [open])

    // Con mesas propias no hay salón de ejemplo, y el copy no puede decir que
    // sí: los dos pasos que lo mencionan tienen su variante.
    const textFor = (key) => (
        !demo && (key === 'welcome' || key === 'replay')
            ? t(`tables_tour.${key}_desc_own`)
            : t(`tables_tour.${key}_desc`)
    )

    const steps = visibleSteps.map((s) => ({
        title: t(`tables_tour.${s.key}_title`),
        // Los saltos de línea vienen del JSON; pre-line los respeta sin meter
        // HTML en las traducciones.
        description: <div className="gx-tour-text">{textFor(s.key)}</div>,
        target: s.target,
        placement: s.placement,
    }))

    return (
        <Tour
            open={open}
            current={current}
            onChange={setCurrent}
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

export default TablesTour
