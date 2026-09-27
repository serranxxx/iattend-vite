import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Input } from 'antd'
import { ExternalLink, Link2, Trash2, X } from 'lucide-react'
import { descriptionSegments } from '../../../hooks/usePlans'
import styles from './DescriptionEditor.module.css'

// Editor de la descripción de la tarjeta de /about/pricing. Guarda texto plano
// con saltos de línea y links como [texto](/ruta) —el formato que lee
// iattend-next—, pero nunca le muestra esa sintaxis al admin: el link se pinta
// como texto en negritas y al darle clic enseña su ruta para editarlo.

// Páginas de producto de la landing, para autocompletar la ruta.
const RUTAS_SUGERIDAS = [
    '/about/invitacion-digital',
    '/about/invitacion-paperless',
    '/about/guest-management',
    '/about/mapa-de-mesas',
    '/about/side-events',
    '/about/envios-whatsapp',
    '/about/pases-digitales',
    '/about/pricing',
    '/about/faqs',
]

const LANDING_URL = 'https://iattend.site'

const escapar = (texto) => String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

const aHtml = (valor) => {
    const html = descriptionSegments(valor).map(seg => (
        seg.href
            ? `<a data-href="${escapar(seg.href)}" contenteditable="false" class="${styles.link}">${escapar(seg.text)}</a>`
            : escapar(seg.text).replaceAll('\n', '<br>')
    )).join('')
    // Un <br> final no pinta línea vacía: hace falta uno más para que el salto
    // del final se vea (y `serializar` lo descuenta).
    return String(valor ?? '').endsWith('\n') ? `${html}<br>` : html
}

const serializar = (raiz) => {
    let salida = ''
    const recorrer = (nodo) => {
        nodo.childNodes.forEach(hijo => {
            if (hijo.nodeType === Node.TEXT_NODE) salida += hijo.textContent
            else if (hijo.nodeName === 'BR') salida += '\n'
            else if (hijo.dataset?.href) salida += `[${hijo.textContent}](${hijo.dataset.href})`
            else if (hijo.nodeName === 'DIV' || hijo.nodeName === 'P') {
                // Algunos navegadores meten cada línea en un <div> al pegar.
                if (salida && !salida.endsWith('\n')) salida += '\n'
                recorrer(hijo)
            } else recorrer(hijo)
        })
    }
    recorrer(raiz)
    if (raiz.lastChild?.nodeName === 'BR') salida = salida.replace(/\n$/, '')
    return salida.replaceAll(' ', ' ')
}

const crearLink = (texto, ruta) => {
    const a = document.createElement('a')
    a.dataset.href = ruta
    a.contentEditable = 'false'
    a.className = styles.link
    a.textContent = texto
    return a
}

