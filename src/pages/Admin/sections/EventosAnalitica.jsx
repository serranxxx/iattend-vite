/*
  Analítica de producto (Admin → Eventos → Analítica).

  Es un contenedor con pestañas: cada etapa del roadmap de analítica vive en su
  propio componente y se monta solo cuando se abre. Eso importa porque las
  etapas que consultan Supabase (Envíos en adelante) traen miles de filas, y no
  tiene sentido pagarlas al entrar a la pestaña de Invitaciones.
*/

import { useCallback, useMemo, useState } from 'react'
import { AnaliticaEnvios } from './AnaliticaEnvios'
import { AnaliticaInvitaciones } from './AnaliticaInvitaciones'
import { AnaliticaLia } from './AnaliticaLia'
import { AnaliticaMesas } from './AnaliticaMesas'
import { AnaliticaPromedio } from './AnaliticaPromedio'
import { AnaliticaResumen } from './AnaliticaResumen'
import { AjusteDeVentana, PresetsDeVentana } from './VentanaDeDias'
import { AnaliticaRespuestas } from './AnaliticaRespuestas'
import { AnaliticaFuncionesNuevas } from './AnaliticaFuncionesNuevas'
import { AnaliticaSideEvents } from './AnaliticaSideEvents'
import { nombreDeMes } from '../analiticaCalculos'
import styles from './EventosAnalitica.module.css'

const ETAPAS = [
    // Va primero y con ventana propia de 30 días corridos: es el parte de
    // resultados, no una etapa del roadmap. No entra en el selector de Periodo
    // porque ahí solo hay meses de calendario, que es justo lo que no mide.
    { key: 'resumen', label: 'Últimos 30 días' },
    { key: 'eventos', label: 'Eventos' },
    { key: 'envios', label: 'Envíos' },
    { key: 'respuestas', label: 'Respuestas' },
    { key: 'mesas', label: 'Mesas' },
    { key: 'side', label: 'Side events' },
    // Save the date y Photo wall van juntas: son las dos funciones más nuevas y
    // ninguna tiene todavía volumen para una pestaña propia.
    { key: 'nuevas', label: 'Funciones nuevas' },
    { key: 'lia', label: 'Lia' },
    // Va al final porque no es una etapa más: es el retrato que resume en una
    // frase lo que las anteriores desglosan. Tiene ventana propia (3/6/12
    // meses) y por eso no entra en el selector de Periodo de la barra.
    { key: 'promedio', label: 'Target' },
]

// Estado de un filtro de periodo. Las opciones no se conocen hasta que la
// etapa carga sus datos, así que las reporta ella; la guarda de identidad evita
// el bucle de render, porque el arreglo se recrea en cada cálculo aunque su
// contenido sea el mismo.
const usePeriodo = () => {
    const [mes, setMes] = useState('todo')
    const [meses, setMeses] = useState([])

    const recibirMeses = useCallback((siguientes) => {
        setMeses(previos => (previos.join() === siguientes.join() ? previos : siguientes))
    }, [])

    return { mes, setMes, meses, recibirMeses }
}

