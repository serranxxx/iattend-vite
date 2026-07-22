# Módulo de Ventas (vendedores + panel admin)

Documentación de todo lo construido para el flujo de venta de invitaciones a través de vendedores (internos/externos) y el panel de administración de ingresos/comisiones. Cubre frontend (`iattend-vite`) y backend (`iattend--backend`).

## Qué resuelve

Permite que un vendedor (interno o externo, sin cuenta de usuario normal) entre con un código de acceso, dé de alta una venta nueva (cliente nuevo o existente), cobre esa venta en abonos con comprobante, y consulte su resumen de comisiones. Por el lado admin, hay un panel (`/admin/sales`) con KPIs de ingresos/comisiones, una gráfica de ingreso neto acumulado con línea de punto de equilibrio, gestión de vendedores, y registro/edición de ventas manuales.

## Rutas

| Ruta | Quién entra | Componente |
|---|---|---|
| `/sales` | Vendedor (código de acceso, sin cuenta normal) | `SalesApp` |
| `/admin/sales` | Admin (rol `Administration`, guard `AdminHOC`) | `SalesAdminPage` |

## Estructura de archivos

### Frontend — flujo de vendedor (`src/modules/Sales/`)

```
SalesApp.jsx              ← entry point: RequireVendorSession + switch entre panel/nueva-venta/cobro
RequireVendorSession.jsx  ← guard: si no hay sesión de vendedor válida, muestra VendorLogin
VendorSessionContext.jsx  ← contexto simple { vendedor, logout }
VendorLogin.jsx            ← login con código de acceso (formato XXX-XXX) vía PinCodeInput
VendorPanel.jsx             ← resumen (ventas del mes, comisión), datos de cobro (CLABE/Stripe), lista de "mis ventas"
VendorNewSale.jsx           ← alta de venta: cliente nuevo/existente, tipo evento, plan, descuento (con tope), fecha
VendorPayment.jsx           ← cobro de una venta: saldo, historial de pagos/comprobantes, formulario de abono nuevo
salesApi.js                 ← llamadas axios a /api/vendedores, /api/ventas, /api/pagos, /api/configuracion-pagos
paymentUtils.js             ← helper para armar el mensaje de datos bancarios
```

### Frontend — panel admin (`src/pages/Admin/`)

```
SalesAdminPage.jsx          ← KPIs, gráfica, tabla de ventas, gestión de vendedores, modales (editar venta,
                               crear vendedor, venta manual, registrar abono)
SalesAdminPage.module.css
salesAdminApi.js             ← llamadas axios a /api/admin/*, auth vía Bearer token de Supabase (sesión normal)
```

### Backend (`iattend--backend/`)

```
controllers/ventas.js         ← checkUrl, checkCliente, buscarClientes, crearVenta (alta completa: cliente + invitación + venta)
controllers/vendedores.js     ← loginVendedor, miResumen, misVentas
controllers/pagos.js          ← registrarPago, historialPagos, subirComprobante
controllers/adminVentas.js    ← listarVentas, editarVenta, pagosPendientesComprobante, listarVendedores,
                                 crearVendedor, buscarInvitacionesSinVenta, crearVentaManual
controllers/configuracionPagos.js ← getConfiguracionPagos (CLABE + links de Stripe por plan)

router/ventas.js, vendedores.js, pagos.js, adminVentas.js, configuracionPagos.js

middlewares/validar-vendedor-jwt.js     ← exige header `vendor-token` válido (JWT propio de vendedor)
middlewares/validar-vendedor-o-admin.js ← acepta `vendor-token` O Bearer token de admin (dual)
middlewares/validar-admin.js            ← exige Bearer token de sesión Supabase con rol admin
```

## Montaje de rutas (`index.js`)

```js
app.use('/api/vendedores', require('./router/vendedores'));
app.use('/api/ventas', require('./router/ventas'));
app.use('/api/pagos', require('./router/pagos'));
app.use('/api/admin', require('./router/adminVentas'));
app.use('/api/configuracion-pagos', require('./router/configuracionPagos'));
```

