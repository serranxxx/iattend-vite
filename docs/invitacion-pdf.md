# Invitación en PDF

El organizador sube su invitación ya diseñada en PDF y sus invitados la ven completa, con los botones de I attend encima (confirmar / editar respuesta). Todo lo demás —invitados, link privado o público, `?password=`, envíos por WhatsApp, confirmaciones, mesas, lector— es el de una invitación normal: es la misma fila de `invitations` con el mismo link `/label/name`.

## Datos (sin migración)

Dentro de `invitations.data` (se publica con `publish_invitation` como siempre, así queda en el historial):

```js
data.formato = 'pdf'            // cualquier otro valor (o nada) = diseño de I attend
data.pdf = {
  pages: [{ url, w, h, pagina }], // imágenes WebP/JPG de 1440 px de ancho
  paginas, source, fileName, uploadedAt,
}
```

Colores de los botones, textura y pase son los de siempre (`generals.colors`, `generals.texture`, `wallet`) y se editan con el riel de siempre (Diseño, Pase digital…). El resto de `data` (el diseño de I attend) no se borra: "Volver al diseño de I attend" pone `formato = 'iattend'` y todo sigue ahí.

Reglas: `src/modules/Invitation/Pdf/pdfInvitacion.js` y su gemela `iattend-events/src/helpers/pdfInvitacion.ts`.

## PDF → imágenes (vite, al subir)

`Pdf/convertirPdf.js` usa `pdfjs-dist` (se baja solo al subir un PDF, chunk propio): cada página a 1440 px de ancho, WebP 0.86 (JPG si el navegador no codifica WebP, p. ej. Safari). Una página muy larga se corta en tramos de ≤ 4000 px (mismo `pagina`) pintando con un `transform`: un canvas gigante revienta en iPhone y WebP no pasa de 16 383 px. Tope: 20 páginas y 25 MB. Orden: convertir todo en memoria → revisar el cupo de la invitación con lo que pesan las páginas + el original (`ensureQuota`; si no cabe, no sube nada) → subir. `Pdf/useSubirPdf.jsx` lo envuelve (input, progreso compartido entre barra y panel, `usarFichaPdf`).

**Storage**: `user_images/<invitationId>/pdf/<huella>/` con `p01-1.webp…`, `original.pdf` y `pdf.json` (la ficha = lo que va en `data.pdf`, más `carpeta` y `bytes`). La huella es el SHA-256 del archivo (24 caracteres): el mismo PDF nunca se sube dos veces — si ya existe su `pdf.json`, se usa tal cual. Subir sin guardar deja la carpeta, pero sale en "Tus PDF" para usarla o borrarla. Todo cuenta para el espacio de la invitación (`invitation_storage_usage` suma la carpeta completa, menos `audio/`). Carpetas viejas (antes de la huella, con fecha y sin `pdf.json`) se leen de sus archivos (`pdfsSubidos.js`).

## Editor (vite, `/dashboard/build`)

Es el mismo `EditorWorkspace`: el riel (Diseño, Elementos, Fotos, Subidos, Pase digital…) no cambia. Lo que cambia en modo PDF:

- Riel → **Mi PDF** (`Pdf/PdfToolPanel.jsx`, mismo acomodo que Subidos): "Subir PDF" (clic o arrastrar), **Tus PDF** (`Pdf/pdfsSubidos.js` → `listarPdfs`: miniatura de la página 1, nombre, páginas y MB; tocar uno lo usa sin volver a subirlo, "En uso" el del editor; la papelera lo borra de Storage, salvo el del editor o el publicado), el medidor del espacio ("Ampliar" abre la compra de Subidos con `iattend-storage-full`) y, en modo PDF, "Volver al diseño de I attend" (`Pdf/volverADiseno.js`).
- **Pieza**: la misma de iattend-events (`/host` pinta `InvitacionPdf` con `editMode`). Tocar el PDF manda `REMOTE_SELECT_SECTION` `"pdf"`.
- **Capas**: el grupo "PDF · N páginas" (`Pdf/PdfLayers.jsx`, en `EditCanvas` en lugar de `ModuleLayers`) con sus elementos sueltos: elegir, ocultar (ojo) y reordenar arrastrando (el de arriba va encima).
- **Elementos sobre el PDF** (Elementos, Fotos, Subidos: arrastrar a la pieza): `data.decorations.pdf` (mismo `LayerItem` que los módulos). En events la zona `data-edit-zone="pdf"` (la caja `.hojas` de las páginas) lleva un `SectionLayer` con sección `"pdf"`: x / y / w en % de esa caja, así quedan fijos sobre el PDF en cualquier pantalla (por eso las páginas van pegadas también en escritorio: un hueco fijo en px rompería la proporción). Elegido un elemento sale su `ElementBar` (manda sobre la barra del PDF). Los "detrás" (`z: 'back'`) quedan bajo las páginas (`.pag` z 1).
- **Botones con link** (riel → **Botones**, solo en modo PDF; `Pdf/BotonesPanel.jsx`, reglas en `Pdf/botonesPdf.js`): botones que se agregan como stickers (clic = al centro de lo que se ve; o arrastrar) y que el invitado sí puede tocar. Son elementos más de `decorations.pdf` con `kind: 'boton'` y cada uno lleva lo suyo: `text`, `url` (sin esquema se le pone `https://`; correo y teléfono se reconocen solos, `linkDeBoton`), `bg` (fondo), `color` (texto), `stroke` / `strokeWidth` (borde, 0–4 px) y `variant` = estilo (`pildora` · `redondeado` · `recto` · `relieve` · `vidrio`). Nacen con el color de los botones de la invitación (`generals.colors.actions`) y el texto que contrasta. El panel trae los cinco estilos, atajos con el texto ya puesto (Cómo llegar, Mesa de regalos, Hospedaje…) y "Tus botones" con aviso de los que no tienen link. Elegido, su `ElementBar` cambia: texto y link (se guarda al salir del campo o con Enter, "Probar link"), fondo, texto, borde y estilo + grosor del borde; sin voltear. En events los pinta `SectionLayer` (`<a>`; en el editor no navega; los externos abren en otra pestaña) con `helpers/botonesPdf.ts`. La letra mide `w × 0.085` cqw.
- **Barra**: con la capa PDF elegida (`pdfElegido` en `EditorWorkspace`), arriba de la pieza va `Pdf/PdfBar.jsx`: archivo, Subir / Reemplazar PDF, original y "Diseño de I attend".
- **Ver en vivo**: la pieza real con Sin confirmar / Confirmado (invitado de ejemplo).

