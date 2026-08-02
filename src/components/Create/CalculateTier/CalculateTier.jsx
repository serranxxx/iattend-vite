import { Button, Dropdown } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import './calculate_tier.css'
import { FaStar } from 'react-icons/fa'
import { IoClose } from 'react-icons/io5'
import { useTranslation } from 'react-i18next'

const STEP_Q1 = 0
const STEP_Q2 = 1
const STEP_Q3 = 2
const STEP_Q4 = 3
const STEP_RESULT = 4
const TOTAL_STEPS = 5

const LEVEL_VALUES = [1, 2, 3, 4]
const SLIDER_COLORS = ['#1c3249', '#8a6d9e', '#6D3CFA', '#0095FF']
const TIER_COLORS = { A: '#43B75D', B: '#0095FF', C: '#787878', D: '#D32F2F' }

const INITIAL_STATE = {
    step: STEP_Q1,
    necesity: null,
    probability: null,
    obligation: null,
    owners: {},
    score: 0,
    open: false,
    category: null,
}

const ChipGrid = ({ levels, value, onChange }) => (
    <div className="tier_chip_grid">
        {levels.map((level) => (
            <button
                key={level.value}
                type="button"
                className={`tier_chip${value === level.value ? ' tier_chip--selected' : ''}`}
                onClick={() => onChange(level.value)}
            >
                {level.label}
            </button>
        ))}
    </div>
)

