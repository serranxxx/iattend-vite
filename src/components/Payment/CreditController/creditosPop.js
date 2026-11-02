// Aviso de saldo nuevo de un Pop: SideEvents lo manda al descontar
// créditos (side_events no llega por Realtime) y CreditController lo escucha.
// detail: { id: string (side event), credits: number }
export const EVENTO_CREDITOS_POP = 'iattend:creditos-pop'
