import { Button, Col, ColorPicker, Dropdown, Grid, Input, Row, Segmented, Select, Slider, message } from 'antd'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Separador } from '../../../../components/Invitation/Logos';
import { HelpDrawer } from '../../../../components/Helpers/HelpDrawer';
import { useTextures } from '../../../../context/TexturesContext';
import { RxValueNone } from 'react-icons/rx';
import { LuArrowBigDownDash, LuArrowBigUpDash, LuRedo2, LuRotateCcw, LuSettings2 } from 'react-icons/lu';
import { colorFactoryToHex, darker, lighter } from '../../../../helpers/assets/functions';
import { fonts } from '../../../../helpers/assets/fonts';
import { useFonts } from '../../../../context/FontsContext';
import { ArrowUpRight, ChevronDown, ChevronUp, Maximize2, Paintbrush, Palette, Upload, X } from 'lucide-react';
import { colorCollection } from '../../../../helpers/services/colorPalette';
import { SiSpotify } from 'react-icons/si';
import { uploadSongAudio } from '../../../../helpers/services/uploadAudio';

const _spotifyTokenCache = { token: null, expiry: 0 };

async function getSpotifyToken() {
    if (_spotifyTokenCache.token && Date.now() < _spotifyTokenCache.expiry) {
        return _spotifyTokenCache.token;
    }
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;
    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        },
        body: 'grant_type=client_credentials',
    });
    const data = await res.json();
    _spotifyTokenCache.token = data.access_token;
    _spotifyTokenCache.expiry = Date.now() + (data.expires_in - 60) * 1000;
    return data.access_token;
}

async function searchSpotifyTracks(query) {
    const token = await getSpotifyToken();
    const res = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    return data.tracks?.items ?? [];
}


const { Option } = Select;
const { useBreakpoint } = Grid;



