import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { colorDePop, emojiDePop } from '../../../../helpers/invitation/popEvents'
import { MB } from '../../../../helpers/services/storageQuota'
import { HojaPops } from '../HojaPops'
import { MB_FREE, MB_PLUS } from '../usePlanPops'
import { COLORES_LUGAR, FRASES_CINTA } from './datosPlus'
import { useDesgloseEspacio } from './useDesgloseEspacio'
import s from './PopsPlus.module.css'

/*
  Piezas del sistema Pops+ en la app (handoff "Pops+ en la App"). Salen en
  Free y en Pops+; en Pops+ sin los CTA de compra (cinta sin "Conocer
  Pops+", chip sin el botón lima, dropdown / hoja sin "Quiero Pops+"):
  · MarcaPlus: "Pops" 900 −0.05em + "+" en lima (sobre navy / blanco) o en
    rosa (sobre lima). El chip navy de "esto es de Plus" sigue siendo
    InsigniaPlus (modules/SideEvents/PlanPops).
  · BotonQuieroPlus: CTA lima sin precio ("Quiero Pops+").
  · CintaPlus: la cinta navy de 44 px arriba de la barra, con frases según la
    pantalla y "Conocer Pops+ →".
  · ChipPlan: anillos de Pops activos y espacio + botón "Pops+"; abre el
    dropdown con los lugares, el espacio por tipo y el bloque navy. En el
    celular, "2 de 3" + mini Pops+ que abre una hoja (HojaPops).
  · LugaresPops: los lugares de Pops activos dibujados (emoji del Pop con su
    color o "libre" punteado).
*/

export const MarcaPlus = ({ sobre = 'navy', className = '', style }) => (
    <span className={`${s.marca} ${className}`} data-sobre={sobre} style={style}>
        Pops<span className={s.marcaMas}>+</span>
    </span>
)

export const BotonQuieroPlus = ({ onClick, className = '', forma = 'pill', children, disabled }) => {
    const { t } = useTranslation()
    return (
        <button type='button' className={`${s.quiero} ${className}`} data-forma={forma} onClick={onClick} disabled={disabled}>
            {children ?? <>{t('pops_plus_app.want')} <MarcaPlus sobre='lima' /></>}
        </button>
    )
}

export const CintaPlus = ({ pantalla = 'inicio', onConocer, plus = false, prueba = false, onQuedarme, yendo, movil = false }) => {
    const { t } = useTranslation()
    // Prueba gratis de Pops+: cinta lima con "Quedarme con Pops+" (va a Stripe).
    // Celular (handoff "Pops+ en la App · Celular" B): 40 px, "Prueba gratis.
    // ¡Disfrútalo!" y "Quedármelo".
    if (prueba) {
        return (
            <div className={`${s.cinta} ${s.cintaPrueba}`} data-movil={movil || undefined} role='note'>
                <span className={s.cintaPruebaTexto}>
                    <MarcaPlus sobre='lima' className={s.cintaMarca} />
                    {t(movil ? 'pops_plus_app.trial_ribbon_short' : 'pops_plus_app.trial_ribbon')}
                </span>
                <button type='button' className={s.cintaQuedarme} onClick={onQuedarme} disabled={yendo}>
                    {t(yendo ? 'pops_plus_app.editor.going' : movil ? 'pops_plus_app.trial_stay_short' : 'pops_plus_app.trial_stay')}
                </button>
            </div>
        )
    }
    // Celular (A1): 36 px, una sola frase y "Conocer →".
    // (En el celular, la frase más corta de la pantalla, para que quepa.)
    const frases = movil ? [pantalla === 'mispops' ? 'client' : 'eighty'] : (FRASES_CINTA[pantalla] ?? FRASES_CINTA.inicio)
    return (
        <div className={s.cinta} data-movil={movil || undefined} role='note'>
            {!movil && <MarcaPlus className={s.cintaMarca} />}
            <span className={s.cintaFrases}>
                {frases.map((k, i) => (
                    <span key={k} className={s.cintaFrase}>
                        {i > 0 && <span className={s.cintaSep} aria-hidden>✦</span>}
                        <span>“{t(`pops_plus_app.ribbon.${k}`)}”</span>
                        <b>→ {t(`pops_plus_app.ribbon.${k}_fix`)}</b>
                    </span>
                ))}
            </span>
            {!plus && (
                <button type='button' className={s.cintaLink} onClick={onConocer}>
                    {t(movil ? 'pops_plus_app.discover_short' : 'pops_plus_app.discover')}
                </button>
            )}
        </div>
    )
}