## Endpoints

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/api/vendedores/login` | pública | Login con `codigo_acceso` (formato `XXX-XXX`), devuelve JWT de vendedor |
| GET | `/api/vendedores/me/resumen` | vendor-token | Ventas del mes, comisión generada/pagada/pendiente del mes (lee `comision_monto`/`comision_pagada` de `ventas`) |
| GET | `/api/vendedores/me/ventas` | vendor-token | Lista de ventas del vendedor logueado con saldo |
| GET | `/api/ventas/check-url` | pública | Disponibilidad de slug de invitación |
| GET | `/api/ventas/check-cliente` | vendor-token | Busca si un correo ya tiene cuenta |
| GET | `/api/ventas/clientes` | vendor-token | Autocomplete de clientes existentes |
| POST | `/api/ventas` | vendor-token | Alta completa: crea/reusa cliente, crea invitación con plantilla default, crea `venta` |
| POST | `/api/pagos` | vendor-token o admin | Registra un abono sobre una venta |
| GET | `/api/pagos?venta_id=` | vendor-token o admin | Historial de pagos de una venta, con URL firmada del comprobante (bucket privado, 1h) |
| POST | `/api/pagos/:pago_id/comprobante` | vendor-token o admin | Sube comprobante (imagen→webp o PDF) a bucket `comprobantes-pago` |
| GET | `/api/configuracion-pagos` | vendor-token o admin | CLABE de cobro + links de Stripe por plan |
| GET | `/api/admin/ventas` | admin (Bearer Supabase) | Lista de ventas con filtros (año/mes/vendedor/plan/estado), saldo, comprobantes pendientes |
| PATCH | `/api/admin/ventas/:venta_id` | admin | Edita precio, plan o vendedor asignado |
| POST | `/api/admin/ventas` | admin | Alta manual de venta sobre una invitación ya existente |
| GET | `/api/admin/pagos` | admin | Ventas con abonos sin comprobante subido |
| GET | `/api/admin/vendedores` | admin | Lista de vendedores |
| POST | `/api/admin/vendedores` | admin | Crea vendedor (genera código de acceso único) |
| GET | `/api/admin/invitaciones-disponibles` | admin | Busca invitaciones sin venta asociada (para alta manual) |

## Modelo de datos (Supabase — no versionado en este repo)

Tablas y vistas que se consultan directo desde el backend con la anon/service key. **No hay migraciones SQL en este repo para ninguna de ellas** — viven directo en Supabase.

- **`vendedores`**: `id, nombre, tipo (interno|externo), telefono, email, descuento_max_pct, codigo_acceso, activo`
- **`ventas`**: `id, invitation_id, vendedor_id, plan, precio_acordado, descuento_pct, fecha_venta, comision_monto, comision_pagada`
- **`pagos`**: `id, venta_id, monto, metodo, referencia, nota, registrado_por, comprobante_url, comprobante_subido_at, created_at`
- **`ventas_saldo`** (vista): `venta_id, total_pagado, saldo_pendiente, estado_pago (sin_pago|apartado|completo)`
- **`ventas_comprobante_pendiente`** (vista): `venta_id, abonos_sin_comprobante`
- **`vendedores_metricas`** (vista): `vendedor_id, ventas_mes, ventas_totales`
- **`configuracion_pagos`**: `plan, tipo (transferencia|stripe_link), titular, banco, clabe, stripe_url, activo`

> ⚠️ **Importante**: las columnas `comision_monto` y `comision_pagada` de `ventas` **nunca se escriben desde el código de este repo** (ni frontend ni backend) — solo se leen para el resumen del vendedor (`miResumen`) y el ranking legacy. El cálculo de comisiones "real" para el dashboard de admin vive **en el frontend** (`SalesAdminPage.jsx`), no en estas columnas — ver sección de reglas de negocio abajo. No hay tampoco ningún endpoint que marque `comision_pagada = true`; si se necesita, se hace directo en Supabase.

## Autenticación

Hay tres esquemas distintos conviviendo:

1. **Vendedor**: JWT propio (`vendor-token` header) generado en `loginVendedor` con `generarVendedorJWT(vendedor.id, vendedor.tipo)`, verificado con `SECRET_JWT_SEED`. Se guarda en `localStorage` (`vendor_session`) del lado del frontend (`salesApi.js`), independiente de la sesión normal de usuario de I attend.
2. **Admin (dashboard `/admin/sales`)**: usa la sesión normal de Supabase Auth del usuario logueado (Bearer token), validado con `resolveAdminUserId` + rol `Administration` (mismo mecanismo que el resto de `/admin`, guard `AdminHOC` en el router de React).
3. **Dual (`validarVendedorOAdmin`)**: usado en `/api/pagos` y `/api/configuracion-pagos` porque tanto el vendedor (cobrando desde `/sales`) como el admin (cobrando desde `/admin/sales`) necesitan poder registrar pagos y subir comprobantes sobre la misma venta.

## Reglas de negocio: IVA y comisiones (dashboard admin)

Todo esto vive en `src/pages/Admin/SalesAdminPage.jsx`, calculado en el frontend a partir de `precio_acordado`, `fecha_venta`, `plan` y `vendedor_id` de cada venta — **no depende de las columnas `comision_monto`/`comision_pagada` de la base**.

### 1. Corte legacy (1 de julio de 2026)

```js
const CUTOFF_IVA_COMISION = new Date('2026-07-01T00:00:00')
```

- Ventas con `fecha_venta` **antes** de esta fecha: **no pagan IVA ni comisión**, sin importar el vendedor ni el monto. Mantiene el margen ya acordado con esos clientes.
- Ventas a partir de esa fecha entran a las reglas normales de abajo.

### 2. IVA (solo ventas post-corte)

IVA del 16%, calculado como impuesto **incluido** en el precio acordado (no se suma aparte):

```js
iva = bruto - bruto / 1.16
```

### 3. Piso de comisión: $1,000

Ventas con `precio_acordado < $1,000` **no generan comisión** (sin importar vendedor o plan), y quedan **fuera de cualquier conteo** — no ocupan turno en el orden de Paulina ni cuentan para sus hitos de bono.

### 4. Comisión base por plan (todos los vendedores)

| Plan | Comisión por venta elegible |
|---|---|
| PRO | $1,000 |
| Lite | $750 |

### 5. Regla especial — Paulina Pérez (`vendedor_id = '5eb35f6b-38c9-4ffd-a063-447b02a94e24'`)

Sus ventas elegibles del mes (post-corte, ≥ $1,000) se ordenan cronológicamente **dentro de su propio grupo vendedor+mes**:

| Venta # (de Paulina, en el mes) | Comisión |
|---|---|
| 1ª | $0 |
| 2ª | $0 |
| 3ª | $0 |
| 4ª en adelante | normal según plan ($1,000 PRO / $750 Lite) |

### 6. Bonos de Paulina por hito — sobre el total GENERAL de la compañía

Cuando el conteo de ventas elegibles del mes **de todos los vendedores juntos** (no solo las de Paulina) llega a la 8ª, 12ª o 16ª venta, se suma un bono fijo de **+$1,000** a la comisión de *esa* venta puntual (sin importar de qué vendedor sea) — así el acumulado del día en la gráfica refleja el bono en el momento correcto. Es acumulativo: si el mes llega a 16 ventas elegibles, ya se sumaron los tres bonos ($3,000 extra en total).

> Nota de diseño: como el dashboard no tiene un desglose de comisión por vendedor (solo un total de la compañía), el bono se suma sobre la venta que cruza el hito general, no se "reserva" aparte para Paulina. Si en algún momento se necesita ver "cuánto le toca a Paulina" como cifra separada, hay que agregar ese desglose — hoy no existe.

### Cálculo agrupado (`calcularCargosPorVenta`)

Para aplicar correctamente "primeras 3 de Paulina" y "8/12/16 general" sin importar si el panel está en vista "Mes" o "Año completo", las ventas elegibles se agrupan de dos formas en paralelo:

- **Por vendedor + mes calendario** de la venta → determina el orden de Paulina.
- **Por mes calendario general** (todos los vendedores) → determina cuándo se cruza un hito de bono.

Ambos agrupamientos son siempre mensuales (usan el mes real de `fecha_venta`), independientemente del filtro de año/mes que esté viendo el admin en pantalla.

## Dashboard admin — KPIs y gráfica

### Tarjetas (4)

1. **Ventas del mes/año** — conteo + desglose PRO/Lite
2. **Ingreso bruto** — suma de `precio_acordado` de todas las ventas del período
3. **Ingreso neto** — `bruto − IVA − comisiones` (con las reglas de arriba). Al hacer hover (tooltip de Ant Design) muestra el desglose de cuánto es IVA y cuánto es comisiones
4. **Saldo pendiente por cobrar** — suma de `saldo_pendiente`, con conteo de ventas en estado "apartado"

### Gráfica — Ingreso neto acumulado

- Eje Y en pesos (antes era conteo de ventas) — cambiado para que la línea de punto de equilibrio tenga sentido en la misma escala.
- Línea principal: ingreso neto acumulado día a día (vista "Mes") o mes a mes (vista "Año completo").
- Línea de **punto de equilibrio**: $15,160 MXN, punteada en rojo, **solo visible en vista "Mes"** (un punto de equilibrio mensual no aplica igual acumulado en la vista anual). Se muestra como segundo dataset con leyenda abajo del gráfico.

## Pendientes / cosas a tener en cuenta

- **`comision_monto`/`comision_pagada` en Supabase están huérfanas**: nadie las escribe. El resumen del vendedor (`VendorPanel`, endpoint `/me/resumen`) sigue leyendo de ahí — si se quiere que el vendedor vea la misma comisión que calcula el dashboard de admin, hay que decidir si se migra ese cálculo al backend/DB o se expone un endpoint que use la misma lógica del frontend admin.
- **No hay endpoint para marcar `comision_pagada = true`** — se hace directo en Supabase si se necesita.
- **Bucket `comprobantes-pago` es privado** — las URLs de comprobante se firman con `createSignedUrl` (expiran en 1h). El bucket `event-photos` (Photo Wall) sí es público; no confundir los dos.
- **Identificación de Paulina Pérez es por `vendedor_id` hardcodeado** en `SalesAdminPage.jsx` — si se le llegara a crear una segunda cuenta de vendedor, esta regla no la reconocería.
- **Los hitos de bono (8/12/16) son una lista explícita**, no una fórmula genérica ("cada 4 ventas") — si se necesitan más hitos (20, 24, …) hay que agregarlos a mano en `BONO_ESPECIAL_HITOS`.
- Sin suite de tests en el repo — toda la lógica de comisiones se validó con scripts sueltos de Node fuera del repo, no hay test automatizado que la proteja de regresiones futuras.
