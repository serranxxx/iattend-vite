import { createContext, useContext } from 'react'
import { createPortal } from 'react-dom'
import { Plus } from 'lucide-react'
import styles from './AdminShell.module.css'

/*
  Ranuras de la topbar del admin (AdminLayout). Las pestañas de cada ruta viven
  en la topbar; los filtros de la pestaña van a la derecha de esa misma fila y
  algunas secciones ponen ahí su acción principal (p. ej. "Nuevo planner").
  Cada sección los dibuja con un portal a estas ranuras, así su estado sigue
  viviendo en la sección.
*/
const AdminTopbarContext = createContext({ filtrosSlot: null, accionSlot: null })

export const AdminTopbarProvider = AdminTopbarContext.Provider

export const EnTopbarFiltros = ({ children }) => {
    const { filtrosSlot } = useContext(AdminTopbarContext)
    return filtrosSlot ? createPortal(children, filtrosSlot) : null
}

export const EnTopbarAccion = ({ children }) => {
    const { accionSlot } = useContext(AdminTopbarContext)
    return accionSlot ? createPortal(children, accionSlot) : null
}

/** Acción principal de la topbar (pill navy con "+"). */
export const AccionTopbar = ({ children, onClick }) => (
    <button type='button' className={styles.primaryAction} onClick={onClick}>
        <Plus size={15} strokeWidth={2.2} />
        {children}
    </button>
)

/** Segmentado compacto para filtros: [{ value, label }]. */
export const Segmentado = ({ opciones, valor, onCambio, ariaLabel }) => (
    <div className={styles.segmentado} role='radiogroup' aria-label={ariaLabel}>
        {opciones.map(o => (
            <button
                key={o.value}
                type='button'
                role='radio'
                aria-checked={valor === o.value}
                className={`${styles.segmento} ${valor === o.value ? styles.segmentoActivo : ''}`}
                onClick={() => onCambio(o.value)}
            >
                {o.label}
            </button>
        ))}
    </div>
)

/** Select nativo con el estilo de los filtros de la topbar. */
export const SelectFiltro = ({ className = '', ...props }) => (
    <select className={`${styles.selectFiltro} ${className}`} {...props} />
)
