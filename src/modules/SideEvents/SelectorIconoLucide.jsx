import { useMemo, useState } from 'react'
import { Input } from 'antd'
import { icons } from 'lucide-react'
import { iconNames } from 'lucide-react/dynamic'
import { useTranslation } from 'react-i18next'
import { PREFIJO_LUCIDE } from './IconoMomento'
import ed from './SideEventEditor.module.css'

/*
  Selector de ícono del itinerario de un Flash: todos los íconos de Lucide.
  Trae el set completo de golpe (`icons`), así que se carga con React.lazy
  solo al abrir el selector (ItinerarioFlash.jsx) y no pesa en el editor.
  Se guarda el nombre en kebab ("lucide:plane-landing"), que es el que usa
  DynamicIcon para pintarlo en la pieza y en iattend-events.
*/

const pascal = (nombre) => nombre.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')

// Los nombres que tienen componente propio; los demás son alias viejos.
const CATALOGO = iconNames
    .map(nombre => ({ nombre, Icono: icons[pascal(nombre)] }))
    .filter(({ Icono }) => Icono)

const SelectorIconoLucide = ({ actual, onElegir }) => {
    const { t } = useTranslation()
    const [busqueda, setBusqueda] = useState('')

    const visibles = useMemo(() => {
        const q = busqueda.trim().toLowerCase().replace(/\s+/g, '-')
        return q ? CATALOGO.filter(({ nombre }) => nombre.includes(q)) : CATALOGO
    }, [busqueda])

    return (
        <div className={ed.iconosPanel} onClick={(e) => e.stopPropagation()}>
            <Input
                size='small'
                allowClear
                autoFocus
                placeholder={t('side_events.icons_search')}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
            />
            <div className={ed.iconosGrid}>
                {visibles.map((icono) => (
                    <button
                        type='button'
                        key={icono.nombre}
                        title={icono.nombre}
                        className={`${ed.iconoOpcion} ${actual === PREFIJO_LUCIDE + icono.nombre ? ed.iconoOpcionActivo : ''}`}
                        onClick={() => onElegir(PREFIJO_LUCIDE + icono.nombre)}
                    >
                        <icono.Icono size={18} />
                    </button>
                ))}
                {!visibles.length && <span className={ed.iconosVacio}>{t('side_events.icons_empty')}</span>}
            </div>
            <span className={ed.iconosConteo}>{t('side_events.icons_count', { count: visibles.length })}</span>
        </div>
    )
}

export default SelectorIconoLucide
