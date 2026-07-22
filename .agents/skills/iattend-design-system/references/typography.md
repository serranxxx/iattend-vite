# Tipografía — I attend

I attend usa dos sistemas tipográficos distintos según el contexto: **interfaz funcional** (fuente de trabajo, invisible como "marca") y **contenido de marca** (donde sí se nota la personalidad). No los mezcles al revés — Poppins en un headline de venta se ve genérico, y Denver-Serial en una tabla de datos se ve poco funcional.

## Interfaz (producto/dashboard) — Poppins

Fuente por defecto de casi todo el chrome de la aplicación:

| Elemento | Tamaño | Peso |
|---|---|---|
| Links de navegación superior | 14px | 400 |
| Título de módulo en editor ("Ajustes Generales") | 16px | 400 (regular, sin negrita) |
| Contenido de tablas, tabs | 14px | 400 |
| Headers de tabla (`<th>`) | 14px | 600 |
| Números grandes de métricas (ej. "76" confirmados) | 42px | 600 |
| Labels de métricas ("Confirmados") | 14px | 400 |

**Uso:** cualquier tabla, formulario, nav, sidebar, dato numérico de dashboard. Es la fuente "neutral" — no lleva personalidad de marca a propósito.

## Contenido de marca (dentro y fuera del producto) — Denver-Serial

Stack real observado: `Denver-Serial, Poppins` (Poppins como fallback).

| Elemento | Tamaño | Peso |
|---|---|---|
| Headline promocional dentro del dashboard (ej. "Tus pases en Apple Wallet") | 42px | 800 |
| Texto de botón CTA principal ("Comenzar") | 14px | 500 |

**Uso:** títulos, headlines, texto de botones que representan una acción principal o un mensaje de marca. Según el manual: pesos Bold y Bold Italic.

## Acentos y CTAs de alto impacto — Windsor

Stack real observado: `Windsor, Poppins`.

| Elemento | Tamaño | Peso |
|---|---|---|
| Botón de usuario (nombre en la barra superior) | 14px | 500 |
| Botón CTA "Comprar" (compra de side events) | 16px | 800 |

**Uso:** el manual lo describe como tipografía secundaria para "mensajes complementarios, frases clave, llamados de atención" — en producto se usa específicamente en botones de acción/compra y elementos con jerarquía alta pero de espacio reducido.

## Cuerpo de texto de marca — "Luxora Grotesk"

Stack real observado: `"Luxora Grotesk", Poppins, sans-serif` y `"Luxora Grotesk", Poppins`.

| Elemento | Tamaño | Peso |
|---|---|---|
| Links de footer ("Contacto", "Ayuda") | 14px | 200 |
| Descripción bajo un headline de marca | 16px | 200 |
| Badge de estado tipo "Activa"/"En pausa" (dentro de tarjeta de evento) | 12px | 500 |

**Uso:** cuerpo de texto en zonas donde el contenido "habla" con el tono de marca (calmado, cercano, elegante) — footers, descripciones, badges dentro de tarjetas de marca. Nota: usa pesos bajos (200) para texto normal, no regular/400 — dale ese peso ligero al copy descriptivo.

## Manuscrita — Michigan Signature

Documentada en el manual de marca para "frases destacadas, detalles visuales... toque humano y cercano". No se observó en las pantallas navegadas del producto — resérvala para piezas de marketing/marca donde el manual la especifica explícitamente (no la inventes para el dashboard).

## Regla de decisión rápida

1. ¿Es un número, tabla, nav, o control de formulario? → **Poppins**
2. ¿Es un título/headline o el texto de un botón de acción principal? → **Denver-Serial**
3. ¿Es un botón de compra/CTA de alto impacto o un nombre de usuario destacado? → **Windsor**
4. ¿Es texto descriptivo, footer, o un badge dentro de una tarjeta de marca? → **"Luxora Grotesk"**
5. ¿Es una frase manuscrita puramente decorativa, explícitamente de marca? → **Michigan Signature**

En todos los casos, deja `Poppins` como fallback en el stack (`font-family: 'X', Poppins, sans-serif`) tal como lo hace el producto real — así el texto no se rompe si la fuente de marca no carga.
