import React, { useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Marked, Renderer } from 'marked'
import { ArrowLeft, ArrowRight, MessageCircle } from 'lucide-react'
import { TEMAS, slugTitulo } from './funcionesDocs'
import { advisorWhatsappUrl } from '../../helpers/contact'
import styles from './FuncionesPage.module.css'

// El contenido es nuestro (docs/funciones), no de usuarios: se pinta como HTML.
const marked = new Marked({
    gfm: true,
    renderer: {
        heading({ tokens, depth, text }) {
            const html = this.parser.parseInline(tokens)
            return `<h${depth} id="${slugTitulo(text.replace(/[*`]/g, ''))}">${html}</h${depth}>\n`
        },
        table(token) {
            // Las tablas anchas se recorren de lado en el celular
            const html = Renderer.prototype.table.call(this, token)
            return `<div class="${styles.tablaScroll}">${html}</div>`
        },
    },
})

const Indice = ({ actual, t }) => (
    <nav className={styles.indice} aria-label={t('funciones_docs.index')}>
        <span className={styles.indiceTitulo}>{t('funciones_docs.index')}</span>
        <Link to="/funciones" className={`${styles.indiceLink} ${!actual ? styles.indiceActivo : ''}`}>
            {t('funciones_docs.all_topics')}
        </Link>
        {TEMAS.map((tema) => (
            <Link
                key={tema.slug}
                to={`/funciones/${tema.slug}`}
                className={`${styles.indiceLink} ${actual === tema.slug ? styles.indiceActivo : ''}`}
            >
                <span className={styles.indiceNumero}>{tema.numero}</span>
                {tema.titulo}
            </Link>
        ))}
    </nav>
)

const Ayuda = ({ t }) => (
    <div className={styles.ayuda}>
        <div>
            <strong>{t('funciones_docs.help_title')}</strong>
            <p>{t('funciones_docs.help_text')}</p>
        </div>
        <a href={advisorWhatsappUrl()} target="_blank" rel="noreferrer" className={styles.ayudaBoton}>
            <MessageCircle size={18} /> {t('funciones_docs.help_cta')}
        </a>
    </div>
)

export const FuncionesPage = () => {
    const { t } = useTranslation()
    const { tema: slug } = useParams()
    const { hash } = useLocation()
    const navigate = useNavigate()

    const indice = slug ? TEMAS.findIndex((x) => x.slug === slug) : -1
    const tema = indice >= 0 ? TEMAS[indice] : null
    const html = useMemo(() => (tema ? marked.parse(tema.cuerpo) : ''), [tema])

    useEffect(() => {
        document.title = tema ? `${tema.titulo} · I attend` : t('funciones_docs.page_title')
    }, [tema, t])

    // Al cambiar de tema: arriba, o al título del link (#ancla). En el
    // celular el índice es una tira horizontal: que se vea el tema activo.
    useEffect(() => {
        document.querySelector(`.${styles.indiceActivo}`)
            ?.scrollIntoView({ block: 'nearest', inline: 'center' })

        if (hash) {
            const el = document.getElementById(decodeURIComponent(hash.slice(1)))
            if (el) { el.scrollIntoView({ block: 'start' }); return }
        }
        window.scrollTo(0, 0)
    }, [slug, hash])

    // Los links entre temas navegan sin recargar la página
    const onClickArticulo = (e) => {
        const a = e.target.closest('a')
        const href = a?.getAttribute('href')
        if (href?.startsWith('/funciones')) {
            e.preventDefault()
            navigate(href)
        }
    }

    const anterior = indice > 0 ? TEMAS[indice - 1] : null
    const siguiente = indice >= 0 && indice < TEMAS.length - 1 ? TEMAS[indice + 1] : null

    return (
        <div className={styles.pagina}>
            <header className={styles.encabezado}>
                <button type="button" className={styles.regresar} onClick={() => navigate(-1)} aria-label={t('funciones_docs.back')}>
                    <ArrowLeft size={20} />
                </button>
                <Link to="/funciones" className={styles.marca}>
                    <img src="/images/logo_blue.png" alt="I attend" />
                </Link>
            </header>

            <div className={styles.cuerpo}>
                <aside className={styles.lateral}>
                    <Indice actual={tema?.slug} t={t} />
                </aside>

                <main className={styles.contenido}>
                    {!slug && (
                        <>
                            <h1 className={styles.tituloPortada}>{t('funciones_docs.page_title')}</h1>
                            <p className={styles.intro}>{t('funciones_docs.intro')}</p>
                            <div className={styles.tarjetas}>
                                {TEMAS.map((x) => (
                                    <Link key={x.slug} to={`/funciones/${x.slug}`} className={styles.tarjeta}>
                                        <span className={styles.tarjetaNumero}>{x.numero}</span>
                                        <span className={styles.tarjetaTitulo}>{x.titulo}</span>
                                        <span className={styles.tarjetaResumen}>{x.resumen}</span>
                                    </Link>
                                ))}
                            </div>
                            <Ayuda t={t} />
                        </>
                    )}

                    {slug && !tema && (
                        <div className={styles.vacio}>
                            <p>{t('funciones_docs.not_found')}</p>
                            <Link to="/funciones">{t('funciones_docs.all_topics')}</Link>
                        </div>
                    )}

                    {tema && (
                        <>
                            <span className={styles.etiqueta}>{tema.numero} / {TEMAS.length}</span>
                            <h1 className={styles.tituloTema}>{tema.titulo}</h1>
                            <article
                                className={styles.articulo}
                                onClick={onClickArticulo}
                                dangerouslySetInnerHTML={{ __html: html }}
                            />
                            <div className={styles.navegacion}>
                                {anterior ? (
                                    <Link to={`/funciones/${anterior.slug}`} className={styles.navBoton}>
                                        <ArrowLeft size={18} />
                                        <span><small>{t('funciones_docs.prev')}</small>{anterior.titulo}</span>
                                    </Link>
                                ) : <span />}
                                {siguiente && (
                                    <Link to={`/funciones/${siguiente.slug}`} className={`${styles.navBoton} ${styles.navSiguiente}`}>
                                        <span><small>{t('funciones_docs.next')}</small>{siguiente.titulo}</span>
                                        <ArrowRight size={18} />
                                    </Link>
                                )}
                            </div>
                            <Ayuda t={t} />
                        </>
                    )}
                </main>
            </div>
        </div>
    )
}