export const CalculateTier = ({ drawerState, updateGuestField, owners = [] }) => {
    const { t } = useTranslation()
    const [priorityCalc, setPriorityCalc] = useState(INITIAL_STATE)

    const buildLevels = (prefix) => LEVEL_VALUES.map((value) => ({ value, label: t(`calculate_tier.${prefix}_${value}`) }))

    const Q1_LEVELS = useMemo(() => buildLevels('level'), [t])
    const Q2_LEVELS = useMemo(() => buildLevels('q2_level'), [t])
    const Q3_LEVELS = useMemo(() => buildLevels('q3_level'), [t])
    const Q4_LEVELS = useMemo(() => buildLevels('q4_level'), [t])

    const CHIP_QUESTIONS = useMemo(
        () => ({
            [STEP_Q1]: {
                key: 'necesity',
                title: t('calculate_tier.q1_title'),
                description: t('calculate_tier.q1_desc'),
                levels: Q1_LEVELS,
            },
            [STEP_Q2]: {
                key: 'probability',
                title: t('calculate_tier.q2_title'),
                description: t('calculate_tier.q2_desc'),
                levels: Q2_LEVELS,
            },
            [STEP_Q4]: {
                key: 'obligation',
                title: t('calculate_tier.q4_title'),
                description: t('calculate_tier.q4_desc'),
                levels: Q4_LEVELS,
            },
        }),
        [t, Q1_LEVELS, Q2_LEVELS, Q4_LEVELS]
    )

    const updateField = (field, value) => {
        setPriorityCalc((prev) => ({ ...prev, [field]: value }))
    }

    const updateOwnerScore = (owner, value) => {
        setPriorityCalc((prev) => ({
            ...prev,
            owners: { ...prev.owners, [owner]: value },
        }))
    }

    const resetState = (extra = {}) => {
        setPriorityCalc({ ...INITIAL_STATE, ...extra })
    }

    const openCalculator = () => resetState({ open: true })
    const closeCalculator = () => resetState({ open: false })

    const goBack = () => updateField('step', Math.max(STEP_Q1, priorityCalc.step - 1))

    const computeResult = () => {
        const necesity = Number(priorityCalc.necesity) || 0
        const probability = Number(priorityCalc.probability) || 0
        const obligation = Number(priorityCalc.obligation) || 0

        const ownersValues = Object.values(priorityCalc.owners || {})
            .map((value) => Number(value))
            .filter((value) => !isNaN(value))

        const perception = ownersValues.length
            ? ownersValues.reduce((acc, value) => acc + value, 0) / ownersValues.length
            : 0

        const score = necesity * 0.35 + probability * 0.2 + perception * 0.2 + obligation * 0.25

        let category = 'D'
        if (score >= 3.25) category = 'A'
        else if (score >= 2.5) category = 'B'
        else if (score >= 1.75) category = 'C'

        return { score: Number(score.toFixed(2)), category }
    }

    const isStepAnswered = () => {
        if (priorityCalc.step === STEP_Q1) return priorityCalc.necesity !== null
        if (priorityCalc.step === STEP_Q2) return priorityCalc.probability !== null
        if (priorityCalc.step === STEP_Q3) {
            if (!owners.length) return true
            return owners.every((owner) => priorityCalc.owners[owner] != null)
        }
        if (priorityCalc.step === STEP_Q4) return priorityCalc.obligation !== null
        return true
    }

    const goNext = () => {
        if (priorityCalc.step === STEP_Q4) {
            const { score, category } = computeResult()
            setPriorityCalc((prev) => ({ ...prev, score, category, step: STEP_RESULT }))
        } else {
            updateField('step', priorityCalc.step + 1)
        }
    }

    const saveTier = () => {
        updateGuestField('tier', priorityCalc.category)
        closeCalculator()
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

    const currentQuestion = CHIP_QUESTIONS[priorityCalc.step]
    const tierColor = TIER_COLORS[priorityCalc.category]

    return (
        <Dropdown
            arrow
            open={priorityCalc.open}
            trigger={['click']}
            placement="bottomRight"
            onOpenChange={(open) => {
                if (open) openCalculator()
            }}
            popupRender={() => (
                <div className="tier_shell">
                    <div className="tier_header">
                        <div className="tier_header_row">
                            <div>
                                <p className="tier_title">{t('calculate_tier.title')}</p>
                                <p className="tier_subtitle">{t('calculate_tier.subtitle')}</p>
                            </div>
                            <button type="button" className="tier_close_btn" onClick={closeCalculator}>
                                <IoClose size={14} />
                            </button>
                        </div>

                        <div className="tier_progress">
                            {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                                <span
                                    key={index}
                                    className={`tier_progress_dot${index <= priorityCalc.step ? ' tier_progress_dot--filled' : ''}`}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="tier_body">
                        {priorityCalc.step === STEP_RESULT ? (
                            <div className="tier_result">
                                <div
                                    className="tier_badge"
                                    style={{ background: `${tierColor}22`, color: tierColor }}
                                >
                                    {priorityCalc.category}
                                </div>
                                <p className="tier_result_title">
                                    {t('calculate_tier.result_title', { tier: priorityCalc.category })}
                                </p>
                                <p className="tier_result_desc">{categoryDescription}</p>
                                <Button className="tier_save_btn" onClick={saveTier}>
                                    {t('calculate_tier.btn_save')}
                                </Button>
                            </div>
                        ) : priorityCalc.step === STEP_Q3 ? (
                            <>
                                <p className="tier_question_title">{t('calculate_tier.q3_title')}</p>
                                <p className="tier_question_desc">{t('calculate_tier.q3_desc')}</p>

                                <div className="tier_scale_legend">
                                    {Q3_LEVELS.map((level) => (
                                        <span key={level.value}>{level.label}</span>
                                    ))}
                                </div>

                                {owners.map((owner, index) => {
                                    const rawValue = priorityCalc.owners[owner] ?? null
                                    const level = rawValue ? Math.round(rawValue) : null
                                    const color = SLIDER_COLORS[index % SLIDER_COLORS.length]
                                    return (
                                        <div key={owner} className="tier_slider_row">
                                            <div className="tier_slider_header">
                                                <span className="tier_slider_side">{owner}</span>
                                                <span
                                                    className="tier_slider_value"
                                                    style={{ color: level ? color : '#A8A8A8', fontWeight: level ? 600 : 400 }}
                                                >
                                                    {level ? Q3_LEVELS[level - 1].label : t('calculate_tier.slider_placeholder')}
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min={1}
                                                max={4}
                                                step={0.01}
                                                value={rawValue || 1}
                                                onChange={(e) => updateOwnerScore(owner, parseFloat(e.target.value))}
                                                className="tier_slider"
                                                style={{ accentColor: color }}
                                            />
                                        </div>
                                    )
                                })}

                                <div className="tier_footer_row">
                                    <Button className="tier_btn_back" onClick={goBack}>
                                        {t('calculate_tier.btn_back')}
                                    </Button>
                                    <Button className="tier_next_btn" disabled={!isStepAnswered()} onClick={goNext}>
                                        {t('calculate_tier.btn_next')}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="tier_question_title">{currentQuestion.title}</p>
                                <p className="tier_question_desc">{currentQuestion.description}</p>

                                <ChipGrid
                                    levels={currentQuestion.levels}
                                    value={priorityCalc[currentQuestion.key]}
                                    onChange={(value) => updateField(currentQuestion.key, value)}
                                />

                                <div className="tier_footer_row">
                                    {priorityCalc.step > STEP_Q1 && (
                                        <Button className="tier_btn_back" onClick={goBack}>
                                            {t('calculate_tier.btn_back')}
                                        </Button>
                                    )}
                                    <Button className="tier_next_btn" disabled={!isStepAnswered()} onClick={goNext}>
                                        {t('calculate_tier.btn_next')}
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        >
            <Button
                icon={<FaStar />}
                style={{ maxHeight: 24, color: '#6D3CFA', fontSize: '13px', fontWeight: 600 }}
                type="text"
            >
                {t('calculate_tier.btn_open')}
            </Button>
        </Dropdown>
    )
}
