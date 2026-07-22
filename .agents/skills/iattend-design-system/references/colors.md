# Colores — I attend

Dos fuentes: el **manual de marca** (identidad, aprobado por Iranica Design Lab) y lo **extraído en vivo** del producto (iattend.site, julio 2026). Cuando coinciden, es la misma intención de color con variación mínima de captura. Cuando no coinciden, el producto tiene su propio token adicional que no está en el manual —úsalo quirúrgicamente, no lo generalices como "color de marca".

## Paleta de marca (manual oficial)

| Nombre | HEX | Uso previsto |
|---|---|---|
| Azul marino (principal) | `#1c3249` | Color principal de marca |
| Lila / lavanda | `#D1BEDD` | Acento de marca |
| Beige / crema | `#eeeadf` | Fondo cálido de marca |
| Verde salvia | `#b9bba6` | Acento secundario |
| Negro azulado (contraste) | `#0c171b` | Contraste/texto oscuro |

## Colores reales en producto (extraídos en vivo)

| Token | HEX / valor | Dónde se ve | Coincide con manual |
|---|---|---|---|
| `--ft-color` | `#FFFFFF` | Texto sobre fondos oscuros | — |
| `--sc-color` | `#F5F3F2` | Fondo secundario de tarjetas (ej. header de tarjeta "Gestión de invitados", 50% opacidad) | ≈ crema `#eeeadf`, no idéntico |
| `--text-color` | `#29262D` | Texto principal de interfaz | — |
| `--gray-color` | `#787878` | Texto secundario/gris | — |
| `--gray-bg` | `#F1F1F1` | Fondos grises neutros | — |
| `--borders` | `#EBEBEB` | Bordes sutiles | — |
| Botón de usuario (avatar/dropdown) | `#0c171b` — `rgb(12,23,27)` | Botón "Alberto" en la barra superior | **Idéntico** al negro azulado de marca |
| Botón CTA primario | `#d2bfdd` — `rgb(210,191,221)` | Botón "Comprar" (side events), acción principal | **Casi idéntico** a la lila de marca (`#D1BEDD`) |
| Tarjeta oscura / "mid-blue" | `#16323d` — `rgb(22,50,61)` | Fondo de tarjetas de invitación en el home, color de texto en tab activa | **No es el mismo navy** que `#1c3249` de marca — es un navy más verdoso/oscuro propio del producto. Úsalo para fondos de tarjeta oscuros dentro del dashboard; usa `#1c3249` cuando el contexto sea explícitamente de marca/marketing. |
| Éxito | `#43B75D` | Estados positivos (confirmaciones, success) | — |
| Error | `#D32F2F` | Estados de error/alerta | — |
| Info | `#0095FF` | Estados informativos | — |
| Pill "Confirmado" (guests) | texto `rgb(109,60,250)` sobre fondo `rgba(239,234,255,0.376)` | Badge de estado en la tabla de invitados | Morado tipo Ant Design, no es la lila de marca — es un tono aparte para estados de confirmación en tablas |
| Bordes de tarjeta tipo "glass" | `rgba(255,255,255,0.5)` sólido 4px, o blanco sólido 4px | Tarjetas del dashboard y de side events sobre fondos con imagen | Efecto vidrio/glassmorphism sobre imágenes de fondo |

## Cómo decidir qué navy usar

- **`#1c3249`** (marca oficial) → cuando el elemento representa la marca hacia afuera: logotipo, headers de presentación, materiales de venta, portada de invitación.
- **`#16323d`** (producto real) → cuando estás replicando una pantalla real del dashboard (tarjetas oscuras, textos de tabs activos) y quieres que el mockup se vea idéntico a la app actual.

Si tienes duda y el entregable es "genérico" (no una réplica exacta de una pantalla), usa el navy de marca `#1c3249` — es la fuente aprobada.

## Cómo decidir qué lila usar

Para efectos prácticos son el mismo color: `#D1BEDD` (manual) y `#d2bfdd` (producto) difieren en menos de 1% por canal — usa `#D1BEDD` como referencia oficial y no te preocupes por la diferencia.

## Opacidades observadas

El producto usa mucho las mismas variables con sufijos de opacidad (`-80`, `-50`/`-60`, `-40`, `-20`) en vez de definir colores nuevos — patrón útil a replicar: define tu color base y genera variantes con opacidad en vez de inventar tonos nuevos para estados hover/disabled/secundario.
