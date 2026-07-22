---
name: iattend-design-system
description: Documenta el design system real de I attend — colores, tipografías, radios, sombras y patrones de componentes — extraídos directamente de la app en producción (iattend.site) y del manual de marca oficial. Usa esta skill SIEMPRE que se vaya a construir cualquier mockup, prototipo, calculadora, formulario, dashboard interno, slide de presentación o componente HTML/CSS/React para I attend, para que el resultado se vea como parte real del producto y no como un diseño genérico. Dispara con frases como "hazme un mockup de I attend", "diseña una pantalla para el dashboard", "crea un componente que combine con la app", "sigue el design system de I attend", "que se vea como la plataforma", o cualquier entregable visual/UI relacionado con I attend, aunque no lo pidan explícitamente con esas palabras.
---

# Design System de I attend

Este design system tiene **dos capas** que no deben mezclarse sin criterio:

| Capa | Dónde vive | Para qué se usa | Fuente |
|---|---|---|---|
| **Marca / Marketing** | Landing pages, invitación digital del cliente final, presentaciones, redes sociales, copy de venta | Todo lo que ve la novia/el invitado, todo lo que es contenido "editorial" de marca | Manual de marca 2026 (Iranica Design Lab) |
| **Producto / Interfaz** | El dashboard interno del organizador (`/dashboard`, `/build`, `/guests`, `/side`) | Tablas, formularios, botones de acción, navegación, calculadoras internas, herramientas de ventas | Extraído en vivo de iattend.site (julio 2026) |

**Regla práctica:** si estás construyendo algo que el organizador va a usar para *gestionar* su evento (o una herramienta interna de Ventas, como la calculadora de comisiones), usa la capa de **Producto/Interfaz**. Si estás construyendo algo que representa la *marca hacia afuera* (invitación, slide de venta, post), usa la capa de **Marca/Marketing**. Muchas pantallas combinan ambas: la interfaz usa Poppins y componentes tipo Ant Design, pero los títulos y CTAs importantes cambian a las tipografías de marca (Denver-Serial, Windsor) para dar personalidad — eso es intencional, replícalo.

## Resumen rápido

**Colores base (ver `references/colors.md` para la tabla completa):**
- Navy marca: `#1c3249` (manual) — Navy/negro real usado en UI: `#0c171b` (botón de usuario) y `#16323d` (tarjetas oscuras, "mid-blue")
- Lila/lavanda: `#D1BEDD` (manual) ≈ `#d2bfdd` (real, botón CTA primario "Comprar")
- Crema: `#eeeadf` (manual) ≈ `#F5F3F2` (real, fondo secundario de tarjetas)
- Verde salvia: `#b9bba6` (manual)
- Grises de interfaz: texto `#29262D`, gris medio `#787878`, fondo gris `#F1F1F1`, bordes `#EBEBEB`
- Semánticos de producto: éxito `#43B75D`, error `#D32F2F`, info `#0095FF`

**Tipografías:**
- **Poppins** — fuente de interfaz (nav, tablas, labels, texto funcional). Es la fuente "de trabajo", no de marca.
- **Denver-Serial** — títulos y headlines dentro del producto y en marketing (peso 800, tamaños grandes 40px+)
- **Windsor** — acentos y CTAs importantes (botón "Comprar", nombre de usuario), peso 800
- **"Luxora Grotesk"** — cuerpo de texto en zonas de marca/marketing (footer, descripciones, badges de estado tipo "Activa"/"En pausa")
- **Michigan Signature** — manuscrita, solo para detalles de marca (según manual; no se vio en el producto)

**Radios de borde (escala observada):**
- `12px` — botones
- `16px` — pills medianas (badges de estado)
- `24px` — tarjetas de dashboard, módulos del editor
- `36px` — tarjetas grandes con imagen (side events)
- `99px` — pills totalmente redondeadas (avatar de usuario, estados cortos)

**Sombras:**
- Tarjeta clara: `0 0 12px rgba(0,0,0,0.2)` (sin offset, efecto "glow" suave, no drop-shadow tradicional)
- Tarjeta oscura: `0 0 12px rgba(0,0,0,0.35)`
- Botón CTA: `0 2px 0 rgba(155,5,255,0.06)` (sombra muy sutil del mismo tono del botón)

**Base de componentes:** la interfaz del producto está construida sobre **Ant Design** (clases `ant-btn`, `ant-tabs`, `ant-table`, `ant-color-picker`) personalizado con variables CSS propias. Si generas mockups en React para el dashboard interno, pensar en términos de Ant Design (o su misma lógica visual) te va a dar resultados más fieles que Tailwind puro.

## Cuándo profundizar en cada referencia

- **`references/colors.md`** — antes de elegir cualquier color para un mockup o herramienta nueva. Incluye la discrepancia entre el navy de marca y el navy real de producto, y cuándo usar cada uno.
- **`references/typography.md`** — antes de definir jerarquía tipográfica (qué lleva Denver-Serial vs Poppins vs Luxora Grotesk), con tamaños y pesos reales observados.
- **`references/components.md`** — antes de construir botones, tarjetas, badges, tabs o tablas. Incluye snippets de CSS listos para copiar, tomados de los valores computados reales de la app.

## Notas de captura

- Extraído navegando en vivo `https://www.iattend.site` (home, `/dashboard`, `/dashboard/build`, `/dashboard/guests`, `/dashboard/side`) el 8 de julio de 2026, vía inspección de estilos computados (`getComputedStyle`) y variables CSS raíz.
- Se registraron **335 variables CSS** en `:root`, la mayoría escalas de tinte/sombra de un sistema de tokens genérico (probablemente heredado de una plantilla de UI) — no todas están en uso visible. Este documento se queda solo con lo que efectivamente se ve aplicado en pantalla, para no meter ruido.
- No se capturó ni se incluyó ningún dato personal de invitados (nombres, teléfonos) visto en `/guests` — solo patrones visuales de la tabla.
- Si el sitio cambia de diseño en el futuro, esta skill puede quedar desactualizada — vale la pena re-escanear cada tanto en vez de asumir que sigue vigente indefinidamente.