## Página del invitado (iattend-events)

`app/[invitation_label]/[invitation_name]/page.tsx`: con `esPdf(data)` pinta `components/InvitacionPdf/InvitacionPdf.tsx` en lugar de `Invitation` (sin traducción). La imagen del link, si no hay `url_image`, es la primera página. `app/host/HostClient.tsx` pinta el mismo componente con `dev` (lienzo del editor y "Ver en vivo").

- Las páginas una debajo de otra con `<img>` (`width/height` para que no brinque, lazy desde la 3.ª), con el scroll del documento: en el celular Safari esconde sus barras y el pellizco funciona. Desde 800 px, columna de 760 px con cada hoja con sombra. La textura de Diseño va encima (`TextureOverlay`).
- Fondo y `theme-color` = `generals.colors.primary`.
- Acceso igual que `Invitation.tsx`: `type === 'open'` entra directo (registro público en Confirm); privada con `?password=` entra sola; sin él, candado y código con el PDF desenfocado detrás. Además revisa que el código sea de esta invitación.
- Botones según el plan, como en la invitación normal: **Pro** = el mismo `InvitationDock` (confirmación, Pases, Fotos / Photo Wall, Lia, Editar; con los acompañantes del titular para los pases). Los demás = `InvitationControlBar` (`lite`, o `paperless` que confirma por WhatsApp): sin confirmar, CONFIRMAR (`actions` al 70 + texto `primary`); confirmado, "Editar respuesta" con fondo `actions` (prop `pillBackground`), que abre `SlideOverlay` + `Confirm`.
- **Portada fuera de la invitación** = la primera página del PDF: `fuenteDePortada` (vite `helpers/invitation/portadaInvitacion.js`, events `helpers/pdfInvitacion.ts`; mismo formato que `cover.image.prod`). La usan el dashboard (`DashboardPage`), las listas de `/invitations` (`InvitationsPage`, `PlannerEventList`, `PlannerEventsTable`), el link del header (`Header.jsx`), el simulador del pase (`datosPaseWallet.js`), el Photo Wall, el pase de la página (`Ticket.tsx`), la imagen del link (`generateMetadata`, en PDF manda la página aunque haya `url_image`) y el pase de Apple Wallet del backend (`services/wallet/datosPase.js`). La foto propia del pase (`wallet.image`) sigue mandando.
- **"Ver en vivo" con datos de ejemplo** (también en invitaciones normales): sin invitación real (`dev` sin `invitationID`), el dock enseña el Photo Wall con fotos de ejemplo (`PhotoWall demo`, `PhotoWall/fotosDemo.ts`: ideas de I attend del bucket público `assets`) y Lia con una conversación de ejemplo y respuestas de muestra (`LiaGuest demo`), sin API ni créditos. El QR del pase del invitado de ejemplo es `iattend-ejemplo`.
- En el lienzo de edición el host no recibe el plan: sale la barra Lite; "Ver en vivo" sí manda el plan y enseña el dock Pro.

## Pendiente

- La canción de la portada no suena en una invitación en PDF.
- El editor del celular usa el mismo `EditorWorkspace` (capa y barra), sin revisar a detalle.
- Links dentro del PDF se pierden (es una imagen). Zoom: el del navegador.
- Siguiente paso: lo mismo con un link externo (Laboratorio → Tests).
