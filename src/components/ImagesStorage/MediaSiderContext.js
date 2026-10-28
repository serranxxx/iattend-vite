import { createContext } from 'react'

// Banco de imágenes y videos en el riel del editor de escritorio
// (EditorWorkspace). Si hay provider, StorageImages no abre su dropdown: le
// pide al editor que muestre el panel "Imágenes" con su pedido
// ({ type, mediaType, isNull, handleImage, … }) y lo elegido se aplica ahí.
export const MediaSiderContext = createContext(null)
