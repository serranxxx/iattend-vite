import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Palette } from 'lucide-react'
import { ColoresIOS } from './ColoresIOS'

// El selector de color de las barras en el panel lateral del editor: lo que
// se le pasa a EditorShell como `panelColor` (null si no hay que abrirlo).
// El del pincel (`target.ios`) no: ese va flotando (ColorPopover.jsx).
export const usePanelColor = ({ colorPop, closeColor, target, palette }) => {
    const { t } = useTranslation()
    const abierto = Boolean(colorPop && target && !target.ios)
    // Se soltó lo elegido (ya no hay a qué ponerle color): se cierra, para que
    // no vuelva a abrirse solo al elegir otra cosa.
    const sinDestino = Boolean(colorPop) && !target
    useEffect(() => { if (sinDestino) closeColor() }, [sinDestino])
    useEffect(() => {
        if (!abierto) return undefined
        const esc = (e) => { if (e.key === 'Escape') closeColor() }
        window.addEventListener('keydown', esc)
        return () => window.removeEventListener('keydown', esc)
    }, [abierto, closeColor])
    if (!abierto) return null
    return {
        icon: Palette,
        title: t('build_menu.color'),
        hint: target.label ?? t('build_editor.color_panel_hint'),
        onClose: closeColor,
        content: (
            <ColoresIOS
                value={target.value}
                onChange={(c, o) => target.onPick(c, o)}
                paleta={palette ?? []}
                sinColor={Boolean(target.allowNone)}
                cabeza={false}
            />
        ),
    }
}
