import logoBlue from '/images/logo_blue.png'
import { Button } from 'antd'
import { ArrowUpRight, Eye, Save, Share2, ShoppingCart } from 'lucide-react'

const getSessionName = () => {
    try { return JSON.parse(localStorage.getItem('session'))?.user?.name ?? null }
    catch { return null }
}

export const PreviewMoodHeader = ({ onSave, onPublish, saving }) => {
    const name = getSessionName()
    const chipLabel = name ? `Modo preview · ${name}` : 'Modo preview · sin cuenta'

    return (
        <div className='pm-header'>
            <div className='pm-header-inner'>
                <div className='pm-header-left'>
                    <img src={logoBlue} alt='I attend' className='pm-header-logo' />
                    <div className='pm-header-chip'>
                        <Eye size={13} strokeWidth={1.8} />
                        <span>{chipLabel}</span>
                    </div>
                </div>
                <div className='pm-header-right'>
                    <Button className='primarybutton' onClick={onSave} loading={saving}>Guardar cambios</Button>
                    <Button icon={<ArrowUpRight size={14}/>} className='primarybutton--active' onClick={onPublish}>
                        Terminar mi invitación
                    </Button>
                </div>
            </div>
        </div>
    )
}
