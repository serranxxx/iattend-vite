import { Layout, Modal, message } from 'antd'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './build-invitation.css'
import { supabase } from '../../../../lib/supabase'
import { FooterApp } from '../../../Footer/FooterApp'
import { HeaderDashboard } from '../../../Header/Header'
import { ButtonsMenu } from './ButtonsMenu'
import { BuildMenu } from './BuildMenu'
import { BuildContent } from './BuildContent'
import { load } from '../../../../helpers/assets/images'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { BookUser, Camera, Feather, Gift, HeartHandshake, MapPinned, MessageSquareHeart, ScanHeart, ScrollText, Settings, Shirt } from 'lucide-react'
import { UpgradeBanner } from '../../../../components/Payment/UpgradeBanner/UpgradeBanner'
import { translateInvitation } from '../../../../helpers/services/translationApi'
import { sha1 } from '../../../../helpers/services/sha1'
import { useLia } from '../../../../context/LiaContext'

// Mismo mirror dev<->prod que ya usa el resto de este archivo (cover/quote/
// dresscode/gallery), factorizado para poder aplicarlo también al contenido
// traducido (que llega/se guarda siempre en forma "prod", igual que invitations.data).
const withDevMirror = (invitationLike) => ({
    ...invitationLike,
    cover: {
        ...invitationLike?.cover,
        image: { ...invitationLike?.cover?.image, dev: invitationLike?.cover?.image?.prod },
    },
    quote: {
        ...invitationLike?.quote,
        image: { ...invitationLike?.quote?.image, dev: invitationLike?.quote?.image?.prod },
    },
    dresscode: { ...invitationLike?.dresscode, dev: invitationLike?.dresscode?.prod },
    gallery: { ...invitationLike?.gallery, dev: invitationLike?.gallery?.prod },
})

const withProdShape = (invitationLike) => ({
    ...invitationLike,
    cover: {
        ...invitationLike?.cover,
        image: { ...invitationLike?.cover?.image, prod: invitationLike?.cover?.image?.dev, dev: null },
    },
    quote: {
        ...invitationLike?.quote,
        image: { ...invitationLike?.quote?.image, prod: invitationLike?.quote?.image?.dev, dev: null },
    },
    dresscode: { ...invitationLike?.dresscode, prod: invitationLike?.dresscode?.dev, dev: null },
    gallery: { ...invitationLike?.gallery, prod: invitationLike?.gallery?.dev, dev: null },
})

// Extrae únicamente los campos de texto traducibles para comparar si cambiaron
const extractTextFields = (inv) => {
    if (!inv) return ''
    return JSON.stringify({
        ct: inv.cover?.title,
        en: inv.generals?.eventName,
        gt: inv.greeting?.title,
        gd: inv.greeting?.description,
        ft: inv.family?.title,
        fp: inv.family?.personas?.map(p => [p.name, p.relationship]),
        qd: inv.quote?.description,
        it: inv.itinerary?.title,
        ii: inv.itinerary?.items?.map(i => [i.name, i.address, i.subitems?.map(s => s.name)]),
        dt: inv.dresscode?.title,
        dd: inv.dresscode?.description,
        gist: inv.gifts?.title,
        gisd: inv.gifts?.description,
        gisc: inv.gifts?.cards?.map(c => [c.title, c.description]),
        dest: inv.destinations?.title,
        desd: inv.destinations?.description,
        desc: inv.destinations?.cards?.map(c => [c.name, c.description, c.address]),
        nt: inv.notices?.title,
        ni: inv.notices?.notices?.map(n => [n.title, n.description]),
    })
}

