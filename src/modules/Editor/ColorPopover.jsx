import { Popover } from 'antd'
import { ColorChooser } from '../Invitation/Build/PageSections/ColorChooser'
import { ColoresIOS } from './ColoresIOS'

// Popover del selector de color de las barras (ver useColorPopover.js).
// `target`: { value, allowNone, onPick(color, { snapshot }) } o null. Con
// `ios: true` es el selector estilo iOS (ColoresIOS; hoy, el del dibujo), con
// su opacidad (`opacity`, `onOpacity`, `opacidadMin`) y `placement` propio.
// `target.anclarA` (selector): se ancla a ese elemento (su orilla) y no al
// botón, para no taparlo (la paleta de dibujo, el panel lateral).
const anclaDe = (colorPop, selector) => {
    const r = selector ? document.querySelector(selector)?.getBoundingClientRect() : null
    return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : colorPop
}

export const ColorPopover = ({ colorPop, closeColor, target, palette }) => (colorPop && target ? (
    <Popover
        open
        trigger="click"
        placement={target.placement ?? 'bottom'}
        // Con ancla propia, un poco de aire entre el popover y lo que no debe tapar.
        align={target.anclarA ? { offset: target.placement === 'left' ? [-12, 0] : target.placement === 'right' ? [12, 0] : [0, 12] } : undefined}
        arrow={false}
        onOpenChange={(v) => { if (!v) closeColor() }}
        zIndex={1300}
        content={target.ios ? (
            <ColoresIOS value={target.value} onChange={(c, o) => target.onPick(c, o)} opacity={target.opacity} onOpacity={target.onOpacity} opacidadMin={target.opacidadMin ?? 0} />
        ) : (
            <div data-text-bar>
                <ColorChooser value={target.value} allowNone={target.allowNone} palette={palette} onChange={(c, o) => target.onPick(c, o)} />
            </div>
        )}
    >
        {(() => {
            const a = anclaDe(colorPop, target.anclarA)
            return <span style={{ position: 'fixed', left: a.x, top: a.y, width: a.w, height: a.h, pointerEvents: 'none' }} />
        })()}
    </Popover>
) : null)
