# CLAUDE.md — iattend-vite

## Ubicación del proyecto
`/Documents/I attend/Projects/iattend-vite`

## Qué es este proyecto
Es la app del organizador de I attend (los novios o quien compró la plataforma). Desde aquí se crea y gestiona la invitación, se administran los invitados, se organizan mesas, se crean side events y se monitorea el Photo Wall del evento.

## Stack
- **Framework:** React + Vite
- **Lenguaje:** JavaScript — componentes en `.jsx`
- **Estilos:** CSS Modules — un archivo `.module.css` por componente, sin Tailwind
- **Iconos:** Lucide React — tamaño estándar 20px
- **UI base:** Ant Design (usar componentes de Ant Design cuando aplique)
- **Base de datos / Storage / Realtime:** Supabase (cliente en el frontend)
- **Backend principal:** `iattend--backend` en `/Documents/I attend/Projects/iattend--backend`

## Estructura de carpetas relevante
```
/src
  /pages
    Dashboard/
    DashboardPage.jsx     ← dashboard principal del organizador
  /components
    PhotoWall.jsx         ← masonry grid en tiempo real (variante con descarga y admin)
    /dashboard/
      PhotoWallSection.jsx ← sección dentro del dashboard
```

## Convenciones de código
- Componentes en PascalCase, archivos `.jsx`
- CSS Modules: clases en camelCase, archivo `ComponentName.module.css`
- Sin TypeScript — JS puro con PropTypes si se necesita validación de props
- Llamadas al backend siempre a través de `iattend--backend`
- Componentes de Ant Design para tablas, modales, botones de acción y formularios
- Lucide React para iconos decorativos y de navegación

## Proyectos relacionados
- **`iattend-events`** (`/Documents/I attend/Projects/iattend-events`) — invitación del invitado (Next.js)
- **`iattend--backend`** (`/Documents/I attend/Projects/iattend--backend`) — backend Node + Express
- **Supabase** — base de datos, Storage bucket `event-photos`, Realtime por canal `event_id`

## Reglas importantes
- El Photo Wall en este proyecto tiene privilegios de **organizador**: descarga de fotos individuales y eliminación
- La descarga llama directamente a la `public_url` de Supabase Storage
- La eliminación llama a `DELETE /api/photos/:photo_id` en el backend
- Mostrar siempre el nombre del invitado y la hora de captura en cada card del Photo Wall
- El contador de fotos y el timestamp de última actualización deben mantenerse en tiempo real
- Suscribirse a Supabase Realtime en `useEffect` y limpiar en el return del cleanup
- No duplicar lógica de compresión aquí — el organizador no sube fotos desde esta app