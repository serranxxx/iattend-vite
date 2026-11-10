# Meses sin intereses (MSI) — estado real

Esquema actual desde el 10 nov 2026 (el del 3 oct, un precio por plazo, quedó archivado). Toca iattend-vite, iattend--backend e iattend-next.

## Por qué cambió

Stripe **no deja fijar ni limitar el plazo por precio ni por producto**: Checkout y Payment Links muestran todos los plazos activos de la cuenta que quepan en los montos mínimos del Dashboard. El esquema anterior (un producto o precio por plazo) no servía para limitarlo. Ahora cada producto tiene **un precio**, y solo se decide si ofrece meses o no. El cliente elige el plazo en Stripe.

## La regla vive en Stripe: mínimo de $4,000

En **Settings → Payment methods → Meses sin intereses → Configure**, los plazos de **3, 6 y 12 meses** tienen un mínimo de **$4,000 MXN** (9, 18 y 24 están apagados). Todo cobro menor a $4,000 no ofrece meses, venga de Payment Link, Checkout o Elements. Por eso:

- Los productos "a meses" cuestan **$4,000 o más**.
- **Ningún producto de contado debe llegar a $4,000**: quedaría con meses en sus Payment Links.
- Cantidad siempre fija en 1. El mínimo aplica al total: 2 × PRO contado ($7,998) sí ofrecería meses.

## Catálogo (Stripe, MXN, `one_time`, IVA incluido)

| Clave | Producto | Precio | Meses |
|---|---|---|---|
| `pro_contado` | PRO - Contado | $3,999 | No |
| `pro_meses` | PRO a meses | $4,499 | 3 / 6 / 12 |
| `lite` / `paperless` | Lite / Paperless | $2,899 / $849 | No |
| `pop_individual` | Pop | $549 | No |
| `bucket_5` | Bucket 5 Pops | $2,249 | No (solo contado) |
| `bucket_10` | Bucket 10 Pops | $4,000 (mismo de contado o a meses) | 3 / 6 / 12 |
| `pro_20_off` | PRO 20% OFF (promo) | $3,199 | No |
| `pro_msi` | PRO MSI (promo Buen Fin) | $4,000 | 3 / 6 / 12 |

Extras (Side Event, Créditos, Cámbiate a PRO): sin meses (todos cuestan menos de $4,000).

## Fuente única

- **`iattend--backend/config/stripe.catalog.js`**: `CATALOGO` (product y price de cada uno), `PRODUCTOS_CON_MSI`, `PRECIO_A_MESES` (`{ pro: price de "PRO a meses" }`), `PLAZOS_MSI` (`[3, 6, 12]`, los activos en el Dashboard) y `opcionesDePago(priceId)`.
- `config/stripe.products.js`: price → acción del webhook, con una sección **legacy** (precios y productos archivados) de solo lectura para pagos viejos.
- El contado de cada plan sigue en `plans.stripe_price_id` (Admin → Configuración → Planes).
- `GET /api/plans` agrega a cada plan `installments: [{ months (el plazo más largo), amount, monthly, currency, lookup_key: 'pro_meses', plazos: [{ months, monthly }] }]`, con una sola entrada (`[]` si no tiene precio a meses activo). Se dejó en arreglo por compatibilidad.

## Fronts

En la UI **no se dice "sin intereses" ni "MSI"**: el precio a meses es más caro que el de contado. Se habla de "pagos" ("hasta 12 pagos de $375").

