import { useState } from 'react'
import { RequireVendorSession } from './RequireVendorSession'
import { VendorPanel } from './VendorPanel'
import { VendorNewSale } from './VendorNewSale'
import { VendorPayment } from './VendorPayment'

const SalesViews = () => {
    const [view, setView] = useState({ name: 'panel' })

    if (view.name === 'nueva-venta') {
        return (
            <VendorNewSale
                onCancel={() => setView({ name: 'panel' })}
                onCreated={(venta) => setView({ name: 'cobro', venta })}
            />
        )
    }

    if (view.name === 'cobro') {
        return (
            <VendorPayment
                venta={view.venta}
                onDone={() => setView({ name: 'panel' })}
            />
        )
    }

    return (
        <VendorPanel
            onNewSale={() => setView({ name: 'nueva-venta' })}
            onOpenCobro={(venta) => setView({ name: 'cobro', venta })}
        />
    )
}

export const SalesApp = () => (
    <RequireVendorSession>
        <SalesViews />
    </RequireVendorSession>
)
