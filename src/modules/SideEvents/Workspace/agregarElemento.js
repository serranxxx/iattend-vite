import { stickerLigeroDesdeUrl } from '../../../helpers/services/uploadImage'
import { cabeElemento, esImagen, MAX_ELEMENTOS, MAX_STICKERS, nuevoElemento } from '../stickersPopData'

/*
  Agrega un elemento de los paneles (Elementos, Fotos, Subidos) a la pieza
  de un side event / Pop: lo usan el editor de escritorio (SideWorkspace, al
  soltarlo en la pieza) y el del celular (EditorMovil, al tocarlo en el
  drawer). Un PNG se guarda aligerado (WebP) en la carpeta del evento.
  `punto`: { x, y } en % del lienzo de los PNG. Si ya no cabe, llama
  `onLleno(max)` y regresa null; si no, regresa el elemento nuevo.
*/
export const agregarElemento = async ({ item, punto, stickers, carpeta, onChange, onLleno }) => {
    const imagen = esImagen(item)
    if (!cabeElemento(stickers, imagen)) {
        onLleno?.(imagen ? MAX_STICKERS : MAX_ELEMENTOS)
        return null
    }
    const extra = imagen ? { kind: undefined, url: await stickerLigeroDesdeUrl(item.url, carpeta) } : {}
    const nuevo = nuevoElemento({ ...item, ...extra, ...(punto ?? {}) })
    onChange((prev) => ({
        ...prev,
        body: { ...prev.body, stickers: [...(Array.isArray(prev.body?.stickers) ? prev.body.stickers : []), nuevo] },
    }))
    return nuevo
}
