import { useLayoutEffect, useRef, useState } from 'react'
import { PortadaEnVivo } from './PortadaEnVivo'
import { PIEZA_ALTO, PIEZA_ANCHO } from './stickersPopData'

/*
  La portada en vivo (PortadaEnVivo: foto del link con sus elementos y los
  dibujos que le tocan) cubriendo la caja que la contiene (como object-fit:
  cover, centrada). La usa el simulador del pase de Wallet para enseñar la
  imagen que se va a armar al guardar, no la última que se guardó.
*/
export const PortadaCubierta = ({ body }) => {
    const ref = useRef(null)
    const [tam, setTam] = useState(null)
    useLayoutEffect(() => {
        const el = ref.current
        if (!el) return undefined
        const medir = () => setTam((t) => (t?.w === el.clientWidth && t?.h === el.clientHeight ? t : { w: el.clientWidth, h: el.clientHeight }))
        medir()
        const ro = new ResizeObserver(medir)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])
    const k = tam ? Math.max(tam.w / PIEZA_ANCHO, tam.h / PIEZA_ALTO) : 0
    return (
        <div ref={ref} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {k > 0 && (
                <div style={{ position: 'absolute', left: '50%', top: '50%', width: PIEZA_ANCHO, height: PIEZA_ALTO, transform: `translate(-50%, -50%) scale(${k})` }}>
                    <PortadaEnVivo body={body} />
                </div>
            )}
        </div>
    )
}
