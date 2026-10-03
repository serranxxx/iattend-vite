import { useRef, useState } from 'react'
import styles from './PinCodeInput.module.css'

const LENGTH = 6

// `variant="dark"`: casillas grandes en crema sobre azul marino (login de /sales).
export const PinCodeInput = ({ onComplete, disabled, variant, ariaLabel }) => {
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

    // Varios dígitos de una vez (autollenado del código en iOS/Android o
    // texto pegado): se reparten desde la casilla actual.
    const fillFrom = (index, digits) => {
        const next = [...chars]
        digits.slice(0, LENGTH - index).split('').forEach((c, i) => { next[index + i] = c })
        updateChars(next)
        focusInput(Math.min(index + digits.length, LENGTH - 1))
    }

    const handleChange = (index, rawValue) => {
        const digits = rawValue.replace(/[^0-9]/g, '')
        if (rawValue && !digits) return
        // Al escribir sobre una casilla llena llegan el dígito viejo y el
        // nuevo (en cualquier orden): se queda solo el nuevo.
        const nuevos = chars[index] && digits.length === 2 ? digits.replace(chars[index], '') : digits
        if (nuevos.length > 1) { fillFrom(index, nuevos); return }

        const next = [...chars]
        next[index] = nuevos.slice(-1)
        updateChars(next)

        if (nuevos && index < LENGTH - 1) {
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
        <div className={`${styles.wrapper} ${variant === 'dark' ? styles.dark : ''}`} onPaste={handlePaste} role="group" aria-label={ariaLabel}>
            {chars.map((char, index) => (
                <span key={index} className={styles.group}>
                    <input
                        ref={(el) => (inputRefs.current[index] = el)}
                        className={`${styles.box} ${char ? styles.filled : ''}`}
                        value={char}
                        disabled={disabled}
                        inputMode="numeric"
                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                        aria-label={`${index + 1}`}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                    />
                </span>
            ))}
        </div>
    )
}
