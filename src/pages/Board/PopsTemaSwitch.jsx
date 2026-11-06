import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TEMAS_POPS } from './usePopsTema'
import styles from './PopsTemaSwitch.module.css'

/**
 * Selector "Cambia tu estilo" de la sección Pops (handoff "Cambia tu estilo",
 * versión de 3 estilos): un botón con el estilo actual ("TU ESTILO" + nombre
 * + ▾) que abre un panel con las tres opciones, cada una con su miniatura.
 * En escritorio las opciones van en fila; en celular, en columna con la
 * miniatura a la izquierda. Se cierra al elegir, con clic fuera y con Esc.
 *
 * onCambiar(tema, elemento): el elemento (el botón) es el origen del círculo.
 */

const EMOJI = { pop: '🎉', business: '💼', craft: '✂️' }

// Miniatura del hero de cada estilo (dibujada con CSS, sin imágenes).
const Mini = ({ tema }) => (
    <span className={styles.mini} data-tema={tema} aria-hidden>
        {tema === 'pop' && (
            <>
                <span className={styles.miniPopHero} />
                <svg viewBox='0 0 100 10' preserveAspectRatio='none' className={styles.miniPopZigzag}>
                    <polyline points='0,6 15,2 32,8 52,1 70,7 86,3 100,6' />
                </svg>
                <span className={styles.miniPopLogo}>Pops</span>
                <span className={styles.miniPopRosa} />
                <span className={styles.miniPopLima} />
                <span className={styles.miniPopAzul} />
            </>
        )}
        {tema === 'business' && (
            <>
                <span className={styles.miniBizHero} />
                <span className={styles.miniBizLogo}>POPS</span>
                <span className={styles.miniBizTag}>BIZ</span>
                <span className={styles.miniBizTarjeta} />
                <span className={styles.miniBizPanel} />
                <span className={styles.miniBizLinea} />
            </>
        )}
        {tema === 'craft' && (
            <>
                <span className={styles.miniCraftEstrella} />
                <span className={styles.miniCraftSurja}>SURJA,</span>
                <span className={styles.miniCraftCorcho} />
                <span className={styles.miniCraftPapel} />
                <span className={styles.miniCraftSticky} />
            </>
        )}
    </span>
)

export const PopsTemaSwitch = ({ tema, onCambiar, movil = false }) => {
    const { t } = useTranslation()
    const [abierto, setAbierto] = useState(false)
    const raiz = useRef(null)
    const boton = useRef(null)
    const lista = useRef(null)
    const idLista = useId()

    // Clic fuera y Esc cierran.
    useEffect(() => {
        if (!abierto) return undefined
        const fuera = (e) => { if (!raiz.current?.contains(e.target)) setAbierto(false) }
        const esc = (e) => {
            if (e.key === 'Escape') {
                setAbierto(false)
                boton.current?.focus()
            }
        }
        document.addEventListener('pointerdown', fuera)
        document.addEventListener('keydown', esc)
        // Al abrir, el foco va a la opción elegida.
        lista.current?.querySelector('[aria-selected="true"]')?.focus()
        return () => {
            document.removeEventListener('pointerdown', fuera)
            document.removeEventListener('keydown', esc)
        }
    }, [abierto])

    const elegir = (nuevo) => {
        setAbierto(false)
        onCambiar(nuevo, boton.current)
    }

    // Flechas entre las opciones (las dos direcciones sirven en fila y en columna).
    const teclas = (e) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return
        e.preventDefault()
        const opciones = [...(lista.current?.querySelectorAll('[role="option"]') ?? [])]
        const i = opciones.indexOf(document.activeElement)
        const n = opciones.length
        const sig = e.key === 'Home' ? 0
            : e.key === 'End' ? n - 1
                : (i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + n) % n
        opciones[sig]?.focus()
    }

    return (
        <div ref={raiz} className={`${styles.selector} ${movil ? styles.movil : ''}`}>
            <button
                ref={boton}
                type='button'
                className={styles.trigger}
                data-tema={tema}
                aria-haspopup='listbox'
                aria-expanded={abierto}
                aria-controls={abierto ? idLista : undefined}
                aria-label={t('pops_section.theme_current', { estilo: t(`pops_section.theme_${tema}`) })}
                onClick={() => setAbierto(a => !a)}
            >
                <span className={styles.icono} aria-hidden>{EMOJI[tema]}</span>
                {!movil && (
                    <span className={styles.textos}>
                        <span className={styles.etiqueta}>{t('pops_section.theme_label_short')}</span>
                        <span className={styles.nombre}>{t(`pops_section.theme_${tema}`)}</span>
                    </span>
                )}
                <span className={styles.chevron} data-abierto={abierto || undefined} aria-hidden>▾</span>
            </button>

            {abierto && (
                <div className={styles.panel}>
                    <span className={styles.panelTitulo}>{t('pops_section.theme_title')}</span>
                    <div
                        ref={lista}
                        id={idLista}
                        role='listbox'
                        aria-label={t('pops_section.theme_title')}
                        className={styles.opciones}
                        onKeyDown={teclas}
                    >
                        {TEMAS_POPS.map(op => {
                            const activo = op === tema
                            return (
                                <button
                                    key={op}
                                    type='button'
                                    role='option'
                                    aria-selected={activo}
                                    className={styles.opcion}
                                    data-tema={op}
                                    onClick={() => elegir(op)}
                                >
                                    <span className={styles.miniMarco}>
                                        <Mini tema={op} />
                                        {activo && (
                                            <>
                                                <span className={styles.miniActiva} />
                                                <span className={styles.check} aria-hidden>✓</span>
                                            </>
                                        )}
                                    </span>
                                    <span className={styles.opcionTextos}>
                                        <span className={styles.opcionNombre}>{EMOJI[op]} {t(`pops_section.theme_${op}`)}</span>
                                        <span className={styles.opcionDesc}>{t(`pops_section.theme_${op}_desc`)}</span>
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

export default PopsTemaSwitch
