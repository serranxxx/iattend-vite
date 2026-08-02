import { useEffect, useMemo, useState } from 'react'
import { Button, Checkbox, Divider, Dropdown, Input, Popconfirm, Spin, Switch, Tooltip, message } from 'antd'
import { Check, Languages, RefreshCw, Search } from 'lucide-react'
import { fetchDeepLLanguages } from '../../helpers/services/translationApi'
import { POPULAR_LANGUAGES, flagForLanguage } from '../../helpers/services/languageFlags'

const sectionLabelStyle = { fontSize: '12px', opacity: 0.6 }

export const LanguageSelector = ({
    languages = [],
    disabledLanguages = [],
    activeLang,
    onActiveLangChange,
    onAddLanguage,
    onToggleLanguageEnabled,
    onRetranslate,
    translating,
}) => {

    const [open, setOpen] = useState(false)
    const [available, setAvailable] = useState(null)
    const [loadingLanguages, setLoadingLanguages] = useState(false)
    const [search, setSearch] = useState('')
    const [messageApi, contextHolder] = message.useMessage()

    useEffect(() => {
        if (open && available === null) {
            setLoadingLanguages(true)
            fetchDeepLLanguages()
                .then(setAvailable)
                .catch(() => messageApi.error('No se pudo obtener la lista de idiomas de DeepL'))
                .finally(() => setLoadingLanguages(false))
        }
        if (!open) setSearch('')
    }, [open])

    const filteredLanguages = useMemo(() => {
        if (!available) return []
        const query = search.trim().toLowerCase()
        if (!query) return available
        return available.filter((lang) =>
            lang.name.toLowerCase().includes(query) || lang.code.toLowerCase().includes(query)
        )
    }, [available, search])

    const labelForCode = (code) => {
        const popular = POPULAR_LANGUAGES.find((l) => l.code === code)
        if (popular) return popular.label
        return available?.find((l) => l.code === code)?.name ?? code
    }

    const addLanguage = async (code) => {
        if (code === 'es') return
        try {
            await onAddLanguage(code)
        } catch (error) {
            if (error?.code === 'NO_CREDITS') {
                messageApi.error(error.message)
            } else {
                messageApi.error('No se pudo traducir a ese idioma, intenta de nuevo')
            }
        }
    }

    return (
        <>
            {contextHolder}

            <Dropdown
                trigger={['click']}
                placement='bottomLeft'
                arrow
                open={open}
                onOpenChange={setOpen}
                popupRender={() => (
                    <div style={{
                        background: '#fff', borderRadius: '12px', padding: '12px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)', width: '260px',
                        display: 'flex', flexDirection: 'column', gap: '8px'
                    }}>
                        <span style={sectionLabelStyle}>Idiomas activos en la invitación</span>

                        {translating && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px' }}>
                                <Spin size='small' />
                                <span style={{ fontSize: '12px', opacity: 0.6 }}>Traduciendo, un momento…</span>
                            </div>
                        )}

                        <LanguageRow
                            flag={flagForLanguage('es')}
                            label='Español'
                            selected={!activeLang}
                            onClick={() => onActiveLangChange(null)}
                        />
                        {languages.map((code) => {
                            const isDisabled = disabledLanguages.includes(code)
                            return (
                                <LanguageRow
                                    key={code}
                                    flag={flagForLanguage(code)}
                                    label={labelForCode(code)}
                                    selected={activeLang === code}
                                    dimmed={isDisabled}
                                    onClick={() => onActiveLangChange(code)}
                                    extra={
                                        <>
                                            {activeLang === code && (
                                                <Popconfirm
                                                    title='Al volver a traducir vas a perder todos tus cambios manuales'
                                                    okText='Aceptar'
                                                    cancelText='Cancelar'
                                                    onConfirm={() => onRetranslate(code)}
                                                >
                                                    <Tooltip title='Volver a traducir'>
                                                        <Button
                                                            size='small'
                                                            type='text'
                                                            loading={translating}
                                                            icon={<RefreshCw size={13} />}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </Tooltip>
                                                </Popconfirm>
                                            )}
                                            <Tooltip title={isDisabled ? 'Habilitar para el invitado' : 'Deshabilitar para el invitado'}>
                                                <Switch
                                                    size='small'
                                                    checked={!isDisabled}
                                                    onClick={(checked, e) => e.stopPropagation()}
                                                    onChange={() => onToggleLanguageEnabled(code)}
                                                />
                                            </Tooltip>
                                        </>
                                    }
                                />
                            )
                        })}

                        <Divider style={{ margin: '4px 0' }} />

                        <span style={sectionLabelStyle}>Idiomas</span>
                        <span style={{ fontSize: '11px', opacity: 0.5 }}>
                            {languages.length === 0
                                ? 'El primer idioma extra es gratis'
                                : 'Cada idioma adicional cuesta 100 créditos'}
                        </span>

                        <Input
                            size='small'
                            allowClear
                            placeholder='Buscar idioma'
                            prefix={<Search size={14} style={{ opacity: 0.5 }} />}
                            style={{ borderRadius: '99px' }}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        {loadingLanguages && <Spin size='small' />}

                        <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {!search && POPULAR_LANGUAGES.map((lang) => (
                                lang.code === 'es' ? (
                                    <Checkbox key={lang.code} checked disabled>
                                        <span style={{ marginRight: '6px' }}>{flagForLanguage(lang.code)}</span>
                                        {lang.label}
                                    </Checkbox>
                                ) : (
                                    <LanguageAddCheckbox
                                        key={lang.code}
                                        code={lang.code}
                                        label={<><span style={{ marginRight: '6px' }}>{flagForLanguage(lang.code)}</span>{lang.label}</>}
                                        checked={languages.includes(lang.code)}
                                        disabled={translating}
                                        isFirstFree={languages.length === 0}
                                        onConfirmAdd={addLanguage}
                                    />
                                )
                            ))}

                            {search && available && filteredLanguages.length === 0 && (
                                <span style={{ fontSize: '12px', opacity: 0.5 }}>Sin resultados</span>
                            )}
                            {search && filteredLanguages.map((lang) => (
                                <LanguageAddCheckbox
                                    key={lang.code}
                                    code={lang.code}
                                    label={<><span style={{ marginRight: '6px' }}>{flagForLanguage(lang.code)}</span>{lang.name}</>}
                                    checked={languages.includes(lang.code)}
                                    disabled={translating}
                                    isFirstFree={languages.length === 0}
                                    onConfirmAdd={addLanguage}
                                />
                            ))}
                        </div>
                    </div>
                )}
            >
                <Button
                    className={activeLang ? 'primarybutton--active' : 'full-screen-button'}
                    icon={<Languages size={16} style={{ marginTop: '2px' }} />}
                />
            </Dropdown>
        </>
    )
}

