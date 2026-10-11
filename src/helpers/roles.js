// Roles con las funciones de un wedding planner: el planner y, con
// exactamente las mismas, Administración (layout de planner en /invitations,
// alta de eventos de clientes, beneficios, Eventos Flash). Misma lista que
// iattend--backend/helpers/roles.js.
export const ROLES_PLANNER = ['planner', 'Administration']

export const esRolPlanner = (role) => ROLES_PLANNER.includes(role)
