// Descarga de la lista de invitados en Excel con el design system de I attend
// (GuestsPage → Descargables). SheetJS CE no escribe estilos, por eso va con
// exceljs, que se carga solo al descargar.
//
// Hoja "Invitados": banda navy de marca con el logo, el nombre de la lista y
// el evento; tira crema con el resumen; tabla con encabezado lila fijo y
// filtros, cada titular con sus acompañantes debajo y la mesa con su número y
// su nombre. Hoja "Mesas": cada mesa con su capacidad y quién está sentado.
// Colores y tipografía: .claude/skills/iattend-design-system (Poppins es la
// fuente de interfaz; si la computadora no la tiene, Excel usa la suya).
import { saveAs } from 'file-saver'
import { PHONE_CODES } from '../../helpers/assets/phoneCodes'

const C = {
    navy: 'FF1C3249',       // azul marino de marca
    lila: 'FFD1BEDD',       // lila de marca
    lilaSuave: 'FFF1EBF5',  // lila al 30 %
    crema: 'FFEEEADF',      // crema de marca
    cremaSuave: 'FFF5F3F2', // fondo secundario del producto
    cremaFila: 'FFFAF8F6',
    texto: 'FF29262D',
    gris: 'FF787878',
    grisFondo: 'FFF1F1F1',
    borde: 'FFEBEBEB',
    blanco: 'FFFFFFFF',
}
const FUENTE = 'Poppins'
const LOGO = '/images/logo_cover.png' // logo crema, para la banda navy

const ESTADOS = {
    creado: { texto: 'Por invitar', color: 'FF16323D', fondo: C.cremaSuave },
    esperando: { texto: 'Esperando respuesta', color: C.gris, fondo: C.grisFondo },
    confirmado: { texto: 'Confirmado', color: 'FF6D3CFA', fondo: 'FFF3EFFF' },
    asistente: { texto: 'Llegó', color: 'FF2E8B45', fondo: 'FFEAF7ED' },
    rechazado: { texto: 'No asistirá', color: 'FFD32F2F', fondo: 'FFFCEBEB' },
}
const CATEGORIAS = { female: 'Mujer', male: 'Hombre', child: 'Niño/a' }

// +52 614 437 2268: lada conocida + 10 dígitos agrupados. Lo que no encaja
// (un dígito de más o de menos) se deja tal cual, para no inventar.
const LADAS = PHONE_CODES.map((p) => p.code.replace('+', '')).sort((a, b) => b.length - a.length)
export const telefonoBonito = (tel) => {
    const limpio = String(tel ?? '').replace(/[^\d+]/g, '')
    const digitos = limpio.replace(/\D/g, '')
    const grupos = (n) => `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`
    if (digitos.length === 10) return grupos(digitos)
    const lada = LADAS.find((l) => digitos.startsWith(l) && digitos.length === l.length + 10)
    return lada ? `+${lada} ${grupos(digitos.slice(lada.length))}` : limpio
}

// Titulares en su orden y cada uno con sus acompañantes debajo. Un
// acompañante cuyo titular no viene en esta lista va solo, en su lugar.
const agrupar = (filas) => {
    const ids = new Set(filas.map((g) => String(g.id)))
    const deTitular = new Map()
    filas.forEach((g) => {
        if (g.companion_id == null || !ids.has(String(g.companion_id))) return
        const k = String(g.companion_id)
        deTitular.set(k, [...(deTitular.get(k) ?? []), g])
    })
    const salida = []
    filas.forEach((g) => {
        if (g.companion_id != null && ids.has(String(g.companion_id))) return
        salida.push({ g })
        ;(deTitular.get(String(g.id)) ?? []).forEach((c) => salida.push({ g: c, deGrupo: true }))
    })
    return salida
}

const relleno = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const letra = (extra = {}) => ({ name: FUENTE, size: 10, color: { argb: C.texto }, ...extra })

const cargarLogo = async () => {
    try {
        const r = await fetch(LOGO)
        if (!r.ok) return null
        return await r.arrayBuffer()
    } catch {
        return null
    }
}

