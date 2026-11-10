import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Copy, QrCode, RotateCcw } from 'lucide-react'
import { CATALOGO } from './catalogoPrecios'
import { PaseQR } from './PaseQR'
import { copiarLink, useFormatoPrecio } from './formatoPrecio'
import styles from './PreciosPage.module.css'

// Catálogo de precios público (/precios): los productos de Stripe agrupados
// como en el catálogo (Wedding · Pops · Extras · Promos). Cada tarjeta es la
// imagen del producto; al tocarla se voltea y atrás tiene Copiar link y Ver
// QR, que abre el QR al centro de la pantalla con forma de pase.

// Categorías plegadas (secciones y subgrupos), recordadas entre visitas.
const CLAVE_CERRADAS = 'iattend_precios_cerradas'

const leerCerradas = () => {
    try {
        return new Set(JSON.parse(localStorage.getItem(CLAVE_CERRADAS)) ?? [])
    } catch {
        return new Set()
    }
}

// Encabezado con chevron que pliega su contenido (con transición de alto).
const Plegable = ({ abierta, onAlternar, encabezado, clase, children }) => {
    const { t } = useTranslation()
    return (
        <>
            <button
                type="button"
                className={`${styles.plegar} ${clase}`}
                onClick={onAlternar}
                aria-expanded={abierta}
                title={abierta ? t('precios.collapse') : t('precios.expand')}
            >
                {encabezado}
                <ChevronDown className={styles.chevron} size={20} data-cerrada={!abierta || undefined} aria-hidden />
            </button>
            <div className={styles.contenido} data-cerrada={!abierta || undefined} inert={!abierta}>
                <div className={styles.contenidoInterior}>
                    <div className={styles.relleno}>{children}</div>
                </div>
            </div>
        </>
    )
}

const TarjetaProducto = ({ producto, volteada, onVoltear, onQR }) => {
    const { t } = useTranslation()
    const { precio, plazo, mensualidad, porPop } = useFormatoPrecio(producto)
    // Un solo renglón de apoyo, atrás y abajo: lo importante es el precio.
    const resumen = mensualidad ?? porPop
    const pieDetalle = porPop ?? (producto.meses ? plazo : null)

    return (
        <article className={styles.producto}>
            <div className={styles.escena}>
                <div className={styles.tarjeta} data-volteada={volteada || undefined}>
                    <button
                        type="button"
                        className={`${styles.cara} ${styles.frente}`}
                        onClick={onVoltear}
                        aria-label={`${producto.nombre} · ${precio}. ${t('precios.flip_hint')}`}
                        inert={volteada}
                    >
                        <img src={producto.imagen} alt="" loading="lazy" draggable={false} />
                        <span className={styles.pista} aria-hidden>
                            <RotateCcw size={14} />
                            {t('precios.flip_hint')}
                        </span>
                    </button>

                    <div className={`${styles.cara} ${styles.reverso}`} inert={!volteada} onClick={onVoltear}>
                        <img className={styles.reversoFondo} src={producto.imagen} alt="" aria-hidden />
                        <div className={styles.reversoTextos}>
                            <span className={styles.reversoNombre}>{producto.nombre}</span>
                            <span className={styles.reversoPrecio}>{precio}</span>
                            {resumen && <span className={styles.reversoPlazo}>{resumen}</span>}
                        </div>
                        <div className={styles.acciones}>
                            <button
                                type="button"
                                className={styles.boton}
                                onClick={(e) => { e.stopPropagation(); copiarLink(producto.link, t) }}
                            >
                                <Copy size={18} />
                                {t('precios.copy_link')}
                            </button>
                            <button
                                type="button"
                                className={`${styles.boton} ${styles.botonPrincipal}`}
                                onClick={(e) => { e.stopPropagation(); onQR() }}
                            >
                                <QrCode size={18} />
                                {t('precios.show_qr')}
                            </button>
                        </div>
                        <button
                            type="button"
                            className={styles.voltear}
                            onClick={(e) => { e.stopPropagation(); onVoltear() }}
                            aria-label={t('precios.flip_back')}
                        >
                            <RotateCcw size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.pie}>
                <span className={styles.nombre}>{producto.nombre}</span>
                <span className={styles.precio}>{precio}</span>
            </div>
            {pieDetalle && <span className={styles.plazoPie}>{pieDetalle}</span>}
        </article>
    )
}

