import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Gauge, Type } from 'lucide-react'
import bar from '../../Invitation/Build/PageSections/ElementBar.module.css'
import { ETIQUETA_DEFAULT, normalizarPatrocinadores, patrocinadoresDe, VELOCIDADES } from '../patrocinadores'
import own from './PatrocinadoresBar.module.css'

/*
  Barra de la capa Patrocinadores (handoff v2 §4.1), arriba de la pieza en
  escritorio y en lugar del footer en el celular (barraContextual.jsx):
  velocidad (Portada y Banda) y etiqueta (solo Portada, en MAYÚSCULAS). El
  acomodo y el color de los logos viven en el panel. Con Tarjeta no sale
  (`tieneBarraPatrocinadores`).
*/

const NOMBRE_VELOCIDAD = { 0.5: 'slow', 1: 'normal', 1.8: 'fast' }

export const PatrocinadoresBar = ({ body, actualizar }) => {
    const { t } = useTranslation()
    const s = patrocinadoresDe(body)
    const guardar = (patch, opts) => actualizar((prev) => ({ ...normalizarPatrocinadores(prev), ...patch }), opts)
    // La etiqueta se escribe aquí y se guarda junta (coalesce): un solo paso de deshacer.
    const [etiqueta, setEtiqueta] = useState(s.label)
    useEffect(() => { setEtiqueta(s.label) }, [s.label])

    return (
        <div className={`${bar.bar} ${own.barra}`} data-edit-keep data-text-bar>
            <span className={own.grupo}>
                <span className={own.icono} title={t('side_events.sponsors_speed')}><Gauge size={16} /></span>
                <span className={own.velocidades} role="group" aria-label={t('side_events.sponsors_speed')} data-tema-propio>
                    {VELOCIDADES.map((v) => (
                        <button key={v} type="button" className={own.velocidad} data-on={s.speed === v || undefined} aria-pressed={s.speed === v} onClick={() => guardar({ speed: v })}>
                            {t(`side_events.sponsors_speed_${NOMBRE_VELOCIDAD[v]}`)}
                        </button>
                    ))}
                </span>
            </span>
            {s.layout === 'portada' && (
                <span className={own.grupo}>
                    <span className={bar.divider} />
                    <span className={own.icono} title={t('side_events.sponsors_label')}><Type size={16} /></span>
                    <input
                        className={own.etiqueta}
                        value={etiqueta}
                        maxLength={32}
                        aria-label={t('side_events.sponsors_label')}
                        placeholder={ETIQUETA_DEFAULT}
                        onChange={(e) => {
                            const v = e.target.value.toUpperCase()
                            setEtiqueta(v)
                            guardar({ label: v || undefined }, { coalesce: 'patrocinadores-etiqueta' })
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                    />
                </span>
            )}
        </div>
    )
}
