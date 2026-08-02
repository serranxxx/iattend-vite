/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useRef, useState } from 'react'

const LiaContext = createContext(null)

export const LiaProvider = ({ children }) => {
    const [uiAction, setUiActionRaw] = useState(null)
    const [notifications, setNotifications] = useState([])
    const [creditState, setCreditStateRaw] = useState(null)
    const [creditAmount, setCreditAmount] = useState(1)
    const [creditSendingLabel, setCreditSendingLabel] = useState(null)
    const timersRef = useRef({})
    const creditTimerRef = useRef(null)

    const setUiAction = useCallback((action) => {
        setUiActionRaw({ ...action, _ts: Date.now() })
    }, [])

    const clearUiAction = useCallback(() => {
        setUiActionRaw(null)
    }, [])

    const dismissNotif = useCallback((id) => {
        clearTimeout(timersRef.current[id])
        delete timersRef.current[id]
        setNotifications(prev => prev.filter(n => n.id !== id))
    }, [])

    const notify = useCallback((notif) => {
        const id = Date.now() + Math.random()
        setNotifications(prev => [...prev, { type: 'info', ...notif, id }])
        timersRef.current[id] = setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id))
            delete timersRef.current[id]
        }, 6000)
    }, [])

    const dismissAll = useCallback(() => {
        Object.values(timersRef.current).forEach(clearTimeout)
        timersRef.current = {}
        setNotifications([])
    }, [])

    const setCreditSending = useCallback((label = null) => {
        clearTimeout(creditTimerRef.current)
        setCreditSendingLabel(label)
        setCreditStateRaw('sending')
    }, [])

    const setCreditSuccess = useCallback((amount = 1) => {
        clearTimeout(creditTimerRef.current)
        setCreditAmount(amount)
        setCreditStateRaw('bubble')
        creditTimerRef.current = setTimeout(() => setCreditStateRaw(null), 1800)
    }, [])

    const clearCreditState = useCallback(() => {
        clearTimeout(creditTimerRef.current)
        setCreditStateRaw(null)
    }, [])

    return (
        <LiaContext.Provider value={{ uiAction, setUiAction, clearUiAction, notifications, notify, dismissNotif, dismissAll, creditState, creditAmount, creditSendingLabel, setCreditSending, setCreditSuccess, clearCreditState }}>
            {children}
        </LiaContext.Provider>
    )
}

export const useLia = () => {
    const ctx = useContext(LiaContext)
    if (!ctx) throw new Error('useLia must be used inside LiaProvider')
    return ctx
}
