import axios from "axios";
import { LuArmchair, LuClipboardList, LuPalette, LuPartyPopper, LuPencilRuler, LuSend, LuSmartphone, LuTicket } from "react-icons/lu";

export const fetchPrices = async (setPrices) => {
    const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/payment/prices`
        // `http://localhost:4000/api/payment/prices`
    );
    setPrices(res.data);
};

export const handleCheckout = async (invitationID, priceId, userId) => {
    try {
        if (!invitationID || !priceId) {
            console.error("Falta invitationID o priceId");
            return;
        }

        const response = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/payment/create-checkout`,
            // `http://localhost:4000/api/payment/create-checkout`,
            {
                invitationId: invitationID,
                priceId: priceId,
                userId: userId
            }
        );

        // Redirigir a Stripe Checkout
        window.location.href = response.data.url;

    } catch (error) {
        console.error("Error al iniciar el pago:", error.response?.data || error.message);
    }
};

export const handleCheckoutInvitation = async (invitation, priceId) => {
    try {
        const response = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/payment/create-checkout-invitation`,
            // `http://localhost:4000/api/payment/create-checkout-invitation`,
            { invitation, priceId }
        );
        window.location.href = response.data.url;
    } catch (error) {
        console.error("Error al iniciar el pago:", error.response?.data || error.message);
    }
};

export const handleCheckoutPlan = async (userId, priceId, name, phoneNumber, label, userEmail) => {
    try {
        if (!userId || !priceId) {
            console.error("Falta userId o priceId");
            return;
        }

        const response = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/payment/create-checkout-plan`,
            // `http://localhost:4000/api/payment/create-checkout-plan`,
            { userId, priceId, name, phoneNumber, label, userEmail }
        );

        window.location.href = response.data.url;

    } catch (error) {
        console.error("Error al iniciar el pago:", error.response?.data || error.message);
    }
};

export const handleCreateFree = async (invitation) => {
    const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/invitation/create-free`,
        // `http://localhost:4000/api/payment/create-free`,
        invitation
    );
    return res.data;
};

export const handleCheckoutGift = async (senderName, recipientName, email, giftMessage, priceId) => {
    try {
        const response = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/payment/create-checkout-gift`,
            { senderName, recipientName, email, giftMessage, priceId }
        );
        window.location.href = response.data.url;
    } catch (error) {
        console.error("Error al iniciar regalo:", error.response?.data || error.message);
    }
};

// ── Stripe price IDs ─────────────────────────────────────────────────────────
// Single source of truth. Update here when changing prices in Stripe.
export const PRICE_IDS = {
  // Credits
  CREDITS_3:        'price_1T1DRoAAdNlITNVbLwiUVWAj',
  CREDITS_50:       'price_1Tl9qVAAdNlITNVbzMviUvKo',   // $150
  CREDITS_100:      'price_1Tl9oiAAdNlITNVby13ZND99',   // $200
  CREDITS_200:      'price_1Tl9tfAAdNlITNVbTIy9P6X9',   // $300

  // Plans
  PLAN_PAPERLESS:   'price_1SkRvtAAdNlITNVbj8BA6F2Q',
  PLAN_LITE:        'price_1Tl9jyAAdNlITNVbm0hq6omU',   // $2,899
  PLAN_PRO:         'price_1Tl9fQAAdNlITNVb953oCZLs',   // $3,999

  // Upgrade
  UPGRADE_TO_PRO:   'price_1TlC4RAAdNlITNVbjcRtexSy',

  // Side events
  SIDE_EVENT:       'price_1Tl9kwAAdNlITNVbqroYr991',   // $300
  SIDE_EVENT_ALT:   'price_1T1WY5AAdNlITNVbGrRJx77i',
};

export const PRODUCTS = {
    [PRICE_IDS.CREDITS_3]:      { type: "credits", value: 3 },
    [PRICE_IDS.CREDITS_50]:     { type: "credits", value: 50 },
    [PRICE_IDS.CREDITS_100]:    { type: "credits", value: 100 },
    [PRICE_IDS.CREDITS_200]:    { type: "credits", value: 200 },

    [PRICE_IDS.PLAN_PAPERLESS]: { type: "plan", value: "paperless" },
    [PRICE_IDS.PLAN_LITE]:      { type: "plan", value: "lite" },
    [PRICE_IDS.PLAN_PRO]:       { type: "plan", value: "pro" },

    [PRICE_IDS.UPGRADE_TO_PRO]: { type: "plan", value: "pro" },

    [PRICE_IDS.SIDE_EVENT]:     { type: "side", value: "side_event" },
    [PRICE_IDS.SIDE_EVENT_ALT]: { type: "side", value: "side_event" },
  };
  

  export const plan_paperless = [
    { key: "plan_features.digital_invitation", icon: LuSmartphone },
    { key: "plan_features.free_design", icon: LuPalette },
    { key: "plan_features.unlimited_edits", icon: LuPencilRuler },
    { key: "plan_features.public_event", icon: LuPencilRuler },
    { key: "plan_features.manual_confirmation", icon: LuPencilRuler },
  ];

  export const plan_pro = [
    { key: "plan_features.digital_invitation", icon: LuSmartphone },
    { key: "plan_features.free_design", icon: LuPalette },
    { key: "plan_features.unlimited_edits", icon: LuPencilRuler },
    { key: "plan_features.public_private_event", icon: LuPencilRuler },
    { key: "plan_features.guest_list", icon: LuClipboardList },
    { key: "plan_features.seating_chart", icon: LuArmchair },
    { key: "plan_features.auto_sends", icon: LuSend },
    { key: "plan_features.digital_passes", icon: LuTicket },
    { key: "plan_features.side_events_3", icon: LuPartyPopper },
  ];

  export const plan_lite = [
    { key: "plan_features.digital_invitation", icon: LuSmartphone },
    { key: "plan_features.free_design", icon: LuPalette },
    { key: "plan_features.unlimited_edits", icon: LuPencilRuler },
    { key: "plan_features.public_private_event", icon: LuPencilRuler },
    { key: "plan_features.guest_list", icon: LuClipboardList },
    { key: "plan_features.seating_chart", icon: LuArmchair },
    { key: "plan_features.side_events_1", icon: LuPartyPopper },
  ];