# Rediseño de la lista de invitados en Side Events

Documenta el port del rediseño de `/dashboard/guests` a `/dashboard/side`
(`src/modules/SideEvents/SideEvents.jsx`), en la rama `site-guests-design`.

Complementa a [`rediseno-gestion-invitados.md`](./rediseno-gestion-invitados.md), que describe el
rediseño original; aquí solo se documentan las diferencias y lo que es propio de side events.
Para el resto del módulo (tabs por estado, clima, ladas por país) sigue vigente
[`side-events.md`](./side-events.md), salvo la parte de **sort de columnas**, que ya no existe.

Alcance: `ea9c90c → HEAD` en `SideEvents.jsx` — **+745 / −581 líneas**.

## Por qué

Los dos módulos administran la misma entidad (invitados) con los mismos cuatro estados, pero
tenían dos interfaces distintas: side events se quedó con la tabla de columnas y scroll
horizontal que `/dashboard/guests` acababa de abandonar. El port unifica el formato.

---

## Qué se portó

Side events reutiliza **los mismos estilos globales** — importa
`../GuestManagement/guests-redesign.css` — y las mismas keys de i18n del namespace `guests.*`.
No hay CSS ni traducciones propias del rediseño en este módulo.

| Pieza | Estado |
|---|---|
| Escalera de pasos (`renderStepBar` vía `renderTabBar`) | Portada |
| Tarjetas fluidas (`renderGuestCard`, `renderCardChips`, `renderCardList`) | Portada |
| Toolbar por sección (buscador + Filtros) | Portada, sin el menú "⋯" |
| Banner de cabecera (`renderTabHero`) | Solo en Paso 1 y Esperando |
| Fila de orden (`renderSortBar`) | Portada |
| Fecha límite (alerta + línea + `DatePicker`) | Portada |
| Acciones por tab (`renderCreatedAction`, `renderSentAction`) | Portadas, adaptadas |
| Panel de Seguimiento (`GuestsOverview`) | **No se portó** — no existe en side events |
| Acciones de mesa (`renderTableAction`) | **No aplica** — side events no tiene mesas |

### Tabs

Cuatro, sin *Seguimiento*: `creado` · `esperando` · `confirmado` · `rechazado`.

### Toolbar (`renderTabToolbar`)

Buscador `.gx-search` + dropdown **Filtros** en todos los tabs. Diferencias contra
`/dashboard/guests`:

- **Sin menú "⋯"**: sus cuatro entradas (Descargables, Mapa de mesas, Evento privado, Lector de
  pases) son del evento principal, no de un side event.
- **Filtros reducidos a dos grupos**: *Etiqueta* y *Prioridad*. No hay mesa, categoría ni lado.
  Las etiquetas salen de `sideTags`, un `useMemo` sobre `rawData` — son las del side event, no
  las de la invitación.
- **Filtro rápido "Sin entregar"** solo en el tab *Esperando*.
- **"+ Agregar invitado" vive dentro del toolbar**, solo en Paso 1 (`renderAddGuestButton`).
  Conserva su menú completo: alta individual, importar archivo y **copiar lista** del evento
  principal — esta última es exclusiva de side events.

### Banner de cabecera (`renderTabHero`)

Solo dos tabs lo tienen:

- **Paso 1** → banner oscuro con el conteo de pendientes, o `gx-hero--plain` cuando no hay.
- **Esperando** → alertas de mensajes fallidos y de leídos sin contestar.

*Confirmados* y *No asistirán* van **sin banner**: el copy de `/dashboard/guests` habla de mesas
y de pases, que aquí no existen.

### Acciones por tarjeta

- **Paso 1** → solo el icon button de *marcar como enviado* (`Check`). No hay botón de "Enviar
  invitación" porque el envío masivo está apagado (ver banderas).
- **Esperando** → *Reintentar* si el mensaje falló (deshabilitado por `aria-disabled` cuando el
  número no es nacional o no hay créditos), *Recordar* en el resto de los casos.

### Bandera

`SHOW_BULK_SEND = false` como constante de módulo, igual que en `GuestsPage.jsx`. Apaga *Crear
envío* / *Enviar todos* y la selección por bloques; hoy el envío es solo manual. El código sigue
ahí y se referencia desde el toolbar para que no quede como código muerto.

