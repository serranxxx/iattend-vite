import { useState } from 'react'
import { Drawer, Dropdown } from 'antd'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown } from 'lucide-react'
import { PopsLogo } from '../../components/PopsLogo/PopsLogo'
import logoNegro from '/images/logo_negro.png'
import styles from './EspacioSelector.module.css'

/**
 * Switch de espacios Weddings / Pops (handoff "Switch de espacios", 4a · Logo
 * desplegable): el logo de la barra es un botón que abre "Cambiar de espacio"
 * con un resumen de cada uno y ✓ en el activo. En celular el mismo menú sale
 * como hoja inferior desde el logo del header.
 *
 * espacio: 'weddings' | 'pops'. resumen: { weddings, pops } (subtítulos).
 * puedeCambiar = false (cuenta de un solo espacio): solo el logo, sin borde
 * ni flecha. botonRef: origen de la transición circular al entrar/salir de Pops.
 * tema: estilo de Pops ('pop' | 'business' | 'craft' | 'azul') para el borde del botón.
 */
const ESPACIOS = ['weddings', 'pops']

// Imagen de cada espacio en el menú (public/images). Si no carga, la letra
// sobre el color del espacio (el ícono del handoff).
const IMAGEN = {
    weddings: '/images/espacio-weddings.jpg',
    // Pops con el estilo Collage azul · lima.
    pops: '/images/espacio-pops-azul.jpg',
}

const IconoEspacio = ({ espacio }) => {
    const [falla, setFalla] = useState(false)
    if (falla) return <span className={styles.icono} aria-hidden>{espacio === 'pops' ? 'P' : 'W'}</span>
    return <img src={IMAGEN[espacio]} alt='' className={styles.iconoImg} onError={() => setFalla(true)} />
}

const LogoEspacio = ({ espacio, movil, tema }) => {
    const { t } = useTranslation()
    // Collage azul: "Pops" y, a su lado, "by I attend" escrito a mano.
    if (espacio === 'pops' && tema === 'azul') {
        return (
            <span className={styles.logoPopsAzul}>
                <PopsLogo size={movil ? 30 : 40} className={styles.popsWordmark} />
                <span className={styles.byAzul}>{t('invitations.space_by_iattend')}</span>
            </span>
        )
    }
    if (espacio === 'pops') {
        return (
            // Lockup "Pops by I attend" (el cierre del video de onboarding):
            // el wordmark y, abajo a la derecha, "by" + el logo de I attend.
            <span className={styles.logoPops} aria-label={`Pops ${t('invitations.space_by_iattend')}`}>
                <PopsLogo size={movil ? 32 : 46} className={styles.popsWordmark} />
                {!movil && (
                    <span className={styles.popsBy} aria-hidden>
                        <span className={styles.by}>by</span>
                        <img src={logoNegro} alt='' className={styles.popsByLogo} />
                    </span>
                )}
            </span>
        )
    }
    return (
        <span className={styles.logoWeddings}>
            {/* Solo el logo de I attend: sin la etiqueta WEDDINGS. */}
            <img src={logoNegro} alt='I attend' className={styles.logoImg} />
        </span>
    )
}

export const MenuEspacios = ({ espacio, resumen, onElegir, enHoja }) => {
    const { t } = useTranslation()
    return (
        <div className={`${styles.menu} ${enHoja ? styles.menuHoja : ''}`} role='menu' aria-label={t('invitations.space_switch_title')}>
            <span className={styles.menuTitulo}>{t('invitations.space_switch_title')}</span>
            {ESPACIOS.map(e => {
                const activo = e === espacio
                return (
                    <button
                        key={e}
                        type='button'
                        role='menuitemradio'
                        aria-checked={activo}
                        data-espacio={e}
                        className={`${styles.fila} ${activo ? styles.filaActiva : ''}`}
                        onClick={() => onElegir(e)}
                    >
                        <IconoEspacio espacio={e} />
                        <span className={styles.filaTextos}>
                            <span className={styles.nombre}>{t(`invitations.space_${e}`)}</span>
                            {resumen?.[e] && <span className={styles.resumen}>{resumen[e]}</span>}
                        </span>
                        {activo && <Check size={18} strokeWidth={2.4} className={styles.check} aria-hidden />}
                    </button>
                )
            })}
        </div>
    )
}

export const EspacioSelector = ({ espacio, puedeCambiar, resumen, onElegir, botonRef, movil = false, tema }) => {
    const { t } = useTranslation()
    const [abierto, setAbierto] = useState(false)

    if (!puedeCambiar) {
        return (
            <div ref={botonRef} className={`${styles.boton} ${styles.botonFijo} ${movil ? styles.botonMovil : ''}`} data-espacio={espacio} data-tema={tema}>
                <LogoEspacio espacio={espacio} movil={movil} tema={tema} />
            </div>
        )
    }

    const elegir = (e) => {
        setAbierto(false)
        if (e !== espacio) onElegir(e)
    }

    const boton = (
        <button
            ref={botonRef}
            type='button'
            className={`${styles.boton} ${movil ? styles.botonMovil : ''}`}
            data-espacio={espacio}
            data-tema={tema}
            data-abierto={abierto || undefined}
            aria-haspopup='menu'
            aria-expanded={abierto}
            aria-label={t('invitations.space_switch_title')}
            onClick={movil ? () => setAbierto(true) : undefined}
        >
            <LogoEspacio espacio={espacio} movil={movil} tema={tema} />
            <ChevronDown size={16} className={styles.chevron} aria-hidden />
        </button>
    )

    if (movil) {
        return (
            <>
                {boton}
                <Drawer
                    open={abierto}
                    onClose={() => setAbierto(false)}
                    placement='bottom'
                    closable={false}
                    height='auto'
                    styles={{ wrapper: { height: 'auto', borderRadius: '20px 20px 0 0', overflow: 'hidden' }, section: { borderRadius: '20px 20px 0 0' }, body: { padding: 0 } }}
                >
                    <span className={styles.asa} />
                    <MenuEspacios espacio={espacio} resumen={resumen} onElegir={elegir} enHoja />
                </Drawer>
            </>
        )
    }

    return (
        <Dropdown
            open={abierto}
            onOpenChange={setAbierto}
            trigger={['click']}
            placement='bottomLeft'
            popupRender={() => <MenuEspacios espacio={espacio} resumen={resumen} onElegir={elegir} />}
        >
            {boton}
        </Dropdown>
    )
}