const Anillo = ({ pct, alerta, tam = 30 }) => {
    const r = 14
    const c = 2 * Math.PI * r
    const lleno = Math.max(0.04, Math.min(1, pct / 100)) * c
    return (
        <svg width={tam} height={tam} viewBox='0 0 36 36' aria-hidden className={s.anillo}>
            <circle cx='18' cy='18' r={r} fill='none' stroke='#E3E6F0' strokeWidth='5' />
            <circle
                cx='18' cy='18' r={r} fill='none'
                stroke={alerta ? '#FF5FA8' : '#0B1F3A'} strokeWidth='5'
                strokeDasharray={`${lleno} ${c}`} strokeLinecap='round'
                transform='rotate(-90 18 18)'
            />
        </svg>
    )
}

export const LugaresPops = ({ activos = [], tope = 3, tam = 52 }) => {
    const { t } = useTranslation()
    return (
        <div className={s.lugares} style={{ '--lugar': `${tam}px` }}>
            {Array.from({ length: tope }, (_, i) => {
                const item = activos[i]
                // Más activos que lugares: el último dice "+N" (no se sale de su caja).
                if (activos.length > tope && i === tope - 1) {
                    return <span key={i} className={s.lugarMas} title={t('pops_plus_app.active_count', { count: activos.length })}>+{activos.length - tope + 1}</span>
                }
                if (!item) return <span key={i} className={s.lugarLibre}>{t('pops_plus_app.free_slot')}</span>
                const pop = item._pop ?? {}
                return (
                    <span key={i} className={s.lugar} style={{ background: colorDePop(pop) || COLORES_LUGAR[i % COLORES_LUGAR.length] }} title={pop.name || item.name}>
                        {emojiDePop(pop) || '✨'}
                    </span>
                )
            })}
        </div>
    )
}

const TIPOS = [
    { k: 'fotos', color: '#0B1F3A' },
    { k: 'videos', color: '#2457A4' },
    { k: 'stickers', color: '#9FD8F5' },
]

const BarraEspacio = ({ plan, abierto }) => {
    const { t } = useTranslation()
    const desglose = useDesgloseEspacio(plan.idsPops, plan.bytes, abierto)
    const tope = plan.mbTope * MB
    return (
        <>
            <div className={s.barraEspacio} aria-hidden>
                {desglose
                    ? TIPOS.map(x => desglose[x.k] > 0 && (
                        <span key={x.k} style={{ width: `${Math.max(1.5, (desglose[x.k] / tope) * 100)}%`, background: x.color }} />
                    ))
                    : <span className={s.barraCargando} style={{ width: `${Math.max(2, (plan.bytes / tope) * 100)}%` }} />}
            </div>
            <span className={s.leyenda}>
                {TIPOS.map(x => (
                    <span key={x.k}><span className={s.leyendaPunto} style={{ background: x.color }} />{t(`pops_plus_app.space_${x.k}`)}</span>
                ))}
            </span>
        </>
    )
}

const CuadroTachado = ({ etiqueta, antes, ahora }) => (
    <span className={s.cuadro}>
        <span className={s.cuadroEtiqueta}>{etiqueta}</span>
        <b className={s.cuadroValor}>{antes != null && <><s>{antes}</s> </>}{ahora}</b>
    </span>
)

