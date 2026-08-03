import { useState } from 'react'
import { Modal, Select, Button, Checkbox } from 'antd'

export const AsignarVendedorModal = ({ open, vendedores, onCancel, onConfirm }) => {
    const [vendedorId, setVendedorId] = useState(null)
    const [notificar, setNotificar] = useState(true)
    const [loading, setLoading] = useState(false)

    const handleOk = async () => {
        if (!vendedorId) return
        setLoading(true)
        try {
            await onConfirm(vendedorId, notificar)
        } finally {
            setLoading(false)
            setVendedorId(null)
            setNotificar(true)
        }
    }

    const handleCancel = () => {
        setVendedorId(null)
        setNotificar(true)
        onCancel()
    }

    return (
        <Modal
            open={open}
            title="Asignar vendedor"
            onCancel={handleCancel}
            footer={[
                <Button key="cancel" onClick={handleCancel}>Cancelar</Button>,
                <Button key="ok" type="primary" loading={loading} disabled={!vendedorId} onClick={handleOk} className="primarybutton--active">
                    Asignar
                </Button>,
            ]}
        >
            <Select
                style={{ width: '100%' }}
                placeholder="Selecciona un vendedor"
                value={vendedorId}
                onChange={setVendedorId}
                options={(vendedores || []).map(v => ({ label: v.nombre, value: v.id }))}
            />
            <Checkbox
                checked={notificar}
                onChange={(e) => setNotificar(e.target.checked)}
                style={{ marginTop: 12 }}
            >
                Notificar al vendedor por correo
            </Checkbox>
        </Modal>
    )
}
