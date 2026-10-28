import { useTranslation } from 'react-i18next'
import { Select } from 'antd'
import { useGiftBrands } from '../../../../hooks/useGiftBrands'
import styles from './ElementBar.module.css'

// Barra de la tarjeta abierta de la mesa de regalos (gifts.cards[index]),
// arriba de la pieza. Reemplaza en escritorio al selector de empresa que
// vivía en el logo de la tarjeta (BrandPicker de la cartera en
// iattend-events): empresa (catálogo gift_brands, tiendas y bancos) y sus
// datos (tienda: link; banco: titular y cuenta). La tarjeta avisa al abrirse
// ("gift_card:N") y al cerrarse; eliminarla sigue siendo la "×" de la tarjeta.

const Chip = ({ brand }) => (
    <span className={styles.brandChip} style={{ background: brand.background ?? '#F4F3F0' }}>
        {brand.logo_url
            ? <img src={brand.logo_url} alt="" />
            : <span style={{ color: brand.text_color ?? '#29262D' }}>{brand.name.slice(0, 2)}</span>}
    </span>
)

export const GiftCardBar = ({ index, invitation, setInvitation, setSaved }) => {
    const { t } = useTranslation()
    const { stores, banks } = useGiftBrands()
    const card = invitation?.gifts?.cards?.[index]
    if (!card) return null
    const isStore = card.kind !== 'bank'
    const current = isStore ? card.brand : card.bank

    const setCard = (patch) => {
        setInvitation((prev) => ({
            ...prev,
            gifts: { ...prev.gifts, cards: prev.gifts.cards.map((c, i) => (i === index ? { ...c, ...patch } : c)) },
        }))
        setSaved(false)
    }
    const option = (b) => ({
        value: `${b.kind}:${b.name}`,
        label: <span className={styles.brandOption}><Chip brand={b} />{b.name}</span>,
    })

    return (
        <div className={styles.bar} data-edit-keep data-text-bar>
            <Select
                className={styles.brandSelect}
                placeholder={t('build_editor.gift_brand')}
                value={current ? `${card.kind ?? 'store'}:${current}` : undefined}
                popupMatchSelectWidth={240}
                onChange={(v) => {
                    const [kind, ...rest] = v.split(':')
                    const name = rest.join(':')
                    setCard(kind === 'store' ? { kind: 'store', brand: name } : { kind: 'bank', bank: name })
                }}
                options={[
                    ...(stores.length ? [{ label: t('build_editor.gift_stores'), options: stores.map(option) }] : []),
                    ...(banks.length ? [{ label: t('build_editor.gift_banks'), options: banks.map(option) }] : []),
                ]}
            />

            <span className={styles.divider} />

            {isStore ? (
                <input
                    className={styles.addressInput}
                    placeholder={t('build_editor.gift_url')}
                    value={card.url ?? ''}
                    onChange={(e) => setCard({ url: e.target.value })}
                />
            ) : (
                <>
                    <input
                        className={`${styles.addressInput} ${styles.inputHalf}`}
                        placeholder={t('build_editor.gift_holder')}
                        value={card.name ?? ''}
                        onChange={(e) => setCard({ name: e.target.value })}
                    />
                    <input
                        className={`${styles.addressInput} ${styles.inputHalf}`}
                        placeholder={t('build_editor.gift_number')}
                        value={card.number ?? ''}
                        onChange={(e) => setCard({ number: e.target.value })}
                    />
                </>
            )}
        </div>
    )
}
