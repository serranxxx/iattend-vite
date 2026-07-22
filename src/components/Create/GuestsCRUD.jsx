import {
    App,
    Button,
    Divider,
    Drawer,
    Grid,
    Input,
    Popconfirm,
    Row,
    Select,
    Space,
    Tooltip,
} from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './guests-crud.css'
import { supabase } from '../../lib/supabase'
import { FaCheck } from 'react-icons/fa'
import { generateSimpleId, PHONE_CODES, splitPhoneNumber, buildPhoneNumberSafe } from '../../helpers/assets/functions'
import { IoMdAdd } from 'react-icons/io'
import { FiMinus } from 'react-icons/fi'
import { CalculateTier } from './CalculateTier/CalculateTier'

const { useBreakpoint } = Grid

const TIER_OPTIONS = [
    { label: 'A', value: 'A' },
    { label: 'B', value: 'B' },
    { label: 'C', value: 'C' },
    { label: 'D', value: 'D' },
]


const EMPTY_PERSON = {
    phone_code: '+52',
    phone_number: '',
    name: '',
    tier: null,
    tag: null,
    side: null,
    type: null,
    notes: '',
    state: null,
}

const createPerson = (overrides = {}) => ({
    ...EMPTY_PERSON,
    ...overrides,
})

const pruneUndefined = (obj) =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))

