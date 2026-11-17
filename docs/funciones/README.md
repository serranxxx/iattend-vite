# Funciones de I attend: fuente de verdad

Documentación funcional de **todo lo que hace I attend**, para el equipo de ventas y soporte y, más adelante, para el resumen que se entrega al cliente después de las reuniones.

Cada archivo explica, en lenguaje claro: qué es, quién lo puede usar (plan y tipo de cuenta), cómo se usa paso a paso, cómo funciona por dentro, límites y costos, **lo que NO hace**, preguntas frecuentes y lo que queda **pendiente de confirmar**.

**Cómo se hizo:** cada afirmación se revisó contra el código de los tres repositorios (app del organizador, página del invitado y servidor) el **16 de noviembre de 2026**. Los precios y lo que incluye cada plan se consultaron ese día en producción y las dudas se resolvieron con el dueño; viven en la base de datos y en Stripe, así que pueden cambiar sin tocar el código. Lo que no se pudo verificar dice **"Pendiente de confirmar"** en lugar de suponerlo.

**Antes de copiar a material para clientes:** los bloques marcados **"Nota interna"** y las secciones "Referencias técnicas" son para el equipo; no van en el PDF del cliente.

## Índice

| # | Módulo | Lo esencial |
|---|---|---|
| 1 | [Invitación](01-invitacion.md) | Editor, secciones, Capas, dibujar, Ver en vivo, publicar, PDF, idiomas, cómo confirma el invitado |
| 2 | [Invitados y envíos por WhatsApp](02-invitados.md) | Agregar, importar con Lia, estados, pasos y vista Compacta, recordatorios, buzón y **cómo funcionan realmente los envíos** |
| 3 | [Acomodo de mesas](03-acomodo-de-mesas.md) | Mapa del salón, formas, giro, sillas específicas, panel de mesa |
| 4 | [Save the Date](04-save-the-date.md) | Gratis, uno por evento, se comparte con link |
| 5 | [Side events](05-side-events.md) | Eventos alrededor de la boda; cuántos por plan; sin WhatsApp |
| 6 | [Pases digitales](06-pases-digitales.md) | QR, Apple Wallet, avisos, lector de pases |
| 7 | [Pops](07-pops.md) | Eventos rápidos independientes: crear, editor, formularios, chat, patrocinadores, en línea |
| 8 | [Photo Wall](08-photo-wall.md) | Fotos de los invitados en vivo |
| 9 | [Créditos y almacenamiento](09-creditos.md) | De dónde salen, en qué se gastan, paquetes, espacio |
| 10 | [Planes](10-planes.md) | Paperless, Lite y PRO: qué incluye cada uno y cuánto cuesta |
| 11 | [Lia](11-lia.md) | Qué hace y qué NO hace el asistente con IA |
| 12 | [Todo lo demás](12-todo-lo-demas.md) | Cuentas, planners, Mis eventos, checkout y pagos, soporte, opiniones, regalar |

## Los cinco puntos que más confunden a los clientes

1. **Los envíos por WhatsApp no son masivos con un clic.** Cada invitación es un mensaje individual (nombre y link de cada invitado) y hoy se manda con un clic por familia. Los recordatorios se pueden pedir para muchos, pero el servidor los envía uno por uno a un ritmo controlado. Ver [02-invitados.md](02-invitados.md#envíos-por-whatsapp-cómo-funcionan-realmente).
2. **WhatsApp solo funciona con PRO y con números de México (+52).** Lite y números del extranjero usan "Copiar link" y lo mandan a mano.
3. **La invitación no se guarda sola:** los invitados no ven cambios hasta tocar Publicar.
4. **La fecha límite para confirmar no bloquea al invitado.**
5. **Los créditos son de cada evento**, no de la cuenta, y no se pasan de una boda a un Pop.

## Pendiente de confirmar (resumen de todos los módulos)

**Datos que viven fuera del código:**
- **WhatsApp (Meta):** cuántos invitados distintos puede contactar al día el número de I attend, cuáles plantillas son de marketing (se usan marketing y utilidad; Meta puede no entregar algunas de marketing) y el texto exacto de las plantillas y su botón. — [02](02-invitados.md)
- Que estén activas en producción las sillas y el giro de mesas, y el servicio de avisos y actualizaciones de Apple Wallet. — [03](03-acomodo-de-mesas.md), [06](06-pases-digitales.md)
- Contenido real del recorrido "Conoce I attend" y del correo de accesos que reciben los clientes de un planner. — [12](12-todo-lo-demas.md)
- Cómo se llega a Recordatorios desde el celular. — [02](02-invitados.md)

**Por decidir:**
- **Regla de plan del Photo Wall:** el tablero del organizador lo muestra según un interruptor por plan (Admin → Planes), pero la página del invitado solo lo enseña en PRO. Si algún día se activa para otro plan, hay que cambiar también la página del invitado. — [08](08-photo-wall.md)

**Por corregir o desarrollar** (confirmado el 16 de noviembre de 2026; está en las notas internas):
- "Asignar mesa" en Confirmados sienta solo a esa persona, aunque el texto dice que sienta al grupo. — [02](02-invitados.md)
- La ventana de 24 horas del buzón se cuenta distinto que en WhatsApp. — [02](02-invitados.md)
- Escanear el QR de un Pop (por ahora la llegada se registra a mano). — [06](06-pases-digitales.md), [07](07-pops.md)
- Selector de idiomas en el editor nuevo. — [01](01-invitacion.md)
- Regala I attend. — [12](12-todo-lo-demas.md)
- En el catálogo de producción, Lite todavía dice 1 side event (ya no incluye); y el texto "Tu invitación queda activa hasta el día de tu evento" contradice que la invitación no vence. — [10](10-planes.md)
- Probar en uso real: mesa bloqueada que se puede arrastrar y arrastre de invitados en pantallas táctiles. — [03](03-acomodo-de-mesas.md)

**Ya resuelto** (16 de noviembre de 2026): la traducción sí se ofrece; Lite no tiene side events; la invitación no vence; no hay facturas ni reembolsos; la invitación en PDF no tiene restricciones; la contraseña la recupera soporte; Lia es solo PRO, con 50 tokens gratis al día y acceso a toda la información de los invitados; las fotos del Photo Wall se borran a los 30 días (trigger en Supabase); desactivar un Save the Date, borrar un side event y activar paquetes de Pops se hace a mano; se actualizó el aviso de privacidad y se quitó el botón "Contratar PRO" del Save the Date.

Las notas internas de cada archivo listan además posibles errores técnicos encontrados al revisar el código (códigos de invitado sin filtro por invitación, lector que entra sin clave con link directo, etc.).

## Mantenimiento

Cuando cambie una función, actualizar el archivo del módulo y la fecha de revisión de su encabezado. La documentación técnica para desarrolladores sigue en los demás archivos de `docs/` y en `CLAUDE.md`.