// Banda de marca (filas 1–4) + tira crema con el resumen (fila 5) + aire
// (fila 6). La tabla empieza en la fila 7.
const FILA_ENCABEZADO = 7
const pintarPortada = (hoja, { ancho, titulo, subtitulo, resumen, logo }) => {
    ;[[1, 10], [2, 30], [3, 20], [4, 10], [5, 26], [6, 8]].forEach(([r, h]) => { hoja.getRow(r).height = h })
    for (let r = 1; r <= 4; r += 1) {
        for (let c = 1; c <= ancho; c += 1) hoja.getCell(r, c).fill = relleno(C.navy)
    }
    // El logo ocupa las dos primeras columnas y el texto va junto, a partir
    // de la 3 (visible al abrir: las dos primeras quedan fijas). Sin logo,
    // el texto empieza en la 1.
    const desde = logo != null && ancho > 3 ? 3 : 1
    hoja.mergeCells(2, desde, 2, ancho)
    const t = hoja.getCell(2, desde)
    t.value = titulo
    t.font = letra({ size: 18, bold: true, color: { argb: C.crema } })
    t.alignment = { vertical: 'bottom', horizontal: 'left', indent: 1 }
    hoja.mergeCells(3, desde, 3, ancho)
    const s = hoja.getCell(3, desde)
    s.value = subtitulo
    s.font = letra({ size: 11, color: { argb: C.lila } })
    s.alignment = { vertical: 'top', horizontal: 'left', indent: 1 }
    if (logo != null) {
        // `logo` = id de la imagen en el libro (se agrega una sola vez).
        // 1825 × 708: 44 px de alto.
        hoja.addImage(logo, { tl: { col: 0.25, row: 1.05 }, ext: { width: 113, height: 44 }, editAs: 'absolute' })
    }

    hoja.mergeCells(5, 1, 5, ancho)
    const r = hoja.getCell(5, 1)
    r.value = resumen
    r.font = letra({ size: 9, color: { argb: C.gris } })
    r.fill = relleno(C.cremaSuave)
    r.alignment = { vertical: 'middle', indent: 1 }
}

const pintarEncabezado = (hoja, titulos) => {
    const fila = hoja.getRow(FILA_ENCABEZADO)
    titulos.forEach(({ titulo, centro }, i) => {
        const c = fila.getCell(i + 1)
        c.value = titulo
        c.font = letra({ bold: true, color: { argb: C.navy } })
        c.fill = relleno(C.lila)
        c.alignment = { vertical: 'middle', horizontal: centro ? 'center' : 'left', indent: centro ? 0 : 1 }
        c.border = { bottom: { style: 'medium', color: { argb: C.navy } } }
    })
    fila.height = 28
}

const pintarPie = (hoja, ancho) => {
    const r = hoja.lastRow.number + 2
    hoja.mergeCells(r, 1, r, ancho)
    const c = hoja.getCell(r, 1)
    c.value = 'Hecho con I attend · iattend.site'
    c.font = letra({ size: 9, italic: true, color: { argb: C.gris } })
    c.alignment = { indent: 1 }
}

