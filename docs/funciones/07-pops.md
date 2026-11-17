# 7. Pops

> Revisado contra el código el 16 de noviembre de 2026. Los precios vienen del catálogo y de Stripe ese día y pueden cambiar. Las notas marcadas **Nota interna** son para el equipo.

## Qué es

Un Pop es un **evento rápido e independiente**, sin boda detrás: un brunch, una cena, una junta, una fiesta. Texto de la app: "Para lo que surja: un brunch, una cena o la junta de ventas. Listo en minutos." Antes se llamaba "Evento Flash".

Tiene su propia página para el invitado (`iattend.events/side-event/<código>`), su lista de invitados, sus **30 créditos de WhatsApp** y su espacio de archivos.

## Quién lo puede usar

| Quién | Qué puede hacer |
|---|---|
| **Planner** o **Administración** | Comprar Pops (Stripe) y crearlos para sí, para un cliente o para mandar después |
| Cualquier cuenta con **Pops gratis** asignados | Crear Pops con esos gratis. Un cliente siempre los crea para sí mismo. |
| Administración | Además, "Crear sin costo" |
| Cliente sin Pops gratis | **No puede crear ni comprar Pops** en la app |

Puede editar un Pop su dueño, su planner asignado o Administración.

Los Pops gratis los asigna I attend en Admin → Usuarios (a planners, clientes y vendedores). Los paquetes (Bucket de 5 o 10) los vende un asesor.

## Crear un Pop

Panel "Nuevo Pop":
1. **"¿Para quién es?"** (solo planners):
   - **Para mí**: "Queda en tu cuenta, en Mis eventos."
   - **A mi cliente**: pide nombre y correo. "Le llegará su usuario y contraseña. Si ya tiene cuenta en I attend, el evento se agrega ahí."
   - **Enviar después**: "Lo armas con calma y se lo mandas desde Mis clientes." Se manda una sola vez.
2. **"¿Qué vamos a celebrar?"**: nombre (hasta 120 caracteres), fecha (no pasada) y hora (opcional).
3. **Pago**: "Incluye 30 créditos de WhatsApp. El diseño, el lugar y los invitados los armas después en el editor." Con Pops gratis se elige "Usar un Pop gratis" ($0) o "Pagar este Pop". Si el planner tiene descuento, se muestra.
4. **"¡Pop!"** → "Abrir editor".

**Un Pop pagado no aparece al instante:** se crea cuando Stripe confirma el pago. Nace **privado**, con 30 créditos y sin diseño.

## El editor del Pop

En computadora: Diseño · Elementos · Fotos · Dibujar · Subidos · Imagen del link · Pase digital, más Ubicación, Itinerario, Asistentes, Formulario y Patrocinadores, que se abren al tocar su tarjeta en la página. Se guarda solo.

- **Diseño:** color del tema, **estilo de bloques** (vidrio, hielo, noche, papel, tema, sticker, contorno, recorte), velo y efectos.
- **Portada:** de 1 a 6 fotos o videos en carrusel; ajustar encuadre (computadora), velo y desenfoque. Posición del título en una cuadrícula de 3 × 3.
- **Elementos:** textos, íconos, formas e imágenes PNG; máximo **12 imágenes y 40 elementos** (los dibujos no cuentan).
- **Dibujar:** "Firma, subraya o decora a mano sobre tu Pop." Pluma, marcador, resaltador, lápiz, neón y borrador. En computadora y celular.
- **Canción.**
- **Itinerario** con los momentos del día.
- **Emoji del Pop** (computadora): "Lo identifica en tu lista de Pops. Tus invitados no lo ven."
- **Estilo del editor** (I attend · Pop · Business · Craft): solo cambia cómo se ve el editor, no la página del invitado.

En el celular el editor tiene casi todo en paneles y ventanas; no permite reordenar tarjetas ni elegir emoji.

## Módulos propios del Pop

### Formularios
- El organizador crea sus formularios desde cero y los guarda en **Mis formularios**; al Pop llega una copia.
- Tipos: respuesta corta, larga, opción única, múltiple (hasta 20 opciones), sí/no, número, teléfono, correo, fecha y casilla (por ejemplo, aviso de privacidad).
- Opciones: por persona o por grupo, permitir responder después, **obligatorio** (se abre solo al confirmar y no se puede cerrar hasta responder), abierto o cerrado, prefijo de folio.
- Solo responden los invitados confirmados (o un acompañante con su link de registro). Cada respuesta tiene folio (`REG-0001`, …).
- Las respuestas se ven en una tabla y se descargan en Excel o CSV.

### Lista de asistentes
"Tus invitados ven quién ya confirmó". La página solo muestra **primer nombre, iniciales y avatar** (emojis o iniciales), nunca teléfonos ni códigos. Hasta 300 personas.

### Chat de invitados
"Los confirmados pueden escribirse". Requiere la lista de asistentes encendida. Mensajes de hasta 500 caracteres, reacciones, y un mensaje fijado del organizador. El organizador puede borrar mensajes (y deshacer).

### Patrocinadores
Logos PNG o SVG, en categorías de tamaño grande, mediano o chico, con color adaptado al diseño u original, y tres acomodos: **en la portada**, **tarjeta** o **banda**. Los logos cuentan para el espacio del Pop.

