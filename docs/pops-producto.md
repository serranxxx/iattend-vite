# Pops — resumen del producto

> Documento interno (no se publica en `/funciones`). Armado el 22 de noviembre de 2026 a partir del código de los tres repos, `CLAUDE.md` y `docs/funciones/07-pops.md`. La guía para clientes y soporte sigue siendo `docs/funciones/07-pops.md`; los precios vienen de Stripe y de la landing (`iattend-next/src/components/Pops/data.ts`) y pueden cambiar.

## 1. Qué es

Un **Pop** es un evento rápido e independiente, sin boda detrás: un brunch, una cena, una posada, una junta de ventas, una masterclass. Lema: **"Para lo que surja, Send a Pop."**

- Es una invitación digital completa con su propia página para el invitado, su lista de invitados, sus envíos por WhatsApp, sus pases y su espacio de archivos.
- Se arma en minutos en un editor visual, como una historia de Instagram con superpoderes: fotos, stickers, dibujos, efectos, itinerario, formulario y chat.
- Antes se llamaba **"Evento Flash"**. Lo ya guardado sigue diciendo `flash` a propósito (columnas, RPC, lookup key `flash_event`, carpetas `flash-<id>`).
- Técnicamente es un `side_events` **sin** `invitation_id`, con dueño propio (`user_id` / `planner_id`).

## 2. Para quién

| Quién | Qué hace con los Pops |
|---|---|
| **Planners** (cliente principal) | Los compran y los crean para sí, para un cliente ("A mi cliente": se le crea la cuenta y le llegan sus accesos) o para mandarlos después ("Enviar después"). Pueden tener **Pops gratis** y **% de descuento** en `planner_benefits`. |
| **Clientes** (novios u otros) | Solo crean Pops si I attend les asigna **Pops gratis** (Admin → Usuarios). No los compran en la app. Un cliente que solo tiene Pops entra directo al espacio Pops. |
| **Administración** | Lo mismo que un planner, más "Crear sin costo". |
| **Invitados** | Abren el link, confirman, ven su pase, llenan el formulario, ven quién va y platican en el chat. |

Puede editar un Pop su dueño, su planner asignado o Administración.

## 3. Precio y cómo se compra

| Producto | Precio | Notas |
|---|---|---|
| **1 Pop** | **$549 MXN** | Pago único. Para lo que surja hoy. |
| **5 Pops** | **$2,249** ($450 / Pop) | El paquete para la temporada; ahorras $496. |
| **10 Pops** | **$4,000** ($400 / Pop) | "Desde $333 / mes": hasta 12 pagos (MSI) o de contado. Ahorras $1,490. |
| Créditos extra de WhatsApp | 50 por $150 · 100 por $200 · 200 por $300 | Solo para ese Pop (botón "+" del contador). |
| Más espacio | 20 o 30 MB | Se paga con créditos del Pop (5 créditos por MB). |

- **Cada Pop incluye:** la página con su editor, invitados, **30 créditos de WhatsApp** (30 envíos) y **10 MB** de archivos.
- **Compra en la app:** el panel "Nuevo Pop" (`PlannerPopFlow`) sigue los pasos Para quién → Datos (nombre, fecha, hora) → Pago (Stripe, o "Usar un Pop gratis") → **¡Pop!** → Abrir editor. Un Pop pagado aparece cuando Stripe lo confirma; nace privado, con 30 créditos y sin diseño.
- **Paquetes:** se venden por link (catálogo de precios `/precios/<id>` o `/comprar/:clave`) y **los activa un asesor a mano**: se suman como Pops gratis en Admin → Usuarios.
- **Descuento de planner:** el backend lo aplica reconociendo la sesión.

## 4. Dónde vive en la app

