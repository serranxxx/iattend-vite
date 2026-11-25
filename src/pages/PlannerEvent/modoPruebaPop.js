// Modo prueba al crear Pops (solo cuentas de Administración): se ve la
// animación pero no se guarda nada (POST /api/planner/pop con `prueba: true`;
// con "A mi cliente" / Enviar ahora el correo de ejemplo llega solo al del
// dueño, albserrano8@gmail.com). Lo usan PlannerPopFlow y el menú Make a Pop
// de la app de Pops. Apagarlo con false cuando terminen las pruebas.
export const MODO_PRUEBA_POP = false

export const enModoPruebaPop = () => MODO_PRUEBA_POP
    && JSON.parse(localStorage.getItem('session') || 'null')?.user?.role === 'Administration'
