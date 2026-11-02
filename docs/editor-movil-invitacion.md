# Editor de la invitación en el celular

`/dashboard/build?id=<invitación>` en pantallas de 750 px o menos. Lleva el **mismo diseño que el editor del Pop en el celular**: tablero blanco con puntos, header con botones redondos, footer flotante, drawers, modales, barras en lugar del footer, tarjeta flotante de color y Ver en vivo a pantalla completa. Ese diseño está descrito en detalle en `docs/editor-movil-pop.md`; aquí solo va lo propio de la invitación.

## Cómo está armado

- `BuildPage.jsx`: con `tourAvailable` en false (≤ 750 px) y `EDITOR_MOVIL_INVITACION = true` pinta `EditorWorkspace movil` en lugar de `ButtonsMenu` + `BuildMenu` + `BuildContent` (el editor viejo, que regresa con la constante en false). Sin `HeaderDashboard`: el header es el del cascarón.
- `EditorWorkspace.jsx` (`movil`): la **misma lógica** que en escritorio (herramientas `TOOLS`, paneles, barras contextuales, `colorTarget`, `mediaSider`, Lia, ícono del momento, portapapeles). Solo cambia el cascarón: `EditorMovilShell` en vez de `EditorShell`.
- `Editor/EditorMovilShell.jsx`: el cascarón del celular con la API de `EditorShell` (`tools`, `activeTool`, `toolOpen`, `onPickTool`, `onCloseTool`, `renderTool`, `canvas`, `bar`, `liveContent`…). Usa **las mismas clases** del editor del Pop (`SideEvents/Movil/EditorMovil.module.css`), así los dos se ven idénticos. Si se toca el diseño, se toca en ese CSS y cambia en los dos.
- `BuildMovil.module.css`: el botón Publicar del header.

## Diferencias con el Pop

| | Invitación | Pop |
|---|---|---|
| Pieza | `EditCanvas` (iframe de events en modo edición), 390 × 780 | `SideCanvas`, 357 × 631 |
| Guardado | **No se autoguarda.** Publicar va a la derecha del header (píldora oscura; "Escribir" para administradores) con un punto rojo si hay cambios. Publicar crea una versión (`publish_invitation`, `docs/historial-versiones.md`) | Autoguardado con su indicador |
| Salir | Con cambios sin publicar pregunta antes (`confirm`) | Termina de guardar y sale |
| Herramientas | Diseño (media pantalla) · Elementos · Fotos · Subidos · Lia (pantalla completa) · Pase digital (modal), `modos` en `EditorWorkspace` | Las del Pop |
| Ver en vivo | `ReactHost` con Sin confirmar / Confirmado y el plan real | `SideEventHost` con Sin confirmar / Confirmado |
| Diseño | `DesignPanel` de la invitación (paletas, tipografías, texturas), tal cual | `DesignPanel movil` del Pop |

## Cómo funciona

- **Tocar en la pieza:** el título, un texto, un módulo (fondo), un separador, un momento, la fecha, la canción o un elemento suelto cambia el footer por la misma barra de escritorio (`bar` de `EditorWorkspace`). La barra sube encima del teclado y, si no cabe, se recorre de lado. Su color abre la tarjeta flotante con `ColoresIOS` (`colorTarget`).
- **Elementos, Fotos y Subidos:** tocar un elemento, PNG o foto lo agrega (`onElegir` → `addLayerItem(item, null)`: la pieza elige la sección que se ve) y se cierra el panel. El texto de ayuda dice "Tócalos para agregarlos a la invitación" (`el_hint_tap`). Eligiendo el ícono de un momento, tocar pone el ícono en vez de agregar.
- **Pickers de imagen:** abren Subidos en modo elegir dentro del mismo drawer (`mediaSider` cambia la herramienta a `uploads`).
- **Tocar fuera:** el tablero suelta el módulo, el texto, la barra de campo, el separador y lo elegido en la pieza (`onBlur`).
- **Ver en vivo:** el ojo, fijo a la derecha del footer, abre la invitación real a pantalla completa con ✕ y Sin confirmar / Confirmado (como en el Pop). Confirmado = invitado de ejemplo ya confirmado y el plan real de la invitación (dock Pro, barra Lite…).

## Escribir sobre la pieza

