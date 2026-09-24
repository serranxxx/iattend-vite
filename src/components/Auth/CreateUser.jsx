
import { Button, Input, Select, message } from "antd";
import { LuPlus } from "react-icons/lu";
import axios from "axios";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

// `value` es lo que se guarda en profiles.role; '' = cliente (sin rol).
// "Admin" se guarda como 'Administration' porque es lo que revisan AdminHOC
// y el backend.
const ROLE_OPTIONS = [
    { value: '', label: 'Cliente (sin rol)' },
    { value: 'Administration', label: 'Admin' },
    { value: 'sales', label: 'Sales' },
    { value: 'planner', label: 'Planner' },
    { value: 'mkt', label: 'Mkt' },
    { value: 'test', label: 'Test' },
]

export const CreateAccount = ({ refreshData, setVisible, setUserData }) => {


    const [newName, setNewName] = useState(null)
    const [newUsername, setNewUsername] = useState(null)
    const [newPassword, setNewPassword] = useState(null)
    const [newRole, setNewRole] = useState('')
    const [messageApi, contextHolder] = message.useMessage();

    const handleCreate = async () => {

        try {

            // 1️⃣ Validaciones básicas
            if (!newName || !newUsername || !newPassword) {
                return messageApi.error('Todos los campos son obligatorios')
            }

            // Validación simple de email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(newUsername)) {
                return messageApi.error('Email inválido')
            }

            // Validar password mínima
            if (newPassword.length < 6) {
                return messageApi.error('La contraseña debe tener mínimo 6 caracteres')
            }

            // 2️⃣ Petición al backend. Asignar un rol exige sesión de admin: el
            // backend lo valida con este token.
            const { data: { session } } = await supabase.auth.getSession()
            const headers = session?.access_token
                ? { Authorization: `Bearer ${session.access_token}` }
                : {}

            const { data } = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/auth/create-user`,
                // 'http://localhost:4000/api/auth/create-user', // ajusta la ruta si es diferente
                {
                    Name: newName,
                    Email: newUsername,
                    Password: newPassword,
                    Role: newRole || null,
                },
                { headers }
            )

            if (data.ok) {
                messageApi.success('Usuario creado correctamente')
                // console.log(data)

                refreshData()
                setVisible(true)
                setUserData(data.data)

                // Limpiar campos
                setNewName('')
                setNewUsername('')
                setNewPassword('')
                setNewRole('')
            }

        } catch (error) {

            console.log(error);

            if (error.response) {
                // Error que viene del backend
                const backendMessage = error.response.data.msg;

                messageApi.warning(backendMessage || 'Error al crear el usuario');
            } else {
                // Error de red o servidor caído
                messageApi.error('Error de conexión con el servidor');
            }

        }
    }


    return (

        <>
            {contextHolder}
            <div className='create_account_cont'>
                <div className="create_row">
                    <span style={{
                        fontFamily: 'Poppins', fontWeight: '600', fontSize: '16px',
                    }}>Crear nuevo usuario</span>

                    <Button icon={<LuPlus size={16} />} type="primary" onClick={handleCreate}>Crear</Button>
                </div>
                <Input onChange={(e) => setNewName(e.target.value)} value={newName} placeholder='Nombre' />
                <Input onChange={(e) => setNewUsername(e.target.value)} value={newUsername} placeholder='Email' />
                <Input.Password onChange={(e) => setNewPassword(e.target.value)} value={newPassword} placeholder='Contraseña' />
                {/* El menú se dibuja dentro del picker: si se portalea a <body>, el
                    clic en una opción cuenta como "afuera" y cierra el Dropdown. */}
                <Select
                    value={newRole}
                    onChange={setNewRole}
                    options={ROLE_OPTIONS}
                    getPopupContainer={(trigger) => trigger.parentElement}
                    style={{ width: '100%' }}
                />

            </div>

        </>

    )
}
