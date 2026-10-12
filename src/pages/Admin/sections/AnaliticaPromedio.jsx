/*
  Analítica de producto — Perfil (antes "Target" / "Evento promedio").

  No es una etapa del roadmap: es el retrato de cómo es un evento de I attend
  hoy, armado cruzando lo que ya miden las otras pestañas. Arriba la frase;
  abajo ocho rasgos, cada uno con su valor dominante y las tres categorías que
  más pesan.

  Tres decisiones que lo sostienen:

  · Se usa MEDIANA, no promedio. Un evento con 417 invitados junto a otro con 12
    da un promedio que no describe a ninguno de los dos.

  · La ventana por defecto son los últimos seis meses, porque la pregunta es
    cómo es el cliente HOY. Todos los rasgos se recalculan con la ventana, por
    eso el selector sigue vivo (discreto, dentro del hero).

  · Cada número lleva su muestra. Unas cosas se miden sobre todos los eventos y
    otras sobre los que tienen el dato; por debajo de `MUESTRA_MINIMA` el
    subtítulo se marca.
*/

import { useEffect, useMemo, useState } from 'react'
import {
    ETIQUETA_TIPO, MUESTRA_MINIMA, RANGOS_ANTICIPACION, VENTANAS, contarCiudades, esMesaReal,
    masComun, mediana, ubicacionesDe,
} from '../analiticaCalculos'
import { traerTodo } from '../analiticaDatos'
import { fetchDatosLiaAdmin } from '../catalogoAdminApi'
import { fetchAdminVentas } from '../salesAdminApi'
import { fetchProveedores } from '../usuariosAdminApi'
import { MARCA } from '../adminCharts'
import styles from './AnaliticaPromedio.module.css'

const MS_POR_DIA = 86_400_000

const plural = (n, singular, pluralForma) => `${n} ${n === 1 ? singular : pluralForma}`
const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0)
const miles = (n) => new Intl.NumberFormat('es-MX').format(n)

const enMeses = (dias) => {
    if (dias === null) return '—'
    if (dias < 45) return plural(dias, 'día', 'días')
    return `${Math.round(dias / 30)} meses`
}

// Fecha del evento como día de calendario; ver `fechaDeEvento` en adminConstants.
const diaDelEvento = (invitacion) => (invitacion?.event_date
    ? new Date(String(invitacion.event_date).slice(0, 10))
    : null)

// Las tres barras de cada rasgo, en el orden de la marca sobre blanco.
const COLORES_RASGO = [MARCA.navy, MARCA.lila, MARCA.verde]

// Cortes del tamaño de lista. Los del prototipo: debajo de 150 es una fiesta
// chica, arriba de 300 una boda grande.
const RANGOS_TAMANO = [
    { label: 'Menos de 150', hasta: 149 },
    { label: '150 a 300', hasta: 300 },
    { label: 'Más de 300', hasta: Infinity },
]

const enRango = (rangos, valor) => rangos.find(r => valor <= r.hasta)?.label

// Cuenta etiquetas y las ordena de mayor a menor. `universo` permite medir
// contra algo distinto de la suma (en Funciones un evento usa varias cosas).
const distribucion = (etiquetas, universo = etiquetas.length) => {
    const cuenta = new Map()
    etiquetas.filter(Boolean).forEach(e => cuenta.set(e, (cuenta.get(e) ?? 0) + 1))

    return [...cuenta.entries()]
        .map(([label, total]) => ({ label, total, pct: pct(total, universo) }))
        .sort((a, b) => b.total - a.total)
}

// --------------------------------------------------------- canal y acceso ---

const CANALES = {
    ecommerce: { label: 'Ecommerce', frase: 'directo en línea' },
    vendedor: { label: 'Vendedor', frase: 'con un vendedor' },
    planner: { label: 'Planner', frase: 'a través de un planner' },
}

const PROVEEDORES = { google: 'Google', apple: 'Apple', email: 'Correo' }

// Las ventas se cruzan con su invitación por `invitation_id` (lo devuelve
// `/api/admin/ventas`). Respaldo para un backend que aún no lo mande: el nombre
// del evento armado como `owners.join(' & ')` o `name`. El `label` a secas
// ("wedding") no sirve de llave: lo comparten decenas de eventos.
const nombreDeVenta = (invitacion) => {
    const owners = invitacion?.owners
    if (Array.isArray(owners) && owners.length) return owners.join(' & ')
    return invitacion?.name || null
}

