/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState } from 'react'

const LiaContext = createContext(null)

export const LiaProvider = ({ children }) => {
    const [uiAction, setUiActionRaw] = useState(null)

    const setUiAction = useCallback((action) => {
        setUiActionRaw({ ...action, _ts: Date.now() })
    }, [])

    const clearUiAction = useCallback(() => {
        setUiActionRaw(null)
    }, [])

    return (
        <LiaContext.Provider value={{ uiAction, setUiAction, clearUiAction }}>
            {children}
        </LiaContext.Provider>
    )
}

export const useLia = () => {
    const ctx = useContext(LiaContext)
    if (!ctx) throw new Error('useLia must be used inside LiaProvider')
    return ctx
}
