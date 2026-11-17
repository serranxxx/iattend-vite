// Versión para el cliente de un archivo de docs/funciones: quita toda cita
// (`>`: notas internas, encabezado de revisión, pendientes) y las secciones
// "Pendiente de confirmar" y "Referencias técnicas", y convierte los links
// entre archivos en rutas de /funciones.
//
// Corre al compilar (plugin `funcionesCliente` de vite.config.js), así lo
// interno nunca llega al bundle. Por eso no puede usar nada del navegador.

const SECCIONES_INTERNAS = /^(pendiente de confirmar|referencias técnicas)/i

export const versionCliente = (md) => {
    const salida = []
    let saltarHasta = null // nivel del título de la sección interna que se salta

    for (const linea of md.replace(/\r\n/g, '\n').split('\n')) {
        const titulo = linea.match(/^(#{1,6})\s+(.*)$/)
        if (titulo) {
            const nivel = titulo[1].length
            if (saltarHasta !== null && nivel <= saltarHasta) saltarHasta = null
            if (saltarHasta === null && SECCIONES_INTERNAS.test(titulo[2])) {
                saltarHasta = nivel
                continue
            }
        }
        if (saltarHasta !== null) continue
        if (linea.startsWith('>')) continue
        salida.push(linea)
    }

    return salida.join('\n')
        .replace(/\]\((\d{2}-[a-z0-9-]+)\.md(#[^)]*)?\)/g, (_, slug, ancla = '') => `](/funciones/${slug}${ancla})`)
        .replace(/\n-{3,}\s*$/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}
