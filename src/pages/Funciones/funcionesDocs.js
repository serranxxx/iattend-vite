// Documentación de funciones para clientes (/funciones).
//
// La fuente es la misma que usa el equipo: docs/funciones/NN-*.md, importados
// con `?cliente`: el plugin `funcionesCliente` de vite.config.js los entrega ya
// sin lo interno (versionCliente.js). Al editar esos archivos, lo interno va
// siempre en una cita `> **Nota interna:**` o en las secciones "Pendiente de
// confirmar" / "Referencias técnicas".

const ARCHIVOS = import.meta.glob('../../../docs/funciones/[0-9]*.md', {
    query: '?cliente',
    import: 'default',
    eager: true,
})

const RESUMENES = {
    '01-invitacion': 'Editor, secciones, publicar, invitación en PDF e idiomas.',
    '02-invitados': 'Tu lista, confirmaciones, recordatorios y cómo funcionan los envíos por WhatsApp.',
    '03-acomodo-de-mesas': 'El mapa de tu salón: mesas, formas, giro y sillas para cada invitado.',
    '04-save-the-date': 'Anuncia la fecha gratis y compártela con un link.',
    '05-side-events': 'La despedida, el civil, la tornaboda: eventos alrededor de tu boda.',
    '06-pases-digitales': 'Pase con QR, Apple Wallet y el lector para la entrada.',
    '07-pops': 'Eventos rápidos e independientes, listos en minutos.',
    '08-photo-wall': 'Las fotos de tus invitados en un solo muro, en vivo.',
    '09-creditos': 'De dónde salen tus créditos, en qué se usan y tu espacio de archivos.',
    '10-planes': 'Paperless, Lite y PRO: qué incluye cada uno.',
    '11-lia': 'Tu asistente con inteligencia artificial: qué hace y qué no.',
    '12-todo-lo-demas': 'Cuentas, planners, pagos, soporte y más.',
}

// Mismo criterio que GitHub para los ids de los títulos, así los links
// `archivo.md#titulo` de los docs funcionan igual aquí.
export const slugTitulo = (texto) => texto
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-')

const separarTitulo = (md) => {
    const m = md.match(/^#\s+(.+)\n/)
    if (!m) return { titulo: '', cuerpo: md }
    return {
        titulo: m[1].replace(/^\d+\.\s*/, '').trim(),
        cuerpo: md.slice(m[0].length).trim(),
    }
}

export const TEMAS = Object.entries(ARCHIVOS)
    .map(([ruta, md]) => {
        const slug = ruta.split('/').pop().replace(/\.md$/, '')
        const { titulo, cuerpo } = separarTitulo(md)
        return {
            slug,
            numero: Number(slug.slice(0, 2)),
            titulo,
            resumen: RESUMENES[slug] ?? '',
            cuerpo,
        }
    })
    .sort((a, b) => a.numero - b.numero)
