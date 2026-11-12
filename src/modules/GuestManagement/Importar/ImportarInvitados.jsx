import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox, Input, Modal, Select, Tooltip, message } from 'antd'
import { AlertTriangle, ArrowLeft, CalendarHeart, Check, ChevronRight, ChevronUp, ClipboardPaste, Download, FileSpreadsheet, Pencil, Search, Sparkles, Trash2, UploadCloud, Zap } from 'lucide-react'
import axios from 'axios'
import { supabase } from '../../../lib/supabase'
import { supabaseAuthHeaders } from '../../../lib/authHeaders'
import { PHONE_CODE_OPTIONS, buildPhoneNumberSafe } from '../../../helpers/assets/phoneCodes'
import {
    FORMATOS, MAX_FILAS, MULTIPLES, LADA_POR_OMISION,
    leerArchivo, leerTexto, leerHoja, hojasConDatos, resumenParaIA, aplicarMapeo,
    resolverAcompanantes, indiceExistentes, problemasDe, descargarPlantilla, paraConfirmar,
    mapeoLocal, normalizar, ladaSugerida, nombreSugerido, esNombreGenerico, paresRepetidos, unirCopia, separarTelefono,
} from './leerLista'
import s from './ImportarInvitados.module.css'

const API = import.meta.env.VITE_API_URL
const POR_PAGINA = 100
const TIPOS = ['female', 'male', 'child', 'undefined']
const TIERS = ['A', 'B', 'C', 'D']
const MIN_LECTURA_MS = 900
const PASO_CHIP_MS = 160
const DESTELLO_MS = 1400
const BARRA_MS = 1300

const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const ahora = () => Date.now()
const telefonoVisible = (code, num) => {
    const n = String(num ?? '')
    if (n.length !== 10) return [code, n].filter(Boolean).join(' ')
    return `${code ? `${code} ` : ''}${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`
}

