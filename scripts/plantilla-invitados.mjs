// Genera public/plantillas/plantilla-invitados-iattend.xlsx: la plantilla que
// ofrece el importador de invitados (Importar/ImportarInvitados.jsx).
// Mismo diseño que la descarga de invitados (exportarInvitados.js): banda
// navy con el logo, encabezado lila, Poppins.
//
//   node scripts/plantilla-invitados.mjs
//
// Hojas: "Invitados" (vacía, con listas desplegables), "Ejemplo" e
// "Instrucciones". El importador ignora Ejemplo e Instrucciones si hay otra
// hoja con datos (leerLista.js → hojasConDatos). Los encabezados son los que
// reconoce Lia sin IA (mapeoLocal): si se cambian aquí, revisar allá.
import ExcelJS from 'exceljs'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const SALIDA = join(raiz, 'public/plantillas/plantilla-invitados-iattend.xlsx')

const C = {
    navy: 'FF1C3249',
    lila: 'FFD1BEDD',
    lilaSuave: 'FFF1EBF5',
    crema: 'FFEEEADF',
    cremaSuave: 'FFF5F3F2',
    cremaFila: 'FFFAF8F6',
    texto: 'FF29262D',
    gris: 'FF787878',
    borde: 'FFEBEBEB',
    blanco: 'FFFFFFFF',
}
const FUENTE = 'Poppins'
const relleno = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const letra = (extra = {}) => ({ name: FUENTE, size: 10, color: { argb: C.texto }, ...extra })

const COLUMNAS = [
    { titulo: 'Nombre', ancho: 28, ayuda: 'Nombre y apellido. Es lo único obligatorio.', obligatoria: true },
    { titulo: 'Teléfono', ancho: 22, ayuda: 'Con lada, por ejemplo +52 55 1234 5678. Sin lada, Lia te sugiere +52.' },
    { titulo: 'Acompaña a', ancho: 26, ayuda: 'Si la persona es acompañante, escribe el nombre de su titular tal cual aparece en «Nombre». Si no, déjalo vacío.' },
    { titulo: 'Etiqueta', ancho: 16, ayuda: 'Cómo agrupas a tus invitados: Familia, Amigos, Trabajo…' },
    { titulo: 'Categoría', ancho: 14, ayuda: 'Mujer, Hombre o Niño/a.', lista: ['Mujer', 'Hombre', 'Niño/a'], centro: true },
    { titulo: 'Prioridad', ancho: 12, ayuda: 'A, B, C o D (A = imprescindible).', lista: ['A', 'B', 'C', 'D'], centro: true },
    { titulo: 'Lado', ancho: 16, ayuda: 'De quién es invitado (por ejemplo, el nombre de la novia o del novio). Solo en bodas.' },
    { titulo: 'Menú', ancho: 16, ayuda: 'Menú que elige: Vegetariano, Infantil…' },
    { titulo: 'Necesidades especiales', ancho: 24, ayuda: 'Alergias, silla de ruedas, etc.' },
    { titulo: 'Notas', ancho: 30, ayuda: 'Cualquier otro dato.' },
]

const EJEMPLO = [
    ['Ana López', '+52 55 1234 5678', '', 'Familia', 'Mujer', 'A', 'Novia', 'Vegetariano', '', ''],
    ['Luis Pérez', '+52 55 8765 4321', 'Ana López', 'Familia', 'Hombre', 'A', 'Novia', '', '', ''],
    ['Mateo Pérez', '', 'Ana López', 'Familia', 'Niño/a', 'A', 'Novia', 'Infantil', '', '6 años'],
    ['Sofía Ruiz', '+52 33 1111 2222', '', 'Amigos', 'Mujer', 'B', 'Novio', '', 'Alergia a nueces', ''],
    ['Carlos Medina', '+1 312 555 0199', '', 'Trabajo', 'Hombre', 'C', 'Novio', '', '', 'Vive en Chicago'],
]

const FILA_ENCABEZADO = 7
const FILAS_VACIAS = 300

