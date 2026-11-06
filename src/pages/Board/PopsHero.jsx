import { useTranslation } from 'react-i18next'
import { PopsLogo } from '../../components/PopsLogo/PopsLogo'
import bizCorazon from '../../assets/pops-stickers/biz/corazon.svg'
import bizDestello from '../../assets/pops-stickers/biz/destello.svg'
import bizExplosion from '../../assets/pops-stickers/biz/explosion.svg'
import bizGlobo from '../../assets/pops-stickers/biz/globo.svg'
import bizNota from '../../assets/pops-stickers/biz/nota.svg'
import bizOjos from '../../assets/pops-stickers/biz/ojos.svg'
import craftCorazon from '../../assets/pops-stickers/craft/corazon.svg'
import craftDestello from '../../assets/pops-stickers/craft/destello.svg'
import craftExplosion from '../../assets/pops-stickers/craft/explosion.svg'
import craftGlobo from '../../assets/pops-stickers/craft/globo.svg'
import craftNota from '../../assets/pops-stickers/craft/nota.svg'
import craftOjos from '../../assets/pops-stickers/craft/ojos.svg'
import styles from './PopsHero.module.css'

/*
  Hero de la sección Pops en escritorio para Business y Craft (handoff
  "Editor de Pops — 3 estilos", §11): la misma composición que el de Pop
  (PopsSection): saludo · wordmark "Pops" · "Para lo que surja, Send a Pop."
  · párrafo · Send a Pop / Conoce los Pops · collage de 6 stickers a la
  derecha · borde de abajo. Cambian fondo, stickers y borde:
  - business: azul con cuadrícula y degradado, stickers redondos, onda lima.
  - craft: tapete de corte, stickers recortados con cinta, papel rasgado.
  El collage va en el mismo lugar y con las mismas posiciones que el de Pop
  (caja 300 × 320 a la derecha del texto, entra con popIn y luego flota);
  "POP!" va en HTML encima del globo.
*/

const STICKERS = {
    business: { ojos: bizOjos, destello: bizDestello, explosion: bizExplosion, globo: bizGlobo, corazon: bizCorazon, nota: bizNota },
    craft: { ojos: craftOjos, destello: craftDestello, explosion: craftExplosion, globo: craftGlobo, corazon: craftCorazon, nota: craftNota },
}

// Mismas posiciones, tamaños, giros y tiempos que el collage del hero de Pop
// (STICKERS de PopsSection.jsx, caja 300 × 320). `size` es el del sticker de
// Pop (PopSticker, viewBox de 120 con 10 de aire); estos SVG traen 14 de aire
// en 128, así que se dibujan un poco más grandes para que el dibujo mida lo
// mismo (ver `medida`). Cinta solo en Craft.
const COLLAGE = [
    { id: 'explosion', pos: { left: 70, top: 70 }, size: 170, rot: -8, delay: 0, cinta: { left: '50%', top: 2, w: 58, rot: -8 } },
    { id: 'globo', pos: { left: 120, top: 104 }, size: 120, rot: 6, delay: 0.4, pop: true },
    { id: 'ojos', pos: { left: 6, top: 0 }, size: 96, rot: -10, delay: 1.2, cinta: { left: '50%', top: -6, w: 40, rot: 4 } },
    { id: 'destello', pos: { right: 6, top: 18 }, size: 52, rot: 0, delay: 0.9 },
    { id: 'corazon', pos: { left: 0, bottom: 10 }, size: 86, rot: -14, delay: 0.6, cinta: { left: '30%', top: -2, w: 46, rot: -30 } },
    { id: 'nota', pos: { right: 0, bottom: 0 }, size: 80, rot: 12, delay: 1.5, cinta: { left: '70%', top: -4, w: 44, rot: 20 } },
]

// Celular: el collage de 150 × 150 del hero móvil de Pop (STICKERS_MOVIL).
const COLLAGE_MOVIL = [
    // Más abierto hacia la izquierda que el de Pop (caja de 190 × 150).
    { id: 'explosion', pos: { left: 34, top: 24 }, size: 92, rot: -8, delay: 0, cinta: { left: '50%', top: 0, w: 34, rot: -8 } },
    { id: 'globo', pos: { left: 74, top: 46 }, size: 68, rot: 6, delay: 0.4, pop: true },
    { id: 'ojos', pos: { right: 0, top: -6 }, size: 50, rot: -10, delay: 1.2, cinta: { left: '50%', top: -4, w: 24, rot: 4 } },
    { id: 'destello', pos: { left: 2, top: 104 }, size: 28, rot: 0, delay: 0.9 },
]

// Lado del SVG para que su dibujo mida como el de PopSticker de `size`.
const medida = (size) => Math.round((size * 128) / 120)

