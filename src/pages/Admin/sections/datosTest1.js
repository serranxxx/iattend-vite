/*
  Datos de la invitación `test-1` para el banco de pruebas del Laboratorio.

  Son una foto fija, copiada de Supabase el 2026-09-22: invitación
  f282bb98-6d9c-446d-8ef6-1dacff261732 (label `wedding`, plan `pro`, tipo
  `closed`) e invitado con password `oG1-Z2W`. Se dejan literales a propósito:
  el laboratorio no debe pegarle a la base para dibujar una maqueta, y así la
  pantalla se ve igual aunque alguien edite la invitación de verdad.

  Si `test-1` cambia de paleta y se quiere reflejar, se actualiza aquí a mano.
*/

export const COLORES_TEST1 = {
    accent: '#761212',
    actions: '#f3d078',
    primary: '#fdf9f0',
    secondary: '#711010',
}

export const FUENTES_TEST1 = {
    body: 'Outfit',
    titles: 'Platypi',
}

export const EVENTO_TEST1 = {
    titulo: 'Ale & Santiago',
    fecha: '2026-08-31',
}

// Samuel viene `confirmado` en la base, así que el drawer abre en la pantalla
// de éxito —que es justo la que no se ve nunca durante el desarrollo—. Desde
// ahí "Cambiar respuesta" lleva al formulario con el acompañante.
export const INVITADO_TEST1 = {
    id: 2950,
    password: 'oG1-Z2W',
    name: 'Samuel Ruiz Reyesz',
    state: 'confirmado',
    table: 87,
    has_companion: true,
}

export const ACOMPANANTES_TEST1 = [
    { id: 5343, name: 'Novia de Samuel', state: 'creado' },
]

// Subconjunto del bundle `invitation_ui_es.ts` de iattend-events: solo las
// llaves que este drawer pinta.
export const TEXTOS_TEST1 = {
    drawerTitle: 'Confirmar asistencia',
    cta: 'CONFIRMAR',
    decline: 'No podré asistir',
    changeAnswer: 'Cambiar respuesta',
    addToCalendar: 'Agrega el evento a tu calendario',
    confirmedMsgBold: '¡Tu asistencia ha sido confirmada! Esperamos verte y celebrar juntos muy pronto.',
    declinedMsg: 'Lamentamos no poder contar con tu asistencia, esperamos pronto poder celebrar juntos',
    closed_hi: 'Hola',
    closed_happy: 'Estamos muy contentos de que formes parte de este momento',
    closed_invitation: 'Tu invitación contempla tu asistencia y la de',
    closed_companion: 'acompañantes',
    closed_notgoing: 'Por favor indica si alguno de ellos no podrá asistir',
    confirmed: '¡Ya ha confirmado!',
    not_going: 'No asistirá',
    dont_forget: 'No olvides agregar el nombre de algunos de tus acompañantes',
    cerrar: 'Cerrar',
}
