import { useCallback, useState } from 'react'
import { IngresosSection } from './IngresosSection'
import { StripeSection } from './StripeSection'
import { MESES } from '../ventasCalculos'
import { EnTopbarFiltros, SelectFiltro } from '../AdminTopbar'
import styles from './VentasSection.module.css'

// Las pestañas (Ingresos y comisiones · Histórico · Stripe) viven en la topbar
// del admin y llegan en `tab`; Mes y Año se dibujan a su derecha. Vendedores e
// Interesados se mudaron a Usuarios › Vendedores.
export const VentasSection = ({ tab = 'ingresos' }) => {
    const now = new Date()

    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [anios, setAnios] = useState([now.getFullYear()])

    // `IngresosSection` descubre los años con ventas al cargar el histórico; el
    // select de año se alimenta de ahí en vez de una lista fija. La identidad de
    // este callback tiene que ser estable: IngresosSection lo usa como dependencia
    // de un efecto que llama a setAnios.
    const handleAnios = useCallback((disponibles) => {
        setAnios(disponibles.length ? disponibles : [new Date().getFullYear()])
    }, [])

    return (
        <div className={styles.ventas}>
            {tab === 'ingresos' && (
                <EnTopbarFiltros>
                    <SelectFiltro value={month} onChange={(e) => setMonth(Number(e.target.value))} aria-label='Mes'>
                        {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </SelectFiltro>
                    <SelectFiltro value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label='Año'>
                        {anios.map(a => <option key={a} value={a}>{a}</option>)}
                    </SelectFiltro>
                </EnTopbarFiltros>
            )}

            {tab === 'ingresos' && (
                <IngresosSection year={year} month={month} onAniosDisponibles={handleAnios} />
            )}
            {/* El histórico reusa el mismo componente: comparte la carga de
                ventas y los modales de editar y abonar, y solo cambia qué
                dibuja. El selector de periodo no le aplica. */}
            {tab === 'historico' && (
                <IngresosSection
                    year={year}
                    month={month}
                    onAniosDisponibles={handleAnios}
                    vista='historico'
                />
            )}
            {tab === 'stripe' && <StripeSection />}
        </div>
    )
}
