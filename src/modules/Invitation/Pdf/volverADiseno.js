// "Volver al diseño de I attend" (barra del PDF y panel Mi PDF): solo cambia
// `formato`; el PDF y el diseño se quedan guardados en `data`.
import { Modal } from 'antd'

export const confirmarVolverADiseno = (setInvitation, setSaved) => {
    Modal.confirm({
        title: '¿Volver al diseño de I attend?',
        content: 'Tus invitados verán la invitación diseñada en I attend en lugar del PDF (después de publicar). El PDF se queda guardado por si regresas.',
        okText: 'Volver al diseño',
        cancelText: 'Cancelar',
        onOk: () => {
            setInvitation((prev) => ({ ...prev, formato: 'iattend' }))
            setSaved(false)
        },
    })
}
