# Pricing — ✦ Lia Activa (Fase 2)

*Definido el 23 de agosto de 2026. Actualizado el 24 de agosto de 2026 con el
**ratio real de envíos por invitado** medido en la base de producción y con el
modelo de precio **ilimitado escalonado** (antes: add-on plano + créditos).*

*Todas las cifras de costo están calculadas con tarifas **reales** de la cuenta de
Meta de I attend, no con estimaciones.*

---

## 1. Decisiones tomadas

| Decisión | Valor |
|---|---|
| Nombre del producto | **Lia Activa** |
| Plan nuevo | **PRO + Lia Activa** — $4,999 MXN |
| Add-on por evento | **Lia Activa** — $1,299 MXN (hasta 400 invitados) |
| Add-on tramo L | **$1,999 MXN** (hasta 800 invitados) |
| Add-on tramo XL | **+$2.50 MXN por invitado** (800+) |
| Ruta LITE → PRO + Lia Activa | **$2,100 MXN** (nueva, no existe) |
| Modelo de cobro | **Ilimitado escalonado por invitados.** El add-on no consume créditos ni los cobra aparte. |
| Créditos con Lia activa | **Ilimitados** — el sistema de créditos deja de usarse |
| LITE / Paperless | **No pueden tener Lia Activa** (sin envíos por API de Meta) |
| Alcance del add-on | Por evento (por invitación), no por cuenta |
| Créditos ya comprados | Se ignoran; transferencia manual si el cliente lo pide |

### Por qué "Lia Activa" y no "✦ Lia"

PRO **ya incluye a Lia** para consultas (preguntas sobre invitados, acomodos, etc.).
El nombre tiene que marcar la diferencia real, que es de verbo:

- **PRO:** Lia **responde**. Le preguntas.
- **PRO + Lia Activa:** Lia **actúa**. Manda, reenvía y da seguimiento sin que le pidas nada.

"Lia Activa" funciona en las cuatro posiciones donde el nombre tiene que vivir:
plan (`PRO + Lia Activa`), SKU, botón (`Activar ✦ Lia`) y estado en el dashboard
(`✦ Lia activa · vigilando respuestas`). Para copy de marketing, la frase que lo
aterriza es **"pon tus confirmaciones en piloto automático"**.

---

## 2. Por qué ilimitado y no medido por créditos

Se evaluó cobrar el add-on más barato ($899) y dejar que los envíos siguieran
consumiendo créditos como hoy. **Se descartó**, por tres razones en este orden:

### 2.1 El medidor pelea con la promesa del producto

Lia Activa se vende como alivio: *"yo me encargo"*. Un contador obliga al usuario a
supervisar exactamente la cosa que pagó para dejar de supervisar. Aunque el total
pagado fuera idéntico, **quien tiene medidor vigila el medidor** — y un agente
supervisado no es el producto que estamos vendiendo.

La queja no sería "es caro", sería **"pensé que ya lo había pagado"**. Eso no es un
problema de precio, es un problema de confianza: una vez que el cliente sospecha que
vienen más cobros, el resto del catálogo se vuelve sospechoso.

### 2.2 Lia se quedaría sin créditos a mitad del evento

Con el modelo medido, en el evento de referencia (250 invitados + 2 side events de 75):

- 300 créditos incluidos − 233 invitaciones = **67 créditos disponibles para recordatorios**
- Lia necesita 163
- **Se detiene en el recordatorio 67 de 163** — completa el 41% del trabajo y le pide
  dinero al usuario, semanas antes de la boda, con el estrés arriba

Ese es el fracaso del producto, no un detalle de cobranza.

### 2.3 El precio debe estar en la unidad del cliente

La clienta sabe que *"somos 250 invitados"*. No tiene idea de qué son 396 créditos ni
por qué necesita 96 más. Cuando el precio está en su unidad de medida se siente justo
por construcción y desaparece el trabajo de traducción.

### 2.4 Y además es más rentable

Comparativo en el evento de referencia (400 invitados totales):

| Modelo | Ingreso extra | Costo | **Utilidad** |
|---|---|---|---|
| Sin Lia · el usuario compra créditos | $200 (paquete de 100) | $165 | +$35 |
| Lia medida · $899 + créditos | $1,099 | $177 | +$922 |
| **Lia ilimitada escalonada · $1,299** | $1,299 | $177 | **+$1,122** |

El escalonado gana también en el extremo grande, que era el único punto donde el
modelo medido tenía ventaja — porque el tramo captura el volumen sin necesidad de
medidor. En 500 invitados + 3 side events de 150 (950 totales): tramo XL a $2,375,
costo $420 → **+$1,955**, contra +$1,529 del medido.

