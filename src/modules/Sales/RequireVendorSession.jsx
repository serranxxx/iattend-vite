import { useState } from 'react'
import { VendorSessionContext } from './VendorSessionContext'
import { VendorLogin } from './VendorLogin'
import { getVendorSession, setVendorSession, clearVendorSession, isVendorSessionValid } from './salesApi'

export const RequireVendorSession = ({ children }) => {
    const [session, setSession] = useState(() => {
        const stored = getVendorSession()
        return isVendorSessionValid(stored) ? stored : null
    })

    const logout = () => {
        clearVendorSession()
        setSession(null)
    }

    if (!session) {
        return (
            <VendorLogin
                onLogin={(newSession) => {
                    setVendorSession(newSession)
                    setSession(newSession)
                }}
            />
        )
    }

    return (
        <VendorSessionContext.Provider value={{ vendedor: session.vendedor, logout }}>
            {children}
        </VendorSessionContext.Provider>
    )
}
