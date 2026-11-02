import { agrupar, contarImagenes, desagrupar, duplicarStickers, grupoDeSeleccion, MAX_ELEMENTOS, MAX_STICKERS, quitarStickers } from '../stickersPopData'

/*
  Lo que necesita la barra del elemento elegido (ElementBar de la invitación)
  en un side event / Pop: el elemento de referencia, el grupo elegido y las
  acciones (tamaño, giro, ocultar, duplicar, quitar, agrupar / desagrupar;
  varios a la vez). Lo usan el editor de escritorio (SideWorkspace) y el del
  celular (EditorMovil).
*/
export const barraElemento = ({ stickers, stickerSel, setStickers, setStickerSel }) => {
    const grupo = stickers.filter((x) => stickerSel.includes(x.id))
    const actual = stickers.find((x) => x.id === stickerSel.find((id) => grupo.some((g) => g.id === id))) ?? null
    const cambiarGrupo = (fn, o) => setStickers(stickers.map((x) => (stickerSel.includes(x.id) ? { ...x, ...fn(x) } : x)), o)
    const redondear = (v) => Math.round(v * 100) / 100
    const noCabe = stickers.length + grupo.length > MAX_ELEMENTOS || contarImagenes(stickers) + contarImagenes(grupo) > MAX_STICKERS
    const elementGroup = actual && {
        count: grupo.length,
        onScale: (v, o) => {
            const factor = v / (actual.w || 1)
            cambiarGrupo((x) => ({ w: x.id === actual.id ? v : Math.min(200, Math.max(5, redondear(x.w * factor))) }), o)
        },
        onRotate: (v, o) => {
            const delta = v - (actual.rot ?? 0)
            cambiarGrupo((x) => ({ rot: x.id === actual.id ? v : Math.min(180, Math.max(-180, (x.rot ?? 0) + delta)) }), o)
        },
        hidden: grupo.every((x) => x.hidden),
        onToggleHidden: () => { const oculto = grupo.every((x) => x.hidden); cambiarGrupo(() => ({ hidden: !oculto || undefined })) },
        canDuplicate: !noCabe,
        onDuplicate: () => { const { lista, nuevos } = duplicarStickers(stickers, stickerSel); setStickers(lista); setStickerSel(nuevos) },
        onRemove: () => { setStickers(quitarStickers(stickers, stickerSel)); setStickerSel([]) },
        // Grupos de capas (stickersPopData.js): uno elegido entero → Desagrupar;
        // varios sueltos (o de varios grupos) → Agrupar.
        ...(grupoDeSeleccion(stickers, stickerSel)
            ? { onDesagrupar: () => setStickers(desagrupar(stickers, stickerSel)) }
            : grupo.length > 1 ? { onAgrupar: () => setStickers(agrupar(stickers, stickerSel)) } : {}),
    }
    return { grupo, actual, cambiarGrupo, elementGroup }
}
