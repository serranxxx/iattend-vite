import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LoginPops } from './LoginPops'

// Solo en desarrollo (`/login-pops-preview`, `?mode=register` para Crear
// cuenta): el login de Pops sin cerrar la sesión que ya está abierta.
export const LoginPopsPreview = () => {
    const [params, setParams] = useSearchParams()
    const [v, setV] = useState({ nombre: '', correo: '', contrasena: '' })
    return (
        <LoginPops
            registro={params.get('mode') === 'register'}
            nombre={v.nombre}
            correo={v.correo}
            contrasena={v.contrasena}
            onNombre={(nombre) => setV(x => ({ ...x, nombre }))}
            onCorreo={(correo) => setV(x => ({ ...x, correo }))}
            onContrasena={(contrasena) => setV(x => ({ ...x, contrasena }))}
            onEntrar={() => {}}
            onCrear={() => {}}
            onGoogle={() => {}}
            onApple={() => {}}
            onCambiarModo={(registro) => setParams(registro ? { mode: 'register' } : {})}
            error={params.get('error') ? 'Correo o contraseña incorrectos.' : null}
        />
    )
}

export default LoginPopsPreview
