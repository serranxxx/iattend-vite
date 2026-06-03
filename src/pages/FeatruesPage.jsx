import { Button, Layout, Popover, Row } from 'antd'
import { FooterApp } from '../modules/Footer/FooterApp'
import { FaCircleInfo } from 'react-icons/fa6'
import { FaCheck } from 'react-icons/fa'
import { HeaderBuild } from '../modules/Header/Header'
import { useTranslation } from 'react-i18next'

export const FeaturesPage = () => {
    const { t } = useTranslation()

    const list_items = t('features_page.categories', { returnObjects: true })
    const all_features = t('features_page.items', { returnObjects: true })

    return (
        <div className='invitations-page-main-container'>
            <Layout
                style={{
                    position: 'relative', width: '100%', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'var(--ft-color)',
                    maxWidth:'1480px',
                }}>
                <HeaderBuild position={'pricing'} isVisible={true} />
                <div className='pricing-main-container'>

                    <div className='pricing-title-subtext-container'>
                        <span className='pricing-title-page'>{t('features_page.title')}</span>
                        <span className='pricing-sub-text'>{t('features_page.subtitle')}</span>
                    </div>

                    <div className='pricing-features-conainer'>
                        {
                            list_items.map((item, index) => (
                                <div key={index} style={{ width: '100%' }}>
                                    <div className='prcing-feature-row'>
                                        <span className='pricing-feature-text' style={{ fontWeight: 400 }}>{item}</span>
                                    </div>

                                    {
                                        all_features.map((feature, i) => (
                                            feature.type === item &&
                                            <div key={i} className='prcing-feature-row'>
                                                <Row style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'row'
                                                }}>
                                                    <span className='pricing-feature-text' style={{ fontWeight: 600 }}>{feature.bold}</span>
                                                    <Popover content={feature.text} trigger="click" style={{ width: '100px' }} className='pricing-hidde-item'>
                                                        <Button
                                                            icon={<FaCircleInfo style={{ color: 'var(--text-color-50)' }} />}
                                                            type='text'
                                                        />
                                                    </Popover>
                                                </Row>
                                                <FaCheck size={18} style={{ marginRight: '15px' }} className='pricing-hidde-item' />
                                            </div>
                                        ))
                                    }
                                </div>
                            ))
                        }
                    </div>

                </div >
                <FooterApp />

            </Layout >

        </div>
    )
}