- **Zoom al escribir:** igual que en el Pop (ver `docs/editor-movil-pop.md` § 8b). Al tocar un texto, la invitación se acerca hasta tocar las orillas (o hasta 16 px si el texto es muy chico), lo centra arriba de la barra y del teclado, y al soltarlo hace zoom out. El aviso del texto viene del iframe: `REMOTE_TEXT_FOCUS` con `{ rect, fontSize }`.
- **La barra del texto no se cierra al tocar dentro:** en escritorio, tocar otra vez el título abierto lo cierra. En el celular, mover el cursor o hacer doble toque para seleccionar una palabra contaba como ese toque y la barra desaparecía. Con `EditCanvas movil`, la barra del título y de la cita se queda al tocar dentro de la pieza (`onPiecePointerDown` y el toque repetido en `onFieldTool`); se va al soltar el texto o al tocar otra zona.
- **El teclado no cierra las barras:** abrir el teclado cambia el alto de la ventana; en escritorio eso cierra los popovers de la pieza (`resize`), en el celular no (`movilRef`).
- **Teclado y barra:** la barra queda justo arriba de la barra ^ v ✓ y de la píldora de Safari (`useEditorMovil.js`, ver § 8b del Pop).

## Ver en vivo → Sin confirmar / Confirmado

- **Dónde:** en el celular, segmentado arriba junto a la ✕ (`EditorMovilShell` `vistaConfirmada` / `onVistaConfirmada`). En escritorio, el mismo segmentado de `EditorShell` que ya usaba el Pop.
- **Estado:** `EditorWorkspace` guarda `vistaConfirmada`. Su `ReactHost` de "Ver en vivo" manda `HOST_PROPS.vistaConfirmada` y `HOST_PROPS.plan`.
- **En iattend-events:** `HostClient` → `Invitation vistaConfirmada plan`. Con `dev`, `Invitation` usa `INVITADO_EJEMPLO` (estado confirmado, sin id ni código: no toca invitados reales) como `guestInfo`, y `Confirm` lleva `key` por estado para rearmarse al cambiar.
- **Plan:** antes "Ver en vivo" no recibía el plan y siempre enseñaba el botón CONFIRMAR. Ahora enseña lo del plan real como lo ve el invitado: en Pro, el dock de confirmado (Pases · Fotos · Lia · Editar); en Lite, "Editar respuesta". `BuildPage` pasa `plan` a `EditorWorkspace`. El lienzo de edición no recibe el plan (sigue igual).

## Botones de la pieza a la medida del dedo

- Chip de la canción: `EditCanvas movil` → `.card[data-movil] .chip`, 44 px de alto, texto de 15 px y portada / ícono de 32 px.
- "Cambiar fondo" (portada y cita) vive en la pieza de iattend-events: `ReactHost editMovil` lo manda en `HOST_PROPS`, `HostClient.tsx` pone `html[data-edit-movil]` y `styles/modules.css` lo agranda (`.edit_center_btn`, 44 px, 15 px).

## Lo que manda vite a la pieza (`HOST_PROPS` de `ReactHost`)

| Campo | Para qué |
|---|---|
| `editMode` | Modo edición (lienzo) |
| `editMovil` | Botones de edición a la medida del dedo (`html[data-edit-movil]`) |
| `vistaConfirmada` | "Ver en vivo" → Confirmado (invitado de ejemplo) |
| `plan` | Solo "Ver en vivo": lo del plan (dock Pro, barra Lite) |

Y lo que la pieza le avisa al editor: `REMOTE_TEXT_FOCUS` (`{ rect, fontSize }` o null), además de los avisos de siempre (`REMOTE_SELECT_SECTION`, `REMOTE_FIELD_TOOL`, `REMOTE_TEXT_FIELD`…).

## Comportamientos comunes con el Pop

Tarjetas flotantes de las barras, listas desplegables, sin sliders, barra del elemento (espejos directos, trazo + transparencia), campos de texto más cortos y texturas: todo igual que en el Pop, descrito en `docs/editor-movil-pop.md` § 8b.

## Lo que falta

- Capas (orden de módulos) y el selector de idioma: en el celular todavía no hay dónde.
- Zoom al escribir: centra con la posición que tenía el texto al tocarlo; si iOS desplaza el contenido de la invitación después, el centrado puede quedar corrido.
- La medida del espacio arriba del teclado se probó en el iPhone 17 Pro con iOS 26.
- El tour del editor no aparece en el celular (como antes).
- Modo dibujo: la invitación no tiene herramienta de dibujo.
