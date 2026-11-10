import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Link2 } from 'lucide-react'
import { CatalogoPrecios } from '../../Precios/PreciosPage'
import { RUTA_CATALOGO } from '../../Precios/catalogoPrecios'
import { copiarLink } from '../../Precios/formatoPrecio'
import { EnTopbarAccion } from '../AdminTopbar'
import styles from './PreciosSection.module.css'

// Admin › Ventas › Precios: el mismo catálogo de la página pública
// (RUTA_CATALOGO), y en la topbar el link público para copiarlo o abrirlo.
export const PreciosSection = () => {
    const { t } = useTranslation()
    const url = `${window.location.origin}${RUTA_CATALOGO}`

    return (
        <div className={styles.precios}>
            <EnTopbarAccion>
                <div className={styles.acciones}>
                    <a className={styles.secundaria} href={RUTA_CATALOGO} target="_blank" rel="noopener noreferrer" aria-label="Abrir catálogo público">
                        <ArrowUpRight size={15} />
                        <span className={styles.texto}>Abrir</span>
                    </a>
                    <button type="button" className={styles.principal} onClick={() => copiarLink(url, t)} aria-label="Copiar link público">
                        <Link2 size={15} />
                        <span className={styles.texto}>Copiar link público</span>
                    </button>
                </div>
            </EnTopbarAccion>
            <CatalogoPrecios embebido />
        </div>
    )
}
