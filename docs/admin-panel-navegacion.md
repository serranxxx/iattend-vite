# Reorganización de navegación del panel de Administrador

Documenta la reestructuración de `/admin` (antes: tabs "Clientes / Ventas / Texturas") en un sidebar de 4 secciones (Eventos / Usuarios / Ventas / Herramientas), con la campana de mensajes movida a una barra superior persistente. Cambio de UI/navegación únicamente — ninguna tabla, RPC o ruta de Supabase cambió de nombre, y la lógica de negocio de Ventas (comisiones, IVA, bonos) no se tocó.

## Por qué

El panel de Clientes/Ventas/Texturas era un único archivo de 1027 líneas con tabs anidados que ya no escalaba bien (Usuarios y Colaboradores mezclados con Eventos, Vendedores enterrado dentro de Ventas). Se separó por dominio para que cada área crezca de forma independiente.

## Mapeo: dónde vivía cada pieza → dónde vive ahora

| Antes | Ahora |
|---|---|
| `AdminPage.jsx` (todo inline, 1027 líneas) | `AdminPage.jsx` (entry point delgado) → `AdminLayout.jsx` (shell: sidebar + barra superior) |
| Tab "Clientes" → sub-tabs Eventos activos/Todos/Pruebas | `sections/EventosSection.jsx` |
| Tab "Clientes" → sub-tab Usuarios + botón "Nuevo usuario" | `sections/UsuariosSection.jsx` (el botón se movió aquí, junto con el modal "usuario creado") |
| Tab "Clientes" → sub-tab Colaboradores | `sections/ColaboradoresLeads.jsx`, ahora montado dentro de `sections/VentasSection.jsx` |
| Tab "Clientes" → ícono de mensajes con badge | Movido a la barra superior persistente en `AdminLayout.jsx`, visible en cualquier sección |
| Tab "Ventas" → `SalesAdminPage` (Segmented interno Ventas/Vendedores) | `sections/VentasSection.jsx`, con 3 sub-tabs reales: "Ingresos y comisiones", "Vendedores registrados" (ambos renderizan `SalesAdminPage` con las nuevas props `forcedView`/`hideToggle`), y "Colaboradores" |
| Tab "Texturas" → grid + botón Laboratorio | `sections/HerramientasSection.jsx`, con sub-tabs Texturas/Fonts (placeholder)/Imágenes (placeholder); botón "Laboratorio" se mantiene visible siempre, fuera de los sub-tabs |

Sin cambios: `SalesAdminPage.jsx` (KPIs, gráfica, reglas de comisión), `TextureLabPage.jsx`, `AdminHOC.jsx`, rutas en `AppRouter.jsx`, nombres de tablas/RPCs de Supabase.

## Único cambio de "lógica" (aditivo, no de negocio)

`SalesAdminPage.jsx` ahora acepta dos props opcionales:
- `forcedView` (`'ventas' | 'vendedores'`): si se pasa, sustituye el estado interno `activeView`.
- `hideToggle`: si es `true`, oculta el `Segmented` interno Ventas/Vendedores (para que `VentasSection` controle la vista desde sus propios sub-tabs).

Sin props, el componente se comporta exactamente igual que antes (uso en solitario, con su propio toggle).

## Decisiones abiertas del spec original — cómo quedaron resueltas

1. **Ubicación de "Mensajes"** → campana con badge en la barra superior persistente (`AdminLayout.jsx`), no ocupa slot del sidebar. Visible en las 4 secciones.
2. **¿"Colaboradores" lee de `colaboradores_interesados`?** → confirmado en el código (`ColaboradoresLeads.jsx`), sin cambios.
3. **¿Eventos necesita alta manual?** → sí. Se agregó un botón "Agregar evento" en `EventosSection.jsx` que abre un selector de usuario existente (buscador sobre `profiles`) y, al seleccionar, dispara el mismo `NewInvitationDrawer` que ya usaba el botón "Agregar evento" de Usuarios (sin cambios de backend).

## Bug encontrado y corregido durante la verificación

`WhatsappMessages.jsx` (`invitationName`) asumía que toda conversación siempre tiene una invitación ya cargada en `invitationsById`, y hacía `.name` sin verificar `undefined`. Al volverse la campana un elemento persistente en las 4 secciones (antes solo vivía en un tab que tardaba en montarse junto con los datos de invitaciones), una carrera entre el fetch de conversaciones y el de invitaciones podía tronar todo el panel. Se corrigió con un optional chaining (`item?.name`) — un guard mínimo, no un cambio de lógica de negocio.

## Estructura de archivos nueva

```
src/pages/Admin/
  AdminPage.jsx                     ← entry point (renderiza AdminLayout)
  AdminLayout.jsx                   ← shell: Menu (sidebar) + barra superior (campana) + estado compartido
  AdminPanel.css                    ← + estilos de sidebar/contenido
  SalesAdminPage.jsx                ← + props forcedView/hideToggle (sin cambios de lógica)
  sections/
    EventosSection.jsx
    UsuariosSection.jsx
    VentasSection.jsx
    ColaboradoresLeads.jsx
    HerramientasSection.jsx
```
