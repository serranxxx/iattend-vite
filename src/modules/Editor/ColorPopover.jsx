import { Popover } from 'antd'
import { ColorChooser } from '../Invitation/Build/PageSections/ColorChooser'

// Popover del selector de color de las barras (ver useColorPopover.js).
// `target`: { value, allowNone, onPick(color, { snapshot }) } o null.
export const ColorPopover = ({ colorPop, closeColor, target, palette }) => (colorPop && target ? (
    <Popover
        open
        trigger="click"
        placement="bottom"
        arrow={false}
        onOpenChange={(v) => { if (!v) closeColor() }}
        content={(
            <div data-text-bar>
                <ColorChooser value={target.value} allowNone={target.allowNone} palette={palette} onChange={(c, o) => target.onPick(c, o)} />
            </div>
        )}
    >
        <span style={{ position: 'fixed', left: colorPop.x, top: colorPop.y, width: colorPop.w, height: colorPop.h, pointerEvents: 'none' }} />
    </Popover>
) : null)