export const exportarInvitados = async ({
    filas,
    todos = filas,
    mesas = [],
    owners = [],
    evento = '',
    lista = 'Invitados',
    archivo = 'invitados.xlsx',
}) => {
    const [{ default: ExcelJS }, logo] = await Promise.all([import('exceljs'), cargarLogo()])

    const mesaDe = new Map(mesas.map((m) => [m.id, m]))
    const nombreDe = new Map(todos.map((g) => [String(g.id), g.name]))
    const hay = (campo) => filas.some((g) => g[campo] != null && String(g[campo]).trim() !== '')
    const conLado = owners.filter(Boolean).length > 0 && hay('side')
    const nombreMesa = (m) => m.name || `Mesa ${m.number ?? ''}`.trim()

    const columnas = [
        { clave: 'n', titulo: '#', ancho: 6, centro: true },
        { clave: 'nombre', titulo: 'Nombre', ancho: 30 },
        { clave: 'telefono', titulo: 'Teléfono', ancho: 19 },
        { clave: 'estado', titulo: 'Estado', ancho: 21, centro: true },
        { clave: 'mesa', titulo: 'Mesa', ancho: 8, centro: true },
        { clave: 'nombreMesa', titulo: 'Nombre de la mesa', ancho: 22 },
        { clave: 'etiqueta', titulo: 'Etiqueta', ancho: 16 },
        ...(conLado ? [{ clave: 'lado', titulo: 'Lado', ancho: 14 }] : []),
        { clave: 'prioridad', titulo: 'Prioridad', ancho: 11, centro: true },
        { clave: 'categoria', titulo: 'Categoría', ancho: 12 },
        { clave: 'acompana', titulo: 'Acompaña a', ancho: 26 },
        ...(hay('meal') ? [{ clave: 'menu', titulo: 'Menú', ancho: 18 }] : []),
        ...(hay('special_needs') ? [{ clave: 'necesidades', titulo: 'Necesidades especiales', ancho: 24 }] : []),
        ...(hay('notes') ? [{ clave: 'notas', titulo: 'Notas', ancho: 30 }] : []),
        { clave: 'codigo', titulo: 'Código', ancho: 12, centro: true },
    ]
    const ancho = columnas.length

    const wb = new ExcelJS.Workbook()
    wb.creator = 'I attend'
    wb.created = new Date()
    const logoId = logo ? wb.addImage({ buffer: logo, extension: 'png' }) : null

    const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    const titulares = filas.filter((g) => g.companion_id == null).length
    const conMesa = filas.filter((g) => g.table != null && mesaDe.has(g.table)).length
    const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

    // ── Invitados ─────────────────────────────────────────────────────
    const hoja = wb.addWorksheet('Invitados', {
        views: [{ state: 'frozen', ySplit: FILA_ENCABEZADO, xSplit: 2, showGridLines: false }],
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: `${FILA_ENCABEZADO}:${FILA_ENCABEZADO}` },
        properties: { tabColor: { argb: C.navy } },
    })
    hoja.columns = columnas.map((c) => ({ key: c.clave, width: c.ancho }))

    pintarPortada(hoja, {
        ancho,
        titulo: lista,
        subtitulo: evento,
        logo: logoId,
        resumen: [
            plural(filas.length, 'persona', 'personas'),
            plural(titulares, 'invitación', 'invitaciones'),
            mesas.length ? `${conMesa} con mesa · ${filas.length - conMesa} sin mesa` : null,
            `Descargado el ${fecha}`,
        ].filter(Boolean).join('   ·   '),
    })
    pintarEncabezado(hoja, columnas)

    let numero = 0
    let grupo = 0
    agrupar(filas).forEach(({ g, deGrupo }) => {
        if (!deGrupo) { numero += 1; grupo += 1 }
        const mesa = g.table != null ? mesaDe.get(g.table) : null
        const estado = ESTADOS[g.state]
        const fila = hoja.addRow({
            n: deGrupo ? '↳' : numero,
            nombre: g.name ?? '',
            telefono: telefonoBonito(g.phone_number),
            estado: estado?.texto ?? g.state ?? '',
            mesa: mesa ? (mesa.number ?? '') : '',
            nombreMesa: mesa ? nombreMesa(mesa) : 'Sin mesa',
            etiqueta: g.tag ?? '',
            lado: g.side ?? '',
            prioridad: g.tier ?? '',
            categoria: CATEGORIAS[g.type] ?? '',
            acompana: g.companion_id != null ? (nombreDe.get(String(g.companion_id)) ?? '') : '',
            menu: g.meal ?? '',
            necesidades: g.special_needs ?? '',
            notas: g.notes ?? '',
            codigo: g.password ?? '',
        })
        fila.height = 24
        const fondo = grupo % 2 === 0 ? C.cremaFila : C.blanco
        columnas.forEach((c, i) => {
            const celda = fila.getCell(i + 1)
            celda.font = letra()
            celda.fill = relleno(fondo)
            celda.border = { bottom: { style: 'thin', color: { argb: C.borde } } }
            celda.alignment = { vertical: 'middle', horizontal: c.centro ? 'center' : 'left', indent: c.centro ? 0 : 1 }
        })

        // Titular en negritas; acompañante sangrado y en gris, con ↳ lila.
        const n = fila.getCell('n')
        const nombre = fila.getCell('nombre')
        if (deGrupo) {
            n.font = letra({ bold: true, color: { argb: C.lila } })
            nombre.alignment = { vertical: 'middle', indent: 3 }
            nombre.font = letra({ color: { argb: C.gris } })
        } else {
            n.font = letra({ color: { argb: C.gris } })
            nombre.font = letra({ bold: true, color: { argb: C.navy } })
        }

        // Estado como píldora: su color sobre su fondo.
        if (estado) {
            const e = fila.getCell('estado')
            e.font = letra({ bold: true, size: 9, color: { argb: estado.color } })
            e.fill = relleno(estado.fondo)
        }

        // Mesa: número en lila, nombre en navy; sin mesa, en gris.
        if (mesa) {
            const m = fila.getCell('mesa')
            m.font = letra({ bold: true, color: { argb: C.navy } })
            m.fill = relleno(C.lilaSuave)
            fila.getCell('nombreMesa').font = letra({ color: { argb: C.navy } })
        } else {
            fila.getCell('nombreMesa').font = letra({ italic: true, color: { argb: C.gris } })
        }
        if (g.tier) fila.getCell('prioridad').font = letra({ bold: true, color: { argb: C.navy } })
        fila.getCell('telefono').font = letra({ color: { argb: g.phone_number ? C.texto : C.gris } })
        fila.getCell('codigo').font = { name: 'Courier New', size: 10, color: { argb: C.gris } }
    })

    hoja.autoFilter = {
        from: { row: FILA_ENCABEZADO, column: 1 },
        to: { row: FILA_ENCABEZADO + Math.max(filas.length, 1), column: ancho },
    }
    pintarPie(hoja, ancho)

    // ── Mesas ─────────────────────────────────────────────────────────
    if (mesas.length) {
        const hm = wb.addWorksheet('Mesas', {
            views: [{ state: 'frozen', ySplit: FILA_ENCABEZADO, showGridLines: false }],
            pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
            properties: { tabColor: { argb: C.lila } },
        })
        const cols = [
            { titulo: 'Mesa', ancho: 8, centro: true },
            { titulo: 'Nombre', ancho: 26 },
            { titulo: 'Capacidad', ancho: 12, centro: true },
            { titulo: 'Sentados', ancho: 12, centro: true },
            { titulo: 'Lugares', ancho: 16, centro: true },
            { titulo: 'Invitados', ancho: 70 },
        ]
        hm.columns = cols.map((c) => ({ width: c.ancho }))

        const ordenadas = [...mesas].sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
        const sinMesa = filas.filter((g) => g.table == null || !mesaDe.has(g.table))
        pintarPortada(hm, {
            ancho: cols.length,
            titulo: 'Mesas',
            subtitulo: [lista, evento].filter(Boolean).join(' · '),
            logo: logoId,
            resumen: [
                plural(ordenadas.length, 'mesa', 'mesas'),
                `${conMesa} sentados de esta lista`,
                sinMesa.length ? `${sinMesa.length} sin mesa` : null,
                `Descargado el ${fecha}`,
            ].filter(Boolean).join('   ·   '),
        })
        pintarEncabezado(hm, cols)

        const pintar = (valores, i, { lugares = null, sinLugar = false } = {}) => {
            const r = hm.addRow(valores)
            r.height = 24
            const fondo = i % 2 ? C.cremaFila : C.blanco
            cols.forEach((c, k) => {
                const celda = r.getCell(k + 1)
                celda.font = letra()
                celda.fill = relleno(fondo)
                celda.border = { bottom: { style: 'thin', color: { argb: C.borde } } }
                celda.alignment = { vertical: 'middle', wrapText: k === 5, horizontal: c.centro ? 'center' : 'left', indent: c.centro ? 0 : 1 }
            })
            if (sinLugar) {
                r.eachCell((celda) => { celda.font = letra({ italic: true, color: { argb: C.gris } }) })
                return
            }
            r.getCell(1).font = letra({ bold: true, color: { argb: C.navy } })
            r.getCell(1).fill = relleno(C.lilaSuave)
            r.getCell(2).font = letra({ bold: true, color: { argb: C.navy } })
            const l = r.getCell(5)
            if (lugares === 0) {
                l.font = letra({ bold: true, size: 9, color: { argb: C.navy } })
                l.fill = relleno(C.lila)
            } else if (lugares < 0) {
                l.font = letra({ bold: true, size: 9, color: { argb: 'FFD32F2F' } })
                l.fill = relleno('FFFCEBEB')
            } else if (lugares != null) {
                l.font = letra({ size: 9, color: { argb: 'FF2E8B45' } })
                l.fill = relleno('FFEAF7ED')
            }
        }
        ordenadas.forEach((m, i) => {
            const sentados = filas.filter((g) => g.table === m.id)
            const lugares = m.size ? m.size - sentados.length : null
            const texto = lugares == null ? '' : lugares === 0 ? 'Llena' : lugares < 0 ? `${-lugares} de más` : `${lugares} libres`
            pintar([m.number ?? '', nombreMesa(m), m.size ?? '', sentados.length, texto, sentados.map((g) => g.name).join(', ')], i, { lugares })
        })
        if (sinMesa.length) pintar(['—', 'Sin mesa', '', sinMesa.length, '', sinMesa.map((g) => g.name).join(', ')], ordenadas.length, { sinLugar: true })
        pintarPie(hm, cols.length)
    }

    const buffer = await wb.xlsx.writeBuffer()
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), archivo)
}