export const EventosAnalitica = ({ invitations, esPrueba }) => {
    // Abre en el resumen: es la lectura que contesta "cómo vamos" sin pedir
    // que nadie elija una etapa primero.
    const [etapa, setEtapa] = useState('resumen')

    // Envíos y respuestas se cruzan contra las invitaciones reales, así que el
    // filtro de pruebas se resuelve aquí una sola vez y no en cada etapa.
    const reales = useMemo(
        () => (invitations ?? []).filter(i => !esPrueba(i)),
        [invitations, esPrueba],
    )

    // Los filtros de periodo viven aquí para poder dibujarse en la misma fila
    // que las pestañas. Cada etapa reporta sus propios meses al terminar de
    // cargar, y son distintos: Respuestas los saca de la fecha de envío y Mesas
    // de la fecha en que se creó la invitación.
    // El resumen no usa el selector de meses: su ventana son días corridos y su
    // control es un slider. Vive aquí, junto a las pestañas, porque comparte
    // fila con ellas.
    const [ventanaDias, setVentanaDias] = useState(30)

    const respuestas = usePeriodo()
    const mesas = usePeriodo()
    const side = usePeriodo()
    const nuevas = usePeriodo()
    const lia = usePeriodo()

    const periodoActivo = { respuestas, mesas, side, nuevas, lia }[etapa] ?? null

    // Rango que cubre la ventana. Es aritmética de fechas, no un dato del
    // backend, así que se arma aquí en vez de subirlo desde el resumen.
    const rango = useMemo(() => {
        const hasta = new Date()
        const desde = new Date(hasta.getTime() - ventanaDias * 86_400_000)
        const cruzaDeAnio = desde.getFullYear() !== hasta.getFullYear()

        const texto = (valor) => valor.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: cruzaDeAnio ? 'numeric' : undefined,
        }).replace('.', '')

        return { desde: texto(desde), hasta: texto(hasta) }
    }, [ventanaDias])

    return (
        <div className={styles.contenedor}>
            <div className={styles.nav}>
                <div className={styles.navFila}>
                    <div className={styles.etapas}>
                        {ETAPAS.map(({ key, label }) => (
                            <button
                                key={key}
                                type='button'
                                className={`${styles.etapa} ${etapa === key ? styles.etapaActiva : ''}`}
                                onClick={() => setEtapa(key)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {etapa === 'resumen' && (
                        <PresetsDeVentana dias={ventanaDias} onCambio={setVentanaDias} />
                    )}

                    {periodoActivo && (
                        <div className={styles.filtroGeneral}>
                            <span className={styles.filtroEtiqueta}>Periodo</span>
                            <select
                                className={styles.selectorMes}
                                value={periodoActivo.mes}
                                onChange={(e) => periodoActivo.setMes(e.target.value)}
                                aria-label='Periodo'
                            >
                                <option value='todo'>Todo el histórico</option>
                                {periodoActivo.meses.map(clave => (
                                    <option key={clave} value={clave}>{nombreDeMes(clave)}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {etapa === 'resumen' && (
                    <div className={styles.navPie}>
                        <span>
                            Días corridos hasta hoy · <b>{rango.desde}</b> → <b>{rango.hasta}</b>
                        </span>
                        <AjusteDeVentana dias={ventanaDias} onCambio={setVentanaDias} />
                    </div>
                )}
            </div>

            {etapa === 'promedio' && <AnaliticaPromedio invitacionesReales={reales} />}
            {etapa === 'resumen' && (
                <AnaliticaResumen invitacionesReales={reales} dias={ventanaDias} />
            )}
            {etapa === 'eventos' && (
                <AnaliticaInvitaciones
                    invitacionesReales={reales}
                    totalInvitaciones={(invitations ?? []).length}
                />
            )}
            {etapa === 'envios' && <AnaliticaEnvios invitacionesReales={reales} />}
            {etapa === 'mesas' && (
                <AnaliticaMesas
                    invitacionesReales={reales}
                    mes={mesas.mes}
                    onMesesDisponibles={mesas.recibirMeses}
                />
            )}
            {etapa === 'lia' && (
                <AnaliticaLia
                    invitacionesReales={reales}
                    mes={lia.mes}
                    onMesesDisponibles={lia.recibirMeses}
                />
            )}
            {etapa === 'nuevas' && (
                <AnaliticaFuncionesNuevas
                    invitacionesReales={reales}
                    mes={nuevas.mes}
                    onMesesDisponibles={nuevas.recibirMeses}
                />
            )}
            {etapa === 'side' && (
                <AnaliticaSideEvents
                    invitacionesReales={reales}
                    mes={side.mes}
                    onMesesDisponibles={side.recibirMeses}
                />
            )}
            {etapa === 'respuestas' && (
                <AnaliticaRespuestas
                    invitacionesReales={reales}
                    mes={respuestas.mes}
                    onMesesDisponibles={respuestas.recibirMeses}
                />
            )}
        </div>
    )
}
