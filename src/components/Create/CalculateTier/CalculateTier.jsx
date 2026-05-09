import { Button, Dropdown, Rate } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import './calculate_tier.css'
import { FaStar } from 'react-icons/fa'
import { IoClose } from 'react-icons/io5'
import { IoMdRefresh } from 'react-icons/io'
import { useTranslation } from 'react-i18next'

const INITIAL_STATE = {
    necesity: 0,
    probability: 0,
    owners: {},
    score: 0,
    open: false,
    category: null,
}

const QuestionBlock = ({ title, description, value, onChange }) => {
    return (
        <div className='priority_container_col' style={{ gap: '0px' }}>
            <span style={{ fontWeight: 500, fontSize: '16px' }}>{title}</span>
            <span style={{ fontSize: '14px', opacity: '0.4' }}>{description}</span>
            <Rate
                style={{ marginTop: '8px' }}
                allowHalf
                value={value}
                onChange={onChange}
            />
        </div>
    )
}

export const CalculateTier = ({drawerState,  updateGuestField, owners = [] }) => {
    const { t } = useTranslation()
    const [priorityCalc, setPriorityCalc] = useState(INITIAL_STATE)

    const QUESTIONS = useMemo(() => [
        { key: 'necesity', title: t('calculate_tier.q1_title'), description: t('calculate_tier.q1_desc') },
        { key: 'probability', title: t('calculate_tier.q2_title'), description: t('calculate_tier.q2_desc') },
    ], [t])

    
    

    const updateField = (field, value) => {
        setPriorityCalc((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const updateOwnerScore = (owner, value) => {
        setPriorityCalc((prev) => ({
            ...prev,
            owners: {
                ...prev.owners,
                [owner]: value,
            },
        }))
    }

    const resetState = (extra = {}) => {
        setPriorityCalc({
            ...INITIAL_STATE,
            ...extra,
        })
    }

    const openCalculator = () => {
        resetState({ open: true })
    }

    const closeCalculator = () => {
        resetState({ open: false })
    }

    const recalculate = () => {
        resetState({ open: true })
    }

    const handleGrade = () => {
        const necesity = Number(priorityCalc.necesity) || 0
        const probability = Number(priorityCalc.probability) || 0

        const ownersValues = Object.values(priorityCalc.owners || {})
            .map((value) => Number(value))
            .filter((value) => !isNaN(value))

        const perception = ownersValues.length
            ? ownersValues.reduce((acc, value) => acc + value, 0) / ownersValues.length
            : 0

        const score =
            necesity * 0.4 +
            probability * 0.3 +
            perception * 0.3

        let category = 'D'
        if (score >= 4) category = 'A'
        else if (score >= 3) category = 'B'
        else if (score >= 2) category = 'C'

        setPriorityCalc((prev) => ({
            ...prev,
            score: Number(score.toFixed(2)),
            category,
        }))

        updateGuestField('tier', category)
    }

    const categoryDescription = useMemo(() => {
        const map = {
            A: t('calculate_tier.cat_a'),
            B: t('calculate_tier.cat_b'),
            C: t('calculate_tier.cat_c'),
            D: t('calculate_tier.cat_d'),
        }
        return map[priorityCalc.category] || ''
    }, [priorityCalc.category, t])

    useEffect(() => {
        if (!drawerState.visible) {
          updateField('open', false)
        }
      }, [drawerState])

    return (
        <Dropdown
            arrow
            open={priorityCalc.open}
            trigger={['click']}
            placement="bottomRight"
            getPopupContainer={(trigger) => trigger.closest('.ant-drawer-body') ?? document.body}
            onOpenChange={(open) => {
                if (open) openCalculator()
            }}
            popupRender={() => (
                <span className='priority_container'>
                    <div className='priority_container_col' style={{ gap: '0px', width: '100%' }}>
                        <div
                            className='priority_container_row'
                            style={{ width: '100%', justifyContent: 'space-between', alignItems:'flex-start' }}
                        >
                            <span
                                className='priority_container_title'
                                style={{ fontWeight: 600 }}
                            >
                                {t('calculate_tier.title')}
                            </span>

                            <div className='priority_container_row'>
                                <Button
                                    onClick={priorityCalc.category ? recalculate : handleGrade}
                                    icon={priorityCalc.category ? <IoMdRefresh /> : null}
                                    style={{ borderRadius: '99px' }}
                                    type='primary'
                                >
                                    {priorityCalc.category ? t('calculate_tier.btn_recalculate') : t('calculate_tier.btn_calculate')}
                                </Button>

                                <Button
                                    onClick={closeCalculator}
                                    className='primarybutton'
                                    icon={<IoClose />}
                                />
                            </div>
                        </div>
                    </div>

                    {priorityCalc.category ? (
                        <div className='priority_container_row' style={{ gap: '8px', width: '100%' }}>
                            <div className={`priority_box tier-${priorityCalc.category}`}>
                                {priorityCalc.category}
                            </div>
                            <div className={`priority_dec tier-${priorityCalc.category}`}>
                                {categoryDescription}
                            </div>
                        </div>
                    ) : (
                        <div className='priority_container_col' style={{ gap: '16px' }}>
                            {QUESTIONS.map((question) => (
                                <QuestionBlock
                                    key={question.key}
                                    title={question.title}
                                    description={question.description}
                                    value={priorityCalc[question.key]}
                                    onChange={(value) => updateField(question.key, value)}
                                />
                            ))}

                            <div
                                className='priority_container_col'
                                style={{ alignSelf: 'stretch', gap: '0px' }}
                            >
                                <span style={{ fontWeight: 500, fontSize: '16px' }}>
                                    {t('calculate_tier.q3_title')}
                                </span>

                                <div
                                    className='priority_container_row'
                                    style={{ width: '100%', gap: '24px' }}
                                >
                                    {owners.map((owner) => (
                                        <div
                                            key={owner}
                                            className='priority_container_col'
                                            style={{ flex: 1, gap: '0px' }}
                                        >
                                            <span style={{ opacity: '0.4' }}>{owner}</span>
                                            <Rate
                                                allowHalf
                                                value={priorityCalc.owners[owner] || 0}
                                                onChange={(value) => updateOwnerScore(owner, value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </span>
            )}
        >
            <Button
                icon={<FaStar />}
                style={{ maxHeight: 24, color: '#6D3CFA', fontSize: '13px', fontWeight: 600 }}
                type='text'
            >
                {t('calculate_tier.btn_open')}
            </Button>
        </Dropdown>
    )
}