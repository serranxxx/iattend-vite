import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { Button, Table, Input, Select, Space, Tooltip, Tag, message, Steps } from 'antd'
import { LuUpload } from 'react-icons/lu'
import { ArrowLeft } from 'lucide-react'
import * as XLSX from 'xlsx'
import axios from 'axios'
import { supabase } from '../../lib/supabase'
import { PHONE_CODES, buildPhoneNumberSafe } from '../../helpers/assets/functions'
import './guests-import.css'

// A diferencia de splitPhoneNumber (usada por GuestsCRUD sobre datos ya
// limpios en DB), aquí el número viene tal cual del Excel: puede traer
// espacios, guiones, paréntesis, etc. — hay que limpiarlo antes de separar
// los últimos 10 dígitos (el número) de lo que quede antes (la lada).
function splitPhoneForImport(raw) {
    const digits = String(raw ?? '').replace(/\D/g, '')
    if (digits.length <= 10) return { code: null, number: digits }

    const number = digits.slice(-10)
    const ladaDigits = digits.slice(0, -10)
    const match = PHONE_CODES.find((pc) => pc.value.replace('+', '') === ladaDigits)
    return { code: match ? match.value : null, number }
}

const API = import.meta.env.VITE_API_URL

const TYPE_OPTIONS = [
    { value: 'female', label: 'Mujer' },
    { value: 'male', label: 'Hombre' },
    { value: 'child', label: 'Niño/a' },
    { value: 'undefined', label: 'Sin definir' },
]

const TIER_OPTIONS = [
    { value: 'A', label: 'A — Alta' },
    { value: 'B', label: 'B — Media' },
    { value: 'C', label: 'C — Baja' },
    { value: 'D', label: 'D — Muy baja' },
]

const LOADING_MESSAGES = [
    'Estamos leyendo tu archivo...',
    'Lia está acomodando a tus invitados...',
    'Detectando quién acompaña a quién...',
    'Ya casi estamos listos...',
    'Aguanta un poquito más, vale la pena...',
    'Dándole los últimos toques a tu lista...',
]

