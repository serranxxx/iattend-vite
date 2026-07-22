import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PinCodeInput } from '../../components/PinCodeInput/PinCodeInput'
import { loginVendedor } from './salesApi'
import styles from './VendorLogin.module.css'

export const VendorLogin = ({ onLogin }) => {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleComplete = async (codigoSinGuion) => {
        setError('')
        setLoading(true)

        const codigo_acceso = `${codigoSinGuion.slice(0, 3)}-${codigoSinGuion.slice(3)}`

        try {
            const { data } = await loginVendedor(codigo_acceso)
            onLogin({ token: data.token, vendedor: data.vendedor })
        } catch {
            setError(t('sales.login.error_invalid'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.card}>
                <div className={styles.brand}>{t('sales.login.title')}</div>
                <div className={styles.subtitle}>{t('sales.login.subtitle')}</div>

                <div className={styles.pinRow}>
                    <PinCodeInput onComplete={handleComplete} disabled={loading} />
                </div>

                {error && <div className={styles.error}>{error}</div>}
                {loading && <div className={styles.loading}>{t('sales.login.checking')}</div>}
            </div>
        </div>
    )
}
