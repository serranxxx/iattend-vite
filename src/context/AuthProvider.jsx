import { appContext } from "./AuthContext"
import { authReducer } from "./authReducer"
import { types } from "./types"
import { useReducer } from "react"

const init = () => {

    const isLogged = localStorage.getItem("logged")

    return {
        logged: isLogged ? true : false,
        user: JSON.parse(localStorage.getItem('user')),
        date: new Date(),
        // position: 'home'
        // user: (localStorage.getItem('user')),
    }
}

export const AppProvider = ({ children }) => {

    const [authState, dispatch] = useReducer(authReducer, {}, init)
    // const navigate = useNavigate()

    const login = (newUser = {}) => {

        const action = {
            type: types.LOGIN,
            payload: newUser
        }

        localStorage.setItem(
            "session",
            JSON.stringify({
              logged: true,
              user: newUser
            })
          );
          

        dispatch(action)

    }

    const logout = () => {

        const action = {
            type: types.LOGOUT,

        }
        localStorage.clear();
        dispatch(action)
    }

    const set_invitation_id = (invitaion_id = null) => {

        const action = {
            type: types.userID,
            payload: invitaion_id
        }
        dispatch(action)
    }





    return (
        <appContext.Provider value={{
            ...authState,
            login,
            logout,
            set_invitation_id

        }}>
            {children}
        </appContext.Provider>

    )
}
