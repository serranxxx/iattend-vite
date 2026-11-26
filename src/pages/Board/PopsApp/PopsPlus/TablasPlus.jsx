import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, Minus } from 'lucide-react'
import { PRECIO_PLUS, TOPE_POPS_FREE } from '../usePlanPops'
import { FRASES_GRATIS, FRASES_PLUS, TABLA, TABLA_COMPLETA } from './datosPlus'
import { BotonQuieroPlus, MarcaPlus } from './PopsPlus'
import destello from '../../../../assets/pops-stickers/craft/destello.svg'
import s from './TablasPlus.module.css'

/*
  Comparación Gratis / Pops+ (handoff "Pops+ en la App"):
  · GratisOPlus (Inicio, 1): título "¿Gratis o Pops+?" + "Ver tabla de
    comparación →" y dos tarjetas (blanca 1fr / navy 1.3fr) con frases de la
    gente → solución.
  · TablaPlusModal (1c): 720 px, grid 1fr 150 190, la columna navy de arriba a
    abajo; sin ✕ (clic fuera o Esc). "Explorar a detalle →" abre la tabla
    completa.
  En la prueba gratis (`prueba`) la columna navy lleva "Quedarme con Pops+"
  (Stripe): la cinta lima de la prueba abre esta tabla en lugar de ir directo.
  · TablaHojaMovil (celular, D2): la misma comparación en hoja navy.
  · TablaCompleta (1d): página de PopsApp (`?seccion=plus`) con "← Volver" y
    los grupos de datosPlus.js.
  Las filas que hoy no son ciertas se quitaron (ver datosPlus.js).
*/

const Valor = ({ v, navy }) => {
    const { t } = useTranslation()
    if (v === true) return <Check size={16} strokeWidth={3} className={navy ? s.siNavy : s.si} aria-label='✓' />
    if (v === false) return <Minus size={16} strokeWidth={2.5} className={s.no} aria-label='—' />
    return t(`pops_plus_app.val.${v}`)
}

const Precio = ({ plus, grande }) => {
    const { t } = useTranslation()
    return (
        <span className={s.precio} data-grande={grande || undefined}>
            {plus ? <>${PRECIO_PLUS} <small>{t('pops_plus_app.per_month')}</small></> : '$0'}
        </span>
    )
}

// `prueba`: prueba gratis de Pops+ — en lugar de "Tu plan", "Quedarme con Pops+" (Stripe).
const CtaNavy = ({ esFree, prueba, onPlus, className }) => {
    const { t } = useTranslation()
    if (esFree) return <BotonQuieroPlus className={className} onClick={onPlus} />
    // Corto: la columna navy mide 190 px.
    if (prueba) return <BotonQuieroPlus className={className} onClick={onPlus}>{t('pops_plus_app.trial_stay_short')} →</BotonQuieroPlus>
    return <span className={s.tuPlanNavy}>{t('pops_plus_app.your_plan_label')}</span>
}

export const TablaPlusModal = ({ open, onClose, onDetalle, onPlus, esFree = true, prueba = false }) => {
    const { t } = useTranslation()
    useEffect(() => {
        if (!open) return undefined
        const esc = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', esc)
        return () => window.removeEventListener('keydown', esc)
    }, [open, onClose])
    if (!open) return null
    return createPortal(
        <div className={s.velo} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div className={s.modal} role='dialog' aria-modal='true' aria-labelledby='pops-plus-tabla'>
                <div className={s.filaModal} data-cabeza>
                    <span id='pops-plus-tabla' className={s.tituloModal}>
                        {t('pops_plus_app.free_or')} <span className={s.resalta}>Pops+?</span>
                    </span>
                    <span className={s.colFree}><b>{t('pops_plus_app.free')}</b><Precio /></span>
                    <span className={s.colPlus}><MarcaPlus className={s.colMarca} /><Precio plus /></span>
                </div>
                {TABLA.map(f => (
                    <div key={f.k} className={s.filaModal} data-titulo={f.titulo || undefined} data-sub={f.sub || undefined}>
                        <span className={s.nombre}>{t(`pops_plus_app.row.${f.k}`)}</span>
                        <span className={s.valFree}>{!f.titulo && <Valor v={f.free} />}</span>
                        <span className={s.valPlus}>{!f.titulo && <Valor v={f.plus} navy />}</span>
                    </div>
                ))}
                <div className={s.filaModal} data-pie>
                    <button type='button' className={s.detalle} onClick={onDetalle}>{t('pops_plus_app.explore')}</button>
                    <span className={s.tuPlan}>{esFree ? t('pops_plus_app.your_plan_label') : ''}</span>
                    <span className={s.pieNavy}>
                        <CtaNavy esFree={esFree} prueba={prueba} onPlus={onPlus} className={s.ctaModal} />
                    </span>
                </div>
            </div>
        </div>,
        document.body,
    )
}

