// Datos y mapeo del onboarding "Crea tu invitación con IA".
//
// El backend (iattend--backend/models/lia.onboarding.js) regresa un plan:
// { summary, palette_name, colors, fonts{cover,titles,body,quote},
//   positions[9], texts{...} } ya saneado. Aquí se aplica sobre la invitación
// por etapas (para la vista previa en vivo) o de una vez (al abrir el editor).
// Nunca se tocan imágenes, tarjetas, itinerario ni generals.event.

export const LIA_ONBOARDING_STORAGE_KEY = 'iattend_lia_onboarding_v1'

// Apagado para usuarios: no se abre solo en invitaciones nuevas. Por ahora
// solo un admin lo abre con el botón ✦ del editor. Ponerlo en true para que
// vuelva a salir antes del tour la primera vez.
export const LIA_ONBOARDING_AUTOMATICO = false

// Índice de generals.positions → sección (el `index` de los botones de BuildPage)
export const IDX = { 1: 'greeting', 2: 'people', 3: 'quote', 4: 'itinerary', 5: 'dresscode', 6: 'gifts', 7: 'destinations', 8: 'notices', 9: 'gallery' }

export const IDEAS = ['playa', 'hacienda', 'jardin', 'ciudad', 'clasica', 'vinedo', 'pueblo', 'gala', 'intima', 'bosque']
export const TONOS = ['romantico', 'divertido', 'elegante', 'sencillo']
// El backend recibe el tono con su nombre en español
export const TONO_API = { romantico: 'Romántico', divertido: 'Divertido', elegante: 'Elegante', sencillo: 'Sencillo' }
export const AJUSTES = ['formal', 'divertido', 'calidos', 'tipografia']

const conCambio = (obj, ruta, valor) => {
    if (valor == null) return obj
    const [k, ...resto] = ruta
    return { ...obj, [k]: resto.length ? conCambio(obj?.[k] ?? {}, resto, valor) : valor }
}

// Los textos de la invitación con las claves del plan
export const textosDe = (inv) => ({
    greeting_title: inv?.greeting?.title,
    greeting_description: inv?.greeting?.description,
    people_title: inv?.people?.title,
    quote: inv?.quote?.text?.font?.value,
    itinerary_title: inv?.itinerary?.title,
    dresscode_title: inv?.dresscode?.title,
    dresscode_description: inv?.dresscode?.description,
    gifts_title: inv?.gifts?.title,
    gifts_description: inv?.gifts?.description,
    destinations_title: inv?.destinations?.title,
    destinations_description: inv?.destinations?.description,
    notices_title: inv?.notices?.title,
    notices: inv?.notices?.notices?.[0] ?? '',
    gallery_title: inv?.gallery?.title,
})

// El "borrador actual" que se manda al pedir un ajuste
export const planDe = (inv, plan) => ({
    palette_name: plan?.palette_name,
    colors: inv?.generals?.colors,
    fonts: {
        cover: inv?.cover?.title?.text?.typeFace,
        titles: inv?.generals?.fonts?.titles?.typeFace,
        body: inv?.generals?.fonts?.body?.typeFace,
        quote: inv?.quote?.text?.font?.typeFace,
    },
    positions: inv?.generals?.positions,
    texture: plan?.texture?.name,
    texts: textosDe(inv),
})

// Los colores llegan de una paleta del catálogo (el backend nunca inventa
// colores); igual que "aplicar paleta" en BuildGenerals, los títulos toman el
// color de texto.
export const aplicarColores = (inv, plan) => {
    if (!plan?.colors) return inv
    const out = conCambio(inv, ['generals', 'colors'], { ...inv.generals.colors, ...plan.colors })
    return conCambio(out, ['generals', 'fonts', 'titles', 'color'], plan.colors.accent)
}

// Textura del catálogo ({ id, name }); id null = sin textura
export const aplicarTextura = (inv, plan) =>
    plan?.texture ? { ...inv, generals: { ...inv.generals, texture: plan.texture.id } } : inv

export const aplicarFuentes = (inv, plan) => {
    const f = plan?.fonts ?? {}
    let out = inv
    out = conCambio(out, ['generals', 'fonts', 'titles', 'typeFace'], f.titles)
    out = conCambio(out, ['generals', 'fonts', 'body', 'typeFace'], f.body)
    out = conCambio(out, ['cover', 'title', 'text', 'typeFace'], f.cover)
    out = conCambio(out, ['quote', 'text', 'font', 'typeFace'], f.quote)
    return out
}

export const aplicarOrden = (inv, plan) =>
    plan?.positions ? conCambio(inv, ['generals', 'positions'], plan.positions) : inv

export const aplicarTextos = (inv, plan) => {
    const t = plan?.texts ?? {}
    let out = inv
    out = conCambio(out, ['greeting', 'title'], t.greeting_title)
    out = conCambio(out, ['greeting', 'description'], t.greeting_description)
    out = conCambio(out, ['people', 'title'], t.people_title)
    out = conCambio(out, ['quote', 'text', 'font', 'value'], t.quote)
    out = conCambio(out, ['itinerary', 'title'], t.itinerary_title)
    out = conCambio(out, ['dresscode', 'title'], t.dresscode_title)
    out = conCambio(out, ['dresscode', 'description'], t.dresscode_description)
    out = conCambio(out, ['gifts', 'title'], t.gifts_title)
    out = conCambio(out, ['gifts', 'description'], t.gifts_description)
    out = conCambio(out, ['destinations', 'title'], t.destinations_title)
    out = conCambio(out, ['destinations', 'description'], t.destinations_description)
    out = conCambio(out, ['notices', 'title'], t.notices_title)
    out = conCambio(out, ['gallery', 'title'], t.gallery_title)
    if (t.notices) {
        const avisos = inv?.notices?.notices ?? []
        out = conCambio(out, ['notices', 'notices'], avisos.length ? [t.notices, ...avisos.slice(1)] : [t.notices])
    }
    return out
}

// Nombres y fecha los escribe el organizador (no la IA)
export const aplicarDatos = (inv, { nombres, fecha }) => {
    let out = inv
    if (nombres?.trim()) out = conCambio(out, ['cover', 'title', 'text', 'value'], nombres.trim())
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha ?? '')) out = conCambio(out, ['cover', 'date', 'value'], `${fecha}T00:00:00`)
    return out
}

export const aplicarPlan = (inv, plan, datos) =>
    aplicarDatos(aplicarTextos(aplicarOrden(aplicarFuentes(aplicarTextura(aplicarColores(inv, plan), plan), plan), plan), plan), datos)
