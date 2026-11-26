import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { pesos, upgradeDe } from './planesUpsell'
import s from './Upsell.module.css'

/*
  Rail PRO (navy, ancho completo, debajo de la rejilla): lo que le falta al
  plan con una vista previa de cada función. Cada tile abre el comparador con
  su función resaltada; si la invitación ya la trae (un Lite de antes con side
  events, o con Photo Wall), el tile no lleva candado y abre la función.

  plan: 'lite' | 'paperless' · incluidas: Set de funciones que ya trae
  onComparar({ funcion?, destino? }) · onAbrir(funcion)
  mejora: useMejorarPlan → "Mejorar a PRO" va directo al pago
*/

const LANDING = 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/landing'

const SOBRES = [
    { bg: '#1c3249', flap: '#16323d', color: '#fff', cls: 'sobreA' },
    { bg: '#b9bba6', flap: '#a9ab95', color: '#1c3249', cls: 'sobreB' },
    { bg: '#D1BEDD', flap: '#c1abd0', color: '#1c3249', cls: 'sobreC' },
]

const Candado = ({ claro }) => (
    <span className={`${s.candado} ${claro ? s.candadoClaro : ''}`}>
        <Lock size={11} strokeWidth={2.4} />
        PRO
    </span>
)

export const RailPro = ({ plan, incluidas, nombres, onComparar, onAbrir, mejora }) => {
    const { t } = useTranslation()
    const desdePaperless = plan === 'paperless'
    const up = upgradeDe(plan, 'pro')
    const faltan = ['wa', 'side', 'photo', 'pass', 'lia'].filter((f) => !incluidas.has(f)).length

    const tile = (funcion) => ({
        role: 'button',
        tabIndex: 0,
        onClick: () => (incluidas.has(funcion) ? onAbrir(funcion) : onComparar({ funcion })),
        onKeyDown: (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return
            e.preventDefault()
            incluidas.has(funcion) ? onAbrir(funcion) : onComparar({ funcion })
        },
    })
    const bloqueada = (funcion) => !incluidas.has(funcion)

    return (
        <section className={s.rail}>
            <span className={s.railGlow} aria-hidden />
            <div className={s.railIzq}>
                <span className={s.railBadge}>{desdePaperless ? t('upsell.rail_badge_popular') : 'PRO'}</span>
                <h2 className={s.railTitulo}>{t(desdePaperless ? 'upsell.rail_title_paperless' : 'upsell.rail_title_lite')}</h2>
                <p className={s.railCopy}>
                    {desdePaperless ? t('upsell.rail_copy_paperless') : t('upsell.rail_copy_lite', { count: faltan })}
                </p>
                {up && (
                    <div className={s.railPrecio}>
                        <span><b>+{pesos(up.monto)}</b> MXN</span>
                        <small>{t('upsell.rail_price_note')}</small>
                    </div>
                )}
                <div className={s.railAcciones}>
                    <button type='button' className={s.railCta} onClick={() => mejora.ir('pro')}>
                        {mejora.yendo === 'pro' ? t('upsell.cmp_going') : t('upsell.upgrade_to', { plan: 'PRO' })}
                    </button>
                    <button type='button' className={s.railLink} onClick={() => onComparar({})}>
                        {t('upsell.compare')}
                    </button>
                </div>
            </div>

            <div className={s.railTiles}>
                <div className={`${s.tile} ${s.tilePhoto}`} {...tile('photo')}>
                    {bloqueada('photo') && <Candado claro />}
                    <h3 className={s.tileTituloGrande}>Photo Wall</h3>
                    <p className={s.tileTexto}>{t('upsell.tile_photo')}</p>
                    <div className={s.polaroids} aria-hidden>
                        <span className={s.polaroidA}><img src={`${LANDING}/wall-1.jpg`} alt='' /></span>
                        <span className={s.polaroidB}><img src={`${LANDING}/wall-2.jpg`} alt='' /></span>
                    </div>
                </div>

                <div className={`${s.tile} ${s.tileWa}`} {...tile('wa')}>
                    {bloqueada('wa') && <Candado />}
                    <h3 className={s.tileTitulo}>{t('upsell.tile_wa_title')}</h3>
                    <div className={s.burbujaWa}>{t('upsell.tile_wa_msg', { nombres })}</div>
                    <small className={s.tileNota}>{t('upsell.tile_wa_note')}</small>
                </div>

                <div className={`${s.tile} ${s.tileLia}`} {...tile('lia')}>
                    {bloqueada('lia') && <Candado claro />}
                    <div className={s.liaCabeza}>
                        <span className={s.orbe} aria-hidden />
                        <h3 className={s.tileTitulo}>Lia</h3>
                    </div>
                    <span className={s.liaPregunta}>{t('upsell.tile_lia_q')}</span>
                    <span className={s.liaRespuesta}>{t('upsell.tile_lia_a')}</span>
                </div>

                <div className={`${s.tile} ${s.tileSide}`} {...tile('side')}>
                    {bloqueada('side') && <Candado />}
                    <h3 className={s.tileTitulo}>{t('upsell.tile_side_title')}</h3>
                    <p className={s.tileTextoCorto}>{t('upsell.tile_side')}</p>
                    <div className={s.sobres} aria-hidden>
                        {SOBRES.map((sb, i) => (
                            <span key={i} className={`${s.sobre} ${s[sb.cls]}`} style={{ background: sb.bg }}>
                                <span className={s.sobreSolapa} style={{ background: sb.flap }} />
                                <span className={s.sobreNombre} style={{ color: sb.color }}>{t(`upsell.envelopes.${i}`)}</span>
                            </span>
                        ))}
                    </div>
                </div>

                <div className={`${s.tile} ${s.tilePass}`} {...tile('pass')}>
                    {bloqueada('pass') && <Candado />}
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
            </div>
        </section>
    )
}

export default RailPro
