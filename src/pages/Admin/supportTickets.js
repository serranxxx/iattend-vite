// Etiquetas de los reportes de soporte (`support_tickets`). Las usan
// Admin → Notificaciones y la pantalla Hoy.

export const TEMAS = {
    help: 'Necesito ayuda',
    improvement: 'Sugerencia de mejora',
    question: 'Pregunta general',
}

export const ESTADOS = {
    open: 'Pendiente',
    in_progress: 'En curso',
    resolved: 'Resuelto',
}

export const pendientes = (tickets) => (tickets ?? []).filter(t => t.status !== 'resolved')
