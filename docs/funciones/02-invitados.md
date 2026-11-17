# 2. Invitados y envíos por WhatsApp

> Revisado contra el código el 16 de noviembre de 2026 (app del organizador, página del invitado y backend, incluido el proceso que manda los WhatsApp). Las notas marcadas **Nota interna** son para el equipo y no deben copiarse al material del cliente.

## Resumen para quien tenga prisa

- **Cada invitación por WhatsApp es un mensaje individual**, con el nombre del invitado y su link personal. Sale del número de WhatsApp de I attend.
- **Hoy no existe un botón de "enviar a todos" para las invitaciones.** El organizador toca **"Enviar invitación" en cada familia**, una por una. Ese envío es automático en el sentido de que I attend arma y manda el mensaje solo, pero cada uno lo dispara el organizador.
- Los **recordatorios** sí se pueden mandar a muchos invitados de una vez, pero el servidor los envía **uno por uno, en fila y a un ritmo controlado** (nunca más de 2.5 mensajes por segundo), no todos al mismo instante.
- Cuesta **1 crédito por familia** (por titular). Reintentar un envío que no se entregó es gratis.
- Solo números de **México (+52)** y solo con plan **PRO**.

El detalle completo está en [Envíos por WhatsApp: cómo funcionan realmente](#envíos-por-whatsapp-cómo-funcionan-realmente).

## Qué es

La pantalla **Invitados** (`/dashboard/guests`) es donde el organizador arma su lista, manda la invitación (o la marca como enviada), ve quién confirmó, asigna mesas y manda recordatorios.

## Quién lo puede usar

- Lite y PRO (Paperless no muestra Invitados en el tablero).
- Lo que **requiere PRO**:

| Función | Sin PRO |
|---|---|
| "Enviar invitación" por WhatsApp | Botón bloqueado con la etiqueta PRO |
| Importar desde Excel con Lia (y la plantilla) | Bloqueado con la etiqueta PRO |
| Recordatorios masivos | "Los recordatorios masivos son parte del plan PRO." |
| Lector de pases | Bloqueado con la etiqueta PRO |

- **Funciona en cualquier plan:** agregar invitados uno por uno, "De otro evento", "Copiar link", marcar como invitado a mano, fecha límite, descargables, mapa de mesas y evento público o privado.
- En computadora y celular. La vista Compacta solo existe en computadora.

## Cómo se organiza la pantalla

Dos formas de verla (selector con íconos, se recuerda en el navegador):

- **Pasos:** una escalera con **Seguimiento · Por invitar · Esperando respuesta · Confirmados · No asistirán**.
- **Compacta** (solo computadora): una tabla con todos los invitados y columnas Nombre, Estado, Teléfono, Código, Grupo, Mesa, Etiqueta, Prioridad, WhatsApp, Enviado, Última acción y Llegada. Se ordena tocando la columna.

### Seguimiento (la primera pestaña)
Cambia según el avance:
- Sin invitados: "Empieza por tus invitados".
- Con invitados sin invitar: "N invitados listos para recibir su invitación" y "Crear envío" (hoy solo lleva a Por invitar).
- Con actividad:
  - **"Qué hacer hoy"**: invitaciones que no se entregaron ("Reintentar envío"), invitados que "Leyeron su invitación y no contestaron" ("Enviar recordatorio") e invitados "sin número mexicano" ("Corregir").
  - Confirmados contra lugares disponibles, avance de confirmaciones por día y un embudo: Creados → Invitados → Entregados → Leídos → Confirmados → No asisten ("Entregados y Leídos solo cuentan los envíos hechos desde la plataforma").
  - Widget de mesas.
  - Tarjeta "Que Lia se encargue": **todavía no hace nada**; abre un aviso "Muy pronto en I attend".

## Agregar invitados

El botón **Nuevo invitado** abre tres opciones:

### Individual ("Agrega uno a la vez")
Panel con:
1. **Nombre** (obligatorio) y **teléfono** (opcional). La lada se elige de una lista; México (+52) viene por defecto. El número acepta 10 dígitos.
2. **Prioridad** A · B · C · D (A = "Tiene que estar sí o sí", B = "Muy importante", C = "Deseable", D = "Opcional"), con el botón **Calcular**: un cuestionario corto ("¿Quieren que esté sí o sí?", "¿Qué tan cercanos son hoy en día?", "¿Están de acuerdo los dos?", "¿Hay compromiso o presión externa por invitarlo?") que sugiere la prioridad.
3. **Etiqueta** (las de la invitación; "+ Nueva" crea una ahí mismo).
4. **Lado** (solo si la invitación tiene anfitriones).
5. **Categoría**: Mujer · Hombre · Niño/a · Indefinido.
6. **Estado** (solo al editar).
7. **Nota**.
8. **Acompañantes** (ver abajo).

Al agregar, el panel se queda abierto y vacío para seguir capturando. Todo invitado nuevo queda en **Por invitar** con un **código** propio de 7 caracteres (formato `XXX-XXX`).

Borrar a un titular **borra también a sus acompañantes** (pide confirmación).

### Desde Excel, con Lia (solo PRO)
1. **"1 · Descarga la plantilla"** (opcional, "para un resultado más preciso").
2. **"2 · Arrastra tu Excel aquí"**. Acepta .xlsx, .xls, .csv, .ods, .numbers y texto pegado de Google Sheets.
3. Si el archivo tiene varias hojas, pregunta cuál. Se salta títulos que estén arriba del encabezado.
4. Lia identifica qué columna es cada dato ("Lia entendió tus columnas"; se puede corregir con "Cambiar").
5. Revisión con pestañas: Por revisar · Todos · Repetidos en el archivo · Ya en tu lista · No se importan. El botón **"Arreglar N"** pone +52 a celulares de 10 dígitos sin lada, nombra a los acompañantes genéricos ("+1 de {titular}") y une repetidos.
6. Importar.

Reglas:
- Máximo **3,000 filas** por archivo ("El archivo tiene más de 3,000 filas. Divídelo en partes.").
- Quien **ya está en la lista** (mismo teléfono o mismo nombre) queda fuera desde el inicio.
- Sin nombre no se importa.
- La columna "Acompaña a" liga a cada acompañante con su titular por nombre exacto.
- **Privacidad:** "Lia solo ve los nombres de tus columnas y unas filas de ejemplo para entender el archivo; tu lista completa no sale de I attend." (Encabezados, hasta 6 filas de muestra y los valores de las columnas tipo categoría.) Si la IA no responde, la app acomoda las columnas por su nombre.
- No gasta créditos.

### De otro evento (cualquier plan)
"Trae invitados de tus bodas, side events o Pops". Lista los otros eventos del organizador que tienen invitados.
- Trae nombre, teléfono, etiqueta, categoría, prioridad, lado, notas, menú y quién acompaña a quién.
- **No trae mesa ni respuesta**: todos llegan como Por invitar, con código nuevo.
- Quienes no asistirán al evento de origen y quienes ya están en la lista vienen desmarcados.
- Si no hay otros eventos: "Aún no tienes otros eventos en I attend".

## Acompañantes

- Se agregan con − / + en el panel del titular, con nombre y teléfono opcionales (sin nombre quedan como "Acompañante de {titular}"). No hay tope en el panel.
- **Heredan** del titular la etiqueta, el lado y la categoría mientras no se cambien. **La prioridad siempre es la del titular.**
- **Solo el titular recibe el WhatsApp.** Sus acompañantes pasan con él a Esperando respuesta. Texto de la app: "Cada bloque se envía completo: el titular y sus acompañantes van en el mismo WhatsApp."
- El titular confirma o rechaza por cada acompañante desde su link.
- Cada acompañante tiene su propio código y su propio "Copiar link".

## Los pasos y sus acciones

### Por invitar
Cada tarjeta muestra nombre, teléfono, código (se copia con un clic), etiqueta, prioridad, **Copiar link** y dos acciones:
- **"Enviar invitación"** (WhatsApp). Ver la sección de WhatsApp.
- **✓ "Marcar como invitado"**: "pasará a Invitación enviada sin envío de WhatsApp". No manda nada ni gasta créditos; mueve al titular y sus acompañantes a Esperando respuesta. Disponible en cualquier plan.

### Esperando respuesta
- Cada tarjeta muestra el estado del WhatsApp: **Procesando · Enviado · Entregado · Leyó y no contestó · No se entregó · Enviado manual**, y hace cuánto.
- Avisos: "N no se entregaron — Número incorrecto o sin WhatsApp" y "Leyeron y no contestaron".
- Acciones: **"Reintentar"** si no se entregó (gratis) o **"Recordar"** (recordatorio individual) en los demás casos. A los que se marcaron a mano no se les ofrece Recordar.

### Confirmados
- "N confirmados siguen sin mesa", con "Ver acomodo" y "Asignar mesas".
- Acción **"Asignar mesa"** (selector con la ocupación de cada mesa).

### No asistirán
"Liberaron N pases. Puedes usarlos con alguien más de tu lista."

### Herramientas comunes
- Buscador, **Filtros** (etiqueta, mesa, prioridad, categoría, lado) y **Ordenar por**.
- Casilla en cada tarjeta para armar una selección y mandarle un recordatorio.
- Menú **"⋯"**: Descargables, Mapa de mesas, Evento público / privado y Lector de pases (PRO).

## Estados del invitado

| Estado | En pantalla | Significa | Quién lo cambia |
|---|---|---|---|
| Creado | Por invitar | Capturado, sin invitación | Al agregarlo, importarlo o traerlo de otro evento |
| Esperando | Esperando respuesta | Ya se le mandó la invitación | La app al enviar el WhatsApp o al marcarlo a mano |
| Confirmado | Confirmados | Dijo que sí | **El invitado** desde su link; el registro en una invitación pública; el organizador a mano; Lia con aprobación |
| Rechazado | No asistirán | Dijo que no | El invitado; el organizador a mano; Lia con aprobación |
| Asistente | Cuenta como confirmado ("Llegó") | Llegó al evento | El lector de pases |

El organizador puede cambiar el estado al editar al invitado (Por invitar · Esperando · Confirmado · Declinó).

**Contestar el WhatsApp no cambia el estado.** Si el invitado responde "sí voy" en el chat, ese mensaje llega al buzón, pero el invitado sigue en Esperando hasta que confirme en su link o el organizador lo cambie a mano.

## Fecha límite para confirmar

- Sin fecha aparece: "Define la fecha límite para confirmar — Sin fecha límite no puedes enviar recordatorios por WhatsApp".
- Debe ser una fecha futura y no puede pasar de la fecha del evento.
- Si existe, el WhatsApp de invitación la menciona.
- **No cierra la confirmación**: el invitado puede confirmar o cambiar su respuesta después de esa fecha.

## Descargables (Excel)

Menú "⋯" → Descargables: Lista de espera · Esperando respuesta · Confirmados · No asistirán. El Excel lleva el diseño de I attend, una hoja de invitados (nombre, teléfono, estado, mesa, etiqueta, lado, prioridad, categoría, acompaña a, menú, necesidades, notas y código) y una hoja de mesas. **No incluye los links personales**, solo el código.

## Recordatorios

Se abren con el botón **Recordatorios** del encabezado (en computadora), desde "Qué hacer hoy" o con la casilla de las tarjetas.

1. Se elige un mensaje del **banco de recordatorios** (hoy: "Confirma tu asistencia", "Hoy es el día" y "Cambio de cuenta bancaria"). Son plantillas aprobadas por Meta que administra I attend.
2. Se eligen los destinatarios: Todos · Esperando respuesta · Leyeron y no contestaron · Confirmados · Confirmados sin mesa, con reglas por estado, etiqueta, lado, prioridad, mesa o si leyó. Vienen todos marcados; se desmarca a quien no.
3. Se envía. Abajo aparece el avance del envío.

Reglas:
- Solo titulares con número **+52**. Los acompañantes no lo reciben.
- **1 crédito por titular**, solo PRO.
- Máximo 500 titulares por envío.
- A quien ya recibió **ese mismo** recordatorio en las últimas 20 horas no se le vuelve a mandar ("Ya lo recibió hoy").
- Un recordatorio no cambia el estado del invitado.
- Si se necesita un mensaje que no está en el banco, "Solicitar recordatorio" crea una solicitud para I attend.

**Recordatorio individual** ("Recordar" en Esperando respuesta): necesita fecha límite y número +52; máximo **uno al día por invitado**; 1 crédito.

## Buzón de WhatsApp

Ícono de globo en el encabezado del tablero, con el número de mensajes sin leer.

- Llegan ahí las respuestas que los invitados escriben al WhatsApp de la invitación: texto, fotos, video, audio, documentos, stickers y ubicación.
- Se puede **contestar con texto** desde el buzón. **Es gratis.**
- **Solo dentro de las 24 horas** siguientes al último mensaje: "Tienes 24 horas para responderle desde que te escribió. Siempre podrás responder directamente desde tu cuenta de WhatsApp." Pasado ese tiempo, el campo para escribir se bloquea. (Es una regla de WhatsApp para las empresas.)

---

## Envíos por WhatsApp: cómo funcionan realmente

Esta sección existe porque un cliente entendió que los envíos eran masivos e instantáneos con un clic. **No lo son.** Así funcionan:

### Quién envía y desde dónde
- Los mensajes salen del **número de WhatsApp Business de I attend** (a través de la plataforma oficial de WhatsApp de Meta), no del WhatsApp personal del organizador.
- Cada mensaje es una **plantilla aprobada por Meta**, con datos de cada invitado: la imagen de la invitación, el título y la fecha del evento, **el nombre del invitado**, la fecha límite (si hay) y un botón que abre **su link personal**. Nadie recibe un mensaje genérico ni el link de otra persona.
- I attend usa plantillas de las dos categorías que define Meta: **marketing** y **utilidad**. La plantilla del reintento ("Reintentar") es de utilidad. A los mensajes de marketing Meta puede decidir no entregarlos a algunas personas (por ejemplo, si ya recibieron muchos mensajes de empresas); en ese caso el envío aparece como "No se entregó" y se puede reintentar gratis.
- La plantilla siempre está en español. Si la invitación tiene otros idiomas, el organizador elige en qué idioma se abre el link, pero el texto del WhatsApp no cambia.

### Envío de la invitación: uno por uno
1. En **Por invitar**, el organizador toca **"Enviar invitación"** en la tarjeta de una familia.
2. La app revisa que se pueda enviar:
   - plan **PRO**;
   - número con lada **+52** ("Solo puedes hacer envíos nacionales");
   - al menos **1 crédito**;
   - la invitación tiene sus datos completos (nombre, anfitriones, tipo de evento y teléfono) y la portada tiene título ("Tu invitación no tiene título. Agrégalo antes de enviarla.").
3. I attend manda ese **único mensaje** a Meta.
4. Si Meta lo acepta, se descuenta **1 crédito** y el invitado (con sus acompañantes) pasa a **Esperando respuesta**. Si Meta lo rechaza en ese momento, no se cobra.
5. Para la siguiente familia, se repite: otro clic, otro mensaje.

**No hay confirmación intermedia ni selección masiva**: cada clic manda un mensaje. El código tiene preparada una función de "enviar a todos" para invitaciones, pero hoy está **apagada**; por eso el botón "Crear envío" de Seguimiento solo lleva a la lista Por invitar.

### Recordatorios: un lote que sale uno por uno
Cuando el organizador manda un recordatorio a muchos titulares:
1. La app crea un **lote** en el servidor y aparta los créditos (1 por titular).
2. El servidor toma los mensajes **de uno en uno, en orden**. Después de cada envío lo registra, actualiza el contador y **espera 0.4 segundos** antes del siguiente. Es decir, **nunca más de 2.5 mensajes por segundo**, y en la práctica algo menos.
3. Si Meta avisa que se está enviando demasiado rápido, el servidor **hace una pausa de 30 segundos** y vuelve a intentar ese mensaje (hasta 3 veces).
4. Si el servidor se reinicia a mitad del lote, al volver **retoma donde se quedó**.
5. Al terminar, el lote se cierra y **se devuelven los créditos de los mensajes que Meta rechazó**.
6. Mientras tanto, la app muestra el avance ("Enviando…", enviados y fallidos). Solo puede haber un lote a la vez ("Espera a que termine el envío en curso.").

### Estados de cada envío
| Estado en la app | Qué significa |
|---|---|
| Procesando | I attend ya lo mandó; Meta aún no confirma |
| Enviado | Meta lo envió |
| Entregado | Llegó al teléfono del invitado |
| Visto / Leyó y no contestó | El invitado lo abrió (si tiene activadas las confirmaciones de lectura) |
| No se entregó | Meta no pudo entregarlo: número incorrecto, sin WhatsApp u otro motivo de Meta |
| Enviado manual | Se marcó con ✓; no hubo WhatsApp de por medio |

Estos estados los informa Meta conforme pasan; pueden tardar segundos o más.

### Costos y devoluciones
| Acción | Costo |
|---|---|
| Enviar invitación | 1 crédito por titular (acompañantes incluidos) |
| Reintentar un envío que "No se entregó" | **Gratis** ("Un reintento no consume créditos") |
| Recordatorio (individual o en lote) | 1 crédito por titular |
| Contestar en el buzón | Gratis |

- Si Meta **rechaza el mensaje en el momento** del envío, no se cobra (envío individual) o se devuelve el crédito al cerrar el lote (recordatorios en lote).
- Si Meta **lo acepta y después** informa que no se pudo entregar ("No se entregó"), el crédito **no se devuelve solo**; para eso existe el reintento gratis.
- Gastar un crédito paga el intento de envío; no garantiza que el invitado lo lea ni que conteste.

### Qué no se puede hacer
- **Números fuera de México** (sin +52): no se pueden enviar desde I attend. Hay que copiar su link y mandarlo a mano, y luego marcarlo con ✓. En "Qué hacer hoy" aparecen como "sin número mexicano".
- **Enviar sin PRO**: en Lite el camino es "Copiar link" + ✓.
- **Elegir el texto del mensaje**: la invitación y los recordatorios usan plantillas fijas aprobadas por Meta. El organizador no escribe el texto (salvo las respuestas del buzón dentro de las 24 horas).
- **Mandar desde el número del organizador**: siempre sale del número de I attend.
- **Que el invitado confirme contestando el WhatsApp**: confirma en su link.

### Preguntas frecuentes sobre WhatsApp

**¿Los envíos son masivos?** No. Cada mensaje es individual, con el nombre y el link de cada invitado. Las invitaciones se mandan con un clic por familia. Los recordatorios se pueden pedir para muchos invitados a la vez, pero el servidor los envía uno por uno, a un ritmo controlado.

**¿Por qué tardan en aparecer como "Entregado"?** Ese estado lo informa WhatsApp (Meta) cuando el teléfono lo recibe; si el teléfono está apagado o sin conexión, se queda en "Enviado".

**Me cobró y dice "No se entregó".** Usa "Reintentar", que es gratis. Si el número está mal, corrígelo primero.

**¿Puedo invitar a alguien de Estados Unidos?** No por WhatsApp desde I attend. Copia su link y mándaselo tú.

**El invitado me contestó por WhatsApp que sí va, pero sigue en Esperando.** Contestar el chat no lo confirma. Pídele que confirme en su link o cámbialo tú a Confirmado.

**¿Puedo responderle?** Sí, desde el buzón, dentro de las 24 horas siguientes al último mensaje. Después, desde tu propio WhatsApp.

### Pendiente de confirmar (WhatsApp)
1. **Límite diario de Meta del número de I attend** (el "nivel de mensajería" que Meta asigna al número): no está en el código. Define cuántos invitados distintos se pueden contactar en 24 horas en total.
2. **Categoría de cada plantilla:** se usan marketing y utilidad (confirmado el 16 de noviembre de 2026); falta saber cuáles son de marketing (en el código solo consta que la de reintento es de utilidad).
3. **Texto exacto de las plantillas y del botón**: vive en Meta (WhatsApp Manager), no en el código.
> **Nota interna (por corregir):** la app cuenta la ventana de 24 horas del buzón desde el último mensaje de cualquiera de los dos lados, mientras que WhatsApp la cuenta desde el último mensaje **del invitado**. Si el organizador contesta cerca del límite, la app lo deja escribir cuando WhatsApp ya no lo permite y el mensaje falla.

> **Nota interna:** el bloqueo por plan (PRO) de envíos, recordatorios e importación existe solo en la app; el backend no revisa el plan. El lote de recordatorios acepta hasta 500 titulares por envío.

---

## Lo que NO hace / malentendidos comunes

- **No hay "enviar invitación a todos" hoy.** Se manda una por una.
- **Marcar como invitado (✓) no manda nada**: solo cambia el estado.
- **Los acompañantes no reciben su propio WhatsApp.**
- **"Que Lia se encargue" todavía no hace nada.** Lia sí puede, desde su chat, proponer cambios de estado o de mesa que el organizador aprueba (ver [11-lia.md](11-lia.md)).
- **Entregado / Leído solo existe para envíos hechos desde I attend.**
- **El estado "Llegó" no se elige a mano**; lo pone el lector de pases.
- **La fecha límite no cierra la confirmación.**
- **"De otro evento" no copia mesas ni respuestas.**
- **El Excel de descarga no trae los links personales.**

## Preguntas frecuentes

**¿Puedo mandar la invitación sin WhatsApp?** Sí: "Copiar link", lo mandas por tu cuenta y luego tocas ✓.

**¿Por qué no puedo tocar "Enviar invitación"?** Puede ser porque no tienes PRO, el número no es +52, no tienes créditos, o falta información de la invitación o el título de la portada.

**¿Mis invitados pueden cambiar su respuesta?** Sí, desde su link. Tú también puedes cambiarla editando al invitado.

**¿Mis invitados pueden agregar acompañantes?** En una invitación privada no: los defines tú. En una pública, quien se registra puede agregar hasta 10.

**¿Cuál es el código del invitado?** Los 7 caracteres (`XXX-XXX`) que aparecen en su tarjeta. Sirve para entrar a una invitación privada.

**¿Lia ve toda mi lista al importar?** No: solo los encabezados, hasta 6 filas de ejemplo y los valores de las columnas de categoría.

**¿Puedo importar más de 3,000 invitados?** No en un solo archivo; divide la lista.

## Pendiente de confirmar

1. **Recordatorios en el celular:** el botón Recordatorios del encabezado es de computadora; no se verificó cómo se llega desde el celular.

> **Nota interna (por corregir):** en Confirmados, el aviso dice "Cada grupo se sienta junto: al asignar al titular, sus acompañantes van con él", pero "Asignar mesa" desde la tarjeta solo sienta a esa persona, y a un acompañante sin mesa se le muestra la mesa del titular. Mientras se corrige, para sentar a una familia completa usar el panel de la mesa ("Sentar N en la Mesa #N").

> **Nota interna (para el equipo técnico):** el código del invitado es aleatorio y no se revisa que sea único, y la página del invitado lo busca sin filtrar por invitación. Al cambiar el estado a mano no se actualiza la fecha que usa la gráfica de avance de confirmaciones.

## Referencias técnicas (para soporte)

App: `src/modules/GuestManagement/GuestsPage.jsx` (envío individual `onSedingInvitation`, recordatorio `onSendReminder`, constante `SHOW_BULK_SEND = false`), `src/components/Create/GuestsCRUD.jsx`, `src/modules/GuestManagement/Importar/`, `Reminders/` (ver `docs/recordatorios.md`), `WhatsappMessages/`. Backend: `controllers/whatsapp.js`, `services/whatsappBulkWorker.js` (ritmo `SEND_INTERVAL_MS = 400`, pausa de 30 s, 3 reintentos, devolución de fallidos), `controllers/reminderTemplates.js`, `controllers/whatsappWebhook.js` (estados de Meta y mensajes entrantes). Tablas: `invitation_message_dispatches`, `invitation_send_batches`, `invitation_send_batch_items`, `invitation_reminder_dispatches`, `whatsapp_incoming_messages`.
