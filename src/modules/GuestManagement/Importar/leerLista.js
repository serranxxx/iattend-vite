// Importar invitados desde Excel / CSV / lo pegado de Google Sheets.
//
// La IA ya no recibe la lista: solo encabezados, unas filas de muestra y los
// valores distintos de las columnas de categoría (`resumenParaIA`). Responde
// qué columna es cada dato (`mapeo`) y aquí se aplica a todas las filas
// (`aplicarMapeo`). Lo mismo cuando el organizador cambia una columna a mano.
import * as XLSX from 'xlsx'
import { PHONE_CODES, findPhoneCodeByDigits } from '../../../helpers/assets/phoneCodes'

export const FORMATOS = '.xlsx,.xls,.csv,.ods,.numbers,.tsv,.txt'
export const MAX_FILAS = 3000

export const CAMPOS = ['name', 'phone_number', 'phone_code', 'companion_of', 'tag', 'type', 'tier', 'side', 'meal', 'special_needs', 'notes']
// Campos con varias columnas (se juntan).
export const MULTIPLES = new Set(['name', 'notes'])

// ── Leer ───────────────────────────────────────────────────────────────

export const leerArchivo = async (file) => {
    const buffer = await file.arrayBuffer()
    return XLSX.read(buffer, { cellDates: true })
}

// Lo pegado desde Sheets / Excel llega separado por tabuladores.
export const leerTexto = (texto) => {
    const limpio = String(texto ?? '').replace(/\r\n?/g, '\n').trim()
    const sep = limpio.includes('\t') ? '\t' : limpio.split('\n')[0].includes(';') ? ';' : ','
    const filas = limpio.split('\n').map((l) => l.split(sep))
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(filas), 'Lista')
    return libro
}

const vacia = (fila) => !fila || fila.every((c) => String(c ?? '').trim() === '')
const texto = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '').trim())

// Encabezado = la primera fila (de las 10 primeras) casi tan llena como la
// más llena: así se saltan títulos como "Lista de invitados — Boda A&B".
const filaDeEncabezado = (matriz) => {
    const llenas = matriz.slice(0, 10).map((f) => (f || []).filter((c) => texto(c)).length)
    const max = Math.max(0, ...llenas)
    const i = llenas.findIndex((n) => n >= Math.max(1, Math.ceil(max * 0.6)))
    return i < 0 ? 0 : i
}

export const leerHoja = (libro, nombre) => {
    const hoja = libro.Sheets[nombre]
    if (!hoja) return { encabezados: [], filas: [] }
    const matriz = XLSX.utils.sheet_to_json(hoja, { header: 1, raw: false, defval: '', blankrows: false })
    if (!matriz.length) return { encabezados: [], filas: [] }

    const iEnc = filaDeEncabezado(matriz)
    const ancho = Math.max(...matriz.map((f) => f.length))
    const vistos = new Map()
    const encabezados = Array.from({ length: ancho }, (_, c) => {
        let h = texto(matriz[iEnc]?.[c]) || `Columna ${c + 1}`
        const n = (vistos.get(h) ?? 0) + 1
        vistos.set(h, n)
        if (n > 1) h = `${h} (${n})`
        return h
    })
    const filas = matriz.slice(iEnc + 1)
        .filter((f) => !vacia(f))
        .map((f) => Object.fromEntries(encabezados.map((h, c) => [h, texto(f[c])])))
    // Columnas sin ningún dato fuera.
    const conDatos = encabezados.filter((h) => filas.some((f) => f[h]))
    return {
        encabezados: conDatos,
        filas: filas.map((f) => Object.fromEntries(conDatos.map((h) => [h, f[h]]))),
    }
}

// Hojas con algo adentro (para preguntar cuál usar si hay varias).
export const hojasConDatos = (libro) => libro.SheetNames
    .map((nombre) => ({ nombre, filas: leerHoja(libro, nombre).filas.length }))
    .filter((h) => h.filas > 0)

// ── Lo que ve la IA ────────────────────────────────────────────────────

