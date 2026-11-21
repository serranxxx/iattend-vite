// Nombre de un elemento suelto en el panel Capas (invitación y Pop): un
// texto se reconoce por lo que dice; lo demás por su tipo.
export const etiquetaElemento = (s, t) => {
    if (s.kind === 'text') return s.text?.trim() || t('build_editor.lp_el_text')
    if (s.kind === 'boton') {
        const nombre = s.variant === 'transparente' ? t('build_editor.btn_style_transparente') : t('build_editor.lp_el_boton')
        return s.text?.trim() ? `${nombre} · ${s.text.trim()}` : nombre
    }
    if (!s.kind || s.kind === 'sticker') return t('build_editor.lp_el_image')
    if (s.kind === 'icon') return t(s.src && s.tint !== false ? 'build_editor.lp_el_vector' : 'build_editor.lp_el_icon')
    return t(`build_editor.lp_el_${s.kind}`)
}
