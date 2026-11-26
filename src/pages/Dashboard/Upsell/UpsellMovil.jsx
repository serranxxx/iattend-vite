import { ChevronRight, Lock, MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { pesos, upgradeDe } from './planesUpsell'
import s from './Upsell.module.css'

/*
  Piezas del upsell en el celular (handoff "Upsell mobile en los dashboards
  Lite y Paperless"); DashboardMobile las acomoda. Todo abre el comparador
  (hoja inferior) con `onComparar({ funcion?, destino? })`.
*/

const LANDING = 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/landing'
const FUNCIONES_PRO = ['wa', 'side', 'photo', 'pass', 'lia']

const Candado = ({ claro }) => (
    <span className={`${s.candado} ${claro ? s.candadoClaro : ''}`}>
        <Lock size={11} strokeWidth={2.4} />
        PRO
    </span>
)

const tocar = (fn) => ({
    role: 'button',
    tabIndex: 0,
    onClick: fn,
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn() } },
})

/**
 * Barra del plan, arriba de todo: "PLAN LITE · 5 funciones más con PRO ·
 * Mejorar". En Lite la pastilla va directo al pago de PRO; en Paperless
 * ("Mejorar plan", sin destino) abre el comparador.
 */
export const BarraPlan = ({ plan, incluidas, onComparar, mejora }) => {
    const { t } = useTranslation()
    const faltan = FUNCIONES_PRO.filter((f) => !incluidas.has(f)).length
    return (
        <button
            type='button'
            className={s.barraPlan}
            onClick={() => (plan === 'lite' ? mejora.ir('pro') : onComparar({}))}
        >
            <span className={s.barraPlanLabel}>{t('upsell.chip_label', { plan: t(`upsell.plan_${plan}`).toUpperCase() })}</span>
            <span className={s.barraPlanTexto}>
                {plan === 'lite' ? t('upsell.bar_more_pro', { count: faltan }) : t('upsell.bar_more_paperless')}
            </span>
            <span className={s.barraPlanPill}>
                {mejora.yendo ? t('upsell.cmp_going') : plan === 'lite' ? t('upsell.bar_upgrade') : t('upsell.chip_upgrade')}
            </span>
        </button>
    )
}

/** Última fila de la lista de invitados (Lite): recordatorio por WhatsApp. */
export const NudgeMovil = ({ esperando, onComparar }) => {
    const { t } = useTranslation()
    if (!esperando) return null
    return (
        <button type='button' className={s.nudgeMovil} onClick={() => onComparar({ funcion: 'wa' })}>
            <MessageCircle size={18} />
            <span>{t('upsell.nudge_wa', { count: esperando })}</span>
            <span className={s.candado}><Lock size={10} strokeWidth={2.4} />PRO</span>
        </button>
    )
}

/** Save the Date a todo el ancho (Paperless). */
export const StdMovil = ({ img, onAbrir }) => {
    const { t } = useTranslation()
    return (
        <div className={s.stdMovil} {...tocar(onAbrir)}>
            {img && <img src={img} alt='' />}
            <span className={s.stdMovilGrad} />
            <span className={s.stdMovilTextos}>
                <b>{t('dashboard.card_save_the_date')}</b>
                <small>{t('upsell.std_mobile_sub')}</small>
            </span>
            <span className={s.stdMovilBoton}>{t('upsell.std_mobile_add')}</span>
        </div>
    )
}

/** "Tu siguiente paso · Lite" (Paperless). */
export const PasoLiteMovil = ({ onComparar, mejora }) => {
    const { t } = useTranslation()
    const up = upgradeDe('paperless', 'lite')
    const comparar = () => onComparar({ funcion: 'guests', destino: 'lite' })
    return (
        <div className={s.pasoMovil}>
            <span className={s.pasoEyebrow}><Lock size={11} strokeWidth={2.4} />{t('upsell.next_eyebrow')}</span>
            <h2 className={s.pasoMovilTitulo}>{t('upsell.next_title')}</h2>
            <div className={s.pasoMovilHoja} {...tocar(comparar)} aria-label={t('upsell.features.guests.name')}>
                <div className={s.pasoMovilStats}>
                    <div><b>182</b><small>{t('dashboard.stat_confirmed')}</small></div>
                    <div><b>64</b><small>{t('dashboard.stat_waiting')}</small></div>
                    <div><b>54</b><small>{t('dashboard.stat_available')}</small></div>
                </div>
                {[['LV', 'Luis Vázquez Ramírez'], ['PL', 'Pablo López Navarro'], ['VM', 'Valentina Mendoza']].map(([ini, nombre]) => (
                    <div key={ini} className={s.pasoFila}>
                        <span className={s.pasoAvatar}>{ini}</span>
                        <span className={s.pasoNombre}>{nombre}</span>
                        <span className={s.pasoEstado}>{t('dashboard.bento_status_wait')}</span>
                    </div>
                ))}
            </div>
            <p className={s.pasoMovilCopy}>{t('upsell.next_copy_mobile')}</p>
            <button type='button' className={s.ctaMovilNavy} onClick={() => mejora.ir('lite')}>
                {mejora.yendo === 'lite' ? t('upsell.cmp_going') : t('upsell.upgrade_to', { plan: 'Lite' })}
                {up && mejora.yendo !== 'lite' && <span className={s.pasoPrecio}>· +{pesos(up.monto)}</span>}
            </button>
        </div>
    )
}