---

## Código eliminado

Al portar las acciones por tab, el sistema de columnas quedó sin punto de entrada y se eliminó:
`columns`, `getTabColumns`, `renderSortableHeader`, `renderBulkHeaderCheck`, `renderGuestCardRow`,
`renderGroupedCards`, `stickyClassFor`, `dirFor`, `withTierSort`, `groupDimmed`,
`groupSelectable`, `handleMessageStatus`, `translateState` y `renderRsvpDeadlineBar`.

> Al borrarlos, un helper de edición se comió por accidente `TIER_SORT_ORDER`,
> `MESSAGE_STATUS_SORT_ORDER`, `compareByTier`, `compareByStatus` y `applySortDir`. Se
> restauraron verbatim desde `git show`, pero vale la pena revisar esa zona del diff.

---

## Dos bugs que salieron de aquí

Ambos afectaban también a `/dashboard/guests` y se arreglaron en los dos archivos.

### 1. `useMemo` de `items` con dependencias incompletas

**Síntoma:** el botón *Definir fecha* / *Cambiar* no abría el `DatePicker`. Aparecía recién al
hacer clic en cualquier chip de *Ordenar por*.

Los children de los tabs se construyen dentro de un `useMemo` cuya lista de dependencias se
mantiene a mano, y el estado del picker nunca estuvo en ella. Al hacer clic el estado cambiaba,
pero `items` no se recalculaba: antd seguía mostrando los elementos memoizados con
`open={false}`. `activeSort` **sí** estaba en la lista — por eso ordenar "destrababa" el
calendario.

Se agregaron las dependencias que faltaban. En side events faltaban además `searchUser`,
`filterTag`, `filterTier` y `filterDelivery`, así que **el buscador y los filtros del toolbar
tampoco funcionaban**: escribir no refrescaba las tarjetas.

`react-hooks/exhaustive-deps` está desactivado en este repo, así que nada avisó. Las dos listas
llevan ahora un comentario advirtiéndolo.

### 2. Estado del `DatePicker` como booleano compartido

La línea de fecha límite se renderiza en más de un tab, y antd deja montados los tabs ya
visitados. Con un flag booleano existían **dos `DatePicker` escuchando el mismo estado**: al
abrir, el del panel oculto disparaba `onOpenChange(false)` de inmediato y mataba el estado.

El estado ahora identifica *cuál* picker está abierto, no *si* hay alguno:

```js
const [rsvpPickerSlot, setRsvpPickerSlot] = useState(null)
open={rsvpPickerSlot === slot}
onOpenChange={(next) => setRsvpPickerSlot(next ? slot : null)}
```

`renderRsvpPicker`, `renderRsvpDeadlineAlert` y `renderRsvpDeadlineLine` reciben un `slot`:
`'creado'` / `'esperando'`, y `'page'` para la alerta de side events, que vive fuera de los tabs.

---

## Pendientes conocidos

- [`side-events.css:467`](../src/modules/SideEvents/side-events.css) tiene una regla **global sin
  scope** que bajo 750px mueve **todos** los `.ant-picker-dropdown` de la app con
  `top: 0 !important; left: -26px !important` y `scale(0.8)`. En mobile el picker de fecha límite
  aterriza en el lugar equivocado. No se tocó porque no está claro para cuál picker se escribió.
- *Confirmados* y *No asistirán* siguen sin banner de cabecera.

## Gotchas al tocar este archivo

- **Vite no atrapa identificadores indefinidos en JSX** y `no-undef` tampoco está activo para
  componentes: un `<Search />` sin importar compila en verde y revienta en runtime. Un build
  exitoso no prueba que el componente monte.
- **Si agregas estado que se lea dentro de los children de los tabs, agrégalo al array de
  dependencias de `items`.** Nadie te va a avisar.
- Verificar popups de antd en el panel de preview es engañoso: ese tab corre con
  `document.visibilityState === 'hidden'`, los `requestAnimationFrame` están estrangulados y
  cualquier popup se queda congelado a media animación. Toma dos screenshots seguidos — cada uno
  fuerza un frame.
