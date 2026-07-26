import { useState } from 'react'
import { Tabs } from 'antd'
import { SalesAdminPage } from '../SalesAdminPage'
import { ColaboradoresLeads } from './ColaboradoresLeads'

export const VentasSection = () => {
    const [activeKey, setActiveKey] = useState('ventas')

    const items = [
        {
            label: 'Ingresos y comisiones',
            key: 'ventas',
            children: <SalesAdminPage forcedView='ventas' hideToggle />,
        },
        {
            label: 'Vendedores registrados',
            key: 'vendedores',
            children: <SalesAdminPage forcedView='vendedores' hideToggle />,
        },
        {
            label: 'Colaboradores',
            key: 'colaboradores',
            children: <ColaboradoresLeads />,
        },
    ]

    return (
        <Tabs
            style={{ width: '100%' }}
            type='card'
            activeKey={activeKey}
            onChange={setActiveKey}
            items={items}
        />
    )
}
