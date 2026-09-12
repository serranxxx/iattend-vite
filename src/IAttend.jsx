import React from 'react'
import { AppRouter } from './router/AppRouter'
import { AppProvider } from './context/AuthProvider'
import { AntdProvider } from './context/AntdProvider'
import { LiaProvider } from './context/LiaContext'
import { TexturesProvider } from './context/TexturesContext'
import { FontsProvider } from './context/FontsContext'
import { SessionBridge } from './context/SessionBridge'

export const IAttend = () => {
    return (
        <LiaProvider>
            <AppProvider>
                {/* Completa la cuenta al volver de Google/Apple */}
                <SessionBridge />
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