**Conclusión: ilimitado escalonado gana en experiencia y en margen simultáneamente.**
El mensaje se vuelve una frase sin asteriscos: **"Lia trabaja sin límite."**

---

## 3. Posicionamiento: no se vende como ahorro

**Regla dura: Lia Activa nunca se comunica en términos de dinero ahorrado.**

El razonamiento, porque es contraintuitivo y hay que sostenerlo:

Si le enseñas al usuario a comparar Lia contra el costo de los créditos, le das la
herramienta para decidir que no la necesita — porque en la comparación de costo la
opción más barata **siempre** es no mandar nada. Lia no ahorra dinero: **gasta el
dinero por ti y te quita el trabajo.**

| Fuera del copy | Dentro del copy |
|---|---|
| ~~"Ahorra créditos"~~ | "Yo me encargo" |
| ~~"Más barato que hacerlo a mano"~~ | "3 cosas requieren tu atención" (en vez de 55) |
| ~~Cualquier comparativo de costo~~ | "47 acciones esta semana" — trabajo que no hiciste |

El valor se mide en **tamaño del pendiente** y **acciones que no ejecutaste**, nunca
en pesos. Esto ya está implementado así en el tablero de Seguimiento y en los frames
de Figma (`Fase 2 — Lia Confirmaciones`).

Nota: el §2.4 de este documento es análisis interno de rentabilidad. **No es copy** y
no debe filtrarse a la página de planes.

---

## 4. Escalera de planes

| | LITE | PRO | **PRO + Lia Activa** |
|---|---|---|---|
| **Precio** | $2,899 | $3,999 | **$4,999** |
| Envío automático de invitaciones | — | manual | **automático** |
| Créditos | — | 300 incluidos | **Ilimitados** |
| Lia consultas (pregúntale) | — | ✓ | ✓ |
| Reintentos de envío | — | manual | **automático** |
| Recordatorios | — | manual | **automático** |
| Interpreta respuestas de WhatsApp | — | — | ✓ |
| Puede comprar Lia Activa | ✗ | ✓ ($1,299) | incluida |

El bundle de $4,999 incluye el **tramo base (hasta 400 invitados, sumando side
events)**. Arriba de eso se paga la diferencia de tramo, igual que en el add-on.

**LITE y Paperless quedan fuera** porque no tienen envíos por la API de Meta: sin
dispatches no hay entregas fallidas que reintentar ni estados que vigilar. En esos
planes el tablero de Seguimiento se ve casi vacío (todo sale como "envío manual"),
así que el banner ahí debe empujar **PRO**, no Lia.

### Tramos de Lia Activa

| Tramo | Invitados totales (evento + side events) | Precio | Costo real | Margen |
|---|---|---|---|---|
| **Lia Activa** | hasta 400 | **$1,299** | $177 | 86.4% |
| **Lia Activa L** | hasta 800 | **$1,999** | $354 | 82.3% |
| **Lia Activa XL** | 800+ | **+$2.50 / invitado** | ~$0.44 / invitado | ~82% |

El tramo se fija **una sola vez al comprar**, con un dato que el cliente ya tiene a
la mano. No hay medición continua ni sorpresas a mitad del evento.

---

## 5. Rutas de compra

| Ruta | Pasos | Total |
|---|---|---|
| Directa | PRO + Lia Activa | **$4,999** |
| Desde LITE (directa) | $2,899 + $2,100 | **$4,999** |
| Desde PRO (diferida) | $3,999 + $1,299 | $5,298 |
| Desde LITE (dos pasos) | $2,899 + $1,100 + $1,299 | $5,298 |

**Cualquier ruta directa cuesta $4,999; cualquier ruta diferida cuesta $5,298.**
El diferencial de $299 es el incentivo para decidir desde el inicio, y es idéntico
sin importar de dónde venga el usuario — no hay que explicarlo ni justificarlo.

Copy sugerido en la página de planes: *"Tómalo desde el inicio y ahorra $299."*

---

## 6. Qué incluye — copy para la página de planes

> **PRO + Lia Activa** — Todo lo de PRO, y Lia se encarga de tus confirmaciones.
>
> - **Reenvía sola las invitaciones que no llegaron.** Si WhatsApp no entrega una,
>   Lia lo detecta y lo vuelve a intentar.
> - **Persigue a quien no confirma.** Recordatorios automáticos con cadencia
>   inteligente, sin saturar a nadie: máximo 3 mensajes por invitado.
> - **Entiende las respuestas por WhatsApp.** Si alguien contesta "sí vamos" por
>   mensaje, Lia actualiza su estado sin que tú lo toques.
> - **Te avisa antes de actuar.** Cada tanda se anuncia con anticipación y puedes
>   detenerla.
> - **Lia trabaja sin límite.** Ni créditos, ni contadores, ni cobros a mitad del camino.
> - **Funciona también en tus side events.**
> - **Solo te molesta cuando importa.** El resto lo resuelve ella y te lo reporta.

