/*
  Reglas de negocio de ventas (IVA, comisiones y bonos).

  Vivían dentro de SalesAdminPage.jsx; se extrajeron aquí porque la pantalla
  "Hoy" del Admin Control Center necesita los mismos KPIs de ingreso neto y
  saldo por cobrar. Una sola fuente de verdad: si cambia una regla, cambia en
  los dos lados a la vez.
*/

export const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const IVA_RATE = 0.16

// Comisión por plan. Paperless va explícito en 0 y no por el mínimo de monto:
// hoy cuesta $899 y el mínimo lo excluye solo, pero si algún día sube de $1,000
// empezaría a comisionar sin que nadie lo decidiera.
const COMISION_POR_PLAN = { PRO: 1000, Lite: 750, Paperless: 0 }
const COMISION_POR_DEFECTO = 1000
const COMISION_MONTO_MINIMO = 1000

// Ventas antes de esta fecha son legacy: no pagan IVA ni comisión, para mantener
// el margen ya acordado con esos clientes.
const CUTOFF_IVA_COMISION = new Date('2026-07-01T00:00:00')

// Paulina Pérez tiene un esquema de comisión distinto al resto de los vendedores:
// sus primeras 3 ventas elegibles del mes no comisionan, y a partir de la 4ta
// comisiona normal. Además recibe bonos fijos al llegar a ciertos hitos de ventas —
// pero esos hitos se cuentan sobre el total GENERAL de invitaciones del mes
// (todos los vendedores juntos), no solo las que ella vendió.
const VENDEDOR_ESPECIAL_ID = '5eb35f6b-38c9-4ffd-a063-447b02a94e24'
const VENTAS_SIN_COMISION_ESPECIAL = 3
const BONO_ESPECIAL_MONTO = 1000
const BONO_ESPECIAL_HITOS = [8, 12, 16]

export const formatCurrency = (value) =>
    `$${Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`

const comisionBaseVenta = (venta) =>
    COMISION_POR_PLAN[venta.plan] ?? COMISION_POR_DEFECTO

// Devuelve un Map<venta_id, { bruto, iva, comision }>. Las ventas elegibles
// (posteriores al corte y con precio_acordado >= $1,000) se agrupan de dos formas:
// por vendedor + mes calendario (para el conteo de "primeras 3" de Paulina), y por
// mes calendario general (para los hitos de bono, que dependen del total de la
// compañía). Ambos agrupamientos son mensuales, sin importar si el panel está
// mostrando un mes o el año completo.
export const calcularCargosPorVenta = (ventas) => {
    const cargosPorVentaId = new Map()
    const gruposPorVendedor = new Map()
    const gruposGenerales = new Map()

    ventas.forEach(v => {
        const fecha = new Date(v.fecha_venta)
        const bruto = Number(v.precio_acordado || 0)

        if (fecha < CUTOFF_IVA_COMISION) {
            cargosPorVentaId.set(v.venta_id, { bruto, iva: 0, comision: 0 })
            return
        }

        const iva = bruto - bruto / (1 + IVA_RATE)
        cargosPorVentaId.set(v.venta_id, { bruto, iva, comision: 0 })

        if (bruto < COMISION_MONTO_MINIMO) return

        const mesKey = `${fecha.getFullYear()}-${fecha.getMonth()}`

        const vendedorKey = `${v.vendedor_id}-${mesKey}`
        if (!gruposPorVendedor.has(vendedorKey)) gruposPorVendedor.set(vendedorKey, [])
        gruposPorVendedor.get(vendedorKey).push(v)

        if (!gruposGenerales.has(mesKey)) gruposGenerales.set(mesKey, [])
        gruposGenerales.get(mesKey).push(v)
    })

    gruposPorVendedor.forEach(grupoVentas => {
        const ordenadas = [...grupoVentas].sort((a, b) => new Date(a.fecha_venta) - new Date(b.fecha_venta))
        const esEspecial = ordenadas[0]?.vendedor_id === VENDEDOR_ESPECIAL_ID

        ordenadas.forEach((v, i) => {
            const ordinal = i + 1
            const cargos = cargosPorVentaId.get(v.venta_id)
            cargos.comision = (esEspecial && ordinal <= VENTAS_SIN_COMISION_ESPECIAL)
                ? 0
                : comisionBaseVenta(v)
        })
    })

    gruposGenerales.forEach(grupoVentas => {
        const ordenadas = [...grupoVentas].sort((a, b) => new Date(a.fecha_venta) - new Date(b.fecha_venta))

        ordenadas.forEach((v, i) => {
            const ordinal = i + 1
            if (BONO_ESPECIAL_HITOS.includes(ordinal)) {
                cargosPorVentaId.get(v.venta_id).comision += BONO_ESPECIAL_MONTO
            }
        })
    })

    return cargosPorVentaId
}

// KPIs del periodo: ventas, desglose bruto/IVA/comisiones/neto y cobranza.
export const calcularKpis = (ventas, cargosPorVenta) => {
    let ingresoBruto = 0
    let iva = 0
    let comisiones = 0

    ventas.forEach(v => {
        const cargos = cargosPorVenta.get(v.venta_id) || { bruto: 0, iva: 0, comision: 0 }
        ingresoBruto += cargos.bruto
        iva += cargos.iva
        comisiones += cargos.comision
    })

    return {
        ventasCount: ventas.length,
        proCount: ventas.filter(v => v.plan === 'PRO').length,
        liteCount: ventas.filter(v => v.plan === 'Lite').length,
        ingresoBruto,
        iva,
        comisiones,
        ingresoNeto: ingresoBruto - iva - comisiones,
        saldoPendiente: ventas.reduce((acc, v) => acc + Number(v.saldo_pendiente || 0), 0),
        ventasConApartado: ventas.filter(v => v.estado_pago === 'apartado').length,
    }
}

// Neto real de una venta: lo cobrado menos IVA y comisión.
export const netoDeVenta = (venta, cargosPorVenta) => {
    const c = cargosPorVenta.get(venta.venta_id)
    return c ? c.bruto - c.iva - c.comision : 0
}

// Promedio de neto por venta de un conjunto. Es lo que reemplaza al "neto por
// venta" capturado a mano en la calculadora: el precio varía por plan y por
// descuento, y la comisión depende de quién vendió y de cuántas van en el mes
// (el esquema escalonado del vendedor interno), así que un número fijo nunca
// iba a representar la realidad.
export const netoPromedioPorVenta = (ventas, cargosPorVenta) => {
    if (!ventas.length) return null
    const total = ventas.reduce((acc, v) => acc + netoDeVenta(v, cargosPorVenta), 0)
    return total / ventas.length
}
