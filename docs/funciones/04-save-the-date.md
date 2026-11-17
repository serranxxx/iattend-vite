# 4. Save the Date

> Revisado contra el código el 16 de noviembre de 2026.

## Qué es

Una página sencilla para **anunciar la fecha** antes de mandar la invitación. Tiene:
- Fondo con carrusel de imágenes **o** un video.
- Título.
- Cuenta regresiva.
- Canción (opcional).
- Botón "Save the date", que agrega el evento al calendario del invitado (Apple, Google u Outlook).
- Reacciones con emoji (❤️ ✨ 😍) y mensajes.

No tiene lista de invitados ni confirmación de asistencia.

## Quién lo puede usar

- **Es gratis y no gasta créditos.**
- Está en **todos los planes**: PRO, Lite, Paperless y la cuenta gratuita.
- Toda cuenta nueva nace con un evento gratuito para su Save the Date, tanto si se registra con correo como con Google o Apple. Las cuentas que crea un administrador no reciben ese evento.
- Con la cuenta gratuita, el tablero solo muestra Save the Date y la invitación a contratar ("Contrata I attend — Desbloquea la invitación, los invitados y todo lo demás").
- **Uno por evento.**

## Cómo se crea

**Desde el evento (con cuenta):**
1. En el tablero del evento, tarjeta "Save the Date".
2. La primera vez se crea solo, copiando la portada y la fecha de la invitación.

**Sin cuenta (en `/save-the-date`):**
1. "Crea tu Save the Date gratis… no necesitas cuenta para empezar."
2. El borrador se guarda en el navegador.
3. Al tocar "Guardar" o "Copiar link", pide crear una cuenta o iniciar sesión.
4. Si la cuenta es nueva se usa su evento recién creado. Si ya tenía eventos, pregunta "¿A qué evento lo agregamos?"; los que ya tienen Save the Date aparecen marcados.

## Paso a paso del editor

Herramientas:
- **Fondo:** imágenes en carrusel o un video. Con video se pide una "Imagen para el link" (la que se ve al compartir por WhatsApp). Se puede oscurecer y difuminar.
- **Título:** texto, tipografía, color, tamaño y posición.
- **Fecha:** alimenta la cuenta regresiva.
- **Botón:** color.
- **Canción:** búsqueda en Spotify o subir un audio.
- **¿Cuándo enviar?:** guía informativa.

Pestañas: **Crear** y **Respuestas**.

**Se guarda con el botón Guardar** (no es automático). Si se intenta salir o cerrar la pestaña con cambios, la app avisa. Permite deshacer hasta 50 pasos.

## Cómo se envía

Con el botón **Copiar link** (`iattend.events/save-the-date/…`). El organizador comparte ese link por su cuenta: WhatsApp personal, redes, correo.

**I attend no envía el Save the Date por WhatsApp.** Existe una pestaña de envío automático en el código, pero hoy está oculta porque no hay flujo de envío.

## Respuestas

- El invitado toca una reacción y puede escribir un mensaje (sin poner su nombre).
- El organizador ve en **Respuestas** el conteo de reacciones y los mensajes, en vivo y en el orden en que llegaron, y puede **borrar mensajes**.

## Límites

| Límite | Valor |
|---|---|
| Imagen | Hasta 5 MB (se comprime a ~1 MB) |
| Video | Hasta 25 MB y 5 segundos |
| Audio | Hasta 8 MB |
| Cantidad de imágenes del carrusel | Sin tope |
| Espacio | Los archivos cuentan para el espacio del evento (10 MB de base) |

## Lo que NO hace / malentendidos comunes

- **No se manda por WhatsApp desde I attend**: se comparte el link a mano.
- **No tiene lista de invitados ni confirmaciones.**
- **Los mensajes los ve cualquiera que abra la página**, no solo el organizador: salen en una cinta que va rotando. El organizador puede borrarlos.
- **Cambiar la fecha del Save the Date no cambia la fecha de la invitación** (salvo que se haya creado sin cuenta y el evento no tuviera fecha).
- No hay botón para desactivarlo desde la app: lo desactiva soporte a mano.
- La cuenta regresiva usa siempre la hora de Ciudad de México.

## Preguntas frecuentes

**¿Cuesta?** No.

**¿Cuántos puedo tener?** Uno por evento.

**¿I attend lo manda por WhatsApp?** No; se copia el link y se comparte.

**¿Quién ve los mensajes?** Todos los que abren la página, además del organizador, que puede borrarlos.

**¿Puedo quitarlo después?** Sí, pidiéndoselo a soporte; no hay botón en la app.

> **Nota interna:** se quitó el botón "Contratar PRO" de la pestaña de envío del Save the Date (oculta hoy), porque cobraba "Cámbiate a PRO" ($1,100) a cualquier plan, incluidos Free y Paperless. Si se vuelve a mostrar esa pestaña, el botón tiene que llevar al checkout correcto según el plan.

## Referencias técnicas (para soporte)

`src/modules/SaveTheDate/SaveTheDatePage.jsx` (y `docs/save-the-date.md`, que está parcialmente desactualizado: el registro con Google o Apple sí recibe el evento gratuito). Página: iattend-events `components/SaveTheDate/`. Backend: `router/saveTheDate.js`, `controllers/auth.js` (`ensureAccount`).
