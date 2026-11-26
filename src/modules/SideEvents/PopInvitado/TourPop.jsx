import { useEffect, useState } from 'react'
import { Tour } from 'antd'
import { useTranslation } from 'react-i18next'
import { CircleHelp } from 'lucide-react'
import s from './PopInvitado.module.css'

/*
  "¿Cómo funciona?" del editor de un Pop (escritorio): un tour de antd que
  recorre la pieza, Diseño, Elementos, Fotos, Dibujar, Subidos, Imagen del
  link, Pase digital, Formulario, Asistentes y chat, "Ver en vivo",
  Invitados, Compartir y, sin cuenta (`/crear-pop`), Guardar. Cada paso
  apunta a su `data-tour` (EditorShell / SideWorkspace / SideEvents); si el
  elemento no está (p. ej. Capas oculto), el paso sale centrado.
  `BotonComoFunciona`: el botón que lo abre; `llamativo` (en /crear-pop y en
  el primer Pop de una persona) lleva un halo que late.
*/

const objetivo = (sel) => () => document.querySelector(sel)

// `tool`: el paso abre esa herramienta y señala el riel con su panel completo
// (Dibujar: su pantalla completa y la paleta de plumas).
// `placement`: hacia dónde abre el globo, para que nunca se salga de la pantalla
// (Capas está pegado a la orilla derecha, el riel a la izquierda, el dock abajo).
const PASOS = [
    { k: 'canvas', sel: '[data-tour="canvas"] [data-side-card]', placement: 'right' },
    { k: 'design', sel: '[data-editor-left]', placement: 'right', tool: 'design' },
    { k: 'elements', sel: '[data-editor-left]', placement: 'right', tool: 'elements' },
    { k: 'photos', sel: '[data-editor-left]', placement: 'right', tool: 'photos' },
    // Dibujar en dos: el botón del riel y luego su pantalla completa con la
    // paleta de plumas.
    { k: 'draw', sel: '[data-tour="tool-draw"]', placement: 'right' },
    { k: 'draw_tools', sel: '[data-tour="lateral"]', placement: 'left', tool: 'draw' },
    { k: 'uploads', sel: '[data-editor-left]', placement: 'right', tool: 'uploads' },
    { k: 'link', sel: '[data-editor-left]', placement: 'right', tool: 'link' },
    { k: 'wallet', sel: '[data-editor-left]', placement: 'right', tool: 'wallet' },
    // Dentro de la pieza: el formulario ("+ Formulario" si no hay), y la
    // lista de asistentes con el chat, en un solo paso (de ejemplo si el Pop
    // no los tiene, ver popDeTour en SideEvents).
    { k: 'form', sel: '[data-tour="canvas"] [data-zone="registration"]', placement: 'left' },
    // …y luego su panel lateral: ahí se crean los formularios propios.
    { k: 'form_panel', sel: '[data-editor-left]', placement: 'right', tool: 'registration' },
    { k: 'attendees', sel: '[data-tour="canvas"] [data-zone="attendees"]', placement: 'left' },
    { k: 'live', sel: '[data-tour="live-toggle"]', placement: 'top' },
    { k: 'guests', sel: '[data-tour="tabs"]', placement: 'bottom' },
    { k: 'share', sel: '[data-tour="share"]', placement: 'bottomRight' },
]

export const TourPop = ({ open, onClose, invitado = false, onHerramienta }) => {
    const { t } = useTranslation()
    // Paso controlado: antes de mostrar uno se abre (o cierra) su herramienta y
    // se espera a que el panel termine de abrir, para medir ya completo.
    const [paso, setPaso] = useState(0)
    useEffect(() => { if (open) setPaso(0) }, [open])
    const cambiarPaso = (i) => {
        const p = lista[i]
        const antes = lista[paso]
        onHerramienta?.(p?.tool ?? null)
        // Lo que tarda en abrir el panel (Dibujar: la pieza viaja a pantalla completa).
        const espera = (p?.tool || antes?.tool) && p?.tool !== antes?.tool
            ? (p?.tool === 'draw' || antes?.tool === 'draw' ? 700 : 380)
            : 0
        if (espera) setTimeout(() => setPaso(i), espera)
        else setPaso(i)
    }
    const cerrar = () => { onHerramienta?.(null); onClose() }
    const lista = invitado ? [...PASOS, { k: 'save', sel: '[data-tour="guardar"]', placement: 'bottomRight' }] : PASOS
    const steps = lista.map((p, i) => ({
        title: t(`pop_tour.${p.k}_title`),
        description: t(`pop_tour.${p.k}_text`),
        // Al momento de mostrar el paso (la lista de asistentes de ejemplo
        // aparece después de abrir el tour); sin elemento, el paso va centrado.
        target: objetivo(p.sel),
        placement: p.placement,
        prevButtonProps: { children: t('pop_tour.prev') },
        nextButtonProps: { children: t(i === lista.length - 1 ? 'pop_tour.done' : 'pop_tour.next') },
    }))
    return (
        <Tour
            open={open}
            current={paso}
            onClose={cerrar}
            onFinish={cerrar}
            onChange={cambiarPaso}
            steps={steps}
            zIndex={1300}
            // Recorte de lo señalado: 20 px de redondeo y aire alrededor.
            gap={{ radius: 20, offset: 8 }}
            indicatorsRender={(actual, total) => <span className={s.tourCuenta}>{actual + 1} / {total}</span>}
            rootClassName={s.tour}
        />
    )
}

export const BotonComoFunciona = ({ onClick, llamativo = false }) => {
    const { t } = useTranslation()
    return (
        <button type='button' className={s.comoFunciona} data-llamativo={llamativo || undefined} onClick={onClick}>
            <CircleHelp size={16} strokeWidth={2.4} />
            {t('pop_tour.button')}
        </button>
    )
}