### Pop en línea
Modo **Presencial** o **En línea**. En línea:
- Enlace "Compatible con Zoom, Google Meet y YouTube. Otro URL se muestra como enlace genérico." (debe empezar con `https://`).
- "Solo para confirmados": oculta el acceso y el material hasta que el invitado confirme.
- Material: enlaces o archivos PDF, PPTX o imagen de hasta 20 MB (cuentan para el espacio).
- En línea no hay clima.

### Imagen del link y Compartir
"Imagen del link": cómo se ve el Pop al mandarlo por WhatsApp (automática con la portada, o una propia). "Compartir" muestra la portada, un QR y "Copiar link".

## Invitados del Pop

- **Agregar:** "De otro evento" e "Individual". **Un Pop no importa desde Excel.**
- **WhatsApp:** botón de envío **por invitado**, igual que en la boda (un clic, un mensaje, ver [02-invitados.md](02-invitados.md#envíos-por-whatsapp-cómo-funcionan-realmente)). Gasta **1 crédito del Pop** por envío; reintentar es gratis; solo números +52. Sin créditos: "Sin créditos: compra más con el + junto al contador."
- También existen "Copiar link" y "Marcar como invitado".
- **Buzón de WhatsApp** del Pop (botón con globo de no leídos). Contestar es gratis y solo dentro de 24 horas.
- **Lector de pases:** el lector permite elegir un Pop con su propia clave. Por ahora la llegada se registra a mano desde la lista; el escaneo del QR de un Pop está en desarrollo.

## Público o privado

- **Privado** (así nace): "cada invitado entra con su código".
- **Público**: "Cualquiera con el link entra y confirma con su nombre." Se cambia con el candado del encabezado.
- **Permitir acompañantes** (solo público, encendido por omisión): cada quien puede agregar hasta **10 acompañantes**. Quien se registra queda en la lista con la nota "Se registró desde el link público".

**Link con código al azar:** el link de cada Pop usa un código de 10 caracteres (`iattend.events/side-event/<código>`), para que no se pueda llegar a otros eventos cambiando un número. Los Pops viejos también abren con su número hasta que el organizador lo apaga en "Imagen del link" ("Apagar link anterior", no se puede deshacer).

## Límites y costos

| Concepto | Valor |
|---|---|
| Pop suelto | **$549 MXN** de lista, de contado (los planners con descuento pagan menos) |
| Bucket de 5 Pops | $2,249 (lo vende y lo activa un asesor) |
| Bucket de 10 Pops | $4,000, de contado o en pagos (lo vende y lo activa un asesor) |
| Créditos incluidos | **30**, solo de ese Pop |
| Más créditos | Con el "+": 50 por $150, 100 por $200, 200 por $300 |
| Espacio | **10 MB**, ampliable a 20 o 30 MB a 5 créditos del Pop por MB |
| Elementos | 12 imágenes / 40 elementos |
| Portada | Hasta 6 fotos o videos |
| Chat | 500 caracteres por mensaje |
| Registro público | Hasta 10 acompañantes por registro |

## Lo que NO hace / malentendidos comunes

- **No tiene Lia.**
- **No importa desde Excel.**
- **No tiene mesas ni Photo Wall.**
- **No envía WhatsApp fuera de México** y **no usa los créditos de la boda**.
- **Un cliente no puede comprar Pops en la app**; solo usa los gratis que le asignen.
- **No se puede borrar un Pop** desde la app.
- **El emoji del Pop no lo ve el invitado.**
- **Pagar un Pop no lo crea al instante**: aparece cuando Stripe confirma.
- **Los paquetes de Pops comprados por link no se activan solos**: los activa un asesor.

## Preguntas frecuentes

**¿Cuánto cuesta un Pop?** $549 de lista. Paquetes de 5 ($2,249) y 10 ($4,000).

**¿Qué incluye?** La página del evento con su editor, invitados, 30 créditos de WhatsApp y 10 MB de archivos.

**¿Puedo crear un Pop para mi cliente?** Sí, como planner: "A mi cliente" le crea su cuenta y le manda sus accesos; o "Enviar después".

**Soy cliente, ¿puedo hacer Pops?** Solo si I attend te asignó Pops gratis.

**¿Cómo invito sin WhatsApp?** Copia el link de cada invitado o haz el Pop público y comparte un solo link.

**¿Pueden venir acompañantes?** En un Pop público, sí (hasta 10 por registro) si "Permitir acompañantes" está encendido. En uno privado, solo los que tú diste de alta.

**Se me acabaron los créditos.** Compra más con el "+"; son solo de ese Pop.

**¿Puede ser una videollamada?** Sí, en modo "En línea" con Zoom, Meet, YouTube u otro enlace.

> **Nota interna:** los precios de Pops y paquetes ya están en Stripe; los paquetes comprados por link los activa un asesor a mano (Admin → Usuarios, Pops gratis). El escaneo del QR de un Pop está por desarrollar (ver [06-pases-digitales.md](06-pases-digitales.md)).

> **Nota interna:** el formulario "obligatorio" solo lo exige la página del invitado, no el backend.

## Referencias técnicas (para soporte)

`src/pages/PlannerEvent/PlannerPopFlow.jsx` (crear), `src/modules/SideEvents/` (editor; modo Pop con `?pop=`), `Formularios/`, `Acceso/`, `patrocinadores.js`. Página: iattend-events `components/SideEvent/`. Backend: `helpers/popEvent.js`, `controllers/planner.js`, `router/sideEventPublic.js`, `router/sideEventChat.js`, `router/sideEventForm.js`, `router/storage.route.js`.