export const ChipPlan = ({ plan, onPasarPlus, movil = false }) => {
    const { t } = useTranslation()
    const [abierto, setAbierto] = useState(false)
    const ref = useRef(null)
    const pctPops = (plan.activos / plan.tope) * 100
    const pctMb = (plan.mbUsados / plan.mbTope) * 100

    useEffect(() => {
        if (!abierto || movil) return undefined
        const fuera = (e) => { if (!ref.current?.contains(e.target)) setAbierto(false) }
        const esc = (e) => { if (e.key === 'Escape') setAbierto(false) }
        window.addEventListener('pointerdown', fuera)
        window.addEventListener('keydown', esc)
        return () => { window.removeEventListener('pointerdown', fuera); window.removeEventListener('keydown', esc) }
    }, [abierto, movil])

    const irPlus = () => { setAbierto(false); onPasarPlus?.() }
    // Pops+: sin tope de Pops ni botón de compra.
    const plus = Boolean(plan.plus)
    // Hasta 4 lugares (con "+N" si hay más): caben en el dropdown de 300 px y en la hoja.
    const lugares = plus ? Math.min(4, Math.max(1, plan.activos)) : plan.tope
    const popsTexto = plus
        ? `${plan.activos} · ${t('pops_plus_app.unlimited_m')}`
        : t('pops_app.of', { n: plan.activos, total: plan.tope })
    const cuenta = plus ? plan.activos : `${plan.activos}/${plan.tope}`

    // Lo mismo en el dropdown de escritorio y en la hoja del celular (handoff
    // "Pops+ en la App · Celular" C): lugares, espacio por tipo y bloque navy.
    const contenido = (
        <>
            <div className={s.dropBloque}>
                <span className={s.dropFila}><b>{t('pops_app.active_pops')}</b><span>{popsTexto}</span></span>
                <LugaresPops activos={plan.listaActivos} tope={lugares} tam={movil ? 60 : 52} />
            </div>
            <div className={s.dropBloque}>
                <span className={s.dropFila}><b>{t('pops_app.space')}</b><span>{t('pops_app.mb_of', { used: plan.mbUsados, total: plan.mbTope })}</span></span>
                <BarraEspacio plan={plan} abierto={abierto} />
            </div>
            <div className={s.dropNavy}>
                <MarcaPlus className={s.dropMarca} />
                <div className={s.cuadros}>
                    <CuadroTachado etiqueta={t('pops_plus_app.pops')} antes={plus ? null : plan.tope} ahora={t('pops_plus_app.unlimited_m')} />
                    <CuadroTachado etiqueta={t('pops_app.space')} antes={plus ? null : MB_FREE} ahora={`${MB_PLUS} MB`} />
                </div>
                {plus
                    ? <span className={s.dropTuPlan}>{t(plan.prueba ? 'pops_plus_app.your_trial' : 'pops_plus_app.your_plan_label')}</span>
                    : <BotonQuieroPlus className={s.dropCta} onClick={irPlus} />}
            </div>
        </>
    )

    if (movil) {
        return (
            <>
                {/* Anillo de 20 px + "2/3" (Pops+: "N") + mini Pops+; abre la hoja de plan. */}
                <button type='button' className={s.chipMovil} onClick={() => setAbierto(true)} aria-label={t('pops_plus_app.your_plan')}>
                    <Anillo pct={plus ? 100 : pctPops} alerta={plan.enLimite} tam={20} />
                    <span data-alerta={plan.enLimite || undefined}>{cuenta}</span>
                    <span className={s.chipMovilPlus} data-plus={plus || undefined}><MarcaPlus sobre={plus ? 'navy' : 'lima'} /></span>
                </button>
                <HojaPops open={abierto} onClose={() => setAbierto(false)} etiqueta={t('pops_plus_app.your_plan')}>
                    <div className={`${s.hojaPlan} ${s.hojaPlanMovil}`}>{contenido}</div>
                </HojaPops>
            </>
        )
    }

    return (
        <div className={s.chipWrap} ref={ref}>
            <button type='button' className={s.chip} data-abierto={abierto || undefined} aria-expanded={abierto} onClick={() => setAbierto(v => !v)} aria-label={t('pops_plus_app.your_plan')}>
                <span className={s.chipDato} title={t('pops_app.active_pops')}>
                    <Anillo pct={plus ? 100 : pctPops} alerta={plan.enLimite} />{cuenta}
                </span>
                <span className={s.chipDato} data-dato='espacio' title={t('pops_app.space')}><Anillo pct={pctMb} alerta={pctMb >= 90} />{Math.round(pctMb)}%</span>
                {/* Free: botón lima de compra; Pops+: la marca (no es botón de compra). */}
                <span className={s.chipPlus} data-plus={plus || undefined}><MarcaPlus sobre={plus ? 'navy' : 'lima'} /></span>
            </button>
            {abierto && (
                <div className={s.dropdown} role='dialog' aria-label={t('pops_plus_app.your_plan')}>
                    {contenido}
                </div>
            )}
        </div>
    )
}

