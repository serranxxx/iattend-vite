import dayjs from 'dayjs'
import 'dayjs/locale/es'

// dayjs en español abrevia con punto ("oct."); el diseño va sin él.
export const fmtDay = (day, locale, es, en) =>
    day ? dayjs(day).locale(locale).format(locale === 'en' ? en : es).replace(/\./g, '') : null

export const fmtShort = (day, locale) => fmtDay(day, locale, 'D MMM', 'MMM D')
export const fmtLong = (day, locale) => fmtDay(day, locale, 'D MMM YYYY', 'MMM D, YYYY')

// "17:30" → "5:30 pm" para eventos personales (el itinerario ya trae su texto).
export const fmtTime = (time) => {
    if (!time) return null
    const [h, m] = time.split(':').map(Number)
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`
}

export const initialsOf = (s) => {
    const owners = (s.invitation?.owners ?? []).filter(Boolean)
    // "Sofía & Diego" → SD; "Aniversario Grupo Norte" → GN; "Renata" → R
    const words = owners.length > 1 ? owners : s.title.split(/\s+/)
    return words.filter(Boolean).slice(-2).map(w => w[0]).join('').toUpperCase()
}
