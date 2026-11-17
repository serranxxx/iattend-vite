# 12. Todo lo demás: cuentas, planners, compras, soporte y más

> Revisado contra el código el 16 de noviembre de 2026. Precios consultados ese día en producción. Las notas marcadas **Nota interna** son para el equipo.

## Cuentas e inicio de sesión

**Pantalla `/login`:**
- Iniciar sesión con correo y contraseña, o con **Google** o **Apple**.
- Crear cuenta: nombre, correo y contraseña (mínimo 6 caracteres). "Crea tu cuenta gratis y elige tu plan cuando estés listo."
- Al entrar se va a "Mis eventos" (`/invitations`).

Toda cuenta nueva nace con un evento gratuito para su **Save the Date**.

**Lo que NO hay:**
- **No hay "olvidé mi contraseña" en la app.** La recuperación la resuelve soporte.
- **Si la contraseña es incorrecta, la app no muestra ningún mensaje** (no pasa nada al tocar "Iniciar sesión").
- **No hay dos cuentas para la misma boda.** Una invitación tiene un solo dueño, más su planner y el equipo de I attend. Si la pareja quiere entrar los dos, hoy comparten la cuenta. Los "nombres de la pareja" (anfitriones) que se agregan a la invitación son solo nombres para la invitación y los lados; **no dan acceso**.
- **La app del organizador está en español**; no hay selector de idioma (los idiomas de la invitación son otra cosa, ver [01-invitacion.md](01-invitacion.md)).

## Tipos de cuenta

| Tipo | Qué es |
|---|---|
| Cliente | Novios, quinceañera, quien compró su evento |
| Planner | Wedding planner: administra eventos de sus clientes, tiene Dashboard del planner y beneficios |
| Administración | Equipo de I attend: las mismas funciones que un planner, más el panel interno `/admin` |
| Vendedor | Portal de ventas propio (`/sales`), con acceso por código |

## "Mis eventos" (`/invitations`)

El mismo diseño para clientes y planners, con una barra lateral:

| Sección | Planner | Cliente |
|---|---|---|
| Explora I attend | Carrusel y su invitación de ejemplo | Carrusel a toda la pantalla |
| Mis clientes | Sí | No |
| Mis eventos | Sus eventos propios | Todas sus invitaciones |
| Pops | Sí | Sí |
| Dashboard | Sí | No |
| "¿Te falta algo?" (sugerir una función) | Sí | No |

- Arriba: **Comprar evento** y, si los tiene, "Tienes gratis" (eventos o Pops gratis).
- Abajo: el usuario, con "Conoce I attend" y "Cerrar sesión".
- En el celular, una barra flotante con las secciones y un "+".
- Cada tarjeta de evento tiene **Empezar** (abre el tablero) y compartir (copia el link).
- Sin eventos, el cliente ve "Tu invitación te está esperando" y "Crea tu invitación".

## Tablero del evento (`/dashboard`)

Un tablero de tarjetas:
- **Invitación** (miniatura de la portada).
- **Gestión de invitados**: confirmados, esperando y lugares disponibles.
- **Side events** ("Disponible con PRO" si el plan no los incluye).
- **Photo Wall** (conteo y últimas fotos; "Disponible con PRO").
- **Save the Date**.
- **Acomodo de mesas**.
- Tarjeta de venta: "Contrata I attend" (cuenta gratuita) o "Cámbiate a PRO" (Lite).
- "Ayúdanos a mejorar" (ver Opiniones).

En el celular es una pantalla propia.

## Planners

**Comprar o crear un evento para un cliente** ("Comprar evento" / "Evento gratis"):
1. Elegir el tipo: **Evento regular** (boda o XV años) o **Pop**.
2. Datos del cliente: nombre, correo ("Le llegará su usuario y contraseña. Si ya tiene cuenta en I attend, el evento se agrega a esa cuenta."), teléfono, URL y fecha del evento.
3. **Evento gratis**: siempre PRO ("Después de este te quedan N eventos gratis"). **Compra**: Lite o PRO, de contado o en pagos, con el descuento del planner aplicado; se paga en Stripe y el evento se crea al confirmarse el pago ("aparecerá en unos segundos en Mis clientes").
4. **"Enviar ahora" o "Enviar después"**: con "Enviar después" la invitación queda solo para el planner con el distintivo **"Por enviar"**, y se le manda al cliente cuando esté lista desde "Enviar a mi cliente" en su tarjeta. El cliente recibe sus accesos por correo; si ya tenía cuenta, el evento se agrega a ella.

