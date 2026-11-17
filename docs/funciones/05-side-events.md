# 5. Side events

> Revisado contra el código el 16 de noviembre de 2026. Los números por plan se consultaron ese día en `GET /api/plans` (producción) y **viven en la base de datos**: pueden cambiar desde Admin. Las notas marcadas **Nota interna** son para el equipo.

## Qué es

Un side event es un **evento extra alrededor de la boda**: la ceremonia civil, la despedida, la tornaboda, un brunch. Texto de la app: "Son los eventos alrededor del principal: la ceremonia civil, la despedida, la tornaboda."

Cada side event tiene:
- su propia página para el invitado (`iattend.events/side-event/<código>`);
- su propia lista de invitados y sus propias confirmaciones.

La página de la boda **no enlaza** a los side events: cada uno se comparte por separado.

Se administran en el tablero de la boda → "Mis side events".

## Quién lo puede usar

| Plan | Side events incluidos | ¿Puede comprar más? |
|---|---|---|
| PRO | **2** | **Sí**, $300 MXN cada uno |
| Lite | 0 | No (hay que pasarse a PRO) |
| Paperless | 0 | No |

- **Los side events son de PRO.** Con Lite, la tarjeta de side events del tablero ofrece pasarse a PRO.
- El número que cuenta es el que quedó guardado **en cada invitación** al comprarla. Si una invitación se creó con otro número, vale el suyo.
- Los puede crear y editar quien administra la boda: dueño, su planner o un administrador.
- Computadora (editor completo) y celular (editor del celular).

## Paso a paso

1. **Crear:** "Nuevo side event". Se crea vacío (sin nombre, fecha ni lugar).
2. **Comprar más (solo PRO):** tarjeta "¿Más side events?" → "Comprar" → pago en Stripe. Al confirmarse el pago se crea un side event vacío y el tope sube en 1.
3. **Diseñar** (pestaña Diseño): nombre, fecha y hora, nombre del lugar, dirección, **una foto** de portada, color del tema, velo, notas y clima ("Automático": aparece unos días antes, cuando ya hay pronóstico; "Siempre"; u "Oculto").
4. **Agregar invitados** (pestaña Invitados → "Agregar"):
   - **"Copiar de otra lista"**: trae invitados de la boda, agrupados por familia, conservando su mismo código y sus acompañantes. Los que ya están salen deshabilitados.
   - **"Individual"**: el mismo panel de alta de la boda.
   - **"Desde Excel"** con Lia: solo si la boda es PRO.
5. **Mandar el link:** en cada tarjeta, **"Copiar link"** copia el link personal del invitado. El organizador lo manda por su cuenta (WhatsApp personal, correo…).
6. **Marcar como invitado (✓):** "pasará a Invitación enviada sin envío de WhatsApp".
7. **Seguir las respuestas:** por pasos (Por invitar · Esperando · Confirmados · No asistirán) o en la vista Compacta.

**Se guarda solo** (no hay botón Guardar): "Guardando… / Guardado / No se guardó · Reintentar".

## Cómo funciona

- **Siempre es privado:** cada invitado entra con su código. No tiene la opción de hacerlo público.
- **El código de la boda también abre el side event** para los invitados que se copiaron de la boda.
- El invitado confirma por él y por los acompañantes que el organizador dio de alta (puede marcar que alguno no irá), pero **no puede agregar acompañantes nuevos**.
- Al confirmar, el invitado tiene **"Ver mi pase"** (si el organizador no lo apagó) y puede agregarlo a Apple Wallet.
- Usa el espacio de archivos y los créditos de la boda.
- Para copiar el link, la invitación de la boda debe tener completos nombre, tipo de evento, teléfono y anfitriones.

## Límites y costos

- Side event extra: **$300 MXN** (solo PRO).
- Una sola foto de portada.
- Tarjetas disponibles en la página: Lugar (mapa "Cómo llegar"), Notas y Clima. Una tarjeta sin datos no se muestra (el Lugar pide la dirección completa; el Clima, la ciudad).

## Lo que NO hace / malentendidos comunes

- **No manda la invitación por WhatsApp.** Solo existe "Copiar link" + "Marcar como invitado".
- **No se puede hacer público** ni tiene registro abierto.
- **No tiene** elementos decorativos, dibujos, canción, efectos, estilo de bloques, itinerario, formulario, lista de asistentes, chat ni patrocinadores. Todo eso es de los Pops ([07-pops.md](07-pops.md)).
- **No tiene lector de pases propio**: el lector de la boda rechaza los pases de sus side events.
- **No se puede borrar** un side event desde la app: lo borra soporte a mano.
- **En el celular** no se puede "Copiar de otra lista" ni copiar el link de cada invitado.
- **La fecha límite no bloquea** al invitado.
- Lia sí está disponible en la pantalla de side events de la boda.

## Preguntas frecuentes

**¿Cuántos side events trae mi plan?** PRO 2. Lite y Paperless no incluyen side events.

**¿Puedo comprar más?** Solo con PRO, $300 cada uno.

**Tengo Lite y quiero un side event.** Hay que pasarse a PRO.

**¿Cómo le llega la invitación al invitado?** Copias su link con "Copiar link" y se lo mandas tú; o compartes el link general y el invitado escribe su código. Después tocas ✓.

**¿El invitado necesita un código nuevo?** Si lo copiaste de la boda, usa el mismo.

**¿Puedo hacerlo público?** No; solo los Pops.

**¿Puedo borrar un side event?** Sí, pidiéndoselo a soporte; no hay botón en la app.

> **Nota interna:** Lite ya no incluye side events (confirmado el 16 de noviembre de 2026), pero el catálogo de producción (`GET /api/plans`) todavía decía `side_events_included: 1` para Lite ese día: corregirlo en Admin → Configuración → Planes. Las invitaciones Lite que ya se crearon con 1 lo conservan.

> **Nota interna:** el tope de side events solo lo revisa la pantalla; la base de datos no lo impide. Si el pago de un side event entra pero su creación falla, el tope sube igual.

## Referencias técnicas (para soporte)

`src/modules/SideEvents/SideEvents.jsx`, `Workspace/` (escritorio), `Movil/` (celular), `tarjetasSide.js`. Página: iattend-events `components/SideEvent/SideEvent.tsx`. Backend: `controllers/payment.js` (compra), `controllers/supabase.js` (webhook). Ver `docs/side-events.md`, `docs/rediseno-side-events.md`.
