import { message } from "antd";


export async function onNewUser(operation, Name, Email, Password) {

    const newUser = {
        Name: Name,
        Email: Email,
        Password: Password,
        Invitations: [],
        Role: 'Owner'
    };

    try {
        await operation({
            method: "POST",
            url: "/auth/new-user",
            headers: {
                "Content-Type": "application/json"
            },
            data: newUser // Aquí usamos newUser dinámicamente
        });

    } catch (error) {
        message.error('Es probable que este usuario ya exista')
    }
}

export async function getUSers(operation) {


    try {
        await operation({
            method: "GET",
            url: "/auth/",
        });

    } catch (error) {
        message.error('Es probable que este usuario ya exista')
    }
}



