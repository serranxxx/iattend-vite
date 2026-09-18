import { useEffect, useMemo, useRef, useState } from 'react'
import { Tooltip, message } from 'antd'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Trash2, Upload as UploadIcon, X, Minus, Plus, ArrowUpRight, Copy } from 'lucide-react'
import { uploadGiftBrandLogo } from '../../helpers/services/uploadImage'
import { fetchGiftBrands, createGiftBrand, updateGiftBrand, deleteGiftBrand } from './giftBrandsAdminApi'
import {
    GRADIENTE_DEFAULT, PRESETS, normalizarHex, contrasteContraFondo,
    veredictoContraste, leerGradiente, construirGradiente,
} from './giftBrandStyle'
import styles from './GiftBrandLabPage.module.css'
import './admin-tokens.css'

const VUELTA = '/admin?tab=lab&subtab=regalos'

// Mismo normalize() que public.gift_brand_key() en SQL y que classifyGiftCard.ts
// en iattend-events. Si cambia uno, cambian los tres.
const normalizarClave = (raw) =>
    (raw ?? '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/\s+/g, ' ')
        .trim()

export const GiftBrandLabPage = () => {
    const [messageApi, contextHolder] = message.useMessage()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const editId = searchParams.get('id')
    const esEdicion = editId != null

    const [catalogo, setCatalogo] = useState([])
    const [cargando, setCargando] = useState(true)
    const [guardando, setGuardando] = useState(false)
    const [subiendo, setSubiendo] = useState(false)
    const [marca, setMarca] = useState(null)

    const [kind, setKind] = useState('store')
    const [nombre, setNombre] = useState('')
    const [aliases, setAliases] = useState([])
    const [aliasNuevo, setAliasNuevo] = useState('')
    const [logo, setLogo] = useState(null)
    const [background, setBackground] = useState(GRADIENTE_DEFAULT)
    const [textColor, setTextColor] = useState('#FFFFFF')
    const [orden, setOrden] = useState(1)

    const [cssAMano, setCssAMano] = useState(false)
    const [arrastrando, setArrastrando] = useState(false)
    const [vista, setVista] = useState('tarjeta')

    const fileInputRef = useRef(null)

    useEffect(() => {
        const cargar = async () => {
            try {
                const { data } = await fetchGiftBrands()
                const marcas = data.brands || []
                setCatalogo(marcas)

                if (!esEdicion) return

                const encontrada = marcas.find(b => b.id === editId)
                if (!encontrada) {
                    messageApi.error('No se encontró la marca')
                    navigate(VUELTA)
                    return
                }

                setMarca(encontrada)
                setKind(encontrada.kind)
                setNombre(encontrada.name)
                setAliases(encontrada.aliases || [])
                setLogo(encontrada.logo_url ? { url: encontrada.logo_url } : null)
                setBackground(encontrada.background || GRADIENTE_DEFAULT)
                setTextColor(encontrada.text_color || '#FFFFFF')
                setOrden(encontrada.sort_order ?? 0)
                // Un fondo que los controles no pueden representar (radial, tres
                // paradas) se abre directo en CSS a mano: tocar un slider lo
                // destruiría en silencio.
                setCssAMano(!leerGradiente(encontrada.background || GRADIENTE_DEFAULT))
            } catch (error) {
                messageApi.error(error?.response?.data?.msg || 'No se pudo cargar el catálogo')
            } finally {
                setCargando(false)
            }
        }

        cargar()
    }, [editId])

    // Al crear, la marca se va al final de su categoría.
    useEffect(() => {
        if (esEdicion) return
        setOrden(catalogo.filter(b => b.kind === kind).length + 1)
    }, [kind, catalogo, esEdicion])

    const slug = useMemo(() => normalizarClave(nombre), [nombre])
    const gradiente = useMemo(() => leerGradiente(background), [background])

    const contraste = useMemo(
        () => contrasteContraFondo(textColor, background),
        [textColor, background]
    )
    const veredicto = veredictoContraste(contraste)

    const usos = marca?.invitation_count || 0
    // El nombre ES la llave guardada en cards[].brand / cards[].bank: renombrar
    // una marca en uso dejaría huérfanas esas tarjetas.
    const nombreBloqueado = esEdicion && usos > 0

    // ------------------------------------------------------------- acciones ---

    const aplicarGradiente = (parche) => {
        if (!gradiente) return
        setBackground(construirGradiente({ ...gradiente, ...parche }))
    }

    const agregarAlias = () => {
        const clave = normalizarClave(aliasNuevo)
        if (!clave) return
        if (clave === slug) return messageApi.warning('Ese alias es igual al nombre de la marca')
        if (aliases.includes(clave)) return messageApi.warning('Ese alias ya está en la lista')
        setAliases(prev => [...prev, clave])
        setAliasNuevo('')
    }

    const procesarArchivo = async (file) => {
        if (!file) return
        if (!file.type.startsWith('image/')) {
            return messageApi.warning('El logo tiene que ser una imagen')
        }

        setSubiendo(true)
        try {
            setLogo(await uploadGiftBrandLogo(file))
        } catch (error) {
            messageApi.error(error?.message || 'No se pudo subir el logo')
        } finally {
            setSubiendo(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const guardar = async () => {
        if (!nombre.trim()) return messageApi.warning('Ponle nombre a la marca')

        setGuardando(true)
        const payload = {
            kind,
            name: nombre.trim(),
            aliases,
            logo_url: logo?.url || null,
            background: background || null,
            text_color: textColor || null,
            sort_order: Number.isInteger(orden) ? orden : 0,
        }

        try {
            if (esEdicion) {
                if (nombreBloqueado) delete payload.name
                delete payload.kind
                await updateGiftBrand(editId, payload)
                messageApi.success('Marca actualizada')
            } else {
                await createGiftBrand(payload)
                messageApi.success('Marca creada')
            }
            navigate(VUELTA)
        } catch (error) {
            messageApi.error(error?.response?.data?.msg || 'No se pudo guardar')
        } finally {
            setGuardando(false)
        }
    }

    const borrar = async () => {
        try {
            await deleteGiftBrand(editId)
            messageApi.success('Marca eliminada')
            navigate(VUELTA)
        } catch (error) {
            messageApi.error(error?.response?.data?.msg || 'No se pudo eliminar')
        }
    }

    // ---------------------------------------------------------- validaciones ---

    // Solo la primera bloquea el guardado; las otras son avisos.
    const checklist = [
        {
            clave: 'nombre',
            estado: nombre.trim() ? 'ok' : 'pendiente',
            texto: nombre.trim() ? 'La marca tiene nombre' : 'Falta el nombre de la marca',
        },
        {
            clave: 'logo',
            estado: logo ? 'ok' : 'aviso',
            texto: logo ? 'Logo cargado' : 'Sin logo — se mostrará el nombre en la tarjeta',
        },
        {
            clave: 'contraste',
            estado: veredicto?.nivel === 'ok' ? 'ok' : veredicto?.nivel === 'justo' ? 'aviso' : 'error',
            texto: veredicto
                ? veredicto.nivel === 'ok'
                    ? 'Texto legible sobre el fondo'
                    : `Contraste ${contraste.toFixed(1)}:1 — ${veredicto.etiqueta}`
                : 'No se pudo medir el contraste del fondo',
        },
    ]

    const puedeGuardar = Boolean(nombre.trim()) && !guardando

    if (cargando) {
        return <div className={styles.page}><div className={styles.cargando}>Cargando catálogo…</div></div>
    }

    return (
        <div className={styles.page}>
            {contextHolder}

            <div className={styles.shell}>
                {/* ------------------------------------------------ columna izquierda --- */}
                <div className={styles.main}>
                    <header className={styles.header}>
                        <button type='button' className={styles.volver} onClick={() => navigate(VUELTA)}>
                            <ArrowLeft size={15} />
                        </button>
                        <h1 className={styles.titulo}>{esEdicion ? nombre || 'Marca' : 'Nueva marca'}</h1>
                        <p className={styles.subtitulo}>
                            Las marcas aparecen en el builder de invitaciones como tarjetas de regalo.
                        </p>
                    </header>

                    <div className={styles.panel}>
                        {/* -------------------------------------------------- identidad --- */}
                        <section className={styles.seccion}>
                            <h2 className={styles.seccionTitulo}>Identidad</h2>

                            <div className={styles.campo}>
                                <label className={styles.label} htmlFor='gb-nombre'>Nombre</label>
                                <div className={styles.inputConChip}>
                                    <input
                                        id='gb-nombre'
                                        className={styles.input}
                                        value={nombre}
                                        onChange={(e) => setNombre(e.target.value)}
                                        placeholder={kind === 'store' ? 'Ej. Palacio de hierro' : 'Ej. Banregio'}
                                        disabled={nombreBloqueado}
                                    />
                                    <span className={styles.chipClave}>
                                        clave <code>{slug || '—'}</code>
                                    </span>
                                </div>
                                <p className={styles.ayuda}>
                                    {nombreBloqueado
                                        ? `No se puede renombrar: está en uso en ${usos} invitación(es). Este nombre es la llave guardada en cada tarjeta.`
                                        : 'Se guarda tal cual en la tarjeta. La clave se genera sola y sirve para emparejar tarjetas viejas.'}
                                </p>
                            </div>

                            <div className={styles.campo}>
                                <label className={styles.label} htmlFor='gb-alias'>
                                    Otras formas de escribirlo <span className={styles.opcional}>opcional</span>
                                </label>
                                <div className={styles.tagInput}>
                                    {aliases.map(a => (
                                        <span key={a} className={styles.tag}>
                                            {a}
                                            <button type='button' onClick={() => setAliases(prev => prev.filter(x => x !== a))}>
                                                <X size={11} />
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        id='gb-alias'
                                        className={styles.tagInputField}
                                        value={aliasNuevo}
                                        onChange={(e) => setAliasNuevo(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') { e.preventDefault(); agregarAlias() }
                                            if (e.key === 'Backspace' && !aliasNuevo && aliases.length) {
                                                setAliases(prev => prev.slice(0, -1))
                                            }
                                        }}
                                        onBlur={agregarAlias}
                                        placeholder={aliases.length ? '' : 'Escribe y presiona Enter — ej. banco nu'}
                                    />
                                </div>
                                <p className={styles.ayuda}>
                                    Se normalizan sin acentos ni mayúsculas, así que <code>Banco Nu</code> y{' '}
                                    <code>banco nu</code> resuelven igual.
                                </p>
                            </div>
                        </section>

                        {/* ------------------------------------------------- apariencia --- */}
                        <section className={styles.seccion}>
                            <h2 className={styles.seccionTitulo}>Apariencia de la tarjeta</h2>

                            <div className={styles.apariencia}>
                                <div className={styles.campo}>
                                    <span className={styles.label}>Logo</span>
                                    <input
                                        ref={fileInputRef}
                                        type='file'
                                        accept='image/png,image/jpeg,image/webp,image/svg+xml'
                                        style={{ display: 'none' }}
                                        onChange={(e) => procesarArchivo(e.target.files?.[0])}
                                    />
                                    <button
                                        type='button'
                                        className={`${styles.dropzone} ${arrastrando ? styles.dropzoneActiva : ''} ${logo ? styles.dropzoneConLogo : ''}`}
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
                                        onDragLeave={() => setArrastrando(false)}
                                        onDrop={(e) => {
                                            e.preventDefault()
                                            setArrastrando(false)
                                            procesarArchivo(e.dataTransfer.files?.[0])
                                        }}
                                    >
                                        {subiendo ? (
                                            <span className={styles.dropzoneTexto}>Subiendo…</span>
                                        ) : logo ? (
                                            <img src={logo.url} alt='' className={styles.dropzoneLogo} />
                                        ) : (
                                            <>
                                                <UploadIcon size={16} />
                                                <span className={styles.dropzoneTexto}>Arrastra o elige</span>
                                            </>
                                        )}
                                    </button>
                                    {logo && (
                                        <button type='button' className={styles.quitarLogo} onClick={() => setLogo(null)}>
                                            Quitar logo
                                        </button>
                                    )}
                                    <p className={styles.ayuda}>PNG o SVG con fondo transparente.</p>
                                </div>

                                <div className={styles.campo}>
                                    <span className={styles.label}>Fondo</span>

                                    <div className={styles.presets}>
                                        {PRESETS.map(p => (
                                            <Tooltip key={p.nombre} title={p.nombre}>
                                                <button
                                                    type='button'
                                                    className={`${styles.preset} ${background === p.css ? styles.presetActivo : ''}`}
                                                    style={{ background: p.css }}
                                                    aria-label={p.nombre}
                                                    onClick={() => {
                                                        setBackground(p.css)
                                                        setTextColor(p.texto)
                                                        setCssAMano(false)
                                                    }}
                                                />
                                            </Tooltip>
                                        ))}
                                    </div>

                                    {cssAMano ? (
                                        <>
                                            <input
                                                className={styles.input}
                                                value={background}
                                                onChange={(e) => setBackground(e.target.value)}
                                                placeholder='linear-gradient(...) o #RRGGBB'
                                            />
                                            <button
                                                type='button'
                                                className={styles.enlace}
                                                onClick={() => {
                                                    if (leerGradiente(background)) setCssAMano(false)
                                                    else messageApi.info('Este fondo solo se puede editar como CSS')
                                                }}
                                            >
                                                Volver a los controles
                                            </button>
                                        </>
                                    ) : gradiente ? (
                                        <>
                                            <div className={styles.controlesFondo}>
                                                <label className={styles.colorLabel}>
                                                    <input
                                                        type='color'
                                                        className={styles.color}
                                                        value={gradiente.inicio}
                                                        onChange={(e) => aplicarGradiente({ inicio: e.target.value.toUpperCase() })}
                                                    />
                                                    Inicio
                                                </label>

                                                <label className={styles.colorLabel}>
                                                    <input
                                                        type='color'
                                                        className={styles.color}
                                                        value={gradiente.fin}
                                                        onChange={(e) => aplicarGradiente({ fin: e.target.value.toUpperCase() })}
                                                    />
                                                    Fin
                                                </label>

                                                <div className={styles.anguloBloque}>
                                                    <span className={styles.anguloLabel}>Ángulo</span>
                                                    <input
                                                        type='range'
                                                        className={styles.slider}
                                                        min={0}
                                                        max={360}
                                                        step={5}
                                                        value={gradiente.angulo}
                                                        disabled={gradiente.tipo === 'solido'}
                                                        onChange={(e) => aplicarGradiente({ angulo: Number(e.target.value) })}
                                                    />
                                                    <span className={styles.anguloValor}>{gradiente.angulo}°</span>
                                                </div>
                                            </div>
                                            <button type='button' className={styles.enlace} onClick={() => setCssAMano(true)}>
                                                Editar CSS a mano
                                            </button>
                                        </>
                                    ) : (
                                        <p className={styles.ayuda}>Cargando fondo…</p>
                                    )}
                                </div>
                            </div>

                            <div className={styles.colorTexto}>
                                <span className={styles.label}>Color de texto</span>
                                <div className={styles.colorTextoControles}>
                                    <button
                                        type='button'
                                        className={`${styles.chipBoton} ${normalizarHex(textColor) === '#FFFFFF' ? styles.chipBotonActivo : ''}`}
                                        onClick={() => setTextColor('#FFFFFF')}
                                    >
                                        Blanco
                                    </button>
                                    <button
                                        type='button'
                                        className={`${styles.chipBoton} ${normalizarHex(textColor) === '#252525' ? styles.chipBotonActivo : ''}`}
                                        onClick={() => setTextColor('#252525')}
                                    >
                                        Negro
                                    </button>
                                    <input
                                        className={`${styles.input} ${styles.inputHex}`}
                                        value={textColor}
                                        onChange={(e) => setTextColor(e.target.value)}
                                    />
                                    {veredicto && (
                                        <span className={`${styles.contraste} ${styles[`contraste_${veredicto.nivel}`]}`}>
                                            Contraste {contraste.toFixed(1)}:1 · {veredicto.etiqueta}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* ---------------------------------------------- dónde aparece --- */}
                        <section className={`${styles.seccion} ${styles.seccionUltima}`}>
                            <h2 className={styles.seccionTitulo}>Dónde aparece</h2>

                            <div className={styles.ubicacion}>
                                <div className={styles.campo}>
                                    <span className={styles.label}>Categoría</span>
                                    <div className={styles.segmented}>
                                        {[['store', 'Tienda'], ['bank', 'Banco']].map(([valor, etiqueta]) => (
                                            <button
                                                key={valor}
                                                type='button'
                                                className={`${styles.segmentedItem} ${kind === valor ? styles.segmentedActivo : ''}`}
                                                aria-disabled={esEdicion}
                                                onClick={() => { if (!esEdicion) setKind(valor) }}
                                            >
                                                {etiqueta}
                                            </button>
                                        ))}
                                    </div>
                                    {esEdicion && (
                                        <p className={styles.ayuda}>
                                            La categoría no se cambia: define si la tarjeta guarda <code>brand</code> o <code>bank</code>.
                                        </p>
                                    )}
                                </div>

                                <div className={styles.campo}>
                                    <span className={styles.label}>Posición en la lista</span>
                                    <div className={styles.stepper}>
                                        <button type='button' onClick={() => setOrden(o => Math.max(0, o - 1))}>
                                            <Minus size={14} />
                                        </button>
                                        <input
                                            className={styles.stepperValor}
                                            value={orden}
                                            inputMode='numeric'
                                            onChange={(e) => {
                                                const n = parseInt(e.target.value, 10)
                                                setOrden(Number.isNaN(n) ? 0 : Math.min(999, Math.max(0, n)))
                                            }}
                                        />
                                        <button type='button' onClick={() => setOrden(o => Math.min(999, o + 1))}>
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <p className={styles.ayuda}>Menor número, más arriba en el listado que ve el organizador.</p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* -------------------------------------------------- columna derecha --- */}
                <aside className={styles.lateral}>
                    <div className={styles.panelLateral}>
                        <div className={styles.lateralHead}>
                            <span className={styles.lateralTitulo}>Vista previa</span>
                            <div className={styles.toggle}>
                                {[['tarjeta', 'Tarjeta'], ['lista', 'En la lista']].map(([valor, etiqueta]) => (
                                    <button
                                        key={valor}
                                        type='button'
                                        className={`${styles.toggleItem} ${vista === valor ? styles.toggleActivo : ''}`}
                                        onClick={() => setVista(valor)}
                                    >
                                        {etiqueta}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {vista === 'tarjeta' ? (
                            <>
                                {/* Misma estructura que Wallet.tsx en iattend-events: logo arriba,
                                    datos abajo. Lo que se ve aquí es lo que ve el invitado. */}
                                <div className={styles.tarjeta} style={{ background, color: textColor }}>
                                    <div className={styles.tarjetaLogo}>
                                        {logo
                                            ? <img src={logo.url} alt='' />
                                            : <span>{nombre || 'Marca'}</span>}
                                    </div>

                                    {kind === 'store' ? (
                                        <div className={styles.tarjetaCol}>
                                            <span className={styles.tarjetaTenue}>Descubre los regalos</span>
                                            <span className={styles.tarjetaBoton} style={{ borderColor: textColor }}>
                                                Ver mesa <ArrowUpRight size={12} />
                                            </span>
                                        </div>
                                    ) : (
                                        <div className={styles.tarjetaCol}>
                                            <span className={styles.tarjetaTenue}>Luis Serrano</span>
                                            <span className={styles.tarjetaNumero}>
                                                4242 4242 4242 4242 <Copy size={12} />
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <p className={styles.pie}>Así se ve dentro de la invitación.</p>
                            </>
                        ) : (
                            <>
                                <div className={styles.lista}>
                                    {catalogo
                                        .filter(b => b.kind === kind && b.id !== editId)
                                        .concat([{ id: '__nueva__', name: nombre || 'Marca nueva', sort_order: orden, logo_url: logo?.url ?? null }])
                                        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                                        .map(b => (
                                            <div
                                                key={b.id}
                                                className={`${styles.listaItem} ${b.id === '__nueva__' ? styles.listaItemActivo : ''}`}
                                            >
                                                {b.logo_url
                                                    ? <img src={b.logo_url} alt='' />
                                                    : <span className={styles.listaSinLogo} />}
                                                {b.name}
                                            </div>
                                        ))}
                                </div>
                                <p className={styles.pie}>El desplegable que ve el organizador en el builder.</p>
                            </>
                        )}
                    </div>

                    <div className={styles.panelLateral}>
                        <span className={styles.lateralTitulo}>Antes de guardar</span>

                        <ul className={styles.checklist}>
                            {checklist.map(item => (
                                <li key={item.clave} className={`${styles.check} ${styles[`check_${item.estado}`]}`}>
                                    <span className={styles.checkIcono}>
                                        {item.estado === 'ok' ? <Check size={11} /> : item.estado === 'error' ? <X size={11} /> : null}
                                    </span>
                                    {item.texto}
                                </li>
                            ))}
                        </ul>

                        <button
                            type='button'
                            className={styles.guardar}
                            aria-disabled={!puedeGuardar}
                            onClick={() => { if (puedeGuardar) guardar() }}
                        >
                            {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Guardar marca'}
                        </button>

                        {esEdicion && (
                            <Tooltip title={usos > 0 ? `En uso en ${usos} invitación(es)` : ''}>
                                <button
                                    type='button'
                                    className={styles.eliminar}
                                    aria-disabled={usos > 0}
                                    onClick={() => { if (usos === 0) borrar() }}
                                >
                                    <Trash2 size={14} /> Eliminar marca
                                </button>
                            </Tooltip>
                        )}
                    </div>

                    {esEdicion && usos > 0 && (
                        <div className={styles.panelLateral}>
                            <span className={styles.lateralTitulo}>
                                {usos === 1 ? '1 invitación la usa' : `${usos} invitaciones la usan`}
                            </span>
                            <div className={styles.usoLista}>
                                {(marca?.invitations || []).slice(0, 10).map(inv => (
                                    <div key={inv.id} className={styles.usoItem}>{inv.label}</div>
                                ))}
                                {(marca?.invitations || []).length > 10 && (
                                    <div className={styles.usoMas}>y {marca.invitations.length - 10} más</div>
                                )}
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    )
}
