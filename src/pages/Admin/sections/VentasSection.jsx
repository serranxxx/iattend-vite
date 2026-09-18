import { useCallback, useState } from 'react'
import { InteresadosSection } from './InteresadosSection'
import { IngresosSection } from './IngresosSection'
import { VendedoresSection } from './VendedoresSection'
import { MESES } from '../ventasCalculos'
import styles from './VentasSection.module.css'

const TABS = [
    { key: 'ventas', label: 'Ingresos y comisiones' },
    { key: 'historico', label: 'Histórico de ventas' },
    { key: 'vendedores', label: 'Vendedores' },
    { key: 'interesados', label: 'Interesados' },
]

export const VentasSection = () => {
    const now = new Date()

    const [tab, setTab] = useState('ventas')
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
            <div className={styles.controls}>
                <div className={styles.tabs}>
                    {TABS.map(({ key, label }) => (
                        <button
                            key={key}
                            type='button'
                            className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}
                            onClick={() => setTab(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className={styles.spacer} />

                {tab === 'ventas' && (
                    <>
                        <select
                            className={styles.select}
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                            aria-label='Mes'
                        >
                            {MESES.map((m, i) => (
                                <option key={m} value={i + 1}>{m}</option>
                            ))}
                        </select>

                        <select
                            className={styles.select}
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            aria-label='Año'
                        >
                            {anios.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </>
                )}
            </div>

            {tab === 'ventas' && (
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
            {tab === 'vendedores' && <VendedoresSection />}
            {tab === 'interesados' && <InteresadosSection />}
        </div>
    )
}
