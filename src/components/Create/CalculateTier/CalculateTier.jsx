import { Button, Dropdown, Rate } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import './calculate_tier.css'
import { FaStar } from 'react-icons/fa'
import { IoClose } from 'react-icons/io5'
import { IoMdRefresh } from 'react-icons/io'

const INITIAL_STATE = {
    necesity: 0,
    probability: 0,
    owners: {},
    score: 0,
    open: false,
    category: null,
}

const CATEGORY_DESCRIPTIONS = {
    A: 'Tiene que estar sí o sí. El evento no se siente completo sin esta persona.',
    B: 'Quiero que esté; haría el evento mucho mejor, pero si el cupo aprieta podría quedar fuera.',
    C: 'Me gustaría invitarle si hay espacio y presupuesto; no pasa nada grave si no viene.',
    D: 'Solo se invita si sobra cupo o por cortesía/compromiso leve.',
}

const QUESTIONS = [
    {
        key: 'necesity',
        title: '1. ¿Quieren que esté en su boda sí o sí?',
        description: 'Esa persona que no puede faltar',
    },
    {
        key: 'probability',
        title: '2. ¿Qué tan cercanos son hoy en día?',
        description: 'No solo historia, también presente',
    },
]

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
    const [priorityCalc, setPriorityCalc] = useState(INITIAL_STATE)

    
    

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
        return CATEGORY_DESCRIPTIONS[priorityCalc.category] || ''
    }, [priorityCalc.category])

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
                                Conoce la prioridad del invitado
                            </span>

                            <div className='priority_container_row'>
                                <Button
                                    onClick={priorityCalc.category ? recalculate : handleGrade}
                                    icon={priorityCalc.category ? <IoMdRefresh /> : null}
                                    style={{ borderRadius: '99px' }}
                                    type='primary'
                                >
                                    {priorityCalc.category ? 'Recalcular' : 'Calcular'}
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
                                    3. ¿Están de acuerdo los dos?
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
                Calcular prioridad
            </Button>
        </Dropdown>
    )
}