// Fusiona una traducción existente con la nueva fuente en español:
// toma la estructura/config/imágenes de newSource y preserva los textos de translationContent.
// Si una sección tiene distinto número de items (personas, itinerario, etc.) no sobreescribe
// el texto para evitar índices desalineados — esa sección necesita retradución manual.
const mergeSourceIntoTranslation = (translationContent, newSource) => {
    if (!translationContent || !newSource) return translationContent
    const result = JSON.parse(JSON.stringify(newSource))
    const t = translationContent

    if (result.cover && t.cover?.title !== undefined) result.cover.title = t.cover.title
    if (result.generals && t.generals?.eventName !== undefined) result.generals.eventName = t.generals.eventName
    if (result.greeting && t.greeting) {
        if (t.greeting.title !== undefined) result.greeting.title = t.greeting.title
        if (t.greeting.description !== undefined) result.greeting.description = t.greeting.description
    }
    if (result.family && t.family) {
        if (t.family.title !== undefined) result.family.title = t.family.title
        if (result.family.personas?.length === t.family.personas?.length) {
            result.family.personas = result.family.personas.map((p, i) => ({
                ...p,
                name: t.family.personas[i]?.name ?? p.name,
                relationship: t.family.personas[i]?.relationship ?? p.relationship,
            }))
        }
    }
    if (result.quote && t.quote?.description !== undefined) result.quote.description = t.quote.description
    if (result.itinerary && t.itinerary) {
        if (t.itinerary.title !== undefined) result.itinerary.title = t.itinerary.title
        if (result.itinerary.items?.length === t.itinerary.items?.length) {
            result.itinerary.items = result.itinerary.items.map((item, i) => {
                const ti = t.itinerary.items[i]
                const merged = { ...item }
                if (ti?.name !== undefined) merged.name = ti.name
                if (ti?.address !== undefined) merged.address = ti.address
                if (item.subitems?.length === ti?.subitems?.length) {
                    merged.subitems = item.subitems.map((s, j) => ({ ...s, name: ti.subitems[j]?.name ?? s.name }))
                }
                return merged
            })
        }
    }
    if (result.dresscode && t.dresscode) {
        if (t.dresscode.title !== undefined) result.dresscode.title = t.dresscode.title
        if (t.dresscode.description !== undefined) result.dresscode.description = t.dresscode.description
    }
    if (result.gifts && t.gifts) {
        if (t.gifts.title !== undefined) result.gifts.title = t.gifts.title
        if (t.gifts.description !== undefined) result.gifts.description = t.gifts.description
        if (result.gifts.cards?.length === t.gifts.cards?.length) {
            result.gifts.cards = result.gifts.cards.map((c, i) => ({
                ...c,
                title: t.gifts.cards[i]?.title ?? c.title,
                description: t.gifts.cards[i]?.description ?? c.description,
            }))
        }
    }
    if (result.destinations && t.destinations) {
        if (t.destinations.title !== undefined) result.destinations.title = t.destinations.title
        if (t.destinations.description !== undefined) result.destinations.description = t.destinations.description
        if (result.destinations.cards?.length === t.destinations.cards?.length) {
            result.destinations.cards = result.destinations.cards.map((c, i) => ({
                ...c,
                name: t.destinations.cards[i]?.name ?? c.name,
                description: t.destinations.cards[i]?.description ?? c.description,
                address: t.destinations.cards[i]?.address ?? c.address,
            }))
        }
    }
    if (result.notices && t.notices) {
        if (t.notices.title !== undefined) result.notices.title = t.notices.title
        if (result.notices.notices?.length === t.notices.notices?.length) {
            result.notices.notices = result.notices.notices.map((n, i) => ({
                ...n,
                title: t.notices.notices[i]?.title ?? n.title,
                description: t.notices.notices[i]?.description ?? n.description,
            }))
        }
    }
    return result
}

