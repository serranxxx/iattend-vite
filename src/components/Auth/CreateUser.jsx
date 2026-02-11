import { useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { appContext } from "../../context";
import { onNewUser } from "../../services/apiLogin";
import { Button, Input, message } from "antd";
import { tokenExpires } from "../../helpers/assets/functions";
import { RiEye2Line, RiEyeCloseLine } from "react-icons/ri";
import { getAllUserInvitations } from "../../services/apiInvitation";

export const CreateAccount = ({ refreshData, setVisible }) => {

    const { response, operation } = getAllUserInvitations()
    const navigate = useNavigate();
    const { login, } = useContext(appContext)
    const [setCreateAccount] = useState(false)
    const [username, setUsername] = useState(null)
    const [setPassword] = useState(null)

    const [newName, setNewName] = useState(null)
    const [newUsername, setNewUsername] = useState(null)
    const [newPassword, setNewPassword] = useState(null)

    const [seePasswrod, setSeePasswrod] = useState(false)


    const handleCreate = async () => {
        if (newName && newUsername && newPassword) {
            onNewUser(operation, newName, newUsername, newPassword)
        }
        else {
            if (!newName) {
                message.error('Por favor escribe un nombre');
            } else if (!newUsername) {
                message.error('Por favor escribe un correo electrónico');
            } else {
                message.error('Por favor escribe una contraseña');
            }
        }
    }


    useEffect(() => {
        if (response) {
            if (response.data.ok) {
                switch (response.data.msg) {
                    case "User uploaded":
                        message.success('¡Nuevo usuario creado!');
                        setNewName(null);
                        setNewUsername(null);
                        setNewPassword(null);
                        setCreateAccount(false)
                        refreshData()
                        setVisible(false)
                        break;

                    case "Valid user":
                        {
                            localStorage.setItem("user-email", username)
                            setUsername(null)
                            setPassword(null)

                            const token = response.data.data.token
                            localStorage.setItem("token", token)
                            localStorage.setItem("token-expires", tokenExpires())
                            navigate("/invitations")

                            const user = {
                                name: response.data.data.username,
                                uid: response.data.data.uid,
                                role: response.data.data.role
                            }

                            message.success("Sesión iniciada")
                            login(user)
                            break
                        }

                    default:
                        break;
                }


            } else {
                message.error(response.data.msg)
            }

        }
    }, [response])


    return (

        <div className='login-form-container' style={{ width: '100%' }}>
            <Input onChange={(e) => setNewName(e.target.value)} value={newName} placeholder='Nombre' className='gc-input-text login-input' />
            <Input onChange={(e) => setNewUsername(e.target.value)} value={newUsername} placeholder='Email' className='gc-input-text login-input' />
            <div className='password-button-container'>
                <Input type={!seePasswrod ? 'password' : ''} onChange={(e) => setNewPassword(e.target.value)} value={newPassword} placeholder='Contraseña' className='gc-input-text login-input' />
                <Button
                    onClick={() => setSeePasswrod(!seePasswrod)} type='ghost' className='see-password-button'
                    icon={!seePasswrod ? <RiEyeCloseLine size={18} /> : <RiEye2Line size={18} />} />
            </div>
            <Button onClick={handleCreate} className='primarybutton mt'>Crear cuenta</Button>
            {/* <span className={'login-label'}>¿Ya tienes una cuenta? <a onClick={() => setCreateAccount(false)} className={'label-forgot-password'}>Inicia sesión</a></span> */}

        </div>


    )
}
