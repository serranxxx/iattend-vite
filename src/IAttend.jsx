import React from 'react'
import { AppRouter } from './router/AppRouter'
import { AppProvider } from './context/AuthProvider'
import { AntdProvider } from './context/AntdProvider'
import { LiaProvider } from './context/LiaContext'

export const IAttend = () => {
    return (
        <LiaProvider>
            <AppProvider>
                <AntdProvider>
                    <AppRouter />
                </AntdProvider>
            </AppProvider>
        </LiaProvider>
    )
}