export const BuildPage = () => {

    const { t } = useTranslation()
    const { setCreditSending, setCreditSuccess, clearCreditState } = useLia()

    const size = 16
    const buttons = [
        {
            icon: <Settings size={size}  />,
            action: null,
            name: t('buttons_menu.generals'),
            type: 'generals',
            value: 1,
            position: 0,
            index: 0,
        },
        {
            icon: <ScanHeart size={size} />,
            action: null,
            name: t('buttons_menu.cover'),
            type: 'cover',
            value: 2,
            position: 0,
            index: 0,
        },
        {
            icon: <HeartHandshake size={size} />,
            action: null,
            name: t('buttons_menu.greeting'),
            type: 'greeting',
            value: 3,
            position: 950,
            index: 1,
        },
        {
            icon: <BookUser size={size} />,
            action: null,
            name: t('buttons_menu.family'),
            type: 'family',
            value: 4,
            position: 1375,
            index: 2,
        },
        {
            icon: <Feather size={size} />,
            action: null,
            name: t('buttons_menu.quote'),
            type: 'quote',
            value: 5,
            position: 1750,
            index: 3,
        },
        {
            icon: <ScrollText size={size} />,
            action: null,
            name: t('buttons_menu.itinerary'),
            type: 'itinerary',
            value: 6,
            position: 2100,
            index: 4,
        },
        {
            icon: <Shirt size={size} />,
            action: null,
            name: t('buttons_menu.dresscode'),
            type: 'dresscode',
            value: 7,
            position: 2750,
            index: 5,
        },
        {
            icon: <Gift size={size} />,
            action: null,
            name: t('buttons_menu.gifts'),
            type: 'gifts',
            value: 8,
            position: 3050,
            index: 6,
        },
        {
            icon: <MapPinned size={size} />,
            action: null,
            name: t('buttons_menu.destinations'),
            type: 'destinations',
            value: 9,
            position: 2750,
            index: 7,
        },
        {
            icon: <MessageSquareHeart size={size} />,
            action: null,
            name: t('buttons_menu.notices'),
            type: 'notices',
            value: 10,
            position: 3550,
            index: 8,
        },
        {
            icon: <Camera size={size} />,
            action: null,
            name: t('buttons_menu.gallery'),
            type: 'gallery',
            value: 11,
            position: 4500,
            index: 9,
        },
    ]

    const [positionY, setPositionY] = useState('generals')
    const [coverUpdated, setCoverUpdated] = useState(false)
    const [copy, setCopy] = useState(null)
    const [currentSection, setCurrentSection] = useState(1)
    const [messageApi, contextHolder] = message.useMessage();
    const [onHide, setOnHide] = useState(() => window.innerWidth <= 750)
    const [device, setDevice] = useState('ios')
    const [settingsModal, setSettingsModal] = useState(false)
    const [invitation, setInvitation] = useState(null)
    const [plan, setPlan] = useState(null)
    const [saved, setSaved] = useState(true);
    const [searchParams] = useSearchParams();
    const id = searchParams.get("id");

    const [translations, setTranslations] = useState({}) // { [lang]: { content, section_hashes } }
    const [activeLang, setActiveLang] = useState(null) // null = idioma original (español)
    const [translating, setTranslating] = useState(false)
    const [staleSections, setStaleSections] = useState(new Set())
    const [translationWarning, setTranslationWarning] = useState(false)

    const lastSavedTextsRef = useRef(null)
    const pendingSaveRef = useRef(null) // 'write' | 'save'

    const session = JSON.parse(localStorage.getItem("session"));
    const menuTimerRef = useRef(null);

    const getActiveInvitation = () => {
        if (activeLang && translations[activeLang]) return translations[activeLang].content
        return copy
    }

    const setActiveField = (updater) => {
        if (!activeLang) {
            setCopy(updater)
            return
        }
        setTranslations(prev => {
            const current = prev[activeLang] ?? { content: {}, section_hashes: {} }
            const nextContent = typeof updater === 'function' ? updater(current.content) : updater
            return { ...prev, [activeLang]: { ...current, content: nextContent } }
        })
        setSaved(false)
    }

    // generals.languages decide si el invitado ve el botón de idioma en la
    // invitación pública — no puede depender de que alguien se acuerde de
    // volver a la pestaña ES y darle Guardar, así que se persiste de inmediato.
    const persistGenerals = async (nextCopy) => {
        const { error } = await supabase
            .from('invitations')
            .update({ data: withProdShape(nextCopy) })
            .eq('id', id)
        if (error) console.error('Error guardando idiomas de la invitación:', error)
    }

    const addLanguage = async (code) => {
        setTranslating(true)
        // El servidor es quien decide si cobró (a partir del segundo idioma
        // extra) y cuánto — nunca lo adivinamos aquí, así la animación de
        // crédito siempre refleja lo que de verdad pasó en la base de datos.
        setCreditSending(t('guests.language_adding'))
        try {
            const result = await translateInvitation({ invitationId: id, lang: code })
            setTranslations(prev => ({
                ...prev,
                [code]: { content: withDevMirror(result.content), section_hashes: result.section_hashes },
            }))
            const nextCopy = {
                ...copy,
                generals: { ...copy.generals, languages: [...(copy.generals?.languages ?? []), code] }
            }
            setCopy(nextCopy)
            setActiveLang(code)
            await persistGenerals(nextCopy)
            if (result.charged) setCreditSuccess(result.amount)
            else clearCreditState()
        } catch (error) {
            clearCreditState()
            throw error
        } finally {
            setTranslating(false)
        }
    }

    // Un idioma ya instalado (ya se cobraron créditos por él) no se puede
    // borrar — solo deshabilitar/habilitar para el invitado. `languages` es
    // permanente; `disabledLanguages` es el subconjunto oculto al invitado.
    const toggleLanguageEnabled = async (code) => {
        const disabled = copy.generals?.disabledLanguages ?? []
        const nextDisabled = disabled.includes(code)
            ? disabled.filter(l => l !== code)
            : [...disabled, code]
        const nextCopy = {
            ...copy,
            generals: { ...copy.generals, disabledLanguages: nextDisabled }
        }
        setCopy(nextCopy)
        await persistGenerals(nextCopy)
    }

    const retranslate = async (code) => {
        setTranslating(true)
        try {
            const result = await translateInvitation({ invitationId: id, lang: code })
            setTranslations(prev => ({
                ...prev,
                [code]: { content: withDevMirror(result.content), section_hashes: result.section_hashes },
            }))
        } catch (error) {
            console.error('Error al volver a traducir:', error)
            messageApi.error(error?.code === 'NO_CREDITS' ? error.message : 'No se pudo volver a traducir, intenta de nuevo')
        } finally {
            setTranslating(false)
        }
    }

    const onSaveTranslation = async (lang) => {
        const current = translations[lang]
        if (!current) return
        // Postgres valida el NOT NULL de source_hash al construir la fila a
        // insertar incluso cuando el upsert va a terminar en UPDATE por el
        // ON CONFLICT — hay que mandarlo siempre, aunque la fila ya exista.
        const { error } = await supabase
            .from('invitation_translations')
            .upsert({
                invitation_id: id,
                lang,
                source_hash: await sha1(withProdShape(copy)),
                content: withProdShape(current.content),
                section_hashes: current.section_hashes,
            }, { onConflict: 'invitation_id,lang' })

        if (error) {
            console.error('Error guardando traducción:', error)
            throw error
        }
    }

    // Carga perezosa: solo trae de Supabase los idiomas activos que todavía no
    // están en memoria (ej. al abrir el builder de una invitación que ya tenía
    // idiomas agregados en una sesión anterior).
    useEffect(() => {
        const languages = copy?.generals?.languages
        if (!languages || languages.length === 0) return
        const missing = languages.filter(lang => !translations[lang])
        if (missing.length === 0) return

        supabase
            .from('invitation_translations')
            .select('lang, content, section_hashes')
            .eq('invitation_id', id)
            .in('lang', missing)
            .then(({ data, error }) => {
                if (error || !data) return
                setTranslations(prev => {
                    const next = { ...prev }
                    data.forEach(row => {
                        next[row.lang] = { content: withDevMirror(row.content), section_hashes: row.section_hashes ?? {} }
                    })
                    return next
                })
            })
    }, [copy?.generals?.languages, id])

    // Badge de "desactualizado" por módulo: compara el hash del contenido en
    // español contra el section_hashes que quedó guardado la última vez que se
    // tradujo esa sección — no dispara ninguna traducción, solo avisa.
    useEffect(() => {
        if (!activeLang || !copy) {
            setStaleSections(new Set())
            return
        }
        const sectionHashes = translations[activeLang]?.section_hashes ?? {}
        // section_hashes se calculó en el servidor sobre invitations.data (forma
        // "prod"). copy es la copia de trabajo con el mirror dev<->prod ya aplicado
        // (cover/quote/dresscode/gallery tienen un campo "dev" que prod no tiene),
        // así que hay que revertir ese mirror antes de comparar o el hash nunca
        // coincide para esos 4 módulos aunque no se haya editado nada.
        const prodShapedCopy = withProdShape(copy)
        let cancelled = false

        Promise.all(
            Object.keys(sectionHashes).map(async (section) => {
                const currentHash = await sha1(prodShapedCopy[section])
                return currentHash !== sectionHashes[section] ? section : null
            })
        ).then((stale) => {
            if (!cancelled) setStaleSections(new Set(stale.filter(Boolean)))
        })

        return () => { cancelled = true }
    }, [activeLang, copy, translations])

    const hideMenu = useCallback(() => {
        if (menuTimerRef.current) {
            clearTimeout(menuTimerRef.current);
            menuTimerRef.current = null;
        }
        setOnHide(true);
    }, []);

    const handleClick = (item) => {
        setCurrentSection(item.value)
        setPositionY(item.type)
    }

    const handleSectionChange = (type) => {
        const item = buttons.find((b) => b.type === type)
        if (!item) return
        setCurrentSection(item.value)
        setPositionY(item.type)
    }

    // Tras guardar el español, propaga los campos no-texto a todas las traducciones
    // en memoria y en Supabase, preservando los textos traducidos de cada idioma.
    const syncTranslationsToNewSource = async (savedInvitation) => {
        const langs = Object.keys(translations)
        if (langs.length === 0) return

        const sourceHash = await sha1(savedInvitation)
        const sourceWithDev = withDevMirror(savedInvitation)
        const upserts = []
        const nextTranslations = {}

        for (const lang of langs) {
            const current = translations[lang]
            if (!current) continue
            const mergedContent = mergeSourceIntoTranslation(current.content, sourceWithDev)
            nextTranslations[lang] = { ...current, content: mergedContent }
            upserts.push({
                invitation_id: id,
                lang,
                source_hash: sourceHash,
                content: withProdShape(mergedContent),
                section_hashes: current.section_hashes,
            })
        }

        setTranslations(prev => ({ ...prev, ...nextTranslations }))
        if (upserts.length > 0) {
            const { error } = await supabase
                .from('invitation_translations')
                .upsert(upserts, { onConflict: 'invitation_id,lang' })
            if (error) console.error('Error sincronizando traducciones:', error)
        }
    }

    // Núcleo compartido del guardado en español (lo llaman onWriteChanges, onSaveChanges y el modal)
    const proceedWithSpanishSave = async (type) => {
        const savedInvitation = withProdShape(copy)
        try {
            if (type === 'write') {
                await axios.patch(
                    `${import.meta.env.VITE_API_URL}/api/invitation/update-data`,
                    { id, data: savedInvitation }
                )
                messageApi.info(t('buttons_menu.msg_written'))
            } else {
                const { error } = await supabase
                    .from('invitations')
                    .update({ data: savedInvitation })
                    .eq('id', id)
                if (error) { console.error('Error actualizando:', error); return }
                messageApi.success(t('buttons_menu.msg_saved'))
            }
            setSaved(true)
            lastSavedTextsRef.current = extractTextFields(copy)
            await syncTranslationsToNewSource(savedInvitation)
        } catch (error) {
            console.error('Error guardando:', error.response?.data || error.message)
            throw error
        }
    }

    const onWriteChanges = async () => {
        if (activeLang) {
            try {
                await onSaveTranslation(activeLang)
                messageApi.info(t('buttons_menu.msg_written'))
                setSaved(true)
            } catch (error) {
                console.error('Error actualizando traducción:', error)
            }
            return
        }

        if (lastSavedTextsRef.current !== extractTextFields(copy) && Object.keys(translations).length > 0) {
            pendingSaveRef.current = 'write'
            setTranslationWarning(true)
            return
        }

        await proceedWithSpanishSave('write')
    }

    const onSaveChanges = async () => {
        if (activeLang) {
            try {
                await onSaveTranslation(activeLang)
                messageApi.success(t('buttons_menu.msg_saved'))
                setSaved(true)
            } catch (error) {
                console.error('Error actualizando traducción:', error)
            }
            return
        }

        if (lastSavedTextsRef.current !== extractTextFields(copy) && Object.keys(translations).length > 0) {
            pendingSaveRef.current = 'save'
            setTranslationWarning(true)
            return
        }

        await proceedWithSpanishSave('save')
    }

    const getNewInvitations = async () => {

        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
            console.error("Error al obtener la sesión");
            return;
        }

        const { data, error } = await supabase
            .from("invitations")
            .select("data, id, plan")
            // .eq("user_id", session.user.id)
            .eq("id", id)
            .maybeSingle();


        console.log(data)

        if (error) {
            console.error("Error al obtener invitaciones:", error);
        } else {
            setInvitation(data?.data)
            setPlan(data?.plan ?? null)
            // setInvitationID(data?.id)
        }

    };


    useEffect(() => {
        getNewInvitations()
        setSaved(true)
    }, [id])


    useEffect(() => {
        if (invitation) {

            const newCopy = {
                ...invitation,
                cover: {
                    ...invitation?.cover,
                    image: {
                        ...invitation.cover?.image,
                        dev: invitation.cover?.image.prod
                    }
                    // featured_dev: invitation.cover.featured_prod
                },
                quote: {
                    ...invitation?.quote,
                    image: {
                        ...invitation.quote?.image,
                        dev: invitation.quote.image?.prod
                    }
                },

                dresscode: {
                    ...invitation?.dresscode,
                    dev: invitation.dresscode?.prod
                },
                gallery: {
                    ...invitation?.gallery,
                    dev: invitation.gallery?.prod
                }

            }


            setCopy(newCopy)
            lastSavedTextsRef.current = extractTextFields(newCopy)
        }
    }, [invitation])


    useEffect(() => {
        if (coverUpdated) {

            handleClick(buttons[0])

            setTimeout(() => {
                // setLoader(true)
                // getInvitationbyID(operation, invitationID)
                setCoverUpdated(false)
                handleClick(buttons[1])

            }, 500);
        }
    }, [coverUpdated])

    useEffect(() => {
        const handleTexture = () => {
            setCopy(prevInvitation => ({
                ...prevInvitation,
                generals: {
                    ...prevInvitation.generals,
                    texture: prevInvitation.generals.texture
                }
            }));
        }

        if (copy) {
            handleTexture()
        }

    }, [saved])


    return (

        <>
            {contextHolder}

            <Modal
                open={translationWarning}
                title="Textos modificados"
                okText="Guardar de todas formas"
                cancelText="Cancelar"
                onOk={async () => {
                    setTranslationWarning(false)
                    await proceedWithSpanishSave(pendingSaveRef.current)
                    pendingSaveRef.current = null
                }}
                onCancel={() => {
                    setTranslationWarning(false)
                    pendingSaveRef.current = null
                }}
            >
                <p style={{ margin: 0 }}>
                    Modificaste textos en la versión en español. Revisa tus traducciones después de guardar para que estén al día.
                </p>
            </Modal>

            {
                copy ?
                    <Layout className='main-build-layout' style={{ minHeight: '100vh', overflow: 'clip' }}>

                        <HeaderDashboard saved={saved} mode={'edit'} onSaveChanges={onSaveChanges} session={session} onWriteChanges={onWriteChanges} />


                        <div className='build-componentes-container' style={{ margin: '0px', position: 'relative', justifyContent: 'flex-start' }}>


                            <div className='buld-interacting-tools-cont' style={{zIndex:999}}>

                                <ButtonsMenu invitation={copy} setOnHide={setOnHide} menuTimerRef={menuTimerRef} buttons={buttons} currentSection={currentSection} handleClick={handleClick} staleSections={activeLang ? staleSections : null} />

                                <BuildMenu
                                    invitationID={id}
                                    setSettingsModal={setSettingsModal} settingsModal={settingsModal} setSaved={setSaved} saved={saved} onHide={onHide} setOnHide={setOnHide} hideMenu={hideMenu}
                                    buttons={buttons} currentSection={currentSection} setPositionY={setPositionY} positionY={positionY} invitation={getActiveInvitation()} setInvitation={setActiveField} activeLang={activeLang} />

                            </div>

                            <BuildContent invitationID={id} onHide={onHide} setOnHide={setOnHide}
                                setDevice={setDevice} currentDevice={device} coverUpdated={coverUpdated} positionY={positionY} setPositionY={setPositionY} invitation={getActiveInvitation()} onSectionChange={handleSectionChange}
                                languages={copy?.generals?.languages ?? []} disabledLanguages={copy?.generals?.disabledLanguages ?? []} activeLang={activeLang} onActiveLangChange={setActiveLang}
                                onAddLanguage={addLanguage} onToggleLanguageEnabled={toggleLanguageEnabled} onRetranslate={retranslate} translating={translating} />

                        </div>


                        <UpgradeBanner plan={plan} invitationId={id} floating={false} hideOnMobile />
                    </Layout >
                    : <div className='build-loading-container'>
                        <img alt='' src={load} style={{
                            width: '200px'
                        }} />
                    </div>
            }



        </>

    )
}
