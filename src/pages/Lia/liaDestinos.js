// A dónde lleva cada atajo. Las claves son las mismas que DESTINOS en
// iattend--backend/models/lia.ayuda.js: el modelo solo elige la clave y la
// ruta sale de aquí. `uiAction` la ejecuta GuestsPage al montar.
export const DESTINOS = {
    invitados: { path: '/dashboard/guests' },
    por_invitar: { path: '/dashboard/guests', uiAction: { type: 'filter_by_state', payload: { state: 'creado' } } },
    esperando: { path: '/dashboard/guests', uiAction: { type: 'filter_by_state', payload: { state: 'esperando' } } },
    confirmados: { path: '/dashboard/guests', uiAction: { type: 'filter_by_state', payload: { state: 'confirmado' } } },
    no_asistiran: { path: '/dashboard/guests', uiAction: { type: 'filter_by_state', payload: { state: 'rechazado' } } },
    nuevo_invitado: { path: '/dashboard/guests', uiAction: { type: 'open_guest_form', payload: {} } },
    importar_excel: { path: '/dashboard/guests/import' },
    mesas: { path: '/dashboard/guests', uiAction: { type: 'open_tables', payload: {} } },
    editor: { path: '/dashboard/build' },
    side_events: { path: '/dashboard/side' },
    photo_wall: { path: '/dashboard/photowall' },
    save_the_date: { path: '/dashboard/savethedate' },
    dashboard: { path: '/dashboard' },
    mis_invitaciones: { path: '/invitations', sinId: true },
    nuevo_evento: { path: '/checkout', sinId: true },
}
