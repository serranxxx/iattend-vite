import { Button, Dropdown, Input, Layout, Popconfirm, message, Tooltip, Tabs, Progress, Drawer, Segmented, Table, notification } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Legend, } from 'chart.js';
import { NewGuestDrawer } from '../../components/Create/NewGuestDrawer';
import { IoIosAddCircleOutline, IoIosCheckmarkCircleOutline, IoIosCloseCircleOutline, IoMdAdd, } from 'react-icons/io';
import { FooterApp } from '../Footer/FooterApp';
import { supabase } from '../../lib/supabase';
import { FaChair, FaCheck, FaPaperPlane, FaPlus, FaRegClock, FaRegCopy, } from 'react-icons/fa';
import { AiOutlineClockCircle, } from 'react-icons/ai';
import { FiArrowUpRight, FiMinus } from 'react-icons/fi';
import { NotificationCard } from '../../components/NotificationCard/NotificationCard';
import { IoChevronDownSharp, IoNotifications, IoTicket, } from 'react-icons/io5';
import { MdFileDownload, } from 'react-icons/md';
import { RiArrowRightDoubleLine } from 'react-icons/ri';
import axios from 'axios';
import { TbLocationFilled } from 'react-icons/tb';
import { GoChevronDown } from 'react-icons/go';
import { BsArrowReturnRight } from 'react-icons/bs';
import { LuSettings2 } from 'react-icons/lu';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { type } from '@testing-library/user-event/dist/type';

import { Grid } from "antd";
import { TablesPage } from './Tables/TablesPage';
import { HeaderDashboard } from '../Header/Header';
import { HiLockClosed, HiLockOpen } from 'react-icons/hi2';

const { useBreakpoint } = Grid;




ChartJS.register(ArcElement, Legend);