- **`/invitations` → espacio Pops** (selector Weddings / Pops en el logo). Tiene su propia estética, **"Collage azul · lima"**, para todos.
  - **Inicio:** banner con collage de temporada, 4 pasos ("Dale estilo", "Arma tu evento", "Mándala fácil", "Recibe confirmaciones") con un video de 1 minuto, y casos de uso.
  - **Clientes** y **Mis Pops**, en tabla. Mis Pops filtra Todos / Activos / Borradores (borrador = Pop sin invitados). Se ven los confirmados de cada Pop.
  - **"Conoce los Pops":** video promocional de onboarding.
- **Editor:** `/dashboard/side?pop=<id>`.
- **Landing pública** (iattend-next): sección Pops con pasos, casos, precios y "Send a Pop".
- **Admin:** Pops gratis por usuario, ventas (`ventas.plan = 'Flash'`, en pantalla "Pop") y catálogo de precios.

## 5. El editor

Es el mismo editor de la invitación de boda y de los side events, en su modo Pop: riel de herramientas, la pieza al centro, barras contextuales arriba, Capas a la derecha y dock abajo.

**Se guarda solo.** El autoguardado es de 5 s (1.5 s si hay alguien más dentro) y ⌘S guarda al instante. Si se edita en otra pestaña u otro dispositivo no se pisa: se mezcla campo por campo.

### Diseño
- **Color del tema** con el selector estilo iOS.
- **Estilo de bloques:** vidrio, hielo, noche, papel, tema, sticker (con color propio), contorno o recorte.
- **Velo y desenfoque** de la portada.
- **Efectos animados:**
  - Brillos, confeti, burbujas, nieve o pétalos, con intensidad y color: tema, blanco, dorado, multicolor o uno propio.
  - **Mis PNG:** los PNG o stickers del organizador como partículas que caen, suben o laten, con tamaño de hasta 200 %.

### Portada
- De **1 a 6 fotos o videos**: con uno es fondo fijo; con varios, carrusel con fundido.
- Ajuste de encuadre y zoom.
- El **título** se acomoda en una cuadrícula de 3 × 3 y arrastra con él la fecha y el lugar.
- **Canción**, con la misma píldora de la invitación.

### Elementos
- Textos sueltos con la misma barra que el título, íconos, formas, líneas, decoraciones y PNG.
- Máximo **12 imágenes y 40 elementos**; los dibujos no cuentan.
- Se pueden **anclar** (suben con el scroll en lugar de quedarse en la portada), **agrupar** (⌘G) y ordenar en Capas.

### Dibujar
- A pantalla completa sobre la pieza: pluma, marcador, resaltador, lápiz, neón y borrador, con grosor y opacidad.
- Pluma de selección (lazo) para mover trazos.
- Gestos de iPad como Freeform.
- Los trazos se anclan a la foto, a una foto del carrusel o a una tarjeta.

### Tarjetas de la página
Van agrupadas bajo etiquetas y se pueden reordenar. Se prenden y apagan en Capas; las que no tienen datos salen apagadas con "Agregar…".

- **Información:**
  - **Itinerario:** barra del día en vivo con los estados pasado / ahora / siguiente; varios días; tarjeta especial cuando hay un solo momento.
  - **Notas.**
- **Ubicación:** mapa más clima (automático o siempre).
- **Acceso** (Pop en línea; ver la sección 7).
- **Asistentes:** lista de quién confirmó, con avatares de emojis o iniciales, y **chat**.
- **Patrocinadores:** logos por categorías (grande / mediano / chico) en tres acomodos: en la portada, tarjeta o banda.
- **Formulario** (ver la sección 7).

### Compartir y link
- **Imagen del link** (cómo se ve en WhatsApp): automática con la portada y sus elementos, o una propia.
- **Compartir:** la portada, un QR animado y "Copiar link".
- El link es `iattend.events/side-event/<código de 10 caracteres>`, para que no se pueda adivinar.
- **Público o privado** (candado):
  - Privado: cada invitado entra con su código.
  - Público: cualquiera con el link se registra con su nombre, con **"Permitir acompañantes"** (hasta 10).

