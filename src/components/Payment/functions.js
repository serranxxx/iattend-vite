import axios from "axios";

export const fetchPrices = async (setPrices) => {
    const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/payment/prices`
        // `http://localhost:4000/api/payment/prices`
    );
    setPrices(res.data);
};

export const handleCheckout = async (invitationID, priceId) => {
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
            }
        );

        // Redirigir a Stripe Checkout
        window.open(response.data.url, "_blank");

    } catch (error) {
        console.error("Error al iniciar el pago:", error.response?.data || error.message);
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
  
    price_1T1VeXAAdNlITNVbXeWLTh3Y: { type: "side", value: "side_event" },
    price_1T1WY5AAdNlITNVbGrRJx77i: {type: "side", value: "side_event"}
  };
  