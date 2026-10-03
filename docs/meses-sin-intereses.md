# Meses sin intereses (MSI) — estado real

Implementado el 3 oct 2026. Toca iattend-vite, iattend--backend e iattend-next.

## Precios (Stripe, MXN, `one_time`)

| Plan | Plazo | Precio | Mensualidad | Lookup key |
|---|---|---|---|---|
| Lite | Contado | $2,899 | — | (price del catálogo `plans.stripe_price_id`) |
| PRO | Contado | $3,999 | — | (price del catálogo `plans.stripe_price_id`) |
| PRO | 3 meses | $4,269 | $1,423 | `pro_msi_3` |
| PRO | 6 meses | $4,399 | $733.17 | `pro_msi_6` |
| PRO | 12 meses | $4,719 | $393.25 | `pro_msi_12` |

Los precios MSI cuestan más para cubrir la comisión extra de Stripe por MSI (+5% a 3, +7.5% a 6, +12.5% a 12, más IVA). **Lite solo se vende de contado**: `lite_msi_3` ($3,099) y `lite_msi_6` ($3,199) están archivados en Stripe y no se usan. Hay precios viejos activos (Lite $2,499, PRO $3,499): no usarlos ni borrarlos.

## Fuente única

- **Qué plazos tiene cada plan:** `MSI_TERMS` en `iattend--backend/config/stripe.installments.js` (solo `pro: [3, 6, 12]`). El lookup key se arma como `{plan}_msi_{meses}`.
- **Montos:** salen de Stripe por `lookup_key` (caché de 5 min), igual que el contado sale de `plans.stripe_price_id`. Ningún front ni el backend tiene montos escritos.
- `GET /api/plans` agrega a cada plan `installments: [{ months, amount, monthly, currency, lookup_key }]` (`[]` si no tiene MSI o el price no está activo).

Para agregar o quitar un plazo: crear o archivar el price en Stripe con su lookup key y ajustar `MSI_TERMS`.

## Fronts

En la UI **no se dice "sin intereses" ni "MSI"**: el precio a meses es más caro que el de contado. Se habla de "pagos" ("12 pagos de $394").


- **iattend-vite `/checkout`** (`CheckoutPage.jsx`): tarjeta `components/Payment/PlanPricing/`, con plan, control segmentado "Elige cómo pagar", precio grande (la mensualidad en MSI, el total en contado), "N pagos con tarjeta · +$X vs. contado", total y botón "Pagar 12 × $394".
- **Drawer de `/preview`** (`PublishModal.jsx`): selector simple (`components/Payment/InstallmentPicker/`) sobre el precio. Al elegir plazo cambia el total y el texto "6 pagos de $734". Si el plan nuevo no tiene el plazo elegido (Lite no tiene meses), cae en contado y el selector no se pinta. Helpers en `hooks/usePlans.js`: `planTerms`, `formatMXN`, `termCaption`.
- **iattend-next `/about/pricing`**: debajo del precio, la leyenda del plazo más largo, solo con la mensualidad ("o hasta 12 pagos de $394", sin centavos y redondeado hacia arriba); el total se ve en el checkout. Sin selector.
- No llevan MSI: el alta dentro de la app (`NewInvitationDrawer`), el upgrade (`PlansModal`), créditos, side events y regalos.

## Cobro

Se sigue usando **Checkout Session hospedado**. El front manda `lookupKey` (nunca el price de MSI). El backend lo resuelve en Stripe, usa ese price y prende `payment_method_options.card.installments.enabled`. Endpoints: `create-checkout-preview`, `create-checkout-plan` y `create-checkout-invitation`. Un price de MSI mandado como `priceId` se rechaza.

Contado (y créditos, side events, regalos) manda `installments.enabled: false` **explícito**. Si no, al prender MSI en el Dashboard de Stripe, Checkout lo ofrecería en todo.

### Plazo: rangos de monto en Stripe

En Checkout Session, `installments` **solo acepta `enabled`**: no se puede fijar el plazo. Lo acotan los montos mínimos por plazo del Dashboard de Stripe (**Settings → Payment methods → Meses sin intereses**), que aplican a todas las integraciones (Checkout y Payment Links):

| Plazo | Desde |
|---|---|
| 3 meses | $4,269 |
| 6 meses | $4,399 |
| 12 meses | $4,700 |

Resultado: Lite y PRO de contado no muestran meses; con `pro_msi_3` solo se puede elegir 3; con `pro_msi_6`, 3 o 6; con `pro_msi_12`, 3, 6 o 12. **Nadie puede elegir más meses de los que pagó.** Si se agregan productos o cambian precios, hay que revisar que sigan cuadrando con estos rangos.

Forzar el plazo exacto requeriría PaymentIntent confirmado en el servidor (`installments.plan = { type: 'fixed_count', count, interval: 'month' }`) con formulario de tarjeta propio. Con los rangos no hace falta.

## Webhook

`checkout.session.completed` → `processingPayment` (`controllers/supabase.js`):

1. Un price de MSI se mapea a su plan con `installmentByPriceId` (no está en `PRODUCTS` ni en el catálogo).
2. `revisarPlazoMSI` (`controllers/msiPlazo.js`) lee `payment_intent.latest_charge.payment_method_details.card.installments.plan.count` (0 = contado) y lo compara con `metadata.msiMonths` de la sesión.
3. Menos meses que los pagados (p. ej. precio de 12, eligió 3) no le cuesta a I attend: solo se anota. **Más meses** que los pagados (solo pasaría si los rangos de Stripe dejan de cuadrar): el plan se activa igual y se avisa con una fila en `support_tickets` (Admin → Buzón → Reportes, topic `help`) y correo a soporte.
4. El plazo cobrado se anota en `pagos.nota` y `ventas.notas` de la venta ecommerce (`… · 6 MSI`, o `… · 6 MSI (precio de 3 MSI)` si no coincide). No se crearon columnas.

## Comisiones

Fija por plan, sin importar el plazo. La venta ecommerce no comisiona. En `ventas.precio_acordado` queda el monto cobrado (p. ej. $4,719).

## Pendiente

- Los prices MSI solo existen en **live**. Para probar en test mode hay que crearlos en test con los mismos lookup keys. Tarjeta de prueba con MSI: `4000004840000008`.
- `precios-costos-comisiones.md` no está en ningún repo. Falta actualizarlo con la tabla de arriba donde viva.
