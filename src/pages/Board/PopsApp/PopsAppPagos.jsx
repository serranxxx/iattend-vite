import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { supabaseAuthHeaders } from '../../../lib/authHeaders'
import { PRECIO_PLUS } from './usePlanPops'
import s from './PopsAppPagos.module.css'

/*
  Método de pago y facturas (handoff "App de Pops" 2e). Todo sale de Stripe
  por GET /api/pops/suscripcion/pagos (iattend--backend/router/popsSuscripcion.js):
  plan, próximo cobro, tarjeta e historial. Cambiar tarjeta y cancelar abren el
  portal de Stripe (`onPortal`). El espacio es dato de la app (usePlanPops).
  Sin CFDI / RFC. "Comprar más espacio" espera los paquetes (§0.3).
*/

const MARCAS = { visa: 'VISA', mastercard: 'MC', amex: 'AMEX', discover: 'DISC', jcb: 'JCB', unionpay: 'UP', diners: 'DC' }
const COLOR_MARCA = { visa: '#1A1F71', mastercard: '#EB001B', amex: '#2E77BC' }
const ESTADO = {
    paid: ['pops_app.pay_status_paid', '#E7F7D1', '#2E6B12'],
    open: ['pops_app.pay_status_open', '#FFF4CC', '#7A5A00'],
    uncollectible: ['pops_app.pay_status_failed', '#FCE4EC', '#B3264F'],
    void: ['pops_app.pay_status_void', '#F1F2F6', '#56627A'],
}

