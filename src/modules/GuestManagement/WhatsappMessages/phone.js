/*
  Formato de teléfonos del buzón.

  Vivía dentro de WhatsappMessages, pero el buzón embebido del Admin necesita el
  mismo formato para pasárselo a OpenChat. Es una función pura: se extrae tal
  cual, sin cambiar ningún caso.
*/

export const phoneFormatter = (params) => {
    const val = typeof params === 'object' && params !== null ? params.value : params;
    if (!val) return "";

    const digits = String(val).replace(/\D/g, "");

    // +52 México con "1" de WhatsApp (13 dígitos: 52 + 1 + 10)
    if (digits.length === 13 && digits.startsWith('52')) {
        const phone = digits.slice(3); // omite 52 + 1
        return `+52 (${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }

    // +52 México (12 dígitos)
    if (digits.length === 12) {
        const country = digits.slice(0, 2);
        const phone = digits.slice(2);
        return `+${country} (${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }

    // +1 US/Canadá (11 dígitos)
    if (digits.length === 11) {
        const country = digits.slice(0, 1);
        const phone = digits.slice(1);
        return `+${country} (${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }

    // Local sin código (10 dígitos)
    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    return val;
};
