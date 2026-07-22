# Componentes — I attend

Patrones de UI extraídos de estilos computados reales en iattend.site. Los valores están listos para copiar a CSS; ajusta selectores a tu marcado.

## Botones

### CTA primario (acción principal, ej. "Comprar")
```css
.btn-primary {
  background: #d2bfdd; /* lila de marca */
  color: #ffffff;
  font-family: 'Windsor', 'Poppins', sans-serif;
  font-size: 16px;
  font-weight: 800;
  border-radius: 12px;
  padding: 12px 36px;
  border: none;
  box-shadow: 0 2px 0 rgba(155, 5, 255, 0.06);
}
```

### Botón secundario/default (ej. "Comenzar")
```css
.btn-secondary {
  background: rgba(255, 255, 255, 0.95);
  color: rgba(0, 0, 0, 0.88);
  font-family: 'Denver-Serial', 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 500;
  border-radius: 12px;
  padding: 8px 20px; /* ajustar según densidad del contenido */
}
```

### Botón/pill de usuario (avatar + nombre)
```css
.user-pill {
  background: #0c171b; /* negro azulado de marca */
  color: #ffffff;
  font-family: 'Windsor', 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 500;
  border-radius: 99px; /* totalmente redondeado */
  padding: 7px 14px;
}
```

## Tarjetas (cards)

### Tarjeta de dashboard (estilo "glass" sobre fondo con imagen)
```css
.dashboard-card {
  background: transparent; /* el fondo real viene de una imagen detrás */
  border-radius: 24px;
  border: 4px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.2);
}
.dashboard-card__header {
  background: rgba(245, 243, 242, 0.5); /* --sc-color al 50% */
  padding: 8px 8px 8px 16px;
}
```

### Tarjeta oscura de invitación (home)
```css
.invitation-card {
  background: #16323d; /* navy real de producto, no el navy de marca */
  border-radius: 24px;
  padding: 12px;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.35);
}
```

### Tarjeta grande con imagen (side event)
```css
.side-event-card {
  background: transparent;
  border-radius: 36px; /* radio más grande que las tarjetas de dashboard */
  border: 4px solid #ffffff;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
}
```

## Badges / Pills de estado

### Estado dentro de tarjeta de marca (ej. "Activa" / "En pausa")
```css
.status-badge {
  background: rgba(255, 255, 255, 0.18); /* translúcido sobre fondo oscuro */
  color: #ffffff;
  font-family: 'Luxora Grotesk', 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 500;
  border-radius: 99px;
  padding: 4px 10px;
}
```

### Estado en tabla de datos (ej. "Confirmado")
```css
.table-status--confirmed {
  background: rgba(239, 234, 255, 0.376);
  color: rgb(109, 60, 250); /* morado tipo Ant Design, no la lila de marca */
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 400;
  border-radius: 16px;
  padding: 4px 8px;
}
```

## Tabs

```css
.tab {
  background: rgba(0, 0, 0, 0.02);
  color: rgb(171, 181, 185); /* gris apagado para tabs inactivas */
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  border-radius: 8px 8px 0 0;
  padding: 8px 16px;
}
.tab--active {
  background: #ffffff;
  color: #16323d; /* navy real de producto */
}
```

## Tablas

```css
.table-header-cell {
  background: #fafafa;
  color: rgba(0, 0, 0, 0.88);
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 600;
  padding: 8px;
}
```

## Editor / módulos de configuración (sidebar tipo "glass")

```css
.editor-module {
  background: rgba(255, 255, 255, 0.376);
  border-radius: 24px;
  padding: 22px 22px 50px;
  width: 370px; /* ancho real del panel del editor */
}
.editor-module__title {
  font-family: 'Poppins', sans-serif;
  font-size: 16px;
  font-weight: 400; /* no lleva negrita, aunque sea un título de sección */
}
```

## Base de librería de componentes

El producto está construido sobre **Ant Design** (`ant-btn`, `ant-tabs`, `ant-table`, `ant-color-picker`, `ant-dropdown`), tematizado con variables CSS propias en vez de los defaults de Ant. Si vas a prototipar algo en React que deba sentirse "parte del dashboard interno":

- Piensa en componentes tipo Ant Design (botones, tabs, tablas, color pickers) en vez de construir todo desde cero con utilidades tipo Tailwind.
- Respeta la escala de radios (12 / 16 / 24 / 36 / 99px) — es más grande y suave que los radios por defecto de Ant Design, es una decisión de marca consciente.
- Las sombras del producto casi nunca llevan offset (`0 0 Npx`) — es un efecto "glow" parejo, no un drop-shadow direccional. Evita sombras con offset vertical marcado (`0 4px 8px...`) si quieres que se vea nativo del producto.

## Escala de espaciado observada

| Contexto | Padding/margin |
|---|---|
| Tarjeta de dashboard (contenedor exterior) | `12px` |
| Header de tarjeta | `8px 8px 8px 16px` |
| Cuerpo completo del dashboard | `74px 24px 24px` |
| Módulo del editor (sidebar) | `22px 22px 50px` |
| Botón CTA primario | `12px 36px` |
| Badge/pill | `4px 8px` a `4px 10px` |

No hay una escala de 8pt estricta y uniforme — el producto usa valores algo más orgánicos (12, 16, 22, 24, 36, 74px). Si necesitas inventar un valor nuevo, quédate cerca de estos números en vez de usar una escala genérica de 8/16/32.
