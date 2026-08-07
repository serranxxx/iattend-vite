import { useMemo, useState } from 'react'
import { Button, Divider, Dropdown, Input, InputNumber, Select, Space, Table, Tabs, message } from 'antd'
import { LuArrowUpFromLine, LuPlus } from 'react-icons/lu'
import { IoMdAdd } from 'react-icons/io'
import { ArrowUpRight, ChevronDown, Copy, Link2, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { supabase } from '../../../lib/supabase'
import styles from '../SalesAdminPage.module.css'

const TEST_EMAILS = [
    'albserrano8@gmail.com',
    'pa.perez98@gmail.com',
    'pau@iattend.mx',
    'gabrielaperezort@gmail.com',
    'albertoserrano@canplast.com.mx',
    'ajaredojeda@gmail.com',
    'lesly_lujan@hotmail.com',
    'valeriamal08@gmail.com',
]

export const EventosSection = ({ newInvitations, profiles, refreshEventos, onOpenNewInvitation }) => {
    const [filterName, setFilterName] = useState(null)
    const [actualCredits, setActualCredits] = useState(null)
    const [ownerInputs, setOwnerInputs] = useState({})
    const [activeKey, setActiveKey] = useState('esperando')
    const [pickerOpen, setPickerOpen] = useState(false)

    const copyToClipboard = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            message.success('Copiado')
        } catch (err) {
            console.error('Error al copiar el texto: ', err);
        }
    };

    const updateInvitationCredits = async (id) => {
        try {
            await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/invitation/update-credits`,
                { id: id, credits: actualCredits }
            );
            message.success('Editado con éxito')
            refreshEventos()
        } catch (error) {
            console.error('Error updating credits:', error.response?.data || error.message);
            throw error;
        }
    };

    const AddNewOwner = async (id, name) => {
        try {
            await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/invitation/add-owner`,
                { id: id, name: name }
            );
            message.success('Editado con éxito')
            refreshEventos()
            setOwnerInputs((prev) => ({
                ...prev,
                [id]: null,
            }))
        } catch (error) {
            console.error('Error updating credits:', error.response?.data || error.message);
            throw error;
        }
    };

    const removeOwner = async (id, index) => {
        try {
            await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/invitation/remove-owner`,
                { id: id, index: index }
            );
            message.success('Editado con éxito')
            refreshEventos()
        } catch (error) {
            console.error('Error updating credits:', error.response?.data || error.message);
            throw error;
        }
    };

    const insertSideEvent = async (id) => {
        const { error } = await supabase
            .from('side_events')
            .insert({
                invitation_id: id,
                date: new Date().toISOString(),
                name: null,
                url_image: null,
                body: {
                    address: {
                        street: null,
                        number: null,
                        neighborhood: null,
                        zipcode: null,
                        country: null,
                        state: null,
                        city: null,
                        url: null,
                    },
                    hour: null,
                    image: null,
                    title: {
                        font: 'Poppins',
                        size: 36,
                        weight: 600,
                        opacity: 1,
                        line_height: 1.4
                    },
                    font: 'Poppins',
                    color: "#000000",
                    extras: null
                }
            })

        if (error) {
            console.error(error)
            return
        }

        message.success('Side event agregado con éxito')
    }

    const activeInvitations = useMemo(() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        return (newInvitations ?? [])
            .filter(i => !TEST_EMAILS.includes(i.user_email))
            .filter(i => !i.event_date || new Date(i.event_date) >= today)
            .sort((a, b) => {
                if (a.event_date && b.event_date) return new Date(a.event_date) - new Date(b.event_date)
                if (a.event_date) return -1
                if (b.event_date) return 1
                return new Date(b.created_at) - new Date(a.created_at)
            })
    }, [newInvitations])

    const nextEventsCols = useMemo(() => ([
        {
            title: '',
            dataIndex: '',
            key: 'address',
            render: (_, record) => (
                <Dropdown
                    arrow
                    trigger={['click']}
                    popupRender={() => (
                        <div className='buttons_admin_cont'>
                            <Link style={{ width: '100%' }} target='_blank' to={`https://www.iattend.events/${record?.data?.generals?.event?.label}/${record?.data?.generals?.event?.name}`}>
                                <Button icon={<Link2 size={14} />} className='primarybutton' style={{ width: '100%' }} >Ver invitación</Button>
                            </Link>
                            <Link style={{ width: '100%' }} target='_blank' to={`https://www.iattend.site/dashboard?id=${record?.id}`}>
                                <Button icon={<ArrowUpRight size={14} />} className='primarybutton' style={{ width: '100%' }}  >Acceder evento</Button>
                            </Link>
                            <Button icon={<Copy size={14} />} className='primarybutton' style={{ width: '100%' }} onClick={() => copyToClipboard(record.id)} >Copiar ID</Button>
                            <Button onClick={() => insertSideEvent(record?.id)} icon={<Plus size={14} />} className='primarybutton' style={{ width: '100%' }} >Side event</Button>
                        </div>
                    )}
                >
                    <Button icon={<ChevronDown size={14} />}></Button>
                </Dropdown>
            )
        },
        {
            title: 'Nombre',
            dataIndex: 'name',
            key: 'name',
            fixed: "left",
        },
        {
            title: 'Usuario',
            dataIndex: 'user_email',
            key: 'email',
            with: 240,
        },
        {
            title: 'Plan',
            dataIndex: 'plan',
            key: 'address',
            render: text => <img src={`/images/plan_${text}.png`} style={{ height: '30px', borderRadius: '8px' }} alt='' />,
        },
        {
            title: 'Créditos',
            dataIndex: 'credits',
            key: 'address',
            render: (text, record) => (
                <div className='admin-table-content-subt' style={{ maxWidth: '160px' }}>
                    <InputNumber value={text} onChange={(e) => setActualCredits(e)} />
                    <Button style={{ marginLeft: '6px' }} onClick={() => updateInvitationCredits(record.id)} icon={<LuArrowUpFromLine />} />
                </div>
            )
        },
        {
            title: 'Dueños',
            dataIndex: 'owners',
            key: 'owners',
            render: (text, record) => (
                <Dropdown
                    arrow
                    trigger={['click']}
                    popupRender={() => (
                        <div className='buttons_admin_cont' style={{
                            padding: "12px"
                        }}>
                            {
                                text.length > 0 &&
                                <>
                                    {
                                        text.map((t, index) => (
                                            <div className='owner_item' key={t}>
                                                <span>{t}</span>
                                                <Button onClick={() => removeOwner(record.id, index)} className='primarybutton' style={{ maxWidth: '32px' }} >-</Button>
                                            </div>
                                        ))
                                    }
                                    <Divider style={{ margin: '8px 0', }} />
                                </>
                            }
                            <Space style={{ boxSizing: 'border-box' }}>
                                <Input
                                    style={{ minWidth: '100px', borderRadius: '99px' }}
                                    placeholder="Nuevo participante"
                                    value={ownerInputs[record.id] || ''}
                                    onChange={(e) =>
                                        setOwnerInputs((prev) => ({
                                            ...prev,
                                            [record.id]: e.target.value,
                                        }))
                                    }
                                />
                                <Button onClick={() => AddNewOwner(record.id, ownerInputs[record.id] || '')} className='primarybutton' icon={<IoMdAdd />} >
                                </Button>
                            </Space>
                        </div>
                    )}
                >
                    <Button style={{
                        width: '100%', textTransform: 'capitalize'
                    }}>{text[0] ? text[0] + " " + `(${text.length})` : 'Sin asignar'}</Button>
                </Dropdown>
            )
        },
        {
            title: 'Fecha',
            dataIndex: 'event_date',
            key: 'event_date',
            width: 220,
            render: (text, record) => text
                ? <span>{text.slice(0, 10)}</span>
                : <span style={{ opacity: 0.5 }}>Sin fecha (creado {record.created_at?.slice(0, 10)})</span>,
        },
        
    ]), [ownerInputs, actualCredits]);

    const allUsersCols = [
        {
            title: 'Nombre',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Usuario',
            dataIndex: 'user_email',
            key: 'email',
        },
        {
            title: 'Plan',
            dataIndex: 'plan',
            key: 'address',
            render: text => <img src={`/images/plan_${text}.png`} style={{ height: '30px', borderRadius: '8px' }} alt='' />,
        },
        {
            title: 'Creditos',
            dataIndex: 'credits',
            key: 'address',
            render: (text, record) => (
                <div className='admin-table-content-subt' style={{ maxWidth: '160px' }}>
                    <InputNumber value={text} onChange={(e) => setActualCredits(e)} />
                    <Button style={{ marginLeft: '6px' }} onClick={() => updateInvitationCredits(record.id)} icon={<LuArrowUpFromLine />} />
                </div>
            )
        },
        {
            title: 'Dueños',
            dataIndex: 'owners',
            key: 'owners',
            render: (text, record) => (
                <Dropdown
                    arrow
                    trigger={['click']}
                    popupRender={() => (
                        <div className='buttons_admin_cont' style={{
                            padding: "12px"
                        }}>
                            {
                                text.length > 0 &&
                                <>
                                    {
                                        text.map((t, index) => (
                                            <div className='owner_item' key={t}>
                                                <span>{t}</span>
                                                <Button onClick={() => removeOwner(record.id, index)} className='primarybutton' style={{ maxWidth: '32px' }} >-</Button>
                                            </div>
                                        ))
                                    }
                                    <Divider style={{ margin: '8px 0', }} />
                                </>
                            }
                            <Space style={{ boxSizing: 'border-box' }}>
                                <Input
                                    style={{ minWidth: '100px', borderRadius: '99px' }}
                                    placeholder="Nuevo participante"
                                    value={ownerInputs[record.id] || ''}
                                    onChange={(e) =>
                                        setOwnerInputs((prev) => ({
                                            ...prev,
                                            [record.id]: e.target.value,
                                        }))
                                    }
                                />
                                <Button onClick={() => AddNewOwner(record.id, ownerInputs[record.id] || '')} className='primarybutton' icon={<IoMdAdd />} >
                                </Button>
                            </Space>
                        </div>
                    )}
                >
                    <Button style={{
                        width: '100%', textTransform: 'capitalize'
                    }}>{text[0] ? text[0] + " " + `(${text.length})` : 'Sin asignar'}</Button>
                </Dropdown>
            )
        },
        {
            title: 'Fecha',
            dataIndex: 'cover_date',
            key: 'address',
            render: (text, record) => <span>{record?.data?.cover?.date.value?.slice(0, 10)}</span>,
        },
        {
            title: 'Acciones',
            dataIndex: '',
            key: 'address',
            render: (_, record) => (
                <Dropdown
                    arrow
                    trigger={['click']}
                    popupRender={() => (
                        <div className='buttons_admin_cont'>
                            <Link style={{ width: '100%' }} target='_blank' to={`https://www.iattend.events/${record?.data?.generals?.event?.label}/${record?.data?.generals?.event?.name}`}>
                                <Button icon={<Link2 size={14} />} className='primarybutton' style={{ width: '100%' }} >Ver invitación</Button>
                            </Link>
                            <Link style={{ width: '100%' }} target='_blank' to={`https://www.iattend.site/dashboard?id=${record?.id}`}>
                                <Button icon={<ArrowUpRight size={14} />} className='primarybutton' style={{ width: '100%' }}  >Acceder evento</Button>
                            </Link>
                            <Button icon={<Copy size={14} />} className='primarybutton' style={{ width: '100%' }} onClick={() => copyToClipboard(record.id)} >Copiar ID</Button>
                            <Button onClick={() => insertSideEvent(record?.id)} icon={<Plus size={14} />} className='primarybutton' style={{ width: '100%' }} >Side event</Button>
                        </div>
                    )}
                >
                    <Button icon={<ChevronDown size={14} />}>Opciones</Button>
                </Dropdown>
            )
        },
    ];

    const items = [
        {
            label: `Eventos activos (${activeInvitations.length})`,
            key: "esperando",
            children: (
                <Table
                    rowKey="id"
                    columns={nextEventsCols}
                    dataSource={
                        activeInvitations.filter(i => {
                            if (filterName) {
                                return (
                                    i?.name?.toLowerCase().includes(filterName?.toLowerCase())
                                )
                            }
                            else return true
                        })}
                    pagination={false} />
            ),
        },
        {
            label: `Todos (${newInvitations?.filter(i => !TEST_EMAILS.includes(i.user_email))?.length})`,
            key: "todos",
            children: (
                <Table
                    rowKey="id"
                    columns={allUsersCols}
                    dataSource={
                        [...(newInvitations ?? [])]
                            ?.filter((i) => {
                                if (filterName) {
                                    return i.user_email
                                        ?.toLowerCase()
                                        .includes(filterName.toLowerCase());
                                }
                                return true;
                            })
                            ?.filter(i => !TEST_EMAILS.includes(i.user_email))
                            ?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    }
                    pagination={false}
                />
            ),
        },
        {
            label: `Pruebas (${newInvitations?.filter(i => TEST_EMAILS.includes(i.user_email))?.length})`,
            key: "pruebas",
            children: (
                <Table
                    rowKey="id"
                    columns={allUsersCols}
                    dataSource={
                        [...(newInvitations ?? [])]
                            ?.filter((i) => {
                                if (filterName) {
                                    return i.user_email
                                        ?.toLowerCase()
                                        .includes(filterName.toLowerCase());
                                }
                                return true;
                            })
                            ?.filter(i => TEST_EMAILS.includes(i.user_email))
                            ?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    }
                    pagination={false}
                />
            ),
        },
    ]

    return (
        <div>
            <div className={styles.headerRow}>
                <div>
                    <div className={styles.title}>Eventos</div>
                    <div className={styles.subtitle}>Panel interno — solo admin</div>
                </div>
                <div className={styles.headerControls}>
                    <Input placeholder='Búscar...' value={filterName} onChange={(e) => setFilterName(e.target.value)} style={{ width: '240px', borderRadius: '99px' }} />
                    <Dropdown
                        trigger={['click']}
                        open={pickerOpen}
                        onOpenChange={setPickerOpen}
                        placement='bottomRight'
                        arrow
                        popupRender={() => (
                            <div style={{
                                backgroundColor: '#FFF', borderRadius: '16px', boxShadow: '0px 0px 12px rgba(0,0,0,0.2)',
                                boxSizing: 'border-box', padding: '12px', minWidth: '280px'
                            }}>
                                <Select
                                    showSearch
                                    autoFocus
                                    placeholder="Buscar usuario..."
                                    style={{ width: '100%' }}
                                    filterOption={(input, option) => option?.label?.toLowerCase().includes(input.toLowerCase())}
                                    options={(profiles ?? []).map(p => ({ value: p.user_id, label: `${p.full_name || 'Sin nombre'} (${p.user_email})`, profile: p }))}
                                    onSelect={(_, option) => {
                                        onOpenNewInvitation(option.profile)
                                        setPickerOpen(false)
                                    }}
                                />
                            </div>
                        )}
                    >
                        <Button className='primarybutton--active' style={{ borderRadius: '99px' }} icon={<LuPlus size={16} />}>Agregar evento</Button>
                    </Dropdown>
                </div>
            </div>
            <Tabs
                style={{ width: '100%' }}
                type="card"
                activeKey={activeKey}
                onChange={setActiveKey}
                items={items}
            />
        </div>
    )
}
