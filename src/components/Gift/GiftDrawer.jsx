import { Drawer, Grid } from 'antd'
import { GiveIattend } from './GiveIattend/GiveIattend'

export const GiftDrawer = ({ visible, setVisible }) => {
    const screens = Grid.useBreakpoint()
    const isMobile = !screens.md



    const handleClose = () => {
        setVisible(false)
    }

    return (
        <Drawer
            placement='right'
            closable={false}
            onClose={handleClose}
            open={visible}
            width={isMobile ? '95%' : '50%'}
            style={{ borderRadius: '24px 0px 0px 24px', backgroundColor: '#9D92C0' }}
            styles={{ body: { padding: 0, paddingLeft: '8px', boxSizing: 'border-box', overflow: 'hidden' } }}
        >
            <GiveIattend
            />
        </Drawer>
    )
}