export const BuildGenerals = ({ invitation, setInvitation, setSaved, invitationID, fontOptions, fontsOnly = false, newFonts = [] }) => {

    const { t } = useTranslation()
    const { textures } = useTextures()
    const { fonts: activeFonts } = useFonts()
    fontOptions = fontOptions ?? (activeFonts.length ? activeFonts : fonts)
    const selectedTexture = textures.find(texture => texture.id === invitation.generals.texture)
    const [currentPosition, setCurrentPosition] = useState(null)
    const [currentItem, setCurrentItem] = useState(null)
    const [visible, setVisible] = useState(false)
    const [type, setType] = useState(null)
    const [presets, setPresets] = useState(null)
    const [showPrim, setShowPrim] = useState(null)
    const [showSec, setShowSec] = useState(null)
    const [showAccent, setShowAccent] = useState(null)
    const [showAction, setShowAction] = useState(null)
    const [searchCollection, setSearchCollection] = useState("")
    const [openTitulos, setOpenTitulos] = useState(false)
    const [openCuerpo, setOpenCuerpo] = useState(false)
    const [openColeccion, setOpenColeccion] = useState(false)
    const [openTexturas, setOpenTexturas] = useState(false)
    const [openSeparadores, setOpenSeparadores] = useState(false)
    const [songQuery, setSongQuery] = useState('')
    const [songResults, setSongResults] = useState([])
    const [songLoading, setSongLoading] = useState(false)
    const [songMode, setSongMode] = useState('search')
    const [audioUploading, setAudioUploading] = useState(false)
    const audioInputRef = useRef(null)

    const screens = useBreakpoint()

    useEffect(() => {
        const presetColors = [
            {
                label: t('build_generals.label_bg'),
                colors: [
                    darker(invitation.generals.colors.primary, 0.3),
                    darker(invitation.generals.colors.primary, 0.5),
                    darker(invitation.generals.colors.primary, 0.7),
                    darker(invitation.generals.colors.primary, 0.9),
                    invitation.generals.colors.primary,
                    lighter(invitation.generals.colors.primary, 0.9),
                    lighter(invitation.generals.colors.primary, 0.7),
                    lighter(invitation.generals.colors.primary, 0.5),
                    lighter(invitation.generals.colors.primary, 0.3),
                    lighter(invitation.generals.colors.primary, 0.1),
                ]
            },
            {
                label: t('build_generals.label_contrast'),
                colors: [
                    darker(invitation.generals.colors.secondary, 0.3),
                    darker(invitation.generals.colors.secondary, 0.5),
                    darker(invitation.generals.colors.secondary, 0.7),
                    darker(invitation.generals.colors.secondary, 0.9),
                    invitation.generals.colors.secondary,
                    lighter(invitation.generals.colors.secondary, 0.9),
                    lighter(invitation.generals.colors.secondary, 0.7),
                    lighter(invitation.generals.colors.secondary, 0.5),
                    lighter(invitation.generals.colors.secondary, 0.3),
                    lighter(invitation.generals.colors.secondary, 0.1),
                ]
            },
            {
                label: t('build_generals.label_texts'),
                colors: [
                    darker(invitation.generals.colors.accent, 0.3),
                    darker(invitation.generals.colors.accent, 0.5),
                    darker(invitation.generals.colors.accent, 0.7),
                    darker(invitation.generals.colors.accent, 0.9),
                    invitation.generals.colors.accent,
                    lighter(invitation.generals.colors.accent, 0.9),
                    lighter(invitation.generals.colors.accent, 0.7),
                    lighter(invitation.generals.colors.accent, 0.5),
                    lighter(invitation.generals.colors.accent, 0.3),
                    lighter(invitation.generals.colors.accent, 0.1),
                ]
            },
            {
                label: t('build_generals.preset_buttons'),
                colors: [
                    darker(invitation.generals.colors.actions, 0.3),
                    darker(invitation.generals.colors.actions, 0.5),
                    darker(invitation.generals.colors.actions, 0.7),
                    darker(invitation.generals.colors.actions, 0.9),
                    invitation.generals.colors.actions,
                    lighter(invitation.generals.colors.actions, 0.9),
                    lighter(invitation.generals.colors.actions, 0.7),
                    lighter(invitation.generals.colors.actions, 0.5),
                    lighter(invitation.generals.colors.actions, 0.3),
                    lighter(invitation.generals.colors.actions, 0.1),
                ]
            }
        ];

        setPresets(presetColors)
    }, [])

    const handleClick = (item, index) => {
        setCurrentItem((prev) => prev === item ? null : item)
        setCurrentPosition(index)
    }
    const moveUp = (positions, index) => {
        if (index <= 0 || index >= positions.length) {
            return positions;
        }

        const newPositions = [...positions];
        [newPositions[index], newPositions[index - 1]] = [newPositions[index - 1], newPositions[index]];
        return newPositions;
    }
    const moveDown = (positions, index) => {
        if (index < 0 || index >= positions.length - 1) {
            return positions;
        }

        const newPositions = [...positions];
        [newPositions[index], newPositions[index + 1]] = [newPositions[index + 1], newPositions[index]];
        return newPositions;
    }

    const onChangePrimary = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                colors: {
                    ...prevInvitation.generals.colors,
                    primary: colorFactoryToHex(e)
                }
            },
        }));
        setSaved(false);
    };

    const onChangeSecondary = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                colors: {
                    ...prevInvitation.generals.colors,
                    secondary: colorFactoryToHex(e)
                }
            },
        }));
        setSaved(false);
    };

    const onChangeAccent = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                colors: {
                    ...prevInvitation.generals.colors,
                    accent: colorFactoryToHex(e)
                }
            },
        }));
        setSaved(false);
    };

    const onChangeButtons = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                colors: {
                    ...prevInvitation.generals.colors,
                    actions: colorFactoryToHex(e)
                }
            },
        }));
        setSaved(false);
    };

    const changeByCollection = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                colors: {
                    ...prevInvitation.generals.colors,
                    primary: e.primary,
                    secondary: e.secondary,
                    accent: e.accent,
                    actions: e.actions
                },
                fonts: {
                    ...prevInvitation.generals.fonts,
                    titles: {
                        ...prevInvitation.generals.fonts.titles,
                        color: e.accent
                    }
                }
            },
        }));

        setSaved(false);
    };

    const handleFont = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                fonts: {
                    ...prevInvitation.generals.fonts,
                    body: {
                        ...prevInvitation.generals.fonts.body,
                        typeFace: e
                    }
                }
            },
        }));
        setSaved(false)
    }

    const handleTitle = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                fonts: {
                    ...prevInvitation.generals.fonts,
                    titles: {
                        ...prevInvitation.generals.fonts.titles,
                        typeFace: e
                    }
                }
            },
        }));
        setSaved(false)
    }


    const handleNamePosition = (position) => {
        switch (position) {
            case 1: return t('build_generals.section_greeting')
            case 2: return t('build_generals.section_people')
            case 3: return t('build_generals.section_quote')
            case 4: return t('build_generals.section_itinerary')
            case 5: return t('build_generals.section_dresscode')
            case 6: return t('build_generals.section_gifts')
            case 7: return t('build_generals.section_destinations')
            case 8: return t('build_generals.section_notices')
            case 9: return t('build_generals.section_gallery')
            default:
                break;
        }
    }

    const isEneablePosition = (position) => {
        switch (position) {
            case 1: return invitation.greeting.active
            case 2: return invitation.people.active
            case 3: return invitation.quote.active
            case 4: return invitation.itinerary.active
            case 5: return invitation.dresscode.active
            case 6: return invitation.gifts.active
            case 7: return invitation.destinations.active
            case 8: return invitation.notices.active
            case 9: return invitation.gallery.active
            default:
                break;
        }
    }

    const restartPositions = () => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                positions: [1, 2, 3, 4, 5, 6, 7, 8, 9]
            }
        }));
        setCurrentItem(null)
        setCurrentPosition(null)
        setSaved(false)

    }

    const moveUpPosition = (index) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                positions: moveUp(prevInvitation.generals.positions, index)
            }
        }));
        setSaved(false)
        setCurrentPosition(currentPosition - 1)

    }

    const moveDownPosition = (index) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                positions: moveDown(prevInvitation.generals.positions, index)
            }
        }));
        setSaved(false)
        setCurrentPosition(currentPosition + 1)
    }

    const handleSeparator = (new_separator) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                separator: new_separator
            }
        }));
        setSaved(false)
    }

    const handleTexture = (new_texture) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                texture: new_texture
            }
        }));
        setSaved(false)
    }

    const onChnageTitleColor = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                fonts: {
                    ...prevInvitation.generals.fonts,
                    titles: {
                        ...prevInvitation.generals.fonts.titles,
                        color: colorFactoryToHex(e)
                    }
                }
            },
        }));
        setSaved(false)
    };


    useEffect(() => {
        if (!songQuery.trim()) {
            setSongResults([])
            return
        }
        setSongLoading(true)
        const timer = setTimeout(async () => {
            try {
                const tracks = await searchSpotifyTracks(songQuery)
                setSongResults(tracks)
            } catch {
                setSongResults([])
            } finally {
                setSongLoading(false)
            }
        }, 400)
        return () => clearTimeout(timer)
    }, [songQuery])

    const handleSelectSong = (track) => {
        setInvitation(prev => ({
            ...prev,
            cover: {
                ...prev.cover,
                song: {
                    id: track.id,
                    source: 'spotify',
                    name: track.name,
                    artist: track.artists[0].name,
                    albumArt: track.album.images[track.album.images.length - 1]?.url,
                    previewUrl: track.preview_url
                }
            }
        }))

        setSaved(false)
        setSongQuery('')
        setSongResults([])
    }

    const handleRemoveSong = () => {
        setInvitation(prev => ({
            ...prev,
            cover: {
                ...prev.cover,
                song: null
            }
        }))
        setSaved(false)
    }

    const handleAudioFileChange = async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file || !invitationID) return

        setAudioUploading(true)
        try {
            const url = await uploadSongAudio({ file, invitationID })
            if (!url) return

            setInvitation(prev => ({
                ...prev,
                cover: {
                    ...prev.cover,
                    song: {
                        id: `upload-${Date.now()}`,
                        source: 'upload',
                        name: file.name.replace(/\.[^/.]+$/, ''),
                        artist: '',
                        albumArt: null,
                        previewUrl: url
                    }
                }
            }))
            setSaved(false)
        } catch (err) {
            console.error(err)
            message.error(t('build_generals.song_upload_error'))
        } finally {
            setAudioUploading(false)
        }
    }

    const filteredCollection = colorCollection.filter((item) => {
        const query = searchCollection.trim().toLowerCase()

        if (!query) return true

        return (
            item.name.toLowerCase().includes(query) ||
            item.keywords.some((keyword) =>
                keyword.toLowerCase().includes(query)
            )
        )
    })

    const titulosContent = (
        <div className='generals-settings-popup' style={{ maxWidth: '100%' }}>

            <span className='gc-content-label'>{t('build_generals.label_typeface')}</span>

            <Select
                value={invitation?.generals?.fonts?.titles?.typeFace ?? invitation?.generals?.fonts?.body?.typeFace}
                onChange={(e) => handleTitle(e)}
                style={{ width: '100%' }}>
                {fontOptions.map((font, index) => (
                    <Option key={index} value={font}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span style={{ fontFamily: font }}>{font}</span>
                            {newFonts.includes(font) && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ff4d4f', flexShrink: 0 }} />}
                        </span>
                    </Option>
                ))}
            </Select>

            <Col style={{
                width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column',
                marginTop: '10px'
            }}>
                <span className='gc-content-label'>{t('build_generals.label_size')}</span>

                <Slider
                    style={{ width: '95%', }}
                    min={8}
                    max={36}
                    step={2}
                    onChange={(e) => setInvitation(prevInvitation => ({
                        ...prevInvitation,
                        generals: {
                            ...prevInvitation.generals,
                            fonts: {
                                ...prevInvitation.generals.fonts,
                                titles: {
                                    ...prevInvitation.generals.fonts.titles,
                                    size: e
                                }
                            },
                        },
                    }))}
                    value={invitation.generals.fonts.titles?.size === 0 ? 18 : (invitation.generals.fonts.titles?.size ?? 18)}
                />

                <Row style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', flexDirection: 'row'
                }}>
                    <Col style={{
                        width: '48%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column'
                    }}>
                        <span className='gc-content-label'>{t('build_generals.label_opacity')}</span>
                        <Slider
                            style={{ width: '95%' }}
                            min={0.1}
                            max={1}
                            step={0.01}
                            onChange={(e) => setInvitation(prevInvitation => ({
                                ...prevInvitation,
                                generals: {
                                    ...prevInvitation.generals,
                                    fonts: {
                                        ...prevInvitation.generals.fonts,
                                        titles: {
                                            ...prevInvitation.generals.fonts.titles,
                                            opacity: e
                                        }
                                    },
                                },
                            }))}
                            value={invitation.generals.fonts.titles?.opacity ?? 1}
                        />
                    </Col>

                    <Col style={{
                        width: '48%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column'
                    }}>
                        <span className='gc-content-label'>{t('build_generals.label_weight')}</span>
                        <Slider
                            style={{ width: '95%' }}
                            min={100}
                            max={1000}
                            step={100}
                            onChange={(e) => setInvitation(prevInvitation => ({
                                ...prevInvitation,
                                generals: {
                                    ...prevInvitation.generals,
                                    fonts: {
                                        ...prevInvitation.generals.fonts,
                                        titles: {
                                            ...prevInvitation.generals.fonts.titles,
                                            weight: e
                                        }
                                    },
                                },
                            }))}
                            value={invitation.generals.fonts.titles?.weight === 0 ? 600 : (invitation.generals.fonts.titles?.weight ?? 600)}
                        />
                    </Col>
                </Row>
            </Col>

            <Row style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexDirection: 'row', width: '100%'
            }}>
                <span className='gc-content-label'>{t('build_generals.label_color')}</span>
            </Row>

            <div className='generl-card-color-item'>
                <span>{invitation.generals.fonts.titles?.color}</span>
                <div className='general-cards-single-row'>
                    <ColorPicker
                        presets={presets}
                        disabledAlpha={false}
                        value={invitation.generals.fonts.titles?.color === '#000000' ? invitation.generals.colors.accent : (invitation.generals.fonts.titles?.color ?? invitation.generals.colors.accent)}
                        style={{ width: '80px' }}
                        onChangeComplete={(e) => onChnageTitleColor(e)}>
                    </ColorPicker>
                </div>
            </div>

        </div>
    )

    const cuerpoContent = (
        <div className='generals-settings-popup' style={{ maxWidth: '100%' }}>

            <span className='gc-content-label'>{t('build_generals.label_typeface')}</span>

            <Select
                value={invitation?.generals?.fonts.body?.typeFace}
                onChange={(e) => handleFont(e)}
                style={{ width: '100%' }}>
                {fontOptions.map((font, index) => (
                    <Option key={index} value={font}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span style={{ fontFamily: font }}>{font}</span>
                            {newFonts.includes(font) && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ff4d4f', flexShrink: 0 }} />}
                        </span>
                    </Option>
                ))}
            </Select>

            <Col style={{
                width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column',
                marginTop: '10px'
            }}>
                <Row style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', flexDirection: 'row'
                }}>
                    <Col style={{
                        width: '48%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column'
                    }}>
                        <span className='gc-content-label'>{t('build_generals.label_opacity')}</span>
                        <Slider
                            style={{ width: '95%' }}
                            min={0.1}
                            max={1}
                            step={0.01}
                            onChange={(e) => setInvitation(prevInvitation => ({
                                ...prevInvitation,
                                generals: {
                                    ...prevInvitation.generals,
                                    fonts: {
                                        ...prevInvitation.generals.fonts,
                                        body: {
                                            ...prevInvitation.generals.fonts.body,
                                            opacity: e
                                        }
                                    },
                                },
                            }))}
                            value={invitation.generals.fonts.body?.opacity ?? 1}
                        />
                    </Col>

                    <Col style={{
                        width: '48%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column'
                    }}>
                        <span className='gc-content-label'>{t('build_generals.label_weight')}</span>
                        <Slider
                            style={{ width: '95%' }}
                            min={100}
                            max={1000}
                            step={100}
                            onChange={(e) => setInvitation(prevInvitation => ({
                                ...prevInvitation,
                                generals: {
                                    ...prevInvitation.generals,
                                    fonts: {
                                        ...prevInvitation.generals.fonts,
                                        body: {
                                            ...prevInvitation.generals.fonts.body,
                                            weight: e
                                        }
                                    },
                                },
                            }))}
                            value={invitation.generals.fonts.body?.weight ?? 500}
                        />
                    </Col>
                </Row>
            </Col>

        </div>
    )

    const coleccionContent = (
        <div className="color_palette_container">
            <div className='collection_header_search'>
                {
                    !screens.xs &&
                    <>
                        <span className='collection_title'>{t('build_generals.collection_title')}</span>
                        <Input
                            value={searchCollection}
                            onChange={(e) => setSearchCollection(e.target.value)}
                            className='collection_search'
                            placeholder={t('build_generals.collection_search')}
                            style={{
                                maxWidth: '300px', borderRadius: '99px'
                            }} />
                    </>
                }

            </div>
            <div className='collection_grid scroll-invitation'>
                {
                    filteredCollection?.map((c, index) => (
                        <div key={index} className='color_collection_cont'>
                            <div className='collection_cont'>
                                <div
                                    style={{
                                        backgroundColor: c.primary,
                                        width: showPrim === c.name ? '96px' : (showAction === c.name || showSec === c.name || showAccent === c.name) ? '36.6px' : '50px'
                                    }}
                                    onMouseLeave={() => setShowPrim(null)} onMouseEnter={() => setShowPrim(c.name)} className='collection_item'>
                                    <span style={{ opacity: showPrim === c.name ? 1 : 0, color: c.accent }}>{c.primary}</span>
                                </div>
                                <div
                                    style={{
                                        backgroundColor: c.secondary,
                                        width: showSec === c.name ? '96px' : (showAction === c.name || showPrim === c.name || showAccent === c.name) ? '36.6px' : '50px'
                                    }}
                                    onMouseLeave={() => setShowSec(null)} onMouseEnter={() => setShowSec(c.name)} className='collection_item'>
                                    <span style={{ opacity: showSec === c.name ? 1 : 0, color: c.primary }}>{c.secondary}</span>
                                </div>
                                <div
                                    style={{
                                        backgroundColor: c.accent,
                                        width: showAccent === c.name ? '96px' : (showAction === c.name || showPrim === c.name || showSec === c.name) ? '36.6px' : '50px'
                                    }}
                                    onMouseLeave={() => setShowAccent(null)} onMouseEnter={() => setShowAccent(c.name)} className='collection_item'>
                                    <span style={{ opacity: showAccent === c.name ? 1 : 0, color: c.primary }}>{c.accent}</span>
                                </div>
                                <div
                                    style={{
                                        backgroundColor: c.actions,
                                        width: showAction === c.name ? '96px' : (showAccent === c.name || showPrim === c.name || showSec === c.name) ? '36.6px' : '50px'
                                    }}
                                    onMouseLeave={() => setShowAction(null)} onMouseEnter={() => setShowAction(c.name)} className='collection_item'>
                                    <span style={{ opacity: showAction === c.name ? 1 : 0, color: c.primary }}>{c.actions}</span>
                                </div>
                            </div>
                            <div className='name_collection'>
                                <span>{c.name}</span>
                                <Button onClick={() => changeByCollection(c)} type='text' icon={<Paintbrush size={14} />}></Button>
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>
    )

    const texturasContent = (
        <div className="grid-separators-container scroll-invitation" style={{
            gridTemplateColumns: 'repeat(3, 1fr)',
            backgroundColor: '#FFF', padding: '12px',
            borderRadius: !screens.xs ? '16px' : '0px', boxShadow: screens.xs ? '0px 0px 12px rgba(0,0,0,0.2)' : '0px 0px 0px rgba(0,0,0,0.2)'
        }}>
            <div
                onClick={() => handleTexture(null)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
                    height: '120px', borderRadius: '8px', overflow: 'hidden',
                    border: invitation.generals.texture == null ? 'px solid var(--brand-color-500)' : '1px solid var(--borders)', cursor: 'pointer'
                }}>
                <RxValueNone size={64} style={{ color: '#00000040' }} />
            </div>
            {
                textures.map((texture) => (
                    <div
                        key={texture.id}
                        onClick={() => handleTexture(texture.id)}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
                            height: '120px', borderRadius: '8px', overflow: 'hidden',
                            border: invitation.generals.texture === texture.id ? '1px solid var(--brand-color-500)' : '1px solid var(--borders)',
                            cursor: 'pointer'
                        }}>
                        <img alt='' src={texture?.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                ))
            }
        </div>
    )

    const separadoresContent = (
        <div className="grid-separators-container scroll-invitation" style={{
            gridTemplateColumns: screens.xs ?  'repeat(1, 1fr)' : 'repeat(3, 1fr)',
            backgroundColor: '#FFF', padding: '12px',
            borderRadius: screens.xs ? '0px' : '16px', boxShadow: '0px 0px 12px rgba(0,0,0,0.2)'
        }}>
            {
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((separator, index) => (
                    <div key={index} onClick={() => handleSeparator(separator)} className="build-separator-container" style={{
                        border: separator === invitation.generals.separator && '1px solid var(--brand-color-500)',
                        backgroundColor: separator === invitation.generals.separator && 'var(--sc-color)'
                    }}>
                        <Separador MainColor={'var(--text-color)'} build={true} dev={true} value={separator} />
                    </div>
                ))
            }
        </div>
    )

    const inlineStyle = (open) => ({
        maxHeight: open ? '700px' : '0',
        overflow: 'hidden',
        transition: 'max-height 0.35s ease',
        width: '100%',
    })

    return (
        <>
            {
                invitation ?
                    <div
                        className='generals-main-container'>


                        <div className='build-component-elements'>
                            <span className={'module--title'}
                                style={{ textAlign: 'left' }}
                            >{t('build_generals.title')}</span>

                            <div className='single_row' style={{ flexDirection: screens.xs ? 'column' : 'row', gap: '8px' }}>
                                <div className='single_col' style={{ flex: 1, width: '100%' }}>
                                    {screens.xs ? (
                                        <>
                                            <div
                                                onClick={() => setOpenTitulos(v => !v)}
                                                className='single_row'
                                                style={{ alignSelf: 'stretch', justifyContent: 'space-between', border: '1px solid #EBEBEB', padding: '8px', borderRadius: '99px', paddingLeft: '12px', cursor: 'pointer' }}>
                                                <span style={{
                                                    fontFamily: invitation?.generals?.fonts.titles?.typeFace ?? invitation?.generals?.fonts.body?.typeFace,
                                                    fontWeight: invitation?.generals?.fonts.titles?.weight ?? 600,
                                                    opacity: invitation?.generals?.fonts.titles?.opacity ?? 1,
                                                    color: invitation?.generals?.fonts.titles?.color ?? invitation?.generals?.colors.accent
                                                }}>{t('build_generals.titles')}</span>
                                                <Button
                                                    type='text'
                                                    style={{ minWidth: '24px', maxWidth: '24px', maxHeight: '24px' }}
                                                    className="primarybutton"
                                                    icon={openTitulos ? <ChevronUp size={12} /> : <ChevronDown size={12} />} />
                                            </div>
                                            <div style={inlineStyle(openTitulos)}>
                                                {titulosContent}
                                            </div>
                                        </>
                                    ) : (
                                        <Dropdown
                                            trigger={['click']}
                                            placement='bottomRight'
                                            popupRender={() => titulosContent}
                                        >
                                            <div className='single_row' style={{ alignSelf: 'stretch', justifyContent: 'space-between', border: '1px solid #EBEBEB', padding: '8px', borderRadius: '99px', paddingLeft: '12px' }}>
                                                <span style={{
                                                    fontFamily: invitation?.generals?.fonts.titles?.typeFace ?? invitation?.generals?.fonts.body?.typeFace,
                                                    fontWeight: invitation?.generals?.fonts.titles?.weight ?? 600,
                                                    opacity: invitation?.generals?.fonts.titles?.opacity ?? 1,
                                                    color: invitation?.generals?.fonts.titles?.color ?? invitation?.generals?.colors.accent
                                                }}>{t('build_generals.titles')}</span>
                                                <Button
                                                    type='text'
                                                    style={{ minWidth: '24px', maxWidth: '24px', maxHeight: '24px' }}
                                                    className="primarybutton"
                                                    icon={<LuSettings2 size={12} />} />
                                            </div>
                                        </Dropdown>
                                    )}
                                </div>

                                <div className='single_col' style={{ flex: 1, width: '100%', gap: '8px' }}>
                                    {screens.xs ? (
                                        <>
                                            <div
                                                onClick={() => setOpenCuerpo(v => !v)}
                                                className='single_row'
                                                style={{ alignSelf: 'stretch', justifyContent: 'space-between', border: '1px solid #EBEBEB', padding: '8px', borderRadius: '99px', paddingLeft: '12px', cursor: 'pointer' }}>
                                                <span style={{
                                                    fontFamily: invitation?.generals?.fonts.body?.typeFace,
                                                    fontWeight: invitation?.generals?.fonts.body?.weight,
                                                    opacity: invitation?.generals?.fonts.body?.opacity,
                                                }}>{t('build_generals.body')}</span>
                                                <Button
                                                    type='text'
                                                    style={{ minWidth: '24px', maxWidth: '24px', maxHeight: '24px' }}
                                                    className="primarybutton"
                                                    icon={openCuerpo ? <ChevronUp size={12} /> : <ChevronDown size={12} />} />
                                            </div>
                                            <div style={inlineStyle(openCuerpo)}>
                                                {cuerpoContent}
                                            </div>
                                        </>
                                    ) : (
                                        <Dropdown
                                            trigger={['click']}
                                            placement='bottomRight'
                                            popupRender={() => cuerpoContent}
                                        >
                                            <div className='single_row' style={{ alignSelf: 'stretch', justifyContent: 'space-between', border: '1px solid #EBEBEB', padding: '8px', borderRadius: '99px', paddingLeft: '12px' }}>
                                                <span style={{
                                                    fontFamily: invitation?.generals?.fonts.body?.typeFace,
                                                    fontWeight: invitation?.generals?.fonts.body?.weight,
                                                    opacity: invitation?.generals?.fonts.body?.opacity,
                                                }}>{t('build_generals.body')}</span>
                                                <Button
                                                    type='text'
                                                    style={{ minWidth: '24px', maxWidth: '24px', maxHeight: '24px' }}
                                                    className="primarybutton"
                                                    icon={<LuSettings2 size={12} />} />
                                            </div>
                                        </Dropdown>
                                    )}
                                </div>
                            </div>




                            <Row style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row',
                                marginTop: '10px',
                            }}>
                                <span className='gc-content-label'>{t('build_generals.label_palette')}</span>

                                {screens.xs ? (
                                    <Button
                                        onClick={() => setOpenColeccion(v => !v)}
                                        className='primarybutton'
                                        icon={<Palette size={12} />}>{t('build_generals.btn_collection')}</Button>
                                ) : (
                                    <Dropdown
                                        arrow
                                        placement='bottomLeft'
                                        trigger={['click']}
                                        popupRender={() => coleccionContent}
                                    >
                                        <Button className='primarybutton' icon={<Palette size={12} />}>{t('build_generals.btn_collection')}</Button>
                                    </Dropdown>
                                )}
                            </Row>

                            {screens.xs && (
                                <div style={inlineStyle(openColeccion)}>
                                    {coleccionContent}
                                </div>
                            )}


                            <div className='single_row' style={{ gap: '0px' }}>
                                <div className='generl-card-color-item' style={{ padding: '0', border: 'none' }}>
                                    <span >{t('build_generals.label_bg')}</span>
                                    <div className='general-cards-single-row' >
                                        <ColorPicker
                                            value={invitation.generals.colors.primary}
                                            disabledAlpha={false}
                                            style={{ width: '60px', height: '100px', backgroundColor: invitation.generals.colors.primary }}
                                            onChangeComplete={onChangePrimary}>
                                        </ColorPicker>
                                    </div>

                                </div>
                                <div className='generl-card-color-item' style={{ padding: '0', border: 'none' }}>
                                    <span >{t('build_generals.label_contrast')}</span>
                                    <div className='general-cards-single-row'>
                                        <ColorPicker
                                            disabledAlpha={false}
                                            value={invitation.generals.colors.secondary}

                                            style={{ width: '60px', height: '100px', backgroundColor: invitation.generals.colors.secondary }}
                                            onChangeComplete={onChangeSecondary}>
                                        </ColorPicker>
                                    </div>

                                </div>
                                <div className='generl-card-color-item' style={{ padding: '0', border: 'none' }}>
                                    <span >{t('build_generals.label_texts')}</span>
                                    <div className='general-cards-single-row'>
                                        <ColorPicker
                                            disabledAlpha={false}
                                            value={invitation.generals.colors.accent}
                                            style={{ width: '60px', height: '100px', backgroundColor: invitation.generals.colors.accent }}
                                            onChangeComplete={onChangeAccent}>
                                        </ColorPicker>
                                    </div>

                                </div>
                                <div className='generl-card-color-item' style={{ padding: '0', border: 'none' }}>
                                    <span >{t('build_generals.label_accents')}</span>
                                    <div className='general-cards-single-row'>
                                        <ColorPicker
                                            disabledAlpha={false}
                                            value={invitation.generals.colors.actions}
                                            style={{ width: '60px', height: '100px', backgroundColor: invitation.generals.colors.actions }}
                                            onChangeComplete={onChangeButtons}>
                                        </ColorPicker>
                                    </div>

                                </div>
                            </div>




                        </div>

                        {!fontsOnly && <div className='build-component-elements' style={{ width: '100%' }}>
                            <span className={'gc-content-label'}>{t('build_generals.label_song')}</span>
                            {/* <span style={{ fontSize: '11px', color: '#888', marginTop: '-4px' }}>
                                {t('build_generals.song_description')}
                            </span> */}

                            {invitation.cover?.song ? (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                                    border: '1px solid var(--borders)', borderRadius: '12px', padding: '8px 12px'
                                }}>
                                    {invitation.cover.song.albumArt && (
                                        <img src={invitation.cover.song.albumArt} alt=""
                                            style={{ width: 40, height: 40, borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                                    )}
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {invitation.cover.song.name}
                                        </div>
                                        {invitation.cover.song.artist && (
                                            <div style={{ fontSize: '11px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {invitation.cover.song.artist}
                                            </div>
                                        )}
                                    </div>
                                    <Button type='text' onClick={handleRemoveSong} size='small'
                                        icon={<X size={14} />}
                                        style={{ color: '#888', flexShrink: 0 }} />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                    <Segmented
                                        block
                                        className='song-mode-segmented'
                                        style={{ borderRadius: '99px', padding: '2px', border: '1px solid #EBEBEB' }}
                                        value={songMode}
                                        onChange={setSongMode}
                                        options={[
                                            { label: t('build_generals.song_mode_spotify'), value: 'search' },
                                            { label: t('build_generals.song_mode_upload'), value: 'upload' },
                                        ]}
                                    />

                                    {songMode === 'search' ? (
                                        <>
                                            <Input
                                                value={songQuery}
                                                onChange={e => setSongQuery(e.target.value)}
                                                placeholder={t('build_generals.song_placeholder')}
                                                style={{ borderRadius: '99px' }}
                                                prefix={<SiSpotify style={{ color: '#1DB954' }} />}
                                            />
                                            {songLoading && (
                                                <span style={{ fontSize: '12px', color: '#888' }}>{t('build_generals.song_searching')}</span>
                                            )}
                                            {songResults.length > 0 && (
                                                <div style={{ border: '1px solid var(--borders)', borderRadius: '12px', overflow: 'hidden', width: '100%' }}>
                                                    {songResults.map((track) => (
                                                        <div
                                                            key={track.id}
                                                            onClick={() => handleSelectSong(track)}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                                padding: '8px 12px', cursor: 'pointer',
                                                                borderBottom: '1px solid var(--borders)',
                                                            }}
                                                            className='song-result-item'
                                                        >
                                                            {track.album.images[track.album.images.length - 1]?.url && (
                                                                <img src={track.album.images[track.album.images.length - 1].url} alt=""
                                                                    style={{ width: 36, height: 36, borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} />
                                                            )}
                                                            <div style={{ overflow: 'hidden' }}>
                                                                <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {track.name}
                                                                </div>
                                                                <div style={{ fontSize: '11px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {track.artists[0]?.name}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <input
                                                ref={audioInputRef}
                                                type='file'
                                                accept='audio/*'
                                                style={{ display: 'none' }}
                                                onChange={handleAudioFileChange}
                                            />
                                            <Button
                                                className='primarybutton'
                                                loading={audioUploading}
                                                disabled={!invitationID}
                                                icon={<Upload size={14} />}
                                                onClick={() => audioInputRef.current?.click()}
                                            >
                                                {t('build_generals.song_upload_btn')}
                                            </Button>
                                            <span style={{ fontSize: '11px', color: '#888' }}>
                                                {t('build_generals.song_upload_hint')}
                                            </span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>}

                        {!fontsOnly && <div className='build-component-elements'>


                            <Row className='gc-cta-buttons-container edit-position-controller' style={{
                                justifyContent: 'space-between', width: '100%', marginBottom: '8px'
                            }}>

                                <span style={{ width: 'auto' }} className={'gc-content-label'}
                                >{t('build_generals.label_structure')}</span>

                                <div className='general-cards-single-row' style={{ width: 'auto' }}>

                                    <Button
                                        className='primarybutton'
                                        onClick={restartPositions}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        icon={<LuRotateCcw />}>

                                    </Button>

                                    <Button
                                        onClick={() => moveUpPosition(currentPosition)}
                                        icon={<LuArrowBigUpDash size={16} />}
                                        className={`primarybutton${currentItem ? "--active" : ''}`}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    ></Button>

                                    <Button
                                        onClick={() => moveDownPosition(currentPosition)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        icon={<LuArrowBigDownDash size={16} />}
                                        className={`primarybutton${currentItem ? "--active" : ''}`} />
                                </div>



                            </Row>

                            <div className='build-generals-simple-column' style={{ gap: '12x' }}>
                                {
                                    invitation.generals.positions.map((item, index) => (
                                        <div
                                            key={index}
                                            onClick={() => handleClick(item, index)}
                                            className={`gc-order-item${item === currentItem ? '--selected' : !isEneablePosition(item) ? '--disabled' : ''}`}>{handleNamePosition(item)}</div>
                                    ))
                                }
                            </div>



                        </div>}

                        {!fontsOnly && <div className='build-component-elements'>
                            <span className={'gc-content-label'}
                            >{t('build_generals.label_textures')}</span>
                            <div
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
                                    height: '80px', borderRadius: '12px', overflow: 'hidden',
                                    border: '1px solid var(--borders)',
                                    cursor: 'pointer', position: 'relative'
                                }}>

                                {
                                    selectedTexture?.image &&

                                    <img alt='' src={selectedTexture?.image} style={{
                                        width: '100%', height: '100%', objectFit: 'cover'
                                    }} />
                                }

                                {screens.xs ? (
                                    <Button
                                        icon={<LuRedo2 />}
                                        onClick={() => setOpenTexturas(v => !v)}
                                        style={{
                                            position: 'absolute', bottom: '8px', right: '8px', backgroundColor: '#FFFFFF40', color: '#000', backdropFilter: 'blur(10px)',
                                            border: '1px solid #FFF'
                                        }}>
                                        {t('build_generals.btn_change_texture')}
                                    </Button>
                                ) : (
                                    <Dropdown
                                        trigger={['click']}
                                        placement='right'
                                        popupRender={() => texturasContent}
                                    >
                                        <Button
                                            icon={<LuRedo2 />}
                                            style={{
                                                position: 'absolute', bottom: '8px', right: '8px', backgroundColor: '#FFFFFF40', color: '#000', backdropFilter: 'blur(10px)',
                                                border: '1px solid #FFF'
                                            }}>
                                            {t('build_generals.btn_change_texture')}
                                        </Button>
                                    </Dropdown>
                                )}

                            </div>

                            {screens.xs && (
                                <div style={inlineStyle(openTexturas)}>
                                    {texturasContent}
                                </div>
                            )}

                        </div>}

                        {!fontsOnly && <div className='build-component-elements'>
                            <span className={'gc-content-label'}
                            >{t('build_generals.label_separators')}</span>

                            <div className="build-separator-container" style={{ width: '100%', position: 'relative', height: '140px' }}>
                                <Separador MainColor={'var(--text-color)'} build={true} dev={true} value={invitation.generals.separator}
                                />

                                {screens.xs ? (
                                    <Button
                                        icon={<LuRedo2 />}
                                        onClick={() => setOpenSeparadores(v => !v)}
                                        style={{
                                            position: 'absolute', bottom: '8px', right: '8px', backgroundColor: '#FFFFFF40', color: '#000', backdropFilter: 'blur(10px)',
                                            border: '1px solid #FFF'
                                        }}>
                                        {t('build_generals.btn_change_separator')}
                                    </Button>
                                ) : (
                                    <Dropdown
                                        trigger={['click']}
                                        placement='bottomRight'
                                        popupRender={() => separadoresContent}
                                    >
                                        <Button
                                            icon={<LuRedo2 />}
                                            style={{
                                                position: 'absolute', bottom: '8px', right: '8px', backgroundColor: '#FFFFFF40', color: '#000', backdropFilter: 'blur(10px)',
                                                border: '1px solid #FFF'
                                            }}>
                                            {t('build_generals.btn_change_separator')}
                                        </Button>
                                    </Dropdown>
                                )}
                            </div>

                            {screens.xs && (
                                <div style={inlineStyle(openSeparadores)}>
                                    {separadoresContent}
                                </div>
                            )}

                        </div>}




                    </div >
                    : <></>
            }

            <HelpDrawer visible={visible} setVisible={setVisible} type={type} setType={setType} />
        </>
    )
}