### Pase digital
- Boleto con QR, folio o código, personas y foto.
- **Apple Wallet** opcional, con notificación de bienvenida al llegar.

### Ver en vivo
La página real en iPhone, iPad o Mac, como un invitado **Sin confirmar** o **Confirmado**.

### Trabajar en equipo
- Presencia tipo Figma: si el planner y su cliente tienen el Pop abierto a la vez, cada uno ve los **cursores** del otro sobre la pieza y lo que tiene elegido.
- Cada persona aparece como un **emoji** con su color, sin nombres, y como avatares en la barra.
- Lo que guarda uno le llega al otro sin recargar.

### Personalización del editor
- **Estilo del editor** (I attend · Pop · Business · Craft): solo el cromo; la página del invitado no cambia.
- **Emoji del Pop:** identifica al Pop en la lista; el invitado no lo ve.

### Celular
- Editor propio con la pieza al centro y footer flotante tipo Safari.
- Drawers con los mismos paneles, Dibujar a pantalla completa, Ver en vivo, Compartir y autoguardado.
- No reordena tarjetas ni elige emoji.

## 6. La experiencia del invitado

1. **Le llega el link**, por WhatsApp desde I attend (1 crédito por envío), copiado a mano o, si el Pop es público, un solo link para todos.
2. **Portada a pantalla completa:** fotos o video, efectos, stickers, dibujos y canción; título, fecha y lugar; botones **Asistiré / No asistiré**.
3. **Confirma.** En un Pop público se registra con su nombre y sus acompañantes. Hay confeti.
4. **Ya confirmado:**
   - **"Ver mi pase"**: boleto con QR (+ Apple Wallet).
   - El **formulario**, si existe, llega como notificación; si es obligatorio, no se puede cerrar hasta responderlo.
   - La **lista de asistentes** y el **chat** con los demás confirmados.
   - Itinerario en vivo, mapa y clima, o el **acceso** si es en línea.
5. **El día del evento:** el organizador escanea su pase o marca su llegada.

En iPad y Mac la portada es a pantalla completa y las tarjetas van en mosaico de dos columnas. El formulario, el pase y el chat se abren en un panel lateral.

## 7. Funciones propias del Pop

| Función | Qué hace |
|---|---|
| **Formularios** | El organizador crea los suyos y los guarda en **Mis formularios**; al Pop llega una copia. Hay 10 tipos de pregunta. Se responde por persona o por grupo, con folio (`REG-0001`), "responder después" y obligatorio. Las respuestas llegan en vivo y se bajan en Excel o CSV. Solo responden los confirmados. |
| **Lista de asistentes** | Solo primer nombre, iniciales y avatar, nunca teléfonos ni códigos. Cada pase se agrupa con sus acompañantes. |
| **Chat de invitados** | Solo para los confirmados. Mensajes de hasta 500 caracteres, reacciones, "en línea" / "escribiendo" y mensaje fijado del organizador. El organizador modera: borra y puede deshacer. |
| **Pop en línea** | Para Zoom, Meet, YouTube u otro enlace: ID y código, estado en vivo de YouTube por la hora y zona horaria propia. Material (links o archivos de hasta 20 MB en un bucket privado). "Solo para confirmados" oculta el acceso hasta confirmar. |
| **Patrocinadores** | Logos PNG o SVG en categorías, color adaptado al diseño u original, cinta en movimiento o fija. |
| **Buzón de WhatsApp** | Las respuestas de los invitados a la invitación del Pop; contestar es gratis dentro de 24 h. |
| **Lector de pases** | `/scanner` con la clave propia del Pop. Registra la hora de llegada y manda la bienvenida en Wallet. |
| **Importar invitados** | Solo "De otro evento" (sus bodas, side events y otros Pops). **Sin Excel.** |

## 8. Límites

