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

export const PRODUCTS = {
    price_1T1DRoAAdNlITNVbLwiUVWAj: { type: "credits", value: 3 },
    price_1Sx8PvAAdNlITNVbchl6tJBW: { type: "credits", value: 50 },
    price_1Sx8QpAAdNlITNVbIod9MW44: { type: "credits", value: 100 },
    price_1Sx8RWAAdNlITNVbj7c85GlG: { type: "credits", value: 200 },
    // price_1T1H17AAdNlITNVbrTS94Xdr: { type: "credits", value: 1 },
  
    price_1SkRvtAAdNlITNVbj8BA6F2Q: { type: "plan", value: "paperless" },
    price_1SkRwZAAdNlITNVbEsPlYN0F: { type: "plan", value: "lite" },
    price_1SkRxCAAdNlITNVbB0AB16LN: { type: "plan", value: "pro" },
    // price_1TO1kjAAdNlITNVbmfuaY1nm: { type: "plan", value: "pro" }, // test
  
    price_1T1VeXAAdNlITNVbXeWLTh3Y: { type: "side", value: "side_event" },
    price_1T1WY5AAdNlITNVbGrRJx77i: {type: "side", value: "side_event"}
  };
  

  export const plan_paperless = [
    {
      text: "Invitación Paperless",
      icon: LuSmartphone,
    },
    {
      text: "Diseño libre",
      icon: LuPalette,
    },
    {
      text: "Ediciones ilimitadas",
      icon: LuPencilRuler,
    },
    {
      text: "Evento público",
      icon: LuPencilRuler,
    },
    {
      text: "Confirmación manual",
      icon: LuPencilRuler,
    },
  ];
  
  export const plan_pro = [
    {
      text: "Invitación Paperless",
      icon: LuSmartphone,
    },
    {
      text: "Diseño libre",
      icon: LuPalette,
    },
    {
      text: "Ediciones ilimitadas",
      icon: LuPencilRuler,
    },
    {
      text: "Evento público o privado",
      icon: LuPencilRuler,
    },
    {
      text: "Lista de asistencia",
      icon: LuClipboardList,
    },
    {
      text: "Mapa de mesas",
      icon: LuArmchair,
    },
    {
      text: "Envíos automáticos",
      icon: LuSend,
    },
    {
      text: "Pases digitales",
      icon: LuTicket,
    },
    {
      text: "3 Side events",
      icon: LuPartyPopper,
    },
  ];
  
  export const plan_lite = [
    {
      text: "Invitación Paperless",
      icon: LuSmartphone,
    },
    {
      text: "Diseño libre",
      icon: LuPalette,
    },
    {
      text: "Ediciones ilimitadas",
      icon: LuPencilRuler,
    },
    {
      text: "Evento público o privado",
      icon: LuPencilRuler,
    },
    {
      text: "Lista de asistencia",
      icon: LuClipboardList,
    },
    {
      text: "Mapa de mesas",
      icon: LuArmchair,
    },
    {
      text: "1 Side event",
      icon: LuPartyPopper,
    },
  ];