import { useLayoutEffect, useRef, useState } from 'react'
import { RailPro } from './RailPro'
import { SiguientePasoLite } from './SiguientePasoLite'
import s from './Upsell.module.css'

/*
  Tablero de escritorio de los planes Lite y Paperless (handoff "Upsell en
  dashboards Lite y Paperless"): arriba lo que ya tiene (las tarjetas del
  bento de siempre, reacomodadas), abajo el rail PRO con lo que le falta.

  · Lite: invitación (col 1, filas 1–2) · invitados (cols 2–4) · mesas (col 2)
    · Save the Date (cols 3–4).
  · Paperless: invitación · Save the Date ancho (cols 2–4) · "Tu siguiente
    paso · Lite" (cols 2–4).

  Mide 1200 px de diseño y se escala al ancho disponible (sin agrandarse); a
  diferencia del bento de PRO no se ajusta al alto: la página hace scroll.
*/
const ANCHO = 1200

export const DashboardUpsell = ({ plan, tarjetas, incluidas, nombres, onComparar, onAbrir, mejora }) => {
    const fueraRef = useRef(null)
    const dentroRef = useRef(null)
    const [medida, setMedida] = useState({ escala: 1, alto: null })

    useLayoutEffect(() => {
        const fuera = fueraRef.current
        const dentro = dentroRef.current
        if (!fuera || !dentro) return
        const medir = () => {
            const escala = Math.min(1, fuera.clientWidth / ANCHO)
            setMedida({ escala, alto: dentro.offsetHeight * escala })
        }
        medir()
        const ro = new ResizeObserver(medir)
        ro.observe(fuera)
        ro.observe(dentro)
        return () => ro.disconnect()
    }, [])

    const lite = plan === 'lite'

    return (
        <div ref={fueraRef} className={s.marco} style={{ height: medida.alto ?? undefined }}>
            <div ref={dentroRef} className={s.lienzo} style={{ width: ANCHO, transform: `scale(${medida.escala})` }}>
                <div className={`${s.rejilla} ${lite ? s.rejillaLite : s.rejillaPaperless}`}>
                    <div className={s.celdaInv}>{tarjetas.inv}</div>
                    {lite ? (
                        <>
                            <div className={s.celdaGuests}>{tarjetas.guests}</div>
                            <div className={s.celdaTables}>{tarjetas.tables}</div>
                            <div className={s.celdaStd}>{tarjetas.std}</div>
                        </>
                    ) : (
                        <>
                            <div className={`${s.celdaStd} ${s.celdaStdAncho}`}>{tarjetas.std}</div>
                            <div className={s.celdaPaso}><SiguientePasoLite onComparar={onComparar} mejora={mejora} /></div>
                        </>
                    )}
                </div>
                <RailPro plan={plan} incluidas={incluidas} nombres={nombres} onComparar={onComparar} onAbrir={onAbrir} mejora={mejora} />
            </div>
        </div>
    )
}

export default DashboardUpsell