/*
  Planner manda: si el evento tiene planner, el planner es el canal aunque la
  compra pasara por Stripe. Luego la venta registrada (vendedor vs. el vendedor
  "Ecommerce" del webhook). Sin venta registrada se cuenta como ecommerce: el
  registro automático de las compras en línea empezó en septiembre de 2026 y lo
  anterior quedó sin fila, mientras que las de vendedor siempre se capturaron.
*/
const canalDe = (invitacion, ventasPorId, ventasPorNombre) => {
    if (invitacion.planner_id) return 'planner'
    const venta = ventasPorId.get(invitacion.id) ?? ventasPorNombre.get(nombreDeVenta(invitacion))
    if (venta && venta.vendedor_tipo !== 'ecommerce') return 'vendedor'
    return 'ecommerce'
}

// Una cuenta puede tener varios proveedores vinculados; se cuenta el social
// primero porque el correo suele ser el respaldo, no la forma de entrar.
const accesoDe = (lista) => {
    if (!Array.isArray(lista) || lista.length === 0) return null
    if (lista.includes('google')) return 'google'
    if (lista.includes('apple')) return 'apple'
    return 'email'
}

// ------------------------------------------------------------------ datos ---

const useRetrato = (invitacionesReales, ventana) => {
    const [crudo, setCrudo] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelado = false

        // Ventas y proveedores salen del backend y son opcionales: si fallan,
        // sus dos tarjetas quedan "sin datos" y el resto del retrato sigue.
        const opcional = (promesa, etiqueta) => promesa.catch(fallo => {
            console.error(`Perfil: no se pudieron traer ${etiqueta}:`, fallo)
            return null
        })

        Promise.all([
            traerTodo('guests', 'id,invitation_id,state'),
            traerTodo('invitation_message_dispatches', 'invitation_id,guest_id,status,created_at'),
            traerTodo('tables', 'invitation_id,size'),
            traerTodo('side_events', 'invitation_id'),
            fetchDatosLiaAdmin(['conversaciones']).then(d => d.conversaciones),
            opcional(fetchAdminVentas().then(r => r.data?.ventas ?? []), 'las ventas'),
            opcional(fetchProveedores().then(r => r.data?.proveedores ?? {}), 'los proveedores'),
        ])
            .then(([invitados, envios, mesas, sides, conversaciones, ventas, proveedores]) => {
                if (!cancelado) setCrudo({ invitados, envios, mesas, sides, conversaciones, ventas, proveedores })
            })
            .catch(fallo => {
                console.error('Error al armar el retrato:', fallo)
                if (!cancelado) setError(fallo.message)
            })

        return () => { cancelado = true }
    }, [])

    return useMemo(() => {
        if (error) return { error }
        if (!crudo) return { cargando: true }

        const meses = VENTANAS.find(v => v.key === ventana)?.meses ?? null
        const corte = meses ? new Date() : null
        if (corte) corte.setMonth(corte.getMonth() - meses)

        const eventos = invitacionesReales.filter(i => !corte || new Date(i.created_at) >= corte)

        if (eventos.length === 0) return { vacio: true }

        const ids = new Set(eventos.map(i => i.id))
        const porId = new Map(eventos.map(i => [i.id, i]))
        const n = eventos.length

        // --- quién es ---
        const plan = masComun(eventos.map(i => String(i.plan ?? '').toUpperCase()))
        const tipo = masComun(eventos.map(i => ETIQUETA_TIPO[i.label] ?? i.label))

        const ciudades = eventos.flatMap(i => ubicacionesDe(i).map(u => u.ciudad))
        const conteoCiudades = contarCiudades(ciudades)
        const totalCiudades = conteoCiudades.reduce((acc, c) => acc + c.total, 0)
        const eventosUbicados = eventos.filter(i => ubicacionesDe(i).length > 0).length

        // --- cuándo compra ---
        const anticipacion = eventos
            .map(i => {
                const evento = diaDelEvento(i)
                return evento ? Math.round((evento - new Date(i.created_at)) / MS_POR_DIA) : null
            })
            .filter(d => d !== null && d >= 0)

        // --- cuánta gente invita ---
        const invitadosPorEvento = new Map()
        const confirmadosPorEvento = new Map()

        crudo.invitados.forEach(g => {
            if (!ids.has(g.invitation_id)) return
            invitadosPorEvento.set(g.invitation_id, (invitadosPorEvento.get(g.invitation_id) ?? 0) + 1)
            if (['confirmado', 'asistente'].includes(g.state)) {
                confirmadosPorEvento.set(g.invitation_id, (confirmadosPorEvento.get(g.invitation_id) ?? 0) + 1)
            }
        })

        const listas = [...invitadosPorEvento.values()]

        // La tasa de confirmación solo tiene sentido con una lista de tamaño
        // razonable: 1 de 2 confirmados es 50% y no dice nada.
        const tasas = [...invitadosPorEvento.entries()]
            .filter(([, total]) => total >= 10)
            .map(([id, total]) => Math.round(((confirmadosPorEvento.get(id) ?? 0) / total) * 100))

        // --- cuándo envía ---
        const primerEnvio = new Map()

        crudo.envios.forEach(e => {
            if (!ids.has(e.invitation_id) || e.status === 'failed') return
            const momento = new Date(e.created_at)
            const previo = primerEnvio.get(e.invitation_id)
            if (!previo || momento < previo) primerEnvio.set(e.invitation_id, momento)
        })

        // Los dos tiempos se miden sobre el MISMO grupo —los que enviaron y
        // tienen fecha— para que la frase cuadre consigo misma.
        const conEnvio = [...primerEnvio.entries()]
            .map(([id, momento]) => {
                const invitacion = porId.get(id)
                const evento = diaDelEvento(invitacion)
                if (!evento) return null

                return {
                    trasComprar: Math.round((momento - new Date(invitacion.created_at)) / MS_POR_DIA),
                    antesDelEvento: Math.round((evento - momento) / MS_POR_DIA),
                }
            })
            .filter(Boolean)

        // --- qué del producto usa ---
        // "Usa" = abrió el módulo: tiene al menos una mesa real, un side event o
        // le escribió algo a Lia (chips incluidos: abrirla ya es usarla).
        const conMesas = new Set(crudo.mesas.filter(esMesaReal).map(m => m.invitation_id).filter(id => ids.has(id)))
        const conSides = new Set(crudo.sides.map(se => se.invitation_id).filter(id => ids.has(id)))
        const conLia = new Set(crudo.conversaciones
            .filter(c => c.role === 'user' && ids.has(c.invitation_id))
            .map(c => c.invitation_id))

        const FUNCIONES = [
            { label: 'Mesas', usan: conMesas },
            { label: 'Side events', usan: conSides },
            { label: 'Lia', usan: conLia },
        ]

        // La combinación más común dice cómo es el evento típico; el reparto
        // por función (no suma 100: un evento usa varias) dice qué tan común es cada una.
        const combinaciones = eventos.map(i => {
            const usa = FUNCIONES.filter(f => f.usan.has(i.id)).map(f => f.label)
            return usa.length ? usa.join(' + ') : 'Ninguna'
        })

        const funciones = FUNCIONES
            .map(f => ({ label: f.label, total: f.usan.size, pct: pct(f.usan.size, n) }))
            .sort((a, b) => b.total - a.total)

        // --- canal de compra ---
        let canal = null
        if (crudo.ventas) {
            // Nombres repetidos (dos "Ana & Luis") no se pueden atribuir: se
            // descartan en vez de adivinar cuál de las dos es.
            const ventasPorId = new Map(crudo.ventas.filter(v => v.invitation_id).map(v => [v.invitation_id, v]))
            const ventasPorNombre = new Map()
            const repetidos = new Set()
            crudo.ventas.forEach(v => {
                if (v.invitation_id || !v.evento) return
                if (ventasPorNombre.has(v.evento)) repetidos.add(v.evento)
                ventasPorNombre.set(v.evento, v)
            })
            repetidos.forEach(nombre => ventasPorNombre.delete(nombre))

            const canales = eventos.map(i => canalDe(i, ventasPorId, ventasPorNombre))
            canal = { reparto: distribucion(canales.map(c => CANALES[c].label)), clave: masComun(canales) }
        }

        // --- cómo entra ---
        let acceso = null
        if (crudo.proveedores) {
            // Invitaciones "por enviar" del planner no tienen cliente todavía.
            const conCuenta = eventos.filter(i => i.user_id)
            const accesos = conCuenta.map(i => accesoDe(crudo.proveedores[i.user_id])).filter(Boolean)
            acceso = { reparto: distribucion(accesos.map(a => PROVEEDORES[a])), muestra: accesos.length }
        }

        return {
            eventos: n,
            plan: { dominante: plan, reparto: distribucion(eventos.map(i => String(i.plan ?? '').toUpperCase())) },
            tipo: { dominante: tipo, reparto: distribucion(eventos.map(i => ETIQUETA_TIPO[i.label] ?? i.label)) },
            ciudad: {
                reparto: conteoCiudades.map(c => ({ label: c.label, total: c.total, pct: pct(c.total, totalCiudades) })),
                muestra: eventosUbicados,
            },
            compra: {
                dias: mediana(anticipacion),
                muestra: anticipacion.length,
                reparto: distribucion(anticipacion.map(d => enRango(RANGOS_ANTICIPACION, d))),
            },
            invitados: {
                mediana: mediana(listas),
                muestra: listas.length,
                reparto: distribucion(listas.map(t => enRango(RANGOS_TAMANO, t))),
            },
            confirmacion: { pct: mediana(tasas), muestra: tasas.length },
            envio: {
                trasComprar: mediana(conEnvio.map(e => e.trasComprar)),
                antesDelEvento: mediana(conEnvio.map(e => e.antesDelEvento)),
                muestra: conEnvio.length,
            },
            funciones: { combinacion: masComun(combinaciones), reparto: funciones },
            canal,
            acceso,
        }
    }, [crudo, error, invitacionesReales, ventana])
}

