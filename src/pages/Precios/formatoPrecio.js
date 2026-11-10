import { useTranslation } from 'react-i18next'
import { message } from 'antd'

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
const MXN_CENTAVOS = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

// Precio, plazo ("Pago de contado" / "3 meses sin intereses") y mensualidad
// de un producto del catálogo.
export const useFormatoPrecio = (producto) => {
    const { t } = useTranslation()
    const { monto, meses } = producto
    return {
        precio: MXN.format(monto),
        plazo: meses ? t('precios.installments', { months: meses }) : t('precios.cash'),
        mensualidad: meses ? t('precios.monthly', { amount: MXN_CENTAVOS.format(monto / meses) }) : null,
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
