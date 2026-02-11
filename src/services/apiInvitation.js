

export async function getAllInvitations(operation) {
    // const token = localStorage.getItem("token");
    try {
        await operation({
            method: "GET",
            url: `/inv`,
            // headers: {
            //     accept: "*/*",
            //     token: token
            // },
        })

    } catch (error) {
        console.error(error)
    }
}

export async function getAllUserInvitations(operation, userID) {
    const token = localStorage.getItem("token");
    try {
        await operation({
            method: "GET",
            url: `/inv/user/${userID}`,
            headers: {
                accept: "*/*",
                token: token
            },
        })

    } catch (error) {
        console.error(error)
    }
}


export async function newInvitation(operation, invitation) {
    const token = localStorage.getItem("token");
    try {
        await operation({
            method: "POST",
            url: `/inv`,
            headers: {
                accept: "*/*",
                token: token
            },
            data: invitation
        })

    } catch (error) {
        console.error(error)
    }
}


export async function createGuests(operation, guests) {
    const token = localStorage.getItem("token");
    try {
        await operation({
            method: "POST",
            url: `/guests/`,
            headers: {
                accept: "*/*",
                token: token
            },
            data: guests
        })

    } catch (error) {
        console.error(error)
    }
}

export async function getAllDominios(operation, label) {
    const token = localStorage.getItem("token");
    try {
        await operation({
            method: "POST",
            url: `/inv/dominios`,
            headers: {
                accept: "*/*",
                token: token
            },
            data: {
                label: label
            }
        })

    } catch (error) {
        console.error(error)
    }
}




