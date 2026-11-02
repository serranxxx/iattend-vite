import { App, Drawer, Grid, Popconfirm, Select } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, Minus, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react'
import s from './GuestsCRUD.module.css'
import { supabase } from '../../lib/supabase'
import { generateSimpleId } from '../../helpers/assets/functions'
import { PHONE_CODE_OPTIONS, splitPhoneNumber, buildPhoneNumberSafe } from '../../helpers/assets/phoneCodes'
import { CalculateTier } from './CalculateTier/CalculateTier'

/*
  Panel para agregar o editar un invitado y sus acompañantes (handoff "Nuevo
  invitado"): flota a la derecha (Drawer de antd sin encabezado, 16 px de la
  orilla), lo esencial primero (nombre y teléfono), prioridad en un segmentado
  con "Calcular" adentro, etiqueta / lado / categoría como chips y notas
  colapsadas. Acompañantes compactos con un −/+; su etiqueta, lado y
  categoría se heredan del titular (lila) hasta que se cambian (negro). En un
  acompañante, `undefined` en tag / side / type = hereda; `null` = ninguno a
  propósito. La prioridad siempre es la del titular. Sin X: se cierra con
  Cancelar, un clic fuera o Esc.
*/

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

// Lo que un acompañante hereda del titular mientras no lo cambie.
const HEREDABLES = ['tag', 'side', 'type']
const efectivo = (c, host, k) => (c?.[k] !== undefined ? c[k] : host?.[k] ?? null)
const heredaTodo = { tag: undefined, side: undefined, type: undefined }
// Teléfono a medias (se valida cuando se escribió algo).
const telefonoIncompleto = (p) => (p?.phone_number?.length ?? 0) > 0 && p.phone_number.length < 10

