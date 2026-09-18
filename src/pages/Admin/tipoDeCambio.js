/*
  Tipo de cambio USD → MXN para los costos del panel.

  Meta factura los mensajes de WhatsApp en dólares, pero la contabilidad de
  I attend vive en pesos, así que el panel muestra los dos. La conversión es
  informativa: el cargo real depende del tipo de cambio que aplique Meta el día
  que corta, no de este.

  La fuente es exchangerate-api en su plan abierto (sin llave, un refresco
  diario). Si no responde se usa el respaldo de abajo y la UI lo dice en vez de
  fingir que el número es del día.
*/

import { useEffect, useState } from 'react'

const FUENTE = 'https://open.er-api.com/v6/latest/USD'

// Respaldo: última cotización conocida al escribir esto (15 de septiembre de
// 2026). Solo se usa si la API falla; actualízalo si el respaldo se vuelve la
// norma porque la fuente dejó de servir.
const RESPALDO = { valor: 17.12, fecha: '2026-09-15', esRespaldo: true }

export const useTipoDeCambio = () => {
    const [cambio, setCambio] = useState(null)

    useEffect(() => {
        let cancelado = false

        fetch(FUENTE)
            .then(respuesta => {
                if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
                return respuesta.json()
            })
            .then(datos => {
                const valor = Number(datos?.rates?.MXN)
                if (!Number.isFinite(valor) || valor <= 0) throw new Error('sin cotización de MXN')

                if (!cancelado) {
                    setCambio({
                        valor,
                        fecha: datos.time_last_update_utc ?? null,
                        esRespaldo: false,
                    })
                }
            })
            .catch(error => {
                console.warn('No se pudo obtener el tipo de cambio, se usa el respaldo:', error.message)
                if (!cancelado) setCambio(RESPALDO)
            })

        return () => { cancelado = true }
    }, [])

    // Mientras carga se devuelve el respaldo para no dejar los montos en blanco:
    // el orden de magnitud no cambia y el número se corrige solo al resolver.
    return cambio ?? RESPALDO
}
