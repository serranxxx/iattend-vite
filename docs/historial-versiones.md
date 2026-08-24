# Historial de versiones y undo/redo del builder

Documenta los dos mecanismos de "historial" que llegaron con el commit `3efd30e`
(2026-08-06, *"versions control and sessions"*). Se llaman parecido y conviven en el mismo
archivo, pero son cosas distintas:

- **`invitation_versions`** — historial persistente, se graba en la DB al publicar.
- **Undo/redo** — historial de sesión, en memoria, muere con la pestaña.

---

## 1. `invitation_versions` — versiones persistidas

### Qué cambió en este repo

Un solo cambio, en `src/modules/Invitation/Build/PageSections/BuildPage.jsx` (~línea 591).
Al **publicar** la invitación, el UPDATE directo:

```js
await supabase.from('invitations').update({ data: savedInvitation }).eq('id', id)
```

se reemplazó por un RPC:

```js
await supabase.rpc('publish_invitation', {
    p_invitation_id: id,
    p_data: savedInvitation,
})
```

La lógica de versionado vive **en Postgres**, dentro de esa función — no en el frontend.
Este repo solo la invoca.

### Dónde se toca `invitation_versions` desde aquí

| Lugar | Qué hace |
|---|---|
| `BuildPage.jsx:591` | La escribe indirectamente, vía `publish_invitation` al publicar |
| `useFeedbackTrigger.js:42` | La lee (`select id ... limit 1`) para saber si ya se publicó algo — ver [reviews-feedback.md](./reviews-feedback.md) |

Y nada más. No hay UI para listar, comparar ni restaurar versiones anteriores.

### Regla: qué SÍ y qué NO debe pasar por `publish_invitation`

`publish_invitation` es para **cambios de contenido de la invitación**. Los updates a
columnas top-level que no son contenido se hacen con un UPDATE directo, **a propósito**, para
no ensuciar el historial con filas que no representan una versión real.

Caso ya implementado: `rsvp_deadline` en `GuestsPage.jsx` (~línea 1780) — UPDATE directo,
nunca vía el RPC. Está anotado en el código y en `RECORDATORIOS_FASE1_CIERRE.md`.

Al agregar un campo nuevo, decidir en cuál de los dos grupos cae antes de escribirlo.

### Gotcha de permisos

La anon key no tenía `GRANT SELECT` sobre `invitation_versions` (la tabla solo se usaba desde
el backend con service-role). Se agregó al final de
`supabase-event-feedback-migration.sql`. Detalle completo en
[reviews-feedback.md](./reviews-feedback.md#gotcha-permission-denied-for-table-invitation_versions-42501).

### Hueco conocido

Se está acumulando historial que **nadie puede ver desde la app**. Si algún día se quiere
"restaurar versión anterior", los datos ya están ahí; falta la UI y confirmar si
`publish_invitation` (o alguna función hermana) soporta lectura/restore o solo escritura —
eso vive en la DB, no en este repo.

---

## 2. Undo/redo — historial de sesión del builder

### Qué es

Deshacer/rehacer los cambios que el organizador va haciendo en el builder, **antes** de
guardar. No tiene relación con `invitation_versions`.

### Dónde vive

| Archivo | Qué aporta |
|---|---|
| `BuildPage.jsx` | Estado (`undoStack`, `redoStack`), `onUndo`/`onRedo`, `applyHistoryEntry`, listener de teclado |
| `BuildContent.jsx` | Los dos botones en la barra de herramientas (`LuUndo2` / `LuRedo2`) |

### Reglas de comportamiento

- **Límite de 20 pasos** (`UNDO_LIMIT`). Al pasarse, se descarta el más viejo.
- **Nunca se persiste.** Vive y muere con la pestaña.
- Cada llamada a `setActiveField` empuja el estado previo al `undoStack` y **limpia** el
  `redoStack` (rama nueva).
- **Se resetea al cambiar de idioma activo** (`activeLang`): editar otro idioma es, en la
  práctica, editar otro documento, y el historial del anterior ya no aplica.
- **Se resetea al cambiar de invitación** (`id`).
- El botón de redo solo se renderiza si `canRedo`; el de undo siempre está presente, pero
  `disabled` cuando la pila está vacía.

### Atajos de teclado

`Ctrl+Z` / `Cmd+Z` para deshacer, `Ctrl+Shift+Z` / `Cmd+Shift+Z` para rehacer, registrados
como listener global en `window`.

**Excepción deliberada:** si el foco está en un `INPUT`, `TEXTAREA` o elemento
`contentEditable`, el handler retorna sin hacer nada y deja pasar el undo nativo del
navegador. Pelearse con el undo del navegador dentro de un campo de texto rompe la
expectativa del usuario (perdería el deshacer carácter por carácter). Si se agrega un editor
de texto custom, hay que incluirlo en ese guard.
