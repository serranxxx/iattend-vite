/*
  Plantillas del registro de asistentes de un Flash (body.form). El
  organizador elige una en el panel Registro (RegistroPanel.jsx) y la ajusta:
  prende / apaga preguntas, las marca obligatorias y edita textos y opciones.
  La página del invitado (iattend-events, SideEvent/Registro/) pinta lo que
  quede guardado; el backend (router/sideEventForm.js) valida con lo mismo.

  Campo: { id, label, type: text|single|multi|yesno|check, required, enabled,
           placeholder?, help?, link?, inputMode?, prefix?, maxLength?,
           options?, max?, validate?: name2|age16|cp5|digits4|phone10|email,
           address?, prefillFrom?: name|phone_number }
*/

const aviso = {
    id: 'aviso', label: 'Acepto el aviso de privacidad', type: 'check', required: true, link: 'Leer aviso de privacidad',
    help: 'Tus datos los usa solo el equipo organizador para este evento. Puedes pedir que los corrijamos o borremos en cualquier momento.',
}
const avisosWhats = {
    id: 'comms', label: 'Quiero recibir avisos por WhatsApp', type: 'check', required: false,
    help: 'Máximo 2 mensajes al mes. Te puedes dar de baja cuando quieras.',
}
const nombre = { id: 'nombre', label: 'Nombre completo', type: 'text', required: true, placeholder: 'Nombre y apellido', validate: 'name2', prefillFrom: 'name' }
const whatsapp = { id: 'whatsapp', label: 'WhatsApp', type: 'text', required: true, placeholder: '614 000 0000', inputMode: 'tel', prefix: '+52', maxLength: 12, validate: 'phone10', prefillFrom: 'phone_number' }
const correo = { id: 'correo', label: 'Correo electrónico', type: 'text', required: false, placeholder: 'nombre@correo.com', inputMode: 'email', validate: 'email' }