El planner **sigue asignado** al evento después de enviarlo.

**Beneficios de planners** (los asigna I attend en Admin → Usuarios):
- **Eventos PRO gratis.**
- **Porcentaje de descuento** que se aplica solo en todas sus compras (créditos, planes, side events, eventos y Pops).
- **Pops gratis** (también se le pueden asignar a un cliente).

**Dashboard del planner** (`/invitations` → Dashboard): indicadores (eventos próximos, invitados confirmados, sin responder, sin mesa, side events), línea de tiempo de los próximos 5 meses, tabla "Tus eventos" con la siguiente acción de cada uno, pendientes automáticos ("N confirmados sin mesa", "N invitaciones sin enviar"…), **agenda** y **notas**. Las notas y la agenda se guardan en la cuenta (no se pierden al cambiar de computadora).

## Checkout y pagos

- **Toda compra se paga en Stripe** (página de pago de Stripe). **I attend nunca ve ni guarda la tarjeta.**
- **Solo tarjeta** en la app (no hay OXXO ni transferencia en el checkout). Un asesor puede registrar un pago por transferencia o efectivo por fuera.
- **`/checkout`**:
  1. Elegir plan.
  2. Elegir "Contado" (mejor precio) o 3, 6 o 12 pagos (solo PRO).
  3. Iniciar sesión o crear cuenta, si hace falta.
  4. Pagar en Stripe.
  5. "Estamos activando tu plan · Tu pago se confirmó. Esto toma unos segundos." → "Ya tienes {plan}". Si tarda: "Se aplica sola en unos minutos; si no, escríbenos."
- **Pagos a meses**: solo productos de $4,000 o más (PRO a pagos, $4,499; Bucket de 10 Pops). El plazo (3, 6 o 12) se elige en Stripe. En la app se dice "pagos", no "meses sin intereses".
- **Links de pago de un asesor** (`/comprar/...` o Payment Links): **no activan nada solos**. "Tu asesor de I attend te contactará para activar tu compra."
- **No hay campo de cupón.** El único descuento automático es el de los planners. Las promociones se venden como productos aparte por link.
- **I attend no emite facturas.**
- **No se hacen reembolsos.**

Precios: ver [10-planes.md](10-planes.md), [09-creditos.md](09-creditos.md) y [07-pops.md](07-pops.md).

## "Conoce I attend" (recorrido)

Un recorrido de pantallas con demos interactivas: Save the Date, lista de invitados, confirmaciones, pase digital, acomodo de mesas, side events, Photo Wall y Lia (en el contenido de respaldo, pase digital, side events, Photo Wall y Lia van marcados como "Exclusivo en PRO"). Se abre desde "Conoce I attend" en "Mis eventos", en el checkout y en `/preview`. El contenido lo administra I attend desde Admin. **No se abre solo** al registrarse.

## `/preview`

Un editor de prueba con una invitación de muestra. Los cambios se guardan en el navegador; para guardar de verdad pide crear cuenta, y entonces crea la invitación **sin plan**. Incluye una demostración de Lia con mensajes fijos (no es Lia real).

## Soporte

- Botón **Ayuda** del tablero → "Crear ticket de soporte": "Necesito ayuda", "Quiero sugerir una mejora" o "Tengo una pregunta general", más un texto. "Listo, recibimos tu ticket · El equipo de I attend te contactará por correo lo antes posible." También ofrece "Escribir por WhatsApp".
- El ticket queda guardado y llega por correo al equipo (Admin → Buzón → Reportes).
- **Contacto:** WhatsApp del asesor +52 614 368 1307 · contacto.iattend@gmail.com.
- Lia también muestra una tarjeta de soporte cuando no puede resolver algo.