const GuestsImportPage = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const location = useLocation()
    const id = searchParams.get('id')
    const sideEventsId = searchParams.get('side_events_id')
    const backTo = sideEventsId ? `/dashboard/side?id=${id}` : `/dashboard/guests?id=${id}`

    const [step, setStep] = useState(0)
    const [owners, setOwners] = useState([])
    const [existingTags, setExistingTags] = useState([])
    const [tagOptions, setTagOptions] = useState([])
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(false)
    const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0])
    const [result, setResult] = useState(null)
    const fileInputRef = useRef(null)

    useEffect(() => {
        if (!loading) return
        let i = 0
        setLoadingMessage(LOADING_MESSAGES[0])
        const interval = setInterval(() => {
            i = (i + 1) % LOADING_MESSAGES.length
            setLoadingMessage(LOADING_MESSAGES[i])
        }, 2200)
        return () => clearInterval(interval)
    }, [loading])

    useEffect(() => {
        if (!id) return
        supabase.from('invitations').select('owners, tags').eq('id', id).maybeSingle()
            .then(({ data, error }) => {
                if (error) return console.error('Error al obtener owners:', error)
                const fetchedOwners = data?.owners || []
                const cleanTags = (data?.tags || []).filter(Boolean)
                setOwners(fetchedOwners)
                setExistingTags(cleanTags)
                setTagOptions(cleanTags)

                if (location.state?.file) {
                    processFile(location.state.file, fetchedOwners, cleanTags)
                }
            })
    }, [id])

    const addTagOption = (tag) => {
        if (!tag) return
        setTagOptions((prev) => (prev.some((t) => t.toLowerCase() === tag.toLowerCase()) ? prev : [...prev, tag]))
    }

    const updateRow = (index, field, value) => {
        setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
    }

    const processFile = async (file, ownersOverride, tagsOverride) => {
        if (!file || !id) return

        setLoading(true)
        try {
            const buffer = await file.arrayBuffer()
            const workbook = XLSX.read(buffer)
            const sheet = workbook.Sheets[workbook.SheetNames[0]]
            const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: null })

            if (!rawRows.length) {
                message.warning('El archivo no tiene filas para importar')
                return
            }

            const { data } = await axios.post(`${API}/api/guests/import/normalize`, {
                invitation_id: id,
                owners: ownersOverride ?? owners,
                tags: tagsOverride ?? existingTags,
                rows: rawRows,
            })

            const rowsWithPhoneParts = data.rows.map((row, i) => {
                const { code, number } = splitPhoneForImport(row.phone_number)
                return { ...row, key: i, phone_code: code, phone_number: number }
            })

            rowsWithPhoneParts.forEach((row) => addTagOption(row.tag))
            setRows(rowsWithPhoneParts)
            setStep(1)
        } catch (err) {
            console.error(err)
            message.error(err.response?.data?.error || 'No se pudo normalizar el archivo')
        } finally {
            setLoading(false)
        }
    }

    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        processFile(file)
    }

    const handleConfirm = async () => {
        setLoading(true)
        try {
            const rowsForConfirm = rows.map(({ phone_code, ...row }) => ({
                ...row,
                phone_number: buildPhoneNumberSafe(phone_code, row.phone_number),
            }))

            const { data } = await axios.post(`${API}/api/guests/import/confirm`, {
                invitation_id: id,
                side_events_id: sideEventsId || undefined,
                rows: rowsForConfirm,
            })

            const newTags = tagOptions.filter(
                (tag) => !existingTags.some((t) => t.toLowerCase() === tag.toLowerCase())
            )
            if (newTags.length > 0) {
                const { data: current } = await supabase.from('invitations').select('tags').eq('id', id).single()
                const mergedTags = [...(current?.tags || []), ...newTags]
                await supabase.from('invitations').update({ tags: mergedTags }).eq('id', id)
            }

            setResult(data)
            setStep(2)
        } catch (err) {
            console.error(err)
            message.error(err.response?.data?.error || 'No se pudo confirmar la importación')
        } finally {
            setLoading(false)
        }
    }

    const columns = [
        {
            title: 'Nombre',
            dataIndex: 'name',
            render: (value, _row, index) => (
                <Input style={{borderRadius:'99px'}} value={value} onChange={(e) => updateRow(index, 'name', e.target.value)} />
            ),
        },
        {
            title: 'Teléfono',
            dataIndex: 'phone_number',
            render: (value, row, index) => {
                const numberHasError = !(value?.length === 10)
                const codeHasError = !row.phone_code

                const field = (
                    <Space.Compact style={{ width: '100%' }}>
                        <Tooltip title={codeHasError ? 'No detectamos la lada — selecciónala' : undefined}>
                            <Select
                                value={row.phone_code}
                                status={codeHasError ? 'warning' : undefined}
                                placeholder="Lada"
                                style={{ width: 90 }}
                                options={PHONE_CODES}
                                onChange={(v) => updateRow(index, 'phone_code', v)}
                            />
                        </Tooltip>
                        <Tooltip title={numberHasError ? 'El número debe tener 10 dígitos' : undefined}>
                            <Input
                                value={value}
                                status={numberHasError ? 'warning' : undefined}
                                style={{ borderRadius: '0px 99px 99px 0px',  }}
                                maxLength={10}
                                onChange={(e) => updateRow(index, 'phone_number', e.target.value.replace(/\D/g, '').slice(0, 10))}
                            />
                        </Tooltip>
                    </Space.Compact>
                )
                return field
            },
        },
        {
            title: 'Tag',
            dataIndex: 'tag',
            render: (value, _row, index) => (
                <Select
                    style={{ width: '100%', minWidth: 140 }}
                    mode="tags"
                    maxCount={1}
                    placeholder="—"
                    value={value ? [value] : []}
                    options={tagOptions.map((t) => ({ value: t, label: t }))}
                    onChange={(vals) => {
                        const v = vals[vals.length - 1] ?? null
                        updateRow(index, 'tag', v)
                        addTagOption(v)
                    }}
                />
            ),
        },
        {
            title: 'Tipo',
            dataIndex: 'type',
            render: (value, _row, index) => (
                <Select value={value} options={TYPE_OPTIONS} style={{ width: '100%' }}
                    onChange={(v) => updateRow(index, 'type', v)} />
            ),
        },
        {
            title: 'Prioridad',
            dataIndex: 'tier',
            render: (value, _row, index) => (
                <Select value={value} options={TIER_OPTIONS} allowClear placeholder="—" style={{ width: '100%' }}
                    onChange={(v) => updateRow(index, 'tier', v ?? null)} />
            ),
        },
        {
            title: 'Lado',
            dataIndex: 'side',
            render: (value, _row, index) => (
                <Select
                    value={value}
                    allowClear
                    placeholder="—"
                    style={{ width: '100%', minWidth: 120 }}
                    options={owners.filter(Boolean).map((o) => ({ value: o, label: o }))}
                    onChange={(v) => updateRow(index, 'side', v ?? null)}
                />
            ),
        },
        {
            title: 'Acompaña a',
            dataIndex: 'companion_of',
            render: (value, _row, index) => (
                <Input style={{borderRadius:'99px'}} value={value ?? ''} placeholder="Nombre exacto"
                    onChange={(e) => updateRow(index, 'companion_of', e.target.value || null)} />
            ),
        },
        {
            title: 'Notas',
            dataIndex: 'notes',
            render: (value, _row, index) => (
                <Input style={{borderRadius:'99px'}} value={value ?? ''} onChange={(e) => updateRow(index, 'notes', e.target.value)} />
            ),
        },
    ]

    return (
        <div className="guests-import-page">
            <div className="guests-import-header">
                <Button icon={<ArrowLeft size={16} />} className="primarybutton" onClick={() => navigate(backTo)}>
                    Volver
                </Button>
                <Steps
                    current={step}
                    items={[{ title: 'Subir Excel' }, { title: 'Revisar' }, { title: 'Listo' }]}
                    style={{ maxWidth: 480 }}
                />
            </div>

            {step === 0 && (
                <div className="guests-import-upload">
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
                    <Button
                        icon={<LuUpload size={16} />}
                        className="primarybutton--active"
                        loading={loading}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Subir archivo Excel
                    </Button>
                    <p className="guests-import-hint">
                        {loading
                            ? loadingMessage
                            : 'Lia va a leer el archivo y proponer cómo mapear cada columna. Podrás revisar y editar todo antes de confirmar.'}
                    </p>
                </div>
            )}

            {step === 1 && (
                <div className="guests-import-preview">
                    <div className="guests-import-preview-header">
                        <span>{rows.length} invitados por importar</span>
                        <div className="guests-import-actions">
                            <Button className="primarybutton" style={{ borderRadius: 99 }} onClick={() => setStep(0)}>
                                Cancelar
                            </Button>
                            <Button className="primarybutton--active" style={{ borderRadius: 99 }} loading={loading} onClick={handleConfirm}>
                                Confirmar importación ({rows.length})
                            </Button>
                        </div>
                    </div>
                    <Table
                        rowKey="key"
                        columns={columns}
                        dataSource={rows}
                        pagination={false}
                        scroll={{ x: true }}
                    />
                </div>
            )}

            {step === 2 && result && (
                <div className="guests-import-result">
                    <p>Se importaron <strong>{result.inserted_count}</strong> invitados.</p>
                    {result.unmatched_companions?.length > 0 && (
                        <div>
                            <p>No se pudo resolver el acompañante para:</p>
                            {result.unmatched_companions.map((name, i) => (
                                <Tag key={i} color="warning">{name}</Tag>
                            ))}
                        </div>
                    )}
                    <Button className="primarybutton--active" style={{ borderRadius: 99 }} onClick={() => navigate(backTo)}>
                        Ir a mis invitados
                    </Button>
                </div>
            )}
        </div>
    )
}

export default GuestsImportPage
