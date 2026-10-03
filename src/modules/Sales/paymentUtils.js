export const buildBankMessage = (transferencia) =>
    `¡Hola!\n\nEstos son mis datos para transferir:\n\nBeneficiario: ${transferencia.titular}\nCLABE: ${transferencia.clabe}\nEntidad financiera: ${transferencia.banco}`

// Links de pago a meses de un plan: filas de configuracion_pagos con
// plan = '{plan}_msi_{meses}' (p. ej. 'PRO_msi_6'). Cada link deja pagar hasta
// esos meses (los rangos de monto de Stripe no dejan elegir más). Ordenados de
// menos a más meses: [{ months, url }].
export const installmentLinks = (stripeLinks, plan) =>
    Object.entries(stripeLinks ?? {})
        .map(([key, url]) => {
            const match = key.match(new RegExp(`^${plan}_msi_(\\d+)$`))
            return match && url ? { months: Number(match[1]), url } : null
        })
        .filter(Boolean)
        .sort((a, b) => a.months - b.months)