- **iattend-vite `/checkout`** (`components/Payment/PlanPricing/`): "Contado | 3 meses | 6 meses | 12 meses" con su mensualidad; todos son el mismo precio a meses (`planTerms` abre `installments[0].plazos` en una opción por plazo, con el mismo `lookup_key`). Debajo: "6 pagos con tarjeta · confirmas el plazo al pagar · +$500 vs. contado", total y "Pagar 6 × $750".
- **Drawer de `/preview`** (`PublishModal.jsx` + `components/Payment/InstallmentPicker/`) y **compra de evento del planner** (`PlannerEventDrawer.jsx`): mismos plazos. Helpers en `hooks/usePlans.js`: `planTerms`, `formatMXN`, `termCaption` ("6 pagos de $750").
- **iattend-next `/about/pricing`**: "o hasta 12 pagos de $375" (redondeado hacia arriba).
- **Catálogo `/precios/<id>`** (`pages/Precios/`): atrás de la tarjeta solo nombre, precio y un renglón ("desde $375 al mes" o "$449.80 por Pop"), con el texto cediendo espacio para que Copiar link y Ver QR se vean siempre; abajo, un renglón ("Hasta 12 pagos con tarjeta" o el precio por Pop).

## Cobro

Checkout Session hospedado. A meses, el front manda `lookupKey: 'pro_meses'` (nunca el price). El backend lo resuelve a `PRECIO_A_MESES` y manda `metadata.aMeses = '1'`. Los `pro_msi_{n}` viejos se siguen aceptando y caen en el mismo precio. Endpoints: `create-checkout-preview`, `create-checkout-plan`, `create-checkout-invitation` y la compra de evento del planner.

**Toda** Checkout Session lleva `payment_method_options.card.installments.enabled` explícito, según el producto del precio (`opcionesDePago`): `true` solo para `PRODUCTOS_CON_MSI`, `false` para todo lo demás. Así no depende solo del Dashboard.

**Payment Links no tienen esa opción**: ofrecen meses según el mínimo del Dashboard (por eso la regla de los $4,000).

### Link propio: `/comprar/:clave`

Para vender sin Payment Links (WhatsApp, Instagram): `https://www.iattend.site/comprar/<clave>` con una clave de `CATALOGO` (`pro_contado`, `pro_meses`, `bucket_10`, `pro_msi`…). La página (`pages/Precios/ComprarPage.jsx`) pide `GET /api/comprar/:clave` (`iattend--backend/router/comprar.js`), que crea la Checkout Session (cantidad 1, meses según el producto, `metadata.origen = 'comprar'`) y redirige a Stripe. Stripe regresa a la misma página con `?estado=lista` (gracias, un asesor la activa) o `?estado=cancelada`.

## Webhook

`checkout.session.completed` → `processingPayment` (`controllers/supabase.js`):

1. El price se mapea con `PRODUCTS` (incluye el legacy). Los productos PRO (contado, a meses y las promos) activan PRO. Pop y Buckets suman 1, 5 o 10 Pops gratis a la cuenta (`sumarPopsGratis` → `planner_benefits.free_flash_events`), solo si la sesión trae `userId`.
2. `revisarPlazoMSI` (`controllers/msiPlazo.js`) lee el plazo cobrado (`latest_charge…installments.plan.count`). Si el producto ofrece meses (`permiteMsi`, o `metadata.aMeses`), cualquier plazo vale y solo se anota. **Red de seguridad:** un producto sin meses que llegó a meses avisa con una fila en `support_tickets` (Admin → Buzón → Reportes) y correo a soporte, para reembolso manual. También corre en las compras de planners. Las sesiones viejas con `msiMonths` se revisan como antes.
3. El plazo cobrado se anota en `pagos.nota` y `ventas.notas` (`… · 6 MSI`).

Las compras por **Payment Link** no traen `priceId` en la metadata: el webhook las ignora y las activa un asesor, incluidos los Pops de los Buckets. Las de `/comprar` sí lo traen (para la red de seguridad), pero tampoco activan nada: no traen cuenta ni invitación.

## Comisiones

Fija por plan, sin importar el plazo. La venta ecommerce no comisiona.

## Pendiente

- Los precios solo existen en **live**; no hay llave de test en el backend. Tarjeta de prueba con MSI en test mode: `4000004840000008`.
