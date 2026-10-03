// Formato y estados compartidos del portal de ventas (/sales).

export const formatCurrency = (value) =>
    `$${Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`

export const initials = (nombre = '') =>
    nombre.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()

// Color de la barra de avance según el estado de cobro
const BARRA_POR_ESTADO = {
    completo: '#43B75D',
    apartado: 'var(--light-green-500, #aac187)',
    sin_pago: '#EC6A5B',
}

export const estadoBar = (estado) => BARRA_POR_ESTADO[estado] ?? BARRA_POR_ESTADO.sin_pago

// Estado a partir de lo pagado: el backend solo regresa totales al abonar.
export const estadoDePago = (pagado, saldo) => {
    if (saldo <= 0) return 'completo'
    if (pagado > 0) return 'apartado'
    return 'sin_pago'
}

// "012180001234567890" → "0121 8000 1234 5678 90" (solo para mostrar; se copia sin espacios)
export const formatClabe = (clabe = '') => String(clabe).replace(/\s+/g, '').replace(/(.{4})(?=.)/g, '$1 ')