export const TablaCompleta = ({ onVolver, onPlus, esFree = true, prueba = false, movil = false }) => {
    const { t } = useTranslation()
    return (
        <div className={s.completa} data-movil={movil || undefined}>
            <button type='button' className={s.volver} onClick={onVolver}><ArrowLeft size={16} />{t('pops_plus_app.back')}</button>
            <h1 className={s.completaTitulo}>{t('pops_plus_app.full_title_a')} <span className={s.resalta}>Pops+</span></h1>
            <div className={s.tabla}>
                <div className={s.filaCompleta} data-cabeza>
                    <span />
                    <span className={s.colFree}><b>{t('pops_plus_app.free')}</b><Precio grande /></span>
                    <span className={s.colPlus}><MarcaPlus className={s.colMarca} /><Precio plus grande /></span>
                </div>
                {TABLA_COMPLETA.map(grupo => (
                    <div key={grupo.g} className={s.grupo}>
                        <div className={s.filaCompleta} data-grupo>
                            <span className={s.grupoTitulo}>{t(`pops_plus_app.group.${grupo.g}`)}</span>
                            <span />
                            <span className={s.valPlus} />
                        </div>
                        {grupo.filas.map(f => (
                            <div key={f.k} className={s.filaCompleta}>
                                <span className={s.nombre}>{t(`pops_plus_app.row.${f.k}`)}</span>
                                <span className={s.valFree}><Valor v={f.free} /></span>
                                <span className={s.valPlus}><Valor v={f.plus} navy /></span>
                            </div>
                        ))}
                    </div>
                ))}
                <div className={s.filaCompleta} data-pie>
                    <span />
                    <span />
                    <span className={s.pieNavy}>
                        <CtaNavy esFree={esFree} prueba={prueba} onPlus={onPlus} className={s.ctaCompleta} />
                    </span>
                </div>
            </div>
        </div>
    )
}

