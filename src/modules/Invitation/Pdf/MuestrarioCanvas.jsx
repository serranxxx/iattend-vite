import { useEffect, useState } from 'react'
import ReactHost from '../../../components/Host/ReactHost'
import { tamMuestrario } from './estiloPdf'
import m from './MuestrarioCanvas.module.css'

/*
  Diseño → Edición avanzada (invitación en PDF): en el centro del editor, en
  lugar de la pieza, el muestrario de iattend-events (HOST_PROPS.muestrario →
  components/InvitacionPdf/MuestrarioPdf.tsx): un solo componente que se
  puede usar —el dock Pro (Pases, Fotos, Lia, Editar) o el CONFIRMAR de Lite
  con su hoja— ya con los colores elegidos. Medidas: `tamMuestrario` (estiloPdf.js).
*/

export const MuestrarioCanvas = ({ invitation, plan, pagina, onEstiloSlot, textureOverride, fontOverride, activeLang }) => {
    const { w, h } = tamMuestrario()
    return (
        // Sin fondo propio: el celular flota sobre el tablero del editor.
        <div style={{ width: w, height: h }} data-edit-keep>
            <ReactHost
                config={invitation}
                plan={plan ?? 'lite'}
                // La página que se está editando: el dock la abre.
                muestrario={pagina || 'dock'}
                onEstiloSlot={onEstiloSlot}
                textureOverride={textureOverride}
                fontOverride={fontOverride}
                activeLang={activeLang}
            />
        </div>
    )
}

// Pieza ↔ dock de la Personalización avanzada con transición: las dos capas
// una sobre otra, centradas en una caja del tamaño de la que se ve (`card`);
// la que sale se desvanece y se encoge, la que entra sube. Sin `activa`, la
// misma estructura sin caja (display: contents): la pieza va como siempre y
// no se vuelve a montar (su iframe no se recarga) al entrar o al dibujar.
export const EscenaEstilo = ({ activa, modoDock, card, dock, children }) => {
    // El modo que se pinta va un cuadro después del pedido: el dock recién
    // montado arranca oculto y así también se anima la primera entrada.
    const [modo, setModo] = useState(false)
    useEffect(() => {
        const id = setTimeout(() => setModo(Boolean(activa && modoDock)), 40)
        return () => clearTimeout(id)
    }, [activa, modoDock])
    return (
        <div
            className={m.escena}
            data-activa={activa || undefined}
            data-modo={modo ? 'dock' : 'pieza'}
            style={activa ? { width: card.w, height: card.h } : undefined}
        >
            <div className={m.capaPieza} aria-hidden={(activa && modo) || undefined}>{children}</div>
            {dock && <div className={m.capaDock} aria-hidden={!modo || undefined}>{dock}</div>}
        </div>
    )
}