| Concepto | Valor |
|---|---|
| Créditos incluidos | 30, solo de ese Pop (no usa los de la boda) |
| WhatsApp | Solo números +52 (México) |
| Espacio | 10 MB, ampliable a 20 o 30 MB |
| Elementos | 12 imágenes / 40 elementos (sin contar dibujos) |
| Portada | Hasta 6 fotos o videos |
| Efecto Mis PNG | Hasta 6 imágenes |
| Chat | 500 caracteres por mensaje |
| Registro público | Hasta 10 acompañantes |
| Lista de asistentes | Hasta 300 personas |

## 9. Lo que NO tiene (a propósito o todavía)

- No tiene **Lia**, **mesas**, **Photo Wall**, **Save the Date** ni **recordatorios**.
- No **importa desde Excel**: solo "De otro evento".
- **No se borra** desde la app.
- Un **cliente no compra** Pops en la app; solo usa los gratis que le asignen.
- Los **paquetes** comprados por link no se activan solos: los activa un asesor.
- El formulario **obligatorio** solo lo exige la página del invitado, no el backend.
- **Edición simultánea:** si dos personas cambian el mismo campo a la vez (por ejemplo, los elementos de la portada, que son un solo campo), gana el último que guarda.

## 10. Diferenciadores (para venta)

- **Rápido:** listo en minutos y en el celular.
- **Expresivo:** stickers, dibujo a mano, efectos con tus propios PNG, estilos de bloque y carrusel con video. Se siente más como una historia de Instagram que como una invitación formal.
- **Conecta a los invitados:** lista de asistentes y chat entre confirmados.
- **Operativo:** pases con Apple Wallet, lector en la puerta, formularios con folio, WhatsApp con buzón y patrocinadores. Sirve también para eventos de marca, masterclasses y eventos en línea.
- **Pensado para planners:** se hacen para clientes, se mandan después, se colabora en vivo con el cliente y hay paquetes con descuento.

## 11. Pendientes y temas abiertos

- **Escaneo del QR de un Pop en el lector:** la guía de clientes del 16 de noviembre lo marca "en desarrollo", pero el lector ya reconoce los QR `side:<id>`. Hay que confirmar su estado y actualizar `docs/funciones/07-pops.md`.
- **Realtime de `side_events`:** no emite eventos (la tabla no está en la publicación). Los cambios en vivo entre editores dependen del aviso por el canal de presencia.
- **Editor del celular:** le faltan reordenar tarjetas, el emoji, ajustar la foto de fondo y el carrusel con videos.
- **Pop en línea:** falta confirmar con la API de YouTube si la transmisión ya empezó, y el modo híbrido.
- **Mezcla más fina** de los elementos al editar entre dos personas (elemento por elemento).
- La guía `docs/funciones/07-pops.md` es del 16 de noviembre: no incluye la presencia, el color propio de los efectos ni "Mis PNG".

## 12. Referencias técnicas

- **Crear:** `src/pages/PlannerEvent/PlannerPopFlow.jsx`, `PlannerEventDrawer.jsx`.
- **Sección Pops:** `src/pages/Board/PopsInicioAzul.jsx`, `PopsAzul.jsx`, `PlannerLayout.jsx`, `EspacioSelector.jsx`.
- **Editor:** `src/modules/SideEvents/` (`SideEvents.jsx` en modo Pop, `Workspace/`, `SideCanvas.jsx`, `Movil/`, `Formularios/`, `Acceso/`, `Presencia/`, `Patrocinadores/`) y `src/modules/Editor/`.
- **Página del invitado:** `iattend-events/src/components/SideEvent/`.
- **Backend:**
  - `iattend--backend/helpers/popEvent.js`.
  - Routers: `router/sideEventPublic.js`, `sideEventChat.js`, `sideEventForm.js`, `sideEventInvitado.js`, `sideEventAcceso.js`, `lectorPop.js`.
  - Wallet: `services/wallet/`.
- **Precios:**
  - Landing: `iattend-next/src/components/Pops/data.ts`.
  - Catálogo de precios: `src/pages/Precios/catalogoPrecios.js`.
  - Stripe: `iattend--backend/config/stripe.catalog.js`.
