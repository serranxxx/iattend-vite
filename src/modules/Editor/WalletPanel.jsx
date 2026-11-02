import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Switch } from 'antd'
import { ImagePlus, RotateCcw } from 'lucide-react'
import { PaseWallet } from './PaseWallet'
import tp from '../Invitation/Build/PageSections/ToolPanels.module.css'
import s from './WalletPanel.module.css'

/*
  Panel "Pase digital" de los editores de escritorio (invitación, side events
  y Pop): el simulador del pase de Apple Wallet de los invitados
  (PaseWallet, frente y detalles) y lo que el organizador elige:
  · Ofrecer Apple Wallet (apagado, el invitado solo ve su pase en la página).
  · Foto y título del pase (vacíos = los de la portada; en el Pop, la
    imagen del link: `fotoNota` / `usarBaseTexto`).
  · Lugar principal, con dos o más direcciones (solo la invitación).
  Cada editor le pasa sus datos con un adaptador:
  Invitation/Build/PageSections/WalletPanelInvitacion.jsx y
  SideEvents/Workspace/WalletPanelPop.jsx.
*/

export const WalletPanel = ({
    vista, ejemplo,
    walletActivo, onWalletActivo,
    titulo, tituloBase, onTitulo,
    imagenPropia, hayPortada, onImagen, onPickImage,
    onPrincipal, sinLugaresTexto, intro,
    // `fotoNota`: de dónde sale la foto si no se elige una (Pop: la imagen
    // del link). `usarBaseTexto`: el botón para volver a ella.
    fotoNota, usarBaseTexto,
}) => {
    const { t } = useTranslation()
    const [lado, setLado] = useState('frente')

    return (
        <div className={s.panel}>
            {/* Ofrecer Apple Wallet va hasta arriba: decide todo lo demás. */}
            <div className={s.interruptor}>
                <span className={s.interruptorTextos}>
                    <span className={s.interruptorTitulo}>{t('build_editor.wallet_offer')}</span>
                    <span className={tp.hint} style={{ marginTop: 0 }}>{t(walletActivo ? 'build_editor.wallet_offer_on' : 'build_editor.wallet_offer_off')}</span>
                </span>
                <Switch checked={walletActivo} onChange={onWalletActivo} />
            </div>

            <p className={tp.hint} style={{ marginTop: 0 }}>{intro ?? t('build_editor.wallet_intro')}</p>

            <div className={s.lados} role="tablist">
                {['frente', 'detalles'].map((l) => (
                    <button key={l} type="button" role="tab" aria-selected={lado === l} className={s.lado} data-on={lado === l || undefined} onClick={() => setLado(l)}>
                        {t(`build_editor.wallet_side_${l}`)}
                    </button>
                ))}
            </div>

            <div className={s.simulador} data-apagado={!walletActivo || undefined}>
                <PaseWallet vista={vista} lado={lado} ejemplo={ejemplo} />
            </div>

            <div className={tp.group}>
                <span className={tp.groupLabel}>{t('build_editor.wallet_photo')}</span>
                <div className={s.foto}>
                    {vista.fotoVivo
                        ? <span className={s.sinFoto} style={{ position: 'relative', overflow: 'hidden' }}>{vista.fotoVivo}</span>
                        : vista.imagen ? <img src={vista.imagen} alt="" /> : <span className={s.sinFoto} />}
                    <div className={s.fotoAcciones}>
                        <button type="button" className={s.boton} onClick={() => onPickImage((url) => url && onImagen(url))}>
                            <ImagePlus size={15} /> {t('build_editor.wallet_change_photo')}
                        </button>
                        {imagenPropia && hayPortada && (
                            <button type="button" className={s.botonSuave} onClick={() => onImagen(null)}>
                                <RotateCcw size={13} /> {usarBaseTexto ?? t('build_editor.wallet_use_cover')}
                            </button>
                        )}
                        {fotoNota && <span className={tp.hint} style={{ marginTop: 0 }}>{fotoNota}</span>}
                    </div>
                </div>
            </div>

            <div className={tp.group}>
                <span className={tp.groupLabel}>{t('build_editor.wallet_title')}</span>
                <Input
                    value={titulo ?? ''}
                    placeholder={tituloBase || t('build_editor.wallet_title_placeholder')}
                    maxLength={40}
                    onChange={(e) => onTitulo(e.target.value)}
                />
                <span className={tp.hint}>{t('build_editor.wallet_title_hint')}</span>
            </div>

            <div className={tp.group}>
                <span className={tp.groupLabel}>{t(vista.lugares.length > 1 ? 'build_editor.main_place' : 'build_editor.wallet_place')}</span>
                {vista.lugares.length === 0 && <span className={tp.empty}>{sinLugaresTexto}</span>}
                {vista.lugares.length > 0 && (
                    <div className={s.lugares} role="radiogroup">
                        {vista.lugares.map((l) => (
                            <button
                                key={l.indice}
                                type="button"
                                role="radio"
                                aria-checked={l.principal}
                                className={s.lugar}
                                data-on={(l.principal && vista.lugares.length > 1) || undefined}
                                disabled={!onPrincipal || vista.lugares.length < 2}
                                onClick={() => onPrincipal?.(l.indice)}
                            >
                                {vista.lugares.length > 1 && <span className={s.radio} aria-hidden />}
                                <span className={s.lugarTextos}>
                                    <span className={s.lugarNombre}>{[l.nombre, l.hora].filter(Boolean).join(' · ') || t('build_editor.wallet_place')}</span>
                                    <span className={s.lugarDireccion}>{l.direccion}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                )}
                {vista.lugares.length > 1 && <span className={tp.hint}>{t('build_editor.main_place_hint')}</span>}
            </div>
        </div>
    )
}
