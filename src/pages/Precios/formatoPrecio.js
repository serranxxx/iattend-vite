import { useTranslation } from 'react-i18next'
import { message } from 'antd'

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
const MXN_CENTAVOS = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 })

// "$450" si es entero, "$449.80" si no.
const conCentavos = (n) => (Number.isInteger(n) ? MXN : MXN_CENTAVOS).format(n)

// Textos de precio de un producto del catálogo: precio, forma de pago
// ("Pago de contado" / "Hasta 12 meses sin intereses" / "Contado o hasta 12…"),
// mensualidad más baja ("desde $375 al mes", redondeada hacia arriba para no
// anunciar menos de lo que se cobra) y precio por Pop.
export const useFormatoPrecio = (producto) => {
    const { t } = useTranslation()
    const { monto, meses, mismoPrecio, pops } = producto
    return {
        precio: MXN.format(monto),
        plazo: !meses
            ? t('precios.cash')
            : t(mismoPrecio ? 'precios.cash_or_installments' : 'precios.installments', { months: meses }),
        mensualidad: meses ? t('precios.monthly', { amount: MXN.format(Math.ceil(monto / meses)) }) : null,
        porPop: pops > 1 ? t('precios.per_pop', { amount: conCentavos(Math.round((monto / pops) * 100) / 100) }) : null,
    }
}

// Respaldo para navegadores sin permiso de portapapeles (o sin https).
const copiarConTextarea = (texto) => {
    const area = document.createElement('textarea')
    area.value = texto
    area.setAttribute('readonly', '')
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
}

export const copiarLink = async (link, t) => {
    let ok = false
    try {
        await navigator.clipboard.writeText(link)
        ok = true
    } catch {
        ok = copiarConTextarea(link)
    }
    if (ok) message.success(t('precios.copied'))
    else message.error(t('precios.copy_error'))
}
