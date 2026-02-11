import React from 'react'
import { AppRouter } from './router/AppRouter'
import { AppProvider } from './context/AuthProvider'
import { AntdProvider } from './context/AntdProvider'

export const IAttend = () => {
    return (
        <AppProvider>
            <AntdProvider>
                <AppRouter />
            </AntdProvider>
        </AppProvider>
    )
}