export const GuestsCRUD = ({
    rowData,
    invitationID,
    setDrawerState,
    refreshPage,
    drawerState,
    isSideEvent,
    sideID
}) => {

    const { t } = useTranslation()
    const { message } = App.useApp()

    const TABLE_NAME = isSideEvent ? 'side_events_guests' : 'guests'
    const FOREIGN_KEY = isSideEvent ? 'side_events_id' : 'invitation_id'
    const PARENT_ID = isSideEvent ? sideID : invitationID

    const screens = useBreakpoint()
    const inputRef = useRef(null)

    const CATEGORY_OPTIONS = useMemo(() => [
        { label: t('guests.type_female'), value: 'female' },
        { label: t('guests.type_male'), value: 'male' },
        { label: t('guests.type_child'), value: 'child' },
        { label: t('guests.type_undefined'), value: 'undefined' },
    ], [t])

    const STATE_OPTIONS = useMemo(() => [
        { label: t('guests.state_creado'), value: 'creado' },
        { label: t('guests.state_esperando'), value: 'esperando' },
        { label: t('guests.state_confirmado'), value: 'confirmado' },
        { label: t('guests.state_rechazado'), value: 'rechazado' },
    ], [t])

    const [newTag, setNewTag] = useState(null)
    const [localTags, setLocalTags] = useState([])
    const [owners, setOwners] = useState([])
    const [guestData, setGuestData] = useState(null)
    const [companionsData, setCompanionsData] = useState([])

    const isEditing = !!drawerState.onEditGuest

    const handleClose = () => {
        setDrawerState({
            currentGuest: null,
            isEditGuest: null,
            companions: [],
            visible: false,
        })
    }

    const updateGuestField = (field, value) => {
        setGuestData((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const updateCompanionField = (index, field, value) => {
        setCompanionsData((prev) =>
            prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
        )
    }

    const updateTicketCount = (action) => {
        const isAdd = action === 'add'

        if (isAdd) {
            setCompanionsData((prev) => [
                ...prev,
                createPerson({
                    tier: guestData?.tier,
                    tag: guestData?.tag,
                    side: guestData?.side,
                }),
            ])
            return
        }

        if (companionsData?.length > 0) {
            setCompanionsData((prev) => prev.slice(0, -1))
        }
    }

    const getTags = async () => {
        const { data, error } = await supabase
            .from('invitations')
            .select('tags, owners')
            .eq('id', invitationID)
            .maybeSingle()

        if (error) {
            console.error(error)
            return
        }

        setLocalTags(data?.tags || [])
        setOwners(data?.owners || [])
    }

    const addTagsToInvitation = async () => {
        if (!newTag?.trim()) return

        const { data, error: fetchError } = await supabase
            .from('invitations')
            .select('tags')
            .eq('id', invitationID)
            .single()

        if (fetchError) {
            console.error('Error al obtener tags:', fetchError)
            return
        }

        const currentTags = data?.tags || []
        const updatedTags = Array.from(new Set([...currentTags, newTag.trim()]))

        const { data: updatedData, error: updateError } = await supabase
            .from('invitations')
            .update({ tags: updatedTags })
            .eq('id', invitationID)
            .select('tags')

        if (updateError) {
            console.error('Error al actualizar tags:', updateError)
            return
        }

        setLocalTags(updatedData?.[0]?.tags || [])
        setNewTag(null)
    }

    const handleCompanions = (id) => {
        return rowData?.filter((row) => row.companion_id === id.toString())
    }

    const onAddingGuest = async () => {
        try {
            const newguest = {
                [FOREIGN_KEY]: PARENT_ID,
                password: generateSimpleId(),
                phone_number: buildPhoneNumberSafe(guestData.phone_code, guestData.phone_number),
                name: guestData.name || '',
                tier: guestData.tier || null,
                tag: guestData.tag || null,
                side: guestData.side || null,
                type: guestData.type || null,
                table: null,
                state: 'creado',
                last_action: 'creado',
                notes: guestData.notes ?? null,
                meal: null,
                companion_id: null,
                ticket: true,
                has_companion: companionsData?.length > 0,
                last_action_by: isSideEvent ? true : 'admin',
                ...(!isSideEvent && {
                    invitation_sent_at: null,
                    reminder_count: 0,
                    last_reminder_at: null,
                    special_needs: null,
                })
            }

            const { data: guestRows, error: guestError } = await supabase
                .from(TABLE_NAME)
                .insert([newguest])
                .select('id, name')

            if (guestError) {
                console.error('Error al insertar guest:', guestError)
                return
            }

            const guestId = guestRows?.[0]?.id
            const guestName = guestRows?.[0]?.name || guestData.name

            if (!guestId) {
                console.error('No se obtuvo el id del guest recién creado.')
                return
            }

            if (Array.isArray(companionsData) && companionsData.length > 0) {
                const companionRecords = companionsData.map((c) => ({
                    [FOREIGN_KEY]: PARENT_ID,
                    password: generateSimpleId(),
                    phone_number: buildPhoneNumberSafe(c.phone_code, c.phone_number),
                    name: c.name?.trim() || t('guests.crud_companion_of_name', { name: guestName }),
                    tier: c.tier ?? guestData.tier ?? null,
                    tag: c.tag ?? guestData.tag ?? null,
                    side: c.side ?? guestData.side ?? null,
                    type: c.type ?? guestData.type ?? null,
                    table: null,
                    state: 'creado',
                    last_action: 'creado',
                    notes: c.notes ?? null,
                    meal: null,
                    companion_id: guestId,
                    ticket: true,
                    has_companion: false,
                    last_action_by: isSideEvent ? true : 'admin',
                    ...(!isSideEvent && {
                        invitation_sent_at: null,
                        reminder_count: 0,
                        last_reminder_at: null,
                        special_needs: null,
                    })
                }))

                const { error: companionsError } = await supabase
                    .from(TABLE_NAME)
                    .insert(companionRecords)

                if (companionsError) {
                    console.error('Error al insertar companions:', companionsError)
                    return
                }
            }

            message.success(t('guests.crud_msg_added'))
            refreshPage()
            setGuestData(createPerson())
            setCompanionsData([])
        } catch (err) {
            console.error('Fallo general al guardar cambios:', err)
        }
    }

    const onSaveChanges = async () => {
        try {
            const guestId = Number(drawerState.currentGuest?.id)
            if (!guestId) throw new Error('ID de guest inválido')

            const guestPatch = pruneUndefined({
                phone_number: buildPhoneNumberSafe(guestData.phone_code, guestData.phone_number) || undefined,
                name: guestData.name?.trim(),
                tier: guestData.tier,
                tag: guestData.tag,
                state: guestData.state,
                type: guestData.type,
                side: guestData.side,
                notes: guestData.notes,
                last_action: drawerState.currentGuest?.state,
                has_companion: companionsData?.length > 0,
                last_action_by: isSideEvent ? true : 'admin',
                // ...(!isSideEvent && {
                //     invitation_sent_at: null,
                //     reminder_count: 0,
                //     last_reminder_at: null,
                //     special_needs: null,
                // })
            })

            const { error: guestError } = await supabase
                .from(TABLE_NAME)
                .update(guestPatch)
                .eq('id', guestId)
                .select('*')
                .maybeSingle()

            if (guestError) throw guestError

            const dbComps = drawerState.companions || []
            const uiComps = companionsData || []

            const updates = []
            const inserts = []

            const len = Math.max(dbComps.length, uiComps.length)

            for (let i = 0; i < len; i++) {
                const base = dbComps[i]
                const edit = uiComps[i]

                if (!edit) continue

                const cPhone = buildPhoneNumberSafe(edit.phone_code, edit.phone_number)

                if (base?.id) {
                    const patch = pruneUndefined({
                        phone_number: cPhone || undefined,
                        name: (edit.name ?? '').trim(),
                        tier: edit.tier || null,
                        tag: edit.tag || null,
                        type: edit.type || null,
                        side: edit.side || null,
                        state: edit.state,
                        notes: edit.notes,
                        last_action: dbComps[i].state,
                        last_action_by: isSideEvent ? true : 'admin',
                        // ...(!isSideEvent && {
                        //     invitation_sent_at: null,
                        //     reminder_count: 0,
                        //     last_reminder_at: null,
                        //     special_needs: null,
                        // })
                    })

                    if (Object.keys(patch).length === 0) continue

                    updates.push(
                        supabase
                            .from(TABLE_NAME)
                            .update(patch)
                            .eq('id', base.id)
                            .select('id')
                            .maybeSingle()
                    )
                } else {
                    inserts.push({
                        [FOREIGN_KEY]: PARENT_ID,
                        password: generateSimpleId(),
                        phone_number: cPhone || '',
                        name: (edit.name ?? t('guests.crud_companion_default')).trim(),
                        tier: edit.tier ?? guestData.tier ?? null,
                        tag: edit.tag ?? guestData.tag ?? null,
                        table: null,
                        type: edit.type ?? guestData.type ?? null,
                        side: edit.side ?? guestData.side ?? null,
                        state: 'creado',
                        notes: edit.notes ?? null,
                        meal: null,
                        companion_id: guestId,
                        ticket: true,
                        last_action: 'creado',
                        last_action_by: isSideEvent ? true : 'admin',
                        // ...(!isSideEvent && {
                        //     invitation_sent_at: null,
                        //     reminder_count: 0,
                        //     last_reminder_at: null,
                        //     special_needs: null,
                        // })
                    })
                }
            }

            if (updates.length) {
                const results = await Promise.all(updates)
                const updateErr = results.find((r) => r.error)
                if (updateErr) throw updateErr.error
            }

            if (inserts.length) {
                const { error: insErr } = await supabase.from(TABLE_NAME).insert(inserts)
                if (insErr) throw insErr
            }

            message.success(t('guests.crud_msg_saved'))
            refreshPage()
        } catch (err) {
            message.error(err?.message ?? t('guests.crud_msg_save_error'))
        }
    }

    async function deleteGuestWithCompanions(guestId) {
        try {
            const { error: compErr } = await supabase
                .from(TABLE_NAME)
                .delete()
                .eq('companion_id', String(guestId))

            if (compErr) throw compErr

            const { error: guestErr } = await supabase
                .from(TABLE_NAME)
                .delete()
                .eq('id', guestId)

            if (guestErr) throw guestErr

            setCompanionsData([])
            setGuestData(
                createPerson({
                    state: 'creado',
                })
            )

            message.success(t('guests.crud_msg_deleted'))
            refreshPage()
        } catch (err) {
            console.error('Error al eliminar guest con companions:', err)
            message.error(t('guests.crud_msg_delete_error'))
        }
    }

    function removeCompanionLocally(index) {
        setCompanionsData((prev) => prev.filter((_, i) => i !== index))
        setDrawerState((prev) => ({
            ...prev,
            companions: (prev.companions || []).filter((_, i) => i !== index),
        }))
    }

    async function deleteCompanionAtIndex(index) {
        try {
            const base = drawerState.companions?.[index]

            if (!base?.id) {
                removeCompanionLocally(index)
                message.info(t('guests.crud_msg_companion_local'))
                return
            }

            const backupCompanionsData = companionsData
            const backupDrawerCompanions = drawerState.companions
            removeCompanionLocally(index)

            const { error } = await supabase.from(TABLE_NAME).delete().eq('id', base.id)

            if (error) {
                setCompanionsData(backupCompanionsData)
                setDrawerState((prev) => ({ ...prev, companions: backupDrawerCompanions }))
                throw error
            }

            message.success(t('guests.crud_msg_companion_deleted'))
            onSaveChanges()
        } catch (err) {
            console.error('Error al eliminar companion:', err)
            message.error(t('guests.crud_msg_companion_error'))
        }
    }

    useEffect(() => {
        if (!drawerState.visible) return

        setNewTag(null)
        getTags()

        if (drawerState.currentGuest) {
            const guest = drawerState.currentGuest
            const { code, number } = splitPhoneNumber(guest.phone_number)

            setGuestData(
                createPerson({
                    phone_code: code || '+52',
                    phone_number: number,
                    name: guest.name,
                    tier: guest.tier,
                    tag: guest.tag,
                    side: guest.side,
                    type: guest.type,
                    notes: guest.notes,
                    state: guest.state,
                })
            )

            setCompanionsData(
                (drawerState?.companions || []).map((guest) => {
                    const { code, number } = splitPhoneNumber(guest.phone_number)
                    return createPerson({
                        phone_code: code || '+52',
                        phone_number: number,
                        name: guest.name || '',
                        tier: guest.tier || null,
                        tag: guest.tag || null,
                        side: guest.side || null,
                        type: guest.type || null,
                        notes: guest.notes || '',
                        state: guest.state || null,
                    })
                })
            )
        } else {
            setGuestData(createPerson())
            setCompanionsData([])
        }
    }, [drawerState])

    const tagOptions = localTags
        .filter((i) => i !== null)
        .map((item) => ({ label: item, value: item }))

    const sideOptions = owners.map((owner) => ({ label: owner, value: owner }))

    const renderPhoneField = (data, onChange) => {
        const hasError = data.phone_number.length > 0 && data.phone_number.length < 10

        return (
            <Space.Compact style={{ width: '100%' }}>
                <Select
                    value={data.phone_code}
                    onChange={(value) => onChange('phone_code', value)}
                    style={{ width: '100px' }}
                    options={PHONE_CODES}
                />
                <Input
                    type="tel"
                    placeholder={t('guests.crud_phone_placeholder')}
                    className="gc-input-text"
                    style={{
                        borderRadius: '0px 99px 99px 0px',
                        color: hasError ? 'red' : undefined,
                        border: hasError ? '1px solid red' : undefined,
                    }}
                    value={data.phone_number}
                    onChange={(e) =>
                        onChange('phone_number', e.target.value.replace(/\D/g, '').slice(0, 10))
                    }
                    maxLength={10}
                />
            </Space.Compact>
        )
    }

    const renderTagSelect = (value, onChange) => (
        <Select
            style={{ width: '100%' }}
            placeholder={t('guests.crud_tag_select')}
            value={value}
            onChange={(val) => onChange('tag', val)}
            dropdownRender={(menu) => (
                <>
                    {menu}
                    <Divider style={{ margin: '8px 0' }} />
                    <Space style={{ padding: '0 8px 4px' }}>
                        <Input
                            placeholder={t('guests.crud_tag_new')}
                            ref={inputRef}
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                        />
                        <Button icon={<IoMdAdd />} onClick={addTagsToInvitation}>
                            {t('guests.crud_tag_add')}
                        </Button>
                    </Space>
                </>
            )}
            options={tagOptions}
        />
    )

    const renderSelectField = (value, onChange, options, placeholder) => (
        <Select
            value={value}
            placeholder={placeholder}
            onChange={onChange}
            style={{ width: '100%' }}
            options={options}
        />
    )

    const renderNotesField = (value, onChange, minRows = 2, maxRows = 3) => (
        <Input.TextArea
            placeholder={t('guests.crud_notes_placeholder')}
            value={value}
            onChange={(e) => onChange('notes', e.target.value)}
            autoSize={{ minRows, maxRows }}
            style={{ borderRadius: '8px' }}
        />
    )

    return (
        <Drawer
            placement="right"
            className="help-drawer"
            closable
            onClose={handleClose}
            open={drawerState.visible}
            width={screens.xs ? '100%' : '40%'}
            styles={{ body: { padding: '12px' } }}
            extra={
                <Row style={{ gap: '12px' }}>
                    {isEditing ? (
                        <Button
                            icon={<FaCheck style={{ marginTop: '2px' }} />}
                            onClick={onSaveChanges}
                            className="primarybutton--active"
                            style={{ borderRadius: '99px' }}
                        >
                            {t('guests.crud_btn_save')}
                        </Button>
                    ) : (
                        <Button
                            icon={<IoMdAdd style={{ marginTop: '2px' }} />}
                            onClick={onAddingGuest}
                            className="primarybutton--active"
                            style={{ borderRadius: '99px' }}
                        >
                            {t('guests.crud_btn_add')}
                        </Button>
                    )}
                </Row>
            }
            title={isEditing ? t('guests.crud_title_edit') : t('guests.crud_title_new')}
            style={{ zIndex: 99 }}
        >
            {guestData && (
                <div className="new-guest-container">
                    <div className="new-guest-form-container" style={{ alignItems: 'center' }}>
                        <div className="add_guest_title_cont">
                            <span className="gc-content-label">
                                <b>{t('guests.crud_section_data')}</b>
                            </span>
                        </div>

                        <div className="guest_form_row">
                            <div className="guest_form_col">
                                <span className="gc-content-label">{t('guests.crud_label_name')}</span>
                                <Input
                                    placeholder={t('guests.crud_label_name')}
                                    value={guestData.name}
                                    onChange={(e) => updateGuestField('name', e.target.value)}
                                    className="gc-input-text"
                                />
                            </div>

                            <div className="guest_form_col">
                                <span className="gc-content-label">{t('guests.crud_label_contact')}</span>
                                {renderPhoneField(guestData, updateGuestField)}
                            </div>
                        </div>

                        <div className="guest_form_row">
                            <div className="guest_form_col">
                                <span className="gc-content-label">{t('guests.crud_label_tag')}</span>
                                {renderTagSelect(guestData.tag, updateGuestField)}
                            </div>

                            <div className="guest_form_col">
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        width: '100%',
                                    }}
                                >
                                    <span className="gc-content-label">{t('guests.crud_label_priority')}</span>
                                    <CalculateTier drawerState={drawerState} updateGuestField={updateGuestField} owners={owners} />
                                </div>

                                {renderSelectField(
                                    guestData.tier,
                                    (value) => updateGuestField('tier', value),
                                    TIER_OPTIONS,
                                    t('guests.crud_priority_placeholder')
                                )}
                            </div>
                        </div>

                        <div className="guest_form_row">
                            <div className="guest_form_col">
                                <span className="gc-content-label">{t('guests.crud_label_category')}</span>
                                {renderSelectField(
                                    guestData.type,
                                    (value) => updateGuestField('type', value),
                                    CATEGORY_OPTIONS,
                                    t('guests.crud_category_placeholder')
                                )}
                            </div>

                            <div className="guest_form_col">
                                <span className="gc-content-label">{t('guests.crud_label_side')}</span>
                                {renderSelectField(
                                    guestData.side,
                                    (value) => updateGuestField('side', value),
                                    sideOptions,
                                    t('guests.crud_side_placeholder')
                                )}
                            </div>
                        </div>

                        {isEditing && (
                            <div className="guest_form_row">
                                <div className="guest_form_col">
                                    <span className="gc-content-label">{t('guests.crud_label_state')}</span>
                                    {renderSelectField(
                                        guestData.state,
                                        (value) => updateGuestField('state', value),
                                        STATE_OPTIONS,
                                        t('guests.crud_state_placeholder')
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="guest_form_col" style={{ width: '100%' }}>
                            <span className="gc-content-label">Notas</span>
                            {renderNotesField(guestData.notes, updateGuestField, 3, 5)}
                        </div>

                        {isEditing && (
                            <Tooltip title={`Eliminar ${guestData.name}`}>
                                <Popconfirm
                                    title={t('guests.crud_delete_title')}
                                    description={
                                        companionsData?.length > 0
                                            ? t('guests.crud_delete_desc_companions', { name: guestData.name })
                                            : t('guests.crud_delete_desc', { name: guestData?.name })
                                    }
                                    onConfirm={() => deleteGuestWithCompanions(drawerState.currentGuest.id)}
                                    okText={t('guests.crud_btn_delete')}
                                    cancelText={t('guests.btn_cancel')}
                                >
                                    <Button className="primarybutton">{t('guests.crud_btn_delete')}</Button>
                                </Popconfirm>
                            </Tooltip>
                        )}
                    </div>

                    {isEditing &&
                        !drawerState.currentGuest.has_companion &&
                        drawerState.currentGuest.companion_id ? (
                        <span style={{ fontSize: '16px' }}>
                            <b>{drawerState.currentGuest.name} </b>
                            {t('guests.crud_companion_of')}{' '}
                            <b
                                onClick={() =>
                                    setDrawerState({
                                        currentGuest: rowData.find(
                                            (c) => c.id === Number(drawerState.currentGuest.companion_id)
                                        ),
                                        onEditGuest: true,
                                        companions: handleCompanions(
                                            rowData.find(
                                                (c) => c.id === Number(drawerState.currentGuest.companion_id)
                                            )?.id
                                        ),
                                        visible: true,
                                    })
                                }
                                style={{ textDecoration: 'underline', cursor: 'pointer', color: '#6D3CFA' }}
                            >
                                {
                                    rowData.find(
                                        (c) => c.id === Number(drawerState.currentGuest.companion_id)
                                    )?.name
                                }
                            </b>
                        </span>
                    ) : (
                        <div className="new-guest-form-container">
                            <div className="add_companions_container">
                                <span className="gc-content-label">
                                    <b>{t('guests.crud_companions_title', { count: companionsData?.length })}</b>
                                </span>

                                <div
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    {companionsData?.length > 0 && !isEditing && (
                                        <Button
                                            onClick={() => updateTicketCount('remove')}
                                            icon={<FiMinus />}
                                            className="primarybutton"
                                        />
                                    )}
                                    <Button
                                        onClick={() => updateTicketCount('add')}
                                        icon={<IoMdAdd />}
                                        className="primarybutton"
                                    />
                                </div>
                            </div>

                            <span
                                style={{ marginTop: '-12px', fontStyle: 'italic', opacity: '0.5' }}
                                className="gc-content-label"
                            >
                                {t('guests.crud_companions_optional')}
                            </span>

                            <div className="companions-name-container">
                                {companionsData?.map((companion, index) => (
                                    <div key={index} className="companions_cont">
                                        <div className="guest_form_row">
                                            <div className="guest_form_col">
                                                <span className="gc-content-label">Nombre</span>
                                                <Input
                                                    placeholder="Nombre"
                                                    value={companion.name}
                                                    onChange={(e) =>
                                                        updateCompanionField(index, 'name', e.target.value)
                                                    }
                                                    className="gc-input-text"
                                                />
                                            </div>

                                            <div className="guest_form_col">
                                                <span className="gc-content-label">{t('guests.crud_label_contact')}</span>
                                                {renderPhoneField(companion, (field, value) =>
                                                    updateCompanionField(index, field, value)
                                                )}
                                            </div>
                                        </div>

                                        <div className="guest_form_row">
                                            <div className="guest_form_col">
                                                <span className="gc-content-label">{t('guests.crud_label_tag')}</span>
                                                {renderTagSelect(companion.tag, (field, value) =>
                                                    updateCompanionField(index, field, value)
                                                )}
                                            </div>

                                            <div className="guest_form_col">
                                                <span className="gc-content-label">{t('guests.crud_label_priority')}</span>
                                                {renderSelectField(
                                                    companion.tier,
                                                    (value) => updateCompanionField(index, 'tier', value),
                                                    TIER_OPTIONS,
                                                    t('guests.crud_priority_placeholder')
                                                )}
                                            </div>
                                        </div>

                                        <div className="guest_form_row">
                                            <div className="guest_form_col">
                                                <span className="gc-content-label">{t('guests.crud_label_category')}</span>
                                                {renderSelectField(
                                                    companion.type,
                                                    (value) => updateCompanionField(index, 'type', value),
                                                    CATEGORY_OPTIONS,
                                                    t('guests.crud_category_placeholder')
                                                )}
                                            </div>

                                            <div className="guest_form_col">
                                                <span className="gc-content-label">{t('guests.crud_label_side')}</span>
                                                {renderSelectField(
                                                    companion.side,
                                                    (value) => updateCompanionField(index, 'side', value),
                                                    sideOptions,
                                                    t('guests.crud_side_placeholder')
                                                )}
                                            </div>
                                        </div>

                                        {isEditing && (
                                            <div className="guest_form_row">
                                                <div className="guest_form_col">
                                                    <span className="gc-content-label">{t('guests.crud_label_state')}</span>
                                                    {renderSelectField(
                                                        companion.state,
                                                        (value) => updateCompanionField(index, 'state', value),
                                                        STATE_OPTIONS,
                                                        t('guests.crud_state_placeholder')
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div className="guest_form_col" style={{ width: '100%' }}>
                                            <span className="gc-content-label">{t('guests.crud_label_notes')}</span>
                                            {renderNotesField(companion.notes, (field, value) =>
                                                updateCompanionField(index, field, value)
                                            )}
                                        </div>

                                        {isEditing && (
                                            <Tooltip title={`Eliminar ${companion.name}`}>
                                                <Popconfirm
                                                    title={t('guests.crud_delete_title')}
                                                    description={t('guests.crud_delete_desc', { name: companion.name })}
                                                    onConfirm={() => deleteCompanionAtIndex(index)}
                                                    okText={t('guests.crud_btn_delete')}
                                                    cancelText={t('guests.btn_cancel')}
                                                >
                                                    <Button className="primarybutton">{t('guests.crud_btn_delete')}</Button>
                                                </Popconfirm>
                                            </Tooltip>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Drawer>
    )
}