export const resumenParaIA = (encabezados, filas) => {
    const muestra = filas.slice(0, 6)
    const valores = {}
    encabezados.forEach((h) => {
        const distintos = [...new Set(filas.map((f) => f[h]).filter(Boolean))]
        // Solo columnas "de categoría": pocos valores que se repiten. Una
        // columna de nombres o teléfonos no se manda.
        if (distintos.length && distintos.length <= 25 && distintos.length <= Math.max(3, filas.length * 0.5)) {
            valores[h] = distintos
        }
    })
    return { headers: encabezados, sample: muestra, values: valores }
}

// ── Aplicar el mapeo ───────────────────────────────────────────────────

export const normalizar = (s) => String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim()

const ultimos10 = (tel) => String(tel ?? '').replace(/\D/g, '').slice(-10)

// Teléfono tal cual del Excel (espacios, guiones, paréntesis, lada pegada).
export const separarTelefono = (raw, codigoCol) => {
    const digitos = String(raw ?? '').replace(/\D/g, '')
    let code = null
    if (codigoCol) {
        const d = String(codigoCol).replace(/\D/g, '')
        code = d ? (findPhoneCodeByDigits(d)?.code ?? `+${d}`) : null
    }
    if (digitos.length <= 10) return { code, number: digitos }
    const lada = digitos.slice(0, -10)
    return { code: code ?? findPhoneCodeByDigits(lada)?.code ?? null, number: digitos.slice(-10) }
}

const TIPOS_LOCALES = {
    mujer: 'female', femenino: 'female', f: 'female', female: 'female', woman: 'female',
    hombre: 'male', masculino: 'male', m: 'male', male: 'male', man: 'male',
    nino: 'child', nina: 'child', ninos: 'child', child: 'child', kid: 'child', menor: 'child',
}

export const aplicarMapeo = (filas, mapeo, { owners = [], conLado = true, conEtiqueta = true } = {}) => {
    const col = (campo) => mapeo?.[campo]
    const lista = (campo) => {
        const v = col(campo)
        return Array.isArray(v) ? v : v ? [v] : []
    }
    const valores = mapeo?.values ?? {}

    return filas.map((f, i) => {
        const nombre = lista('name').map((h) => f[h]).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
        const { code, number } = separarTelefono(f[col('phone_number')], col('phone_code') ? f[col('phone_code')] : null)

        const rawTipo = f[col('type')]
        const type = (rawTipo && (valores.type?.[rawTipo] ?? TIPOS_LOCALES[normalizar(rawTipo)])) || 'undefined'

        const rawTier = f[col('tier')]
        const tierIA = rawTier ? valores.tier?.[rawTier] : undefined
        const tier = tierIA !== undefined ? tierIA : (/^[abcd]$/i.test(rawTier ?? '') ? rawTier.toUpperCase() : null)

        const rawLado = f[col('side')]
        const side = !conLado || !rawLado ? null
            : (valores.side?.[rawLado] ?? (owners.includes(rawLado) ? rawLado : null))

        const rawTag = f[col('tag')]
        const tag = !conEtiqueta || !rawTag ? null : (valores.tag?.[rawTag] ?? rawTag)

        const colsNotas = lista('notes')
        const notes = colsNotas.length === 1
            ? (f[colsNotas[0]] || null)
            : colsNotas.filter((h) => f[h]).map((h) => `${h}: ${f[h]}`).join(' · ') || null

        return {
            key: i,
            include: true,
            name: nombre,
            phone_code: code,
            phone_number: number,
            tag,
            type,
            tier,
            side,
            meal: f[col('meal')] || null,
            special_needs: f[col('special_needs')] || null,
            notes,
            companion_raw: f[col('companion_of')] || null,
            companion_key: null,
        }
    })
}

// "Acompaña a" por nombre (sin acentos ni mayúsculas). Con dos personas del
// mismo nombre no se adivina: queda sin titular y se marca.
export const resolverAcompanantes = (filas) => {
    const porNombre = new Map()
    filas.forEach((f) => {
        const n = normalizar(f.name)
        if (!n) return
        porNombre.set(n, [...(porNombre.get(n) ?? []), f.key])
    })
    return filas.map((f) => {
        if (!f.companion_raw) return f
        const candidatos = (porNombre.get(normalizar(f.companion_raw)) ?? []).filter((k) => k !== f.key)
        return { ...f, companion_key: candidatos.length === 1 ? candidatos[0] : null }
    })
}

// ── Problemas ──────────────────────────────────────────────────────────

