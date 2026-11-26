import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Popover } from 'antd'
import globo from '../../../assets/pops-stickers/craft/globo.svg'
import s from './PruebaPlus.module.css'

/*
  Pops+ en el editor de un Pop Free (handoff "Pops+ en la App" 3). En Free
  todo se puede probar; lo que es Plus solo no se guarda (planPops.js). Estas
  piezas lo explican siempre igual: la frase de la gente → lo que resuelve.
  · ChipFreeEditor: "FREE" junto al nombre (en un Pop Pops+, la marca). Abre "Pruébalo en este Pop" (TarjetaPruebalo): la
    tarjeta del handoff, que en el canvas chocaría con Capas.
  · BarraPruebaPlus: barra navy de 2 renglones arriba de la pieza ("Se ve
    increíble, ¿no?…", chips de lo que usa, "Quitar y seguir gratis" ·
    "Guardarlo con Pops+").
  · NotasPlus: notas a mano en lima junto a la pieza, señalando lo Plus.
  · ModalCompartirPlus: al tocar Compartir con funciones Plus en uso.
  Los textos de cada función en uso salen de etiquetasPlus.js.
*/

// A qué altura de la pieza (%) va la nota de cada función.
const ALTURA_NOTA = {
    efectoPng: 12,
    portada: 24,
    imagenes: 40,
    imagenLink: 50,
    estiloBloque: 72,
    mensajeFijado: 84,
    formulario: 90,
}

// "Pruébalo en este Pop": frase → acción (plus = Pops+, o una herramienta del riel).
const PRUEBALO = [
    { k: 'eighty', accion: 'plus' },
    { k: 'pass', accion: 'wallet' },
    { k: 'brings', accion: 'registration' },
]

const Marca = ({ className = '' }) => <span className={`${s.marca} ${className}`}>Pops<span className={s.mas}>+</span></span>