// Renglón de "agregar idioma" con confirmación previa: si sería el primer
// idioma extra, solo avisa que es gratis; si no, pide confirmar el costo de
// 100 créditos antes de disparar la traducción. Un idioma ya instalado ya se
// cobró, así que este renglón se vuelve informativo y no-clickeable — para
// quitarlo de la vista del invitado se usa el switch de la lista de arriba,
// no se puede "desmarcar" aquí.
// Nota: aquí NO se usa <Checkbox> nativo — envolverlo en Popconfirm le
// rompía el toggle (el click se quedaba atrapado por el popover en vez de
// llegar al input). Por eso es un div clickeable, igual que LanguageRow.
const LanguageAddCheckbox = ({ code, label, checked, disabled, isFirstFree, onConfirmAdd }) => {
    const boxStyle = {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 6px', borderRadius: '8px',
        cursor: (disabled || checked) ? 'default' : 'pointer',
        opacity: (disabled || checked) ? 0.5 : 1,
    }

    const checkbox = (
        <span style={{
            width: '14px', height: '14px', borderRadius: '3px', border: '1px solid currentColor',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6,
        }}>
            {checked && <Check size={11} />}
        </span>
    )

    if (checked) {
        return (
            <div style={boxStyle}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{checkbox}{label}</span>
            </div>
        )
    }

    return (
        <Popconfirm
            title={isFirstFree
                ? '¡Buenas noticias! Tu primer idioma extra va por nuestra cuenta 🎉'
                : 'Agregar este idioma cuesta 100 créditos ✨'}
            description={isFirstFree
                ? 'A partir del segundo, cada idioma extra cuesta 100 créditos.'
                : '¿Le damos para adelante?'}
            okText={isFirstFree ? '¡Agregarlo!' : 'Sí, agregar'}
            cancelText={isFirstFree ? 'Ahora no' : 'Cancelar'}
            disabled={disabled}
            onConfirm={() => onConfirmAdd(code)}
        >
            <div style={boxStyle}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{checkbox}{label}</span>
            </div>
        </Popconfirm>
    )
}

const LanguageRow = ({ flag, label, selected, dimmed, onClick, extra }) => (
    <div
        onClick={onClick}
        style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '4px 6px', borderRadius: '8px', cursor: 'pointer',
            backgroundColor: selected ? 'rgba(0,0,0,0.05)' : 'transparent',
            opacity: dimmed ? 0.5 : 1,
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <span>{flag}</span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {extra}
            {selected && <Check size={14} style={{ opacity: 0.6 }} />}
        </div>
    </div>
)