export const GuestsCRUD = ({
    rowData,
    invitationID,
    setDrawerState,
    refreshPage,
    drawerState,
    isSideEvent,
    sideID,
    // Editor móvil viejo de un Pop (modo story): sin "Calcular prioridad".
    oscuro = false,
}) => {

    const { t } = useTranslation()
    const { message } = App.useApp()

    const TABLE_NAME = isSideEvent ? 'side_events_guests' : 'guests'
    const FOREIGN_KEY = isSideEvent ? 'side_events_id' : 'invitation_id'
    const PARENT_ID = isSideEvent ? sideID : invitationID

    const screens = useBreakpoint()
    const nombreRef = useRef(null)
    const nuevaRef = useRef(null)

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
    const [creandoTag, setCreandoTag] = useState(false)
    const [notasAbiertas, setNotasAbiertas] = useState(false)
    const [abierto, setAbierto] = useState(null) // índice del acompañante expandido
    const [localTags, setLocalTags] = useState([])
    const [owners, setOwners] = useState([])
    const [guestData, setGuestData] = useState(null)
    const [companionsData, setCompanionsData] = useState([])

    const isEditing = !!drawerState.onEditGuest
    const guardados = isEditing ? (drawerState.companions?.length ?? 0) : 0
    const puedeQuitar = companionsData.length > guardados

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
            setCompanionsData((prev) => [...prev, createPerson(heredaTodo)])
            return
        }

        // Editando, el − solo quita los que aún no se guardan; los guardados
        // se eliminan desde su tarjeta.
        if (!puedeQuitar) return
        setCompanionsData((prev) => prev.slice(0, -1))
        setAbierto((a) => (a === companionsData.length - 1 ? null : a))
    }

    const getTags = async () => {
        // Sin invitación (Pop) no hay etiquetas ni novios.
        if (!invitationID) return
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
        if (!newTag?.trim() || !invitationID) return

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
        setCreandoTag(false)
        // La recién creada queda elegida.
        updateGuestField('tag', newTag.trim())
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
                    tier: guestData.tier ?? null,
                    tag: efectivo(c, guestData, 'tag'),
                    side: efectivo(c, guestData, 'side'),
                    type: efectivo(c, guestData, 'type'),
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
            // El panel se queda abierto y limpio para seguir agregando.
            setGuestData(createPerson())
            setCompanionsData([])
            setNotasAbiertas(false)
            setAbierto(null)
            setTimeout(() => nombreRef.current?.focus(), 0)
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
                        tier: guestData.tier || null,
                        tag: efectivo(edit, guestData, 'tag'),
                        type: efectivo(edit, guestData, 'type'),
                        side: efectivo(edit, guestData, 'side'),
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
                        name: edit.name?.trim() || t('guests.crud_companion_of_name', { name: guestData.name?.trim() || '' }),
                        tier: guestData.tier ?? null,
                        tag: efectivo(edit, guestData, 'tag'),
                        table: null,
                        type: efectivo(edit, guestData, 'type'),
                        side: efectivo(edit, guestData, 'side'),
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
        setCreandoTag(false)
        setAbierto(null)
        setNotasAbiertas(Boolean(drawerState.currentGuest?.notes))
        getTags()

        if (drawerState.currentGuest) {
            const guest = drawerState.currentGuest
            const { code, number } = splitPhoneNumber(guest.phone_number ?? '')

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

            // Lo que coincide con el titular se toma como heredado.
            const host = drawerState.currentGuest
            const propio = (c, k) => ((c[k] ?? null) === (host[k] ?? null) ? undefined : c[k] ?? null)
            setCompanionsData(
                (drawerState?.companions || []).map((guest) => {
                    const { code, number } = splitPhoneNumber(guest.phone_number ?? '')
                    return createPerson({
                        phone_code: code || '+52',
                        phone_number: number,
                        name: guest.name || '',
                        tier: guest.tier || null,
                        tag: propio(guest, 'tag'),
                        side: propio(guest, 'side'),
                        type: propio(guest, 'type'),
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


    const tagOptions = localTags.filter((i) => i !== null)
    const sideOptions = owners.filter(Boolean)
    const stateOptions = STATE_OPTIONS

    const titular = isEditing && drawerState.currentGuest?.companion_id && !drawerState.currentGuest?.has_companion
        ? rowData?.find((c) => c.id === Number(drawerState.currentGuest.companion_id))
        : null
    const abrirTitular = () => setDrawerState({
        currentGuest: titular,
        onEditGuest: true,
        companions: handleCompanions(titular.id),
        visible: true,
    })

    if (!guestData) return null

    const nombre = guestData.name?.trim() ?? ''
    const primerNombre = nombre.split(' ')[0]
    const nombreHost = primerNombre || t('guests.crud_the_guest')
    const total = 1 + companionsData.length
    const tituloCabeza = nombre
        ? `${nombre}${companionsData.length ? ` + ${companionsData.length}` : ''}`
        : t('guests.crud_no_name')
    const bloqueado = !nombre || telefonoIncompleto(guestData) || companionsData.some(telefonoIncompleto)
    const enviar = () => {
        if (bloqueado) return
        if (isEditing) onSaveChanges()
        else onAddingGuest()
    }

    // Chips de una sola opción: tocar la elegida la suelta.
    const chips = (opciones, valor, onPick, { chico = false, heredado = false } = {}) => opciones.map((o) => {
        const on = valor === o.value
        return (
            <button
                key={o.value}
                type="button"
                className={chico ? s.chipChico : s.chip}
                data-on={on || undefined}
                data-heredado={(on && heredado) || undefined}
                aria-pressed={on}
                onClick={() => onPick(on ? null : o.value)}
            >
                {o.label}
            </button>
        )
    })
    const opcionesTag = tagOptions.map((v) => ({ value: v, label: v }))
    const opcionesLado = sideOptions.map((v) => ({ value: v, label: v }))
    const etiquetaDe = (k, v) => (k === 'type' ? CATEGORY_OPTIONS.find((o) => o.value === v)?.label ?? v : v)

    const telefono = (data, onChange, { corto = false } = {}) => {
        const mal = telefonoIncompleto(data)
        if (corto) {
            return (
                <input
                    type="tel"
                    inputMode="numeric"
                    className={s.inputChico}
                    data-error={mal || undefined}
                    placeholder={t('guests.crud_phone_short')}
                    value={data.phone_number}
                    onChange={(e) => onChange('phone_number', e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
            )
        }
        return (
            <div className={s.telefono} data-error={mal || undefined}>
                <Select
                    variant="borderless"
                    className={s.lada}
                    popupMatchSelectWidth={false}
                    value={data.phone_code}
                    onChange={(value) => onChange('phone_code', value)}
                    options={PHONE_CODE_OPTIONS}
                    suffixIcon={<ChevronDown size={14} />}
                />
                <input
                    type="tel"
                    inputMode="numeric"
                    placeholder={t('guests.crud_phone_whatsapp')}
                    value={data.phone_number}
                    onChange={(e) => onChange('phone_number', e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
            </div>
        )
    }

    const seccion = (titulo, contenido) => (
        <div className={s.seccion}>
            <div className={s.etiqueta}>{titulo}</div>
            {contenido}
        </div>
    )

    const resumenAcompanante = (c) => {
        const propio = HEREDABLES.some((k) => c[k] !== undefined)
        const valores = HEREDABLES
            .map((k) => ({ k, v: efectivo(c, guestData, k) }))
            .filter(({ v }) => v)
        const estado = propio
            ? t('guests.crud_custom')
            : valores.length ? t('guests.crud_inherited', { name: nombreHost }) : t('guests.crud_none')
        return { propio, valores, estado }
    }

    const tarjetaAcompanante = (c, i) => {
        const open = abierto === i
        const { propio, valores, estado } = resumenAcompanante(c)
        const set = (k, v) => updateCompanionField(i, k, v)
        const guardado = isEditing && Boolean(drawerState.companions?.[i]?.id)
        const grupo = (k, titulo, opciones) => opciones.length > 0 && (
            <div className={s.subSeccion}>
                <div className={s.etiquetaChica}>{titulo}</div>
                <div className={s.chips}>
                    {chips(opciones, efectivo(c, guestData, k), (v) => set(k, v), { chico: true, heredado: c[k] === undefined })}
                </div>
            </div>
        )
        return (
            <div key={i} className={s.acompanante} data-abierto={open || undefined}>
                <div className={s.filaAcompanante}>
                    <span className={s.numero}>{i + 1}</span>
                    <input
                        className={s.inputChico}
                        style={{ flex: 1 }}
                        placeholder={t('guests.crud_companion_n', { n: i + 1 })}
                        value={c.name}
                        onChange={(e) => set('name', e.target.value)}
                    />
                    {telefono(c, (k, v) => set(k, v), { corto: true })}
                </div>
                <button type="button" className={s.resumen} onClick={() => setAbierto(open ? null : i)} aria-expanded={open}>
                    {valores.map(({ k, v }) => (
                        <span key={k} className={s.chipResumen} data-propio={propio || undefined}>{etiquetaDe(k, v)}</span>
                    ))}
                    <span className={s.estadoHerencia}>{estado}</span>
                    <ChevronDown size={14} className={s.flecha} data-abierto={open || undefined} />
                </button>
                {open && (
                    <div className={s.detalle}>
                        {invitationID && grupo('tag', t('guests.crud_label_tag'), opcionesTag)}
                        {grupo('side', t('guests.crud_label_side'), opcionesLado)}
                        {grupo('type', t('guests.crud_label_category'), CATEGORY_OPTIONS)}
                        {isEditing && guardado && (
                            <div className={s.subSeccion}>
                                <div className={s.etiquetaChica}>{t('guests.crud_label_state')}</div>
                                <div className={s.chips}>
                                    {chips(stateOptions, c.state, (v) => v && set('state', v), { chico: true })}
                                </div>
                            </div>
                        )}
                        <div className={s.subSeccion}>
                            <div className={s.etiquetaChica}>{t('guests.crud_note_label')}</div>
                            <textarea
                                className={s.notaChica}
                                placeholder={t('guests.crud_note_placeholder')}
                                value={c.notes ?? ''}
                                onChange={(e) => set('notes', e.target.value)}
                            />
                        </div>
                        <div className={s.accionesDetalle}>
                            {propio && (
                                <button
                                    type="button"
                                    className={s.enlace}
                                    onClick={() => setCompanionsData((prev) => prev.map((x, j) => (j === i ? { ...x, ...heredaTodo } : x)))}
                                >
                                    {t('guests.crud_reinherit', { name: nombreHost })}
                                </button>
                            )}
                            {guardado && (
                                <Popconfirm
                                    title={t('guests.crud_delete_title')}
                                    description={t('guests.crud_delete_desc', { name: c.name })}
                                    onConfirm={() => { setAbierto(null); deleteCompanionAtIndex(i) }}
                                    okText={t('guests.crud_btn_delete')}
                                    cancelText={t('guests.btn_cancel')}
                                >
                                    <button type="button" className={s.enlacePeligro}>
                                        <Trash2 size={13} />{t('guests.crud_remove_companion')}
                                    </button>
                                </Popconfirm>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    const inset = screens.xs ? 8 : 16

    return (
        <Drawer
            placement="right"
            open={drawerState.visible}
            onClose={handleClose}
            closable={false}
            title={null}
            footer={null}
            // Arriba de la barra del editor de side events (z-index 1200, ver
            // SideEventEditor.module.css): si no, la tapa.
            zIndex={1300}
            size={screens.xs ? `calc(100% - ${inset * 2}px)` : 560}
            rootClassName={s.raiz}
            styles={{
                wrapper: {
                    top: inset,
                    right: inset,
                    bottom: inset,
                    height: 'auto',
                    maxWidth: `calc(100% - ${inset * 2}px)`,
                    borderRadius: 28,
                    overflow: 'hidden',
                    boxShadow: '0 24px 60px rgba(0,0,0,.22), 0 0 0 1px rgba(0,0,0,.04)',
                },
                section: { borderRadius: 28 },
                body: { padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
            }}
        >
            <div className={s.cabeza}>
                <span className={s.avatar}>{(primerNombre || '?').charAt(0).toUpperCase()}</span>
                <div className={s.cabezaTextos}>
                    <div className={s.titulo}>{tituloCabeza}</div>
                    <div className={s.subtitulo}>{isEditing ? t('guests.crud_title_edit') : t('guests.crud_title_new')}</div>
                </div>
            </div>

            <div className={s.cuerpo}>
                <div className={s.seccionJunta}>
                    <input
                        ref={nombreRef}
                        className={s.nombre}
                        placeholder={t('guests.crud_name_placeholder')}
                        value={guestData.name ?? ''}
                        onChange={(e) => updateGuestField('name', e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') enviar() }}
                        autoFocus={!isEditing}
                    />
                    {telefono(guestData, updateGuestField)}
                </div>

                {seccion(t('guests.crud_label_priority'), (
                    <div className={s.segmentado}>
                        {TIER_OPTIONS.map((o) => {
                            const on = guestData.tier === o.value
                            return (
                                <button
                                    key={o.value}
                                    type="button"
                                    className={s.segmento}
                                    data-on={on || undefined}
                                    aria-pressed={on}
                                    onClick={() => updateGuestField('tier', on ? null : o.value)}
                                >
                                    {o.label}
                                </button>
                            )
                        })}
                        {!oscuro && (
                            <CalculateTier drawerState={drawerState} updateGuestField={updateGuestField} owners={owners}>
                                <button type="button" className={s.calcular}>
                                    <Sparkles size={15} className={s.estrella} />
                                    {t('guests.crud_calc')}
                                </button>
                            </CalculateTier>
                        )}
                    </div>
                ))}

                {/* Etiquetas: las de la invitación (un Pop no tiene). */}
                {invitationID && seccion(t('guests.crud_label_tag'), (
                    <div className={s.chips}>
                        {chips(opcionesTag, guestData.tag, (v) => updateGuestField('tag', v))}
                        {creandoTag ? (
                            <span className={s.chipNueva}>
                                <input
                                    ref={nuevaRef}
                                    autoFocus
                                    placeholder={t('guests.crud_tag_new')}
                                    value={newTag ?? ''}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') { e.preventDefault(); addTagsToInvitation() }
                                        if (e.key === 'Escape') { e.stopPropagation(); setCreandoTag(false); setNewTag(null) }
                                    }}
                                />
                                <button type="button" aria-label={t('guests.crud_tag_create')} disabled={!newTag?.trim()} onClick={addTagsToInvitation}>
                                    <Check size={14} />
                                </button>
                                <button type="button" aria-label={t('guests.crud_btn_cancel')} onClick={() => { setCreandoTag(false); setNewTag(null) }}>
                                    <X size={14} />
                                </button>
                            </span>
                        ) : (
                            <button type="button" className={s.chipMas} onClick={() => setCreandoTag(true)}>
                                <Plus size={14} />{t('guests.crud_tag_new_chip')}
                            </button>
                        )}
                    </div>
                ))}

                {/* Lado: solo si la invitación tiene anfitriones (owners). */}
                {opcionesLado.length > 0 && seccion(t('guests.crud_label_side'), (
                    <div className={s.chips}>{chips(opcionesLado, guestData.side, (v) => updateGuestField('side', v))}</div>
                ))}

                {seccion(t('guests.crud_label_category'), (
                    <div className={s.chips}>{chips(CATEGORY_OPTIONS, guestData.type, (v) => updateGuestField('type', v))}</div>
                ))}

                {isEditing && seccion(t('guests.crud_label_state'), (
                    <div className={s.chips}>{chips(stateOptions, guestData.state, (v) => v && updateGuestField('state', v))}</div>
                ))}

                {notasAbiertas ? seccion(t('guests.crud_note_label'), (
                    <textarea
                        className={s.nota}
                        autoFocus={!guestData.notes}
                        placeholder={t('guests.crud_note_placeholder')}
                        value={guestData.notes ?? ''}
                        onChange={(e) => updateGuestField('notes', e.target.value)}
                    />
                )) : (
                    <button type="button" className={s.agregarNota} onClick={() => setNotasAbiertas(true)}>
                        <Pencil size={16} />{t('guests.crud_add_note')}
                    </button>
                )}

                <div className={s.divisor} />

                {titular ? (
                    <p className={s.esAcompanante}>
                        <b>{drawerState.currentGuest.name}</b> {t('guests.crud_companion_of')}{' '}
                        <button type="button" className={s.enlace} onClick={abrirTitular}>{titular.name}</button>
                    </p>
                ) : (
                    <div className={s.seccionAcompanantes}>
                        <div className={s.cabezaAcompanantes}>
                            <div className={s.cabezaTextos}>
                                <div className={s.tituloSeccion}>{t('guests.crud_companions')}</div>
                                <div className={s.subtitulo}>{t('guests.crud_companions_hint')}</div>
                            </div>
                            <div className={s.stepper}>
                                <button
                                    type="button"
                                    aria-label="−"
                                    data-apagado={!puedeQuitar || undefined}
                                    onClick={() => updateTicketCount('remove')}
                                >
                                    <Minus size={16} strokeWidth={2.4} />
                                </button>
                                <span>{companionsData.length}</span>
                                <button type="button" aria-label="+" onClick={() => updateTicketCount('add')}>
                                    <Plus size={16} strokeWidth={2.4} />
                                </button>
                            </div>
                        </div>
                        {companionsData.map(tarjetaAcompanante)}
                    </div>
                )}
            </div>

            <div className={s.pie}>
                <button type="button" className={s.cancelar} onClick={handleClose}>{t('guests.crud_btn_cancel')}</button>
                {isEditing && (
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
                        <button type="button" className={s.eliminar}><Trash2 size={16} />{t('guests.crud_btn_delete')}</button>
                    </Popconfirm>
                )}
                <span style={{ flex: 1 }} />
                <button type="button" className={s.primario} aria-disabled={bloqueado || undefined} onClick={enviar}>
                    {isEditing ? <Check size={18} strokeWidth={2.4} /> : <Plus size={18} strokeWidth={2.4} />}
                    {isEditing
                        ? t('guests.crud_btn_save_changes')
                        : total > 1 ? t('guests.crud_btn_add_many', { count: total }) : t('guests.crud_btn_add_one')}
                </button>
            </div>
        </Drawer>
    )
}
