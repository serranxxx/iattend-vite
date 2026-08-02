import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Meh, Smile, Heart, Flame, ArrowRight } from 'lucide-react'
import './guests_calculator.css'

const STEP_Q1 = 0
const STEP_Q2 = 1
const STEP_Q3 = 2
const STEP_Q4 = 3
const STEP_RESULT = 4
const TOTAL_STEPS = 5

const LEVEL_VALUES = [1, 2, 3, 4]
const LEVEL_ICONS = [Meh, Smile, Heart, Flame]
const SLIDER_COLORS = ['#1c3249', '#8a6d9e']
const TIER_COLORS = { A: '#43B75D', B: '#0095FF', C: '#787878', D: '#D32F2F' }

const INITIAL_ANSWERS = { necesity: null, probability: null, you: null, partner: null, obligation: null }

const DOME_CX = 100
const DOME_CY = 95
const DOME_R = 78
const DOME_START = 140
const DOME_SWEEP = 260

const polar = (cx, cy, r, angleDeg) => {
    const rad = (angleDeg * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

const domePath = (frac) => {
    const sweep = Math.max(frac, 0.001) * DOME_SWEEP
    const start = polar(DOME_CX, DOME_CY, DOME_R, DOME_START)
    const end = polar(DOME_CX, DOME_CY, DOME_R, DOME_START + sweep)
    const largeArc = sweep > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${DOME_R} ${DOME_R} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

const DOME_BG_PATH = domePath(1)

export const GuestsCalculatorPage = () => {
    const { t } = useTranslation()
    const [step, setStep] = useState(STEP_Q1)
    const [answers, setAnswers] = useState(INITIAL_ANSWERS)
    const [result, setResult] = useState(null)

    const buildLevels = (prefix, withDesc = true) =>
        LEVEL_VALUES.map((value) => ({
            value,
            label: t(`calculate_tier.${prefix}_${value}`),
            desc: withDesc ? t(`calculate_tier.${prefix}_${value}_desc`) : null,
        }))

    const Q1_LEVELS = useMemo(() => buildLevels('level'), [t])
    const Q2_LEVELS = useMemo(() => buildLevels('q2_level'), [t])
    const Q3_LEVELS = useMemo(() => buildLevels('q3_level', false), [t])
    const Q4_LEVELS = useMemo(() => buildLevels('q4_level'), [t])

    const CHIP_QUESTIONS = useMemo(
        () => ({
            [STEP_Q1]: {
                key: 'necesity',
                title: t('calculate_tier.q1_title'),
                desc: t('calculate_tier.q1_desc'),
                levels: Q1_LEVELS,
            },
            [STEP_Q2]: {
                key: 'probability',
                title: t('calculate_tier.q2_title'),
                desc: t('calculate_tier.q2_desc'),
                levels: Q2_LEVELS,
            },
            [STEP_Q4]: {
                key: 'obligation',
                title: t('calculate_tier.q4_title'),
                desc: t('calculate_tier.q4_desc'),
                levels: Q4_LEVELS,
            },
        }),
        [t, Q1_LEVELS, Q2_LEVELS, Q4_LEVELS]
    )

    const OWNERS = useMemo(
        () => [
            { key: 'you', label: t('calculate_tier.side_you'), color: SLIDER_COLORS[0] },
            { key: 'partner', label: t('calculate_tier.side_partner'), color: SLIDER_COLORS[1] },
        ],
        [t]
    )

    const updateAnswer = (key, value) => setAnswers((prev) => ({ ...prev, [key]: value }))

    const isStepAnswered = () => {
        if (step === STEP_Q1) return answers.necesity !== null
        if (step === STEP_Q2) return answers.probability !== null
        if (step === STEP_Q3) return answers.you !== null && answers.partner !== null
        if (step === STEP_Q4) return answers.obligation !== null
        return true
    }

    const computeResult = () => {
        const necesity = Number(answers.necesity) || 0
        const probability = Number(answers.probability) || 0
        const perception = (Number(answers.you) + Number(answers.partner)) / 2
        const obligation = Number(answers.obligation) || 0
        const score = necesity * 0.35 + probability * 0.2 + perception * 0.2 + obligation * 0.25

        let category = 'D'
        if (score >= 3.25) category = 'A'
        else if (score >= 2.5) category = 'B'
        else if (score >= 1.75) category = 'C'

        return { score: Number(score.toFixed(2)), category }
    }

    const goNext = () => {
        if (!isStepAnswered()) return
        if (step === STEP_Q4) {
            setResult(computeResult())
            setStep(STEP_RESULT)
        } else {
            setStep((prev) => prev + 1)
        }
    }

    const goBack = () => setStep((prev) => Math.max(STEP_Q1, prev - 1))

    const restart = () => {
        setAnswers(INITIAL_ANSWERS)
        setResult(null)
        setStep(STEP_Q1)
    }

    const isQuestion = step < STEP_RESULT
    const chipQuestion = CHIP_QUESTIONS[step]
    const tierColor = result ? TIER_COLORS[result.category] : null

    const categoryContent = useMemo(() => {
        if (!result) return null
        const map = {
            A: {
                name: t('calculate_tier.cat_a_name'),
                tagline: t('calculate_tier.cat_a_tagline'),
                desc: t('calculate_tier.cat_a_desc'),
                note: t('calculate_tier.cat_a_note'),
            },
            B: {
                name: t('calculate_tier.cat_b_name'),
                tagline: t('calculate_tier.cat_b_tagline'),
                desc: t('calculate_tier.cat_b_desc'),
                note: t('calculate_tier.cat_b_note'),
            },
            C: {
                name: t('calculate_tier.cat_c_name'),
                tagline: t('calculate_tier.cat_c_tagline'),
                desc: t('calculate_tier.cat_c_desc'),
                note: t('calculate_tier.cat_c_note'),
            },
            D: {
                name: t('calculate_tier.cat_d_name'),
                tagline: t('calculate_tier.cat_d_tagline'),
                desc: t('calculate_tier.cat_d_desc'),
                note: t('calculate_tier.cat_d_note'),
            },
        }
        return map[result.category] || null
    }, [result, t])

    return (
        <div className="gc_page_wrap">
            <div className="gc_shell">
                <div className="gc_header">
                    <div className="gc_header_top">
                        <img src="/images/logo_cover.png" alt="I attend" className="gc_brand" />

                    </div>
                    <p className="gc_header_title">
                        {isQuestion ? t('calculate_tier.title') : t('calculate_tier.result_header_title')}
                    </p>
                    <p className="gc_header_sub">
                        {isQuestion ? t('calculate_tier.subtitle') : t('calculate_tier.result_header_sub')}
                    </p>
                    <div className="gc_dots">
                        {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                            <div key={index} className={`gc_dot${index <= step ? ' gc_dot--filled' : ''}`} />
                        ))}
                    </div>
                </div>

                <div className="gc_body">
                    {chipQuestion ? (
                        <>
                            <p className="gc_question_title">{chipQuestion.title}</p>
                            <p className="gc_question_desc">{chipQuestion.desc}</p>
                            <div className="gc_chip_list">
                                {chipQuestion.levels.map((level) => {
                                    const selected = answers[chipQuestion.key] === level.value
                                    return (
                                        <button
                                            key={level.value}
                                            type="button"
                                            className={`gc_chip_row${selected ? ' gc_chip_row--selected' : ''}`}
                                            onClick={() => updateAnswer(chipQuestion.key, level.value)}
                                        >
                                            <span className="gc_chip_text">
                                                <span className="gc_chip_label">{level.label}</span>
                                                {level.desc && <span className="gc_chip_desc">{level.desc}</span>}
                                            </span>
                                            <span className="gc_chip_radio" />
                                        </button>
                                    )
                                })}
                            </div>
                        </>
                    ) : step === STEP_Q3 ? (
                        <>
                            <p className="gc_question_title">{t('calculate_tier.q3_title')}</p>
                            <p className="gc_question_desc">{t('calculate_tier.q3_desc')}</p>
                            <div className="gc_gauge_list">
                                {OWNERS.map((owner) => {
                                    const value = answers[owner.key]
                                    const displayVal = value || 1
                                    return (
                                        <div key={owner.key} className="gc_gauge_card">
                                            <div className="gc_gauge_head">
                                                <span className="gc_gauge_side">{owner.label}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={1}
                                                max={4}
                                                step={1}
                                                value={displayVal}
                                                onChange={(e) => updateAnswer(owner.key, parseInt(e.target.value, 10))}
                                                className="gc_gauge_slider"
                                                style={{ accentColor: owner.color }}
                                            />
                                            <div className="gc_gauge_visual">
                                                <svg viewBox="0 0 200 168" className="gc_gauge_svg">
                                                    <path d={DOME_BG_PATH} stroke="#ECE7DC" strokeWidth={16} fill="none" strokeLinecap="round" />
                                                    <path d={domePath(displayVal / 4)} stroke={owner.color} strokeWidth={16} fill="none" strokeLinecap="round" />
                                                </svg>
                                                {(() => {
                                                    const LevelIcon = LEVEL_ICONS[displayVal - 1]
                                                    const activeColor = value ? owner.color : '#c9c2b4'
                                                    return (
                                                        <div className="gc_gauge_center">
                                                            <LevelIcon size={44} strokeWidth={2} style={{ color: activeColor }} />
                                                            <span className="gc_gauge_center_label" style={{ color: activeColor }}>
                                                                {Q3_LEVELS[displayVal - 1].label}
                                                            </span>
                                                        </div>
                                                    )
                                                })()}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="gc_result">
                                <div className="gc_result_badge" style={{ background: `${tierColor}22`, color: tierColor }}>
                                    {result.category}
                                </div>
                                <p className="gc_result_title">
                                    {t('calculate_tier.result_title', { tier: result.category })}
                                </p>
                                <span className="gc_result_category_tag" style={{ background: `${tierColor}1a`, color: tierColor }}>
                                    {categoryContent.name}
                                </span>
                            </div>

                            <div className="gc_result_story">
                                <p className="gc_result_tagline" style={{ color: tierColor }}>
                                    {categoryContent.tagline}
                                </p>
                                <p className="gc_result_desc">{categoryContent.desc}</p>
                                <div className="gc_result_note" style={{ borderColor: tierColor }}>
                                    <p>{categoryContent.note}</p>
                                </div>
                            </div>

                            <button type="button" className="gc_restart_btn" onClick={restart}>
                                {t('calculate_tier.restart_btn')}
                            </button>
                        </>
                    )}
                </div>

                {isQuestion ? (
                    <div className="gc_footer">
                        {step > STEP_Q1 && (
                            <button type="button" className="gc_back_btn" onClick={goBack}>
                                {t('calculate_tier.btn_back')}
                            </button>
                        )}
                        <button type="button" className="gc_next_btn" disabled={!isStepAnswered()} onClick={goNext}>
                            {t('calculate_tier.btn_next')}
                        </button>
                    </div>
                ) : (
                    <div className="gc_cta_footer">
                        <div className="gc_cta_card">
                            {/* <img src="/images/logo_blue.png" alt="I attend" className="gc_cta_brand" /> */}

                            <a href="https://iattend.mx" target="_blank" rel="noreferrer" className="gc_cta_btn">
                                Your event handled

                            </a>
                            <ArrowRight strokeWidth={2.5}/>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
