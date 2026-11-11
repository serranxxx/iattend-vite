import { filtroAdaptado } from '../patrocinadores'
import styles from './Patrocinadores.module.css'

// Un logo ya medido (logosDe() de patrocinadores.js: ancho, alto, adaptar).
// Adaptado al diseño va en blanco, o con la tinta del estilo en la tarjeta
// (`oscuro`); a color, tal cual.
export const Logo = ({ it, oscuro = false }) => (
    <img
        className={styles.logo}
        src={it.url}
        alt={it.name || ''}
        width={it.ancho}
        height={it.alto}
        draggable={false}
        loading="lazy"
        style={{ width: it.ancho, height: it.alto, ...(it.adaptar ? { filter: filtroAdaptado(oscuro) } : {}) }}
    />
)
