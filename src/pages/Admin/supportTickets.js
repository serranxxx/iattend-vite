// Etiquetas de los reportes de soporte (`support_tickets`). Las usan
// Admin → Notificaciones y la pantalla Hoy.

export const TEMAS = {
    help: 'Necesito ayuda',
    improvement: 'Sugerencia de mejora',
    question: 'Pregunta general',
    // Desde Gestión de invitados → Recordatorios. Se atiende dando de alta la
    // plantilla en Configuración → Recordatorios cuando Meta la apruebe.
    reminder_request: 'Solicitud de recordatorio',
}

export const ESTADOS = {
    open: 'Pendiente',
    in_progress: 'En curso',
    resolved: 'Resuelto',
}

export const pendientes = (tickets) => (tickets ?? []).filter(t => t.status !== 'resolved')