// ----------------------------------------------------------------- piezas ---

/*
  Una tarjeta de rasgo: label, valor dominante con su subtítulo y las tres
  categorías que más pesan. Sin `reparto` (dato no disponible) la tarjeta se
  queda con "sin datos" en vez de desaparecer: el hueco también informa.
*/
const Rasgo = ({ titulo, valor, sub, reparto, nuevo, corta }) => {
    const top = (reparto ?? []).slice(0, 3)
    const sinDatos = top.length === 0

    return (
        <section className={styles.rasgo}>
            <header className={styles.rasgoHead}>
                <h3 className={styles.rasgoLabel}>{titulo}</h3>
                {nuevo && <span className={styles.nuevo}>nuevo</span>}
            </header>

            <div className={styles.rasgoValor}>
                <span className={`${styles.valor} ${sinDatos ? styles.valorVacio : ''}`}>
                    {sinDatos ? 'Sin datos' : valor}
                </span>
                {sub && (
                    <span className={`${styles.sub} ${corta ? styles.subCorta : ''}`}>
                        {corta ? '⚠ ' : ''}{sub}
                    </span>
                )}
            </div>

            <ul className={styles.dist}>
                {top.map((d, i) => (
                    <li key={d.label} className={styles.distFila}>
                        <div className={styles.distTexto}>
                            <span className={styles.distLabel} title={d.label}>{d.label}</span>
                            <span className={styles.distPista}>
                                <span
                                    className={styles.distBarra}
                                    style={{ width: `${Math.max(d.pct, 2)}%`, background: COLORES_RASGO[i] }}
                                />
                            </span>
                        </div>
                        <b className={styles.distPct}>{d.pct}%</b>
                    </li>
                ))}
            </ul>
        </section>
    )
}

