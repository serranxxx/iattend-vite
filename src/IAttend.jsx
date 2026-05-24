import React from 'react'
import { AppRouter } from './router/AppRouter'
import { AppProvider } from './context/AuthProvider'
import { AntdProvider } from './context/AntdProvider'
import { LumaProvider } from './context/LumaContext'

export const IAttend = () => {
    return (
        <LumaProvider>
            <AppProvider>
                <AntdProvider>
                    <AppRouter />
                </AntdProvider>
            </AppProvider>
        </LumaProvider>
    )
}


