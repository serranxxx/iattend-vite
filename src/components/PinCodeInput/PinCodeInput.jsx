import { useRef, useState } from 'react'
import styles from './PinCodeInput.module.css'

const LENGTH = 6

export const PinCodeInput = ({ onComplete, disabled }) => {
    const [chars, setChars] = useState(Array(LENGTH).fill(''))
    const inputRefs = useRef([])

    const focusInput = (index) => {
        inputRefs.current[index]?.focus()
    }

    const updateChars = (nextChars) => {
        setChars(nextChars)
        if (nextChars.every(c => c !== '')) {
            onComplete?.(nextChars.join(''))
        }
    }

    const handleChange = (index, rawValue) => {
        const value = rawValue.slice(-1)
        if (value && !/^[0-9]$/.test(value)) return

        const next = [...chars]
        next[index] = value
        updateChars(next)

        if (value && index < LENGTH - 1) {
            focusInput(index + 1)
        }
    }

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !chars[index] && index > 0) {
            focusInput(index - 1)
        }
    }

    const handlePaste = (e) => {
        const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, LENGTH)
        if (!pasted) return
        e.preventDefault()
        const next = Array(LENGTH).fill('')
        pasted.split('').forEach((c, i) => { next[i] = c })
        updateChars(next)
        focusInput(Math.min(pasted.length, LENGTH - 1))
    }

    return (
        <div className={styles.wrapper} onPaste={handlePaste}>
            {chars.map((char, index) => (
                <span key={index} className={styles.group}>
                    <input
                        ref={(el) => (inputRefs.current[index] = el)}
                        className={styles.box}
                        value={char}
                        disabled={disabled}
                        inputMode="numeric"
                        maxLength={1}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                    />
                </span>
            ))}
        </div>
    )
}