export const PLANTILLAS_REGISTRO = {
    ciudadano: {
        title: 'Registro al encuentro',
        intro: 'Para entrar al encuentro, el equipo necesita registrar a cada asistente con sus datos y su relación con el organizador. Toma unos 2 minutos por persona.',
        folioPrefix: 'ENC',
        sections: [
            { title: 'Datos personales', fields: [
                { ...nombre, placeholder: 'Como aparece en tu INE' },
                { id: 'edad', label: 'Edad', type: 'text', required: true, placeholder: 'Ej. 34', inputMode: 'numeric', maxLength: 3, validate: 'age16' },
                { id: 'colonia', label: 'Colonia', type: 'text', required: true, placeholder: 'Ej. Centro', address: true },
                { id: 'cp', label: 'Código postal', type: 'text', required: true, placeholder: '31000', inputMode: 'numeric', maxLength: 5, validate: 'cp5', address: true },
                { id: 'seccion', label: 'Sección electoral', type: 'text', required: false, placeholder: '0000', inputMode: 'numeric', maxLength: 4, validate: 'digits4', address: true,
                    help: 'Son 4 dígitos al frente de tu INE. Si no la tienes a la mano, déjala vacía.' },
            ] },
            { title: 'Contacto', fields: [whatsapp, correo] },
            { title: 'Tu relación con el organizador', fields: [
                { id: 'relacion', label: '¿Cuál es tu relación con el organizador?', type: 'single', required: true,
                    options: ['Vecino/a interesado/a', 'Simpatizante', 'Militante', 'Voluntario/a', 'Líder vecinal u organización', 'Servidor/a público/a', 'Medio de comunicación', 'Otro'] },
                { id: 'conoce', label: '¿Desde cuándo sigues su trabajo?', type: 'single', required: false, options: ['Hoy me enteré', 'Menos de un año', 'De 1 a 3 años', 'Más de 3 años'] },
                { id: 'entero', label: '¿Cómo te enteraste del encuentro?', type: 'single', required: false, options: ['Redes sociales', 'Un vecino o familiar', 'WhatsApp', 'Volante', 'Medio de comunicación'] },
            ] },
            { title: 'Intereses y privacidad', fields: [
                { id: 'temas', label: '¿Qué temas te importan más?', type: 'multi', required: false, max: 3, help: 'Elige hasta 3',
                    options: ['Seguridad', 'Agua', 'Alumbrado', 'Empleo', 'Salud', 'Educación', 'Movilidad', 'Medio ambiente'] },
                { id: 'voluntario', label: '¿Te gustaría sumarte como voluntario/a?', type: 'yesno', required: false },
                aviso,
                avisosWhats,
            ] },
        ],
    },
    basico: {
        title: 'Registro de asistentes',
        intro: 'Ayúdanos con unos datos para preparar todo. Toma menos de un minuto por persona.',
        folioPrefix: 'REG',
        sections: [
            { title: 'Tus datos', fields: [
                nombre,
                whatsapp,
                correo,
                { id: 'edad', label: 'Edad', type: 'text', required: false, placeholder: 'Ej. 34', inputMode: 'numeric', maxLength: 3, validate: 'age16' },
            ] },
            { title: 'Preferencias', fields: [
                { id: 'alimentos', label: '¿Alguna restricción en la comida?', type: 'multi', required: false, max: 3,
                    options: ['Vegetariano', 'Vegano', 'Sin gluten', 'Sin lactosa', 'Alergia a mariscos', 'Ninguna'] },
                { id: 'comentarios', label: '¿Algo que debamos saber?', type: 'text', required: false, placeholder: 'Opcional', maxLength: 200 },
            ] },
            { title: 'Privacidad', fields: [aviso] },
        ],
    },
    empresa: {
        title: 'Registro al evento',
        intro: 'Registra tus datos para tu gafete y para enviarte los materiales del evento.',
        folioPrefix: 'EVT',
        sections: [
            { title: 'Tus datos', fields: [
                nombre,
                { id: 'empresa', label: 'Empresa u organización', type: 'text', required: true, placeholder: 'Ej. Grupo Norte' },
                { id: 'puesto', label: 'Puesto', type: 'text', required: false, placeholder: 'Ej. Directora de ventas' },
            ] },
            { title: 'Contacto', fields: [{ ...correo, required: true }, { ...whatsapp, required: false }] },
            { title: 'Sobre el evento', fields: [
                { id: 'entero', label: '¿Cómo te enteraste del evento?', type: 'single', required: false, options: ['Invitación directa', 'Redes sociales', 'Un colega', 'Correo', 'Otro'] },
                { id: 'temas', label: '¿Qué temas te interesan?', type: 'multi', required: false, max: 3, options: ['Tendencias', 'Networking', 'Producto', 'Casos de éxito', 'Talleres'] },
            ] },
            { title: 'Privacidad', fields: [aviso, { ...avisosWhats, label: 'Quiero recibir avisos del evento por WhatsApp' }] },
        ],
    },
}

export const IDS_PLANTILLAS = ['ciudadano', 'basico', 'empresa']

// Formulario nuevo desde una plantilla (todas sus preguntas prendidas).
export const formDesdePlantilla = (id, anterior = {}) => {
    const p = PLANTILLAS_REGISTRO[id] ?? PLANTILLAS_REGISTRO.basico
    return {
        enabled: anterior.enabled ?? true,
        template: id,
        title: p.title,
        hostLabel: anterior.hostLabel ?? '',
        hostInitials: anterior.hostInitials ?? '',
        intro: p.intro,
        scope: anterior.scope ?? 'persona',
        allowCopyAddress: true,
        allowLater: anterior.allowLater ?? true,
        privacyUrl: anterior.privacyUrl ?? '',
        folioPrefix: p.folioPrefix,
        version: new Date().toISOString().slice(0, 10),
        sections: p.sections.map((s) => ({ title: s.title, fields: s.fields.map((f) => ({ ...f, enabled: true })) })),
    }
}

export const tieneDireccion = (form) => (form?.sections ?? []).some((s) => s.fields.some((f) => f.address && f.enabled !== false))
