import styles from './TableroAzul.module.css'

/*
  Tablero de corte azul del estilo "Collage azul · lima" de Pops (handoff
  "App Pops — Inicio, Clientes y Mis Pops"): fondo #2457A4 con cuadrícula
  (mayores cada 96 px, menores cada 24 px; 72 / 18 en `movil`), viñeta, la
  regla de la orilla izquierda y de arriba, y las líneas cruzadas (diagonal,
  punteada y arco). Solo vive dentro de los contenedores azules; el resto de
  la app es Business.

  lineas: 'hero' (banner del Inicio), 'banda' (encabezado de Clientes /
  Mis Pops) o 'movil' (banner del celular). Las clases del papel, el botón
  lima y las estrellas están en TableroAzul.module.css (importarlo directo).
*/

const LINEAS = {
    hero: (
        <svg viewBox='0 0 1088 490' preserveAspectRatio='none'>
            <line x1='196' y1='490' x2='675' y2='0' stroke='rgba(232,240,255,.35)' />
            <line x1='490' y1='490' x2='1088' y2='74' stroke='rgba(232,240,255,.3)' strokeDasharray='6 6' />
            <circle cx='936' cy='539' r='343' fill='none' stroke='rgba(232,240,255,.22)' />
        </svg>
    ),
    banda: (
        <svg viewBox='0 0 1088 156' preserveAspectRatio='none'>
            <line x1='196' y1='156' x2='675' y2='0' stroke='rgba(232,240,255,.35)' />
            <line x1='490' y1='156' x2='1088' y2='23' stroke='rgba(232,240,255,.3)' strokeDasharray='6 6' />
            <circle cx='936' cy='172' r='109' fill='none' stroke='rgba(232,240,255,.22)' />
        </svg>
    ),
    movil: (
        <svg viewBox='0 0 358 600' preserveAspectRatio='none'>
            <line x1='40' y1='600' x2='300' y2='0' stroke='rgba(232,240,255,.3)' />
            <line x1='150' y1='600' x2='358' y2='120' stroke='rgba(232,240,255,.28)' strokeDasharray='6 6' />
        </svg>
    ),
}

export const TableroAzul = ({ lineas = 'hero', movil = false, className = '', children, ...resto }) => (
    <div className={`${styles.tablero} ${movil ? styles.movil : ''} ${className}`} {...resto}>
        <span aria-hidden className={styles.reglaIzq} />
        <span aria-hidden className={styles.reglaArriba} />
        <span aria-hidden className={styles.lineas}>{LINEAS[lineas]}</span>
        {children}
    </div>
)

export default TableroAzul
