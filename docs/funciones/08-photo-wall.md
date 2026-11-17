# 8. Photo Wall

> Revisado contra el código el 16 de noviembre de 2026. Las notas marcadas **Nota interna** son para el equipo y no deben copiarse al material del cliente.

## Qué es

Un muro de fotos que llenan los invitados durante el evento. Toman fotos o las suben de su galería desde la invitación, y el organizador las ve aparecer en vivo en su tablero, donde puede descargarlas y borrarlas.

## Quién lo puede usar

- **Plan:** solo **PRO**. Sin PRO, la tarjeta del tablero muestra "Disponible con PRO" con un candado.
- **Quién sube fotos:** solo un invitado que entró con su código y **ya confirmó**. Los acompañantes también pueden subir si entran con su propio código; el titular puede enseñarles un QR para que entren ("Tu acompañante escanea este código…").
- **Solo invitaciones**: no existe en side events ni en Pops.

## Paso a paso

**Invitado:**
1. En la barra de su invitación toca **Fotos**. Ve el muro con contadores y el estado: "Inicia en N días", "En vivo · es hora de capturar" o "Finalizado · siempre disponible".
2. Toca la cámara: puede tomar foto, "Subir desde galería", cambiar de cámara y hacer zoom.
3. Revisa la foto y toca "Enviar al Wall" (o "Descartar").
4. En el muro puede abrir cada foto, dar like con doble toque, ver "historias" y poner el muro en "Pantalla completa".

**Organizador** (tablero → tarjeta Photo Wall):
1. Ve los días restantes, el número de fotos y cuándo se actualizó.
2. Puede buscar por nombre y filtrar por invitado.
3. En cada foto ve el nombre del invitado y los likes (con la lista de quién dio like).
4. **Descargar** (una por una, en PNG) o **Eliminar** (con confirmación: "¿Eliminar la foto de {nombre}?").

## Cómo funciona por dentro

- **La cámara solo funciona el día del evento y el día siguiente** (de las 00:00 del día del evento a las 23:59 del día siguiente, según la hora del teléfono). Antes sale "La cámara estará disponible el día del evento". El muro se puede ver siempre.
- El teléfono reduce cada foto antes de subirla (máximo 1920 px por lado).
- Las fotos aparecen en vivo en el muro del invitado y en el del organizador.
- **Las fotos se borran automáticamente 30 días después de subirse.** El organizador ve en su muro cuántos días le quedan para descargarlas.

## Límites y costos

| Límite | Valor |
|---|---|
| Fotos por invitado | **10** ("Ya subiste el máximo de 10 fotos") |
| Tamaño por foto | 3 MB (después de que el teléfono la reduce) |
| Tipo de archivo | Solo fotos, **no videos** |
| Ventana de la cámara | Día del evento y el día siguiente |
| Tiempo guardadas | 30 días; después se borran solas |
| Créditos | No gasta créditos |
| Espacio | **No cuenta** para el espacio de Subidos de la invitación |

## Lo que NO hace / malentendidos comunes

- **No acepta videos.**
- **No hay "descargar todas"** ni descarga en ZIP: se descargan una por una.
- **No hay moderación previa**: las fotos se publican al instante y el organizador solo puede borrarlas después.
- **El invitado no puede descargar ni borrar fotos** desde su vista.
- **Los invitados no ven cuántos likes tiene cada foto**; el organizador sí.
- **La vista del organizador no muestra la hora de la foto**, solo el nombre (la del invitado sí la muestra).
- **El tablero del organizador no tiene modo proyector.** La pantalla completa para proyectar está en la vista del muro dentro de la invitación.
- **No existe en side events ni en Pops.**
- Borrar una foto no la quita de los muros que ya están abiertos hasta que se recargan.

## Preguntas frecuentes

**¿Cuántas fotos puede subir cada invitado?** 10.

**¿Desde cuándo pueden subir?** El día del evento y el día siguiente.

**¿Puedo descargarlas?** Sí, desde el tablero, una por una, durante los 30 días siguientes a que se suben. Después se borran solas.

**¿Puedo borrar una foto inapropiada?** Sí, desde el tablero.

**¿Mis invitados necesitan una app?** No; se usa desde la invitación.

**¿Lo puedo proyectar?** Sí, con "Pantalla completa" en el muro de la invitación.

**¿Ocupa mi espacio?** No cuenta para el límite de Subidos.

**Tengo Lite o Paperless.** No incluye Photo Wall.

## Pendiente de confirmar

1. **Regla de plan:** el tablero decide con un dato que se puede activar por plan desde Admin, pero la página del invitado sigue exigiendo PRO. Si se activa el Photo Wall para otro plan, el organizador lo vería abierto y sus invitados no.

> **Nota interna (para el equipo técnico):**
> - El límite de 10 fotos y los likes se cuentan por **nombre**: dos invitados con el mismo nombre comparten las 10 fotos.
> - La ventana de la cámara depende de la hora del teléfono; probar con una invitación real.
> - La página `/dashboard/photowall` no revisa plan ni dueño, y el backend no revisa plan ni fecha al subir.
> - Existe un muro a pantalla completa en `iattend.events/event/<id>/photowall` (solo PRO) que no se enlaza desde el tablero.

## Referencias técnicas (para soporte)

Organizador: `src/components/PhotoWall/PhotoWall.jsx`, `src/pages/Dashboard/PhotoWallPage.jsx`. Invitado: iattend-events `components/Invitation/InvitationDock/` (`CameraView.tsx`, `PhotoWall.tsx`). Backend: `router/photos.js`.
