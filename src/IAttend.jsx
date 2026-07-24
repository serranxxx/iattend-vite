import React from 'react'
import { AppRouter } from './router/AppRouter'
import { AppProvider } from './context/AuthProvider'
import { AntdProvider } from './context/AntdProvider'
import { LiaProvider } from './context/LiaContext'
import { TexturesProvider } from './context/TexturesContext'

export const IAttend = () => {
    return (
        <LiaProvider>
            <AppProvider>
                <AntdProvider>
                    <TexturesProvider>
                        <AppRouter />
                    </TexturesProvider>
                </AntdProvider>
            </AppProvider>
        </LiaProvider>
    )
}