export const PopsAppPagos = ({ plan, yendo, onVolver, onPortal, onPlus }) => {
    const { t, i18n } = useTranslation()
    const [datos, setDatos] = useState(null)
    const [estado, setEstado] = useState('cargando') // cargando · listo · sin · error
    const en = i18n.language?.startsWith('en')
    const fecha = (iso, opciones = { day: 'numeric', month: 'short', year: 'numeric' }) => (iso
        ? new Date(iso).toLocaleDateString(en ? 'en-US' : 'es-MX', opciones).replace('.', '')
        : '—')
    const dinero = (n, moneda = 'MXN') => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda}`

    useEffect(() => {
        let vivo = true
        ;(async () => {
            try {
                const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/pops/suscripcion/pagos`, { headers: await supabaseAuthHeaders() })
                if (!vivo) return
                setDatos(data)
                setEstado('listo')
            } catch (err) {
                if (vivo) setEstado(err?.response?.data?.code === 'SIN_SUSCRIPCION' ? 'sin' : 'error')
            }
        })()
        return () => { vivo = false }
    }, [])

    const sub = datos?.suscripcion
    const activa = sub && ['active', 'trialing', 'past_due'].includes(sub.status)
    const pctMb = plan.mbTope ? Math.min(100, (plan.mbUsados / plan.mbTope) * 100) : 0
    const tarjeta = datos?.tarjeta

    const cabeza = (
        <div className={s.cabeza}>
            <div className={s.titulo}>
                <button type='button' className={s.volver} onClick={onVolver}><ArrowLeft size={15} />{t('pops_app.back')}</button>
                <h1>{t('pops_app.pay_title')}</h1>
            </div>
            {estado === 'listo' && (
                <button type='button' className={s.stripe} onClick={onPortal} disabled={yendo}>
                    {t('pops_app.pay_manage')}<ArrowUpRight size={16} />
                </button>
            )}
        </div>
    )

    if (estado === 'cargando') {
        return (
            <div className={s.pagina} aria-busy='true'>
                {cabeza}
                <div className={s.fila}>
                    <div className={`${s.esqueleto} ${s.alto}`} />
                    <div className={`${s.esqueleto} ${s.alto}`} />
                </div>
                <div className={s.esqueleto} style={{ height: 220 }} />
            </div>
        )
    }

    if (estado !== 'listo') {
        return (
            <div className={s.pagina}>
                {cabeza}
                <div className={s.vacio}>
                    <b>{t(estado === 'sin' ? 'pops_app.pay_empty_title' : 'pops_app.pay_error')}</b>
                    {estado === 'sin' && <span>{t('pops_app.pay_empty_text')}</span>}
                    {estado === 'sin' && !plan.plus && (
                        <button type='button' className={s.lima} onClick={onPlus} disabled={yendo}>{t('pops_app.go_plus', { price: PRECIO_PLUS })}</button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className={s.pagina}>
            {cabeza}

            <div className={s.fila}>
                <div className={s.plan}>
                    <div className={s.planCabeza}>
                        <span className={s.logo}>Pops<span>+</span></span>
                        <span className={s.badge} data-inactiva={!activa || undefined}>
                            {t(!activa ? 'pops_app.pay_inactive' : sub.cancelaAlFinal ? 'pops_app.pay_canceling' : sub.status === 'past_due' ? 'pops_app.pay_past_due' : 'pops_app.active')}
                        </span>
                    </div>
                    <div className={s.planDatos}>
                        <span><small>{t('pops_app.pay_price')}</small><b>{sub ? `$${sub.monto} ${sub.moneda} / ${t(sub.intervalo === 'year' ? 'pops_app.pay_year' : 'pops_app.pay_month')}` : '—'}</b></span>
                        <span><small>{t(sub?.cancelaAlFinal || !activa ? 'pops_app.ends_on' : 'pops_app.pay_next')}</small><b>{fecha(sub?.proximoCobro)}</b></span>
                    </div>
                </div>

                <div className={s.tarjetaCaja}>
                    <b className={s.subtitulo}>{t('pops_app.pay_method')}</b>
                    {tarjeta ? (
                        <div className={s.tarjeta}>
                            <span className={s.marca} style={{ background: COLOR_MARCA[tarjeta.marca] ?? '#0B1F3A' }}>{MARCAS[tarjeta.marca] ?? tarjeta.marca?.toUpperCase()}</span>
                            <span className={s.tarjetaDatos}>
                                <b>•••• {tarjeta.last4}</b>
                                <small>{t('pops_app.pay_expires', { fecha: `${String(tarjeta.mes).padStart(2, '0')}/${String(tarjeta.anio).slice(-2)}` })}</small>
                            </span>
                        </div>
                    ) : (
                        <div className={s.tarjeta}><small>{t('pops_app.pay_no_card')}</small></div>
                    )}
                    <small className={s.nota}>{t('pops_app.pay_change_card')}</small>
                </div>
            </div>

            <div className={s.espacio}>
                <div className={s.espacioDatos}>
                    <div><b>{t('pops_app.space')}</b><span><b>{t('pops_app.mb_of', { used: plan.mbUsados, total: plan.mbTope })}</b></span></div>
                    <div className={s.pista}><span style={{ width: `${Math.max(2, pctMb)}%` }} /></div>
                </div>
                <div className={s.espacioAccion}>
                    <button type='button' className={s.contorno} disabled>{t('pops_app.pay_buy_space')}</button>
                    <small>{t('pops_app.soon')}</small>
                </div>
            </div>

            <div className={s.historial}>
                <b className={s.subtitulo}>{t('pops_app.pay_history')}</b>
                <div className={s.tabla} role='table'>
                    <div className={s.encabezado} role='row'>
                        <span role='columnheader'>{t('pops_app.pay_col_number')}</span>
                        <span role='columnheader'>{t('pops_app.pay_col_date')}</span>
                        <span role='columnheader'>{t('pops_app.pay_col_amount')}</span>
                        <span role='columnheader'>{t('pops_app.pay_col_status')}</span>
                        <span role='columnheader' />
                    </div>
                    {datos.facturas.length === 0 && <div className={s.sinFacturas}>{t('pops_app.pay_no_invoices')}</div>}
                    {datos.facturas.map(f => {
                        const [clave, bg, fg] = ESTADO[f.estado] ?? ESTADO.void
                        return (
                            <div key={f.id} className={s.renglon} role='row'>
                                <span className={s.numero}>{f.numero ?? '—'}</span>
                                <span className={s.gris}>{fecha(f.fecha)}</span>
                                <b>{dinero(f.monto, f.moneda)}</b>
                                <span><span className={s.estado} style={{ background: bg, color: fg }}>{t(clave)}</span></span>
                                <span className={s.acciones}>
                                    {f.ver && <a href={f.ver} target='_blank' rel='noreferrer'>{t('pops_app.pay_view')}</a>}
                                    {f.pdf && <a href={f.pdf} target='_blank' rel='noreferrer'>PDF</a>}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {activa && !sub.cancelaAlFinal && (
                <div className={s.cancelar}>
                    <span>
                        <b>{t('pops_app.pay_cancel')}</b>
                        <small>{t('pops_app.pay_cancel_text', { fecha: fecha(sub.proximoCobro, { day: 'numeric', month: 'long' }) })}</small>
                    </span>
                    <button type='button' onClick={onPortal} disabled={yendo}>{t('pops_app.pay_cancel')}<ArrowUpRight size={15} /></button>
                </div>
            )}
        </div>
    )
}

export default PopsAppPagos