---

## 7. Costos reales

### 7.1 🔴 El dato que cambió todo: 1 envío ≠ 1 invitado

Medido contra la base de producción (throwaway script sobre
`iattend--backend/config/supabase.js`):

| Métrica | Valor real |
|---|---|
| Invitados en muestra | 1,000 |
| Bloques de envío (registros con teléfono propio) | **576** |
| **Personas por envío** | **1.74** |
| **Ratio envíos / invitado** | **0.58** |

Los acompañantes **no reciben mensaje propio**: 2 a 4 personas comparten un solo
envío. Toda versión anterior de este documento costeaba *por invitado*, lo que
**inflaba los costos ~42%**. Todas las cifras de abajo ya usan 0.58.

### 7.2 Tarifas verificadas (factura de Meta, agosto 2026)

| Categoría | Mensajes pagados | Cargo | **Tarifa unitaria** |
|---|---|---|---|
| Marketing | 45 | $1.37 USD | **$0.0304 USD** |
| Utility | 10 | $0.09 USD | **$0.009 USD** |

Muestra chica y totales redondeados por Meta → precisión ±10%. Revalidar cuando
haya volumen.

Dos hallazgos de la misma factura:
- **Tasa de respuesta entrante del 52%** (33 recibidos / 64 enviados) — se usa para
  dimensionar el trabajo de la IA.
- **2 de 12 utility salieron gratis** por ventana de servicio abierta de 24h.

### 7.3 Otros insumos

| Concepto | Valor |
|---|---|
| Tipo de cambio | 18.5 MXN/USD |
| Modelo de IA | Claude Sonnet 5 ($3/$15 por MTok) con prompt caching |
| Costo por interpretación | ~$0.0027 USD (850 tok in / 120 tok out, system prompt cacheado) |
| Infra (worker, DB, webhook) | $0.20–0.40 USD por evento |
| Paquete de créditos de referencia | 100 créditos = $200 MXN |

### 7.4 Volúmenes por evento — base = **envíos (bloques)**, no invitados

| Acción | Fórmula | Template |
|---|---|---|
| **Bloques de envío** | **0.58 × invitados** | — |
| Invitaciones | 1.0 × bloques | Marketing |
| Recordatorios (40% + 20% + 10%) | 0.70 × bloques | Utility |
| Reintentos (20%) | 0.20 × bloques | Utility |
| **Total utility** | **0.90 × bloques** | |
| Mensajes salientes | 1.90 × bloques | — |
| Interpretaciones de IA | 0.52 × salientes = 0.99 × bloques | — |

**Costo unitario derivado: $0.0412 USD por envío ($0.762 MXN), o $0.44 MXN por
invitado.**

### 7.5 Costo por escenario

| Escenario | Invitados | Envíos | Marketing | Utility | IA | **Total** |
|---|---|---|---|---|---|---|
| 250, sin side events | 250 | 145 | $4.41 | $1.17 | $0.39 | **$5.97 USD · $110 MXN** |
| 250 + 2 sides de 75 | 400 | 233 | $7.08 | $1.89 | $0.62 | **$9.59 USD · $177 MXN** |
| 250 + 3 sides de 150 | 700 | 406 | $12.34 | $3.29 | $1.08 | **$16.71 USD · $309 MXN** |
| 500 + 3 sides de 200 | 1,100 | 638 | $19.40 | $5.17 | $1.70 | **$26.27 USD · $486 MXN** |

### 7.6 Márgenes

| Escenario | Costo | Tramo aplicable | Precio | **Margen del add-on** | Margen sobre PRO + Lia |
|---|---|---|---|---|---|
| 250 invitados | $110 | base | $1,299 | **91.5%** | 97.8% |
| 400 invitados | $177 | base | $1,299 | **86.4%** | 96.5% |
| 700 invitados | $309 | L | $1,999 | **84.5%** | 93.8% |
| 1,100 invitados | $486 | XL | $2,750 | **82.3%** | 90.3% |

**El escalonado sustituye al tope duro del modelo anterior.** Antes, un add-on plano
de $899 en un evento de 1,100 invitados caía a márgenes de un dígito; hoy ese evento
paga su tramo y el margen nunca baja de ~82%.