// `plus`: el Pop ya es Pops+ (sin CTA de compra: "sin tope" dice "Ya lo tienes").
export const TarjetaPruebalo = ({ dia, onAccion, plus = false }) => {
    const { t } = useTranslation()
    return (
        <div className={s.tarjeta} data-text-bar>
            <span className={s.tarjetaCabeza}>
                <span className={s.tarjetaTag}>{t('pops_plus_app.editor.try_tag')}</span>
                <b>{dia ? t('pops_plus_app.editor.try_title_day', { dia }) : t('pops_plus_app.editor.try_title')}</b>
            </span>
            <div className={s.tarjetaLista}>
                {PRUEBALO.map((p) => (
                    <div key={p.k} className={s.tarjetaFila}>
                        <span className={s.tarjetaFrase}>“{t(`pops_plus_app.editor.try.${p.k}`)}”</span>
                        <span className={s.tarjetaFix}>
                            {t(`pops_plus_app.editor.try.${p.k}_fix`)}
                            {plus && p.accion === 'plus'
                                ? <span className={s.tarjetaYa}>{t('pops_plus_app.editor.try.have_it')}</span>
                                : (
                                    <button type="button" className={s.tarjetaAccion} onClick={() => onAccion?.(p.accion)}>
                                        {t(`pops_plus_app.editor.try.${p.k}_cta`)}
                                    </button>
                                )}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// `plus`: chip navy "Pops+" (sin FREE) que abre la misma tarjeta sin CTA de compra.
export const ChipFreeEditor = ({ dia, onAccion, plus = false }) => {
    const { t } = useTranslation()
    return (
        <Popover
            trigger="click"
            placement="bottomLeft"
            arrow={false}
            zIndex={1250}
            content={<TarjetaPruebalo dia={dia} onAccion={onAccion} plus={plus} />}
        >
            <button type="button" className={s.chipFree} data-plus={plus || undefined}>
                {/* Free: solo "FREE" (lo que usa de Pops+ ya lo dice la barra y la píldora). */}
                {plus ? <Marca /> : t('pops_plus_app.editor.free')}
            </button>
        </Popover>
    )
}

export const BarraPruebaPlus = ({ etiquetas, onQuitar, onPlus, yendo }) => {
    const { t } = useTranslation()
    return (
        <div className={s.barra} role="status">
            <Marca className={s.barraMarca} />
            <span className={s.barraTextos}>
                <b>{t('pops_plus_app.editor.bar_title')}</b>
                <span className={s.barraUsa}>
                    {t('pops_plus_app.editor.uses')}
                    {etiquetas.map((e) => <span key={e.clave} className={s.barraChip}>{e.corto}</span>)}
                </span>
            </span>
            {onQuitar && <button type="button" className={s.barraQuitar} onClick={onQuitar}>{t('pops_plus_app.editor.remove')}</button>}
            <button type="button" className={s.barraPlus} onClick={onPlus} disabled={yendo}>
                {t(yendo ? 'pops_plus_app.editor.going' : 'pops_plus_app.editor.save_plus')}
            </button>
        </div>
    )
}

// Notas a mano a la derecha de la pieza (dentro del lienzo: escalan con el zoom).
export const NotasPlus = ({ etiquetas }) => {
    const { t } = useTranslation()
    return (
        <div className={s.notas} aria-hidden>
            {etiquetas.slice(0, 3).map((e, i) => (
                <span key={e.clave} className={s.nota} style={{ top: `${ALTURA_NOTA[e.clave] ?? 30 + i * 20}%`, '--rot': `${i % 2 ? 2 : -3}deg` }}>
                    <svg width="60" height="30" viewBox="0 0 60 30" fill="none" stroke="#0B1F3A" strokeWidth="2.2" strokeLinecap="round">
                        <path d={i % 2 ? 'M58 12 C 40 24, 22 24, 4 16 M12 8 L4 16 L12 23' : 'M58 18 C 40 6, 22 6, 4 14 M12 6 L4 14 L13 20'} />
                    </svg>
                    <span className={s.notaTexto}>{e.corto.toLowerCase()} {t('pops_plus_app.editor.note_suffix')}</span>
                </span>
            ))}
        </div>
    )
}

export const ModalCompartirPlus = ({ open, etiquetas, onClose, onQuitar, onPlus, yendo }) => {
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
            <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="pops-plus-compartir">
                <div className={s.modalCabeza}>
                    <span id="pops-plus-compartir" className={`${s.recorte} ${s.recortePapel}`}>{t('pops_plus_app.editor.share_title_1')}</span>
                    <span className={`${s.recorte} ${s.recorteLima}`}>{t('pops_plus_app.editor.share_title_2')}</span>
                    <img src={globo} alt="" aria-hidden className={s.modalGlobo} />
                </div>
                <div className={s.modalCuerpo}>
                    <p className={s.modalTexto}>{t('pops_plus_app.editor.share_text', { count: etiquetas.length })}</p>
                    <div className={s.modalLista}>
                        {etiquetas.map((e) => (
                            <span key={e.clave} className={s.modalItem}>
                                {e.miniatura
                                    ? <img src={e.miniatura} alt="" className={s.modalMini} />
                                    : <span className={s.modalMini} style={{ background: e.color || '#0B1F3A' }}><span /></span>}
                                {e.largo}
                            </span>
                        ))}
                    </div>
                    <span className={s.modalDePaso}>{t('pops_plus_app.editor.share_also')}</span>
                    <div className={s.modalAcciones}>
                        {onQuitar ? <button type="button" className={s.modalQuitar} onClick={onQuitar}>{t('pops_plus_app.editor.share_remove')}</button> : <span />}
                        <button type="button" className={s.modalPlus} onClick={onPlus} disabled={yendo}>
                            {t(yendo ? 'pops_plus_app.editor.going' : 'pops_plus_app.go_plus')}
                            <span className={s.modalFlecha}>→</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    )
}