const pintarBanda = (hoja, { titulo, subtitulo, nota, logo }) => {
    const ancho = COLUMNAS.length
    ;[[1, 10], [2, 30], [3, 20], [4, 10], [5, 30], [6, 8]].forEach(([r, h]) => { hoja.getRow(r).height = h })
    for (let r = 1; r <= 4; r += 1) {
        for (let c = 1; c <= ancho; c += 1) hoja.getCell(r, c).fill = relleno(C.navy)
    }
    hoja.mergeCells(2, 3, 2, ancho)
    const t = hoja.getCell(2, 3)
    t.value = titulo
    t.font = letra({ size: 18, bold: true, color: { argb: C.crema } })
    t.alignment = { vertical: 'bottom', horizontal: 'left', indent: 1 }
    hoja.mergeCells(3, 3, 3, ancho)
    const s = hoja.getCell(3, 3)
    s.value = subtitulo
    s.font = letra({ size: 11, color: { argb: C.lila } })
    s.alignment = { vertical: 'top', horizontal: 'left', indent: 1 }
    hoja.addImage(logo, { tl: { col: 0.25, row: 1.05 }, ext: { width: 113, height: 44 }, editAs: 'absolute' })

    hoja.mergeCells(5, 1, 5, ancho)
    const n = hoja.getCell(5, 1)
    n.value = nota
    n.font = letra({ size: 9.5, color: { argb: C.navy } })
    n.fill = relleno(C.lilaSuave)
    n.alignment = { vertical: 'middle', indent: 1, wrapText: true }
}

const pintarEncabezado = (hoja) => {
    const fila = hoja.getRow(FILA_ENCABEZADO)
    COLUMNAS.forEach((col, i) => {
        const c = fila.getCell(i + 1)
        c.value = col.titulo
        c.font = letra({ bold: true, color: { argb: C.navy } })
        c.fill = relleno(C.lila)
        c.alignment = { vertical: 'middle', horizontal: col.centro ? 'center' : 'left', indent: col.centro ? 0 : 1 }
        c.border = { bottom: { style: 'medium', color: { argb: C.navy } } }
        c.note = { texts: [{ text: col.ayuda }], margins: { insetmode: 'auto' } }
    })
    fila.height = 28
}

const pintarFila = (hoja, r, valores = [], { ejemplo = false } = {}) => {
    const fila = hoja.getRow(r)
    fila.height = 22
    COLUMNAS.forEach((col, i) => {
        const c = fila.getCell(i + 1)
        if (valores[i]) c.value = valores[i]
        c.font = letra({ color: { argb: ejemplo && i === 2 && valores[i] ? C.gris : C.texto } })
        c.fill = relleno(r % 2 === 0 ? C.blanco : C.cremaFila)
        c.alignment = { vertical: 'middle', horizontal: col.centro ? 'center' : 'left', indent: col.centro ? 0 : 1 }
        c.border = { bottom: { style: 'thin', color: { argb: C.borde } } }
        // Teléfono como texto: que Excel no lo vuelva número ni le quite el +.
        if (i === 1) c.numFmt = '@'
        if (col.lista) {
            c.dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`"${col.lista.join(',')}"`],
                showErrorMessage: false,
            }
        }
    })
}

const hojaDeLista = (libro, nombre, { subtitulo, nota, filas, logo, color }) => {
    const hoja = libro.addWorksheet(nombre, {
        properties: { tabColor: { argb: color } },
        views: [{ state: 'frozen', ySplit: FILA_ENCABEZADO, xSplit: 1, showGridLines: false }],
    })
    hoja.columns = COLUMNAS.map((c) => ({ width: c.ancho }))
    pintarBanda(hoja, { titulo: 'Plantilla de invitados', subtitulo, nota, logo })
    pintarEncabezado(hoja)
    const total = filas ? filas.length : FILAS_VACIAS
    for (let i = 0; i < total; i += 1) pintarFila(hoja, FILA_ENCABEZADO + 1 + i, filas?.[i], { ejemplo: !!filas })
    return hoja
}

const libro = new ExcelJS.Workbook()
libro.creator = 'I attend'
libro.title = 'Plantilla de invitados'
const logo = libro.addImage({ buffer: readFileSync(join(raiz, 'public/images/logo_cover.png')), extension: 'png' })

hojaDeLista(libro, 'Invitados', {
    subtitulo: 'Una fila por persona · súbela en I attend y Lia la acomoda',
    nota: 'Solo el nombre es obligatorio. Cada acompañante va en su propia fila, con el nombre de su titular en «Acompaña a». Pasa el cursor por cada encabezado para ver qué va ahí; en la hoja «Ejemplo» hay una lista llena.',
    logo,
    color: C.lila,
})