/** Tarjeta PRO (navy) con su CTA. */
export const TarjetaProMovil = ({ plan, incluidas, mejora }) => {
    const { t } = useTranslation()
    const desdePaperless = plan === 'paperless'
    const up = upgradeDe(plan, 'pro')
    const faltan = FUNCIONES_PRO.filter((f) => !incluidas.has(f)).length
    return (
        <div className={s.proMovil}>
            <span className={s.proMovilGlow} aria-hidden />
            <span className={s.railBadge}>{desdePaperless ? t('upsell.rail_badge_popular') : 'PRO'}</span>
            <h2 className={s.proMovilTitulo}>{t(desdePaperless ? 'upsell.rail_title_paperless' : 'upsell.rail_title_lite')}</h2>
            <p className={s.proMovilCopy}>
                {desdePaperless ? t('upsell.pro_mobile_copy_paperless') : t('upsell.pro_mobile_copy_lite', { count: faltan })}
            </p>
            {up && (
                <p className={s.proMovilPrecio}><b>+{pesos(up.monto)}</b> {t('upsell.pro_mobile_price_note')}</p>
            )}
            <button type='button' className={s.railCta} onClick={() => mejora.ir('pro')}>
                {mejora.yendo === 'pro' ? t('upsell.cmp_going') : t('upsell.upgrade_to', { plan: 'PRO' })}
            </button>
        </div>
    )
}

/**
 * Carrusel de las funciones PRO con su vista previa. Las que la invitación ya
 * trae (un Lite de antes con side events o Photo Wall) no salen aquí: siguen
 * en "Más para tu evento".
 */
export const CarruselBloqueadas = ({ incluidas, nombres, onComparar }) => {
    const { t } = useTranslation()
    const ver = (f) => !incluidas.has(f)
    const tile = (f) => tocar(() => onComparar({ funcion: f }))
    return (
        <div className={s.carrusel}>
            {ver('photo') && (
                <div className={`${s.tile} ${s.tileMovil} ${s.tilePhoto}`} {...tile('photo')}>
                    <Candado claro />
                    <h3 className={s.tileTitulo}>Photo Wall</h3>
                    <div className={`${s.polaroids} ${s.polaroidsMovil}`} aria-hidden>
                        <span className={s.polaroidA}><img src={`${LANDING}/wall-1.jpg`} alt='' /></span>
                        <span className={s.polaroidB}><img src={`${LANDING}/wall-2.jpg`} alt='' /></span>
                    </div>
                </div>
            )}
            {ver('wa') && (
                <div className={`${s.tile} ${s.tileMovil} ${s.tileWa}`} {...tile('wa')}>
                    <Candado />
                    <h3 className={s.tileTitulo}>{t('upsell.tile_wa_title')}</h3>
                    <div className={s.burbujaWa}>{t('upsell.tile_wa_msg', { nombres })}</div>
                    <small className={s.tileNota}>{t('upsell.tile_wa_note_short')}</small>
                </div>
            )}
            {ver('lia') && (
                <div className={`${s.tile} ${s.tileMovil} ${s.tileLia}`} {...tile('lia')}>
                    <Candado claro />
                    <div className={s.liaCabeza}>
                        <span className={s.orbe} aria-hidden />
                        <h3 className={s.tileTitulo}>Lia</h3>
                    </div>
                    <span className={s.liaPregunta}>{t('upsell.tile_lia_q')}</span>
                    <span className={s.liaRespuesta}>{t('upsell.tile_lia_a')}</span>
                </div>
            )}
            {ver('side') && (
                <div className={`${s.tile} ${s.tileMovil} ${s.tileSide}`} {...tile('side')}>
                    <Candado />
                    <h3 className={s.tileTitulo}>{t('upsell.tile_side_title')}</h3>
                    <p className={s.tileTextoCorto}>{t('upsell.tile_side')}</p>
                    <div className={s.sobres} aria-hidden>
                        {[['#1c3249', '#16323d', '#fff', 'sobreA'], ['#b9bba6', '#a9ab95', '#1c3249', 'sobreB'], ['#D1BEDD', '#c1abd0', '#1c3249', 'sobreC']].map(([bg, flap, color, cls], i) => (
                            <span key={cls} className={`${s.sobre} ${s[cls]}`} style={{ background: bg }}>
                                <span className={s.sobreSolapa} style={{ background: flap }} />
                                <span className={s.sobreNombre} style={{ color }}>{t(`upsell.envelopes.${i}`)}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}
            {ver('pass') && (
                <div className={`${s.tile} ${s.tileMovil} ${s.tilePass}`} {...tile('pass')}>
                    <Candado />
                    <h3 className={s.tileTitulo}>{t('upsell.tile_pass_title')}</h3>
                    <div className={s.paseMini} aria-hidden>
                        <div>
                            <small>{t('upsell.tile_pass_eyebrow')}</small>
                            <b>Luis Vázquez</b>
                            <span>{t('upsell.tile_pass_people')}</span>
                        </div>
                        <span className={s.paseQr} />
                    </div>
                </div>
            )}
        </div>
    )
}

/** Link "Comparar planes" al final. */
export const CompararMovil = ({ onComparar }) => {
    const { t } = useTranslation()
    return (
        <button type='button' className={s.compararMovil} onClick={() => onComparar({})}>
            {t('upsell.compare')}
            <ChevronRight size={16} />
        </button>
    )
}
