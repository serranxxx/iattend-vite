import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { TablesSketch } from '../TablesSketch'
import { pesos, upgradeDe } from './planesUpsell'
import s from './Upsell.module.css'

/*
  Paperless → "Tu siguiente paso · Lite" (fila 2 de la rejilla): gestión de
  invitados y acomodo de mesas con una vista previa de ejemplo (los Paperless
  no tienen invitados todavía). Todo abre el comparador.
*/

const EJEMPLO = [
    { ini: 'LV', nombre: 'Luis Vázquez Ramírez' },
    { ini: 'PL', nombre: 'Pablo López Navarro' },
    { ini: 'VM', nombre: 'Valentina Mendoza' },
]

export const SiguientePasoLite = ({ onComparar, mejora }) => {
    const { t } = useTranslation()
    const up = upgradeDe('paperless', 'lite')

    return (
        <div className={s.paso}>
            <div className={s.pasoTextos}>
                <span className={s.pasoEyebrow}><Lock size={11} strokeWidth={2.4} />{t('upsell.next_eyebrow')}</span>
                <h2 className={s.pasoTitulo}>{t('upsell.next_title')}</h2>
                <p className={s.pasoCopy}>{t('upsell.next_copy')}</p>
                <div className={s.pasoAcciones}>
                    <button type='button' className={s.pasoCta} onClick={() => mejora.ir('lite')}>
                        {mejora.yendo === 'lite' ? t('upsell.cmp_going') : t('upsell.upgrade_to', { plan: 'Lite' })}
                        {up && mejora.yendo !== 'lite' && <span className={s.pasoPrecio}>· +{pesos(up.monto)}</span>}
                    </button>
                    <button type='button' className={s.pasoSecundario} onClick={() => onComparar({})}>
                        {t('upsell.compare')}
                    </button>
                </div>
            </div>

            <div
                className={s.pasoVista}
                role='button'
                tabIndex={0}
                aria-label={t('upsell.features.guests.name')}
                onClick={() => onComparar({ funcion: 'guests', destino: 'lite' })}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onComparar({ funcion: 'guests', destino: 'lite' }) } }}
            >
                <div className={s.pasoHoja}>
                    <div className={s.pasoHojaHead}><span>{t('dashboard.card_guests')}</span><span>300 {t('dashboard.bento_passes')}</span></div>
                    <div className={s.pasoStats}>
                        <div><b>182</b><small>{t('dashboard.stat_confirmed')}</small></div>
                        <div><b>64</b><small>{t('dashboard.stat_waiting')}</small></div>
                    </div>
                    {EJEMPLO.map((g) => (
                        <div key={g.ini} className={s.pasoFila}>
                            <span className={s.pasoAvatar}>{g.ini}</span>
                            <span className={s.pasoNombre}>{g.nombre}</span>
                            <span className={s.pasoEstado}>{t('dashboard.bento_status_wait')}</span>
                        </div>
                    ))}
                </div>
                <div className={s.pasoMesas}><TablesSketch /></div>
            </div>
        </div>
    )
}

export default SiguientePasoLite
