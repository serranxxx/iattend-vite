# Zonas horarias en horas de eventos — convención wall-clock

Documenta el fix de timezone del commit `f56a360` (25-jul), origen de la convención que hoy
está resumida en `CLAUDE.md`. Este doc profundiza en el helper y en por qué existe la
distinción entre datos nuevos y legados.

## El bug

Las horas de side events/pop events (`body.hour`, `information.date`) se guardaban como
instante UTC real. Al mostrarlas, el navegador del organizador las reconvertía a su propia
zona horaria — si el organizador veía la invitación desde una zona distinta a la del venue
(o el navegador tenía mal configurado el timezone), la hora mostrada no coincidía con la hora
que había escrito.

## La convención adoptada: "wall-clock" plano

Desde este commit, `body.hour` / `information.date` se guardan como el string literal que
escribió el organizador en el date picker — `"YYYY-MM-DD HH:mm:00"`, **sin timezone y sin
conversión, nunca**. Los números que ve el organizador en el picker son exactamente los
números que se guardan y los que se vuelven a mostrar. Elimina la clase entera de bug por
diseño: no hay conversión, no hay desfase posible.

`dayjsToWallClock(value)` (en `src/helpers/assets/eventDateTime.js`) es el único punto de
escritura: toma el objeto `dayjs` del `DatePicker` de Ant Design y lo formatea tal cual.

**Regla para código nuevo que toque estas fechas: nunca reintroducir `.utc()`, `.tz()` ni
conversión de timezone sobre estos campos.**

## Datos legados

Eventos creados **antes** de este cambio sí tienen instantes UTC reales guardados
(`"...Z"` o con offset explícito). `formatEventDateTime(raw, opts)` detecta cuál de los dos
formatos está leyendo (`isAbsoluteInstant`, regex sobre el string) y:

- Si es wall-clock plano → `formatWallClock` (parseo de texto, sin `Date`, salvo un ancla UTC
  usada únicamente para calcular el nombre del día de la semana y del mes vía
  `Intl.DateTimeFormat`).
- Si es instante absoluto legado → `formatAbsoluteInstant`, que sí convierte, usando la zona
  horaria real del estado del venue.

## `STATE_TIMEZONES` — estados con huso distinto al de CDMX

```js
{
  "baja california": "America/Tijuana",
  "baja california sur": "America/Mazatlan",
  "sonora": "America/Hermosillo",
  "sinaloa": "America/Mazatlan",
  "quintana roo": "America/Cancun",
}
```

Cualquier otro estado usa `America/Mexico_City` por default. `getTimezoneForState(state)`
normaliza el string de estado (quita acentos, minúsculas) antes de buscar en el mapa — esto
**solo se usa para reconvertir datos legados**, nunca para datos nuevos.

## Contraparte de lectura

`iattend-events` (`src/helpers/functions.ts`) tiene la función hermana que lee estos mismos
campos con la misma lógica de dos formatos. Si se cambia el formato de guardado aquí, hay que
actualizar esa función también — está fuera de este repo.

## Otros usos del archivo

- `formatAbsoluteDateEs(isoString)` — fecha en español, día tomado en UTC sin conversión,
  usada en el `{{3}}` del template de WhatsApp `reminder` y en las barras de `rsvp_deadline`.
  Es la fecha límite del RSVP, no la hora del evento — no pasa por la lógica wall-clock/legado
  de arriba, siempre es UTC puro.
