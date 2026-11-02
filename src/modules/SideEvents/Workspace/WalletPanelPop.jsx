import { useTranslation } from 'react-i18next'
import { WalletPanel } from '../../Editor/WalletPanel'
import { datosPasePop } from './datosPasePop'
import { soloVideos } from '../fotosPortada'
import { portadaConDiseno } from '../componerPortada'
import { PortadaCubierta } from '../PortadaCubierta'

/*
  "Pase digital" de un side event / Pop: el panel compartido
  (Editor/WalletPanel) con los datos del evento. Guarda en `body.wallet`
  ({ enabled, title, image }; enabled false = sin Apple Wallet). Sin foto
  propia, la del pase es la imagen del link (`url_image`), que al guardar se
  arma sola con la portada y sus elementos, o con video la que el
  organizador elige en Fondo (SideEvents.jsx, imagenDelLink). El backend arma cada pase con esto
  (iattend--backend datosPaseSide) y el boleto de la página (iattend-events
  Layout/TicketPop.tsx) usa la misma foto y título.
*/

export const WalletPanelPop = ({ current, setBody, onPickImage }) => {
    const { t } = useTranslation()
    const body = current?.body ?? {}
    const wallet = body.wallet ?? {}
    // Sin foto propia ni del link, la del pase es la portada con sus
    // elementos: se pinta en vivo (la guardada se rehace al guardar).
    const enVivo = !wallet.image && !body.linkImage && !soloVideos(body) && portadaConDiseno(body)
    const vista = { ...datosPasePop(current), ...(enVivo ? { fotoVivo: <PortadaCubierta body={body} /> } : {}) }
    const patchWallet = (patch) => setBody({ wallet: { ...wallet, ...patch } })
    const conFolio = Boolean(body.form?.enabled)

    return (
        <WalletPanel
            vista={vista}
            ejemplo={{
                nombre: t('build_editor.wallet_sample_guest'),
                campos: [
                    { etiqueta: 'PERSONAS', valor: '2' },
                    conFolio
                        ? { etiqueta: 'FOLIO', valor: `${String(body.form?.folioPrefix || 'REG').toUpperCase()}-0001` }
                        : { etiqueta: 'CÓDIGO', valor: 'K7P-2QX' },
                ],
                // Diseño nuevo: el invitado a la derecha y abajo el lugar.
                asiento: t('build_editor.wallet_sample_guest'),
                pie: vista.lugares[0]?.nombre || vista.lugares[0]?.direccion.split(',')[0] || '',
                qr: 'https://iattend.events',
                aviso: t('build_editor.wallet_sample_notice'),
            }}
            walletActivo={wallet.enabled !== false}
            onWalletActivo={(on) => patchWallet({ enabled: on })}
            titulo={wallet.title}
            tituloBase={current?.name}
            onTitulo={(title) => patchWallet({ title })}
            imagenPropia={vista.imagenPropia}
            hayPortada
            onImagen={(image) => patchWallet({ image })}
            onPickImage={onPickImage}
            usarBaseTexto={t('build_editor.wallet_use_link')}
            fotoNota={vista.imagenPropia ? null : t(soloVideos(body) ? 'build_editor.wallet_photo_video' : 'build_editor.wallet_photo_auto')}
            sinLugaresTexto={t('build_editor.wallet_no_place_side')}
            intro={t('build_editor.wallet_intro_side')}
        />
    )
}