// Une ["Mesas", "Side events"] como "mesas y side events" para la frase.
const enFrase = (combinacion) => {
    const partes = combinacion.split(' + ').map(p => (p === 'Lia' ? p : p.toLowerCase()))
    if (partes.length === 1) return partes[0]
    return `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`
}

// ----------------------------------------------------------------- panel ---

export const AnaliticaPromedio = ({ invitacionesReales }) => {
    const [ventana, setVentana] = useState('6')
    const datos = useRetrato(invitacionesReales, ventana)

    const etiquetaVentana = VENTANAS.find(v => v.key === ventana)?.label ?? ''

    const selector = (
        <div className={styles.ventanas} role='group' aria-label='Ventana del retrato'>
            {VENTANAS.map(({ key, label }) => (
                <button
                    key={key}
                    type='button'
                    className={`${styles.ventana} ${ventana === key ? styles.ventanaActiva : ''}`}
                    aria-pressed={ventana === key}
                    onClick={() => setVentana(key)}
                >
                    {label}
                </button>
            ))}
        </div>
    )

    if (datos.cargando) return <div className={styles.estado}>Armando el retrato…</div>
    if (datos.error) return <div className={styles.estado}>No se pudo armar: {datos.error}</div>

    if (datos.vacio) {
        return (
            <div className={styles.perfil}>
                <section className={styles.hero}>
                    <div className={styles.heroHead}>
                        <h2 className={styles.heroLabel}>El retrato</h2>
                        {selector}
                    </div>
                    <p className={styles.heroTexto}>No hay eventos creados en esta ventana.</p>
                </section>
            </div>
        )
    }

    const { eventos, plan, tipo, ciudad, compra, invitados, confirmacion, envio, funciones, canal, acceso } = datos
    const ciudadTop = ciudad.reparto[0]
    const canalTop = canal?.clave ? CANALES[canal.clave.valor] : null
    const combinacion = funciones.combinacion?.valor
    const usaAlgo = combinacion && combinacion !== 'Ninguna'

    return (
        <div className={styles.perfil}>
            {/* El retrato en una frase: los mismos números de las tarjetas, dichos
                como se los contarías a alguien. */}
            <section className={styles.hero}>
                <div className={styles.heroHead}>
                    <h2 className={styles.heroLabel}>
                        El retrato de los {eventos} eventos · creados en {ventana === 'todo' ? 'total' : `los últimos ${etiquetaVentana}`}
                    </h2>
                    {selector}
                </div>

                <p className={styles.heroTexto}>
                    Una <b>{tipo.dominante?.valor ?? 'celebración'}</b>
                    {plan.dominante && <> con plan <b>{plan.dominante.valor}</b></>}
                    {ciudadTop && <> en <b>{ciudadTop.label}</b></>}
                    , que compró{canalTop && <> <b>{canalTop.frase}</b></>}
                    {compra.dias !== null && <> <b>{enMeses(compra.dias)}</b> antes del evento</>}
                    {invitados.mediana !== null && <>, con <b>{miles(invitados.mediana)} invitados</b></>}
                    {envio.antesDelEvento !== null && (
                        <>. Manda sus invitaciones <b>{enMeses(envio.trasComprar)}</b> después de comprar
                        y <b>{enMeses(envio.antesDelEvento)}</b> antes de la fiesta</>
                    )}
                    {usaAlgo && <>, usa <b className={styles.lila}>{enFrase(combinacion)}</b></>}
                    {confirmacion.pct !== null && (
                        <>, y consigue <b className={styles.verde}>{confirmacion.pct}% de confirmación</b></>
                    )}
                    .
                </p>
            </section>

            <div className={styles.rasgos}>
                <Rasgo
                    titulo='Tipo de evento'
                    valor={tipo.dominante?.valor}
                    sub={tipo.dominante && `${tipo.dominante.porcentaje}% de los eventos`}
                    reparto={tipo.reparto}
                />
                <Rasgo
                    titulo='Plan'
                    valor={plan.dominante?.valor}
                    sub={plan.dominante && `${plan.dominante.porcentaje}% lo elige`}
                    reparto={plan.reparto}
                />
                <Rasgo
                    titulo='Ciudad'
                    valor={ciudadTop?.label}
                    sub={ciudadTop && `${ciudadTop.pct}% de los ubicados · ${ciudad.muestra} de ${eventos} con sede`}
                    corta={ciudad.muestra < MUESTRA_MINIMA}
                    reparto={ciudad.reparto}
                />
                <Rasgo
                    titulo='Anticipación de compra'
                    valor={enMeses(compra.dias)}
                    sub={`mediana antes del evento · ${compra.muestra} de ${eventos}`}
                    corta={compra.muestra < MUESTRA_MINIMA}
                    reparto={compra.reparto}
                />
                <Rasgo
                    titulo='Tamaño'
                    valor={invitados.mediana !== null ? miles(invitados.mediana) : null}
                    sub={`invitados (mediana) · ${invitados.muestra} de ${eventos} con lista`}
                    corta={invitados.muestra < MUESTRA_MINIMA}
                    reparto={invitados.reparto}
                />
                <Rasgo
                    nuevo
                    titulo='Canal de compra'
                    valor={canal?.clave ? CANALES[canal.clave.valor].label : null}
                    sub={canal?.clave && `${canal.clave.porcentaje}% · sin venta registrada cuenta como ecommerce`}
                    reparto={canal?.reparto}
                />
                <Rasgo
                    nuevo
                    titulo='Funciones que usa'
                    valor={combinacion}
                    sub={funciones.combinacion && `${funciones.combinacion.porcentaje}% de los eventos · barras: cuántos usan cada una`}
                    reparto={funciones.reparto}
                />
                <Rasgo
                    nuevo
                    titulo='Cómo entra'
                    valor={acceso?.reparto[0]?.label}
                    sub={acceso && `acceso a la cuenta · ${acceso.muestra} de ${eventos} con cuenta`}
                    corta={acceso && acceso.muestra < MUESTRA_MINIMA}
                    reparto={acceso?.reparto}
                />
            </div>
        </div>
    )
}
