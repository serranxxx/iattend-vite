import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PinCodeInput } from '../../components/PinCodeInput/PinCodeInput'
import { loginVendedor } from './salesApi'
import styles from './VendorLogin.module.css'

export const VendorLogin = ({ onLogin }) => {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleComplete = async (codigo_acceso) => {
        setError('')
        setLoading(true)

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
        <main className={styles.wrapper}>
            <img className={styles.logo} src="/images/logo_cover.png" alt="I attend" />
            <h1 className={styles.title}>{t('sales.login.portal')}</h1>
            <p className={styles.subtitle}>{t('sales.login.subtitle')}</p>

            <div className={styles.pinRow}>
                <PinCodeInput onComplete={handleComplete} disabled={loading} variant="dark" ariaLabel={t('sales.login.subtitle')} />
            </div>

            <p className={styles.status} role="status" aria-live="polite">
                {error
                    ? <span className={styles.error}>{error}</span>
                    : loading ? t('sales.login.checking') : t('sales.login.stays_open')}
            </p>
        </main>
    )
}
