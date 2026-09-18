import { useEffect, useMemo, useRef, useState } from 'react'
import { Dropdown, Tooltip, message } from 'antd'
import { CalendarDays, ChevronDown, Plus, Ticket, X } from 'lucide-react'
import {
    costoPorVenta, esPorVenta, fetchGastosFijos, guardarGastosFijos, montoFijo,
    sumarMeta, ventasQueFaltan,
} from '../gastosFijosApi'
import { formatCurrency } from '../ventasCalculos'
import styles from './VentasSection.module.css'

// Espera a que el usuario deje de teclear antes de persistir: la calculadora
// recalcula en vivo, pero no vale la pena un PUT por cada dígito.
const GUARDADO_DEBOUNCE_MS = 800

export const MetaDelMes = ({ anio, mes, ingresoNeto, ventasDelMes = 0, netoPromedio, onMetaChange }) => {
    const [gastos, setGastos] = useState(null)
    const [abierta, setAbierta] = useState(false)

    const timerRef = useRef(null)

    useEffect(() => {
        let cancelado = false

        fetchGastosFijos({ anio, mes })
            .then(({ data }) => {
                if (cancelado) return
                setGastos(data.gastos)
            })
            .catch(error => {
                console.error('Error al cargar gastos fijos:', error)
                if (!cancelado) setGastos(null)
            })

        return () => {
            cancelado = true
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [anio, mes])

    const meta = useMemo(() => (gastos ? sumarMeta(gastos, ventasDelMes) : 0), [gastos, ventasDelMes])
    // El neto por venta ya no se captura: sale del promedio real de las ventas,
    // que es lo único que refleja precios con descuento y el esquema escalonado
    // de comisiones. El `neto_venta` guardado queda como último recurso.
    const netoVenta = netoPromedio?.valor ?? Number(gastos?.neto_venta || 0)
    const conceptos = gastos?.conceptos ?? []
    const variablePorVenta = gastos ? costoPorVenta(gastos) : 0

    useEffect(() => {
        onMetaChange?.(meta)
    }, [meta, onMetaChange])

    // Todas las ediciones pasan por aquí: actualizan el estado al instante y
    // programan un solo guardado al final de la ráfaga de tecleo.
    const aplicar = (siguiente) => {
        setGastos(siguiente)

        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
            guardarGastosFijos({
                anio,
                mes,
                conceptos: siguiente.conceptos,
                neto_venta: siguiente.neto_venta,
            }).catch(error => {
                console.error('Error al guardar gastos fijos:', error)
                message.error('No se pudieron guardar los gastos fijos')
            })
        }, GUARDADO_DEBOUNCE_MS)
    }

    const editarConcepto = (indice, campo, valor) => {
        aplicar({
            ...gastos,
            conceptos: conceptos.map((c, i) => i === indice
                ? { ...c, [campo]: campo === 'monto' ? Math.max(0, Number(valor) || 0) : valor }
                : c),
        })
    }

    const agregarConcepto = () => {
        aplicar({ ...gastos, conceptos: [...conceptos, { nombre: '', monto: 0, tipo: 'fijo' }] })
    }

    const alternarTipo = (indice) => {
        aplicar({
            ...gastos,
            conceptos: conceptos.map((c, i) => i === indice
                ? { ...c, tipo: esPorVenta(c) ? 'fijo' : 'por_venta' }
                : c),
        })
    }

    const quitarConcepto = (indice) => {
        aplicar({ ...gastos, conceptos: conceptos.filter((_, i) => i !== indice) })
    }

    // Ritmo del mes: dónde deberías ir hoy si el punto de equilibrio se
    // repartiera parejo entre los días. Un 58% el día 5 es excelente y el día 28 es malo — el porcentaje
    // solo no lo dice, por eso la barra lleva una marca en el ritmo esperado.
    const hoy = new Date()
    const diasDelMes = new Date(anio, mes, 0).getDate()
    const esMesEnCurso = anio === hoy.getFullYear() && mes === hoy.getMonth() + 1
    const diaDelMes = esMesEnCurso ? hoy.getDate() : diasDelMes

    const ritmo = diaDelMes / diasDelMes
    const esperadoHoy = meta * ritmo
    const diferencia = ingresoNeto - esperadoHoy

    const avance = meta > 0 ? Math.min(1, ingresoNeto / meta) : 0
    const faltante = Math.max(0, meta - ingresoNeto)
    const faltanVentas = gastos ? ventasQueFaltan(gastos, netoVenta, faltante) : null

    if (!gastos) {
        return (
            <div className={`${styles.card} ${styles.metaCard}`}>
                <h2 className={styles.cardTitle}>Punto de equilibrio</h2>
                <div className={styles.cardSub}>No se pudieron cargar los gastos fijos.</div>
            </div>
        )
    }

    // La calculadora vive en un popup: abrirla no debe empujar el bento ni
    // cambiar la altura de la tarjeta.
    const calculadora = () => (
        <div className={styles.calc} onClick={(e) => e.stopPropagation()}>
            <div className={styles.calcHead}>
                <span className={styles.calcTitle}>Gastos fijos del mes</span>
                <button type='button' className={styles.calcAdd} onClick={agregarConcepto}>
                    <Plus size={13} /> Agregar
                </button>
            </div>

            <div className={styles.calcRows}>
                {conceptos.length === 0 && (
                    <div className={styles.calcEmpty}>Sin gastos capturados todavía.</div>
                )}

                {conceptos.map((concepto, i) => {
                    const porVenta = esPorVenta(concepto)
                    const devengado = Number(concepto.monto || 0) * ventasDelMes

                    return (
                        <div className={styles.calcRow} key={i}>
                            <input
                                className={styles.calcName}
                                placeholder='Nombre del gasto'
                                value={concepto.nombre}
                                onChange={(e) => editarConcepto(i, 'nombre', e.target.value)}
                            />
                            <span className={styles.calcInput}>
                                <span className={styles.calcPrefix}>$</span>
                                <input
                                    type='number'
                                    min='0'
                                    value={concepto.monto}
                                    onChange={(e) => editarConcepto(i, 'monto', e.target.value)}
                                />
                            </span>

                            {/* El detalle del cálculo vive en el tooltip: en la fila
                                no cabe sin desbordar el popup. */}
                            <Tooltip
                                title={porVenta
                                    ? `Por invitación · ${formatCurrency(concepto.monto)} × ${ventasDelMes} = ${formatCurrency(devengado)}`
                                    : 'Fijo al mes · clic para cobrarlo por invitación'}
                            >
                                <button
                                    type='button'
                                    aria-label={porVenta ? 'Cambiar a fijo al mes' : 'Cambiar a costo por invitación'}
                                    className={`${styles.calcTipo} ${porVenta ? styles.calcTipoVariable : ''}`}
                                    onClick={() => alternarTipo(i)}
                                >
                                    {porVenta ? <Ticket size={13} /> : <CalendarDays size={13} />}
                                </button>
                            </Tooltip>

                            <button
                                type='button'
                                aria-label={`Quitar ${concepto.nombre || 'gasto'}`}
                                className={styles.calcRemove}
                                onClick={() => quitarConcepto(i)}
                            >
                                <X size={13} />
                            </button>
                        </div>
                    )
                })}
            </div>

            <div className={styles.calcDivider} />

            <div className={styles.calcRow}>
                <span className={styles.calcLabel}>
                    Neto por venta
                    <span className={styles.calcFuente}>
                        {netoPromedio?.fuente ?? 'valor guardado'}
                    </span>
                </span>
                <span className={styles.calcCalculado}>{formatCurrency(netoVenta)}</span>
                <span className={styles.calcRemoveSpacer} />
                <span className={styles.calcRemoveSpacer} />
            </div>

            <div className={styles.calcFoot}>
                {variablePorVenta > 0
                    ? `Fijos ${formatCurrency(montoFijo(gastos))} + ${formatCurrency(variablePorVenta)} × ${ventasDelMes} invitaciones = equilibrio en ${formatCurrency(meta)}`
                    : `Gastos fijos ${formatCurrency(meta)} = meta de ingreso neto`}
            </div>
        </div>
    )

    return (
        <div className={`${styles.card} ${styles.metaCard}`}>
            <div className={styles.metaHead}>
                <h2 className={styles.cardTitle}>Punto de equilibrio</h2>
                <span className={styles.metaValue}>{formatCurrency(meta)}</span>
            </div>

            <div className={styles.cardSub}>
                {faltante === 0
                    ? 'Punto de equilibrio cubierto'
                    : `${faltanVentas ? `faltan ${faltanVentas} ${faltanVentas === 1 ? 'venta' : 'ventas'} · ` : ''}${formatCurrency(faltante)} por generar`}
            </div>

            <div className={styles.track}>
                <div className={styles.fill} style={{ width: `${avance * 100}%` }} />
                {/* Marca del ritmo esperado: separa "llevo 58%" de "voy a tiempo". */}
                <span
                    className={styles.ritmoMarca}
                    style={{ left: `${ritmo * 100}%` }}
                    title={`Al día ${diaDelMes} deberías llevar ${formatCurrency(esperadoHoy)}`}
                />
            </div>

            <div className={styles.metaFoot}>
                {formatCurrency(ingresoNeto)} de {formatCurrency(meta)} · {Math.round(avance * 100)}% del punto de equilibrio
            </div>

            <div className={`${styles.ritmoNota} ${diferencia < 0 ? styles.ritmoAtras : styles.ritmoAdelante}`}>
                {faltante === 0
                    ? `Cubierto el día ${diaDelMes} de ${diasDelMes}`
                    : `Día ${diaDelMes} de ${diasDelMes} · ${diferencia >= 0 ? 'vas' : 'te faltan'} ${formatCurrency(Math.abs(diferencia))} ${diferencia >= 0 ? 'sobre' : 'para'} el ritmo`}
            </div>

            <Dropdown
                trigger={['click']}
                open={abierta}
                onOpenChange={setAbierta}
                placement='bottomRight'
                popupRender={calculadora}
            >
                <button type='button' className={styles.disclosure} aria-expanded={abierta}>
                    Calculadora de gastos fijos
                    <ChevronDown
                        size={13}
                        className={`${styles.chevron} ${abierta ? styles.chevronOpen : ''}`}
                    />
                </button>
            </Dropdown>
        </div>
    )
}
