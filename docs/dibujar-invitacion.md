# Dibujar en la invitación

La herramienta Dibujar de los Pops (handoff "Herramienta Dibujar (pincel)") también está en el editor de la invitación (`/dashboard/build`, escritorio), en el diseño de I attend y en modo PDF. Misma paleta, barra, pinceles, atajos y pantalla completa; lo que cambia es que la pieza de la invitación es un iframe de iattend-events.

## Datos

Cada trazo es un elemento más de la sección donde empieza: `invitations.data.decorations.<sección>[]` con `kind: 'dibujo'` y los mismos campos que en un Pop (`brush`, `color`, `size`, `points` en unidades de su caja `vbW × vbH`, `erase`, `x` / `y` / `w` en % de la caja de la sección —390 unidades de ancho—, `rot`, `opacity`). Secciones: `cover`, los módulos (`greeting`, `itinerary`…) o `pdf`. Se publica con la invitación (`publish_invitation`).

## Editor (vite)

- `EditorWorkspace`: herramienta `draw` del riel (`TOOLS`, solo escritorio). Estado del pincel, `trazos` de la sesión (Borrar todo), pluma de selección y atajos P / E / V / Esc, como `SideWorkspace`. Abrirla pone `EditorShell inmersivo` (tablero `LienzoInmersivo` con zoom, mano y gestos de iPad), `lateral` = `PaletaDibujo` y la barra `DibujoBar` (de `SideEvents/Workspace/SideBars.jsx`). Color del pincel: `ColoresIOS` (`colorField 'draw'`).
- `EditCanvas` prop `dibujo` ({ pincel, completa, sel, onDibujo }):
  - **Pieza completa**: `ReactHost completa = 780` (alto de una pantalla) → la pieza se pinta a todo su largo y su alto llega con `REMOTE_HEIGHT` (`onAltura`) para dar ese alto a la tarjeta.
  - **Con pincel**: una capa (`.capaDibujo`) encima del iframe toma el puntero y pinta el trazo en curso (`TrazoSvg`). Al soltar, `iattend-host-dibujo` → `ReactHost` lo pasa a px del documento → `HOST_DIBUJO_TRAZO`.
  - **Pluma de selección**: sin capa; en la pieza solo los trazos responden (se eligen, mueven, escalan y giran con la capa de elementos). Eliminar de la paleta lo quita.
  - `sel`: trazo que entra elegido (desde Capas); se elige cuando llega el alto de la pieza.
- Un trazo guardado llega con `REMOTE_DIBUJO` ({ cambios: { sección: lista }, tipo, id, section }) → `onDibujo` → un paso de deshacer.
- Capas (`ModuleLayers`, `PdfLayers`): los trazos salen como "Dibujo" en su sección; tocarlos abre Dibujar con la pluma de selección y ese trazo elegido (`iattend-abrir-dibujo`). Fuera de Dibujar no se eligen en la pieza ni llevan barra.

## Pieza (iattend-events)

- `app/host/HostClient.tsx`: `HOST_PROPS.dibujo` ("pincel" | "seleccion" → `html[data-dibujo]` y `Invitation dibujando`) y `HOST_PROPS.completa`. `HOST_DIBUJO_TRAZO`: el trazo se ancla a la zona (`data-edit-zone`) donde empieza (`trazoNuevo`); el borrador recorta los trazos que toca en cada sección (`borrarEnSeccion`). Cuentas en `helpers/dibujoInvitacion.ts` (las mismas de `SideCanvas` `terminarTrazo`).
- `Invitation dibujando`: se pinta como la ve el invitado (sin controles de edición), con las zonas marcadas para anclar; con "seleccion" solo las capas de elementos quedan en edición. `completa`: la portada y su capa miden `--alto-pantalla` (antes `100dvh`) y el contenedor no tiene scroll propio. `InvitacionPdf dibujando` igual.
- `SectionLayer`: `kind 'dibujo'` se pinta con `SideEvent/Dibujo.tsx`; fuera de la selección los trazos no responden al puntero (`section-layer.module.css`).

## Pendiente

- La pluma de selección elige un trazo a la vez (en un Pop hay recuadro para varios y grupos).
- El editor del celular de la invitación no tiene Dibujar.
- Probado con mouse; los gestos de iPad son los de `LienzoInmersivo` y no se revisaron en un iPad real.
