/*
  Controles del invitado de una invitación en PDF (en código "Edición
  avanzada": `invitations.data.estiloPdf`), handoff "Editor de Diseño —
  paleta, forma, estilo de botón y secciones".
  Gemela: iattend-events/src/helpers/estiloPdf.ts. Ver docs/invitacion-pdf.md.

  **Automático = como siempre**: lo que no se configura se ve exactamente como
  antes (el dock de vidrio, los radios, las sombras y los colores de
  `generals.colors`). Abrir el panel no cambia nada; solo lo elegido a mano.

  data.estiloPdf = {
    palette:   { base, sup, claro, acento },      // 4 roles; sin valor = generals.colors (primary, secondary, accent, actions)
    shape:     'pill' | 'round' | 'square',       // sin valor = auto
    shadow:    'sin' | 'suave' | 'media' | 'fuerte', // sin valor = auto
    btnStyle:  'solido' | 'contorno' | 'frost' | 'liquid' | 'sticker' | 'relieve', // sin valor = auto (el vidrio de siempre)
    assign:    { dock: {…}, pases: {…}, lia: {…}, editar: {…} }, // solo lo cambiado: un rol o un #hex
    secShadow: { dock?, pases?, lia?, editar? },  // sombra propia de una sección
  }
  Cada slot tiene el rol que ya usaba; los que eran una mezcla (burbuja de
  Lia, tarjetas, texto sobre acentos) van en Auto. Elegir el rol por defecto
  borra el cambio. El Wall conserva su diseño.
*/

export const ROLES = ['base', 'sup', 'claro', 'acento']
// Slots de cada sección y su rol por defecto. `soloPro`: el dock y sus hojas
// solo existen en el plan Pro (en Lite el "Dock" es el botón CONFIRMAR).
// El rol de cada slot es el que ya usaba (null = Auto). En Lite el texto
// del botón siempre fue el fondo (`liteIcon`).
export const SECCIONES = [
    { id: 'dock', slots: [['fondo', 'acento'], ['icon', 'claro'], ['activa', 'claro'], ['activaTxt', 'base']], slotsLite: ['fondo', 'icon'] },
    { id: 'pases', soloPro: true, slots: [['fondo', 'base'], ['texto', 'claro'], ['icono', 'acento'], ['pase', 'base'], ['qr', 'claro']] },
    { id: 'lia', soloPro: true, slots: [['fondo', 'base'], ['texto', 'claro'], ['icono', 'acento'], ['burbuja', null], ['tuya', 'claro']] },
    { id: 'editar', slots: [['fondo', 'base'], ['texto', 'claro'], ['acento', 'acento'], ['acentoTxt', null], ['tarjetas', null]] },
]
export const FORMAS = ['pill', 'round', 'square']
export const SOMBRAS = ['sin', 'suave', 'media', 'fuerte']
export const ESTILOS_BOTON = ['auto', 'solido', 'contorno', 'frost', 'liquid', 'sticker', 'relieve']

const HEX = /^#[0-9a-f]{6}$/i
export const esHex = (v) => typeof v === 'string' && HEX.test(v)

// ── Color ──
const luz = (hex) => {
    const n = parseInt(hex.slice(1, 7), 16)
    const f = (x) => { const v = x / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
    return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255)
}
export const tintaSobre = (fondo) => (esHex(fondo) && luz(fondo) > 0.4 ? '#2A2919' : '#F7F3E1')
const hex2 = (n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0').toUpperCase()
// `a` encima de `b` al `k` (0–1): para enseñar los Auto que eran una mezcla.
const mezcla = (a, b, k) => {
    const x = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
    const y = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
    return `#${x.map((v, i) => hex2(v * k + y[i] * (1 - k))).join('')}`
}
const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1, 7), 16)
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

// Los 4 roles = la paleta de Diseño tal cual (igual que events): Fondo,
// Contrastes, Textos, Acentos.
export const paletaBase = (generals) => {
    const c = generals?.colors ?? {}
    const h = (v, d) => (esHex(v) ? v : d)
    return { base: h(c.primary, '#FFFFFF'), sup: h(c.secondary, '#FFFFFF'), claro: h(c.accent, '#29262D'), acento: h(c.actions, '#29262D') }
}

export const estiloPdfDe = (data) => {
    const e = data?.estiloPdf
    return e && typeof e === 'object' ? e : null
}

export const paletaDe = (data) => {
    const p = paletaBase(data?.generals)
    const e = estiloPdfDe(data)
    for (const r of ROLES) if (esHex(e?.palette?.[r])) p[r] = e.palette[r]
    return p
}