---

## 8. Topes y protecciones

### 8.1 Tope técnico invisible: 3 mensajes de Lia por invitado por evento

Aplica **sumando el evento principal y todos los side events**. Resuelve dos
problemas con un solo mecanismo:

1. **Costo:** acota el peor caso a **$0.063 USD por envío ($1.17 MXN)**. Un evento de
   400 invitados en su peor caso absoluto cuesta $273 MXN → 79% de margen sobre
   $1,299. Nunca hay pérdida en ningún tramo.
2. **Calidad del número de WhatsApp (el riesgo grave):** sin tope global, un invitado
   que está en el principal y 3 side events y nunca confirma recibiría **16 mensajes**
   de la misma boda. Eso es spam: te bloquea o te reporta, y **el quality rating del
   número es un activo compartido por toda la plataforma** — un solo organizador
   agresivo puede tirarle el tier de mensajería a todos tus clientes.

⚠️ **Implicación de arquitectura:** la cadencia tiene que vivir a nivel **invitación**
(presupuesto global por invitado), no a nivel side event. El contador se calcula al
vuelo contando dispatches, y la llave que identifica a la misma persona entre `guests`
y `side_events_guests` es el **teléfono normalizado** (`guest_phone` en las tablas de
dispatch). `reminder_count` se queda como caché de UI, no como fuente de verdad.

### 8.2 "Ilimitado" de cara al cliente

Se comunica como ilimitado **dentro del tramo contratado**. El tope de 3
mensajes/invitado es interno y ningún usuario normal lo toca. Es la forma estándar de
ofrecer "ilimitado" sin exposición abierta.

Lo que **no** hay que hacer es poner el tramo como asterisco en el copy principal: el
tramo es un campo del checkout ("¿cuántos invitados esperas?"), no una limitación que
haya que defender.

### 8.3 Optimización pendiente: ventana de servicio de 24h

Los mensajes utility son **gratis** dentro de una ventana de servicio abierta (la
factura lo comprueba: 2 de 12). Con 52% de respuesta entrante y varios eventos
tocando a la misma gente, las ventanas se traslapan mucho.

Si Lia programa el recordatorio dentro de las 24h posteriores al último mensaje del
invitado, ese envío no cuesta nada. Estimado: **20–40% del utility podría salir
gratis**. Es una optimización que solo un agente automático puede hacer (requiere
vigilar la ventana de cada invitado) y sirve como argumento de producto, no solo de
costo.

---

## 9. Cambios técnicos requeridos

### 9.1 🔴 Base de datos: NO usar un valor nuevo en `plan`

Hay **28 checks de `plan === 'pro'` / `plan !== 'pro'`** en GuestsPage, SideEvents,
GuestAddTiles, DashboardPage y Lia.jsx. Si el plan nuevo se guardara como
`plan = 'pro_lia'`, los 28 fallarían **en silencio**: el cliente de $4,999 perdería
funciones que sí tiene el de $3,999 (botones de envío deshabilitados, recordatorios
bloqueados, tiles con candado). No truena, se degrada — lo peor para detectarlo.

Columnas nuevas en `invitations`:

```sql
ALTER TABLE invitations ADD COLUMN lia_active boolean NOT NULL DEFAULT false;
ALTER TABLE invitations ADD COLUMN lia_activated_at timestamptz;
ALTER TABLE invitations ADD COLUMN lia_tier text; -- 'base' | 'l' | 'xl'
```

Las dos rutas de compra escriben lo mismo: `plan = 'pro'` **+** `lia_active = true`
**+** `lia_tier`.

### 9.2 Stripe — precios nuevos

| Constante | Producto | Precio | Efecto al pagarse |
|---|---|---|---|
| `PLAN_PRO_LIA` | PRO + Lia Activa (hasta 400) | $4,999 | `plan='pro'`, `lia_active=true`, `lia_tier='base'` |
| `LIA_UPGRADE` | Lia Activa (hasta 400) | $1,299 | `lia_active=true`, `lia_tier='base'` |
| `LIA_UPGRADE_L` | Lia Activa L (hasta 800) | $1,999 | `lia_active=true`, `lia_tier='l'` |
| `UPGRADE_LITE_TO_PRO_LIA` | LITE → PRO + Lia Activa | $2,100 | `plan='pro'`, `lia_active=true`, `lia_tier='base'` |

El tramo **XL (800+)** no se modela como precio fijo: es `+$2.50 × invitados`, o sea
un precio calculado. Dos opciones — precio dinámico en el Checkout Session, o dejarlo
como cotización manual en la primera versión. **Recomendación: manual al inicio**;
son pocos eventos y evita construir precios dinámicos antes de validar demanda.