export const DescriptionEditor = ({ value, onChange, placeholder }) => {
    const editorRef = useRef(null)
    const wrapRef = useRef(null)
    const ultimoEmitido = useRef(null)
    const rangoGuardado = useRef(null)
    // Link del DOM que se está viendo o editando. Va en ref y no en estado:
    // es un nodo vivo del editor que se modifica directo.
    const linkActivo = useRef(null)
    const textoRef = useRef(null)
    const rutaRef = useRef(null)
    const textoGuardado = useRef('')

    // Formulario de alta/edición de link, anclado junto a lo que lo abrió.
    const [form, setForm] = useState(null)

    // Solo se reescribe el HTML cuando el valor cambia desde fuera (descartar,
    // cambiar de plan): hacerlo en cada tecla mandaría el cursor al inicio.
    useLayoutEffect(() => {
        if (value === ultimoEmitido.current) return
        editorRef.current.innerHTML = aHtml(value)
        ultimoEmitido.current = value
    }, [value])

    // Un clic fuera del editor cierra el formulario.
    useEffect(() => {
        if (!form) return
        const cerrar = (e) => {
            if (!wrapRef.current?.contains(e.target)) setForm(null)
        }
        document.addEventListener('mousedown', cerrar)
        return () => document.removeEventListener('mousedown', cerrar)
    }, [form])

    // Se recuerda la última selección dentro del editor: algunos navegadores
    // (Safari) la sueltan al dar clic en "Insertar link" y el texto llegaría
    // vacío al formulario.
    useEffect(() => {
        const guardar = () => {
            const sel = window.getSelection()
            if (!sel?.rangeCount) return
            const rango = sel.getRangeAt(0)
            if (editorRef.current?.contains(rango.commonAncestorContainer)) {
                rangoGuardado.current = rango.cloneRange()
            }
        }
        document.addEventListener('selectionchange', guardar)
        return () => document.removeEventListener('selectionchange', guardar)
    }, [])

    // El formulario enfoca el texto al abrirse (o la ruta, si el texto ya
    // viene de la selección).
    useEffect(() => {
        if (!form) return
        requestAnimationFrame(() => (form.texto ? rutaRef : textoRef).current?.focus())
    }, [form?.abierto])

    const emitir = () => {
        const nuevo = serializar(editorRef.current)
        ultimoEmitido.current = nuevo
        onChange(nuevo)
    }

    const onKeyDown = (e) => {
        if (e.key !== 'Enter') return
        e.preventDefault()
        document.execCommand('insertLineBreak')
        emitir()
    }

    // Se pega como texto plano: el formato de otra página no tiene cabida aquí.
    const onPaste = (e) => {
        e.preventDefault()
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
        emitir()
    }

    // Clic en un link: se abre directo el formulario con su texto y su ruta,
    // pegado debajo del link.
    const onClick = (e) => {
        const link = e.target.closest?.('[data-href]')
        if (!link || !editorRef.current.contains(link)) {
            setForm(null)
            return
        }
        const r = link.getBoundingClientRect()
        const w = wrapRef.current.getBoundingClientRect()
        linkActivo.current = link
        setForm({
            abierto: Date.now(),
            editando: true,
            texto: link.textContent,
            ruta: link.dataset.href,
            top: r.bottom - w.top + 6,
            left: Math.max(0, Math.min(r.left - w.left, w.width - 320)),
        })
    }

    // "Insertar link": vacío, salvo que haya texto marcado en el editor, que
    // llega como texto del link.
    // La selección se lee en el mousedown del botón, antes de que el navegador
    // reaccione al clic: en el click algunos (Safari) ya la colapsaron y el
    // texto llegaba vacío. Se guarda también el texto, porque un Range vivo
    // puede cambiar si el DOM se mueve.
    const capturarSeleccion = (e) => {
        e.preventDefault()
        const sel = window.getSelection()
        const rango = sel?.rangeCount ? sel.getRangeAt(0) : null
        if (rango && editorRef.current.contains(rango.commonAncestorContainer)) {
            rangoGuardado.current = rango.cloneRange()
        }
        const vigente = rangoGuardado.current
            && editorRef.current.contains(rangoGuardado.current.commonAncestorContainer)
        textoGuardado.current = vigente ? rangoGuardado.current.toString() : ''
        if (!vigente) rangoGuardado.current = null
    }

    const abrirAlta = (e) => {
        // Activado con teclado (Enter/Espacio sobre el botón): no hubo mousedown.
        if (e.detail === 0) capturarSeleccion(e)
        linkActivo.current = null
        setForm({ abierto: Date.now(), editando: false, texto: textoGuardado.current.trim(), ruta: '', top: 42, left: 8 })
    }

    const quitarLink = () => {
        const link = linkActivo.current
        if (link) link.replaceWith(document.createTextNode(link.textContent))
        linkActivo.current = null
        setForm(null)
        emitir()
    }

    const guardarLink = () => {
        const texto = form.texto.trim()
        const ruta = form.ruta.trim()
        if (!texto || !ruta) return

        const link = linkActivo.current
        if (form.editando && link) {
            link.textContent = texto
            link.dataset.href = ruta
        } else {
            const editor = editorRef.current
            let rango = rangoGuardado.current
            if (!rango) {
                rango = document.createRange()
                rango.selectNodeContents(editor)
                rango.collapse(false)
            }
            rango.deleteContents()
            const nuevo = crearLink(texto, ruta)
            rango.insertNode(nuevo)
            // Un link al final no deja dónde seguir escribiendo: se agrega un
            // espacio para que el cursor tenga a dónde ir.
            if (!nuevo.nextSibling) nuevo.after(document.createTextNode(' '))
        }

        linkActivo.current = null
        setForm(null)
        emitir()
    }

    const ruta = form?.ruta.trim() ?? ''
    // El aviso solo sale cuando ya se escribió algo que no es una ruta.
    const rutaValida = !ruta || /^(\/|https?:\/\/)/.test(ruta)
    const puedeGuardar = !!form?.texto.trim() && !!ruta && rutaValida
    const sugerencias = form
        ? RUTAS_SUGERIDAS.filter(r => r !== ruta && r.includes(ruta)).slice(0, 5)
        : []

    const teclaForm = (e) => {
        if (e.key === 'Enter' && puedeGuardar) { e.preventDefault(); guardarLink() }
        if (e.key === 'Escape') { e.preventDefault(); setForm(null) }
    }

    return (
        <div className={styles.wrap} ref={wrapRef}>
            <div className={styles.toolbar}>
                <button
                    type="button"
                    className={styles.toolBtn}
                    // En mousedown: se lee la selección antes de que el clic la toque.
                    onMouseDown={capturarSeleccion}
                    onClick={abrirAlta}
                >
                    <Link2 size={14} /> Insertar link
                </button>
                <span className={styles.toolHint}>Enter para salto de línea · clic en un link para editarlo</span>
            </div>

            <div
                ref={editorRef}
                className={styles.editor}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                data-placeholder={placeholder}
                onInput={emitir}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                onClick={onClick}
            />

            {form && (
                <div
                    className={`${styles.popover} ${styles.formPanel}`}
                    style={{ top: form.top, left: form.left }}
                    role="dialog"
                    aria-label={form.editando ? 'Editar link' : 'Insertar link'}
                >
                    <div className={styles.formHead}>
                        <span>{form.editando ? 'Editar link' : 'Insertar link'}</span>
                        <button type="button" aria-label="Cerrar" onClick={() => setForm(null)}><X size={14} /></button>
                    </div>

                    <label className={styles.formCampo}>
                        <span>Texto</span>
                        <Input
                            ref={textoRef}
                            size="small"
                            value={form.texto}
                            placeholder="gestor de invitados"
                            onChange={e => setForm(f => ({ ...f, texto: e.target.value }))}
                            onKeyDown={teclaForm}
                        />
                    </label>

                    <label className={styles.formCampo}>
                        <span>Ruta</span>
                        <Input
                            ref={rutaRef}
                            size="small"
                            value={form.ruta}
                            placeholder="/about/guest-management"
                            status={rutaValida ? undefined : 'error'}
                            className={styles.mono}
                            onChange={e => setForm(f => ({ ...f, ruta: e.target.value }))}
                            onKeyDown={teclaForm}
                        />
                        {!rutaValida && <small className={styles.error}>Empieza con / o con https://</small>}
                        {rutaValida && ruta && (
                            <a
                                className={styles.popRuta}
                                href={ruta.startsWith('/') ? `${LANDING_URL}${ruta}` : ruta}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Abrir en {ruta.startsWith('/') ? 'iattend.site' : 'otra pestaña'} <ExternalLink size={11} />
                            </a>
                        )}
                    </label>

                    {sugerencias.length > 0 && (
                        <div className={styles.sugerencias}>
                            {sugerencias.map(r => (
                                <button key={r} type="button" onClick={() => setForm(f => ({ ...f, ruta: r }))}>
                                    {r}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className={styles.popAcciones}>
                        {form.editando && (
                            <button type="button" onClick={quitarLink}><Trash2 size={13} /> Quitar link</button>
                        )}
                        <button type="button" className={styles.empuja} onClick={() => setForm(null)}>Cancelar</button>
                        <button type="button" className={styles.primario} disabled={!puedeGuardar} onClick={guardarLink}>
                            {form.editando ? 'Guardar' : 'Insertar'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