export default function GuestsPage({ invitationID, setMode, mode, invitation }) {

    const screens = useBreakpoint();
    const [confirmed, setConfirmed] = useState(0)
    const [waiting, setWaiting] = useState(0)
    const [tickets, setTickets] = useState(0)
    const [onTickets, setOnTickets] = useState(false)
    const [activeTickets, setActiveTickets] = useState(false)
    const [api, contextHolder] = notification.useNotification();
    const [onNotificationCenter, setOnNotificationCenter] = useState(false)
    const [onEditTickets, setOnEditTickets] = useState(false)
    // const [onViewID, setOnViewID] = useState(false)
    const [drawerState, setDrawerState] = useState({
        currentGuest: null,
        onEditGuest: false,
        companions: [],
        visible: false
    });


    const [openCard, setOpenCard] = useState(null)
    const [onShare, setOnShare] = useState(false)
    const [onNewGuest, setOnNewGuest] = useState(false)
    const [copyTickets, setCopyTickets] = useState(null)
    const [handleTables, sethandleTables] = useState(false)
    const [onGroupTable, setOnGroupTable] = useState(false)
    const [rowData, setRowData] = useState([]);
    const [waitingData, setWaitingData] = useState([])
    const [confirmedData, setConfirmedData] = useState([])
    const [callededData, setCallededData] = useState([])
    const [createdData, setCreatedData] = useState([])
    const [notifications, setNotifications] = useState([])
    const [tables, setTables] = useState([])
    const [onBubble, setOnBubble] = useState(false)
    const [onSending, setOnSending] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [hierarchyData, setHierarchyData] = useState([])
    const [expandedRowKeys, setExpandedRowKeys] = useState([]);
    const [credits, setCredits] = useState(0)
    const [activeKey, setActiveKey] = useState('confirmado');



    const openColumns = useMemo(() => ([
        {
            title: "Nombre",
            dataIndex: "name",
            key: "name",
            fixed: "left",
            render: (value, record) => {
                const isChild = record.companion_id !== null;
                const hasChildren = record.children?.length > 0;
                const isExpanded = expandedRowKeys.includes(record.id);

                if (onGroupTable && isChild) {
                    // ✅ HIJO: sin botones + indent
                    return (
                        <div style={{ paddingLeft: 28, lineHeight: "30px" }}>
                            <span>{value}</span>
                        </div>
                    );
                }

                // ✅ PADRE: botones + expand custom
                return (
                    <div
                        className="tag-container"
                        style={{ gap: 8, justifyContent: "flex-start", width: "100%" }}
                    >
                        {hasChildren && (
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleExpand(record);
                                }}
                                className="primarybutton"
                                style={{ maxWidth: 24, maxHeight: 24, borderRadius: 99 }}
                                icon={isExpanded ? "▾" : "▸"} // cambia por icono que quieras
                            />
                        )}

                        <Tooltip title="Abrir">
                            <Button
                                onClick={() =>
                                    setDrawerState({
                                        currentGuest: record,
                                        onEditGuest: true,
                                        companions: handleCompanions(record.id),
                                        visible: true,
                                    })
                                }
                                className="primarybutton"
                                icon={<FiArrowUpRight size={14} style={{ marginTop: 2 }} />}
                                style={{ maxWidth: 24, maxHeight: 24, borderRadius: 99 }}
                            />
                        </Tooltip>

                        <span style={{ textAlign: "left" }}>{value}</span>
                    </div>
                );
            },
        }
        ,


        {
            title: "Contacto",
            dataIndex: "phone_number",
            key: "phone_number",
            width: 160,
            render: (value) => phoneFormatter(value),
        },

        {
            title: "Estado",
            dataIndex: "state",
            key: "state",
            render: (value) => (
                <div className="tag-container">
                    <span className={`new-table-tag state-${value}`}>
                        {handleIcon(value)} {value}
                    </span>
                </div>
            ),
        },

        {
            title: "Etiqueta",
            dataIndex: "tag",
            key: "tag",
            width: 160,
            render: (value) => (
                <div className="tag-container">
                    <span className={`new-table-tag state-${value}`}>
                        {renderTag(value)}
                    </span>
                </div>
            ),
        },

        {
            title: "Mesa",
            dataIndex: "table",
            key: "table",
            width: 180,
            render: (value) => (
                <div className="tag-container">
                    <span>{value ? value : "-"}</span>
                </div>
            ),
        },

        {
            title: "Prioridad",
            dataIndex: "tier",
            key: "tier",
            width: 140,
            fixed: "right",
            render: (value) => (
                <div className="tag-container">
                    <span
                        style={{ width: "100%", justifyContent: "center" }}
                        className={`new-table-tag tier-${value}`}
                    >
                        {value}
                    </span>
                </div>
            ),
        },

        {
            title: "Acciones",
            key: "send",
            // width: 140,
            fixed: "right",
            render: (_, record) => {
                const { state, table } = record;

                // if (state === "creado") {
                //     return (
                //         <div
                //             style={{
                //                 display: "flex",
                //                 alignItems: "center",
                //                 justifyContent: "flex-start",
                //                 gap: 6,
                //                 width: "100%",
                //             }}
                //         >
                //             {/* <Button
                //                 disabled={!phone_number || !credits > 0 }
                //                 onMouseEnter={() => setActiveIcon(true)} onMouseLeave={() => setActiveIcon(false)}
                //                 onClick={() => onSedingInvitation(record)}
                //                 className="primarybutton--active"
                //                 icon={<FaPaperPlane className={activeIcon ? 'paper_flight' : ''} size={12} />}
                //                 style={{ flex: 1, maxHeight: 30 }}
                //             >
                //                 Enviar
                //             </Button> */}

                //             <Tooltip title="Marcar como enviado" color="var(--brand-color-500)">
                //                 <Button
                //                     onClick={() => onSendInvitation(record)}
                //                     className="primarybutton--active"
                //                     icon={<FaCheck size={12} />}
                //                     style={{ minWidth: 30,  maxHeight: 30 }}
                //                 >Marcar como enviado</Button>
                //             </Tooltip>
                //         </div>
                //     );
                // }

                // if (state === "esperando") {
                //     return (
                //         <Button
                //             className="primarybutton"
                //             disabled
                //             icon={<FaRegClock size={14} style={{ marginTop: 2 }} />}
                //             style={{ width: "100%", maxHeight: 30, borderRadius: 99 }}
                //         >
                //             Esperando
                //         </Button>
                //     );
                // }

                if (state === "confirmado" && !table) {
                    return (
                        <Dropdown
                            trigger={["click"]}
                            placement="topRight"
                            popupRender={() => (
                                <div style={{ position: "static" }} className="on-transfer-container">
                                    <span className="on-transfer-label">Selecciona mesa</span>

                                    <div className="transfer-mesas-cont">
                                        {tables.map((tb, index) => (
                                            <div
                                                onClick={() => addGuestToTable(tb, record)}
                                                key={index}
                                                className="table-transfer-item"
                                            >
                                                <div style={{ alignSelf: "stretch", display: "flex", alignItems: "center" }}>
                                                    <span>
                                                        {tb.name ? `#${tb.number} - ${tb.name}` : `Mesa #${tb.number}`}
                                                    </span>
                                                </div>

                                                <div
                                                    style={{
                                                        alignSelf: "stretch",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "flex-start",
                                                        gap: 12,
                                                    }}
                                                >
                                                    <Progress
                                                        style={{ flex: 1 }}
                                                        size={[undefined, 12]}
                                                        className="progress-tables"
                                                        strokeColor={"var(--brand-color-500)"}
                                                        status="active"
                                                        showInfo={false}
                                                        percent={
                                                            (confirmedData?.filter((g) => g.table === tb.id).length * 100) /
                                                            tb.size
                                                        }
                                                    />
                                                    <span className="occupied-places-tab-mob">
                                                        {`${confirmedData?.filter((g) => g.table === tb.id).length} / ${tb.size}`}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div
                                        style={{
                                            width: "100%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            height: 65,
                                        }}
                                    >
                                        <Button
                                            onClick={() => sethandleTables(true)}
                                            style={{ borderRadius: 99 }}
                                            icon={<TbLocationFilled />}
                                        >
                                            Ver mapa
                                        </Button>
                                    </div>
                                </div>
                            )}
                        >
                            <Button
                                className="primarybutton--active"
                                icon={<RiArrowRightDoubleLine size={16} style={{ marginTop: 2 }} />}
                                style={{ width: "100%", maxHeight: 30, borderRadius: 99 }}
                            >
                                Asignar
                            </Button>
                        </Dropdown>
                    );
                }

                return null;
            },
        },
    ]), [rowData]);

    const columns = useMemo(() => ([
        {
            title: "Nombre",
            dataIndex: "name",
            key: "name",
            fixed: "left",
            width: screens.xs ? 140 : undefined,
            render: (value, record) => {
                const isChild = record.companion_id !== null;
                const hasChildren = record.children?.length > 0;
                const isExpanded = expandedRowKeys.includes(record.id);

                if (onGroupTable && isChild) {
                    // ✅ HIJO: sin botones + indent
                    return (
                        <div style={{ paddingLeft: '36px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px' }}>
                            <BsArrowReturnRight /> <span>{value}</span>
                        </div>
                    );
                }

                // ✅ PADRE: botones + expand custom
                return (
                    <div
                        className="tag-container"
                        style={{ gap: 8, justifyContent: "flex-start", width: "100%" }}
                    >

                        {
                            onGroupTable &&
                            <Button
                                disabled={!hasChildren}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleExpand(record);
                                }}
                                type='text'
                                style={{ opacity: hasChildren ? 1 : 0, maxWidth: '24px', maxHeight: '24px', borderRadius: '99px' }}
                                icon={<IoChevronDownSharp style={{ transition: 'all 0.3s ease', color: '#6D3CFA', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />} // cambia por icono que quieras
                            />
                        }


                        <Tooltip title="Abrir">
                            <Button
                                onClick={() =>
                                    setDrawerState({
                                        currentGuest: record,
                                        onEditGuest: true,
                                        companions: handleCompanions(record.id),
                                        visible: true,
                                    })
                                }
                                className="primarybutton"
                                icon={<FiArrowUpRight size={14} style={{ marginTop: 2 }} />}
                                style={{ maxWidth: 24, maxHeight: 24, borderRadius: 99 }}
                            />
                        </Tooltip>

                        <span style={{ textAlign: "left" }}>{value}</span>
                    </div>
                );
            },
        },


        {
            title: "Contacto",
            dataIndex: "phone_number",
            key: "phone_number",
            width: 160,
            //   render: (value) => phoneFormatter(value),
        },

        {
            title: "Estado",
            dataIndex: "state",
            key: "state",
            width: 160,
            render: (value) => (
                <div className="tag-container">
                    <span className={`new-table-tag state-${value}`}>
                        {handleIcon(value)} {value}
                    </span>
                </div>
            ),
        },

        {
            title: "Contraseña",
            dataIndex: "password",
            key: "password",
            width: 140,
            render: (value, record) => (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        gap: '2px'
                    }}
                >
                    <span>{value}</span>
                    <Tooltip title="Copiar contraseña">
                        <Button
                            onClick={() => copyToClipboard(value)}
                            type='text'
                            // className="primarybutton"
                            // style={{ maxHeight: 26 }}
                            icon={<FaRegCopy size={14} style={{ color: linkColor(record.state) }} />}
                        />
                    </Tooltip>
                </div>
            ),
        },

        {
            title: "Link mágico",
            key: "link",
            width: 160,
            render: (_, record) => {
                const url = `www.iattend.events/${invitation.generals.event.label}/${invitation.generals.event.name}?password=${record.password}`;
                return (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center", gap: '2px',
                            width: "100%",
                        }}
                    >
                        <span >
                            www.iatten...
                        </span>
                        <Tooltip title="Copiar link mágico">
                            <Button
                                onClick={() => copyToClipboard(url)}
                                type='text'
                                // className="primarybutton"
                                // style={{ maxHeight: 26 }}
                                icon={<FaRegCopy size={14} style={{ color: linkColor(record.state) }} />}
                            />
                        </Tooltip>

                    </div>
                );
            },
        },

        {
            title: "Etiqueta",
            dataIndex: "tag",
            key: "tag",
            width: 160,
            render: (value) => (
                <div className="tag-container">
                    <span className={`new-table-tag state-${value}`}>
                        {renderTag(value)}
                    </span>
                </div>
            ),
        },

        {
            title: "Mesa",
            dataIndex: "table",
            key: "table",
            width: 180,
            render: (value) => (
                <div className="tag-container">
                    <span className="new-table-tag">
                        {value ? tables?.find((t) => t.id === value)?.name ?? "-" : "-"}
                    </span>
                </div>
            ),
        },

        {
            title: "Prioridad",
            dataIndex: "tier",
            key: "tier",
            width: 100,
            fixed: screens.xs ? undefined : "right",
            render: (value) => (
                <Tooltip title={handlePriority(value)}>
                    <div className="tag-container">
                        <span
                            style={{ width: "100%", justifyContent: "center" }}
                            className={`new-table-tag tier-${value}`}
                        >
                            {value}
                        </span>
                    </div>
                </Tooltip>
            ),
        },

        {
            title: "Acciones",
            key: "send",
            width: 140,
            fixed: screens.xs ? undefined : "right",
            render: (_, record) => {
                const { state, table, phone_number } = record;

                if (state === "creado") {
                    return (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start",
                                gap: 6,
                                width: "100%",
                            }}
                        >
                            <Tooltip placement='topRight'

                                title={!/^\+52\d+/.test(phone_number) ? "Solo puedes hacer envíos nacionales" : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><FaPaperPlane size={12} /><span>Enviar invitación</span></div>} color="var(--brand-color-500)">
                                <Button
                                    disabled={
                                        !/^\+52\d+/.test(phone_number) || credits <= 0
                                    }
                                    onClick={() => onSedingInvitation(record)}
                                    className="primarybutton--active"
                                    icon={<FaPaperPlane size={12} />}
                                    style={{ flex: 1, maxHeight: 30 }}
                                >
                                    Invitar
                                </Button>
                            </Tooltip>

                            <Tooltip placement='bottomLeft' title={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><FaCheck size={12} /><span>Marcar como invitado</span></div>} color="var(--brand-color-500)">
                                <Button
                                    onClick={() => onSendInvitation(record)}
                                    className="primarybutton--active"
                                    icon={<FaCheck size={12} />}
                                    style={{ minWidth: 30, maxWidth: 30, maxHeight: 30 }}
                                />
                            </Tooltip>
                        </div>
                    );
                }

                if (state === "esperando") {
                    return (
                        <Button
                            className="primarybutton"
                            disabled
                            icon={<FaRegClock size={14} style={{ marginTop: 2 }} />}
                            style={{ width: "100%", maxHeight: 30, borderRadius: 99 }}
                        >
                            Esperando
                        </Button>
                    );
                }

                if (state === "confirmado" && !table) {
                    return (
                        <Dropdown
                            trigger={["click"]}
                            placement="topRight"
                            popupRender={() => (
                                <div style={{ position: "static" }} className="on-transfer-container">
                                    <span className="on-transfer-label">Selecciona mesa</span>

                                    <div className="transfer-mesas-cont">
                                        {tables.map((tb, index) => (
                                            <div
                                                onClick={() => addGuestToTable(tb, record)}
                                                key={index}
                                                className="table-transfer-item"
                                            >
                                                <div style={{ alignSelf: "stretch", display: "flex", alignItems: "center" }}>
                                                    <span>
                                                        {tb.name ? `#${tb.number} - ${tb.name}` : `Mesa #${tb.number}`}
                                                    </span>
                                                </div>

                                                <div
                                                    style={{
                                                        alignSelf: "stretch",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "flex-start",
                                                        gap: 12,
                                                    }}
                                                >
                                                    <Progress
                                                        style={{ flex: 1 }}
                                                        size={[undefined, 12]}
                                                        className="progress-tables"
                                                        strokeColor={"var(--brand-color-500)"}
                                                        status="active"
                                                        showInfo={false}
                                                        percent={
                                                            (confirmedData?.filter((g) => g.table === tb.id).length * 100) /
                                                            tb.size
                                                        }
                                                    />
                                                    <span className="occupied-places-tab-mob">
                                                        {`${confirmedData?.filter((g) => g.table === tb.id).length} / ${tb.size}`}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div
                                        style={{
                                            width: "100%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            height: 65,
                                        }}
                                    >
                                        <Button
                                            onClick={() => sethandleTables(true)}
                                            style={{ borderRadius: 99 }}
                                            icon={<TbLocationFilled />}
                                        >
                                            Ver mapa
                                        </Button>
                                    </div>
                                </div>
                            )}
                        >
                            <Button
                                className="primarybutton--active"
                                icon={<RiArrowRightDoubleLine size={16} style={{ marginTop: 2 }} />}
                                style={{ width: "100%", maxHeight: 30, borderRadius: 99 }}
                            >
                                Asignar
                            </Button>
                        </Dropdown>
                    );
                }

                // if (state === "rechazado") {
                //     return (
                //         <Button
                //             className="primarybutton"
                //             icon={<MdDelete style={{ marginTop: 2 }} />}
                //             style={{ width: "100%", maxHeight: 30, borderRadius: 99 }}
                //         >
                //             Eliminar
                //         </Button>
                //     );
                // }

                return null;
            },
        },
    ]), [rowData, onGroupTable, expandedRowKeys]);

    const tableProps = useMemo(() => ({
        rowKey: "id",
        columns: openCard ? openColumns : columns,
        pagination: false,
        scroll: { x: 1400 },
        expandedRowKeys,
        onExpand: (expanded, record) => handleExpand(record),
        expandable: {
            expandIconColumnIndex: -1, // oculta el chevron default
            childrenColumnName: "children",
            rowExpandable: (record) => record.children?.length > 0,
        },
    }), [columns, openColumns, openCard, expandedRowKeys]);

    const items = useMemo(() => ([
        {
            label: `${screens.xs ? 'Espera' : 'Lista de espera'} `,
            key: "creado",
            children: (
                <Table
                    size='small'
                    {...tableProps}
                    loading={isLoading}
                    dataSource={createdData}
                />
            ),
        },
        {
            label: `${screens.xs ? 'Enviada' : 'Invitación enviada'} `,
            key: "esperando",
            children: (
                <Table
                    size='small'
                    {...tableProps}
                    loading={isLoading}
                    dataSource={waitingData}
                />
            ),
        },
        {
            label: `${screens.xs ? 'Confirmados' : 'Asistencia confirmada'} `,
            key: "confirmado",
            children: (
                <Table
                    size='small'
                    {...tableProps}
                    dataSource={confirmedData}
                />
            ),
        },
        {
            label: `${screens.xs ? 'Cancelados' : 'No asistirán '} `,
            key: "rechazado",
            children: (
                <Table
                    size='small'
                    {...tableProps}
                    loading={isLoading}
                    dataSource={callededData}
                />
            ),
        },
    ]), [
        createdData,
        waitingData,
        tableProps,
        confirmedData,
        callededData,
        isLoading,
        screens
    ]);

    const handleExpand = (record) => {
        setExpandedRowKeys(prev => {
            const isExpanded = prev.includes(record.id);
            if (isExpanded) return prev.filter(k => k !== record.id);
            return [...prev, record.id];
        });
    }

    const linkColor = (state) => {
        switch (state) {
            case 'creado': return '#008DFF'
            case 'esperando': return '#E6961F'
            case 'confirmado': return '#6D3CFA'
            case 'rechazado': return '#000000'

            default:
                break;
        }
    }

    const handlePriority = (tier) => {
        switch (tier) {
            case 'A': return 'Tiene que estar sí o sí.'
            case 'B': return 'Muy importante'
            case 'C': return 'Deseable'
            case 'D': return 'Opcional'

            default:
                break;
        }
    }

    const handleIcon = (value) => {
        switch (value) {
            case 'esperando': return <div className='icon_cont'><AiOutlineClockCircle size={16} /></div>
            case 'confirmado': return <div className='icon_cont'><IoIosCheckmarkCircleOutline size={16} /></div>
            case 'rechazado': return <div className='icon_cont'><IoIosCloseCircleOutline size={16} /></div>
            case 'creado': return <div className='icon_cont'><IoIosAddCircleOutline size={16} /></div>
            default:
                break;
        }
    }

    const phoneFormatter = (params) => {
        const val = params.value;
        if (!val) return "";

        // limpia todo menos dígitos
        const digits = String(val).replace(/\D/g, "");

        // Si tiene 12 dígitos (por ejemplo +52 + 10 dígitos)
        if (digits.length === 12) {
            const country = digits.slice(0, 2); // 👈 código de país
            const phone = digits.slice(2);      // 👈 los 10 dígitos del número
            return `+${country} (${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
        }

        // Si tiene 10 dígitos (número local sin código)
        if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }

        // Cualquier otro formato → lo deja igual
        return val;
    };

    const copyToClipboard = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            message.success('Copiado')
        } catch (err) {
            console.error('Error al copiar el texto: ', err);
        }
    };

    const refreshPage = () => {
        getGuests()
        getTickets()
        getTables()
    }

    const onSaveNewTickets = async (newType) => {

        const { error } = await supabase
            .from('invitations')
            .update({ type: newType })
            .eq("id", invitationID)


        if (error) {
            console.error('Error actualizando:', error)
        } else {
            setOpenCard(newType === 'open' ? true : false)
            message.success('Estado actualizado')

        }
    };


    const chartData = {
        labels: ['A', 'B', 'C'],
        datasets: [
            {
                // label: '# of Votes',
                data: [confirmed, waiting, (tickets - (confirmed + waiting))],
                backgroundColor: [
                    '#6D3CFA',
                    '#6D3CFA50',
                    '#6D3CFA20',
                    // '#DCDCDC',
                ],
                borderColor: [
                    '#FFFFFF',
                ],
                borderWidth: 1.5,
            },
        ],
    };

    const options = {
        plugins: {
            legend: {
                display: false, // Ocultar la leyenda
            },
        },
    };

    const onHandleTickets = async (value) => {

        const { data, error } = await supabase
            .from('invitations')
            .update({ tickets: value })           // nuevo valor
            .eq('id', invitationID)            // o usa .eq('mongo_id', '...') si prefieres
            .select('id, tickets')
            .single()

        if (error) {
            console.error(error)
        } else {
            setTickets(data.tickets)
            message.success('Pases actualizados')
        }
    }

    const buildHierarchy = (data) => {
        return data
            .filter(d => d.companion_id === null)
            .map(principal => ({
                ...principal,
                children: data.filter(child =>
                    child.companion_id !== null &&
                    Number(child.companion_id) === principal.id
                )
            }));
    };

    const getGuests = async () => {

        const { data, error } = await supabase
            .from("guests")
            .select("*")
            .eq("invitation_id", invitationID)

        if (error) {
            console.error("Error al obtener invitaciones:", error);
        } else {

            setRowData(data)
            setWaiting(data.filter((d) => d.state === 'esperando').length)
            setConfirmed(data.filter((d) => d.state === 'confirmado').length)
            setHierarchyData(buildHierarchy(data))
        }
    }

    const getTickets = async () => {

        const { data, error } = await supabase
            .from("invitations")
            .select("tickets")
            .eq("id", invitationID)
            .maybeSingle();

        if (error) {
            console.error("Error al obtener invitaciones:", error);
        } else {
            setTickets(data.tickets)
        }
    }

    const handleGroupTables = () => {
        setWaitingData(hierarchyData?.filter((row) => row.state === 'esperando'))
        setConfirmedData(hierarchyData?.filter((row) => row.state === 'confirmado'))
        setCallededData(hierarchyData?.filter((row) => row.state === 'rechazado'))
        setCreatedData(hierarchyData.filter((c) => c.state === 'creado'))
    }

    const handleFullTable = () => {

        setWaitingData(rowData?.filter((row) => row.state === 'esperando'))
        setConfirmedData(rowData?.filter((row) => row.state === 'confirmado'))
        setCallededData(rowData?.filter((row) => row.state === 'rechazado'))
        setCreatedData(rowData.filter((c) => c.state === 'creado'))
        setIsLoading(false)

    }
    const getNotifications = async () => {
        const { data, error } = await supabase
            .from('guests')
            .select('*')
            .eq('invitation_id', invitationID)
            .order('last_update_date', { ascending: false }) // 👈 ordena descendente

        if (error) {
            console.error('Error al obtener invitados:', error)
            return []
        }
        setNotifications(
            data
                .sort((a, b) => new Date(b.last_update_date) - new Date(a.last_update_date))
        );
    }

    const getType = async () => {
        const { data, error } = await supabase
            .from('invitations')
            .select('type, credits')
            .eq('id', invitationID)
            .maybeSingle()

        if (error) {
            console.error('Error al obtener invitados:', error)
            return
        }


        setCredits(data.credits)
        setOpenCard(data.type === 'open' ? true : false)
        getGuests()
    }

    const getTables = async () => {
        if (invitationID) {
            const { data, error } = await supabase
                .from('tables')
                .select('*')
                .eq('invitation_id', invitationID)

            if (error) {
                console.error('Error al obtener mesas:', error)
                return
            }

            console.log('mesas: ', data)
            setTables(data)
        }
    }

    const exportFlatGuestsToExcel = (rows, fileName = "invitados.xlsx") => {
        // Mapa para resolver nombre de padre rápido
        const guestsMap = new Map(rows.map(g => [g.id, g.name]));

        const excelRows = rows.map(r => ({
            Nombre: r.name ?? "",
            Contacto: r.phone_number ?? "",
            Estado: r.state ?? "",
            Etiqueta: r.tag ?? "",
            Mesa: r.table
                ? (tables?.find(t => t.id === r.table)?.name ?? r.table)
                : "-",
            Prioridad: r.tier ?? "",
            "Es acompañante de": r.companion_id
                ? (guestsMap.get(Number(r.companion_id)) ?? "")
                : "",
        }));

        const ws = XLSX.utils.json_to_sheet(excelRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Invitados");

        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], {
            type:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
        });

        saveAs(blob, fileName);
    };


    const handleCompanions = (id) => {
        const comps = rowData?.filter((row) => row.companion_id === id.toString())
        return comps
    }

    const renderTag = (value) => {
        if (value == null) return "-";
        if (typeof value === "object") return "-"; // o JSON.stringify(value)
        return String(value);
    };

    const formatAbsoluteDate = (isoString) => {
        const d = new Date(isoString);

        const day = d.getUTCDate();          // día absoluto (UTC)
        const monthIndex = d.getUTCMonth();  // 0-11 en UTC
        const year = d.getUTCFullYear();     // año en UTC

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        return `${day} ${months[monthIndex]} ${year}`;
    };

    const onSendInvitation = async (guest) => {
        const guestPatch = {

            state: 'esperando',
            last_action: guest.state,
            last_action_by: true,
            last_update_date: new Date()
        };

        const { data: guestRow, error: guestError } = await supabase
            .from('guests')
            .update(guestPatch)
            .eq('id', guest.id)
            .select('*')
            .maybeSingle();

        if (guestError) throw guestError;
        console.log('Guest actualizado:', guestRow);
        // setOnBubble(true)
        refreshPage()

    }

    const onSedingInvitation = async (guest) => {
        setOnSending(true)
        try {
            const payload = {
                messaging_product: "whatsapp",
                to: guest.phone_number.replace(/^\+/, ""),
                type: "template",
                template: {
                    name: "invitation_v2",
                    language: {
                        code: "es_MX",
                    },
                    components: [
                        {
                            type: "header",
                            parameters: [
                                {
                                    type: "image",
                                    image: {
                                        link: invitation.cover.image.prod,
                                    },
                                },
                            ],
                        },
                        {
                            type: "body",
                            parameters: [
                                {
                                    type: "text",
                                    text: `${invitation.cover.title.text.value} - ${formatAbsoluteDate(invitation.cover.date.value)}`,
                                },
                                {
                                    type: "text",
                                    text: guest.name,
                                },
                            ],
                        },
                        {
                            type: "button",
                            sub_type: "url",
                            index: "0",
                            parameters: [
                                {
                                    type: "text",
                                    text: `${invitation.generals.event.label}/${invitation.generals.event.name}?password=${guest.password}`,
                                },
                            ],
                        },
                    ],
                },
            };

            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/whats`,
                payload
            );
            if (response.data.ok) {
                onUpdateCredits()
                setOnSending(false)
                setOnBubble(true)
                onSendInvitation(guest)

            }

        } catch (error) {
            console.log(error.response?.data || error.message);
            throw error;
        }
    };

    const onUpdateCredits = async () => {
        // 1. Obtener créditos actuales
        const { data, error } = await supabase
            .from('invitations')
            .select('credits')
            .eq('id', invitationID)
            .maybeSingle()

        if (error) {
            console.error('Error al obtener créditos:', error)
            return
        }

        if (!data) {
            console.error('No se encontró la invitación')
            return
        }

        const currentCredits = data.credits ?? 0

        // 2. Validar créditos disponibles
        if (currentCredits <= 0) {
            console.warn('No hay créditos disponibles')
            return
        }

        // 3. Restar un crédito
        const newCredits = currentCredits - 1

        // 4. Guardar créditos actualizados
        const { data: updateCredits, error: updateError } = await supabase
            .from('invitations')
            .update({ credits: newCredits })
            .eq('id', invitationID)
            .select()

        if (updateError) {
            console.error('Error al actualizar créditos:', updateError)
            return
        }

        console.log('update credits: ', updateCredits)

        setCredits(updateCredits[0].credits ?? credits)

        console.log('Créditos actualizados correctamente:', newCredits)
    }

    const addGuestToTable = async (table, guest) => {

        try {
            const { data, error } = await supabase
                .from("guests")
                .update({
                    table: table.id,
                    last_update_date: new Date(), // si tienes este campo en guests
                })
                .eq("id", guest.id)
                .select()
                .maybeSingle();

            if (error) {
                console.error("Error transfiriendo guest:", error.message);
                return null;
            }

            console.log("Guest transferido ✅", data);
            getTables()
            getGuests()

        } catch (err) {
            console.error("Error inesperado:", err);
            return null;
        }

    };

    const handleNotification = (payload) => {
        const title = <strong>Has recibido una respuesta</strong>

        if (payload.state === 'confirmado') {
            api.success({
                message: title,
                description: (
                    <>
                        <strong>{payload.name}</strong> acaba de confirmar su asistencia.
                    </>
                ),
                showProgress: true,
                duration: 10
            })
        } else {
            api.error({
                message: title,
                description: (
                    <>
                        Desafortunadamente <strong>{payload.name}</strong> no podrá asistir.
                    </>
                ),
                showProgress: true,
                duration: 10
            })
        }
    }

    useEffect(() => {
        if (supabase) {
            const channel = supabase
                .channel('upload_dynamic_table')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'guests'
                    },
                    (payload) => {


                        if (payload.new.invitation_id === invitationID) {
                            if (!payload.new.last_action_by) {
                                refreshPage()
                                handleNotification(payload.new)
                            }
                        }

                    }
                )
                .subscribe((status) => {
                    console.log('sub status: ', status)
                })

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [])

    useEffect(() => {
        if (onBubble) {
            setTimeout(() => {
                setOnBubble(false)
            }, 1800);
        }
    }, [onBubble])

    useEffect(() => {
        if (onGroupTable) {
            handleGroupTables()
        } else {
            handleFullTable()
        }
    }, [onGroupTable])

    useEffect(() => {
        getNotifications()
    }, [drawerState])

    useEffect(() => {
        if (invitationID) {
            setIsLoading(false)
            getTickets()
            getNotifications()
            getType()
            getTables()
        }
    }, [invitationID])

    useEffect(() => {
        if (rowData.length > 0) {
            if (onGroupTable) {
                handleGroupTables()
            } else {
                handleFullTable()
            }
        }
    }, [rowData])

    useEffect(() => {
        setCopyTickets(tickets)
    }, [activeTickets])

    useEffect(() => {
        if (onEditTickets) {
            setOnShare(false)
        }
    }, [onEditTickets])

    useEffect(() => {
        if (onShare) {
            setOnEditTickets(false)
        }
    }, [onShare])



    return (
        <>
            {contextHolder}
            <Layout
                style={{
                    position: 'relative',
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'var(--ft-color)',
                }}>
                <HeaderDashboard setMode={setMode} mode={mode} invitation={invitation} />

                <Layout className='build-invitation-layout' style={{
                    marginTop: '65px', paddingBottom: '24px', position: 'relative'
                }} >
                    <div onClick={() => { setOnNotificationCenter(false); setActiveTickets(false) }} style={{
                        width: '100%', height: '100vh',
                        position: 'absolute', backgroundColor: '#FFFFFF40',
                        zIndex: 98,
                        opacity: activeTickets | onSending | onNotificationCenter ? 1 : 0,
                        pointerEvents: activeTickets | onSending | onNotificationCenter ? undefined : 'none',
                    }}></div>


                    <div className='guests-info-container' style={{ padding: screens.xs ? '8px' : '16px' }}>

                        <div className='title-buttons-container'  >

                            <span className='guests-title-page'>Invitados</span>


                            <div onClick={() => setOnSending(false)} className={`edit-tickets-container`} style={{
                                width: onSending ? '190px' : '0px',
                                borderRadius: '99px',
                                height: '40px',
                            }}>

                                {
                                    onSending &&
                                    <div
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                                            boxSizing: 'border-box', padding: '0px 12px', height: '100%', borderRadius: '99px',
                                            cursor: 'pointer',
                                            width: '100%'
                                        }}>
                                        <FaPaperPlane className='paper_flight' />
                                        <span style={{ fontSize: '14px' }}>Enviado invitación </span>
                                    </div>
                                }

                            </div>



                            <div className='gst-buttons-container' >

                                {/* <Button onClick={() => handleGuests(guestsList)}>Handle Guests</Button> */}

                                {
                                    !screens.xs &&
                                    <Tooltip title="Descargables">
                                        <Dropdown
                                            trigger={["click"]}
                                            placement='topRight'
                                            popupRender={() => (
                                                <div style={{ position: "static", width: '250px' }} className="on-transfer-container">
                                                    <span className="on-transfer-label">Descargar lista</span>

                                                    <div className="transfer-mesas-cont">
                                                        <div className="table-transfer-item" style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
                                                            <span>
                                                                Lista de espera
                                                            </span>

                                                            <Button
                                                                onClick={() => exportFlatGuestsToExcel(rowData.filter(r => r.state === "creado"), "Por-invitar.xlsx")}
                                                                style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                                                icon={<MdFileDownload size={16} style={{ marginTop: '4px' }} />} className="primarybutton">
                                                            </Button>

                                                        </div>

                                                        <div className="table-transfer-item" style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
                                                            <span>
                                                                Esperando respuesta
                                                            </span>

                                                            <Button
                                                                onClick={() => exportFlatGuestsToExcel(rowData.filter(r => r.state === "esperando"), "Pendientes.xlsx")}
                                                                style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                                                icon={<MdFileDownload size={16} style={{ marginTop: '4px' }} />} className="primarybutton">
                                                            </Button>

                                                        </div>

                                                        <div className="table-transfer-item" style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
                                                            <span>
                                                                Confirmados
                                                            </span>

                                                            <Button
                                                                onClick={() => exportFlatGuestsToExcel(rowData.filter(r => r.state === "confirmado"), "Confirmados.xlsx")}
                                                                style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                                                icon={<MdFileDownload size={16} style={{ marginTop: '4px' }} />} className="primarybutton">
                                                            </Button>

                                                        </div>

                                                        <div className="table-transfer-item" style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
                                                            <span>
                                                                No asistirán
                                                            </span>

                                                            <Button
                                                                onClick={() => exportFlatGuestsToExcel(rowData.filter(r => r.state === "rechazado"), "Cancelados.xlsx")}
                                                                style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                                                icon={<MdFileDownload size={16} style={{ marginTop: '4px' }} />} className="primarybutton">
                                                            </Button>

                                                        </div>
                                                    </div>

                                                </div>
                                            )}
                                        >
                                            <Button
                                                style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                                icon={<MdFileDownload size={14} style={{ marginTop: '4px' }} />} className="primarybutton">
                                            </Button>
                                        </Dropdown>
                                    </Tooltip>
                                }



                                <Popconfirm
                                    title={openCard ? 'Invitación Púbica' : 'Invitación Privada'}
                                    description={openCard ? "Al aceptar tu invitación será privada, por lo cual solo tus invitados podrán acceder." : "Al aceptar tu invitación será pública, por lo cualquier persona podrá acceder."}
                                    onConfirm={openCard ? () => onSaveNewTickets('closed') : () => onSaveNewTickets('open')}
                                    placement="bottomLeft"
                                    okText="Continuar"
                                    cancelText="Cancelar"
                                    style={{ width: '400px' }}
                                    id="popup-confirm"
                                >
                                    {
                                        openCard ?
                                            <Button
                                                style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                                icon={<HiLockOpen />} className="primarybutton">
                                                Pública
                                            </Button>
                                            : <Button
                                                style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                                icon={<HiLockClosed />} className="primarybutton">
                                                Privada
                                            </Button>
                                    }

                                </Popconfirm>


                                {
                                    !screens.xs &&
                                    <Tooltip title="Mapa de mesas">
                                        <Button
                                            onClick={() => sethandleTables(true)}
                                            style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                            icon={<FaChair size={12} />} className="primarybutton">
                                        </Button>
                                    </Tooltip>
                                }




                                {
                                    !screens.xs &&
                                    <Tooltip title="Novedades">
                                        <Button className='primarybutton' onClick={() => setOnNotificationCenter(true)} icon={<IoNotifications size={12} />} ></Button>
                                    </Tooltip>

                                }


                                {
                                    !screens.xs &&


                                    <Button
                                        onMouseEnter={() => setOnNewGuest(true)} onMouseLeave={() => setOnNewGuest(false)}
                                        icon={<FaPlus size={12} />}
                                        style={{ borderRadius: '99px', width: onNewGuest ? '161px' : '32px', transition: 'all 0.55s ease' }}
                                        className='primarybutton--active' onClick={() => setDrawerState({
                                            currentGuest: null,
                                            onEditGuest: false,
                                            companions: [],
                                            visible: true
                                        })}>
                                        {
                                            onNewGuest ? "Nuevo invitado" : ""
                                        }
                                    </Button>
                                }







                            </div>
                        </div>

                        <Tabs
                            style={{ width: '100%', marginTop: '24px' }}
                            type="card"
                            activeKey={activeKey}
                            onChange={setActiveKey}
                            items={items}
                            tabBarExtraContent={
                                openCard || screens.xs ? <></> :
                                    <Segmented
                                        options={['Individual', 'Grupo']}
                                        onChange={(e) => setOnGroupTable(e === 'Grupo' ? true : false)}
                                    />
                            }
                        />

                    </div>

                    <div className={onBubble ? 'ticket_bubble' : 'hide_bubble'}>-1 crédito</div>

                    <Tooltip title={!activeTickets && <span style={{ color: '#FFF' }}>{`${(waiting + confirmed)} / ${tickets} Pases`}</span>} color="#6D3CFA">
                        <div
                            onClick={() => setActiveTickets(true)}
                            // onClick={() => setOnBubble(true)}
                            onMouseEnter={() => setOnTickets(true)} onMouseLeave={() => setOnTickets(false)}
                            style={{ bottom: screens.xs ? '10px' : '30px', right: screens.xs ? '10px' : '30px' }}
                            className={`tickets_button ${activeTickets ? 'tickets_button_active' : ''}`}>
                            {!activeTickets && (
                                <>
                                    <Progress
                                        showInfo={false}
                                        status="active"
                                        type="circle"
                                        percent={((waiting + confirmed) * 100) / tickets}
                                        size={80}
                                        strokeWidth={12}
                                        strokeColor={"#6D3CFA"}
                                    />

                                    {!onTickets ? (
                                        <IoTicket size={28} style={{ position: "absolute", color: "#6D3CFA" }} />
                                    ) : (
                                        <FaPlus size={28} style={{ position: "absolute", color: "#6D3CFA" }} />
                                    )}
                                </>
                            )}

                            {
                                activeTickets && (
                                    <div onClick={(e) => e.stopPropagation()} className='active_tickets_cont'>
                                        <div className='active_t_row' style={{ justifyContent: 'space-between', }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                <LuSettings2 size={18} />
                                                <span className='active_t_title'>  Control</span>
                                            </div>
                                            <Button icon={<GoChevronDown style={{ marginTop: '6px' }} size={18} />} type='text' onClick={() => setActiveTickets(false)}></Button>
                                        </div>


                                        <div className='edit-tickets-buttons-container'>

                                            <div className='edit-tickets-dash'>
                                                <div className='active_t_row' style={{ justifyContent: 'space-between' }}>
                                                    <span style={{ fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px' }}>Total de pases</span>

                                                </div>
                                                <div className='dash-row-pie' style={{ gap: '12px' }}>
                                                    <Input onChange={(e) => {
                                                        const onlyNumbers = e.target.value.replace(/\D/g, ''); // elimina todo lo que no sea número
                                                        setCopyTickets(Number(onlyNumbers)); // convierte a número
                                                    }} value={copyTickets} style={{
                                                        maxWidth: '100%', maxHeight: '100px', borderRadius: '99px', flex: 1, textAlign: 'center', fontSize: '18px', fontWeight: 800,
                                                    }} />

                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0px' }}>
                                                        <Button onClick={() => setCopyTickets(copyTickets - 1)} icon={<FiMinus style={{ marginTop: '2px', }} />} className='primarybutton' style={{ width: '40px', maxHeight: '32px', border: '1px solid #ebebeb', borderRadius: '99px 0px 0px 99px', flex: '1' }}></Button>
                                                        <Button onClick={() => setCopyTickets(copyTickets + 1)} icon={<IoMdAdd style={{ marginTop: '2px', }} />} className='primarybutton' style={{ width: '40px', maxHeight: '32px', border: '1px solid #ebebeb', borderRadius: '0px 99px 99px 0px', flex: '1' }}></Button>
                                                        <Button onClick={() => onHandleTickets(copyTickets)} className="save_tickets" icon={<FaCheck size={10} style={{ color: '#FFF', marginBottom: '1px' }} />}
                                                            style={{
                                                                maxHeight: '32px', maxWidth: '32px', borderRadius: '99px', marginLeft: '6px',
                                                                backgroundColor: '#6D3CFA'
                                                            }}></Button>
                                                    </div>

                                                </div>



                                            </div>

                                            <div className='edit-tickets-dash'>
                                                <span style={{ fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px' }}>Distribución</span>
                                                <div className='dash-row-pie'>
                                                    <div className='pie_cont' >
                                                        <Pie data={chartData} options={options} />
                                                    </div>
                                                    <div className='pie_cols'>
                                                        <div className='pie_row'>
                                                            <div style={{ backgroundColor: '#6D3CFA' }} className='pie_dot'></div>
                                                            <span>Confirmados ({confirmed})</span>
                                                        </div>

                                                        <div className='pie_row'>
                                                            <div style={{ backgroundColor: '#6D3CFA50' }} className='pie_dot'></div>
                                                            <span>Esperando ({waiting})</span>
                                                        </div>

                                                        {
                                                            type === 'closed' &&
                                                            <div className='pie_row'>
                                                                <div style={{ backgroundColor: '#6D3CFA20' }} className='pie_dot'></div>
                                                                <span>Disponibles ({tickets - (waiting + confirmed)})</span>
                                                            </div>
                                                        }

                                                    </div>
                                                </div>

                                            </div>

                                        </div>

                                        <div className='edit-tickets-buttons-container'>

                                            <div className='edit-tickets-dash'>
                                                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span style={{ fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px' }}>Creditos</span>

                                                </div>

                                                <div className='dash-row-pie'>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                                        <Progress
                                                            type="dashboard"
                                                            steps={10}
                                                            percent={(credits * 100) / 300}
                                                            strokeWidth={10}
                                                            strokeColor={'#6D3CFA'}
                                                            trailColor='#F5F3F2'
                                                            showInfo={false}
                                                        />
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0px', position: 'absolute' }}>
                                                            <span style={{ fontWeight: 600, fontSize: '22px', lineHeight: 1 }}>{credits}</span>
                                                            <span style={{ fontSize: '8px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px' }}>Disponibles</span>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column', fontSize: '13px' }}>
                                                        <span><b>¿Qué son los créditos?</b></span>
                                                        <span>Cada invitación enviada usa 1 crédito y puedes recargar cuando lo necesites.</span>

                                                        {/* <Button icon={<FaCoins />} type='primary' style={{ fontSize: '12px', marginTop: '12px' }}>Recargar credtios</Button> */}
                                                    </div>

                                                </div>

                                            </div>

                                        </div>
                                    </div>
                                )
                            }
                        </div>
                    </Tooltip>
                </Layout>

                <div
                    style={{
                        width: onNotificationCenter ? '450px' : '0px',
                        height: onNotificationCenter ? '100vh' : '0px',
                        borderRadius: onNotificationCenter ? '16px' : '99px',
                        top: onNotificationCenter ? 0 : 85,
                        right: onNotificationCenter ? 20 : 50,
                        zIndex: 999,
                        // border:'1px solid'
                    }}
                    onClick={() => setOnNotificationCenter(!onNotificationCenter)}
                    className={`notifications_center_cont ${onNotificationCenter ? 'not_center_active' : 'not_center_inactive'}`}>
                    {
                        onNotificationCenter &&
                        <div className='notification_container'>
                            {/* <Row style={{ gap: '8px', padding: '12px' }} align={'middle'} justify={'center'} gutter={'8px'}>
                                                <IoMdNotifications style={{ color: '#6D3CFA' }} size={20} />
                                                <span style={{
                                                    fontSize: '18px', fontWeight: 500
                                                }}>Novedades</span>
                                            </Row> */}

                            <div style={{
                                maxHeight: '100%', overflowY: 'auto', padding: '6px', boxSizing: 'border-box',
                                display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column', width: '100%', gap: '20px'
                            }}>
                                {
                                    notifications.map((not, index) => (
                                        <NotificationCard key={index} noti={not} guests={rowData} refreshPage={refreshPage} />
                                    ))
                                }
                            </div>
                        </div>

                    }
                </div>

                <FooterApp></FooterApp>

            </Layout >


            <Drawer
                onClose={() => sethandleTables(false)}
                open={handleTables}
                placement='left'
                width="95%"
                height="100%"
                title="Mapa de mesas"
                style={{ borderRadius: '0px 24px 24px 0px', maxWidth: '1450px' }}
                styles={{
                    header: {
                        backgroundColor: 'red',
                        display: 'none'
                    },
                    body: {
                        padding: 0,
                    }
                }}
            >
                <TablesPage invitationID={invitationID} />
            </Drawer>

            <NewGuestDrawer rowData={rowData} invitationID={invitationID} ticketsFree={tickets} setDrawerState={setDrawerState} available={tickets - (confirmed + waiting)} refreshPage={refreshPage} drawerState={drawerState} />
        </>
    )
}