## Opiniones ("Ayúdanos a mejorar")

Una tarjeta en el tablero que aparece **15 días después de crear la invitación**, si ya se publicó al menos una vez y aún no se dejó opinión. De 1 a 5 estrellas y un comentario opcional (hasta 500 caracteres). Una opinión por invitación. No tiene botón "Ahora no".

## Regala I attend

En "Explora I attend" de un cliente hay una pantalla para regalar I attend (correo, mensaje y plan Lite o PRO con su precio). **Está en desarrollo: hoy el botón "Enviar regalo" no hace nada** y no se puede regalar desde la app.

## Otras páginas

- **`/linktree`**: página pública tipo "link en bio" con invitaciones de ejemplo, WhatsApp ("Platica con nosotros"), Instagram y el sitio.
- **`/legal`**: aviso de privacidad. Resumen: los datos se usan para la cuenta, los planes, las funciones, las confirmaciones, notificaciones y soporte; el organizador puede registrar de forma opcional necesidades especiales de sus invitados (por ejemplo, alergias), que se tratan como datos sensibles; proveedores Supabase, Stripe, OpenAI, Anthropic y Google (inteligencia artificial), Meta (WhatsApp), DeepL (traducciones), Apple (Wallet) y proveedores de correo; derechos ARCO por correo, con respuesta en 20 días hábiles; los datos se eliminan o anonimizan 90 días después de cerrar la cuenta.

## Lo que NO hace / malentendidos comunes

- **"Agregué a mi pareja y no puede entrar":** los nombres de la pareja no son cuentas.
- **"Olvidé mi contraseña":** no hay opción en la app; va a soporte.
- **"Puse mal la contraseña y no pasa nada":** la app no muestra el error.
- **"Quise regalar I attend y no se envió":** la función no está terminada.
- **"Quiero la app en inglés":** no hay selector.
- **"Pagué por el link del asesor y no se activó":** esas compras las activa el asesor.
- **"El planner pierde el acceso al mandar la invitación":** no, sigue asignado.

## Preguntas frecuentes

**¿Mi pareja y yo podemos tener cada quien su cuenta?** No; una invitación tiene un solo dueño.

**¿Cómo recupero mi contraseña?** Con soporte (WhatsApp o correo).

**¿Puedo entrar con Google o Apple?** Sí.

**¿Guardan mi tarjeta?** No; la maneja Stripe.

**¿Puedo pagar con transferencia?** En la app no; con un asesor sí.

**¿Me dan factura?** No; I attend no emite facturas.

**¿Hacen reembolsos?** No.

**Soy planner, ¿mi cliente recibe sus accesos?** Sí, por correo, con usuario y contraseña.

## Pendiente de confirmar

1. Que el contenido del recorrido "Conoce I attend" en producción coincida con el descrito.
2. Plantilla y remitente del correo con usuario y contraseña que reciben los clientes de un planner.

> **Nota interna:** la página `/features` está desactualizada (dice que todas las funciones están en todos los planes); no usarla como referencia comercial. La documentación para clientes vive en `/funciones`. El catálogo de precios para asesores (`/precios/<id>`) es interno y su dirección no debe aparecer en material para clientes.

## Referencias técnicas (para soporte)

Login: `src/components/Auth/Login.jsx`; backend `controllers/auth.js`. Mis eventos: `src/pages/Board/InvitationsPage.jsx`, `PlannerLayout.jsx`. Planners: `src/pages/PlannerEvent/`, `src/components/PlannerDashboard/`; backend `controllers/planner.js`. Pagos: `src/pages/Checkout/CheckoutPage.jsx`, `src/components/Payment/functions.js`; backend `controllers/payment.js`, `router/comprar.js`, `config/stripe.catalog.js` (ver `docs/meses-sin-intereses.md`). Soporte: `src/modules/Header/SupportTicketModal.jsx`. Opiniones: `src/components/FeedbackPrompt/` (ver `docs/reviews-feedback.md`). Regalo: `src/components/RegalaIAttend/RegalaIAttend.jsx`. Legal: `src/pages/Extras/Legal/LegalPage.jsx`.
