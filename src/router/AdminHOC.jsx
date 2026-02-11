
import { Navigate } from 'react-router-dom'

export const AdminHOC = ({ children }) => {

    const session = JSON.parse(localStorage.getItem("session"));

    if (session?.logged) {
        if (session?.user) {
            return (session.user?.role === 'Administration')
                ? children
                : <Navigate to="/" />
        } else {
            return <Navigate to="/" />
        }
    } else {
        return <Navigate to="/" />
    }


}