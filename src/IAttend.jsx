import React from 'react'
import { AppRouter } from './router/AppRouter'
import { AppProvider } from './context/AuthProvider'
import { AntdProvider } from './context/AntdProvider'
import { LiaProvider } from './context/LiaContext'
import { TexturesProvider } from './context/TexturesContext'
import { FontsProvider } from './context/FontsContext'

export const IAttend = () => {
    return (
        <LiaProvider>
            <AppProvider>
                <AntdProvider>
                    <TexturesProvider>
                        <FontsProvider>
                            <AppRouter />
                        </FontsProvider>
                    </TexturesProvider>
                </AntdProvider>
            </AppProvider>
        </LiaProvider>
    )
}


