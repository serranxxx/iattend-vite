// Nombre de un elemento suelto en el panel Capas (invitación y Flash): un
// texto se reconoce por lo que dice; lo demás por su tipo.
export const etiquetaElemento = (s, t) => {
    if (s.kind === 'text') return s.text?.trim() || t('build_editor.lp_el_text')
    if (!s.kind || s.kind === 'sticker') return t('build_editor.lp_el_image')
    if (s.kind === 'icon') return t(s.src && s.tint !== false ? 'build_editor.lp_el_vector' : 'build_editor.lp_el_icon')
    return t(`build_editor.lp_el_${s.kind}`)
}
