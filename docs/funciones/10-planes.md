# 10. Planes

> Precios y contenido consultados el 16 de noviembre de 2026 en `GET /api/plans` (producción). **Estos datos viven en la base de datos** (tabla `plans`, Admin → Configuración → Planes) y pueden cambiar sin tocar el código: antes de citarlos a un cliente, revisar la página de precios vigente.

## Qué es un plan

Lo que se compra para un evento (una boda o evento principal). Es **un pago único por evento**, no una mensualidad. **La invitación no vence**: sigue en línea también después del evento.

## Planes vigentes

| | Paperless | Lite | PRO |
|---|---|---|---|
| Precio | **$849** | **$2,899** | **$3,999** de contado, o **$4,499** en 3, 6 o 12 pagos |
| Descripción | "La invitación digital esencial, simple y sin límites." | "Invitación digital con control de invitados." | "La experiencia completa: invita, gestiona y automatiza." |
| Invitación digital y editor | Sí | Sí | Sí |
| Save the Date | Sí | Sí | Sí |
| Lista de invitados | No | Sí | Sí |
| Acomodo de mesas | No | Sí | Sí |
| Confirmación registrada en I attend | No (el invitado confirma por WhatsApp al organizador) | Sí | Sí |
| Side events incluidos | 0 | 0 | **2** |
| Comprar side events extra ($300 c/u) | No | No | **Sí** |
| Créditos incluidos | 0 | 0 | **200** |
| Envío de invitaciones y recordatorios por WhatsApp | No | No | **Sí** |
| Importar invitados desde Excel con Lia | No | No | **Sí** |
| Pases con QR y Apple Wallet | No | No | **Sí** |
| Lector de pases | No | No | **Sí** |
| Photo Wall | No | No | **Sí** |
| Lia (asistente con IA) | No | No | **Sí** |

En PRO a pagos: 3 × $1,499.67 · 6 × $749.83 · 12 × $374.92 (la app lo redondea, por ejemplo "12 pagos de $375"). El plazo se elige al pagar en Stripe.

También existe la **cuenta gratuita (Free)**, que no se vende: es la que tiene toda cuenta nueva y solo incluye el Save the Date.

## Cambiarse de Lite a PRO

- Cuesta **$1,100** ($2,899 + $1,100 = $3,999).
- Se ofrece con el banner "Cámbiate a PRO" (solo a quien tiene Lite) o con "Contacta a tu asesor I attend".
- Al pagar, el plan pasa a PRO, **se suman los 200 créditos**, el tope de side events sube a 2 y se activa el Photo Wall.
- Subir de plan nunca quita nada de lo que ya se tenía.

## Cómo funciona por dentro

- Al crear o activar una invitación, lo que incluye el plan (créditos, side events, Photo Wall) **se copia a la invitación**. Si después I attend cambia el catálogo, las invitaciones que ya existen conservan lo que tenían.
- Lo que bloquea cada plan lo decide la app al mostrar los botones (por ejemplo, el botón de enviar por WhatsApp aparece bloqueado con la etiqueta PRO).
- Paperless no muestra en el tablero las secciones de Invitados, Side events ni Photo Wall.
- Con la cuenta gratuita el tablero solo muestra el Save the Date y "Contrata I attend".

## Lo que NO hace / malentendidos comunes

- **No es una suscripción**: no hay cobros mensuales.
- **Lite no puede comprar side events sueltos**; hay que pasarse a PRO.
- **Lite no manda WhatsApp**, aunque compre créditos.
- **Los créditos incluidos son solo de PRO** (200). No decir "300 créditos" ni "3 side events": eso era el catálogo anterior.
- **Paperless no registra confirmaciones** en I attend: el botón del invitado abre WhatsApp hacia el teléfono del organizador.
- **"Pagos" no es lo mismo que "meses sin intereses"**: en la app se dice "pagos". El PRO a pagos cuesta $500 más que de contado.

## Preguntas frecuentes

**¿Puedo pagar a meses?** Solo PRO: $4,499 en 3, 6 o 12 pagos con tarjeta.

**Tengo Lite, ¿cuánto me cuesta PRO?** $1,100 más, y recibo 200 créditos.

**¿Cuántos side events trae mi plan?** PRO 2. Lite y Paperless no incluyen side events. Si tu invitación se creó con otro número, vale el de tu invitación.

**¿Mi invitación vence?** No. Es un pago único y no tiene fecha de vencimiento.

**¿Puedo comprar más side events?** Solo con PRO, $300 cada uno.


> **Nota interna:** el 16 de noviembre de 2026 el catálogo de producción todavía decía que Lite trae 1 side event; corregirlo en Admin → Configuración → Planes (Lite ya no incluye side events). El texto del checkout "Un pago único. Tu invitación queda activa hasta el día de tu evento." (`es.json`) contradice que la invitación no vence; conviene cambiarlo.

> **Nota interna:** el bloqueo de WhatsApp por plan existe solo en la interfaz; el backend de WhatsApp no revisa el plan.

## Referencias técnicas (para soporte)

Catálogo: tabla `plans`, backend `config/plans.js`, `GET /api/plans`; app `src/hooks/usePlans.js`; Admin `src/pages/Admin/sections/PlanesSection.jsx`. Activación: backend `controllers/supabase.js` (`activatePlan`). Ver `iattend--backend/migrations/2026-09-25_create_plans_catalog.sql`.
