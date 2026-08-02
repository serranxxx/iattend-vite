// Emoji de bandera por código de idioma/región de DeepL. No es exhaustivo
// (idiomas sin país propio, ej. catalán, quedan con la bandera genérica) —
// es solo un apoyo visual en el selector de idiomas, no una fuente de verdad.
const FLAGS = {
    'en-us': '🇺🇸', 'en-gb': '🇬🇧', 'en': '🇬🇧',
    'es': '🇲🇽', 'es-419': '🌎',
    'fr': '🇫🇷', 'fr-fr': '🇫🇷', 'fr-ca': '🇨🇦',
    'pt': '🇵🇹', 'pt-pt': '🇵🇹', 'pt-br': '🇧🇷',
    'de': '🇩🇪', 'de-de': '🇩🇪', 'de-ch': '🇨🇭',
    'it': '🇮🇹',
    'nl': '🇳🇱',
    'ja': '🇯🇵', 'ko': '🇰🇷',
    'zh': '🇨🇳', 'zh-hans': '🇨🇳', 'zh-hant': '🇹🇼',
    'ru': '🇷🇺', 'uk': '🇺🇦', 'pl': '🇵🇱', 'tr': '🇹🇷', 'ar': '🇸🇦',
    'sv': '🇸🇪', 'da': '🇩🇰', 'nb': '🇳🇴', 'fi': '🇫🇮', 'cs': '🇨🇿',
    'sk': '🇸🇰', 'hu': '🇭🇺', 'ro': '🇷🇴', 'bg': '🇧🇬', 'el': '🇬🇷',
    'he': '🇮🇱', 'hi': '🇮🇳', 'id': '🇮🇩', 'vi': '🇻🇳', 'th': '🇹🇭',
    'hr': '🇭🇷', 'sr': '🇷🇸', 'sl': '🇸🇮', 'et': '🇪🇪',
    'lv': '🇱🇻', 'lt': '🇱🇹',
}

export function flagForLanguage(code = '') {
    const key = code.toLowerCase()
    if (FLAGS[key]) return FLAGS[key]
    const base = key.split('-')[0]
    return FLAGS[base] ?? '🌐'
}

// Atajos que se muestran siempre arriba del listado completo de DeepL.
export const POPULAR_LANGUAGES = [
    { code: 'en-US', label: 'Inglés (EE. UU.)' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Francés' },
    { code: 'pt-BR', label: 'Portugués' },
    { code: 'de', label: 'Alemán' },
    { code: 'it', label: 'Italiano' },
    { code: 'nl', label: 'Neerlandés' },
]
