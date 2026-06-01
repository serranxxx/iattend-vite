/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState } from 'react'

const LumaContext = createContext(null)

export const LumaProvider = ({ children }) => {
    const [uiAction, setUiActionRaw] = useState(null)

    const setUiAction = useCallback((action) => {
        setUiActionRaw({ ...action, _ts: Date.now() })
    }, [])

    const clearUiAction = useCallback(() => {
        setUiActionRaw(null)
    }, [])

    return (
        <LumaContext.Provider value={{ uiAction, setUiAction, clearUiAction }}>
            {children}
        </LumaContext.Provider>
    )
}

export const useLuma = () => {
    const ctx = useContext(LumaContext)
    if (!ctx) throw new Error('useLuma must be used inside LumaProvider')
    return ctx
}