const seccion = (id) => SECCIONES.find((s) => s.id === id)
// Rol por defecto de un slot (null = Auto). `pro` = false: en Lite el texto
// del botón CONFIRMAR es el fondo.
export const rolPorDefecto = (sec, slot, pro = true) => (!pro && sec === 'dock' && slot === 'icon' ? 'base' : seccion(sec)?.slots.find(([k]) => k === slot)?.[1] ?? null)

// Lo asignado a un slot (un rol o un #hex) o null = el rol por defecto.
export const asignado = (data, sec, slot) => {
    const v = estiloPdfDe(data)?.assign?.[sec]?.[slot]
    return ROLES.includes(v) || esHex(v) ? v : null
}

// El color que se ve en un slot.
// El color que se ve en un slot (para Auto, la mezcla de siempre).
export const colorDe = (data, sec, slot, pro = true) => {
    const pal = paletaDe(data)
    const v = asignado(data, sec, slot) ?? rolPorDefecto(sec, slot, pro)
    if (v) return pal[v] ?? v
    const texto = colorDe(data, sec, 'texto', pro)
    const fondo = colorDe(data, sec, 'fondo', pro)
    if (slot === 'burbuja') return mezcla(texto, fondo, 0.07)
    if (slot === 'tarjetas') return mezcla('#FFFFFF', fondo, 0.6)
    return texto
}

export const formaDe = (data) => (FORMAS.includes(estiloPdfDe(data)?.shape) ? estiloPdfDe(data).shape : 'auto')
export const sombraDe = (data) => (SOMBRAS.includes(estiloPdfDe(data)?.shadow) ? estiloPdfDe(data).shadow : 'auto')
export const sombraSeccion = (data, sec) => {
    const v = estiloPdfDe(data)?.secShadow?.[sec]
    return SOMBRAS.includes(v) ? v : null
}
export const estiloBotonDe = (data) => (ESTILOS_BOTON.includes(estiloPdfDe(data)?.btnStyle) ? estiloPdfDe(data).btnStyle : 'auto')

// "N a mano" de una sección (handoff): sus cambios + su sombra propia.
export const aManoEn = (data, sec) =>
    Object.values(estiloPdfDe(data)?.assign?.[sec] ?? {}).filter((v) => ROLES.includes(v) || esHex(v)).length + (sombraSeccion(data, sec) ? 1 : 0)

// ── bs() del handoff (vista previa de los estilos de botón) ──
// El texto / íconos siempre son `txt` (lo que dice el panel), también en
// Contorno, Frost y Liquid (igual que events).
export const pintarBoton = (estilo, base, txt, sombra) => {
    const tinta = txt
    switch (estilo) {
        // Auto = el vidrio de siempre.
        case 'auto': return { background: rgba(base, 0.62), border: '1px solid rgba(255,255,255,.5)', boxShadow: '0 8px 32px rgba(0,0,0,.14), 0 2px 8px rgba(0,0,0,.08), inset 0 1.5px 0 rgba(255,255,255,.65)', backdropFilter: 'blur(28px) saturate(200%)', color: txt }
        case 'contorno': return { background: 'transparent', border: `2px solid ${base}`, boxShadow: 'none', backdropFilter: 'none', color: tinta }
        case 'frost': return { background: rgba(base, 0.38), border: '1px solid rgba(255,255,255,.28)', boxShadow: sombra, backdropFilter: 'blur(16px) saturate(1.3)', color: tinta }
        case 'liquid': return {
            background: `linear-gradient(180deg,rgba(255,255,255,.34),rgba(255,255,255,.04) 55%,rgba(255,255,255,.12)),${rgba(base, 0.22)}`,
            border: '1px solid rgba(255,255,255,.55)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,.8), inset 0 -2px 4px rgba(0,0,0,.14), 0 10px 26px rgba(0,0,0,.22)',
            backdropFilter: 'blur(6px) saturate(1.9)', color: tinta,
        }
        case 'sticker': return { background: base, border: '3px solid #FFFFFF', boxShadow: '3px 4px 0 rgba(0,0,0,.35)', backdropFilter: 'none', color: txt }
        case 'relieve': return {
            background: `linear-gradient(180deg,rgba(255,255,255,.18),rgba(0,0,0,.08)),${base}`, border: '0px solid transparent',
            boxShadow: 'inset 0 2px 0 rgba(255,255,255,.35), inset 0 -3px 0 rgba(0,0,0,.25), 0 4px 10px rgba(0,0,0,.22)', backdropFilter: 'none', color: txt,
        }
        default: return { background: base, border: '0px solid transparent', boxShadow: sombra, backdropFilter: 'none', color: txt }
    }
}

