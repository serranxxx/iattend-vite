/**
 * Metadatos de vista previa (Open Graph / Twitter) por ruta.
 *
 * Esto es una SPA sin SSR: el servidor responde el mismo `index.html` para
 * todas las rutas, y los crawlers de WhatsApp, Facebook, X y LinkedIn **no
 * ejecutan JavaScript** — lo que React ponga en `document.head` en tiempo de
 * ejecución no lo ven nunca. La única forma de tener una vista previa por
 * ruta, sin montar SSR, es que el HTML ya venga con sus metas.
 *
 * Este paso corre después de `vite build` y, por cada ruta de PAGES, escribe
 * una copia de `dist/index.html` con sus propias metas. `vercel.json` manda
 * esas rutas a su archivo antes del catch-all; la SPA arranca igual, porque
 * el HTML es el mismo salvo el <head>.
 *
 * Para agregar otra ruta: una entrada más en PAGES y su rewrite en
 * vercel.json (antes del `/(.*)`, que si no se lo come).
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const DIST = 'dist'

const PAGES = [
    {
        // /save-the-date — la pieza de muestra, la que se comparte para
        // enseñar la feature.
        file: 'save-the-date.html',
        title: 'Save the Date · I attend',
        description: 'Anuncia la fecha de tu evento con una pieza digital: una sola pantalla, sin RSVP y sin lista de invitados.',
        image: 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/landing/save-the-date.jpg',
        imageWidth: 735,
        imageHeight: 1029,
    },
]

const escape = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const metaFor = ({ title, description, image, imageWidth, imageHeight }) => `
    <!-- Vista previa al compartir (generado por scripts/og-pages.mjs) -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="I attend" />
    <meta property="og:title" content="${escape(title)}" />
    <meta property="og:description" content="${escape(description)}" />
    <meta property="og:image" content="${escape(image)}" />
    <meta property="og:image:width" content="${imageWidth}" />
    <meta property="og:image:height" content="${imageHeight}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escape(title)}" />
    <meta name="twitter:description" content="${escape(description)}" />
    <meta name="twitter:image" content="${escape(image)}" />
`

const shell = await readFile(join(DIST, 'index.html'), 'utf8')

for (const page of PAGES) {
    // La descripción global de index.html se reemplaza por la de la ruta; el
    // <title> también, para que la pestaña no diga "I attend" a secas.
    const html = shell
        .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escape(page.description)}" />`)
        .replace(/<title>[^<]*<\/title>/, `<title>${escape(page.title)}</title>${metaFor(page)}`)

    if (html === shell) {
        // Si index.html cambia de forma y los reemplazos dejan de pegar, más
        // vale tronar el build que publicar páginas sin metas.
        throw new Error(`og-pages: no se pudo inyectar el <head> de ${page.file}. ¿Cambió index.html?`)
    }

    await writeFile(join(DIST, page.file), html, 'utf8')
    console.log(`og-pages: dist/${page.file}`)
}
