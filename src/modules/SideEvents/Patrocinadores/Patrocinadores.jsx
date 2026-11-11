import { useTranslation } from 'react-i18next'
import { acomodar, ANCHO_FILA, CINTA, etiquetaCategoria, GAP, logosDe, MEDIDA_PORTADA, patrocinadoresDe, porCategoria } from '../patrocinadores'
import { estiloDe, luminancia, variablesDeEstilo } from '../estilosBloque'
import { Cinta } from './Cinta'
import { Logo } from './Logo'
import styles from './Patrocinadores.module.css'

/*
  Los tres acomodos de los patrocinadores de un Pop en la pieza del editor
  (SideCanvas), réplica de iattend-events
  components/SideEvent/Patrocinadores/Patrocinadores.tsx (handoff v2 ·
  categorías):
  · PortadaPatrocinadores: etiqueta + cinta con todas las marcas, del mismo
    tamaño, en el orden de sus categorías (cada una con su color).
  · TarjetaPatrocinadores: tarjeta de vidrio con un bloque por categoría.
  · BandaPatrocinadores: la primera categoría fija arriba y las demás en una
    banda de orilla a orilla que corre sola, avanza con el scroll y se
    arrastra. Con una sola categoría, solo la banda.
  Reglas de tamaños y filas: patrocinadores.js.
*/

const Filas = ({ logos, ancho, gap, oscuro }) => acomodar(logos, { width: ancho, gap }).map((fila, i) => (
    <div key={i} className={styles.fila} style={{ gap }}>
        {fila.map((it) => <Logo key={it.id ?? it.url} it={it} oscuro={oscuro} />)}
    </div>
))

// Logos de la cinta: cada uno con el tamaño (o `medida`) y el color de su categoría.
const logosCinta = (grupos, medida) => grupos.flatMap(({ cat, items }) => logosDe(items, cat, medida))

export const PortadaPatrocinadores = ({ body, className = '', ...raiz }) => {
    const s = patrocinadoresDe(body)
    const logos = logosCinta(porCategoria(s), MEDIDA_PORTADA)
    return (
        <div className={`${styles.portada} ${className}`} {...raiz}>
            <span className={styles.portadaEtiqueta}>{s.label}</span>
            <Cinta logos={logos} gap={GAP.portada} sp={CINTA.portada.sp} speed={s.speed} />
        </div>
    )
}

export const TarjetaPatrocinadores = ({ body }) => {
    const s = patrocinadoresDe(body)
    const grupos = porCategoria(s)
    // Con un estilo de bloques claro, los logos adaptados van con su tinta.
    const tinta = variablesDeEstilo(estiloDe(body), body?.color)['--bloque-tinta']
    const oscuro = /^#[0-9a-f]{6}$/i.test(tinta ?? '') && luminancia(tinta) < 0.4
    // Una sola categoría llamada como el grupo: la etiqueta PATROCINADORES ya lo dice.
    const repetida = (cat) => grupos.length === 1 && etiquetaCategoria(cat) === 'PATROCINADORES'
    return (
        <div className={styles.tarjeta} data-sponsors-card>
            {grupos.map(({ cat, items }) => (
                <div key={cat.id} className={styles.nivel}>
                    {etiquetaCategoria(cat) && !repetida(cat) && <span className={styles.nivelTitulo}>{etiquetaCategoria(cat)}</span>}
                    <div className={styles.filas}>
                        <Filas logos={logosDe(items, cat)} ancho={ANCHO_FILA.tarjeta} gap={GAP.tarjeta} oscuro={oscuro} />
                    </div>
                </div>
            ))}
        </div>
    )
}

export const BandaPatrocinadores = ({ body, scroller, className = '', ...raiz }) => {
    const { t } = useTranslation()
    const s = patrocinadoresDe(body)
    const grupos = porCategoria(s)
    const [primera, ...resto] = grupos
    const enCinta = grupos.length > 1 ? resto : grupos
    const marcas = enCinta.reduce((n, g) => n + g.items.length, 0)
    const etiquetaCinta = enCinta.map((g) => etiquetaCategoria(g.cat)).filter(Boolean).join(' · ')
    return (
        <div className={`${styles.banda} ${className}`} {...raiz}>
            {grupos.length > 1 && (
                <>
                    {etiquetaCategoria(primera.cat) && <span className={styles.nivelTitulo}>{etiquetaCategoria(primera.cat)}</span>}
                    <div className={styles.bandaPrincipal}>
                        <Filas logos={logosDe(primera.items, primera.cat)} ancho={ANCHO_FILA.bandaFija} gap={GAP.bandaFija} />
                    </div>
                    {/* Sobre la cinta, los nombres de sus categorías (las que tengan). */}
                    {etiquetaCinta && <span className={`${styles.nivelTitulo} ${styles.bandaSegunda}`}>{etiquetaCinta}</span>}
                </>
            )}
            <div className={styles.bandaCinta}>
                <Cinta logos={logosCinta(enCinta)} gap={GAP.cinta} sp={CINTA.banda.sp} k={CINTA.banda.k} speed={s.speed} puntos arrastrable scroller={scroller} />
            </div>
            {grupos.length > 1 && <span className={styles.bandaPie}>{t('side_events.sponsors_band_foot', { count: marcas })}</span>}
        </div>
    )
}

