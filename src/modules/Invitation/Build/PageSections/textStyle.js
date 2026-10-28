// De dónde lee y a dónde escribe la barra de texto (TextBar) y el panel
// "Color" según el texto elegido:
// - 'cover': título de la portada (cover.title.text, alineación en position.align_x)
// - 'quote': texto de la Cita (quote.text.font, alineación en text.justify)
// - 'field': texto de un bloque ({ path, kind: 'title' | 'body' }). Con el
//   candado cerrado el cambio va a todos los títulos / cuerpos
//   (generals.fonts.titles | body); abierto, solo a ese texto
//   (invitation.text_styles[path], lo pinta EditableText en events).
export const textStyleFor = ({ target, field, locked, invitation, setInvitation, setSaved }) => {
    if (!target) return null

    if (target === 'cover' || target === 'quote') {
        const isQuote = target === 'quote'
        const write = (fn, opts) => { setInvitation(fn, opts); setSaved(false) }
        return {
            font: (isQuote ? invitation?.quote?.text?.font : invitation?.cover?.title?.text) ?? {},
            setFont: (patch, opts) => write((prev) => (isQuote
                ? { ...prev, quote: { ...prev.quote, text: { ...prev.quote.text, font: { ...prev.quote.text.font, ...patch } } } }
                : { ...prev, cover: { ...prev.cover, title: { ...prev.cover.title, text: { ...prev.cover.title.text, ...patch } } } }), opts),
            align: isQuote ? (invitation?.quote?.text?.justify ?? 'center') : (invitation?.cover?.title?.position?.align_x ?? 'center'),
            setAlign: (value) => write((prev) => (isQuote
                ? { ...prev, quote: { ...prev.quote, text: { ...prev.quote.text, justify: value } } }
                : { ...prev, cover: { ...prev.cover, title: { ...prev.cover.title, position: { ...prev.cover.title.position, align_x: value } } } })),
            maxSize: isQuote ? 44 : 96,
            showSize: true,
            showColor: true,
        }
    }

    // Texto de un bloque.
    const kindKey = field?.kind === 'title' ? 'titles' : 'body'
    const general = invitation?.generals?.fonts?.[kindKey] ?? {}
    const own = invitation?.text_styles?.[field?.path] ?? {}
    const write = (fn, opts) => { setInvitation(fn, opts); setSaved(false) }

    if (locked) {
        return {
            font: { ...general, typeFace: general.typeFace ?? invitation?.generals?.fonts?.body?.typeFace },
            setFont: (patch, opts) => write((prev) => ({
                ...prev,
                generals: { ...prev.generals, fonts: { ...prev.generals.fonts, [kindKey]: { ...prev.generals.fonts?.[kindKey], ...patch } } },
            }), opts),
            // Global: tamaño y color solo de títulos (el cuerpo usa los del tema);
            // sin alineación global.
            align: null,
            setAlign: null,
            maxSize: 36,
            showSize: kindKey === 'titles',
            showColor: kindKey === 'titles',
        }
    }

    return {
        font: { ...general, ...own, typeFace: own.typeFace ?? general.typeFace ?? invitation?.generals?.fonts?.body?.typeFace },
        setFont: (patch, opts) => write((prev) => ({
            ...prev,
            text_styles: { ...(prev.text_styles ?? {}), [field.path]: { ...(prev.text_styles?.[field.path] ?? {}), ...patch } },
        }), opts),
        align: own.align ?? 'center',
        setAlign: (value) => write((prev) => ({
            ...prev,
            text_styles: { ...(prev.text_styles ?? {}), [field.path]: { ...(prev.text_styles?.[field.path] ?? {}), align: value } },
        })),
        maxSize: 72,
        showSize: true,
        showColor: true,
    }
}
