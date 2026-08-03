
import { Navigate } from 'react-router-dom'

const ALLOWED_ROLES = ['Administration', 'sales']

export const RequireSalesOrAdmin = ({ children }) => {

    const session = JSON.parse(localStorage.getItem("session"));

    if (session?.logged) {
        if (session?.user) {
            return ALLOWED_ROLES.includes(session.user?.role)
                ? children
                : <Navigate to="/" />
        } else {
            return <Navigate to="/" />
        }
    } else {
        return <Navigate to="/" />
    }

}