// El catálogo en sí (índice, categorías plegables, tarjetas y el pase con el
// QR). Lo usan la página pública y Admin › Ventas › Precios (`embebido`: sin
// el aire de página y con el índice a la izquierda).
export const CatalogoPrecios = ({ embebido = false }) => {
    const { t } = useTranslation()
    const [volteada, setVolteada] = useState(null)
    const [qr, setQr] = useState(null)
    const [cerradas, setCerradas] = useState(leerCerradas)

    const alternar = (clave, abrir) => setCerradas((antes) => {
        const nuevas = new Set(antes)
        const cerrar = abrir === undefined ? !nuevas.has(clave) : !abrir
        if (cerrar) nuevas.add(clave)
        else nuevas.delete(clave)
        try { localStorage.setItem(CLAVE_CERRADAS, JSON.stringify([...nuevas])) } catch { /* sin almacenamiento */ }
        return nuevas
    })

    // El índice abre la categoría y la trae a la vista (también dentro del
    // contenedor con scroll del admin, donde un #ancla movería la URL).
    const irA = (clave) => {
        alternar(clave, true)
        setTimeout(() => {
            document.getElementById(`precios-${clave}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 0)
    }

    return (
        <div className={`${styles.catalogo} ${embebido ? styles.embebido : ''}`}>
            <nav className={styles.indice}>
                {CATALOGO.map((s) => (
                    <button key={s.clave} type="button" className={styles.indiceLink} onClick={() => irA(s.clave)}>
                        {t(`precios.sections.${s.clave}`)}
                    </button>
                ))}
            </nav>

            {CATALOGO.map((seccion) => {
                const total = seccion.grupos.reduce((n, g) => n + g.productos.length, 0)
                return (
                    <section key={seccion.clave} id={`precios-${seccion.clave}`} className={styles.seccion}>
                        <Plegable
                            abierta={!cerradas.has(seccion.clave)}
                            onAlternar={() => alternar(seccion.clave)}
                            clase={styles.seccionTitulo}
                            encabezado={
                                <h2 className={styles.seccionNombre}>
                                    {t(`precios.sections.${seccion.clave}`)}
                                    <span className={styles.cuenta}>{total}</span>
                                </h2>
                            }
                        >
                            {seccion.grupos.map((grupo, i) => {
                                const grid = (
                                    <div className={styles.grid}>
                                        {grupo.productos.map((p) => (
                                            <TarjetaProducto
                                                key={p.id}
                                                producto={p}
                                                volteada={volteada === p.id}
                                                onVoltear={() => setVolteada((v) => (v === p.id ? null : p.id))}
                                                onQR={() => setQr(p)}
                                            />
                                        ))}
                                    </div>
                                )
                                const clave = `${seccion.clave}/${grupo.titulo}`
                                return (
                                    <div key={grupo.titulo ?? i} className={styles.grupo}>
                                        {grupo.titulo ? (
                                            <Plegable
                                                abierta={!cerradas.has(clave)}
                                                onAlternar={() => alternar(clave)}
                                                clase={styles.grupoTitulo}
                                                encabezado={
                                                    <h3 className={styles.grupoNombre}>
                                                        {grupo.titulo}
                                                        <span className={styles.cuenta}>{grupo.productos.length}</span>
                                                    </h3>
                                                }
                                            >
                                                {grid}
                                            </Plegable>
                                        ) : grid}
                                    </div>
                                )
                            })}
                        </Plegable>
                    </section>
                )
            })}

            {qr && <PaseQR producto={qr} onCerrar={() => setQr(null)} />}
        </div>
    )
}

// Página pública: /precios/<id> (RUTA_CATALOGO, difícil de adivinar).
export const PreciosPage = () => {
    const { t } = useTranslation()

    useEffect(() => {
        const antes = document.title
        document.title = t('precios.page_title')
        return () => { document.title = antes }
    }, [t])

    return (
        <main className={styles.pagina}>
            <header className={styles.encabezado}>
                <img className={styles.logo} src="/images/logo_blue.png" alt="I attend" />
                <span className={styles.eyebrow}>{t('precios.eyebrow')}</span>
                <h1 className={styles.titulo}>{t('precios.title')}</h1>
                <p className={styles.subtitulo}>{t('precios.subtitle')}</p>
            </header>
            <CatalogoPrecios />
        </main>
    )
}