export const indiceExistentes = (existentes = []) => ({
    telefonos: new Set(existentes.map((g) => ultimos10(g.phone_number)).filter((t) => t.length === 10)),
    nombres: new Set(existentes.map((g) => normalizar(g.name)).filter(Boolean)),
})

// Duplicados dentro del archivo: a partir de la segunda aparición.
export const duplicadosEnArchivo = (filas) => {
    const vistos = new Set()
    const dup = new Set()
    filas.forEach((f) => {
        const claves = [ultimos10(f.phone_number).length === 10 ? `t:${ultimos10(f.phone_number)}` : null, normalizar(f.name) ? `n:${normalizar(f.name)}` : null].filter(Boolean)
        if (claves.some((c) => vistos.has(c))) dup.add(f.key)
        claves.forEach((c) => vistos.add(c))
    })
    return dup
}

export const PROBLEMAS = ['sin_nombre', 'telefono', 'sin_lada', 'duplicado_evento', 'duplicado_archivo', 'sin_titular']

export const problemasDe = (f, { existentes, dupArchivo }) => {
    const p = []
    if (!f.name?.trim()) p.push('sin_nombre')
    const num = String(f.phone_number ?? '')
    if (num && num.length !== 10) p.push('telefono')
    if (num.length === 10 && !f.phone_code) p.push('sin_lada')
    const tel = ultimos10(num)
    if ((tel.length === 10 && existentes.telefonos.has(tel)) || (f.name && existentes.nombres.has(normalizar(f.name)))) p.push('duplicado_evento')
    if (dupArchivo.has(f.key)) p.push('duplicado_archivo')
    if (f.companion_raw && f.companion_key == null) p.push('sin_titular')
    return p
}

// ── Plantilla ──────────────────────────────────────────────────────────

export const descargarPlantilla = ({ conEtiqueta = true, conLado = false, owners = [] } = {}) => {
    const enc = ['Nombre', 'Teléfono', 'Acompaña a', ...(conEtiqueta ? ['Etiqueta'] : []), 'Categoría', 'Prioridad', ...(conLado ? ['Lado'] : []), 'Notas']
    const lado = owners[0] ?? ''
    const fila = (nombre, tel, acompana, etiqueta, cat, prio, notas) => [
        nombre, tel, acompana, ...(conEtiqueta ? [etiqueta] : []), cat, prio, ...(conLado ? [lado] : []), notas,
    ]
    const datos = [
        enc,
        fila('Ana López', '+52 55 1234 5678', '', 'Familia', 'Mujer', 'A', 'Vegetariana'),
        fila('Luis Pérez', '+52 55 8765 4321', 'Ana López', 'Familia', 'Hombre', 'A', ''),
        fila('Sofía Ruiz', '+52 33 1111 2222', '', 'Amigos', 'Mujer', 'B', ''),
    ]
    const hoja = XLSX.utils.aoa_to_sheet(datos)
    hoja['!cols'] = enc.map((h) => ({ wch: Math.max(14, h.length + 4) }))
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, 'Invitados')
    XLSX.writeFile(libro, 'Plantilla de invitados - I attend.xlsx')
}

// ── Para el backend ────────────────────────────────────────────────────

export const paraConfirmar = (filas, armarTelefono) => {
    const incluidas = filas.filter((f) => f.include)
    const indice = new Map(incluidas.map((f, i) => [f.key, i]))
    return incluidas.map((f) => ({
        name: f.name.trim(),
        phone_number: armarTelefono(f.phone_code, f.phone_number),
        tag: f.tag || null,
        type: f.type || 'undefined',
        tier: f.tier || null,
        side: f.side || null,
        notes: f.notes || null,
        meal: f.meal || null,
        special_needs: f.special_needs || null,
        companion_index: f.companion_key != null && indice.has(f.companion_key) ? indice.get(f.companion_key) : null,
    }))
}

export const LADA_POR_OMISION = PHONE_CODES[0].code

