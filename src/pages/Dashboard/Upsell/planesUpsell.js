import { PRICE_IDS } from '../../../components/Payment/functions'

// Upsell de los dashboards Lite y Paperless (handoff "Upsell en dashboards
// Lite y Paperless"). Qué incluye cada plan para el comparador y cuánto cuesta
// pasar de uno a otro.

export const ORDEN_PLANES = ['paperless', 'lite', 'pro']

// Filas del comparador, en este orden. `planes` = los que la incluyen.
// Los textos van en `upsell.features.<key>` (nombre y descripción).
export const FUNCIONES = [
    { key: 'inv', planes: ['paperless', 'lite', 'pro'] },
    { key: 'std', planes: ['paperless', 'lite', 'pro'] },
    { key: 'guests', planes: ['lite', 'pro'] },
    { key: 'tables', planes: ['lite', 'pro'] },
    { key: 'wa', planes: ['pro'] },
    { key: 'side', planes: ['pro'] },
    { key: 'photo', planes: ['pro'] },
    { key: 'pass', planes: ['pro'] },
    { key: 'lia', planes: ['pro'] },
]

// Lo que se pagó por el plan actual ("$849 · pagado"). El catálogo
// (usePlans → plans.price.amount, precio vigente de Stripe) manda; esto es
// el respaldo mientras carga o si falla.
export const PRECIO_PLAN = { paperless: 849, lite: 2899, pro: 3999 }

// Productos de upgrade de Stripe: el monto es el del price (lo que de verdad
// se cobra), no la resta de los precios del catálogo. Los de Paperless se
// crearon para este handoff (metadata upgrade_from / upgrade_to); el webhook
// los resuelve como `{ type: 'plan', value: <destino> }` y `activatePlan`
// sube el plan conservando todo lo que ya tiene la invitación.
export const UPGRADES = {
    'lite>pro': { priceId: PRICE_IDS.UPGRADE_TO_PRO, monto: 1100 },
    'paperless>lite': { priceId: PRICE_IDS.UPGRADE_PAPERLESS_TO_LITE, monto: 2050 },
    'paperless>pro': { priceId: PRICE_IDS.UPGRADE_PAPERLESS_TO_PRO, monto: 3150 },
}

export const upgradeDe = (actual, destino) => UPGRADES[`${actual}>${destino}`] ?? null

export const planesDesde = (actual) => ORDEN_PLANES.slice(Math.max(0, ORDEN_PLANES.indexOf(actual)))

// Plan mínimo que trae la función, empezando por el siguiente al actual.
export const planParaFuncion = (actual, funcion) => {
    const f = FUNCIONES.find((x) => x.key === funcion)
    if (!f) return null
    return planesDesde(actual).find((p) => p !== actual && f.planes.includes(p)) ?? null
}

const fmt = new Intl.NumberFormat('en-US')
export const pesos = (n) => `$${fmt.format(n)}`
