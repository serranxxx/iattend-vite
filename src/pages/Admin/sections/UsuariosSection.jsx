import { useMemo, useState } from 'react'
import { Button, Collapse, Dropdown, Input, Modal, Table, Tag, message } from 'antd'
import { LuCopy, LuPlus, LuUserPlus } from 'react-icons/lu'
import { CreateAccount } from '../../../components/Auth/CreateUser'
import styles from '../SalesAdminPage.module.css'

const ROLE_META = {
    Administration: { label: 'Administración', color: 'gold' },
    sales: { label: 'Vendedor', color: 'blue' },
    test: { label: 'Pruebas', color: 'default' },
}
const DEFAULT_ROLE_META = { label: 'Cliente', color: 'green' }
const ROLE_GROUP_ORDER = ['Administración', 'Vendedor', 'Cliente', 'Pruebas']

const getRoleMeta = (role) => ROLE_META[role] ?? DEFAULT_ROLE_META
const INITIALLY_COLLAPSED_GROUPS = ['Administración', 'Vendedor', 'Pruebas']

export const UsuariosSection = ({ profiles, refreshUsuarios, onOpenNewInvitation }) => {
    const [visible, setVisible] = useState(false)
    const [userData, setUserData] = useState(null)
    const [collapsedGroups, setCollapsedGroups] = useState(new Set(INITIALLY_COLLAPSED_GROUPS))
    const [filterName, setFilterName] = useState(null)

    const copyToClipboard = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            message.success('Copiado')
        } catch (err) {
            console.error('Error al copiar el texto: ', err);
        }
    };

    const userCols = [
        {
            title: 'Nombre',
            dataIndex: 'full_name',
            key: 'name',
        },
        {
            title: 'Email',
            dataIndex: 'user_email',
            key: 'email',
        },
        {
            title: 'Id',
            dataIndex: 'user_id',
            key: 'email',
        },
        {
            title: 'Rol',
            dataIndex: 'role',
            key: 'role',
            render: (role) => {
                const meta = getRoleMeta(role)
                return <Tag color={meta.color}>{meta.label}</Tag>
            }
        },
        {
            title: 'Acciones',
            dataIndex: '',
            key: 'address',
            render: (_, record) => (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Button onClick={() => onOpenNewInvitation(record)} icon={<LuPlus />} >Agregar evento</Button>
                </div>
            )
        },
    ];

    const filteredProfiles = useMemo(() => {
        if (!filterName) return profiles ?? []
        const needle = filterName.toLowerCase()
        return (profiles ?? []).filter((p) =>
            p.full_name?.toLowerCase().includes(needle) || p.user_email?.toLowerCase().includes(needle)
        )
    }, [profiles, filterName]);

    const roleGroups = useMemo(() => {
        const buckets = new Map()
        filteredProfiles.forEach((p) => {
            const label = getRoleMeta(p.role).label
            if (!buckets.has(label)) buckets.set(label, [])
            buckets.get(label).push(p)
        })

        const ordered = ROLE_GROUP_ORDER.filter((label) => buckets.has(label))
        const rest = [...buckets.keys()].filter((label) => !ROLE_GROUP_ORDER.includes(label))

        return [...ordered, ...rest].map((label) => ({ label, items: buckets.get(label) }))
    }, [filteredProfiles]);

    const activeGroupKeys = roleGroups
        .map((group) => group.label)
        .filter((label) => !collapsedGroups.has(label))

    const handleGroupsChange = (openKeys) => {
        const openSet = new Set(openKeys)
        setCollapsedGroups(new Set(roleGroups.map((g) => g.label).filter((label) => !openSet.has(label))))
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <div className={styles.headerRow}>
                <div>
                    <div className={styles.title}>Usuarios</div>
                    <div className={styles.subtitle}>Panel interno — solo admin</div>
                </div>
                <div className={styles.headerControls} style={{ flex: 1, marginLeft: '24px' }}>
                    <Input placeholder='Búscar...' value={filterName} onChange={(e) => setFilterName(e.target.value)} style={{ flex: 1, borderRadius: '99px' }} />
                    <Dropdown
                        arrow
                        trigger={['click']}
                        popupRender={() => (
                            <div style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: '#FFF', borderRadius: '16px', boxShadow: '0px 0px 12px rgba(0,0,0,0.2)',
                                boxSizing: 'border-box', padding: '12px'
                            }}>
                                <CreateAccount refreshData={refreshUsuarios} setVisible={setVisible} setUserData={setUserData} />
                            </div>
                        )}
                    >
                        <Button className='primarybutton--active' style={{ borderRadius: '99px' }} icon={<LuUserPlus size={16} />}>Nuevo usuario</Button>
                    </Dropdown>
                </div>
            </div>

            <Collapse
                activeKey={activeGroupKeys}
                onChange={handleGroupsChange}
                items={roleGroups.map((group) => ({
                    key: group.label,
                    label: <span className={styles.tableLabel} style={{ marginBottom: 0 }}>{group.label} ({group.items.length})</span>,
                    children: (
                        <Table
                            rowKey="id"
                            columns={userCols}
                            dataSource={group.items}
                            pagination={false}
                        />
                    ),
                }))}
            />

            <Modal
                footer={null}
                open={visible && !!userData}
                onOk={() => setVisible(false)}
                onCancel={() => setVisible(false)}
                title="Nuevo usuario agregado exitosamente"
                width={400}
                styles={{
                    container: {
                        borderRadius: '24px',
                        padding: '32px',
                    },
                    header: {
                        borderBottom: 'none',
                        padding: 0,
                    },
                    body: {
                        padding: 0,
                    }
                }}
            >
                <div className='new_user_col' style={{ alignSelf: 'stretch', }}>
                    <span>{userData?.email ?? "----"}</span>
                    <div className='new_user_col' style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', justifyContent: 'space-between' }}>
                        <span>{userData?.pass ?? "*******"}</span>
                        <Button onClick={() => copyToClipboard(userData.password ?? "")} icon={<LuCopy />}>Copiar contraseña</Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
