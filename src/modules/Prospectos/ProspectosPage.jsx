import { useEffect, useState } from 'react'
import { message } from 'antd'
import { HeaderBuild } from '../Header/Header'
import { ProspectosBoard } from './ProspectosBoard'
import { fetchProspectos, fetchMisProspectos } from './prospectosApi'
import { fetchAdminVendedores } from '../../pages/Admin/salesAdminApi'
import styles from './ProspectosPage.module.css'

export const ProspectosPage = () => {
    const session = JSON.parse(localStorage.getItem('session'))
    const modo = session?.user?.role === 'Administration' ? 'admin' : 'vendedor'

    const [prospectos, setProspectos] = useState([])
    const [vendedores, setVendedores] = useState([])
    const [loading, setLoading] = useState(true)

    const cargarProspectos = async () => {
        try {
            const { data } = modo === 'admin' ? await fetchProspectos() : await fetchMisProspectos()
            setProspectos(data.prospectos || [])
        } catch (error) {
            console.error('Error cargando prospectos:', error.response?.data || error.message)
            message.error('No se pudieron cargar los prospectos')
        } finally {
            setLoading(false)
        }
    }

    const cargarVendedores = async () => {
        if (modo !== 'admin') return
        try {
            const { data } = await fetchAdminVendedores()
            setVendedores(data.vendedores || [])
        } catch (error) {
            console.error('Error cargando vendedores:', error.response?.data || error.message)
        }
    }

    useEffect(() => {
        cargarProspectos()
        cargarVendedores()
    }, [])

    return (
        <div className={styles.page}>
            <HeaderBuild position="tablero" isVisible={true} alwaysSolid={true} />
            <div className={styles.content}>
                <div className={styles.titleRow}>
                    <span className={styles.title}>Tablero de prospectos</span>
                    <span className={styles.subtitle}>Instagram</span>
                </div>
                {loading
                    ? <div className={styles.loading}>Cargando prospectos...</div>
                    : <ProspectosBoard modo={modo} prospectos={prospectos} setProspectos={setProspectos} vendedores={vendedores} />
                }
            </div>
        </div>
    )
}
