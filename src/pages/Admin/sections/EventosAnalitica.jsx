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
import { AnaliticaModulos } from './AnaliticaModulos'
import { AnaliticaPromedio } from './AnaliticaPromedio'
import { AnaliticaResumen } from './AnaliticaResumen'
import { AnaliticaRespuestas } from './AnaliticaRespuestas'
import { AnaliticaFuncionesNuevas } from './AnaliticaFuncionesNuevas'
import { nombreDeMes } from '../analiticaCalculos'
import { EnTopbarFiltros, Segmentado, SelectFiltro } from '../AdminTopbar'
import styles from './EventosAnalitica.module.css'

// Las pestañas viven en la topbar del admin (AdminLayout → SUBTABS.analitica)
// y llegan en `etapa`:
//   envios (Últimos 30 días) · eventos · historial (Envíos) · respuestas ·
//   modulos (Mesas y side events) · nuevas · lia · promedio (Perfil)
// Sus filtros (ventana de días, periodo) se dibujan a la derecha de esa fila.

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

export const EventosAnalitica = ({ etapa = 'envios', invitations, esPrueba }) => {

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
    // Mesas y side events comparten periodo (los meses los reporta Mesas).
    const modulos = usePeriodo()
    const nuevas = usePeriodo()
    const lia = usePeriodo()

    const periodoActivo = { respuestas, modulos, nuevas, lia }[etapa] ?? null


    return (
        <div className={styles.contenedor}>
            <EnTopbarFiltros>
                {etapa === 'envios' && (
                    <Segmentado
                        ariaLabel='Ventana de días'
                        valor={ventanaDias}
                        onCambio={setVentanaDias}
                        opciones={[[7, '7 d'], [30, '30 d'], [90, '90 d'], [365, '1 año']].map(([value, label]) => ({ value, label }))}
                    />
                )}
                {periodoActivo && (
                    <SelectFiltro
                        value={periodoActivo.mes}
                        onChange={(e) => periodoActivo.setMes(e.target.value)}
                        aria-label='Periodo'
                    >
                        <option value='todo'>Todo el histórico</option>
                        {periodoActivo.meses.map(clave => (
                            <option key={clave} value={clave}>{nombreDeMes(clave)}</option>
                        ))}
                    </SelectFiltro>
                )}
            </EnTopbarFiltros>


            {etapa === 'promedio' && <AnaliticaPromedio invitacionesReales={reales} />}
            {etapa === 'envios' && (
                <AnaliticaResumen invitacionesReales={reales} dias={ventanaDias} />
            )}
            {etapa === 'eventos' && (
                <AnaliticaInvitaciones
                    invitacionesReales={reales}
                    totalInvitaciones={(invitations ?? []).length}
                />
            )}
            {etapa === 'historial' && <AnaliticaEnvios invitacionesReales={reales} />}
            {etapa === 'modulos' && (
                <AnaliticaModulos
                    invitacionesReales={reales}
                    mes={modulos.mes}
                    onMesesDisponibles={modulos.recibirMeses}
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