hojaDeLista(libro, 'Ejemplo', {
    subtitulo: 'Así se ve una lista llena · esta hoja no se importa',
    nota: 'Luis y Mateo acompañan a Ana: van en su propia fila con «Ana López» en «Acompaña a». Mateo no tiene teléfono y está bien: los acompañantes no lo necesitan.',
    filas: EJEMPLO,
    logo,
    color: C.crema,
})

// Instrucciones: qué va en cada columna.
const inst = libro.addWorksheet('Instrucciones', {
    properties: { tabColor: { argb: C.navy } },
    views: [{ showGridLines: false }],
})
inst.columns = [{ width: 4 }, { width: 26 }, { width: 80 }]
;[[1, 14], [2, 30], [3, 22], [4, 14]].forEach(([r, h]) => { inst.getRow(r).height = h })
for (let r = 1; r <= 4; r += 1) for (let c = 1; c <= 3; c += 1) inst.getCell(r, c).fill = relleno(C.navy)
inst.mergeCells(2, 2, 2, 3)
inst.getCell(2, 2).value = 'Cómo llenar tu lista'
inst.getCell(2, 2).font = letra({ size: 18, bold: true, color: { argb: C.crema } })
inst.getCell(2, 2).alignment = { vertical: 'bottom' }
inst.mergeCells(3, 2, 3, 3)
inst.getCell(3, 2).value = 'Lia entiende cualquier Excel, pero con esta plantilla el resultado es más preciso.'
inst.getCell(3, 2).font = letra({ size: 11, color: { argb: C.lila } })
inst.getCell(3, 2).alignment = { vertical: 'top' }

let r = 6
const pasos = [
    ['1', 'Llena la hoja «Invitados»: una fila por persona, sin filas de título en medio.'],
    ['2', 'Los acompañantes también van en su propia fila, con el nombre de su titular en «Acompaña a».'],
    ['3', 'Guarda el archivo y súbelo en I attend → Invitados → Agregar → Arrastra tu Excel aquí.'],
    ['4', 'Lia revisa la lista contigo antes de guardar: ladas, repetidos y acompañantes.'],
]
pasos.forEach(([n, texto]) => {
    inst.getRow(r).height = 22
    const a = inst.getCell(r, 2)
    a.value = `Paso ${n}`
    a.font = letra({ bold: true, color: { argb: C.navy } })
    const b = inst.getCell(r, 3)
    b.value = texto
    b.font = letra()
    b.alignment = { vertical: 'middle', wrapText: true }
    r += 1
})
r += 1
;['Columna', 'Qué va ahí'].forEach((titulo, i) => {
    const c = inst.getCell(r, i + 2)
    c.value = titulo
    c.font = letra({ bold: true, color: { argb: C.navy } })
    c.fill = relleno(C.lila)
    c.alignment = { vertical: 'middle', indent: 1 }
})
inst.getRow(r).height = 26
r += 1
COLUMNAS.forEach((col, i) => {
    inst.getRow(r).height = 22
    const a = inst.getCell(r, 2)
    a.value = col.obligatoria ? `${col.titulo} *` : col.titulo
    a.font = letra({ bold: true })
    const b = inst.getCell(r, 3)
    b.value = col.ayuda
    b.font = letra({ color: { argb: C.gris } })
    b.alignment = { vertical: 'middle', wrapText: true }
    ;[a, b].forEach((c) => {
        c.fill = relleno(i % 2 === 0 ? C.blanco : C.cremaFila)
        c.border = { bottom: { style: 'thin', color: { argb: C.borde } } }
        if (c === a) c.alignment = { vertical: 'middle', indent: 1 }
    })
    r += 1
})
r += 1
inst.getCell(r, 2).value = '* Obligatorio. Las demás columnas son opcionales: borra las que no uses.'
inst.getCell(r, 2).font = letra({ size: 9, italic: true, color: { argb: C.gris } })
r += 1
inst.getCell(r, 2).value = 'Hecho con I attend · iattend.site'
inst.getCell(r, 2).font = letra({ size: 9, italic: true, color: { argb: C.gris } })

libro.views = [{ activeTab: 0 }]
mkdirSync(dirname(SALIDA), { recursive: true })
await libro.xlsx.writeFile(SALIDA)
console.log('Plantilla lista:', SALIDA)
