import logoBlue from '/images/logo_blue.png'
import { Button } from 'antd'
import { ArrowRight, ArrowUpRight, Bookmark, Eye, Save, Share2, ShoppingCart } from 'lucide-react'

const getSessionName = () => {
    try { return JSON.parse(localStorage.getItem('session'))?.user?.name ?? null }
    catch { return null }
}

export const PreviewMoodHeader = ({ onSave, onPublish, saving }) => {
    const name = getSessionName()
    const firstName = name?.split(' ')[0] ?? null
    const chipLabel = name ? `Modo preview · ${name}` : 'Modo preview · sin cuenta'
    const chipLabelMobile = firstName ? `Preview · ${firstName}` : 'Preview'

    return (
        <div className='pm-header'>
            <div className='pm-header-inner'>
                <div className='pm-header-left'>
                    <img src={logoBlue} alt='I attend' className='pm-header-logo' />
                    <div className='pm-header-chip'>
                        <Eye size={13} strokeWidth={1.8} />
                        <span className='pm-chip-label-desktop'>{chipLabel}</span>
                        <span className='pm-chip-label-mobile'>{chipLabelMobile}</span>
                    </div>
                </div>
                <div className='pm-header-right'>
                    <Button icon={<Bookmark size={14} />} className='primarybutton' onClick={onSave} loading={saving}>Guardar mi invitación</Button>
                    <Button icon={<ArrowRight size={14} />} className='primarybutton--active' onClick={onPublish}>
                        Quiero mi invitación
                    </Button>
                </div>
            </div>
        </div>
    )
}
