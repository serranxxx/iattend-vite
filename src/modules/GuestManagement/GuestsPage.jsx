import { Badge, Button, Dropdown, Input, Layout, Popconfirm, message, Tooltip, Tabs, Progress, Drawer, Segmented, Spin } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import { toFirstString } from '../../helpers/invitation/newInvitation';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Legend, } from 'chart.js';
import { IoIosAddCircleOutline, IoIosCheckmarkCircleOutline, IoIosCloseCircleOutline, IoMdAdd, } from 'react-icons/io';
import { FooterApp } from '../Footer/FooterApp';
import { supabase } from '../../lib/supabase';
import { FaCheck, FaPlus, FaRegCopy, } from 'react-icons/fa';
import { AiOutlineClockCircle, } from 'react-icons/ai';
import { FiArrowUpRight, FiMinus } from 'react-icons/fi';
import { NotificationCard } from '../../components/NotificationCard/NotificationCard'
import { UpgradeBanner } from '../../components/Payment/UpgradeBanner/UpgradeBanner';
import { IoTicket, } from 'react-icons/io5';
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
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AArrowUp, ArrowRight, ArrowUpRight, Check, CheckCheck, CirclePlus, CircleUserRound, Clock, Copy, Download, List, LockKeyhole, LockKeyholeOpen, MailWarning, MessageCircle, Pin, Plus, PlusCircle, QrCode, Search, Send, Tag, TextAlignJustify, Tickets, Users, X } from 'lucide-react';
import { GuestsCRUD } from '../../components/Create/GuestsCRUD';
import { GuestAddTiles } from './GuestAddTiles';
import { useTranslation } from 'react-i18next';
import { WhatsappMessages } from './WhatsappMessages/WhatsappMessages'
import { useLia } from '../../context/LiaContext';
import { useDashboardRealtime } from '../../context/DashboardRealtimeContext';
import { POPULAR_LANGUAGES, flagForLanguage } from '../../helpers/services/languageFlags';

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
    const [activeTickets, setActiveTickets] = useState(false)
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
    const [confirmedView, setConfirmedView] = useState('group')
    const [rowData, setRowData] = useState([]);
    const [waitingData, setWaitingData] = useState([])
    const [confirmedData, setConfirmedData] = useState([])
    const [callededData, setCallededData] = useState([])
    const [createdData, setCreatedData] = useState([])
    const [notifications, setNotifications] = useState([])
    const [tables, setTables] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [credits, setCredits] = useState(0)
    const [activeKey, setActiveKey] = useState('confirmado');
    const [invitation, setInvitation] = useState(null)
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [name, setName] = useState(null)
    const id = searchParams.get("id");
    const [messagesDispatch, setMessagesDispatch] = useState([])
    // Guests recién enviados por WhatsApp API en esta sesión, mientras su dispatch
    // real todavía no llega (fetch inmediato o realtime) — evita que se les
    // muestre "envío manual" (el fallback de handleMessageStatus) por error.
    const [pendingApiSends, setPendingApiSends] = useState(() => new Set())
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
    const [invLabel, setInvLabel] = useState(null)
    const [invPhone, setInvPhone] = useState(null)

    const hasPendingInfo = !name || !owners?.length || !invLabel || !invPhone

    const { uiAction, clearUiAction, setCreditSending, setCreditSuccess, clearCreditState } = useLia()
    const { subscribe } = useDashboardRealtime()

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
                if (guest) setDrawerState({ currentGuest: guest, onEditGuest: false, companions: rowData.filter((row) => row.companion_id === guest.id), visible: true })
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
                const isChild = record.__isGroupChild;

                if (isChild) {
                    // ✅ HIJO: sin botones + indent
                    return (
                        <div style={{ paddingLeft: 28, lineHeight: "30px" }}>
                            <span className="guest-name-text">{value}</span>
                        </div>
                    );
                }

                // ✅ PADRE: botón de abrir, en absolute dentro de la fila
                return (
                    <div
                        className="tag-container"
                        style={{ justifyContent: "flex-start", width: "100%", paddingLeft: 32 }}
                    >
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
                                style={{ position: 'absolute', top: 4, left: 0, maxWidth: 24, maxHeight: 24, borderRadius: 99 }}
                            />
                        </Tooltip>

                        <span className="guest-name-text" style={{ textAlign: "left" }}>{value}</span>
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
            width: screens.xs ? 190 : 260,
            render: (value, record) => {
                const isChild = record.__isGroupChild;

                if (isChild) {
                    // ✅ HIJO: sin botones + indent
                    return (
                        <div style={{ paddingLeft: '36px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', minWidth: 0 }}>
                            <BsArrowReturnRight style={{ flexShrink: 0 }} /> <span className="guest-name-text">{value}</span>
                        </div>
                    );
                }

                // ✅ PADRE: botón de abrir, en absolute dentro de la fila
                return (
                    <div
                        className="tag-container"
                        style={{ justifyContent: "flex-start", width: "100%", paddingLeft: 32 }}
                    >


                        <span className="guest-name-text" style={{ textAlign: "left" }}>{value}</span>
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
            width: 120,
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
            width: 120,
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
            width: 140,
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
                            www.iatt...
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
            width: 140,
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
            width: 140,
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
            width: 100,
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
                const isChild = record.__isGroupChild;

                if (isChild) {
                    if (state === "esperando") {
                        return (
                            <div className="tag-container">
                                <span className="new-table-tag companion-tag">
                                    {t('guests.companion_tag')}
                                </span>
                            </div>
                        );
                    }
                    if (!((state === "confirmado" || state === "asistente") && !table)) {
                        return null;
                    }
                    // acompañante confirmado sin mesa: cae al bloque de abajo para poder asignarle mesa
                }

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
                                {enabledExtraLanguages.length === 0 ? (
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
                                ) : (
                                    <Dropdown
                                        trigger={['click']}
                                        disabled={
                                            !/^\+52\d+/.test(phone_number) || credits <= 0 || plan !== 'pro'
                                        }
                                        popupRender={() => renderSendLanguagePopup(record, false)}
                                    >
                                        <Button
                                            disabled={
                                                !/^\+52\d+/.test(phone_number) || credits <= 0 || plan !== 'pro'
                                            }
                                            className={`${plan !== 'pro' ? 'primarybutton--transparent pro_badge' : 'primarybutton--active'}`}
                                            icon={<Send size={14} />}
                                            style={{ flex: plan !== 'pro' ? 1 : 0, maxHeight: 30, justifyContent: 'flex-start', borderRadius: 99 }}
                                        >
                                            {t('guests.btn_send')}
                                        </Button>
                                    </Dropdown>
                                )}
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
    ]), [rowData, name, messagesDispatch]);

    const tableProps = useMemo(() => ({
        rowKey: "id",
        columns: openCard ? openColumns : columns,
        pagination: false,
        scroll: { x: 1400 },
    }), [columns, openColumns, openCard]);

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

    // Deshace el agrupamiento por familia (líder + children) en una lista plana
    // de filas individuales — para contar/filtrar/mostrar por fila, no por grupo.
    const flattenGroups = (groupedData = []) =>
        groupedData.flatMap((g) => [g, ...(g.children || [])]);

    // Cuenta filas individuales (líder + acompañantes), no grupos familiares —
    // para los chips de los tabs, que agrupan con groupByFamilyForStates.
    const countGuestRows = (groupedData = []) =>
        filteredGuests(flattenGroups(groupedData)).length;

    // Vista individual (sin agrupar por familia): se usa cuando hay una
    // búsqueda/filtro activo, para que coincidencias en acompañantes también
    // aparezcan como su propia fila en vez de quedar ocultas dentro de un grupo.
    const flatFilteredGuests = (groupedData = []) =>
        filteredGuests(flattenGroups(groupedData));

    // activeSearcher también queda en true cuando el panel de filtros está
    // simplemente abierto sin ningún valor elegido — para decidir si se
    // muestran las tarjetas agrupadas o las filas individuales necesitamos
    // saber si hay un filtro/búsqueda realmente aplicado, no solo el panel abierto.
    const hasActiveFilters = Boolean(searchUser || filterTag || filterTable || filterTier || filterType || filterSide);

    // (renderGuestCardRow, renderGroupedCards, confirmedFlatData, renderConfirmedByTable
    // e items viven más abajo, después de todos los helpers que sus columnas invocan —
    // ver comentario junto al return())

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
        // Sin dispatch todavía pero enviado por WhatsApp API en esta sesión:
        // se ve como "procesando", nunca como "envío manual".
        const effectiveStatus = status === 'undefined' && pendingApiSends.has(record.id) ? 'processing' : status;

        switch (effectiveStatus) {
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
                        {enabledExtraLanguages.length === 0 ? (
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
                        ) : (
                            <Dropdown
                                trigger={['click']}
                                disabled={
                                    !/^\+52\d+/.test(record.phone_number) || credits <= 0
                                }
                                popupRender={() => renderSendLanguagePopup(record, true)}
                            >
                                <Button
                                    disabled={
                                        !/^\+52\d+/.test(record.phone_number) || credits <= 0
                                    }
                                    className="primarybutton--active"
                                    icon={<MailWarning size={16} />}
                                    style={{ flex: 1, maxHeight: 30 }}
                                >
                                    {t('guests.msg_retry')}
                                </Button>
                            </Dropdown>
                        )}
                    </Tooltip>
                    // <div className='dispatch_message_tag'>

                    //     <MailWarning size={16}/>
                    //     Reintentar
                    // </div>
                )

            default:
                return (
                    <div className={`new-table-tag manual-sent-tag dispatch_message_tag`}>
                        {t('guests.msg_manual')}
                    </div>
                )
        }
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
        if (hasPendingInfo) {
            message.warning('Completa la información pendiente de tu invitación antes de compartir el link.')
            return
        }
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

    // Agrupa por familia (companion_id) solo entre quienes comparten alguno de
    // los `states` pedidos — así, si un acompañante avanza de estado distinto
    // al resto de su familia (ej. declinó mientras los demás confirmaron), se
    // separa del grupo original y se re-agrupa con quien sí comparta su nuevo
    // estado, en vez de quedar atrapado dentro del grupo de otra pestaña.
    const groupByFamilyForStates = (data, states) => {
        const relevant = data.filter((g) => states.includes(g.state));
        const clusters = new Map();

        relevant.forEach((g) => {
            const familyKey = g.companion_id === null ? g.id : Number(g.companion_id);
            if (!clusters.has(familyKey)) clusters.set(familyKey, []);
            clusters.get(familyKey).push(g);
        });

        return Array.from(clusters.values()).map((members) => {
            const principal = members.find((m) => m.companion_id === null);
            const leader = principal ?? members[0];
            const children = members.filter((m) => m.id !== leader.id);
            return {
                ...leader,
                __isGroupChild: false,
                children: children.map((c) => ({ ...c, __isGroupChild: true })),
            };
        });
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
        }
    }



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
            .select('type, credits, name, tags, owners, url_image, plan, label, phone_number')
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
        setLocalTags(data.tags)
        setOwners(data.owners)
        setUrl_image(data.url_image)
        setPlan(data.plan)
        setInvLabel(data.label ?? null)
        setInvPhone(data.phone_number ?? null)
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
        const nowIso = new Date().toISOString();
        const guestPatch = {
            state: 'esperando',
            last_action: guest.state,
            last_action_by: 'admin',
            last_update_date: nowIso,
            invitation_sent_at: nowIso,
        };

        const { error: guestError } = await supabase
            .from('guests')
            .update(guestPatch)
            .eq('id', guest.id)
            .select('*')
            .maybeSingle();

        if (guestError) throw guestError;

        // Al invitar al líder del grupo, sus acompañantes se mueven junto con él
        // en vez de quedarse colgados en Lista de espera hasta moverlos a mano.
        const companionIds = rowData
            .filter((g) => g.companion_id === guest.id)
            .map((g) => g.id);

        if (companionIds.length > 0) {
            const { error: companionsError } = await supabase
                .from('guests')
                .update(guestPatch)
                .in('id', companionIds);

            if (companionsError) throw companionsError;
        }

        refreshPage()

    }

    // Idiomas que el invitado puede ver hoy (instalados y no deshabilitados) —
    // si hay al menos uno, al enviar se le pregunta al organizador en qué
    // idioma quiere que abra el link, en vez de mandar siempre español.
    const enabledExtraLanguages = (invitation?.generals?.languages ?? []).filter(
        (code) => !(invitation?.generals?.disabledLanguages ?? []).includes(code)
    )

    const labelForSendLangCode = (code) => POPULAR_LANGUAGES.find((l) => l.code === code)?.label ?? code

    // Dropdown de envío: un botón real por idioma disponible (no un Menu de
    // antd). Sin idiomas extra no tiene sentido preguntar, ese caso lo maneja
    // el propio botón de envío con un click directo (ver columnas de abajo).
    const renderSendLanguagePopup = (guest, retry) => (
        <div style={{
            background: '#fff', borderRadius: '12px', padding: '6px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '190px',
        }}>
            <Button
                className='primarybutton'
                style={{ justifyContent: 'space-between' }}
                onClick={() => onSedingInvitation(guest, retry, 'es')}
            >
                <span>{flagForLanguage('es')} Enviar en español</span>
                <ArrowRight size={14} />
            </Button>
            {enabledExtraLanguages.map((code) => (
                <Button
                    key={code}
                    className='primarybutton'
                    style={{ justifyContent: 'space-between' }}
                    onClick={() => onSedingInvitation(guest, retry, code)}
                >
                    <span>{flagForLanguage(code)} Enviar en {labelForSendLangCode(code)}</span>
                    <ArrowRight size={14} />
                </Button>
            ))}
        </div>
    )

    const onSedingInvitation = async (guest, retry, lang = 'es') => {
        if (hasPendingInfo) {
            message.warning('Completa la información pendiente de tu invitación antes de enviar.')
            return
        }

        if (!invitation?.cover?.title?.text?.value?.trim()) {
            message.warning(t('guests.warning_no_title'))
            return
        }

        setCreditSending()
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
                                        link: url_image ?? toFirstString(invitation.cover.image.prod),
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
                                    text: `${invitation?.generals?.event?.label}/${name}?password=${guest?.password}${lang && lang !== 'es' ? `&lang=${lang}` : ''}`,
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
                setCreditSuccess()
                // El backend ya insertó el dispatch (status: 'processing') antes de
                // responder — no hay que esperar al realtime para verlo reflejado.
                setPendingApiSends((prev) => new Set(prev).add(guest.id))
                onSendInvitation(guest)
                getMessagesUpdates()

            }

        } catch (error) {
            clearCreditState()
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

        setCredits(updateCredits?.[0]?.credits ?? newCredits)

        // console.log('Créditos actualizados correctamente:', newCredits)
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


    const getMessagesUpdates = async () => {

        try {
            const { data, error } = await supabase
                .rpc('get_latest_invitation_dispatches', {
                    p_invitation_id: id
                });

            if (error) {
                console.error('Error al obtener dispatches de mensajes:', error)
                return
            }

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

    // Ya llegó el dispatch real (fetch inmediato, realtime o refresh de página) —
    // se puede sacar de "pendiente", su status real toma el control desde dispatchMap.
    useEffect(() => {
        setPendingApiSends((prev) => {
            if (prev.size === 0) return prev;
            const next = new Set(prev);
            messagesDispatch.forEach((m) => next.delete(m.guest_id));
            return next.size === prev.size ? prev : next;
        });
    }, [messagesDispatch]);


    useEffect(() => {
        if (!id) return;

        const u1 = subscribe('guests', (payload) => {
            const row = payload.new || payload.old;
            if (!row || String(row.invitation_id) !== String(id)) return;
            refreshPage();
        });

        const u2 = subscribe('invitation_message_dispatches', (payload) => {
            const row = payload.new || payload.old;
            console.log('[GuestsPage] dispatch event received:', row, '| matches this invitation:', row && String(row.invitation_id) === String(id));
            if (!row || String(row.invitation_id) !== String(id)) return;
            getMessagesUpdates();
            refreshPage();
        });

        return () => { u1(); u2(); };
    }, [id]);


    useEffect(() => {
        setCreatedData(groupByFamilyForStates(rowData, ['creado']))
        setWaitingData(groupByFamilyForStates(rowData, ['esperando']))
        setConfirmedData(groupByFamilyForStates(rowData, ['confirmado', 'asistente']))
        setCallededData(groupByFamilyForStates(rowData, ['rechazado']))
        setIsLoading(false)
    }, [rowData])

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

    // A partir de aquí: helpers que invocan columns/openColumns.render(...) de forma
    // síncrona (no vía <Table>, que difiere su propio render a después de que este
    // componente termine de ejecutarse). Por eso deben declararse después de TODOS
    // los helpers que esas columnas puedan llamar (phoneFormatter, handleMessageStatus,
    // onSendInvitation, etc.) — si no, revientan con "Cannot access ... before initialization".

    // "name" queda fijo a la izquierda y "send" (Acciones) fijo a la derecha,
    // igual que el fixed:"left"/"right" que tenían las columnas en el <Table>.
    const stickyClassFor = (colKey) => {
        if (colKey === 'name') return 'guests-card-cell--sticky-left';
        // En mobile no hay espacio para 2 columnas sticky — solo "name" se queda fija.
        if (colKey === 'send' && !screens.xs) return 'guests-card-cell--sticky-right';
        return '';
    };

    // Renderiza una fila de invitado reutilizando exactamente las mismas
    // columnas/render de la tabla (misma información), fuera de un <table>
    // para poder envolver cada grupo en su propia tarjeta con bordes.
    const renderGuestCardRow = (record, cols, extraClassName = '') => {
        const isChildRow = extraClassName === 'guests-card-row--child';

        return (
            <div key={record.id} className={`guests-card-row ${extraClassName}`}>
                {cols.map((col) => (
                    <div
                        key={col.key}
                        className={`guests-card-cell ${stickyClassFor(col.key)}`}
                        style={col.width ? { flex: `0 0 ${col.width}px`, width: col.width } : { flex: '1 1 0%', minWidth: 160 }}
                    >
                        {col.render ? col.render(record[col.dataIndex], record) : record[col.dataIndex]}

                        {!isChildRow && stickyClassFor(col.key) === 'guests-card-cell--sticky-left' && (
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
                                    icon={<FiArrowUpRight size={12} style={{ marginTop: 2 }} />}
                                    style={{ position: 'absolute', top: 16, left: 12, maxWidth: 20, maxHeight: 20, borderRadius: 99, zIndex:99 }}
                                />
                            </Tooltip>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    // Reemplaza el antiguo expand/collapse por chevron: cada grupo (líder +
    // acompañantes) se ve siempre desplegado, envuelto en su propia tarjeta
    // con borde redondeado, para que sea claro dónde empieza y termina.
    const renderGroupedCards = (data, cols) => {
        if (!data || data.length === 0) {
            return <div className="table-group-empty">{t('guests.no_guests')}</div>;
        }

        return (
            <div className="guests-card-list" >
                <div className="guests-card-list-header">
                    {cols.map((col) => (
                        <div
                            key={col.key}
                            className={`guests-card-header-cell ${stickyClassFor(col.key)}`}
                            style={col.width ? { flex: `0 0 ${col.width}px`, width: col.width } : { flex: '1 1 0%', minWidth: 160 }}
                        >
                            {col.title}
                        </div>
                    ))}
                </div>
                {data.map((group) => (
                    <div key={group.id} className="guests-group-card">
                        {renderGuestCardRow(group, cols)}
                        {group.children?.map((child) => renderGuestCardRow(child, cols, 'guests-card-row--child'))}
                    </div>
                ))}
            </div>
        );
    };

    // Vista sin agrupar: cada invitado (líder o acompañante) en su propia
    // fila/tarjeta, sin jerarquía de familia — se usa mientras hay una
    // búsqueda/filtro activo, para que cualquier coincidencia sea visible.
    const renderFlatRows = (data, cols) => {
        if (!data || data.length === 0) {
            return <div className="table-group-empty">{t('guests.no_guests')}</div>;
        }

        return (
            <div className="guests-card-list guests-card-list--flat">
                <div className="guests-card-list-header">
                    {cols.map((col) => (
                        <div
                            key={col.key}
                            className={`guests-card-header-cell ${stickyClassFor(col.key)}`}
                            style={col.width ? { flex: `0 0 ${col.width}px`, width: col.width } : { flex: '1 1 0%', minWidth: 160 }}
                        >
                            {col.title}
                        </div>
                    ))}
                </div>
                {data.map((guest) =>
                    // __isGroupChild se apaga para que la columna "name" no dibuje
                    // el indent/ícono de acompañante — en lista plana todos son iguales.
                    renderGuestCardRow({ ...guest, __isGroupChild: false }, cols, 'guests-card-row--flat')
                )}
            </div>
        );
    };

    // Vista "individual" de Asistencia confirmada: un renglón plano por persona,
    // sin agrupar por familia (líder y acompañantes por igual).
    const confirmedFlatData = useMemo(
        () => rowData.filter((g) => g.state === 'confirmado' || g.state === 'asistente'),
        [rowData]
    );

    // Vista "por mesa" de Asistencia confirmada: solo lectura, agrupada por
    // número de mesa. La asignación/reasignación real sigue viviendo en el
    // mapa de mesas (Drawer de TablesPage).
    const renderConfirmedByTable = () => {
        const guests = filteredGuests(confirmedFlatData);
        const grouped = tables
            .map((tb) => ({
                table: tb,
                guests: guests.filter((g) => g.table === tb.id),
            }))
            .filter((group) => group.guests.length > 0);
        const unassigned = guests.filter((g) => !g.table);

        if (grouped.length === 0 && unassigned.length === 0) {
            return <div className="table-group-empty">{t('guests.no_confirmed_guests')}</div>;
        }

        return (
            <div className="confirmed-by-table-container">
                {grouped.map(({ table, guests: tableGuests }) => (
                    <div key={table.id} className="table-group-card">
                        <div className="table-group-header">
                            <span>
                                {table.name ? `#${table.number} - ${table.name}` : `${t('guests.table_prefix')} #${table.number}`}
                            </span>
                            <span className="table-group-count">{tableGuests.length} / {table.size}</span>
                        </div>
                        {tableGuests.map((g) => (
                            <div key={g.id} className={`table-group-row ${g.companion_id !== null ? 'table-group-row--child' : ''}`}>
                                {g.companion_id !== null && <BsArrowReturnRight />}
                                <span>{g.name}</span>
                            </div>
                        ))}
                    </div>
                ))}

                {unassigned.length > 0 && (
                    <div className="table-group-card">
                        <div
                            className="table-group-header"
                        >
                            <span>{t('guests.no_table_assigned')}</span>
                            <Button
                                onClick={() => sethandleTables(true)}
                                style={{ borderRadius: 99 }}
                                icon={<TbLocationFilled />}
                            >
                                {t('guests.view_map')}
                            </Button>
                        </div>
                        {unassigned.map((g) => (
                            <div key={g.id} className={`table-group-row ${g.companion_id !== null ? 'table-group-row--child' : ''}`}>
                                {g.companion_id !== null && <BsArrowReturnRight />}
                                <span>{g.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const items = useMemo(() => ([
        {
            label: screens.xs ? <Clock size={14} /> : `${t('guests.tab_waiting')} (${countGuestRows(createdData)})`,
            key: "creado",
            children: (
                <Spin spinning={isLoading}>
                    <div className="guests-card-list-scroll">
                        {hasActiveFilters
                            ? renderFlatRows(flatFilteredGuests(createdData), tableProps.columns)
                            : renderGroupedCards(filteredGuests(createdData), tableProps.columns)}
                    </div>
                </Spin>
            ),
        },
        {
            label: screens.xs ? <Send size={14} /> : `${t('guests.tab_sent')} (${countGuestRows(waitingData)})`,
            key: "esperando",
            children: (
                <Spin spinning={isLoading}>
                    <div className="guests-card-list-scroll guests-card-list-scroll--sent">
                        {hasActiveFilters
                            ? renderFlatRows(flatFilteredGuests(waitingData), tableProps.columns)
                            : renderGroupedCards(filteredGuests(waitingData), tableProps.columns)}
                    </div>
                </Spin>
            ),
        },
        {
            label: screens.xs ? <CheckCheck size={14} /> : `${t('guests.tab_confirmed')} (${filteredGuests(confirmedFlatData).length})`,
            key: "confirmado",
            children:
                confirmedView === 'table' ? (
                    renderConfirmedByTable()
                ) : (
                    <Spin spinning={isLoading}>
                        <div className="guests-card-list-scroll">
                            {confirmedView === 'individual' || hasActiveFilters
                                ? renderFlatRows(flatFilteredGuests(confirmedData), tableProps.columns)
                                : renderGroupedCards(filteredGuests(confirmedData), tableProps.columns)}
                        </div>
                    </Spin>
                ),
        },
        {
            label: screens.xs ? <X size={14} /> : `${t('guests.tab_rejected')} (${countGuestRows(callededData)})`,
            key: "rechazado",
            children: (
                <Spin spinning={isLoading}>
                    <div className="guests-card-list-scroll">
                        {hasActiveFilters
                            ? renderFlatRows(flatFilteredGuests(callededData), tableProps.columns)
                            : renderGroupedCards(filteredGuests(callededData), tableProps.columns)}
                    </div>
                </Spin>
            ),
        },
    ]), [
        createdData,
        waitingData,
        confirmedData,
        confirmedFlatData,
        confirmedView,
        tables,
        callededData,
        tableProps,
        isLoading,
        screens,
        searchUser,
        filterTag,
        filterTable,
        filterTier,
        filterType,
        filterSide,
        hasActiveFilters
    ]);




    return (
        <>
            <Layout
                className='guests_main'
                style={{
                    position: 'relative',
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'var(--ft-color)',
                }}>
                <HeaderDashboard
                    mode={'guests'}
                />

                <Layout className='build-invitation-layout' style={{
                    paddingTop: screens.xs ? '50px' : '75px', paddingBottom: '24px', position: 'relative',
                    boxSizing: 'border-box'
                }} >
                    <div onClick={() => { setOnNotificationCenter(false); setActiveTickets(false) }} style={{
                        width: '100%', height: '100vh',
                        position: 'absolute', backgroundColor: '#FFFFFF40',
                        zIndex: 98,
                        opacity: onNotificationCenter ? 1 : 0,
                        pointerEvents: onNotificationCenter ? undefined : 'none',
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








                            <div className='gst-buttons-container' >



                                {
                                    !screens.xs &&
                                    // <Tooltip title={t('guests.send_issues_btn')}>
                                        <Dropdown
                                            trigger={['click']}
                                            placement="bottomRight"
                                            popupRender={() => (
                                                <div className="send-issues-popover">
                                                    <strong className="send-issues-popover-title">{t('guests.send_issues_title')}</strong>
                                                    <p className="send-issues-popover-text">{t('guests.send_issues_intro')}</p>
                                                    <ul className="send-issues-popover-list">
                                                        <li>{t('guests.send_issues_reason_1')}</li>
                                                        <li>{t('guests.send_issues_reason_2')}</li>
                                                        <li>{t('guests.send_issues_reason_3')}</li>
                                                        <li>{t('guests.send_issues_reason_4')}</li>
                                                    </ul>
                                                    <p className="send-issues-popover-text">{t('guests.send_issues_footer')}</p>
                                                </div>
                                            )}
                                        >
                                            <Button className='primarybutton_transparent' icon={<MailWarning size={14} />} style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}>
                                                {t('guests.send_issues_btn')}
                                            </Button>
                                        </Dropdown>
                                    // </Tooltip>
                                }

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





                                {!screens.xs && <Dropdown
                                    trigger={['click']}
                                    placement='bottomRight'
                                    arrow
                                    open={activeTickets}
                                    onOpenChange={setActiveTickets}
                                    popupRender={() => (
                                        <div className='active_tickets_cont'>
                                            <div className='edit-tickets-buttons-container'>

                                                <div className='edit-tickets-dash'>
                                                    <div className='active_t_row' style={{ justifyContent: 'space-between' }}>
                                                        <span style={{ fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px' }}>{t('guests.control_total')}</span>
                                                    </div>
                                                    <div className='dash-row-pie' style={{ gap: '12px' }}>
                                                        <Input onChange={(e) => {
                                                            const onlyNumbers = e.target.value.replace(/\D/g, '')
                                                            setCopyTickets(Number(onlyNumbers))
                                                        }} value={copyTickets} style={{
                                                            maxWidth: '100%', maxHeight: '100px', borderRadius: '99px', flex: 1, textAlign: 'center', fontSize: '18px', fontWeight: 800,
                                                        }} />
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0px' }}>
                                                            <Button onClick={() => setCopyTickets(copyTickets - 1)} icon={<FiMinus style={{ marginTop: '2px' }} />} className='primarybutton' style={{ width: '40px', maxHeight: '32px', border: '1px solid #ebebeb', borderRadius: '99px 0px 0px 99px', flex: '1' }}></Button>
                                                            <Button onClick={() => setCopyTickets(copyTickets + 1)} icon={<IoMdAdd style={{ marginTop: '2px' }} />} className='primarybutton' style={{ width: '40px', maxHeight: '32px', border: '1px solid #ebebeb', borderRadius: '0px 99px 99px 0px', flex: '1' }}></Button>
                                                            <Button onClick={() => onHandleTickets(copyTickets)} className="save_tickets" icon={<FaCheck size={10} style={{ color: '#FFF', marginBottom: '1px' }} />}
                                                                style={{ maxHeight: '32px', maxWidth: '32px', borderRadius: '99px', marginLeft: '6px', backgroundColor: '#6D3CFA' }}></Button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className='edit-tickets-dash'>
                                                    <span style={{ fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px' }}>{t('guests.control_distribution')}</span>
                                                    <div className='dash-row-pie'>
                                                        <div className='pie_cont'>
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
                                                            {type === 'closed' &&
                                                                <div className='pie_row'>
                                                                    <div style={{ backgroundColor: '#6D3CFA20' }} className='pie_dot'></div>
                                                                    <span>{t('guests.control_available')} ({tickets - (waiting + confirmed)})</span>
                                                                </div>
                                                            }
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    )}
                                >
                                    <Button style={{display:'none'}} className='primarybutton' icon={<Tickets size={14} />}>

                                    </Button>
                                </Dropdown>}

                                {
                                    !screens.xs &&

                                    <Dropdown
                                        // trigger={['click']}
                                        popupRender={() => (
                                            <GuestAddTiles
                                                plan={plan}
                                                onIndividual={() => setDrawerState({
                                                    currentGuest: null,
                                                    onEditGuest: false,
                                                    companions: [],
                                                    visible: true
                                                })}
                                                onFile={(file) => navigate(`/dashboard/guests/import?id=${id}`, { state: { file } })}
                                            />
                                        )}
                                    >
                                        <Button
                                            icon={<Plus size={14} />}
                                            className='primarybutton--active'>
                                            {t('guests.btn_new_guest')}
                                        </Button>
                                    </Dropdown>

                                }












                            </div>
                        </div>

                        {screens.xs && (
                            <div style={{ padding: '12px', boxSizing: 'border-box', width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <span style={{ fontFamily: 'Poppins', fontSize: '20px', fontWeight: 600 }}>{t('guests.my_guests')}</span>

                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}>
                                        <Tooltip title={t('guests.send_issues_btn')}>
                                            <Dropdown
                                                trigger={['click']}
                                                placement="bottomRight"
                                                popupRender={() => (
                                                    <div className="send-issues-popover">
                                                        <strong className="send-issues-popover-title">{t('guests.send_issues_title')}</strong>
                                                        <p className="send-issues-popover-text">{t('guests.send_issues_intro')}</p>
                                                        <ul className="send-issues-popover-list">
                                                            <li>{t('guests.send_issues_reason_1')}</li>
                                                            <li>{t('guests.send_issues_reason_2')}</li>
                                                            <li>{t('guests.send_issues_reason_3')}</li>
                                                            <li>{t('guests.send_issues_reason_4')}</li>
                                                        </ul>
                                                        <p className="send-issues-popover-text">{t('guests.send_issues_footer')}</p>
                                                    </div>
                                                )}
                                            >
                                                <Button className='primarybutton_transparent' icon={<MailWarning size={14} />} style={{ borderRadius: '99px', transition: 'all 0.55s ease',}}>
                                                    
                                                </Button>
                                            </Dropdown>
                                        </Tooltip>
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

                                {activeKey === 'confirmado' && (
                                    <Segmented
                                        block
                                        value={confirmedView}
                                        onChange={setConfirmedView}
                                        options={[
                                            { label: t('guests.view_group'), value: 'group', icon: <Users size={14} /> },
                                            { label: t('guests.view_individual'), value: 'individual', icon: <List size={14} /> },
                                        ]}
                                    />
                                )}
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
                                    type='primary'
                                    style={{ borderRadius: '12px', marginBottom: '12px', height: '40px' }}
                                    onClick={() => setDrawerState({ currentGuest: null, onEditGuest: false, companions: [], visible: true })}
                                >{t('guests.btn_new')}</Button> :
                                    activeKey === 'confirmado' ? (
                                        <Segmented
                                            value={confirmedView}
                                            onChange={setConfirmedView}
                                            style={{marginBottom:'8px'}}
                                            options={[
                                                { label: t('guests.view_group'), value: 'group' },
                                                { label: t('guests.view_individual'), value: 'individual' },
                                            ]}
                                        />
                                    ) : null
                            }
                        />

                    </div>

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

                <UpgradeBanner plan={plan} invitationId={id} hideOnMobile />
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