/**
 * Banda Pops+ del Inicio en el celular (handoff "Pops+ en la App · Celular"
 * A6): tarjeta navy con dos frases → solución, "Ver tabla →" y "Quiero Pops+".
 */
export const BandaPlusMovil = ({ onTabla, onPlus, prueba = false }) => {
    const { t } = useTranslation()
    return (
        <div className={s.banda}>
            <MarcaPlus className={s.bandaMarca} />
            {['eighty', 'eight'].map(k => (
                <span key={k} className={s.bandaFrase}>
                    <span>“{t(`pops_plus_app.plus_phrase.${k}`)}”</span>
                    <b>{t(`pops_plus_app.band.${k}`)}</b>
                </span>
            ))}
            <div className={s.bandaPie}>
                <button type='button' className={s.bandaTabla} onClick={onTabla}>{t('pops_plus_app.see_table_short')}</button>
                <BotonQuieroPlus className={s.bandaCta} onClick={onPlus}>
                    {prueba ? t('pops_plus_app.trial_stay_short') : undefined}
                </BotonQuieroPlus>
            </div>
        </div>
    )
}

/** Medidor "Personas N de 30" (Tus próximos Pops, Mis Pops): rosa desde el 90 %. */
export const MedidorPersonas = ({ n = 0, tope = 30, etiqueta = true, compacto = false }) => {
    const { t } = useTranslation()
    // Pops+ (`tope` null): sin tope, solo la cuenta.
    if (tope == null) {
        return (
            <div className={s.personas} data-compacto={compacto || undefined}>
                <div className={s.personasFila}>
                    {etiqueta && <span className={s.personasEtiqueta}>{t('pops_plus_app.people')}</span>}
                    <b>{t('pops_plus_app.people_count', { count: n })}</b>
                    <span className={s.lugaresTexto}>{t('pops_plus_app.no_cap')}</span>
                </div>
                <div className={s.personasPista}><span className={s.pistaLlena} style={{ width: '100%' }} /></div>
            </div>
        )
    }
    const pct = (n / tope) * 100
    const casiLleno = pct >= 90
    const quedan = Math.max(0, tope - n)
    return (
        <div className={s.personas} data-compacto={compacto || undefined}>
            <div className={s.personasFila}>
                {etiqueta && <span className={s.personasEtiqueta}>{t('pops_plus_app.people')}</span>}
                <b>
                    {t('pops_app.of', { n, total: tope })}
                    {etiqueta && casiLleno && <> · <span className={s.quedan}>{t('pops_plus_app.left', { count: quedan })}</span></>}
                </b>
                {!etiqueta && (casiLleno
                    ? <span className={s.quedan}>{t('pops_plus_app.left', { count: quedan })}</span>
                    : <span className={s.lugaresTexto}>{t('pops_plus_app.spots', { count: quedan })}</span>)}
            </div>
            <div className={s.personasPista}><span style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} data-alerta={casiLleno || undefined} /></div>
        </div>
    )
}