// `plus`: la cuenta ya es Pops+ ("Lo tienes" en la tarjeta navy, sin "Pasar a Pops+").
export const GratisOPlus = ({ onTabla, onPlus, movil = false, plus = false }) => {
    const { t } = useTranslation()
    return (
        <section className={s.gop} data-movil={movil || undefined} id='pops-plus-comparar'>
            <div className={s.gopCabeza}>
                <h3 className={s.gopTitulo}>{t('pops_plus_app.free_or')} <span className={s.resalta}>Pops+?</span></h3>
                <button type='button' className={s.verTabla} onClick={onTabla}>{t('pops_plus_app.see_table')}</button>
            </div>
            <div className={s.gopTarjetas}>
                <div className={s.tarjetaFree}>
                    <div className={s.tarjetaCabeza}>
                        <span className={s.tarjetaTag}>{t(plus ? 'pops_plus_app.free_tag_plain' : 'pops_plus_app.free_tag')}</span>
                        <span className={s.tarjetaTitulo}>{t('pops_plus_app.free_card_title')}</span>
                    </div>
                    <div className={s.frases}>
                        {FRASES_GRATIS.map(k => (
                            <div key={k} className={s.frase}>
                                <span className={s.fraseGente}>“{t(`pops_plus_app.free_phrase.${k}`)}”</span>
                                <span className={s.fraseFix}>{t(`pops_plus_app.free_phrase.${k}_fix`)}</span>
                            </div>
                        ))}
                    </div>
                    <div className={s.tarjetaPie}>
                        <span className={s.pieTextos}>
                            <b className={s.pieGrande}>$0</b>
                            <small>{t('pops_plus_app.free_limits', { n: TOPE_POPS_FREE })}</small>
                        </span>
                        {!plus && <span className={s.loTienes}>{t('pops_plus_app.you_have_it')}</span>}
                    </div>
                </div>
                <div className={s.tarjetaPlus}>
                    <img src={destello} alt='' aria-hidden className={s.destello} />
                    <div className={s.tarjetaCabeza}>
                        <MarcaPlus className={s.tarjetaMarca} />
                        <span className={s.tarjetaTitulo}>{t('pops_plus_app.plus_card_title')}</span>
                    </div>
                    <div className={`${s.frases} ${s.frasesPlus}`}>
                        {FRASES_PLUS.map(k => (
                            <div key={k} className={s.frase}>
                                <span className={`${s.fraseGente} ${s.fraseGenteNavy}`}>“{t(`pops_plus_app.plus_phrase.${k}`)}”</span>
                                <span className={s.fraseFix}>{t(`pops_plus_app.plus_phrase.${k}_fix`)}</span>
                            </div>
                        ))}
                    </div>
                    <div className={s.ademas}>
                        <span>{t('pops_plus_app.also')}</span>
                        <span className={s.ademasChip}>{t('pops_plus_app.also_effects')}</span>
                    </div>
                    <div className={`${s.tarjetaPie} ${s.tarjetaPieNavy}`}>
                        <span className={s.pieTextos}>
                            <b className={s.pieGrande}>${PRECIO_PLUS} <small>{t('pops_plus_app.per_month')}</small></b>
                            <small>{t('pops_plus_app.mxn_cancel')}</small>
                        </span>
                        {plus
                            ? <span className={`${s.loTienes} ${s.loTienesNavy}`}>{t('pops_plus_app.you_have_it')}</span>
                            : <button type='button' className={s.pasar} onClick={onPlus}>{t('pops_plus_app.go_plus_arrow')}</button>}
                    </div>
                </div>
            </div>
        </section>
    )
}

/**
 * Tabla en hoja para el celular (handoff "Pops+ en la App · Celular", D2):
 * hoja navy desde 90 px arriba, "Pops+" y "Lo que cambia…", tarjeta blanca con
 * una fila por dato (Gratis tachado + Pops+ en pastilla lima), "Quiero Pops+"
 * (solo Free) y "Explorar a detalle →". Se cierra con el velo, el asa o Esc.
 */
export const TablaHojaMovil = ({ open, onClose, onDetalle, onPlus, esFree = true, prueba = false }) => {
    const { t } = useTranslation()
    useEffect(() => {
        if (!open) return undefined
        const esc = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', esc)
        const antes = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', esc)
            document.body.style.overflow = antes
        }
    }, [open, onClose])
    if (!open) return null
    const texto = (v) => (v === true ? '✓' : v === false ? '—' : t(`pops_plus_app.val.${v}`))
    return createPortal(
        <div className={s.veloHoja} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div className={s.hojaLista} role='dialog' aria-modal='true' aria-labelledby='pops-plus-hoja'>
                <button type='button' className={s.hojaAsa} onClick={onClose} aria-label={t('pops_app.close')} />
                <div className={s.hojaCabeza}>
                    <MarcaPlus className={s.hojaMarca} />
                    <span id='pops-plus-hoja'>{t('pops_plus_app.what_changes')}</span>
                </div>
                <div className={s.hojaTarjeta}>
                    {TABLA.map(f => (
                        <div key={f.k} className={s.hojaFila} data-titulo={f.titulo || undefined} data-sub={f.sub || undefined}>
                            <span className={s.hojaNombre}>{t(`pops_plus_app.row.${f.k}`)}</span>
                            {!f.titulo && (
                                <span className={s.hojaValores}>
                                    <s>{texto(f.free)}</s>
                                    <b>{texto(f.plus)}</b>
                                </span>
                            )}
                        </div>
                    ))}
                </div>
                <div className={s.hojaPie}>
                    {esFree && <BotonQuieroPlus className={s.hojaCta} onClick={onPlus} />}
                    {!esFree && prueba && <BotonQuieroPlus className={s.hojaCta} onClick={onPlus}>{t('pops_plus_app.trial_stay')}</BotonQuieroPlus>}
                    <button type='button' className={s.hojaDetalle} onClick={onDetalle}>{t('pops_plus_app.explore')}</button>
                </div>
            </div>
        </div>,
        document.body,
    )
}
