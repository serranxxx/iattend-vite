import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Modal, Tooltip } from 'antd'
import { Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePlans } from '../../../hooks/usePlans'
import { FUNCIONES, PRECIO_PLAN, pesos, planesDesde, planParaFuncion, upgradeDe } from './planesUpsell'
import s from './Upsell.module.css'

/*
  Comparador de planes del upsell (handoff "Upsell en dashboards Lite y
  Paperless"). Columnas = el plan actual y los que siguen; si se abrió desde
  una función (`abierto.funcion`) su fila va resaltada y el encabezado dice
  "Disponible con …". "Mejorar a X" manda al checkout de Stripe del producto de
  upgrade (pagas solo la diferencia, `mejora` = useMejorarPlan) y, al volver,
  DashboardPage sondea hasta que el webhook sube el plan.

  abierto: null | { funcion?, destino? }
  movil: hoja inferior (handoff "Upsell mobile"): sin descripciones, columnas
  angostas y un CTA apilado por plan superior.
*/
export const ComparadorPlanes = ({ plan, abierto, onCerrar, movil = false, mejora }) => {
    const { t } = useTranslation()
    const { getPlan } = usePlans()

    const cols = planesDesde(plan)
    const funcion = abierto?.funcion ?? null
    const objetivo = abierto?.destino ?? (funcion ? planParaFuncion(plan, funcion) : null)
    const nombre = (p) => t(`upsell.plan_${p}`)
    const pagado = getPlan(plan)?.price?.amount ?? PRECIO_PLAN[plan]

    const eyebrow = funcion && objetivo
        ? t('upsell.cmp_available_with', { plan: nombre(objetivo).toUpperCase() })
        : t('upsell.cmp_current_plan', { plan: nombre(plan).toUpperCase() })
    const titulo = funcion
        ? t(`upsell.features.${funcion}.name`)
        : objetivo ? t('upsell.cmp_title_upgrade', { plan: nombre(objetivo) }) : t('upsell.cmp_title_compare')
    const subtitulo = funcion ? t(`upsell.features.${funcion}.desc`) : t('upsell.cmp_sub')

    const yendo = mejora.yendo
    const mejorar = (destino) => mejora.ir(destino)

    if (movil) {
        return (
            <HojaComparador abierta={!!abierto} onCerrar={onCerrar}>
                <div className={s.hojaCuerpo} style={{ '--cmp-col': cols.length > 2 ? '64px' : '72px' }}>
                    <div className={s.cmpTextos}>
                        <span className={s.cmpEyebrow}>{eyebrow}</span>
                        <h3 className={`${s.cmpTitulo} ${s.cmpTituloMovil}`}>{titulo}</h3>
                        <p className={`${s.cmpSub} ${s.cmpSubMovil}`}>{subtitulo}</p>
                    </div>
                    <div className={s.cmpTabla} role='table'>
                        <div className={`${s.cmpFilaHead} ${s.cmpFilaMovil}`} role='row'>
                            <span className={s.cmpCeldaNombre} />
                            {cols.map((c) => (
                                <span key={c} className={s.cmpCol} role='columnheader'>
                                    <b className={`${s.cmpColNombre} ${s.cmpColNombreMovil}`}>{nombre(c)}</b>
                                </span>
                            ))}
                        </div>
                        {FUNCIONES.map((f) => (
                            <div key={f.key} className={`${s.cmpFila} ${s.cmpFilaMovil} ${f.key === funcion ? s.cmpFilaResaltada : ''}`} role='row'>
                                <span className={`${s.cmpCeldaNombre} ${s.cmpNombreMovil}`}>{t(`upsell.features.${f.key}.name`)}</span>
                                {cols.map((c) => (
                                    <span key={c} className={s.cmpCol} role='cell'>
                                        {f.planes.includes(c)
                                            ? <span className={`${s.cmpSi} ${s.cmpSiMovil}`} aria-label={t('upsell.included')}><Check size={12} strokeWidth={3} /></span>
                                            : <span className={s.cmpNo} aria-label={t('upsell.not_included')} />}
                                    </span>
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className={s.hojaCtas}>
                        {cols.filter((c) => c !== plan).map((c) => {
                            const up = upgradeDe(plan, c)
                            return (
                                <button
                                    key={c}
                                    type='button'
                                    className={s.ctaMovilNavy}
                                    aria-disabled={!up?.priceId || undefined}
                                    onClick={() => mejorar(c)}
                                >
                                    {yendo === c ? t('upsell.cmp_going') : t('upsell.upgrade_to', { plan: nombre(c) })}
                                    {yendo !== c && up && <span className={s.pasoPrecio}>+{pesos(up.monto)} MXN</span>}
                                    {!up?.priceId && <small className={s.ctaPronto}>{t('upsell.cmp_soon')}</small>}
                                </button>
                            )
                        })}
                    </div>
                    <p className={s.hojaNota}>{t('upsell.cmp_footer')}</p>
                </div>
            </HojaComparador>
        )
    }

    return (
        <Modal
            open={!!abierto}
            onCancel={onCerrar}
            footer={null}
            closable={false}
            width={cols.length > 2 ? 920 : 820}
            style={{ top: 96, maxWidth: 'calc(100vw - 32px)' }}
            // antd v6: la caja es `container`, no `content`.
            styles={{
                container: { padding: 0, borderRadius: 28, boxShadow: '0 30px 80px rgba(29,50,70,.3)' },
                mask: { background: 'rgba(29,50,70,.45)', backdropFilter: 'blur(4px)' },
            }}
            destroyOnHidden
        >
            <div className={s.cmp} style={{ '--cmp-col': cols.length > 2 ? '160px' : '170px' }}>
                <div className={s.cmpHead}>
                    <div className={s.cmpTextos}>
                        <span className={s.cmpEyebrow}>{eyebrow}</span>
                        <h3 className={s.cmpTitulo}>{titulo}</h3>
                        <p className={s.cmpSub}>{subtitulo}</p>
                    </div>
                    <button type='button' className={s.cmpCerrar} onClick={onCerrar} aria-label={t('upsell.close')}>
                        <X size={20} />
                    </button>
                </div>

                <div className={s.cmpTabla} role='table'>
                    <div className={s.cmpFilaHead} role='row'>
                        <span className={s.cmpCeldaNombre} />
                        {cols.map((c) => (
                            <span key={c} className={s.cmpCol} role='columnheader'>
                                <b className={s.cmpColNombre}>{nombre(c)}</b>
                                <small className={s.cmpColPrecio}>
                                    {c === plan
                                        ? t('upsell.cmp_paid', { precio: pesos(pagado) })
                                        : `+${pesos(upgradeDe(plan, c)?.monto ?? 0)} MXN`}
                                </small>
                            </span>
                        ))}
                    </div>
                    {FUNCIONES.map((f) => (
                        <div key={f.key} className={`${s.cmpFila} ${f.key === funcion ? s.cmpFilaResaltada : ''}`} role='row'>
                            <span className={s.cmpCeldaNombre}>
                                <b>{t(`upsell.features.${f.key}.name`)}</b>
                                <small>{t(`upsell.features.${f.key}.desc`)}</small>
                            </span>
                            {cols.map((c) => (
                                <span key={c} className={s.cmpCol} role='cell'>
                                    {f.planes.includes(c)
                                        ? <span className={s.cmpSi} aria-label={t('upsell.included')}><Check size={14} strokeWidth={3} /></span>
                                        : <span className={s.cmpNo} aria-label={t('upsell.not_included')} />}
                                </span>
                            ))}
                        </div>
                    ))}
                </div>

                <div className={s.cmpPie}>
                    <span className={s.cmpPieTexto}>{t('upsell.cmp_footer')}</span>
                    {cols.map((c) => {
                        if (c === plan) return <span key={c} className={`${s.cmpCol} ${s.cmpActual}`}>{t('upsell.cmp_your_plan')}</span>
                        const listo = !!upgradeDe(plan, c)?.priceId
                        const boton = (
                            <button
                                type='button'
                                className={`${s.cmpMejorar} ${c === objetivo ? s.cmpMejorarObjetivo : ''}`}
                                aria-disabled={!listo || undefined}
                                onClick={() => mejorar(c)}
                            >
                                {yendo === c ? t('upsell.cmp_going') : t('upsell.upgrade_to', { plan: nombre(c) })}
                            </button>
                        )
                        return (
                            <span key={c} className={s.cmpCol}>
                                {listo ? boton : <Tooltip title={t('upsell.cmp_soon')}>{boton}</Tooltip>}
                            </span>
                        )
                    })}
                </div>
            </div>
        </Modal>
    )
}

export default ComparadorPlanes

/*
  Hoja inferior del comparador en el celular: sube 280 ms, se cierra tocando
  el velo, con Esc o arrastrándola hacia abajo desde el asa (más de 90 px).
*/
const HojaComparador = ({ abierta, onCerrar, children }) => {
    const [montada, setMontada] = useState(abierta)
    const [saliendo, setSaliendo] = useState(false)
    const [arrastre, setArrastre] = useState(0)
    const inicio = useRef(null)

    useEffect(() => {
        if (abierta) { setMontada(true); setSaliendo(false); setArrastre(0); return }
        if (!montada) return
        setSaliendo(true)
        const id = setTimeout(() => { setMontada(false); setSaliendo(false) }, 240)
        return () => clearTimeout(id)
    }, [abierta])

    useEffect(() => {
        if (!abierta) return
        const alTeclear = (e) => { if (e.key === 'Escape') onCerrar() }
        window.addEventListener('keydown', alTeclear)
        return () => window.removeEventListener('keydown', alTeclear)
    }, [abierta, onCerrar])

    if (!montada) return null

    const bajar = {
        onPointerDown: (e) => { inicio.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId) },
        onPointerMove: (e) => { if (inicio.current != null) setArrastre(Math.max(0, e.clientY - inicio.current)) },
        onPointerUp: () => {
            const lejos = arrastre > 90
            inicio.current = null
            setArrastre(0)
            if (lejos) onCerrar()
        },
        onPointerCancel: () => { inicio.current = null; setArrastre(0) },
    }

    return createPortal(
        <div className={`${s.hojaCapa} ${saliendo ? s.hojaSaliendo : ''}`}>
            <div className={s.hojaVelo} onClick={onCerrar} />
            <div
                className={s.hoja}
                role='dialog'
                aria-modal='true'
                style={arrastre ? { transform: `translateY(${arrastre}px)`, transition: 'none' } : undefined}
            >
                <div className={s.hojaAsa} {...bajar}><span /></div>
                {children}
            </div>
        </div>,
        document.body,
    )
}
