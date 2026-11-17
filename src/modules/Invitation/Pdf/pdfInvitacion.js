/*
  Reglas de la invitación en PDF (`invitations.data.formato === 'pdf'`).
  Gemela: iattend-events/src/helpers/pdfInvitacion.ts. Ver docs/invitacion-pdf.md.

  data.formato = 'pdf'            → la pieza (editor y página del invitado) es el PDF.
  data.pdf = {
    pages: [{ url, w, h, pagina }], // imágenes (una página larga va en tramos)
    paginas, source, fileName, uploadedAt,
  }
  Lo demás es lo de siempre y se edita con el riel de siempre: colores,
  tipografías y textura (Diseño), pase (Pase digital)… El resto de `data` (el
  diseño de I attend) no se toca: volver a él no pierde nada.
*/

export const esPdf = (data) => data?.formato === 'pdf'

// Sección "pdf" de la pieza: la única capa en modo PDF.
export const SECCION_PDF = 'pdf'

export const parchePdf = (prev, cambios) => ({
    ...prev,
    pdf: { ...(prev?.pdf ?? {}), ...cambios },
})