// Importar invitados desde Excel / CSV / lo pegado de una hoja de cálculo,
// con el diseño del handoff "Importar con Lia": tabla de solo lectura (se
// edita una fila a la vez), los problemas marcados en su celda con la
// sugerencia de Lia y una barra que arregla todo con un clic.
// Lo usan la página /dashboard/guests/import (boda) y la hoja del editor de
// side events / Pop (HojaImportar).
//   · invitationId: invitación (boda o side event de boda).
//   · sideEventId: side event; con `esPop` va solo, sin invitación.
//   · eventos / modoInicial = 'evento': importar a un Pop desde otro evento del
//     organizador (POST /api/guests/import/eventos y /desde-evento). Sus
//     invitados entran a la misma revisión; los que no asistirán, fuera.
export const ImportarInvitados = ({ invitationId, sideEventId, esPop = false, archivoInicial = null, eventos = null, modoInicial = 'archivo', onCerrar, onListo }) => {
    const { t, i18n } = useTranslation()
    const tt = (k, o) => t(`guests_import.${k}`, o)
    const idioma = i18n.language?.startsWith('en') ? 'en-US' : 'es-MX'

    const [paso, setPaso] = useState(modoInicial === 'evento' ? 'eventos' : 'subir')
    const [origen, setOrigen] = useState(null)
    const [error, setError] = useState(null)
    const [arrastrando, setArrastrando] = useState(false)
    const [pegando, setPegando] = useState(false)
    const [pegado, setPegado] = useState('')
    const [libro, setLibro] = useState(null)
    const [hojas, setHojas] = useState([])
    const [hoja, setHoja] = useState(null)
    const [encabezados, setEncabezados] = useState([])
    const [crudas, setCrudas] = useState([])
    const [mapeo, setMapeo] = useState(null)
    const [chipsVisibles, setChipsVisibles] = useState(0)
    const [lecturaPaso, setLecturaPaso] = useState(0)
    const [sinIA, setSinIA] = useState(false)
    const [filas, setFilas] = useState([])
    const [editado, setEditado] = useState(false)
    const [editando, setEditando] = useState(null)
    const [verColumnas, setVerColumnas] = useState(false)
    const [tab, setTab] = useState('revisar')
    const [busqueda, setBusqueda] = useState('')
    const [limite, setLimite] = useState(POR_PAGINA)
    const [entrada, setEntrada] = useState(0)
    const [arreglado, setArreglado] = useState(null)
    const [destello, setDestello] = useState(() => new Set())
    const [importando, setImportando] = useState(null)
    const [exito, setExito] = useState(null)
    const inputRef = useRef(null)
    const tablaRef = useRef(null)

    const evento = useMemo(() => (esPop
        ? { side_events_id: sideEventId }
        : { invitation_id: invitationId, ...(sideEventId ? { side_events_id: sideEventId } : {}) }), [esPop, sideEventId, invitationId])

    // Contexto: lados y etiquetas de la invitación (un Pop no tiene) y los
    // invitados que ya tiene el evento (para marcar duplicados).
    const contextoRef = useRef(null)
    const [contexto, setContexto] = useState({ owners: [], tags: [], existentes: indiceExistentes([]) })
    useEffect(() => {
        contextoRef.current = (async () => {
            const [inv, exist] = await Promise.all([
                !esPop && invitationId
                    ? supabase.from('invitations').select('owners, tags').eq('id', invitationId).maybeSingle().then((r) => r.data, () => null)
                    : null,
                axios.post(`${API}/api/guests/import/existentes`, evento, { headers: await supabaseAuthHeaders() })
                    .then((r) => r.data?.guests ?? [], () => []),
            ])
            const ctx = {
                owners: (inv?.owners || []).filter(Boolean),
                tags: (inv?.tags || []).filter(Boolean),
                existentes: indiceExistentes(exist),
            }
            setContexto(ctx)
            return ctx
        })()
    }, [])
    const conEtiqueta = !esPop
    const conLado = !esPop && contexto.owners.length > 0

    // Subtítulo de la lectura: rota por sus pasos y se queda en el último.
    useEffect(() => {
        if (paso !== 'leyendo') return undefined
        setLecturaPaso(0)
        const id = setInterval(() => setLecturaPaso((p) => Math.min(p + 1, origen ? 2 : 4)), 900)
        return () => clearInterval(id)
    }, [paso])

    const campos = ['name', 'phone_number', 'phone_code', 'companion_of', ...(conEtiqueta ? ['tag'] : []), 'type', 'tier', ...(conLado ? ['side'] : []), 'meal', 'special_needs', 'notes']
    const usadasDe = (mp) => campos.filter((c) => (Array.isArray(mp?.[c]) ? mp[c].length : mp?.[c]))

    // Aplica el mapeo y deja fuera de entrada a quien ya está en el evento.
    const construir = (crudasHoja, mp, ctx) => {
        const base = resolverAcompanantes(aplicarMapeo(crudasHoja, mp, { owners: ctx.owners, conLado: !esPop, conEtiqueta: !esPop }))
        return base.map((f) => ({ ...f, include: !problemasDe(f, { existentes: ctx.existentes, dupArchivo: new Set() }).includes('duplicado_evento') }))
    }

    // Otro evento: sus invitados ya vienen limpios (sin columnas que leer); su
    // acompañante se liga por el id de origen.
    const usarEvento = async (ev) => {
        setOrigen(ev)
        setHoja(null)
        setMapeo(null)
        setArreglado(null)
        setError(null)
        setPaso('leyendo')
        const inicio = ahora()
        try {
            const [ctx, { data }] = await Promise.all([
                contextoRef.current,
                axios.post(`${API}/api/guests/import/desde-evento`, { ...evento, fuente: { tipo: ev.tipo, id: ev.id } }, { headers: await supabaseAuthHeaders() }),
            ])
            const invitados = data?.invitados ?? []
            const indice = new Map(invitados.map((g, i) => [String(g.id), i]))
            const base = invitados.map((g, i) => {
                const { code, number } = separarTelefono(g.phone_number)
                return {
                    key: i,
                    include: g.state !== 'rechazado',
                    rechazo: g.state === 'rechazado',
                    name: g.name ?? '',
                    phone_code: code,
                    phone_number: number,
                    tag: esPop ? null : (g.tag ?? null),
                    type: TIPOS.includes(g.type) ? g.type : 'undefined',
                    tier: TIERS.includes(g.tier) ? g.tier : null,
                    side: esPop ? null : (g.side ?? null),
                    meal: g.meal ?? null,
                    special_needs: null,
                    notes: g.notes || null,
                    companion_raw: null,
                    companion_key: g.companion_id != null && indice.has(String(g.companion_id)) ? indice.get(String(g.companion_id)) : null,
                }
            })
            const construidas = base.map((f) => (problemasDe(f, { existentes: ctx.existentes, dupArchivo: new Set() }).includes('duplicado_evento') ? { ...f, include: false } : f))
            setCrudas(invitados)
            await espera(Math.max(0, MIN_LECTURA_MS + 600 - (ahora() - inicio)))
            setSinIA(false)
            setFilas(construidas)
            setEditado(false)
            setEditando(null)
            setLimite(POR_PAGINA)
            setTab('revisar')
            setEntrada((n) => n + 1)
            setPaso('revisar')
        } catch (e) {
            console.error(e)
            setError(e.response?.data?.error || tt('error_event'))
            setPaso('eventos')
        }
    }

    const usarHoja = async (lb, nombre) => {
        setOrigen(null)
        const { encabezados: enc, filas: crudasHoja } = leerHoja(lb, nombre)
        if (!crudasHoja.length) return setError(tt('error_vacio'))
        if (crudasHoja.length > MAX_FILAS) return setError(tt('error_max', { max: MAX_FILAS.toLocaleString() }))
        setHoja(nombre)
        setEncabezados(enc)
        setCrudas(crudasHoja)
        setMapeo(null)
        setChipsVisibles(0)
        setArreglado(null)
        setPaso('leyendo')

        const inicio = ahora()
        const ctx = await contextoRef.current
        let mp
        let fallo = false
        try {
            const { data } = await axios.post(`${API}/api/guests/import/map`, {
                ...evento,
                owners: ctx.owners,
                tags: esPop ? [] : ctx.tags,
                ...resumenParaIA(enc, crudasHoja),
            }, { headers: await supabaseAuthHeaders() })
            mp = data.mapping
            if (!mp?.name?.length) {
                const local = mapeoLocal(enc)
                mp = { ...mp, name: local.name.length ? local.name : [enc[0]] }
            }
        } catch (e) {
            console.error(e)
            fallo = true
            mp = mapeoLocal(enc)
            if (!mp.name.length) mp.name = [enc[0]]
        }
        await espera(Math.max(0, MIN_LECTURA_MS - (ahora() - inicio)))

        // Las columnas aparecen una por una y después entra la revisión.
        setSinIA(fallo)
        setMapeo(mp)
        const nChips = usadasDe(mp).length + 1
        for (let i = 1; i <= nChips; i += 1) {
            setChipsVisibles(i)
            await espera(PASO_CHIP_MS)
        }
        await espera(350)
        const construidas = construir(crudasHoja, mp, ctx)
        setFilas(construidas)
        setEditado(false)
        setEditando(null)
        setLimite(POR_PAGINA)
        setTab('revisar')
        setEntrada((n) => n + 1)
        setPaso('revisar')
    }

    // ── Entrada ───────────────────────────────────────────────────────
    const empezarCon = async (obtenerLibro) => {
        setError(null)
        try {
            const lb = await obtenerLibro()
            const conDatos = hojasConDatos(lb)
            if (!conDatos.length) return setError(tt('error_vacio'))
            setLibro(lb)
            setHojas(conDatos)
            if (conDatos.length === 1) usarHoja(lb, conDatos[0].nombre)
            else setPaso('hoja')
        } catch (e) {
            console.error(e)
            setError(tt('error_leer'))
        }
    }
    const tomarArchivo = (file) => file && empezarCon(() => leerArchivo(file))

    useEffect(() => { if (archivoInicial) tomarArchivo(archivoInicial) }, [])

    const usadas = usadasDe(mapeo)
    const columnasUsadas = new Set(usadas.flatMap((c) => [].concat(mapeo[c])))
    const sinUsar = encabezados.filter((h) => !columnasUsadas.has(h))

    const cambiarColumna = (campo, valor) => {
        const aplicar = () => {
            const otro = { ...mapeo, [campo]: valor }
            const tomadas = new Set(Array.isArray(valor) ? valor : valor ? [valor] : [])
            Object.keys(otro).forEach((k) => {
                if (k === campo || k === 'values') return
                if (Array.isArray(otro[k])) otro[k] = otro[k].filter((h) => !tomadas.has(h))
                else if (tomadas.has(otro[k])) otro[k] = null
            })
            setMapeo(otro)
            setChipsVisibles(99)
            setFilas(construir(crudas, otro, contexto))
            setEditado(false)
            setEditando(null)
            setArreglado(null)
            setEntrada((n) => n + 1)
        }
        if (!editado) return aplicar()
        Modal.confirm({ title: tt('remap_title'), content: tt('remap_body'), okText: tt('remap_ok'), cancelText: tt('cancel'), onOk: aplicar })
    }

    // ── Casos de cada fila ────────────────────────────────────────────
    const porKey = useMemo(() => new Map(filas.map((f) => [f.key, f])), [filas])
    const pares = useMemo(() => paresRepetidos(filas.filter((f) => f.include)), [filas])

    const casos = useMemo(() => {
        const m = new Map()
        filas.forEach((f) => {
            const titular = f.companion_key != null ? porKey.get(f.companion_key) : null
            const num = String(f.phone_number ?? '')
            const lada = ladaSugerida(f)
            const c = {
                lada,
                sinLada: num.length === 10 && !f.phone_code && !lada,
                incompleto: num.length > 0 && num.length !== 10,
                sinTelefono: !num && f.companion_key == null && !f.companion_raw,
                generico: nombreSugerido(f, titular),
                sinNombre: !f.name?.trim(),
                sinTitular: !!f.companion_raw && f.companion_key == null,
                copia: pares.get(f.key) ?? null,
                enEvento: problemasDe(f, { existentes: contexto.existentes, dupArchivo: new Set() }).includes('duplicado_evento'),
                titular,
            }
            c.revisar = !!(c.lada || c.sinLada || c.incompleto || c.sinTelefono || c.generico || c.sinNombre || c.sinTitular)
            m.set(f.key, c)
        })
        return m
    }, [filas, pares, contexto, porKey])

    const incluidas = filas.filter((f) => f.include)
    const cuentas = useMemo(() => {
        const c = { todos: filas.length, revisar: 0, repetidos: 0, evento: 0, excluidos: 0, lada: 0, generico: 0, copias: 0, sinTelefono: 0, sinNombre: 0 }
        filas.forEach((f) => {
            const k = casos.get(f.key)
            if (!f.include) c.excluidos += 1
            if (k.enEvento) c.evento += 1
            if (!f.include) return
            if (k.revisar) c.revisar += 1
            if (k.copia != null) { c.copias += 1; c.repetidos += 2 }
            if (k.lada) c.lada += 1
            if (k.generico) c.generico += 1
            if (k.sinTelefono) c.sinTelefono += 1
            if (k.sinNombre) c.sinNombre += 1
        })
        return c
    }, [filas, casos])
    const arreglables = cuentas.lada + cuentas.generico + cuentas.copias

    // Al terminar de leer: "Por revisar" si hay algo, si no "Todos".
    useEffect(() => {
        if (paso === 'revisar' && tab === 'revisar' && entrada > 0 && !editado && cuentas.revisar === 0 && cuentas.repetidos === 0) setTab('todos')
    }, [paso, entrada])

    const q = normalizar(busqueda)
    const visibles = useMemo(() => {
        let base
        if (tab === 'repetidos') {
            base = []
            pares.forEach((orig, copia) => {
                const o = porKey.get(orig)
                const c = porKey.get(copia)
                if (o && !base.includes(o)) base.push(o)
                if (c) base.push(c)
            })
        } else {
            base = filas.filter((f) => {
                const k = casos.get(f.key)
                if (tab === 'revisar') return f.include && k.revisar
                if (tab === 'evento') return k.enEvento
                if (tab === 'excluidos') return !f.include
                return true
            })
        }
        return q ? base.filter((f) => normalizar(f.name).includes(q) || String(f.phone_number ?? '').includes(q)) : base
    }, [tab, filas, casos, pares, porKey, q])

    // ── Editar ────────────────────────────────────────────────────────
    const editar = (key, cambios) => {
        setEditado(true)
        setFilas((prev) => prev.map((f) => (f.key === key ? { ...f, ...cambios } : f)))
    }
    const quitar = (key) => {
        setEditado(true)
        if (editando === key) setEditando(null)
        setFilas((prev) => prev.filter((f) => f.key !== key).map((f) => (f.companion_key === key ? { ...f, companion_key: null } : f)))
    }
    const brillar = (keys) => {
        setDestello(new Set(keys))
        setTimeout(() => setDestello(new Set()), DESTELLO_MS)
    }
    const unir = (copia) => {
        const original = pares.get(copia)
        if (original == null) return
        setEditado(true)
        setFilas((prev) => unirCopia(prev, copia, original))
        brillar([original])
    }
    const marcarVisibles = (incluir) => {
        const keys = new Set(visibles.map((f) => f.key))
        setEditado(true)
        setFilas((prev) => prev.map((f) => (keys.has(f.key) ? { ...f, include: incluir } : f)))
    }
    const cambiarTab = (nuevo) => {
        setTab(nuevo)
        setLimite(POR_PAGINA)
        setEditando(null)
        setEntrada((n) => n + 1)
        tablaRef.current?.scrollTo?.({ top: 0 })
    }

    // Arreglar N: +52, nombre de los +1 y unir repetidos.
    const arreglarTodo = () => {
        const tocadas = []
        let lista = filas.map((f) => {
            if (!f.include) return f
            const k = casos.get(f.key)
            const cambios = {}
            if (k.lada) cambios.phone_code = k.lada
            if (k.generico) cambios.name = k.generico
            if (!Object.keys(cambios).length) return f
            tocadas.push(f.key)
            return { ...f, ...cambios }
        })
        ;[...pares.entries()].forEach(([copia, original]) => {
            lista = unirCopia(lista, copia, original)
            tocadas.push(original)
        })
        setFilas(lista)
        setEditado(true)
        setArreglado(arreglables)
        brillar(tocadas)
    }

    const opcionesTitular = useMemo(() => {
        const conNombre = filas.filter((f) => f.name?.trim() && !esNombreGenerico(f.name))
        const veces = new Map()
        conNombre.forEach((f) => veces.set(normalizar(f.name), (veces.get(normalizar(f.name)) ?? 0) + 1))
        return conNombre.map((f, i) => {
            const extra = f.phone_number ? `··${String(f.phone_number).slice(-4)}` : `#${i + 1}`
            return { value: f.key, label: veces.get(normalizar(f.name)) > 1 ? `${f.name} (${extra})` : f.name }
        })
    }, [filas])
    const tagOptions = useMemo(() => {
        const todas = new Map()
        ;[...contexto.tags, ...filas.map((f) => f.tag)].filter(Boolean).forEach((tg) => {
            if (!todas.has(tg.toLowerCase())) todas.set(tg.toLowerCase(), tg)
        })
        return [...todas.values()].map((tg) => ({ value: tg, label: tg }))
    }, [contexto.tags, filas])

    // ── Salir / confirmar ─────────────────────────────────────────────
    const cerrar = () => {
        if (importando) return
        if (paso !== 'revisar' || !filas.length) return onCerrar?.()
        Modal.confirm({
            title: tt('discard_title'), content: tt('discard_body'), okText: tt('discard_ok'),
            okButtonProps: { danger: true }, cancelText: tt('keep_editing'), onOk: () => onCerrar?.(),
        })
    }
    const otroArchivo = () => {
        const volver = () => { setPaso(origen ? 'eventos' : 'subir'); setFilas([]); setMapeo(null); setError(null) }
        if (!editado) return volver()
        Modal.confirm({ title: tt('discard_title'), content: tt('discard_body'), okText: tt('discard_ok'), okButtonProps: { danger: true }, cancelText: tt('keep_editing'), onOk: volver })
    }

    // La barra del botón avanza sola (~1.3 s) mientras el backend guarda; se
    // completa al responder. Luego salen las filas, la palomita y se cierra.
    const guardar = async (lista) => {
        const rows = paraConfirmar(lista, buildPhoneNumberSafe)
        const total = rows.length
        setEditando(null)
        setImportando({ hechos: 0, total })
        const inicio = ahora()
        const avance = setInterval(() => {
            const k = Math.min(0.92, (ahora() - inicio) / BARRA_MS)
            setImportando((p) => (p ? { ...p, hechos: Math.max(p.hechos, Math.round(total * k)) } : p))
        }, 60)
        try {
            const { data } = await axios.post(`${API}/api/guests/import/confirm`, { ...evento, rows }, { headers: await supabaseAuthHeaders() })
            if (!esPop && invitationId) {
                const nuevas = [...new Set(rows.map((r) => r.tag).filter(Boolean))]
                    .filter((tg) => !contexto.tags.some((x) => x.toLowerCase() === tg.toLowerCase()))
                if (nuevas.length) {
                    const { data: actual } = await supabase.from('invitations').select('tags').eq('id', invitationId).single()
                    await supabase.from('invitations').update({ tags: [...(actual?.tags || []), ...nuevas] }).eq('id', invitationId)
                }
            }
            await espera(Math.max(0, BARRA_MS - (ahora() - inicio)))
            clearInterval(avance)
            setImportando({ hechos: total, total, saliendo: true })
            await espera(450)
            const resultado = { ...data, inserted_count: data?.inserted_count ?? total }
            setExito(resultado)
            await espera(1400)
            onListo?.(resultado)
        } catch (e) {
            clearInterval(avance)
            console.error(e)
            setImportando(null)
            message.error(e.response?.data?.error || tt('error_confirm'))
        }
    }

    const bloqueado = !incluidas.length || cuentas.sinNombre > 0 || !!importando
    const confirmar = () => {
        if (bloqueado) return
        const sinLada = incluidas.filter((f) => String(f.phone_number ?? '').length === 10 && !f.phone_code).length
        if (!sinLada) return guardar(filas)
        Modal.confirm({
            title: tt('confirm_lada_title', { count: sinLada }),
            content: tt('confirm_lada_body', { lada: LADA_POR_OMISION }),
            okText: tt('confirm_lada_ok', { lada: LADA_POR_OMISION }),
            cancelText: tt('keep_editing'),
            onOk: () => {
                const conLada = filas.map((f) => (String(f.phone_number ?? '').length === 10 && !f.phone_code ? { ...f, phone_code: LADA_POR_OMISION } : f))
                setFilas(conLada)
                guardar(conLada)
            },
        })
    }

    // ── Pintar ────────────────────────────────────────────────────────
    const ejemplo = (h) => crudas.find((f) => f[h])?.[h]
    const opcionesColumna = encabezados.map((h) => ({
        value: h,
        label: <span className={s.opcionColumna}><b>{h}</b>{ejemplo(h) ? <span>{String(ejemplo(h)).slice(0, 28)}</span> : null}</span>,
        title: h,
    }))

    const leyendo = paso === 'leyendo'
    const revisando = paso === 'revisar'
    const titulo = importando ? tt('h_saving')
        : leyendo ? tt(origen ? 'h_reading_event' : 'h_reading')
            : revisando ? tt(origen ? 'h_done_event' : sinIA ? 'h_done_no_ai' : 'h_done', { count: filas.length })
                : paso === 'hoja' ? tt('h_sheet') : paso === 'eventos' ? tt('h_events') : tt('title')
    const estado = leyendo ? tt(origen ? `reading_event_${lecturaPaso}` : `reading_${lecturaPaso}`)
        : revisando ? (cuentas.revisar ? tt('sub_to_review', { count: cuentas.revisar }) : tt('sub_ready'))
            : null
    const subtitulo = (leyendo || revisando) && (hoja || origen)
        ? [`«${origen ? origen.nombre : hoja}»`, origen ? (leyendo ? null : tt('guests_n', { count: crudas.length })) : tt('rows', { count: crudas.length }), estado].filter(Boolean).join(' · ')
        : paso === 'eventos' ? tt('events_sub') : tt('subtitle')
    const destinoExito = esPop ? 'done_where_pop' : sideEventId ? 'done_where_side' : 'done_where_list'

    const vacio = (v) => (v == null || String(v).trim() === '' ? <span className={s.vacio}>—</span> : v)
    const chipLia = (texto, onClick) => (
        <button type="button" className={s.chipLia} onClick={onClick}>
            <Sparkles size={11} aria-hidden />{texto}
        </button>
    )

    const pintarFila = (f, i) => {
        const k = casos.get(f.key)
        const ed = editando === f.key
        const saliendo = importando?.saliendo
        const estilo = { '--d': `${saliendo ? Math.min(i, 16) * 28 : 280 + Math.min(i, 14) * 40}ms` }
        const tipoTexto = f.type && f.type !== 'undefined' ? tt(`type_${f.type}`) : null
        return (
            <tr
                key={f.key}
                className={s.fila}
                style={estilo}
                data-fuera={!f.include || undefined}
                data-destello={destello.has(f.key) || undefined}
                data-editando={ed || undefined}
                data-saliendo={saliendo || undefined}
            >
                <td className={s.celdaCheck}>
                    <Checkbox checked={f.include} onChange={(e) => editar(f.key, { include: e.target.checked })} aria-label={tt('include')} />
                </td>

                <td data-etiqueta={tt('f_name')} className={s.celdaNombre}>
                    {ed ? (
                        <Input className={s.campo} value={f.name} status={!f.name?.trim() ? 'error' : undefined} placeholder={tt('f_name')} onChange={(e) => editar(f.key, { name: e.target.value })} autoFocus />
                    ) : (
                        <span className={s.linea}>
                            {k.sinNombre ? (
                                <>
                                    <span className={s.aviso}>{tt('p_sin_nombre')}</span>
                                    <button type="button" className={s.agregar} onClick={() => setEditando(f.key)}>{tt('add')}</button>
                                </>
                            ) : (
                                <span className={s.nombre} data-generico={k.generico ? true : undefined}>{f.name}</span>
                            )}
                            {k.generico && chipLia(k.generico, () => editar(f.key, { name: k.generico }))}
                            {k.copia != null && <span className={s.badge}>{tt('badge_repeated')}</span>}
                            {k.enEvento && <span className={s.badge}>{tt('badge_in_list')}</span>}
                            {f.rechazo && <span className={s.badge}>{tt('badge_declined')}</span>}
                        </span>
                    )}
                </td>

                <td data-etiqueta={tt('f_phone_number')}>
                    {ed ? (
                        <span className={s.telefonoEditar}>
                            <Select className={s.lada} value={f.phone_code ?? undefined} placeholder={tt('lada')} options={PHONE_CODE_OPTIONS} popupMatchSelectWidth={false} onChange={(v) => editar(f.key, { phone_code: v })} />
                            <Input className={s.campo} value={f.phone_number} placeholder={tt('ten_digits')} maxLength={10} inputMode="numeric" onChange={(e) => editar(f.key, { phone_number: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                        </span>
                    ) : (
                        <span className={s.linea}>
                            {k.sinTelefono ? (
                                <>
                                    <span className={s.aviso}>{tt('p_sin_telefono')}</span>
                                    <button type="button" className={s.agregar} onClick={() => setEditando(f.key)}>{tt('add')}</button>
                                </>
                            ) : f.phone_number ? (
                                <span className={s.numero} data-mal={k.incompleto || k.sinLada || undefined}>{telefonoVisible(f.phone_code, f.phone_number)}</span>
                            ) : vacio(null)}
                            {k.lada && chipLia(k.lada, () => editar(f.key, { phone_code: k.lada }))}
                            {(k.sinLada || k.incompleto) && (
                                <button type="button" className={s.agregar} onClick={() => setEditando(f.key)}>{tt(k.incompleto ? 'p_telefono' : 'p_sin_lada')}</button>
                            )}
                        </span>
                    )}
                </td>

                <td data-etiqueta={tt('f_companion_of')} data-vacio={(!ed && !k.titular && !k.sinTitular) || undefined}>
                    {ed ? (
                        <Select
                            className={s.campoSelect} showSearch allowClear value={f.companion_key ?? undefined} placeholder={f.companion_raw || '—'}
                            options={opcionesTitular.filter((o) => o.value !== f.key)} optionFilterProp="label" popupMatchSelectWidth={false}
                            onChange={(v) => editar(f.key, { companion_key: v ?? null, ...(v == null ? { companion_raw: null } : {}) })}
                        />
                    ) : k.sinTitular ? (
                        <span className={s.linea}>
                            <span className={s.aviso} data-encoge title={f.companion_raw}>{f.companion_raw}</span>
                            <button type="button" className={s.agregar} onClick={() => setEditando(f.key)}>{tt('choose')}</button>
                        </span>
                    ) : <span className={s.texto}>{vacio(k.titular?.name)}</span>}
                </td>

                {conEtiqueta && (
                    <td data-etiqueta={tt('f_tag')} data-vacio={(!ed && !f.tag) || undefined}>
                        {ed ? (
                            <Select className={s.campoSelect} mode="tags" maxCount={1} value={f.tag ? [f.tag] : []} placeholder="—" options={tagOptions} popupMatchSelectWidth={false} onChange={(vals) => editar(f.key, { tag: vals[vals.length - 1] ?? null })} />
                        ) : <span className={s.texto}>{vacio(f.tag)}</span>}
                    </td>
                )}

                <td data-etiqueta={tt('f_type')} data-vacio={(!ed && !tipoTexto) || undefined}>
                    {ed ? (
                        <Select className={s.campoSelect} value={f.type} options={TIPOS.map((v) => ({ value: v, label: tt(`type_${v}`) }))} popupMatchSelectWidth={false} onChange={(v) => editar(f.key, { type: v })} />
                    ) : <span className={s.texto}>{vacio(tipoTexto)}</span>}
                </td>

                <td data-etiqueta={tt('f_tier')} data-vacio={(!ed && !f.tier) || undefined}>
                    {ed ? (
                        <Select className={s.campoSelect} allowClear value={f.tier ?? undefined} placeholder="—" options={TIERS.map((v) => ({ value: v, label: v }))} onChange={(v) => editar(f.key, { tier: v ?? null })} />
                    ) : <span className={s.texto}>{vacio(f.tier)}</span>}
                </td>

                {conLado && (
                    <td data-etiqueta={tt('f_side')} data-vacio={(!ed && !f.side) || undefined}>
                        {ed ? (
                            <Select className={s.campoSelect} allowClear value={f.side ?? undefined} placeholder="—" options={contexto.owners.map((o) => ({ value: o, label: o }))} popupMatchSelectWidth={false} onChange={(v) => editar(f.key, { side: v ?? null })} />
                        ) : <span className={s.texto}>{vacio(f.side)}</span>}
                    </td>
                )}

                <td data-etiqueta={tt('f_notes')} data-vacio={(!ed && !f.notes) || undefined}>
                    {ed ? (
                        <Input className={s.campo} value={f.notes ?? ''} placeholder="—" onChange={(e) => editar(f.key, { notes: e.target.value || null })} />
                    ) : <span className={`${s.texto} ${s.notas}`} title={f.notes || undefined}>{vacio(f.notes)}</span>}
                </td>

                <td className={s.celdaAcciones}>
                    <span className={s.acciones}>
                        {k.copia != null && !ed && <button type="button" className={s.botonOscuro} onClick={() => unir(f.key)}>{tt('merge')}</button>}
                        {ed ? (
                            <button type="button" className={s.botonOscuro} onClick={() => setEditando(null)}>{tt('done_edit')}</button>
                        ) : (
                            <>
                                <Tooltip title={tt('edit')}><button type="button" className={s.icono} onClick={() => setEditando(f.key)} aria-label={tt('edit')}><Pencil size={14} /></button></Tooltip>
                                <Tooltip title={tt('remove')}><button type="button" className={s.icono} data-peligro onClick={() => quitar(f.key)} aria-label={tt('remove')}><Trash2 size={14} /></button></Tooltip>
                            </>
                        )}
                    </span>
                </td>
            </tr>
        )
    }

    const pestanas = [
        { id: 'todos', n: cuentas.todos },
        { id: 'revisar', n: cuentas.revisar, alerta: true },
        { id: 'repetidos', n: cuentas.repetidos, alerta: true },
        ...(cuentas.evento ? [{ id: 'evento', n: cuentas.evento, alerta: true }] : []),
        ...(cuentas.excluidos ? [{ id: 'excluidos', n: cuentas.excluidos }] : []),
    ]
    const liaListo = arreglado != null && arreglables === 0

    return (
        <div className={s.raiz} data-paso={paso}>
            {exito && (
                <div className={s.exito}>
                    <span className={s.exitoMarca}><Check size={32} strokeWidth={2.6} /></span>
                    <span className={s.exitoTexto}>
                        <b>{tt(destinoExito, { count: exito.inserted_count })}</b>
                        <span>{exito.unmatched_companions?.length ? tt('done_unmatched', { names: exito.unmatched_companions.join(', ') }) : tt('done_sub')}</span>
                    </span>
                </div>
            )}

            <header className={s.cabeza}>
                <span className={s.marca} data-pulso={leyendo || undefined}><Sparkles size={16} /></span>
                <span className={s.cabezaTexto}>
                    <span className={s.titulo}>{titulo}</span>
                    <span className={s.sub}>{subtitulo}</span>
                </span>
                <button type="button" className={s.cerrar} onClick={cerrar} aria-label={tt('close')}><ChevronUp size={16} /></button>
            </header>

            {(leyendo || revisando) && !origen && (
                <div className={s.columnas}>
                    <span className={s.columnasTitulo}>{tt(sinIA ? 'columns_title_no_ai' : 'columns_title')}</span>
                    {usadas.map((c, i) => (
                        <span key={c} className={s.columna} data-visible={i < chipsVisibles || undefined}>
                            <span className={s.columnaDe}>{[].concat(mapeo[c]).join(' + ')}</span>
                            <span className={s.flechita}>→</span>
                            <b>{tt(`f_${c}`)}</b>
                        </span>
                    ))}
                    {mapeo && sinUsar.length > 0 && (
                        <span className={s.sinUsar} data-visible={usadas.length < chipsVisibles || undefined}>{tt('columns_unused', { list: sinUsar.join(', ') })}</span>
                    )}
                    {revisando && (
                        <button type="button" className={s.cambiar} onClick={() => setVerColumnas((v) => !v)}>{tt(verColumnas ? 'columns_hide' : 'columns_change')}</button>
                    )}
                </div>
            )}

            {revisando && verColumnas && !origen && (
                <div className={s.columnasGrid}>
                    {campos.map((c) => (
                        <label key={c} className={s.columnaEditar}>
                            <span>{tt(`f_${c}`)}</span>
                            <Select
                                mode={MULTIPLES.has(c) ? 'multiple' : undefined} allowClear placeholder={tt('column_none')}
                                value={MULTIPLES.has(c) ? (mapeo?.[c] ?? []) : (mapeo?.[c] ?? undefined)}
                                options={opcionesColumna} optionLabelProp="title" popupMatchSelectWidth={false}
                                onChange={(v) => cambiarColumna(c, MULTIPLES.has(c) ? (v ?? []) : (v ?? null))}
                            />
                        </label>
                    ))}
                </div>
            )}

            {paso === 'subir' && (
                <div className={s.cuerpo}>
                    <button
                        type="button" className={s.zona} data-arrastrando={arrastrando || undefined}
                        onClick={() => inputRef.current?.click()}
                        onDragEnter={(e) => { e.preventDefault(); setArrastrando(true) }}
                        onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
                        onDragLeave={() => setArrastrando(false)}
                        onDrop={(e) => { e.preventDefault(); setArrastrando(false); tomarArchivo(e.dataTransfer.files?.[0]) }}
                    >
                        <span className={s.zonaIcono}><UploadCloud size={20} /></span>
                        <b>{tt('drop_title')}</b>
                        <span>{tt('drop_sub')}</span>
                        <span className={s.formatos}>Excel · CSV · Numbers · Google Sheets</span>
                    </button>
                    <input ref={inputRef} type="file" accept={FORMATOS} hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; tomarArchivo(f) }} />
                    {error && <p className={s.error}><AlertTriangle size={16} />{error}</p>}
                    {pegando ? (
                        <div className={s.pegar}>
                            <Input.TextArea autoFocus value={pegado} onChange={(e) => setPegado(e.target.value)} placeholder={tt('paste_placeholder')} autoSize={{ minRows: 5, maxRows: 10 }} />
                            <div className={s.pegarAcciones}>
                                <button type="button" className={s.botonClaro} onClick={() => { setPegando(false); setPegado('') }}>{tt('cancel')}</button>
                                <button type="button" className={s.botonLia} disabled={!pegado.trim()} onClick={() => empezarCon(async () => leerTexto(pegado))}>{tt('paste_use')}</button>
                            </div>
                        </div>
                    ) : (
                        <div className={s.alternativas}>
                            <button type="button" className={s.enlace} onClick={() => setPegando(true)}><ClipboardPaste size={15} />{tt('paste_title')}</button>
                            <button type="button" className={s.enlace} onClick={() => descargarPlantilla({ conEtiqueta, conLado, owners: contexto.owners })}><Download size={15} />{tt('template')}</button>
                        </div>
                    )}
                    {eventos?.length > 0 && (
                        <button type="button" className={s.enlace} onClick={() => { setError(null); setPaso('eventos') }}><CalendarHeart size={15} />{tt('from_event_link')}</button>
                    )}
                    <p className={s.nota}>{tt('privacy_note')}</p>
                </div>
            )}

            {paso === 'eventos' && (
                <div className={`${s.cuerpo} ${s.cuerpoEventos}`}>
                    {error && <p className={s.error}><AlertTriangle size={16} />{error}</p>}
                    <div className={s.eventos}>
                        {(eventos ?? []).map((ev, i) => (
                            <button key={`${ev.tipo}-${ev.id}`} type="button" className={s.evento} style={{ '--d': `${Math.min(i, 12) * 40}ms` }} onClick={() => usarEvento(ev)}>
                                <span className={s.eventoFoto} data-tipo={ev.tipo}>
                                    {ev.imagen ? <img src={ev.imagen} alt="" loading="lazy" /> : ev.emoji ? <span>{ev.emoji}</span> : ev.tipo === 'pop' ? <Zap size={18} /> : <CalendarHeart size={18} />}
                                </span>
                                <span className={s.eventoTexto}>
                                    <b>{ev.nombre || tt('event_no_name')}</b>
                                    <span>
                                        {[
                                            ev.tipo === 'pop' ? 'Pop' : ev.tipo === 'side' ? (ev.de ? tt('event_side_of', { name: ev.de }) : tt('event_side')) : tt('event_invitation'),
                                            ev.fecha ? new Date(`${String(ev.fecha).slice(0, 10)}T12:00:00`).toLocaleDateString(idioma, { day: 'numeric', month: 'short', year: 'numeric' }) : null,
                                        ].filter(Boolean).join(' · ')}
                                    </span>
                                </span>
                                <span className={s.eventoCuenta}>{tt('guests_n', { count: ev.invitados })}</span>
                                <ChevronRight size={16} className={s.eventoFlecha} />
                            </button>
                        ))}
                    </div>
                    {modoInicial !== 'evento' && (
                        <button type="button" className={s.enlace} onClick={() => setPaso('subir')}><ArrowLeft size={14} />{tt('back_to_file')}</button>
                    )}
                </div>
            )}

            {paso === 'hoja' && (
                <div className={s.cuerpo}>
                    <div className={s.hojas}>
                        {hojas.map((h) => (
                            <button key={h.nombre} type="button" className={s.hoja} onClick={() => usarHoja(libro, h.nombre)}>
                                <FileSpreadsheet size={18} />
                                <b>{h.nombre}</b>
                                <span>{tt('rows', { count: h.filas })}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {leyendo && (
                <div className={s.esqueleto} aria-hidden>
                    {Array.from({ length: 10 }, (_, i) => (
                        <div key={i} className={s.esqueletoFila}>
                            <span className={s.esqCaja} />
                            {[0, 1, 2, 3, 4].map((c) => (
                                <span key={c} className={s.esqBarra} style={{ width: `${c === 0 ? 50 + ((i * 17) % 40) : c === 2 ? 30 + ((i * 23) % 50) : [0, 70, 0, 40, 55][c]}%`, animationDelay: `${c * 0.2}s` }} />
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {revisando && (
                <>
                    {(arreglables > 0 || arreglado != null) && (
                        <div className={s.barraLia}>
                            <Sparkles size={16} className={s.barraLiaIcono} />
                            <span className={s.barraLiaTexto}>
                                {liaListo ? (
                                    <><b>{tt('lia_done', { count: arreglado })}</b> {cuentas.sinTelefono ? tt('lia_done_left', { count: cuentas.sinTelefono }) : tt('lia_done_clean')}</>
                                ) : (
                                    <><b>{tt('lia_can_fix', { count: arreglables })}</b> {[
                                        cuentas.lada ? tt('lia_fix_lada', { count: cuentas.lada }) : null,
                                        cuentas.copias ? tt('lia_fix_dup', { count: cuentas.copias }) : null,
                                        cuentas.generico ? tt('lia_fix_name', { count: cuentas.generico }) : null,
                                    ].filter(Boolean).join(', ')}.</>
                                )}
                            </span>
                            {liaListo ? (
                                <button type="button" className={s.botonClaro} onClick={() => cambiarTab('todos')}>{tt('lia_see_all')}</button>
                            ) : (
                                <>
                                    <button type="button" className={s.botonClaro} onClick={() => cambiarTab('revisar')}>{tt('lia_one_by_one')}</button>
                                    <button type="button" className={s.botonLia} onClick={arreglarTodo}>{tt('lia_fix', { count: arreglables })}</button>
                                </>
                            )}
                        </div>
                    )}
                    {sinIA && <p className={s.avisoSinIA}><AlertTriangle size={15} />{tt('no_ai')}</p>}

                    <div className={s.barra}>
                        <div className={s.tabs} role="tablist">
                            {pestanas.map((p) => (
                                <button key={p.id} type="button" role="tab" aria-selected={tab === p.id} className={s.tab}
                                    data-on={tab === p.id || undefined} data-alerta={(p.alerta && p.n > 0) || undefined} onClick={() => cambiarTab(p.id)}>
                                    {tt(`tab_${p.id}`)}<span className={s.tabCuenta}>{p.n}</span>
                                </button>
                            ))}
                        </div>
                        <label className={s.buscar}>
                            <Search size={14} />
                            <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setLimite(POR_PAGINA) }} placeholder={tt('search')} />
                        </label>
                    </div>

                    <div className={s.tablaCaja} ref={tablaRef}>
                        <table className={s.tabla} data-etiqueta={conEtiqueta || undefined} data-lado={conLado || undefined}>
                            <thead>
                                <tr>
                                    <th className={s.celdaCheck}>
                                        <Checkbox
                                            checked={visibles.length > 0 && visibles.every((f) => f.include)}
                                            indeterminate={visibles.some((f) => f.include) && !visibles.every((f) => f.include)}
                                            onChange={(e) => marcarVisibles(e.target.checked)}
                                        />
                                    </th>
                                    <th className={s.colNombre}>{tt('f_name')}</th>
                                    <th className={s.colTelefono}>{tt('f_phone_number')}</th>
                                    <th className={s.colAcompana}>{tt('f_companion_of')}</th>
                                    {conEtiqueta && <th>{tt('f_tag')}</th>}
                                    <th className={s.colCategoria}>{tt('f_type')}</th>
                                    <th className={s.colPrioridad}>{tt('f_tier')}</th>
                                    {conLado && <th>{tt('f_side')}</th>}
                                    <th className={s.colNotas}>{tt('f_notes')}</th>
                                    <th className={s.celdaAcciones} />
                                </tr>
                            </thead>
                            <tbody key={entrada}>
                                {visibles.slice(0, limite).map(pintarFila)}
                            </tbody>
                        </table>
                        {visibles.length === 0 && (
                            <div className={s.vacioTabla}>
                                <span className={s.vacioMarca}><Check size={16} strokeWidth={3} /></span>
                                <b>{tt(tab === 'revisar' ? 'empty_review_title' : tab === 'repetidos' ? 'empty_dup_title' : 'empty_filter')}</b>
                                {(tab === 'revisar' || tab === 'repetidos') && <span>{tt('empty_review_sub')}</span>}
                            </div>
                        )}
                        {visibles.length > limite && (
                            <button type="button" className={s.masFilas} onClick={() => setLimite((l) => l + POR_PAGINA)}>
                                {tt('show_more', { count: Math.min(POR_PAGINA, visibles.length - limite), rest: visibles.length - limite })}
                            </button>
                        )}
                    </div>
                </>
            )}

            {(revisando || paso === 'hoja') && (
                <footer className={s.pie}>
                    <button type="button" className={s.enlace} onClick={otroArchivo} disabled={!!importando}><ArrowLeft size={14} />{tt(origen ? 'other_event' : 'other_file')}</button>
                    <span className={s.pieEspacio} />
                    {revisando && (
                        <>
                            <span className={s.pieCuenta}>
                                {tt('footer_count', { count: incluidas.length })}
                                {cuentas.sinTelefono > 0 && ` · ${tt('footer_no_phone', { count: cuentas.sinTelefono })}`}
                            </span>
                            <Tooltip title={cuentas.sinNombre && !importando ? tt('blocked_no_name', { count: cuentas.sinNombre }) : undefined}>
                                <button
                                    type="button" className={s.importar} aria-disabled={bloqueado || undefined}
                                    data-bloqueado={(!importando && bloqueado) || undefined} onClick={confirmar}
                                >
                                    <span className={s.importarBarra} style={{ width: importando ? `${(importando.hechos / Math.max(1, importando.total)) * 100}%` : 0 }} />
                                    <Check size={14} strokeWidth={2.6} className={s.importarTexto} />
                                    <span className={s.importarTexto}>
                                        {importando ? tt('importing', { done: importando.hechos, total: importando.total }) : tt('confirm', { count: incluidas.length })}
                                    </span>
                                </button>
                            </Tooltip>
                        </>
                    )}
                </footer>
            )}
        </div>
    )
}

export default ImportarInvitados
