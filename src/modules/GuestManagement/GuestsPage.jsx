import { Badge, Button, Dropdown, Input, Layout, Popconfirm, message, Tooltip, Tabs, Progress, Drawer, Segmented, Table, notification } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Legend, } from 'chart.js';
import { IoIosAddCircleOutline, IoIosCheckmarkCircleOutline, IoIosCloseCircleOutline, IoMdAdd, } from 'react-icons/io';
import { FooterApp } from '../Footer/FooterApp';
import { supabase } from '../../lib/supabase';
import { FaCheck, FaPaperPlane, FaPlus, FaRegCopy, } from 'react-icons/fa';
import { AiOutlineClockCircle, } from 'react-icons/ai';
import { FiArrowUpRight, FiMinus } from 'react-icons/fi';
import { NotificationCard } from '../../components/NotificationCard/NotificationCard';
import { IoChevronDownSharp, IoTicket, } from 'react-icons/io5';
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
import { CreditsComponent } from '../../components/Payment/Credits/Credits';
import { useSearchParams } from 'react-router-dom';
import { AArrowUp, ArrowUpRight, Check, CheckCheck, CirclePlus, CircleUserRound, Clock, Copy, Download, LockKeyhole, LockKeyholeOpen, MailWarning, MessageCircle, Pin, Plus, PlusCircle, QrCode, Search, Send, Tag, TextAlignJustify, X } from 'lucide-react';
import { GuestsCRUD } from '../../components/Create/GuestsCRUD';
import { useTranslation } from 'react-i18next';
import { WhatsappMessages } from './WhatsappMessages/WhatsappMessages'
import { useLia } from '../../context/LiaContext';

const { useBreakpoint } = Grid;




ChartJS.register(ArcElement, Legend);