Ya existentes que no cambian: `PLAN_LITE` $2,899, `PLAN_PRO` $3,999,
`UPGRADE_TO_PRO` $1,100, `SIDE_EVENT` $300, y los cuatro paquetes de créditos.

Archivos a tocar: `src/components/Payment/functions.js` (`PRICE_IDS` + `PRODUCTS`) y
el webhook de Stripe en el backend (`controllers/supabase.js`, donde hoy se escribe
`plan: planName`).

### 9.3 Frontend

- **Gate de Lia:** el flag `SHOW_LIA` de
  `modules/GuestManagement/GuestsOverview/GuestsOverview.jsx` pasa a leer
  `invitation.lia_active`. Ya está aislado en una constante, es un cambio de una línea.
- **UI de créditos:** con `lia_active = true`, el contador de créditos del header
  (`components/Payment/CreditController`) y los CTAs de compra **no deben renderizarse**.
  En su lugar: `✦ Lia activa`. Esto no es cosmético — es la prueba visible de la
  promesa (donde antes había un número que bajaba, ahora hay un estado).
- **Descuento de créditos:** con Lia activa, `onUpdateCredits()` no debe ejecutarse en
  ningún flujo de envío (GuestsPage y SideEvents).
- **Selector de tramo en el checkout:** un solo campo, "¿cuántos invitados esperas en
  total (incluyendo side events)?", que resuelve el tramo. No mostrar el cálculo.
- **Banner de upgrade** en el tablero de Seguimiento: PRO → add-on $1,299;
  LITE/Paperless → "Sube a PRO + Lia Activa".

---

## 10. Casos borde resueltos

| Caso | Resolución |
|---|---|
| PRO existentes ($3,999) | Ven el banner de $1,299 en el tablero. Pagaron por PRO, no por Lia. |
| LITE quiere Lia | No puede tener el add-on. Ruta única: upgrade a PRO + Lia Activa ($2,100). |
| Alcance del add-on | Por evento/invitación. Debe decirse explícito en el copy para que nadie espere que cubra su siguiente boda. |
| Créditos ya comprados sin usar | Se ignoran. Si el cliente lo comenta, transferencia manual. |
| El evento crece y se pasa del tramo | Se cobra la diferencia de tramo, no un tramo completo. Lia **no se detiene** por esto: avisa y sigue trabajando. Detenerla reintroduce exactamente el problema del §2.2. |
| Side events | Incluidos en Lia Activa. Cuestan ~$33 MXN cada uno (50–75 invitados); cobrarlos aparte crearía un momento donde el usuario decide *no* automatizar uno — y cada side event sin automatizar es donde la promesa se rompe. |
| Reintentos y créditos | Los reintentos nunca cobraron crédito (el crédito se cobró en el envío inicial que falló). Con Lia activa es irrelevante: nada cobra crédito. |

---

## 11. Pendientes y a verificar

1. **Revalidar tarifas de Meta** cuando haya más volumen. Es el 70–80% del costo y la
   muestra actual es de 55 mensajes pagados.
2. **Revalidar el ratio 0.58** cuando haya más eventos cerrados. Es el insumo más
   sensible del modelo: si sube a 0.70, los costos suben 21% (los márgenes siguen
   arriba de 80%, así que no cambia el precio — pero sí cambia el peor caso).
3. **Tier de Meta:** el techo actual es de **2,000 conversaciones iniciadas / 24h**,
   compartido por toda la plataforma. A ~0.58 envíos por invitado, un evento de 400
   invitados abre ~233 conversaciones → unos **8 eventos activos el mismo día lo
   saturan**. **El límite de Meta llega antes que el límite del margen** — conviene
   empujar el upgrade a 10K (1,000 clientes únicos en 7 días) antes del lanzamiento.
4. **Envío de invitaciones por Lia** sigue fuera de alcance (Fase 3). El costo ya está
   contemplado en este modelo porque con ilimitado las invitaciones las absorbe el
   tramo de todos modos.
5. **Presupuesto global de mensajes por invitado** — arquitectura definida en §8.1
   (teléfono normalizado, conteo al vuelo). Falta implementarla en el worker.
6. Crear los 3 precios fijos en Stripe y capturar los `price_...` IDs reales en
   `functions.js`. XL queda manual en la primera versión.
7. **Decidir el destino de los paquetes de créditos** en la página de planes: siguen
   existiendo para PRO sin Lia, pero conviene que dejen de ser lo primero que ve el
   usuario cuando se le acaban — ese es el momento natural para ofrecer Lia Activa.
