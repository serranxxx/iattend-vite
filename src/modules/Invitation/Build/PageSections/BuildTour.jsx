import { useEffect, useState } from 'react'
import { Grid, Tour } from 'antd'
import { useTranslation } from 'react-i18next'

const { useBreakpoint } = Grid

// Tour de /dashboard/build. Presenta el editor módulo por módulo (Generales,
// Portada, Bienvenida, Personas...) para que el usuario sepa qué vive en cada
// ícono de la barra. Se abre solo una vez (localStorage) y se puede relanzar
// desde el "?" de la columna de herramientas.
export const BUILD_TOUR_STORAGE_KEY = 'iattend_build_tour_v1'

const target = (name) => () => document.querySelector(`[data-tour="${name}"]`)

// Cada paso de módulo lleva `section`: al llegar a él, BuildPage selecciona esa
// sección, así el formulario y el scroll del teléfono acompañan a la explicación.
//
// Casi todos los anclajes viven en la barra pegada al borde izquierdo: con el
// `placement` por defecto (bottom) el popover se recorta contra ese borde y
// pierde las esquinas redondeadas, así que se abren hacia la derecha.
const STEPS = [
    { key: 'welcome', target: target('modules-bar'), placement: 'right' },
    { key: 'generals', section: 'generals', target: target('mod-generals'), placement: 'right' },
    { key: 'cover', section: 'cover', target: target('mod-cover'), placement: 'right' },
    { key: 'greeting', section: 'greeting', target: target('mod-greeting'), placement: 'right' },
    { key: 'family', section: 'family', target: target('mod-family'), placement: 'right' },
    { key: 'quote', section: 'quote', target: target('mod-quote'), placement: 'right' },
    { key: 'itinerary', section: 'itinerary', target: target('mod-itinerary'), placement: 'right' },
    { key: 'dresscode', section: 'dresscode', target: target('mod-dresscode'), placement: 'right' },
    { key: 'gifts', section: 'gifts', target: target('mod-gifts'), placement: 'right' },
    { key: 'destinations', section: 'destinations', target: target('mod-destinations'), placement: 'right' },
    { key: 'notices', section: 'notices', target: target('mod-notices'), placement: 'right' },
    { key: 'gallery', section: 'gallery', target: target('mod-gallery'), placement: 'right' },
    { key: 'editor', target: target('editor-panel'), placement: 'right' },
    // La columna de herramientas solo existe en desktop (BuildContent la
    // esconde en xs), así que estos pasos se saltan en móvil.
    { key: 'undo', target: target('undo'), placement: 'left', desktopOnly: true },
    { key: 'redo', target: target('redo'), placement: 'left', desktopOnly: true },
    { key: 'devices', target: target('devices'), placement: 'left', desktopOnly: true },
    { key: 'images', target: target('images'), placement: 'left', desktopOnly: true },
    { key: 'translate', target: target('translate'), placement: 'left', desktopOnly: true },
    { key: 'zoom', target: target('zoom'), placement: 'left', desktopOnly: true },
    { key: 'preview', target: target('preview'), placement: 'left' },
]

export const BuildTour = ({ open, onClose, onSelectSection }) => {
    const { t } = useTranslation()
    const screens = useBreakpoint()
    const [current, setCurrent] = useState(0)

    const visibleSteps = STEPS.filter((s) => !s.desktopOnly || !screens.xs)

    // Al abrir, siempre desde el principio y con Generales seleccionado.
    useEffect(() => {
        if (!open) return
        setCurrent(0)
        onSelectSection('generals')
        // onSelectSection es estable (viene de BuildPage), no hace falta como dep.
    }, [open])

    // El cambio de sección va en el mismo commit que el cambio de paso: cuando
    // el Tour resuelve el target, el formulario nuevo ya está montado.
    const goTo = (next) => {
        const step = visibleSteps[next]
        if (step?.section) onSelectSection(step.section)
        setCurrent(next)
    }

    const steps = visibleSteps.map((s) => ({
        title: t(`build_tour.${s.key}_title`),
        // Los saltos de línea vienen del JSON; pre-line los respeta sin meter
        // HTML en las traducciones.
        description: <div className="bt-tour-text">{t(`build_tour.${s.key}_desc`)}</div>,
        target: s.target,
        placement: s.placement,
    }))

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
            indicatorsRender={(cur, total) => (
                <span className="bt-tour-count">{cur + 1} / {total}</span>
            )}
            scrollIntoViewOptions={{ block: 'center', inline: 'nearest', behavior: 'instant' }}
        />
    )
}