export default function GuestsPage() {

    const { t } = useTranslation()

    const translateState = (value) => ({
        creado: t('guests.state_creado'),
        esperando: t('guests.state_esperando'),
        confirmado: t('guests.state_confirmado'),
        asistente: t('guests.state_asistente'),
        rechazado: t('guests.state_rechazado'),
    })[value] ?? value

    const screens = useBreakpoint();
    const [confirmed, setConfirmed] = useState(0)
    const [waiting, setWaiting] = useState(0)
    const [tickets, setTickets] = useState(0)
    const [onTickets, setOnTickets] = useState(false)
    const [activeTickets, setActiveTickets] = useState(false)
    const [api, contextHolder] = notification.useNotification();
    const [onNotificationCenter, setOnNotificationCenter] = useState(false)
    const [onEditTickets, setOnEditTickets] = useState(false)
    const [drawerState, setDrawerState] = useState({
        currentGuest: null,
        onEditGuest: false,
        companions: [],
        visible: false
    });


    const [openCard, setOpenCard] = useState(null)
    const [onShare, setOnShare] = useState(false)
    const [copyTickets, setCopyTickets] = useState(null)
    const [handleTables, sethandleTables] = useState(false)
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 750)
    const [onGroupTable, setOnGroupTable] = useState(false)
    const [rowData, setRowData] = useState([]);
    const [waitingData, setWaitingData] = useState([])
    const [confirmedData, setConfirmedData] = useState([])
    const [callededData, setCallededData] = useState([])
    const [createdData, setCreatedData] = useState([])
    const [notifications, setNotifications] = useState([])
    const [tables, setTables] = useState([])
    const [onBubble, setOnBubble] = useState(false)
    const [showMobileMessages, setShowMobileMessages] = useState(false)
    const [onSending, setOnSending] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [hierarchyData, setHierarchyData] = useState([])
    const [expandedRowKeys, setExpandedRowKeys] = useState([]);
    const [credits, setCredits] = useState(0)
    const [activeKey, setActiveKey] = useState('confirmado');
    const [invitation, setInvitation] = useState(null)
    const [searchParams] = useSearchParams();
    const [name, setName] = useState(null)
    const id = searchParams.get("id");
    const [messagesDispatch, setMessagesDispatch] = useState([])
    const [searchUser, setSearchUser] = useState(null)
    const [activeSearcher, setActiveSearcher] = useState(false)
    const [localTags, setLocalTags] = useState([])
    const [filterTag, setFilterTag] = useState(null)
    const [filterTable, setFilterTable] = useState(null)
    const [filterTier, setFilterTier] = useState(null)
    const [filterType, setFilterType] = useState(null)
    const [filterSide, setfilterSide] = useState(null)
    const [owners, setOwners] = useState(null)
    const [url_image, setUrl_image] = useState(null)
    const [plan, setPlan] = useState(null)
    const [conversations, setConversations] = useState([])
    const [unAnswer, setUnAnswer] = useState(0)

    const { uiAction, clearUiAction } = useLia()

    useEffect(() => {
        if (!uiAction) return
        switch (uiAction.type) {
            case 'filter_guests':
                setSearchUser(uiAction.payload?.query ?? '')
                setActiveSearcher(true)
                break
            case 'filter_by_state':
                setActiveKey(uiAction.value)
                break
            case 'open_guest_form':
                setDrawerState({ currentGuest: null, onEditGuest: true, companions: [], visible: true })
                break
            case 'open_guest_detail': {
                const guest = rowData.find(g =>
                    g.phone_number === uiAction.value ||
                    g.name?.toLowerCase().includes((uiAction.value ?? '').toLowerCase())
                )
                if (guest) setDrawerState({ currentGuest: guest, onEditGuest: false, companions: guest.children ?? [], visible: true })
                break
            }
            default:
                break
        }
        clearUiAction()
    }, [uiAction])


    const openColumns = useMemo(() => ([
        {
            title: t('guests.col_name'),
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

                        <Tooltip title={t('guests.tooltip_open')}>
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
            title: t('guests.col_contact'),
            dataIndex: "phone_number",
            key: "phone_number",
            width: 160,
            render: (value) => phoneFormatter(value),
        },

        {
            title: t('guests.col_state'),
            dataIndex: "state",
            key: "state",
            render: (value) => (
                <div className="tag-container">
                    <span className={`new-table-tag state-${value}`}>
                        {translateState(value)}
                    </span>
                </div>
            ),
        },

        {
            title: t('guests.col_tag'),
            dataIndex: "tag",
            key: "tag",
            width: 160,
            render: (value) => (
                <div className="tag-container">
                    <Tooltip>
                        <span className={`new-table-tag`}>
                            {renderTag(value)}
                        </span>
                    </Tooltip>
                </div>
            ),
        },

        {
            title: t('guests.col_table'),
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
            title: t('guests.col_priority'),
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
            title: t('guests.col_actions'),
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

                if ((state === "confirmado" || state === "asistente") && !table) {
                    return (
                        <Dropdown
                            trigger={["click"]}
                            placement="topRight"
                            popupRender={() => (
                                <div style={{ position: "static" }} className="on-transfer-container">
                                    <span className="on-transfer-label">{t('guests.select_table')}</span>

                                    <div className="transfer-mesas-cont">
                                        {tables.map((tb, index) => (
                                            <div
                                                onClick={() => addGuestToTable(tb, record)}
                                                key={index}
                                                className="table-transfer-item"
                                            >
                                                <div style={{ alignSelf: "stretch", display: "flex", alignItems: "center" }}>
                                                    <span>
                                                        {tb.name ? `#${tb.number} - ${tb.name}` : `${t('guests.table_prefix')} #${tb.number}`}
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
                                            {t('guests.view_map')}
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
                                {t('guests.btn_assign')}
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
            title: t('guests.col_name'),
            dataIndex: "name",
            key: "name",
            fixed: "left",
            width: screens.xs ? 170 : 200,
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


                        <Tooltip title={t('guests.tooltip_open')}>
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
            title: t('guests.col_contact'),
            dataIndex: "phone_number",
            key: "phone_number",
            width: 160,
            render: (value) => phoneFormatter(value),
        },

        {
            title: t('guests.col_state'),
            dataIndex: "state",
            key: "state",
            width: 160,
            render: (value) => (
                <div className="tag-container">
                    <span className={`new-table-tag state-${value}`}>
                        {/* {handleIcon(value)}  */}
                        {translateState(value)}
                    </span>
                </div>
            ),
        },

        {
            title: t('guests.col_password'),
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
                    <Tooltip title={t('guests.tooltip_copy_password')}>
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
            title: t('guests.col_magic_link'),
            key: "link",
            width: 160,
            render: (_, record) => {
                const url = `https://www.iattend.events/${invitation?.generals?.event?.label}/${name}?password=${record.password}`;
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
                            www.iattend...
                        </span>
                        <Tooltip title={t('guests.tooltip_copy_magic_link')}>
                            <Button
                                onClick={() => handleShare(url)}
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
            title: t('guests.col_tag'),
            dataIndex: "tag",
            key: "tag",
            width: 160,
            render: (value) => (
                <div className="tag-container">
                    <Tooltip title={isTagLong(value) ? renderTagFull(value) : ''}>
                        <span className={`new-table-tag`}>
                            {renderTag(value)}
                        </span>
                    </Tooltip>

                </div>
            ),
        },

        {
            title: t('guests.col_table'),
            dataIndex: "table",
            key: "table",
            width: 180,
            render: (value) => (
                <div className="tag-container">
                    <span className="new-table-tag">
                        {value ? tables?.find((tb) => tb.id === value)?.name ?? "-" : "-"}
                    </span>
                </div>
            ),
        },

        {
            title: t('guests.col_category'),
            dataIndex: "type",
            key: "type",
            width: 120,
            render: (value) => (
                <div className="tag-container">
                    <span className="new-table-tag">
                        {value ? handleTypes(value) : "-"}
                    </span>
                </div>
            ),
        },

        {
            title: t('guests.col_priority'),
            dataIndex: "tier",
            key: "tier",
            width: 140,
            // fixed: screens.xs ? undefined : "right",
            render: (value) => (
                <div style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <Tooltip title={handlePriority(value)}>
                        <div className="tag-container" style={{ width: '80%' }}>
                            <span
                                style={{ width: "100%", justifyContent: "center" }}
                                className={`new-table-tag tier-${value}`}
                            >
                                {value ?? "-"}
                            </span>
                        </div>
                    </Tooltip>
                </div>
            ),
        },

        {
            title: t('guests.col_actions'),
            key: "send",
            width: plan !== 'pro' ? 180 : 160,
            minWidth: plan !== 'pro' ? 180 : 160,
            fixed: screens.xs ? undefined : "right",
            render: (_, record) => {
                const { state, table, phone_number } = record;

                if (state === "creado") {
                    return (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                                width: "100%",
                            }}
                        >
                            <Tooltip placement='topRight'

                                title={plan !== 'pro' ? '' : !/^\+52\d+/.test(phone_number) ? t('guests.tooltip_national_only') : ""} color="var(--brand-color-500)">
                                <Button
                                    disabled={
                                        !/^\+52\d+/.test(phone_number) || credits <= 0 || plan !== 'pro'
                                    }
                                    onClick={() => onSedingInvitation(record, false)}
                                    className={`${plan !== 'pro' ? 'primarybutton--transparent pro_badge' : 'primarybutton--active'}`}
                                    icon={<Send size={14} />}
                                    style={{ flex: plan !== 'pro' ? 1 : 0, maxHeight: 30, justifyContent: 'flex-start', borderRadius: 99 }}
                                >
                                    {t('guests.btn_send')}
                                </Button>
                            </Tooltip>

                            <Tooltip placement='bottomLeft' title={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><FaCheck size={12} /><span>{t('guests.tooltip_mark_invited')}</span></div>} color="var(--brand-color-500)">
                                <Button
                                    onClick={() => onSendInvitation(record)}
                                    className="primarybutton--active"
                                    icon={<Check size={14} style={{ marginTop: '2px' }} />}
                                    style={{ minWidth: 30, maxWidth: 30, maxHeight: 30 }}
                                />
                            </Tooltip>
                        </div>
                    );
                }

                if (state === "esperando") {
                    return (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                                width: "100%",
                            }}
                        >
                            {handleMessageStatus(record, dispatchMap[record.id]?.status ?? 'undefined')}
                        </div>

                    );
                }

                if ((state === "confirmado" || state === 'asistente') && !table) {
                    return (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                                width: "100%",
                            }}
                        >
                            <Dropdown
                                trigger={["click"]}
                                placement="topRight"
                                popupRender={() => (
                                    <div style={{ position: "static" }} className="on-transfer-container">
                                        <span className="on-transfer-label">{t('guests.select_table')}</span>

                                        <div className="transfer-mesas-cont scroll-invitation" style={{ maxHeight: '360px' }}>
                                            {tables.map((tb, index) => (
                                                <div
                                                    onClick={() => addGuestToTable(tb, record)}
                                                    key={index}
                                                    className="table-transfer-item"

                                                >
                                                    <div style={{ alignSelf: "stretch", display: "flex", alignItems: "center" }}>
                                                        <span>
                                                            {tb.name ? `#${tb.number} - ${tb.name}` : `${t('guests.table_prefix')} #${tb.number}`}
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
                                                {t('guests.view_map')}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            >
                                <Button
                                    className="primarybutton--active"
                                    icon={<RiArrowRightDoubleLine size={16} style={{ marginTop: 2 }} />}
                                    style={{ flex: 1, maxWidth: '120px', maxHeight: 30, borderRadius: 99 }}
                                >
                                    {t('guests.btn_assign')}
                                </Button>
                            </Dropdown>
                        </div>

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
    ]), [rowData, onGroupTable, expandedRowKeys, name, messagesDispatch]);

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

    const filteredGuests = (data = []) => {
        return data.filter((guest) => {
            const name = guest.name?.toLowerCase() || "";
            const phone = guest.phone_number?.toString() || "";
            const search = searchUser?.toLowerCase() || "";

            const matchesSearch =
                !search ||
                name.includes(search) ||
                phone.includes(searchUser);

            const matchesTag =
                !filterTag ||
                guest.tag === filterTag;

            const matchesTable =
                filterTable === null
                    ? true
                    : filterTable === 'no-table'
                        ? guest.table === null
                        : guest.table === filterTable;

            const matchesSide =
                !filterSide ||
                guest.side === filterSide;

            const matchesTier =
                !filterTier ||
                guest.tier === filterTier;

            const matchesType =
                !filterType ||
                guest.type === filterType;


            return matchesSearch && matchesTag && matchesTable && matchesTier && matchesType && matchesSide;
        });
    };

    const items = useMemo(() => ([
        {
            label: screens.xs ? <Clock size={14} /> : `${t('guests.tab_waiting')} (${filteredGuests(createdData).length})`,
            key: "creado",
            children: (
                <Table
                    className='table_container'
                    size='small'
                    {...tableProps}
                    loading={isLoading}
                    dataSource={filteredGuests(createdData)}
                />
            ),
        },
        {
            label: screens.xs ? <Send size={14} /> : `${t('guests.tab_sent')} (${filteredGuests(waitingData).length})`,
            key: "esperando",
            children: (
                <Table
                    size='small'
                    {...tableProps}
                    loading={isLoading}
                    dataSource={filteredGuests(waitingData)}
                />
            ),
        },
        {
            label: screens.xs ? <CheckCheck size={14} /> : `${t('guests.tab_confirmed')} (${filteredGuests(confirmedData).length})`,
            key: "confirmado",
            children: (
                <Table
                    size='small'
                    {...tableProps}
                    loading={isLoading}
                    dataSource={filteredGuests(confirmedData)}
                />
            ),
        },
        {
            label: screens.xs ? <X size={14} /> : `${t('guests.tab_rejected')} (${filteredGuests(callededData).length})`,
            key: "rechazado",
            children: (
                <Table
                    size='small'
                    {...tableProps}
                    loading={isLoading}
                    dataSource={filteredGuests(callededData)}
                />
            ),
        },
    ]), [
        createdData,
        waitingData,
        confirmedData,
        callededData,
        tableProps,
        isLoading,
        screens,
        searchUser,
        filterTag,
        filterTable,
        filterTier,
        filterType,
        filterSide
    ]);

    const handleTypes = (type) => {
        switch (type) {
            case 'female': return t('guests.type_female')
            case 'male': return t('guests.type_male')
            case 'child': return t('guests.type_child')
            case 'undefined': return t('guests.type_undefined')
            default: break;
        }
    }


    const handleMessageStatus = (record, status) => {
        switch (status) {
            case 'processing':

                return (
                    <div className='dispatch_message_tag'>
                        {t('guests.msg_processing')}
                    </div>
                )

            case 'sent':

                return (
                    <div className={`new-table-tag state-confirmado dispatch_message_tag`}>
                        <Send size={16} />
                        {t('guests.msg_sent')}
                    </div>
                )

            case 'delivered':

                return (
                    <div className={`new-table-tag state-creado dispatch_message_tag`}>
                        <Check size={16} />
                        {t('guests.msg_delivered')}
                    </div>
                )


            case 'read':

                return (
                    <div className={`new-table-tag state-esperando dispatch_message_tag`}>
                        <CheckCheck size={16} />
                        {t('guests.msg_read')}
                    </div>
                )

            case 'failed':

                return (

                    <Tooltip placement='topRight'

                        title={t('guests.msg_retry_tooltip')} color="var(--brand-color-500)">
                        <Button
                            disabled={
                                !/^\+52\d+/.test(record.phone_number) || credits <= 0
                            }
                            onClick={() => onSedingInvitation(record, true)}
                            className="primarybutton--active"
                            icon={<MailWarning size={16} />}
                            style={{ flex: 1, maxHeight: 30 }}
                        >
                            {t('guests.msg_retry')}
                        </Button>
                    </Tooltip>
                    // <div className='dispatch_message_tag'>

                    //     <MailWarning size={16}/>
                    //     Reintentar
                    // </div>
                )

            default:
                return (
                    <div className={`new-table-tag state-rechazado dispatch_message_tag`}>
                        {t('guests.msg_waiting')}
                    </div>
                )
        }
    }

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
            case 'asistente': return '#6D3CFA'
            case 'rechazado': return '#000000'

            default:
                break;
        }
    }

    const handlePriority = (tier) => {
        switch (tier) {
            case 'A': return t('guests.priority_a')
            case 'B': return t('guests.priority_b')
            case 'C': return t('guests.priority_c')
            case 'D': return t('guests.priority_d')
            default: break;
        }
    }

    // const handleIcon = (value) => {
    //     switch (value) {
    //         case 'esperando': return <div className='icon_cont'>AAA</div>
    //         case 'confirmado': return <div className='icon_cont'><IoIosCheckmarkCircleOutline size={16} /></div>
    //         case 'asistente': return <div className='icon_cont'><IoIosCheckmarkCircleOutline size={16} /></div>
    //         case 'rechazado': return <div className='icon_cont'><IoIosCloseCircleOutline size={16} /></div>
    //         case 'creado': return <div className='icon_cont'><IoIosAddCircleOutline size={16} /></div>
    //         default:
    //             break;
    //     }
    // }

    const phoneFormatter = (params) => {
        const val = typeof params === 'object' && params !== null ? params.value : params;
        if (!val) return "";

        const digits = String(val).replace(/\D/g, "");

        // +52 México (12 dígitos)
        if (digits.length === 12) {
            const country = digits.slice(0, 2);
            const phone = digits.slice(2);
            return `+${country} (${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
        }

        // +1 US/Canadá (11 dígitos)
        if (digits.length === 11) {
            const country = digits.slice(0, 1);
            const phone = digits.slice(1);
            return `+${country} (${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
        }

        // Local sin código (10 dígitos)
        if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }

        return val;
    };

    const copyToClipboard = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            message.success(t('guests.copied'))
        } catch (err) {
            console.error('Error al copiar el texto: ', err);
        }
    };

    const handleShare = async (url) => {
        const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
        if (isMobileDevice && navigator.share) {
            try {
                await navigator.share({
                    title: invitation?.cover?.title?.text?.value ?? 'Evento',
                    text: '¡Te invitamos a un evento especial!',
                    url,
                });
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        }
        await copyToClipboard(url);
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
            .eq("id", id)


        if (error) {
            console.error('Error actualizando:', error)
        } else {
            setOpenCard(newType === 'open' ? true : false)
            message.success(t('guests.state_updated'))

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
            .eq('id', id)            // o usa .eq('mongo_id', '...') si prefieres
            .select('id, tickets')
            .single()

        if (error) {
            console.error(error)
        } else {
            setTickets(data.tickets)
            message.success(t('guests.passes_updated'))
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
            .eq("invitation_id", id)

        if (error) {
            console.error("Error al obtener invitaciones:", error);
        } else {

            setRowData(data)
            setWaiting(data.filter((d) => d.state === 'esperando').length)
            setConfirmed(data.filter((d) => d.state === 'confirmado').length)
            setHierarchyData(buildHierarchy(data))
        }
    }

    const guestsByPhone = useMemo(() =>
        new Map(rowData.map(g => [String(g.phone_number).replace(/\D/g, ''), g.name]))
        , [rowData]);


    const getTickets = async () => {

        const { data, error } = await supabase
            .from("invitations")
            .select("tickets, data")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            console.error("Error al obtener invitaciones:", error);
        } else {
            setTickets(data.tickets)
            setInvitation(data.data)
        }
    }

    const handleGroupTables = () => {
        setWaitingData(hierarchyData?.filter((row) => row.state === 'esperando'))
        setConfirmedData(hierarchyData?.filter((row) => row.state === 'confirmado' || row.state === 'asistente'))
        setCallededData(hierarchyData?.filter((row) => row.state === 'rechazado'))
        setCreatedData(hierarchyData.filter((c) => c.state === 'creado'))
    }

    const handleFullTable = () => {

        setWaitingData(rowData?.filter((row) => row.state === 'esperando'))
        setConfirmedData(rowData?.filter((row) => row.state === 'confirmado' || row.state === 'asistente'))
        setCallededData(rowData?.filter((row) => row.state === 'rechazado'))
        setCreatedData(rowData.filter((c) => c.state === 'creado'))
        setIsLoading(false)

    }
    const getNotifications = async () => {
        const { data, error } = await supabase
            .from('guests')
            .select('*')
            .eq('invitation_id', id)
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
            .select('type, credits, name, tags, owners, url_image, plan')
            .eq('id', id)
            .maybeSingle()

        if (error) {
            console.error('Error al obtener invitados:', error)
            return
        }


        setCredits(data.credits)
        setName(data.name)
        setOpenCard(data.type === 'open' ? true : false)
        getGuests()
        getChats()
        setLocalTags(data.tags)
        setOwners(data.owners)
        setUrl_image(data.url_image)
        setPlan(data.plan)
    }

    const getTables = async () => {
        if (id) {
            const { data, error } = await supabase
                .from('tables')
                .select('*')
                .eq('invitation_id', id)

            if (error) {
                console.error('Error al obtener mesas:', error)
                return
            }

            // console.log('mesas: ', data)
            // console.log('mesas: ', data)
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
        const comps = rowData?.filter((row) => row.companion_id === id)
        return comps
    }

    const renderTag = (value) => {
        if (value == null) return "-";
        if (typeof value === "object") return "-";

        const str = String(value);

        return str.length > 14
            ? str.slice(0, 14) + "..."
            : str;
    };

    const isTagLong = (value) => {
        if (value == null) return "-";
        if (typeof value === "object") return "-";

        const str = String(value);

        return str.length > 14
            ? true
            : false;
    };

    const renderTagFull = (value) => {
        if (value == null) return "-";
        if (typeof value === "object") return "-";

        const str = String(value);

        return str
    }

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
            last_action_by: 'admin',
            last_update_date: new Date().toISOString(),
            invitation_sent_at: new Date().toISOString(),
        };

        const { error: guestError } = await supabase
            .from('guests')
            .update(guestPatch)
            .eq('id', guest.id)
            .select('*')
            .maybeSingle();

        if (guestError) throw guestError;
        // console.log('Guest actualizado:', guestRow);
        // setOnBubble(true)
        refreshPage()

    }

    const onSedingInvitation = async (guest, retry) => {
        setOnSending(true)
        try {
            const payload = {
                invitationId: id,
                guestId: guest.id,
                guestName: guest.name,
                guestPhone: guest.phone_number.replace(/^\+/, ""),

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
                                        link: url_image ?? invitation.cover.image.prod,
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
                                    text: `${invitation?.generals?.event?.label}/${name}?password=${guest?.password}`,
                                },
                            ],
                        },
                    ],
                },
            };

            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/whats`,
                // "http://localhost:4000/api/whats",
                payload
            );
            if (response.data.ok) {
                if (!retry) {
                    onUpdateCredits()
                }
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
            .eq('id', id)
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
            .eq('id', id)
            .select()

        if (updateError) {
            console.error('Error al actualizar créditos:', updateError)
            return
        }

        // console.log('update credits: ', updateCredits)

        setCredits(updateCredits[0].credits ?? credits)

        // console.log('Créditos actualizados correctamente:', newCredits)
    }

    const getChats = async () => {
        // const { data, error } = await supabase.rpc('get_conversations_v2');
        const { data, error } = await supabase.rpc('get_conversations_by_invitation', {
            p_invitation_id: id
        });
        if (error) return
        setConversations(data)
        calculateUnAnswer(data)
    }

    const addGuestToTable = async (table, guest) => {

        try {
            const { error } = await supabase
                .from("guests")
                .update({
                    table: table.id,
                    last_action_by: 'admin',
                    last_update_date: new Date(), // si tienes este campo en guests
                })
                .eq("id", guest.id)
                .select()
                .maybeSingle();

            if (error) {
                console.error("Error transfiriendo guest:", error.message);
                return null;
            }

            // console.log("Guest transferido ✅", data);
            getTables()
            getGuests()

        } catch (err) {
            console.error("Error inesperado:", err);
            return null;
        }

    };

    const handleNotification = (payload) => {
        const title = <strong>{t('guests.notification_title')}</strong>

        if (payload.state === 'confirmado') {
            api.success({
                message: title,
                description: (
                    <>
                        <strong>{payload.name}</strong> {t('guests.notification_confirmed_suffix')}
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
                        {t('guests.notification_rejected_prefix')} <strong>{payload.name}</strong> {t('guests.notification_rejected_suffix')}
                    </>
                ),
                showProgress: true,
                duration: 10
            })
        }
    }

    const getMessagesUpdates = async () => {

        try {
            const { data, error } = await supabase
                .rpc('get_latest_invitation_dispatches', {
                    p_invitation_id: id
                });

            if (error) return

            // console.log('messages updates: ', data)
            setMessagesDispatch(data)
        } catch (error) {
            console.log(error)
        }
    }

    const dispatchMap = useMemo(() => {
        const map = {};

        messagesDispatch.forEach(m => {
            map[m.guest_id] = m;
        });

        return map;
    }, [messagesDispatch]);


    const calculateUnAnswer = (conversations) => {

        let count = 0
        let read = 0

        conversations.forEach(conv => (
            conv.messages.forEach(message => (
                !message.read && message.direction === 'inbound' ? count += 1 : read += 1
                // !message.read ? console.log(message) : null
            ))
        ))
        setUnAnswer(count)
    }


    useEffect(() => {
        if (!supabase || !id) return;

        const channel = supabase
            .channel(`upload_dynamic_table_${id}`)

            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'guests'
                },
                (payload) => {
                    const row = payload.new || payload.old;
                    if (!row) return;

                    if (row.invitation_id === id) {
                        refreshPage();
                        if (row.last_action_by !== 'admin') {
                            handleNotification(row);
                        }
                    }
                }
            )

            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'invitation_message_dispatches'
                },
                (payload) => {
                    const row = payload.new || payload.old;
                    if (!row) return;

                    if (row.invitation_id === id) {
                        // console.log('message status update:', row);
                        getMessagesUpdates()
                        refreshPage();
                        // refreshPage();
                    }

                }
            )

            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'whatsapp_incoming_messages'
                },
                (payload) => {
                    const row = payload.new || payload.old;
                    if (!row) return;
                    getChats();
                    if (!row.read) {
                        api.info({
                            message: <strong>{row.contact_name || row.from_phone}</strong>,
                            description: row.message_body?.slice(0, 80) || 'Nuevo mensaje',
                            showProgress: true,
                            duration: 8,
                        });
                    }
                }
            )

            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'whatsapp_freetext_dispatches'
                },
                (payload) => {
                    const row = payload.new || payload.old;
                    if (!row) return;
                    getChats()

                }
            )

            .subscribe((status) => {
                console.log('sub status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, id]);

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
        const handleResize = () => setIsMobile(window.innerWidth <= 750)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        if (id) {
            setIsLoading(false)
            getTickets()
            getNotifications()
            getType()
            getTables()
            getMessagesUpdates()
        }
    }, [id])

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


    useEffect(() => {
        if (!filterTable && !filterTag && !filterTier && !searchUser && !filterType && !filterSide) {
            setActiveSearcher(false)
        } else {
            setActiveSearcher(true)
        }
    }, [filterTable, filterTag, filterTier, searchUser, filterType, filterSide])





    return (
        <>
            {contextHolder}
            <Layout
                className='guests_main'
                style={{
                    position: 'relative',
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'var(--ft-color)',
                }}>
                <HeaderDashboard mode={'guests'} />

                <Layout className='build-invitation-layout' style={{
                    paddingTop: screens.xs ? '50px' : '65px', paddingBottom: '24px', position: 'relative',
                    boxSizing: 'border-box'
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

                            <div />

                            {
                                !screens.xs &&
                                <div className='col_main_search'>
                                    <div className='search_main_row'>
                                        <div onClick={() => setActiveSearcher((searchUser || filterTable || filterTag || filterTier) ? true : !activeSearcher)} className={`guests_filters_cont ${activeSearcher ? 'active_filter active_cont' : ''}`}>
                                            <div className='icon_cont'>
                                                <Search size={14} />
                                            </div>
                                            <Input onChange={(e) => setSearchUser(e.target.value)} value={searchUser} className='guests_searcher' placeholder={t('guests.search_placeholder')} />
                                        </div>

                                        <div className={`dots_container ${activeSearcher ? 'dots_cont_active' : ''}`}>
                                            <Dropdown
                                                disabled={!activeSearcher}
                                                arrow
                                                popupRender={() => (
                                                    <div className="items_list_guests_tables" >
                                                        {
                                                            localTags.map(i => {
                                                                if (i === "" || i === null)
                                                                    return null

                                                                return (
                                                                    <div onClick={() => setFilterTag((prev) => prev === i ? null : i)} className={`dot_list_item ${filterTag === i ? 'dot_list_item_active' : ''}`} key={i}>{i}</div>
                                                                )
                                                            })
                                                        }
                                                    </div>
                                                )}
                                            >
                                                <div className={`search_dot ${activeSearcher ? 'active_filter' : ''} ${filterTag ? 'acitve_filter_tag' : ''}`}>

                                                    <div className="single_row" style={{ opacity: filterTag ? 1 : 0.3, fontSize: '12px' }}>
                                                        <Tag size={14} />
                                                        {
                                                            activeSearcher &&
                                                            <span>{filterTag ?? t('guests.filter_tag')}</span>
                                                        }
                                                    </div>

                                                </div>
                                            </Dropdown>


                                            <Dropdown
                                                disabled={!activeSearcher}
                                                arrow
                                                popupRender={() => (
                                                    <div className="items_list_guests_tables">
                                                        <div onClick={() => setFilterTable((prev) => prev === "no-table" ? null : "no-table")} className={`dot_list_item ${filterTable === "no-table" ? 'dot_list_item_active' : ''}`} >{t('guests.no_table')}</div>
                                                        {
                                                            tables.map(i => (
                                                                <div onClick={() => setFilterTable((prev) => prev === i.id ? null : i.id)} className={`dot_list_item ${filterTable === i.id ? 'dot_list_item_active' : ''}`} key={i.id}>{i.name ?? t('guests.no_name')}</div>
                                                            ))
                                                        }
                                                    </div>
                                                )}
                                            >
                                                <div className={`search_dot ${activeSearcher ? 'active_filter' : ''} ${filterTable ? 'acitve_filter_tag' : ''}`}>

                                                    <div className="single_row" style={{ opacity: filterTable ? 1 : 0.3, fontSize: '12px' }}>
                                                        <Pin size={14} />
                                                        {
                                                            activeSearcher &&
                                                            <span>{tables?.find(tb => tb.id === filterTable)?.name ?? t('guests.filter_table')}</span>
                                                        }
                                                    </div>

                                                </div>
                                            </Dropdown>

                                            <Dropdown
                                                disabled={!activeSearcher}
                                                arrow
                                                popupRender={() => (
                                                    <div className="items_list_guests">
                                                        {
                                                            ['A', 'B', 'C', 'D'].map(i => (
                                                                <div onClick={() => setFilterTier((prev) => prev === i ? null : i)} className={`dot_list_item ${filterTier === i ? 'dot_list_item_active' : ''}`} key={i}>{i}</div>
                                                            ))
                                                        }
                                                    </div>
                                                )}
                                            >
                                                <div className={`search_dot ${activeSearcher ? 'active_filter' : ''} tier-${filterTier}`}
                                                    style={{ minWidth: '80px' }}>
                                                    <div className="single_row" style={{ opacity: filterTier ? 1 : 0.3, fontSize: '12px' }}>
                                                        <AArrowUp size={16} />
                                                        {
                                                            activeSearcher &&
                                                            <span>{filterTier ?? t('guests.filter_priority')}</span>
                                                        }
                                                    </div>
                                                </div>
                                            </Dropdown>

                                            <Dropdown
                                                disabled={!activeSearcher}
                                                arrow
                                                popupRender={() => (
                                                    <div className="items_list_guests">
                                                        {
                                                            ['female', 'male', 'child', 'undefined'].map(i => (
                                                                <div onClick={() => setFilterType((prev) => prev === i ? null : i)} className={`dot_list_item ${filterType === i ? 'dot_list_item_active' : ''}`} key={i}>{handleTypes(i)}</div>
                                                            ))
                                                        }
                                                    </div>
                                                )}
                                            >
                                                <div className={`search_dot ${activeSearcher ? 'active_filter' : ''} ${filterType ? 'acitve_filter_tag' : ''}`}
                                                    style={{ minWidth: '80px' }}>
                                                    <div className="single_row" style={{ opacity: filterType ? 1 : 0.3, fontSize: '12px' }}>
                                                        <CircleUserRound size={14} />
                                                        {
                                                            activeSearcher &&
                                                            <span>{handleTypes(filterType) ?? t('guests.filter_category')}</span>
                                                        }
                                                    </div>
                                                </div>
                                            </Dropdown>

                                            {
                                                owners?.length > 1 &&
                                                <Dropdown
                                                    disabled={!activeSearcher}
                                                    arrow
                                                    popupRender={() => (
                                                        <div className="items_list_guests">
                                                            {
                                                                owners?.map(i => (
                                                                    <div onClick={() => setfilterSide((prev) => prev === i ? null : i)} className={`dot_list_item ${filterSide === i ? 'dot_list_item_active' : ''}`} key={i}>{i}</div>
                                                                ))
                                                            }
                                                        </div>
                                                    )}
                                                >
                                                    <div className={`search_dot ${activeSearcher ? 'active_filter' : ''} ${filterSide ? 'acitve_filter_tag' : ''}`}
                                                        style={{ minWidth: '80px' }}>
                                                        <div className="single_row" style={{ opacity: filterSide ? 1 : 0.3, fontSize: '12px' }}>
                                                            <CircleUserRound size={14} />
                                                            {
                                                                activeSearcher &&
                                                                <span>{filterSide ?? t('guests.filter_side')}</span>
                                                            }
                                                        </div>
                                                    </div>
                                                </Dropdown>
                                            }

                                        </div>


                                    </div>

                                    <div className='guests_all_list_cont'>

                                    </div>
                                </div>
                            }





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
                                        <span style={{ fontSize: '14px' }}>{t('guests.invitation_sent')}</span>
                                    </div>
                                }

                            </div>



                            <div className='gst-buttons-container' >



                                {
                                    !screens.xs &&

                                    <Dropdown
                                        placement='bottomRight'
                                        popupRender={() => (
                                            <div className="items_list_guests" style={{ minWidth: plan !== 'pro' ? '210px' : 0 }}>


                                                <Dropdown
                                                    trigger={["click"]}
                                                    placement='topRight'
                                                    popupRender={() => (
                                                        <div style={{ position: "static", width: '250px' }} className="on-transfer-container">
                                                            <span className="on-transfer-label">{t('guests.download_title')}</span>

                                                            <div className="transfer-mesas-cont">
                                                                <div className="table-transfer-item" style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
                                                                    <span>
                                                                        {t('guests.tab_waiting')}
                                                                    </span>

                                                                    <Button
                                                                        onClick={() => exportFlatGuestsToExcel(rowData.filter(r => r.state === "creado"), "Por-invitar.xlsx")}
                                                                        style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                                                        icon={<Download size={14} />} className="primarybutton">
                                                                    </Button>

                                                                </div>

                                                                <div className="table-transfer-item" style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
                                                                    <span>
                                                                        {t('guests.download_waiting')}
                                                                    </span>

                                                                    <Button
                                                                        onClick={() => exportFlatGuestsToExcel(rowData.filter(r => r.state === "esperando"), "Pendientes.xlsx")}
                                                                        style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                                                        icon={<Download size={14} />} className="primarybutton">
                                                                    </Button>

                                                                </div>

                                                                <div className="table-transfer-item" style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
                                                                    <span>
                                                                        {t('guests.download_confirmed')}
                                                                    </span>

                                                                    <Button
                                                                        onClick={() => exportFlatGuestsToExcel(rowData.filter(r => r.state === "confirmado" || r.state === "asistente"), "Confirmados.xlsx")}
                                                                        style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                                                        icon={<Download size={14} />} className="primarybutton">
                                                                    </Button>

                                                                </div>

                                                                <div className="table-transfer-item" style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
                                                                    <span>
                                                                        {t('guests.tab_rejected')}
                                                                    </span>

                                                                    <Button
                                                                        onClick={() => exportFlatGuestsToExcel(rowData.filter(r => r.state === "rechazado"), "Cancelados.xlsx")}
                                                                        style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                                                        icon={<Download size={14} />} className="primarybutton">
                                                                    </Button>

                                                                </div>
                                                            </div>

                                                        </div>
                                                    )}
                                                >
                                                    <Button
                                                        style={{ borderRadius: '99px', transition: 'all 0.55s ease', justifyContent: 'flex-start' }}
                                                        icon={<Download size={14} />} className="primarybutton_transparent">
                                                        {t('guests.btn_downloads')}
                                                    </Button>
                                                </Dropdown>


                                                <Button
                                                    onClick={() => sethandleTables(true)}
                                                    style={{ borderRadius: '99px', transition: 'all 0.55s ease', justifyContent: 'flex-start' }}
                                                    icon={<Pin size={14} />} className="primarybutton_transparent">
                                                    {t('guests.table_map')}
                                                </Button>


                                                <Popconfirm
                                                    title={openCard ? t('guests.confirm_public_title') : t('guests.confirm_private_title')}
                                                    description={openCard ? t('guests.confirm_public_desc') : t('guests.confirm_private_desc')}
                                                    onConfirm={openCard ? () => onSaveNewTickets('closed') : () => onSaveNewTickets('open')}
                                                    placement="bottomLeft"
                                                    okText={t('guests.btn_continue')}
                                                    cancelText={t('guests.btn_cancel')}
                                                    style={{ width: '400px' }}
                                                    id="popup-confirm"
                                                >
                                                    {
                                                        openCard ?
                                                            <Button
                                                                style={{ borderRadius: '99px', transition: 'all 0.55s ease', justifyContent: 'flex-start' }}
                                                                icon={<LockKeyholeOpen size={14} />} className="primarybutton_transparent">
                                                                {t('guests.btn_public')}
                                                            </Button>
                                                            : <Button
                                                                style={{ borderRadius: '99px', transition: 'all 0.55s ease', justifyContent: 'flex-start' }}
                                                                icon={<LockKeyhole size={14} />} className="primarybutton_transparent">
                                                                {t('guests.btn_private')}
                                                            </Button>
                                                    }

                                                </Popconfirm>

                                                <Dropdown
                                                    trigger={['click']}
                                                    popupRender={() => (
                                                        <div className="items_list_guests" style={{ minWidth: 280, padding: '18px' }}>
                                                            <span style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.1 }} >{t('guests.scanner_title')}</span>
                                                            <span style={{ fontSize: '12px', fontWeight: 400, lineHeight: 1.1, marginTop: '8px', opacity: '0.6' }} >{t('guests.scanner_subtitle')}</span>

                                                            <div style={{
                                                                display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column', gap: '8px',

                                                            }}>
                                                                <div style={{
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'flex-start', alignSelf: 'stretch',
                                                                    gap: '24px'

                                                                }}>
                                                                    <div style={{
                                                                        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column', gap: '2px',

                                                                    }}>
                                                                        <span style={{ fontSize: '10px', fontWeight: 400, lineHeight: 1.1, opacity: '0.5' }}>{t('guests.scanner_user')}</span>
                                                                        <Button
                                                                            onClick={() => copyToClipboard(String(id).slice(0, 4))}
                                                                            type='text'
                                                                            icon={<Copy size={14} />}
                                                                            style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.1, padding: 0 }}
                                                                        >
                                                                            {invitation?.generals?.event?.name}
                                                                        </Button>
                                                                    </div>

                                                                    <div style={{
                                                                        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column', gap: '2px',

                                                                    }}>

                                                                        <div style={{
                                                                            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column', gap: '2px',

                                                                        }}>
                                                                            <span style={{ fontSize: '10px', fontWeight: 400, lineHeight: 1.1, opacity: '0.5' }}>{t('guests.scanner_password')}</span>
                                                                            <Button
                                                                                onClick={() => copyToClipboard(String(id).slice(0, 4))}
                                                                                type='text'
                                                                                icon={<Copy size={14} />}
                                                                                style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.1, padding: 0 }}
                                                                            >
                                                                                {String(id).slice(0, 4)}
                                                                            </Button>
                                                                        </div>

                                                                    </div>
                                                                </div>

                                                                <span style={{ fontSize: '11px', fontWeight: 400, lineHeight: 1.1, opacity: '0.5' }}>{t('guests.scanner_link')}</span>
                                                                <Button
                                                                    onClick={() => copyToClipboard('https://www.iattend.site/scanner')}
                                                                    type='text'
                                                                    icon={<Copy size={16} />}
                                                                    style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.1, padding: 0 }}
                                                                >
                                                                    https://www.iattend.site/scanner
                                                                </Button>
                                                            </div>


                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', borderTop: '1px solid #ebebeb', paddingTop: '12px', boxSizing: 'border-box' }} />

                                                            <Button
                                                                icon={<ArrowUpRight size={16} />}
                                                                onClick={() => window.open(`https://www.iattend.site/scanner?id=${id}`, '_blank')}
                                                                type='primary'
                                                            >{t('guests.btn_access_scanner')}</Button>
                                                        </div>
                                                    )}
                                                >
                                                    <Button

                                                        disabled={plan !== 'pro' ? true : false}
                                                        style={{ borderRadius: '99px', transition: 'all 0.55s ease', justifyContent: 'flex-start' }}
                                                        icon={<QrCode size={14} />} className={`primarybutton_transparent ${plan !== 'pro' ? 'pro_badge' : ''}`}>
                                                        {t('guests.btn_scanner')}
                                                    </Button>
                                                </Dropdown>


                                            </div>
                                        )}
                                    >
                                        <Button style={{ minWidth: '32px' }} className='primarybutton' icon={<TextAlignJustify size={12} />}>

                                        </Button>
                                    </Dropdown>

                                }

                                {
                                    !screens.xs &&

                                    <Dropdown
                                        trigger={['click']}
                                        placement='bottomLeft'
                                        arrow
                                        popupRender={() => (
                                            <WhatsappMessages id={id} conversations={conversations} guestsByPhone={guestsByPhone} />
                                        )}
                                    >
                                        <Badge count={unAnswer} color='var(--purple-color)' size='large'>
                                            <Button
                                                disabled={plan !== 'pro'}
                                                style={{ minWidth: plan !== 'pro' ? '145px' : '32px', justifyContent: plan !== 'pro' ? 'flex-start' : 'center', padding: plan !== 'pro' ? '12px' : undefined }} className={`primarybutton${plan !== 'pro' ? '_transparent' : ''} ${plan !== 'pro' ? 'pro_badge' : ''}`} icon={<MessageCircle size={12} />} >
                                                {plan !== 'pro' ? 'Mensajes' : ''}
                                            </Button>
                                        </Badge>
                                    </Dropdown>
                                }




                                {
                                    !screens.xs &&

                                    <Button
                                        icon={<Plus size={14} />}
                                        className='primarybutton--active' onClick={() => setDrawerState({
                                            currentGuest: null,
                                            onEditGuest: false,
                                            companions: [],
                                            visible: true
                                        })}>
                                        {t('guests.btn_new_guest')}
                                    </Button>

                                }












                            </div>
                        </div>

                        {screens.xs && (
                            <div style={{ padding: '12px', boxSizing: 'border-box', width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <span style={{ fontFamily: 'Poppins', fontSize: '20px', fontWeight: 600 }}>{t('guests.my_guests')}</span>

                                    <div style={{
                                        display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'
                                    }}>
                                        <Badge count={unAnswer} color='var(--purple-color)' size='large'>
                                            <Button
                                                disabled={plan !== 'pro'}
                                                onClick={() => setShowMobileMessages(v => !v)}
                                                style={{ minWidth: plan !== 'pro' ? '150px' : '32px', justifyContent: plan !== 'pro' ? 'flex-start' : 'center', padding: plan !== 'pro' ? '12px' : undefined }} className={`primarybutton${plan !== 'pro' ? '_transparent' : ''} ${plan !== 'pro' ? 'pro_badge' : ''}`} icon={<MessageCircle size={12} />} >
                                                {plan !== 'pro' ? 'Mensajes' : ''}
                                            </Button>
                                        </Badge>
                                        {showMobileMessages && (
                                            <WhatsappMessages id={id} conversations={conversations} guestsByPhone={guestsByPhone} onMarkRead={(phone) => setConversations(prev => prev.map(conv => conv.phone === phone ? { ...conv, messages: conv.messages.map(m => ({ ...m, read: true })) } : conv))} className='whatsapp_mobile' onClose={() => setShowMobileMessages(false)} />
                                        )}
                                        <Dropdown
                                            popupRender={() => (
                                                <div className="items_list_guests">


                                                    <Dropdown
                                                        trigger={["click"]}
                                                        placement='topRight'
                                                        popupRender={() => (
                                                            <div style={{ position: "static", width: '250px' }} className="on-transfer-container">
                                                                <span className="on-transfer-label">{t('guests.download_title')}</span>

                                                                <div className="transfer-mesas-cont">
                                                                    <div className="table-transfer-item" style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
                                                                        <span>
                                                                            {t('guests.tab_waiting')}
                                                                        </span>

                                                                        <Button
                                                                            onClick={() => exportFlatGuestsToExcel(rowData.filter(r => r.state === "creado"), "Por-invitar.xlsx")}
                                                                            style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                                                            icon={<Download size={14} />} className="primarybutton">
                                                                        </Button>

                                                                    </div>

                                                                    <div className="table-transfer-item" style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
                                                                        <span>
                                                                            {t('guests.download_waiting')}
                                                                        </span>

                                                                        <Button
                                                                            onClick={() => exportFlatGuestsToExcel(rowData.filter(r => r.state === "esperando"), "Pendientes.xlsx")}
                                                                            style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                                                            icon={<Download size={14} />} className="primarybutton">
                                                                        </Button>

                                                                    </div>

                                                                    <div className="table-transfer-item" style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
                                                                        <span>
                                                                            {t('guests.download_confirmed')}
                                                                        </span>

                                                                        <Button
                                                                            onClick={() => exportFlatGuestsToExcel(rowData.filter(r => r.state === "confirmado" || r.state === "asistente"), "Confirmados.xlsx")}
                                                                            style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                                                            icon={<Download size={14} />} className="primarybutton">
                                                                        </Button>

                                                                    </div>

                                                                    <div className="table-transfer-item" style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
                                                                        <span>
                                                                            {t('guests.tab_rejected')}
                                                                        </span>

                                                                        <Button
                                                                            onClick={() => exportFlatGuestsToExcel(rowData.filter(r => r.state === "rechazado"), "Cancelados.xlsx")}
                                                                            style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                                                            icon={<Download size={14} />} className="primarybutton">
                                                                        </Button>

                                                                    </div>
                                                                </div>

                                                            </div>
                                                        )}
                                                    >
                                                        <Button
                                                            style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                                            icon={<Download size={14} />} className="primarybutton_transparent">
                                                            {t('guests.btn_downloads')}
                                                        </Button>
                                                    </Dropdown>

                                                    <Button
                                                        onClick={() => sethandleTables(true)}
                                                        style={{ borderRadius: '99px', transition: 'all 0.55s ease', justifyContent: 'flex-start' }}
                                                        icon={<Pin size={14} />} className="primarybutton_transparent">
                                                        Mapa de mesas
                                                    </Button>


                                                    <Popconfirm
                                                        title={openCard ? t('guests.confirm_public_title') : t('guests.confirm_private_title')}
                                                        description={openCard ? t('guests.confirm_public_desc') : t('guests.confirm_private_desc')}
                                                        onConfirm={openCard ? () => onSaveNewTickets('closed') : () => onSaveNewTickets('open')}
                                                        placement="bottomLeft"
                                                        okText={t('guests.btn_continue')}
                                                        cancelText={t('guests.btn_cancel')}
                                                        style={{ width: '400px' }}
                                                        id="popup-confirm"
                                                    >
                                                        {
                                                            openCard ?
                                                                <Button
                                                                    style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                                                    icon={<LockKeyholeOpen size={14} />} className="primarybutton_transparent">
                                                                    {t('guests.btn_public')}
                                                                </Button>
                                                                : <Button
                                                                    style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                                                    icon={<LockKeyhole size={14} />} className="primarybutton_transparent">
                                                                    {t('guests.btn_private')}
                                                                </Button>
                                                        }

                                                    </Popconfirm>

                                                    <Dropdown
                                                        trigger={['click']}
                                                        popupRender={() => (
                                                            <div className="items_list_guests" style={{ minWidth: 280, padding: '18px' }}>
                                                                <span style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.1 }} >Lector de pases</span>
                                                                <span style={{ fontSize: '12px', fontWeight: 400, lineHeight: 1.1, marginTop: '8px', opacity: '0.6' }} >Compartir información</span>

                                                                <div style={{
                                                                    display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column', gap: '8px',

                                                                }}>
                                                                    <div style={{
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', alignSelf: 'stretch',
                                                                        gap: '24px'

                                                                    }}>
                                                                        <div style={{
                                                                            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column', gap: '2px',

                                                                        }}>
                                                                            <span style={{ fontSize: '10px', fontWeight: 400, lineHeight: 1.1, opacity: '0.5' }}>Usuario</span>
                                                                            <Button
                                                                                onClick={() => copyToClipboard(String(id).slice(0, 4))}
                                                                                type='text'
                                                                                icon={<Copy size={14} />}
                                                                                style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.1, padding: 0 }}
                                                                            >
                                                                                {invitation?.generals?.event?.name}
                                                                            </Button>
                                                                        </div>

                                                                        <div style={{
                                                                            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column', gap: '2px',

                                                                        }}>

                                                                            <div style={{
                                                                                display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column', gap: '2px',

                                                                            }}>
                                                                                <span style={{ fontSize: '10px', fontWeight: 400, lineHeight: 1.1, opacity: '0.5' }}>Contraseña</span>
                                                                                <Button
                                                                                    onClick={() => copyToClipboard(String(id).slice(0, 4))}
                                                                                    type='text'
                                                                                    icon={<Copy size={14} />}
                                                                                    style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.1, padding: 0 }}
                                                                                >
                                                                                    {String(id).slice(0, 4)}
                                                                                </Button>
                                                                            </div>

                                                                        </div>
                                                                    </div>

                                                                    <span style={{ fontSize: '11px', fontWeight: 400, lineHeight: 1.1, opacity: '0.5' }}>Link de acceso</span>
                                                                    <Button
                                                                        onClick={() => copyToClipboard('https://www.iattend.site/scanner')}
                                                                        type='text'
                                                                        icon={<Copy size={16} />}
                                                                        style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.1, padding: 0 }}
                                                                    >
                                                                        https://www.iattend.site/scanner
                                                                    </Button>
                                                                </div>


                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', borderTop: '1px solid #ebebeb', paddingTop: '12px', boxSizing: 'border-box' }} />

                                                                <Button
                                                                    icon={<ArrowUpRight size={16} />}
                                                                    onClick={() => window.open(`https://www.iattend.site/scanner?id=${id}`, '_blank')}
                                                                    type='primary'
                                                                >Acceder al lector</Button>
                                                            </div>
                                                        )}
                                                    >
                                                        <Button

                                                            disabled={plan !== 'pro' ? true : false}
                                                            style={{ borderRadius: '99px', transition: 'all 0.55s ease', justifyContent: 'flex-start' }}
                                                            icon={<QrCode size={14} />} className={`primarybutton_transparent ${plan !== 'pro' ? 'pro_badge' : ''}`}>
                                                            Lector de pases
                                                        </Button>
                                                    </Dropdown>
                                                </div>
                                            )}
                                        >
                                            <Button className='primarybutton' icon={<TextAlignJustify size={12} />}>

                                            </Button>
                                        </Dropdown>
                                    </div>
                                </div>
                                <Input
                                    prefix={<Search size={14} style={{ opacity: 0.4 }} />}
                                    onChange={(e) => setSearchUser(e.target.value)}
                                    value={searchUser}
                                    placeholder={t('guests.search_placeholder')}
                                    style={{ width: '100%', borderRadius: '99px', height: '40px' }}
                                />
                            </div>
                        )}

                        <Tabs
                            style={{ width: '100%', marginTop: '16px', }}
                            type="card"
                            activeKey={activeKey}
                            onChange={setActiveKey}
                            items={items}
                            tabBarExtraContent={
                                openCard || screens.xs ? <Button
                                    icon={<Plus size={14} />}
                                    className='primarybutton--black'
                                    style={{ borderRadius: '12px', marginBottom: '12px', height: '40px' }}
                                    onClick={() => setDrawerState({ currentGuest: null, onEditGuest: false, companions: [], visible: true })}
                                >{t('guests.btn_new')}</Button> :
                                    <Segmented
                                        options={[
                                            { label: t('guests.seg_individual'), value: 'individual' },
                                            { label: t('guests.seg_group'), value: 'group' },
                                        ]}
                                        onChange={(e) => setOnGroupTable(e === 'group')}
                                    />
                            }
                        />

                    </div>

                    <div className={onBubble ? 'ticket_bubble' : 'hide_bubble'}>-1 crédito</div>

                    <Tooltip title={!activeTickets && <span style={{ color: '#FFF' }}>{`${(waiting + confirmed)} / ${tickets} ${t('guests.control_total')}`}</span>} color="#6D3CFA">
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
                                        strokeWidth={8}
                                        strokeColor={"#6D3CFA"}
                                    />

                                    {!onTickets ? (
                                        <IoTicket size={28} style={{ position: "absolute", color: "#6D3CFA" }} />
                                    ) : (
                                        <PlusCircle size={36} style={{ position: "absolute", color: "#6D3CFA" }} />
                                    )}
                                </>
                            )}

                            {
                                activeTickets && (
                                    <div onClick={(e) => e.stopPropagation()} className='active_tickets_cont'>
                                        <div className='active_t_row' style={{ justifyContent: 'space-between', }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                <LuSettings2 size={18} />
                                                <span className='active_t_title'>  {t('guests.control_title')}</span>
                                            </div>
                                            <Button icon={<GoChevronDown style={{ marginTop: '6px' }} size={18} />} type='text' onClick={() => setActiveTickets(false)}></Button>
                                        </div>


                                        <div className='edit-tickets-buttons-container'>

                                            <div className='edit-tickets-dash'>
                                                <div className='active_t_row' style={{ justifyContent: 'space-between' }}>
                                                    <span style={{ fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px' }}>{t('guests.control_total')}</span>

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
                                                <span style={{ fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px' }}>{t('guests.control_distribution')}</span>
                                                <div className='dash-row-pie'>
                                                    <div className='pie_cont' >
                                                        <Pie data={chartData} options={options} />
                                                    </div>
                                                    <div className='pie_cols'>
                                                        <div className='pie_row'>
                                                            <div style={{ backgroundColor: '#6D3CFA' }} className='pie_dot'></div>
                                                            <span>{t('guests.control_confirmed')} ({confirmed})</span>
                                                        </div>

                                                        <div className='pie_row'>
                                                            <div style={{ backgroundColor: '#6D3CFA50' }} className='pie_dot'></div>
                                                            <span>{t('guests.control_waiting')} ({waiting})</span>
                                                        </div>

                                                        {
                                                            type === 'closed' &&
                                                            <div className='pie_row'>
                                                                <div style={{ backgroundColor: '#6D3CFA20' }} className='pie_dot'></div>
                                                                <span>{t('guests.control_available')} ({tickets - (waiting + confirmed)})</span>
                                                            </div>
                                                        }

                                                    </div>
                                                </div>

                                            </div>

                                        </div>

                                        <div className='edit-tickets-buttons-container'>

                                            <CreditsComponent getType={getType} credits={credits} invitationID={id} />

                                        </div>
                                    </div>
                                )
                            }
                        </div>
                    </Tooltip>
                </Layout >

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
                width={isMobile ? '100%' : '95%'}
                height="100%"
                title={isMobile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Button
                            icon={<X size={14} />}
                            onClick={() => sethandleTables(false)}
                            style={{ borderRadius: '99px', minWidth: 32, height: 32, padding: 0 }}
                            className='secondarybutton'
                        />
                        <span style={{ fontSize: 15, fontWeight: 500 }}>Mapa de mesas</span>
                    </div>
                ) : null}
                closable={false}
                push={false}
                style={{ borderRadius: isMobile ? '0px' : '0px 24px 24px 0px', maxWidth: isMobile ? 'none' : '1450px' }}
                styles={{
                    header: {
                        display: isMobile ? 'flex' : 'none',
                        padding: '12px 16px',
                    },
                    body: {
                        padding: 0,
                        height: '100%',
                        overflow: 'hidden',
                    }
                }}
            >
                <TablesPage invitationID={id} />
            </Drawer>
            <GuestsCRUD rowData={rowData} invitationID={id} setDrawerState={setDrawerState} refreshPage={refreshPage} drawerState={drawerState} />
        </>
    )
}