const ONDA = 'M0 22 Q 27.5 4 55 22 T 110 22 Q 137.5 4 165 22 T 220 22 Q 247.5 4 275 22 T 330 22 Q 357.5 4 385 22 T 440 22 Q 467.5 4 495 22 T 550 22 Q 577.5 4 605 22 T 660 22 Q 687.5 4 715 22 T 770 22 Q 797.5 4 825 22 T 880 22 Q 907.5 4 935 22 T 990 22 Q 1017.5 4 1045 22 T 1100 22'

// `movil`: el hero del celular, igual al de Pop móvil (collage chico arriba a
// la derecha, titular en dos renglones y solo "Conoce los Pops").
export const PopsHero = ({ tema, greeting, puedeCrear, onCrear, onConoce, movil = false }) => {
    const { t } = useTranslation()
    const imgs = STICKERS[tema] ?? STICKERS.business
    // Color del wordmark: blanco (Business) o papel (Craft).
    const colorLogo = tema === 'craft' ? '#F3F2EE' : '#FFFFFF'

    const coleccion = (
        <div className={styles.collage} aria-hidden>
            {(movil ? COLLAGE_MOVIL : COLLAGE).map((st, i) => {
                const lado = medida(st.size)
                const extra = (lado - st.size) / 2
                // Corrige la posición para que el centro quede donde el de Pop.
                const pos = Object.fromEntries(Object.entries(st.pos).map(([k, v]) => [k, v - extra]))
                return (
                    <span key={st.id} className={styles.sticker} style={{ ...pos, width: lado, height: lado, animationDelay: `${0.35 + i * 0.08}s` }}>
                        <span
                            className={styles.flota}
                            style={{ '--r': `${st.rot}deg`, animationDuration: `${4 + i * 0.7}s`, animationDelay: `${st.delay}s` }}
                        >
                            <img src={imgs[st.id]} alt='' />
                            {st.pop && <span className={styles.pop}>POP!</span>}
                            {tema === 'craft' && st.cinta && (
                                <span
                                    className={styles.cinta}
                                    style={{ left: st.cinta.left, top: st.cinta.top, width: st.cinta.w, marginLeft: -st.cinta.w / 2, transform: `rotate(${st.cinta.rot}deg)` }}
                                />
                            )}
                        </span>
                    </span>
                )
            })}
        </div>
    )

    // Business: el fondo termina en onda (máscara en el CSS) y aquí solo va
    // la línea lima. Craft no lleva borde: la orilla rasgada es la del corcho
    // de abajo (PopsCraft .corcho), así no queda una tira de papel suelta.
    const borde = tema === 'craft' ? null : (
        <svg className={styles.borde} viewBox='0 0 1100 40' preserveAspectRatio='none' aria-hidden>
            <path className={styles.ondaLinea} d={ONDA} />
        </svg>
    )

    if (movil) {
        return (
            <section className={`${styles.hero} ${styles.movil}`} data-tema={tema}>
                {coleccion}
                <div className={styles.texto}>
                    <span className={styles.saludo}>{greeting} 👋</span>
                    {/* El mismo wordmark animado del hero de Pop. */}
                    <div className={styles.logoMovil}>
                        <PopsLogo size={90} color={colorLogo} autoplay={6} alMontar={0.45} />
                    </div>
                    <span className={styles.titular}>
                        {t('pops_section.headline_a')}<br />
                        <span className={styles.resalte}>
                            {t('pops_section.headline_b')}
                            {tema === 'craft' && <span className={styles.cintaResalte} aria-hidden />}
                        </span>
                    </span>
                    <p className={styles.lede}>{t('pops_section.lede')}</p>
                    <button type='button' className={`${styles.botonContorno} ${styles.conoceMovil}`} onClick={onConoce}>
                        {t('pops_section.learn')} <span>· {t('pops_section.how_it_works')}</span>
                    </button>
                </div>
                {borde}
            </section>
        )
    }

    return (
        <section className={styles.hero} data-tema={tema}>
            <div className={styles.fila}>
                <div className={styles.texto}>
                    <span className={styles.saludo}>{greeting} 👋</span>
                    <div className={styles.logo}>
                        <PopsLogo size={176} color={colorLogo} autoplay={6} alMontar={0.45} />
                    </div>
                    <span className={styles.titular}>
                        {t('pops_section.headline_a')}{' '}
                        <span className={styles.resalte}>
                            {t('pops_section.headline_b')}
                            {tema === 'craft' && <span className={styles.cintaResalte} aria-hidden />}
                        </span>
                    </span>
                    <p className={styles.lede}>{t('pops_section.lede')}</p>
                    <div className={styles.botones}>
                        {puedeCrear && <button type='button' className={styles.botonPrincipal} onClick={onCrear}>{t('pops_section.send')} ↗</button>}
                        <button type='button' className={styles.botonContorno} onClick={onConoce}>{t('pops_section.learn')}</button>
                    </div>
                </div>
                {coleccion}
            </div>

            {borde}
        </section>
    )
}

export default PopsHero