// ── Respaldo sin IA ────────────────────────────────────────────────────
// Si la IA no responde, se adivina por el nombre de la columna; el
// organizador lo corrige en "Columnas".
const PISTAS = [
    ['phone_code', /^(lada|codigo|cod\.? pais|country code)$/],
    ['phone_number', /(tel|cel|whats|movil|phone|numero|contacto)/],
    ['companion_of', /(acompana|plus ?one|invitado de|va con|pareja de)/],
    ['tag', /(etiqueta|grupo|tag|familia|mesa|categoria de invitado|relacion)/],
    ['type', /(sexo|genero|gender|tipo|categoria)/],
    ['tier', /(prioridad|priority|tier|importancia)/],
    ['side', /(lado|parte|side|de parte)/],
    ['meal', /(menu|comida|platillo|meal)/],
    ['special_needs', /(alergi|necesidad|dieta|restricci|accesib)/],
    ['notes', /(nota|comentario|observaci|notes)/],
    ['name', /(nombre|name|invitado|apellido|guest)/],
]

export const mapeoLocal = (encabezados) => {
    const mapeo = { name: [], notes: [], values: {} }
    encabezados.forEach((h) => {
        const n = normalizar(h)
        const campo = PISTAS.find(([, re]) => re.test(n))?.[0]
        if (!campo) return
        if (MULTIPLES.has(campo)) mapeo[campo].push(h)
        else if (!mapeo[campo]) mapeo[campo] = h
    })
    return mapeo
}

// ── Lo que Lia puede arreglar sola (handoff "Importar con Lia") ───────

// +52 solo si son 10 dígitos que empiezan con una clave de región de México
// (2–9). Si no se puede inferir, no se sugiere nada.
export const ladaSugerida = (f) => {
    const num = String(f.phone_number ?? '')
    return num.length === 10 && !f.phone_code && /^[2-9]/.test(num) ? '+52' : null
}

// "Acompañante", "Invitado", "+1"… con alguien a quien acompaña.
const GENERICOS = new Set(['acompanante', 'acompanantes', 'invitado', 'invitada', 'invitado extra', '+1', 'plus one', 'plus 1', 'pareja', 'guest', 'companion', 'n/a', 'na', '-', '--', 'x', 'sin nombre'])
export const esNombreGenerico = (nombre) => {
    const n = normalizar(nombre)
    // "+1 de Ana" ya es el nombre que pone Lia: no cuenta como genérico.
    return !n || GENERICOS.has(n) || /^acompanante\b/.test(n) || /^(pareja|invitad[oa]) de\b/.test(n)
}
export const nombreSugerido = (f, titular) => {
    if (!titular?.name?.trim() || !esNombreGenerico(f.name)) return null
    if (f.companion_key == null) return null
    return `+1 de ${titular.name.trim()}`
}

// Pares de repetidos dentro del archivo: copia → original (la primera vez
// que aparece ese teléfono o ese nombre).
export const paresRepetidos = (filas) => {
    const primera = new Map()
    const pares = new Map()
    filas.forEach((f) => {
        const tel = ultimos10(f.phone_number)
        const claves = [tel.length === 10 ? `t:${tel}` : null, normalizar(f.name) && !esNombreGenerico(f.name) ? `n:${normalizar(f.name)}` : null].filter(Boolean)
        const original = claves.map((c) => primera.get(c)).find((k) => k != null)
        if (original != null) pares.set(f.key, original)
        else claves.forEach((c) => primera.set(c, f.key))
    })
    return pares
}

// Unir una copia con su original: lo que le falte al original se toma de la
// copia, las notas se juntan y quien acompañaba a la copia pasa al original.
export const unirCopia = (filas, copia, original) => {
    const c = filas.find((f) => f.key === copia)
    if (!c) return filas
    return filas
        .filter((f) => f.key !== copia)
        .map((f) => {
            if (f.key === original) {
                const notas = [f.notes, c.notes].filter(Boolean)
                const unicas = [...new Set(notas.map((n) => n.trim()))].join(' · ') || null
                return {
                    ...f,
                    phone_number: f.phone_number || c.phone_number,
                    phone_code: f.phone_code || (f.phone_number ? f.phone_code : c.phone_code),
                    tag: f.tag ?? c.tag,
                    tier: f.tier ?? c.tier,
                    side: f.side ?? c.side,
                    type: f.type !== 'undefined' ? f.type : c.type,
                    meal: f.meal ?? c.meal,
                    special_needs: f.special_needs ?? c.special_needs,
                    notes: unicas,
                    companion_key: f.companion_key ?? c.companion_key,
                    include: f.include || c.include,
                }
            }
            return f.companion_key === copia ? { ...f, companion_key: original } : f
        })
}
