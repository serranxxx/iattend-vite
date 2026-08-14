// Lista única de códigos de país (ladas) para todos los inputs de teléfono de la app.
// Para agregar una lada nueva, solo añade un objeto aquí — country, iso, flag, code.
export const PHONE_CODES = [
    { country: 'México', iso: 'MX', flag: '🇲🇽', code: '+52' },
    { country: 'Estados Unidos', iso: 'US', flag: '🇺🇸', code: '+1' },
    { country: 'España', iso: 'ES', flag: '🇪🇸', code: '+34' },
    { country: 'Colombia', iso: 'CO', flag: '🇨🇴', code: '+57' },
    { country: 'Perú', iso: 'PE', flag: '🇵🇪', code: '+51' },
    { country: 'Chile', iso: 'CL', flag: '🇨🇱', code: '+56' },
    { country: 'Argentina', iso: 'AR', flag: '🇦🇷', code: '+54' },
    { country: 'El Salvador', iso: 'SV', flag: '🇸🇻', code: '+503' },
    { country: 'Guatemala', iso: 'GT', flag: '🇬🇹', code: '+502' },
    { country: 'Honduras', iso: 'HN', flag: '🇭🇳', code: '+504' },
    { country: 'Reino Unido', iso: 'GB', flag: '🇬🇧', code: '+44' },
    { country: 'Francia', iso: 'FR', flag: '🇫🇷', code: '+33' },
]

// Shape { value, label } listo para el prop `options` de un Select de Ant Design.
export const PHONE_CODE_OPTIONS = PHONE_CODES.map(({ code, flag }) => ({
    value: code,
    label: `${flag} ${code}`,
}))

export const splitPhoneNumber = (fullNumber = '') => {
    const cleanNumber = String(fullNumber).replace(/\s+/g, '')
    const number = cleanNumber.slice(-10)
    const code = cleanNumber.replace(number, '')
    return { code, number }
}

export const buildPhoneNumberSafe = (code, number) => {
    const cleanCode = (code ?? '').replace(/[^\d+]/g, '')
    const cleanNumber = (number ?? '').replace(/\D/g, '')
    if (!cleanCode || !cleanNumber) return ''
    return `${cleanCode}${cleanNumber}`
}

// Dado el código de lada pegado al número tal cual (ej. al importar de Excel),
// busca la entrada correspondiente en PHONE_CODES.
export const findPhoneCodeByDigits = (ladaDigits) =>
    PHONE_CODES.find((pc) => pc.code.replace('+', '') === ladaDigits) ?? null
