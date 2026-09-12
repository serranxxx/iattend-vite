# Tablero del evento en móvil

Bajo **767px**, `/dashboard` deja de reflowar el bento y monta otra pantalla:
[`DashboardMobile.jsx`](../src/pages/Dashboard/DashboardMobile.jsx). De ahí para arriba vuelve el
bento de escritorio, sin cambios.

Viene del handoff **"1b · Hero + carriles"**. El bento responde *"¿qué módulos tengo?"*; en una
columna eso se convierte en una tira de tarjetas que hay que scrollear entera. Esta pantalla
responde *"¿cómo va mi evento?"*: la invitación manda, los pases se resumen en tres números y los
módulos secundarios se van a un carril horizontal.

## Orden

1. **Hero de la invitación** — lavanda (`#DCD0EC`, radio 26): miniatura enmarcada, fecha,
   *Invitación Paperless*, estado + pases, y los botones *Editar* y compartir.
2. **Tira de pases** — tres tarjetas (salvia / arena / lavanda clara) con `CountUp` de 400ms.
   Cada una lleva a la lista de invitados.
3. **Gestión de invitados** — título + *Ver todo* y una tarjeta blanca con las tres primeras filas
   reales. Sin invitados se sustituye por el bloque de 120px con su CTA.
4. **Más para tu evento** — carril con scroll horizontal y `scroll-snap`: Photo Wall, Side events y
   Save the Date, tarjetas de 168×132. Es extensible: un módulo nuevo es otra tarjeta.
5. **Ayúdanos a mejorar** — la misma tarjeta de feedback del bento, compacta.

## Decisiones

- **Sin tab bar.** El handoff cerraba con una barra fija de cuatro destinos; se probó y se quitó.
  La navegación en móvil sigue siendo la del resto de la app: el botón flotante del header
  (`MobileActionsFab`) y el `FooterApp`.
- **El header se queda como está.** El handoff dibujaba uno propio ("MI EVENTO" + créditos + "?"),
  pero `HeaderDashboard` es compartido con todas las rutas del tablero y ya trae atrás, nombre del
  evento, pases y ayuda.
- **La serif es Young Serif**, no la Playfair del prototipo: es la que ya usa el tablero, y el
  propio handoff pide usar la serif de marca del codebase si existe. El resto de la tipografía es
  Poppins, como toda la interfaz.
- **Los colores son los del handoff** (`#2E3A4F`, `#DCD0EC`, `#C6C9AC`, `#EDE7DC`), una pizca más
  suaves que los de marca que usa el bento (`#1c3249`, `#D1BEDD`, `#b9bba6`). Se dejaron tal cual
  porque el handoff es hi-fi; si molesta la diferencia en tablet, se cambian por los tokens.
- **Los sobres del carril llevan medidas en px** y no los porcentajes de `ENVELOPES` del bento: en
  un contenedor de 66px los porcentajes se quedaban en nada.

## Datos

Todo llega calculado desde `DashboardPage`; el componente solo acomoda. Lo que se agregó para esta
pantalla:

- `name` y `type` de `invitations`, para armar el link público (`iattend.events/<type>/<slug>`) que
  usa el botón de compartir — hoja nativa con `navigator.share`, y copiar al portapapeles si no hay.
- **"Publicada"** se deriva de que exista al menos una fila en `invitation_versions`, que es lo que
  escribe el RPC `publish_invitation`. No hay columna de estado en `invitations`.
- **Conteo del muro** y las dos fotos más recientes (`event_photos`, por `event_id`) para el
  subtítulo y las polaroids. Con menos de dos fotos se completa con los assets de la landing.
- `137 de 150` son **enviados contra cupo**: enviados = confirmados + esperando; el cupo es
  `invitations.tickets`, que es lo que ya sumaba `totalPasses`.

## Gotchas

- **`.dashboard_body` tiene 24px de padding lateral** y esta pantalla mide su propio canal de 16px
  desde el borde. Por eso lleva el modificador `.dashboard_body--mobile`, que le cede el canal; si
  no, los bloques quedaban a 40px del borde y el carril no llegaba a sangrar.
- **El escalonado de entrada va por `--i`** en el `style` de cada bloque, no por `nth-child`: el
  orden cambia según el plan y las tarjetas visibles.
- Respeta `prefers-reduced-motion`: sin entrada en cascada y sin el `scale(.98)` del press.