// ── Cambios ──
const conEstilo = (prev, fn) => {
    const e = { ...(prev?.estiloPdf ?? {}) }
    fn(e)
    return { ...prev, estiloPdf: e }
}
const conjunto = (e, llave, id, valor) => {
    const g = { ...(e[llave] ?? {}) }
    if (valor == null) delete g[id]
    else g[id] = valor
    if (Object.keys(g).length) e[llave] = g
    else delete e[llave]
}


// La paleta de la personalización va completa: cambiar 1 de los 4 roles
// guarda los 4 (los que se veían), así ya no se mueven con la de Diseño.
export const parcheRol = (prev, rol, hex) => conEstilo(prev, (e) => { e.palette = { ...paletaDe(prev), [rol]: hex } })

// ¿La personalización tiene su propia paleta (o sigue a la de Diseño)?
export const tienePaletaPropia = (data) => ROLES.some((r) => esHex(estiloPdfDe(data)?.palette?.[r]))
// ¿Hay algo configurado en la personalización avanzada? (`{}` = recién abierta, nada que cuidar)
export const tieneAvanzado = (data) => Object.keys(estiloPdfDe(data) ?? {}).length > 0
// Cambiar la paleta de Diseño con personalización avanzada (DesignPanel pregunta):
// "no la afecte" = su paleta se congela tal como se ve; "sí" = vuelve a seguir a Diseño.
export const congelarPaleta = (prev) => (estiloPdfDe(prev) ? conEstilo(prev, (e) => { e.palette = paletaDe(prev) }) : prev)
export const seguirPaleta = (prev) => (estiloPdfDe(prev) ? conEstilo(prev, (e) => { delete e.palette }) : prev)

// Elegir el rol por defecto borra el cambio.
export const parcheSlot = (prev, sec, slot, valor, pro = true) => conEstilo(prev, (e) => {
    const a = { ...(e.assign ?? {}) }
    const g = { ...(a[sec] ?? {}) }
    if (valor == null || valor === rolPorDefecto(sec, slot, pro)) delete g[slot]
    else g[slot] = valor
    if (Object.keys(g).length) a[sec] = g
    else delete a[sec]
    if (Object.keys(a).length) e.assign = a
    else delete e.assign
})

export const parcheForma = (prev, forma) => conEstilo(prev, (e) => { if (FORMAS.includes(forma)) e.shape = forma; else delete e.shape })
export const parcheSombra = (prev, sombra) => conEstilo(prev, (e) => { if (SOMBRAS.includes(sombra)) e.shadow = sombra; else delete e.shadow })
export const parcheSombraSeccion = (prev, sec, sombra) => conEstilo(prev, (e) => conjunto(e, 'secShadow', sec, SOMBRAS.includes(sombra) ? sombra : null))
export const parcheEstiloBoton = (prev, estilo) => conEstilo(prev, (e) => { if (estilo && estilo !== 'auto' && ESTILOS_BOTON.includes(estilo)) e.btnStyle = estilo; else delete e.btnStyle })

// "Configurar automático": todo como siempre (quita `estiloPdf`).
export const volverAPaleta = (prev) => {
    const { estiloPdf: _quitado, ...resto } = prev ?? {}
    return resto
}

// Objetivo del selector de color del panel lateral (usePanelColor):
// 'palette.<rol>' (un rol de la paleta) o '<sección>.<slot>' (Otro = un #hex).
export const objetivoColor = ({ ruta, invitation, setInvitation, setSaved, label, cerrar }) => {
    const [a, b] = ruta.split('.')
    const esRol = a === 'palette'
    const actual = esRol ? paletaDe(invitation)[b] : colorDe(invitation, a, b)
    const poner = (hex, o) => {
        setInvitation((prev) => (esRol ? parcheRol(prev, b, hex) : parcheSlot(prev, a, b, hex)), { snapshot: o?.snapshot !== false })
        setSaved(false)
    }
    // Un color tocado de una vez (no un arrastre) cierra el selector y
    // regresa a Diseño donde estaba.
    return { label, value: actual, allowNone: false, onPick: (c, o) => { poner(c.slice(0, 7), o); if (o?.elegido) cerrar?.() } }
}

// Muestrario del centro del editor (MuestrarioCanvas.jsx): un solo cuadro con
// el dock / la confirmación. Mismas medidas que iattend-events
// MuestrarioPdf.tsx (MUESTRARIO_MEDIDAS); si cambian, las dos.
const M = { w: 390, h: 760, pad: 40 }
export const tamMuestrario = () => ({ w: M.w + M.pad * 2, h: M.h + M.pad * 2 })
