# 9. Créditos y almacenamiento

> Revisado contra el código el 16 de noviembre de 2026. Los precios se consultaron ese mismo día en los endpoints públicos de producción (`/api/payment/prices`, `/api/storage/package`, `/api/ai/credits/packages/list`). Las notas marcadas **Nota interna** son para el equipo.

## Qué son los créditos

Son la "moneda" interna de un evento: se gastan sobre todo en mensajes de WhatsApp.

**Los créditos son de cada evento, no de la cuenta.** Una boda tiene su saldo y cada Pop tiene el suyo; no se pasan de uno a otro.

El saldo se ve en el encabezado del tablero, con un "+" para comprar más. En un Pop aparece como la píldora "✈ N envíos +".

## De dónde salen

| Origen | Cuántos |
|---|---|
| Plan PRO | **200 créditos** al activarse. Paperless, Lite y la cuenta gratuita traen 0. |
| Cambiarse de Lite a PRO | Suma los 200 créditos de PRO |
| Cada Pop | **30 créditos propios** al crearse (pagado o gratis) |
| Compra de paquetes | Ver tabla de abajo |
| Devolución automática | Los recordatorios que fallan al enviarse en un lote se devuelven solos |
| Ajuste de I attend | Un administrador puede corregir el saldo a mano |

## Paquetes de créditos

| Paquete | Precio (MXN, IVA incluido) |
|---|---|
| 50 créditos | **$150** |
| 100 créditos | **$200** |
| 200 créditos | **$300** |

Pago único con tarjeta en Stripe. Los paquetes no se pueden pagar a meses.

**Cómo se compran:**
1. Tocar el **"+"** junto al contador de créditos (en un Pop, el "+" de la píldora de envíos).
2. Elegir el paquete (viene marcado el de 200) y tocar **Comprar**.
3. Pagar en Stripe.
4. Al volver a I attend, los créditos se suman solos en unos segundos.

## En qué se gastan

| Uso | Costo | Saldo que usa |
|---|---|---|
| Enviar la invitación por WhatsApp | **1 crédito por titular** (una familia = 1 mensaje = 1 crédito) | Boda o Pop |
| Reintentar un envío que no se entregó | **Gratis** | — |
| Recordatorio por WhatsApp | **1 crédito por titular** | Boda |
| Contestar a un invitado en el buzón de WhatsApp | **Gratis** | — |
| Idioma extra de la invitación | El 1.º es **gratis**; cada uno de los siguientes, **100 créditos** | Boda |
| Ampliar el espacio de la invitación | **100 créditos**: de 10 MB a 30 MB, una sola vez | Boda |
| Ampliar el espacio de un Pop | **5 créditos por MB nuevo** (10→20 MB = 50; 10→30 MB = 100; 20→30 MB = 50) | Pop |
| Canjear por saldo de Lia | 50 de Lia = 50 créditos; 100 = 80; 150 = 120 | Boda |

No se encontró ningún otro uso de créditos en el código. Importar invitados, el Photo Wall, el lector de pases, el Save the Date y los textos con Lia (que usan el saldo propio de Lia) no gastan créditos de I attend.

Los detalles de WhatsApp (cuándo se cobra, qué pasa si un número falla) están en [02-invitados.md](02-invitados.md#envíos-por-whatsapp-cómo-funcionan-realmente).

## Almacenamiento ("Subidos")

| | Invitación | Pop |
|---|---|---|
| Espacio de base | **10 MB** | **10 MB** |
| Ampliación | Una vez a **30 MB** por 100 créditos | A **20 MB** o **30 MB**, 5 créditos por MB nuevo |
| Qué cuenta | Fotos, videos, PNG y PDF de la invitación | Todo lo del Pop (también logos de patrocinadores y material de Pop en línea) |
| Qué **no** cuenta | Photo Wall, audio de la canción | Audio de la canción |

**Paso a paso:**
1. Al llenarse aparece: "Llegaste al límite de N MB de tus archivos. Borra alguno o amplía tu espacio en Subidos."
2. En el panel **Subidos** se ve el medidor ("X MB de N MB") y el botón **"Ampliar a N MB"**.
3. Se confirma: "¿Estás seguro de ampliar tu storage?" → **Sí, ampliar**.
4. "Listo: ahora tienes N MB". Si no alcanza el saldo, avisa que no hay créditos suficientes.

Ampliar el espacio no revisa el plan: cualquier invitación con 100 créditos puede hacerlo.

## ¿Caducan? ¿Se devuelven?

- **No hay fecha de vencimiento de créditos** en el sistema.
- El saldo de Lia que se canjea no caduca. Los 50 mensajes gratis diarios de Lia se reinician cada medianoche.
- **Devoluciones automáticas:** solo los mensajes de un **lote de recordatorios** que fallan al enviarse.
- **Créditos comprados:** no se reembolsan.
- Idiomas, espacio extra y canjes de Lia no se devuelven.

## Lo que NO hace / malentendidos comunes

- **Los créditos no son de la cuenta**: son de cada evento. No se transfieren de una boda a un Pop ni al revés.
- **No sirven para pagar un plan, un Pop o un side event**; eso se paga con tarjeta.
- **Con Lite se pueden comprar créditos, pero no se puede mandar WhatsApp** (enviar es solo PRO). En Lite los créditos sirven para espacio extra o idiomas.
- **Los 30 créditos de un Pop no alcanzan para ampliarlo a 30 MB** (cuesta 100); hay que comprar créditos para ese Pop.
- **Gastar un crédito no garantiza que el invitado lea el mensaje.** El crédito paga el intento de envío; ver la sección de WhatsApp en [02-invitados.md](02-invitados.md).

## Preguntas frecuentes

**¿Cuánto cuestan?** 50 por $150, 100 por $200 y 200 por $300.

**¿Vencen?** No.

**¿Puedo pasar créditos de mi boda a mi Pop?** No.

**¿Cuántos créditos necesito para invitar a 150 familias por WhatsApp?** 150 (uno por titular). Con PRO vienen 200.

**Se me acabaron a la mitad, ¿qué pasa?** El botón de enviar se bloquea con el aviso de que no hay créditos; se compran más con el "+".

## Pendiente de confirmar

- Ninguno sobre las reglas de cobro. Los precios de los paquetes viven en Stripe y pueden cambiar sin tocar el código.

> **Nota interna:** el selector de créditos dice "1 token de Lia ≈ 1 crédito", lo cual no es exacto (Lia tiene su propio saldo y el canje es 50→50, 100→80, 150→120). No repetir esa frase. Algunos comentarios del código todavía dicen que los niveles de un Pop son 15/30 MB; lo vigente es 20/30.

## Referencias técnicas (para soporte)

Contador y compra: `src/components/Payment/CreditController/`, `src/components/Payment/Credits/Credits.jsx`, `src/components/Payment/functions.js`. Espacio: backend `router/storage.route.js`, `src/helpers/services/storageQuota.js`. Idiomas: iattend-events `app/api/translation/invitation/route.ts`. Lia: backend `router/ai.credits.route.js`.
