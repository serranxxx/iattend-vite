import { useRef } from 'react'
import { Select } from 'antd'
import { ChevronDown } from 'lucide-react'
import { norm } from './scannerUtils'
import styles from './Scanner.module.css'

// `fixedEvent`: link directo de un Pop (/scanner?pop=<id>); solo falta la clave.
export const ScannerSetup = ({ fixedEvent, events, eventsLoading, selectedEvent, onSelectEvent, pin, onPin, pinError, onLogin }) => {
  const pinRef = useRef(null)
  const activeBox = Math.min(pin.length, 3)

  return (
    <div className={styles.setup}>
      <div className={styles.setupCol}>
        <img src='/images/logo_blue.png' alt='I attend' className={styles.logo} />

        <div>
          <h1 className={`${styles.display} ${styles.setupTitle}`}>Control de acceso</h1>
          <p className={styles.setupSub}>{fixedEvent ? 'Ingresa la clave que recibiste.' : 'Elige tu evento e ingresa la clave que recibiste.'}</p>
        </div>

        {/* inputs ocultos para que el navegador no autollene los campos reales */}
        <input type='text' style={{ display: 'none' }} autoComplete='username' readOnly />
        <input type='password' style={{ display: 'none' }} autoComplete='current-password' readOnly />

        {fixedEvent ? (
          <div className={styles.field}>
            <label className={styles.label}>Evento</label>
            <p className={styles.display}>{fixedEvent.name}</p>
          </div>
        ) : (
        <div className={styles.field}>
          <label className={styles.label}>Evento</label>
          <div className={styles.selectWrap}>
            <Select
              placeholder='Selecciona tu evento'
              loading={eventsLoading}
              value={selectedEvent?.key ?? undefined}
              onChange={(val) => {
                onSelectEvent(events.find(e => e.key === val) ?? null)
                setTimeout(() => pinRef.current?.focus(), 50)
              }}
              options={events.map(e => ({ value: e.key, label: `${e.name ?? String(e.id)}${e.kind === 'flash' ? ' · Pop' : ''}` }))}
              showSearch
              filterOption={(input, option) => norm(option?.label).includes(norm(input))}
              suffixIcon={<ChevronDown size={18} />}
              getPopupContainer={trigger => trigger.parentNode}
              notFoundContent={eventsLoading ? 'Cargando eventos…' : 'Sin resultados'}
            />
          </div>
        </div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor='scanner-pin'>Clave de acceso</label>
          <div className={styles.pinGrid}>
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`${styles.pinBox} ${pinError ? styles.pinBoxError : i === activeBox ? styles.pinBoxActive : ''}`}
              >
                {pin[i] || ''}
              </div>
            ))}
            <input
              id='scanner-pin'
              ref={pinRef}
              className={styles.pinInput}
              value={pin}
              maxLength={4}
              autoComplete='one-time-code'
              autoCapitalize='none'
              autoCorrect='off'
              spellCheck={false}
              onChange={e => onPin(e.target.value.replace(/\s/g, '').slice(0, 4))}
              onKeyDown={e => { if (e.key === 'Enter') onLogin() }}
            />
          </div>
          {pinError && <p className={styles.pinError}>{pinError}</p>}
        </div>

        <button type='button' className={styles.primaryBtn} onClick={onLogin}>
          Entrar
        </button>
      </div>
    </div>
  )
}
