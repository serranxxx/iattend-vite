import { useTranslation } from 'react-i18next'
import { WalletPanel } from '../../../Editor/WalletPanel'
import { datosPaseVista, portadaDe, tituloPortada } from './datosPaseWallet'
import { marcarPrincipal } from '../BuildSections/lugarPrincipal'

/*
  "Pase digital" de la invitación: el panel compartido (Editor/WalletPanel)
  con los datos de la invitación. Guarda en `invitation.wallet`
  ({ enabled, title, image }; enabled false = sin Apple Wallet) y el lugar
  principal en el itinerario (lugarPrincipal.js). El backend arma cada pase
  con esto (iattend--backend/services/wallet/datosPase.js) y el pase de la
  página (iattend-events Ticket.tsx) usa la misma foto y título.
*/

export const WalletPanelInvitacion = ({ invitation, setInvitation, setSaved, onPickImage }) => {
    const { t } = useTranslation()
    const wallet = invitation?.wallet ?? {}
    const vista = datosPaseVista(invitation)

    const patchWallet = (patch) => {
        setInvitation((prev) => ({ ...prev, wallet: { ...(prev.wallet ?? {}), ...patch } }))
        setSaved(false)
    }

    return (
        <WalletPanel
            vista={vista}
            ejemplo={{
                nombre: t('build_editor.wallet_sample_guest'),
                campos: [{ etiqueta: 'MESA', valor: '12' }],
                // La mesa sale en el frente como "Asiento" (semantics.seats).
                asiento: '12',
                qr: 'https://iattend.events',
                aviso: t('build_editor.wallet_sample_notice'),
            }}
            walletActivo={wallet.enabled !== false}
            onWalletActivo={(on) => patchWallet({ enabled: on })}
            titulo={wallet.title}
            tituloBase={tituloPortada(invitation)}
            onTitulo={(title) => patchWallet({ title })}
            imagenPropia={vista.imagenPropia}
            hayPortada={Boolean(portadaDe(invitation))}
            onImagen={(image) => patchWallet({ image })}
            onPickImage={onPickImage}
            onPrincipal={(indice) => {
                setInvitation((prev) => ({ ...prev, itinerary: { ...prev.itinerary, object: marcarPrincipal(prev.itinerary.object, indice) } }))
                setSaved(false)
            }}
            sinLugaresTexto={t('build_editor.wallet_no_places')}
        />
    )
}
