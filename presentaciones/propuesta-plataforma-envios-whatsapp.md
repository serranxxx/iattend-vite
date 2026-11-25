# Propuesta: plataforma de envío de invitaciones por WhatsApp

**Para:** [Nombre del cliente]
**Preparada por:** I attend
**Fecha:** noviembre de 2026
**Vigencia de la propuesta:** 30 días

---

## 1. Resumen

Les proponemos una **plataforma propia, hecha a la medida**, para mandar las invitaciones de sus bodas por WhatsApp **desde su propio número** y atender las respuestas de los invitados en un solo lugar.

El objetivo principal es que **al menos 9 de cada 10 invitaciones lleguen a su destino**. Hoy les llega entre el 60 y el 70%.

- **Inversión:** $90,000 MXN + IVA, en un solo pago dividido por avances. Sin mensualidad de licencia.
- **Tiempo de entrega:** 8 semanas.
- **Incluye:** diseño personalizado, desarrollo, conexión con su cuenta de Meta, capacitación y 3 meses de soporte.
- **El código es suyo** al liquidar el proyecto.

---

## 2. La situación actual

- Las invitaciones se mandan desde una herramienta pensada para **ventas** (un CRM), no para eventos.
- Solo llega **entre el 60 y el 70%** de los mensajes. Eso significa que, en una boda de 250 invitados, a unos 75 hay que buscarlos por otro lado.
- Las plantillas largas, con mucho texto y emojis, Meta las clasifica como **marketing**. Eso tiene dos efectos:
  1. **Cuestan más:** un mensaje de marketing cuesta unas cinco veces lo que uno informativo.
  2. **Meta deja de entregarlos:** cuando una persona ya recibió muchos mensajes de marketing de varias empresas, Meta no le entrega el siguiente. Es la causa más común de pérdida.

---

## 3. Lo que ya logramos en I attend

I attend es nuestra plataforma de invitaciones digitales para bodas y eventos. Ahí mandamos invitaciones por WhatsApp todos los días y medimos cada envío.

En los **últimos 30 días**, en una muestra de 163 mensajes:

| Indicador | Resultado |
|---|---|
| Mensajes enviados | 163 |
| Llegaron a su destino (entregados o leídos) | 157 |
| Fallaron | 1 (1%) |
| Sin confirmación de Meta todavía | 5 |
| **Eficiencia** | **96%** |

Lo logramos con el mismo método que les proponemos: **mensajes cortos, informativos, con un botón** que lleva al invitado a toda la información.

---

## 4. Cómo vamos a llegar al 90%

### 4.1 Mensajes cortos e informativos, con un botón

En lugar de una plantilla larga, el mensaje dice lo esencial y todo lo demás vive en un botón. Por ejemplo:

> Hola {{nombre}}, Ana y Luis te comparten los detalles de su boda del 14 de marzo.
>
> **[ Ver invitación ]**

Un mensaje así Meta lo puede aprobar como **informativo (utility)**:
- **No le aplica** el tope de mensajes de marketing por persona, que es la causa principal de pérdida.
- Cuesta **unas cinco veces menos**.

Meta decide la categoría de cada plantilla al aprobarla y la puede revisar después. Por eso redactamos las plantillas con cuidado y la plataforma **avisa y pausa los envíos** si Meta le cambia la categoría a alguna (ver 4.4).

### 4.2 Listas limpias desde el inicio

Muchos mensajes fallan antes de salir por números mal escritos. Al importar cada lista, la plataforma:
- Pone la lada correcta (+52) y revisa que el número tenga 10 dígitos.
- Detecta repetidos dentro de la misma boda.
- Marca los invitados sin teléfono para completarlos antes de enviar.

### 4.3 Envío controlado y reintentos

- Los mensajes salen en una cola, a un ritmo que cuida la calidad del número.
- Si un mensaje falla por una causa temporal, la plataforma lo **reintenta**. Los mensajes que fallan no se cobran.
- Cada invitado tiene su estatus: enviado, entregado, leído o fallido, con el motivo.

### 4.4 Medición y alertas

- **Panel de eficiencia por boda y por periodo**, igual al que usamos en I attend: cuántos llegaron, cuántos fallaron y por qué.
- **Alerta si Meta cambia la categoría de una plantilla**, para revisarla antes de seguir enviando.

### 4.5 Cómo medimos la eficiencia

**Eficiencia = mensajes entregados o leídos ÷ mensajes enviados.**

Es la confirmación que da Meta, mensaje por mensaje. Antes de arrancar compararemos esta medida con la que ven hoy, para que el antes y el después se midan igual.

### 4.6 Nuestro compromiso

Nos comprometemos a una **meta de 90% o más de eficiencia**, medida en el panel de la plataforma.

Dos factores que no dependen de la plataforma pueden afectarla: que un invitado no tenga WhatsApp en su número, y las reglas o decisiones de Meta. Por eso la **primera boda real es una boda piloto**: la acompañamos de cerca y revisamos juntos su reporte de entrega.

---

## 5. La plataforma

### 5.1 Perfiles

- **3 perfiles de inicio**, cada uno con su propio acceso.
- Cada perfil ve y gestiona solo sus bodas.
- Pensada para 4 o 5 bodas por perfil y entre 200 y 300 invitados por boda, **sin límite** de bodas ni de invitados.

### 5.2 Bodas

- Alta de cada boda: nombre, fecha, novios y el link de su invitación.
- Vista general de cada boda: invitados, enviados, entregados y mensajes sin leer.

### 5.3 Invitados

- **Importar desde Excel o CSV**, con la limpieza de teléfonos del punto 4.2.
- Alta y edición a mano.
- Búsqueda y filtros por estatus de envío.
- Descarga de la lista con su estatus.

### 5.4 Panel de envío

- Elegir la plantilla y a quién mandar: toda la boda, una selección o solo a los que no les ha llegado.
- Vista previa del mensaje antes de enviar.
- Envío masivo con progreso en vivo.
- Estatus por invitado y reintento de los fallidos.

### 5.5 Plantillas

- Alta de plantillas y envío a revisión de Meta desde la plataforma.
- Estatus de aprobación y categoría de cada una.
- Alerta si Meta cambia una categoría (punto 4.4).

### 5.6 Chat

- **Bandeja por boda**, en tiempo real, con las respuestas de los invitados.
- Contestar desde la plataforma, con su número.
- Contador de mensajes sin leer por boda y por perfil.
- Si pasaron más de 24 horas desde el último mensaje del invitado, Meta pide usar una plantilla para volver a escribirle. La plataforma lo indica y la ofrece.

### 5.7 Reporte de entrega

- Eficiencia por boda y por periodo.
- Causas de los fallos, explicadas en español.
- Descarga del reporte.

### 5.8 Diseño

- Diseño personalizado con su marca: logo, colores y tipografía.
- Funciona en computadora y en celular.

---

## 6. Cómo se conecta

- **Su número, a su nombre.** El número se conecta a **su propia cuenta de Meta Business**. No pasa por un intermediario: la plataforma se conecta directo a la API oficial de WhatsApp de Meta.
- **Meta les cobra directo.** Los mensajes se pagan con la tarjeta registrada en su cuenta de Meta, sin sobreprecio de por medio.
- **Servidor y base de datos a su nombre**, pagados con su tarjeta.

Un número solo puede estar conectado a la API de WhatsApp en un lugar a la vez. Si el número que usarán hoy está conectado a otra herramienta, ahí dejará de funcionar. Recomendamos **un número dedicado a invitaciones**, que además protege el número que usan para ventas.

---

## 7. Plan de trabajo

### Semana 0: arranque (en paralelo al desarrollo)

Lo de Meta puede tardar varios días, así que empieza desde el primer día:
- Verificación de su negocio en Meta Business.
- Alta del número y de su nombre visible.
- Creación de la app de WhatsApp en su cuenta.
- Redacción y envío a aprobación de las primeras plantillas.

Sin la verificación del negocio, Meta pone un límite bajo de personas a las que se les puede escribir al día. Con bodas de 300 invitados, ese límite estorba.

### Semanas 1 a 8

| Semana | Trabajo | Entregable |
|---|---|---|
| 1 | Base: acceso, perfiles, bodas. Propuesta de diseño con su marca | Plataforma navegable con su diseño |
| 2 | Invitados: importar Excel, limpieza de teléfonos, edición | Listas cargadas y limpias |
| 3 | Conexión con su cuenta de Meta: número, plantillas, estatus de mensajes | Mensaje de prueba con su número |
| 4 – 5 | Panel de envío: cola, ritmo, reintentos, estatus por invitado | **Hito 2: envío masivo funcionando con su número** |
| 6 – 7 | Chat: bandeja por boda en tiempo real, responder, sin leer | Chat funcionando |
| 7 | Reporte de entrega y alertas de plantillas | Panel de eficiencia |
| 8 | Pruebas, puesta en marcha, capacitación y boda piloto | **Hito 3: entrega final** |

### Después de la entrega: 3 meses de soporte incluidos

- Corrección de errores.
- Ajustes menores.
- Acompañamiento en la boda piloto y en las primeras bodas.
- Revisión del panel de eficiencia.

---

## 8. Qué necesitamos de ustedes

- Acceso de administrador a su cuenta de Meta Business, o que nos agreguen como socio.
- Los documentos para la verificación del negocio en Meta.
- El número que se va a conectar, sin uso en la app de WhatsApp.
- Logo, colores y, si tienen, su manual de marca.
- Una lista real de invitados de ejemplo (puede ir sin datos sensibles).
- Si es posible, un reporte de una campaña que hayan mandado hoy, para medir el punto de partida.
- Los nombres y correos de las personas de los 3 perfiles.

---

## 9. Inversión

### 9.1 Desarrollo

| Concepto | |
|---|---|
| Diseño personalizado y desarrollo de la plataforma (secciones 5 y 6) | Incluido |
| Configuración de su cuenta de Meta y plantillas iniciales | Incluido |
| Capacitación | Incluido |
| 3 meses de soporte después de la entrega | Incluido |
| Cesión del código al liquidar | Incluido |
| **Total** | **$90,000 MXN + IVA** |

### 9.2 Forma de pago

| Momento | % | Monto |
|---|---|---|
| Al arrancar | 40% | $36,000 + IVA |
| Hito 2: envío masivo funcionando con su número | 30% | $27,000 + IVA |
| Hito 3: entrega final | 30% | $27,000 + IVA |

### 9.3 Costos que pagan directo, fuera de esta propuesta

| Concepto | Costo aproximado |
|---|---|
| Servidor y base de datos | US$25 a 50 al mes |
| Mensajes de WhatsApp (los cobra Meta) | Con plantillas informativas, una boda de 250 invitados con invitación y dos recordatorios (~750 mensajes) cuesta unos **US$6–7 (≈ $120 MXN)**. Las respuestas a los invitados dentro de 24 horas no tienen costo |

Las tarifas de Meta las fija Meta y pueden cambiar. Las de esta tabla son las vigentes para México desde octubre de 2026 (US$0.0085 por mensaje informativo).

### 9.4 Después de los 3 meses de soporte

No hay mensualidad obligatoria. El mantenimiento se contrata cuando lo necesiten:

- **Por hora:** $215 MXN + IVA.
- **Bolsa de 10 horas prepagadas:** $1,900 MXN + IVA.

Meta actualiza su API y sus reglas con regularidad. Las adecuaciones que esos cambios requieran se atienden como mantenimiento.

### 9.5 Pago único frente a una suscripción

| A 3 años | Costo aproximado |
|---|---|
| Esta plataforma (pago único + servidor) | ~$122,000 – 140,000 MXN con IVA |
| Un CRM de WhatsApp de nivel intermedio, mes a mes | ~$117,000 MXN, y se sigue pagando cada mes |
| Un CRM de WhatsApp de nivel avanzado, mes a mes | ~$217,000 MXN, y se sigue pagando cada mes |

Además del costo, la diferencia es que la plataforma **es suya**, está **hecha para bodas**, no tiene límite de usuarios ni de bodas, y está diseñada para que **lleguen 9 de cada 10 invitaciones**.

---

## 10. Crecimiento a futuro (fase 2, opcional)

La plataforma queda lista para crecer. Cada mejora se cotiza por separado:

- **Confirmación de asistencia** con un link personal por invitado y estatus automático.
- **Recordatorios automáticos** solo a quienes no han confirmado.
- **Pase con QR** y lector en la entrada de la boda.
- **Reportes para los novios**, listos para compartir.
- **Más perfiles o roles**, por ejemplo uno de solo lectura para los novios.

---

## 11. Condiciones

1. **Propiedad del código.** Al liquidar el último pago, se cede a [Nombre del cliente] el código desarrollado para este proyecto y se entrega el repositorio. Los componentes que I attend ya tenía antes de este proyecto se incluyen con una licencia de uso permanente y sin costo, dentro de esta plataforma.
2. **Crédito.** La plataforma muestra "Made by I attend" en el pie de página, con un link a iattend.site. Este crédito se mantiene mientras la plataforma esté en uso, aunque después la modifique otro proveedor.
3. **Datos.** Los datos de los invitados son de [Nombre del cliente]. I attend solo los trata por su cuenta, para operar la plataforma. [Nombre del cliente] es responsable de su aviso de privacidad y de contar con el permiso de sus invitados para escribirles.
4. **Meta.** La cuenta de Meta Business, el número y los cobros de mensajes están a nombre de [Nombre del cliente]. Las tarifas, reglas y aprobaciones las define Meta.
5. **Meta de eficiencia.** El 90% es una meta medida en el panel de la plataforma, no una garantía: depende también de la calidad de las listas y de las decisiones de Meta (sección 4.6).
6. **Alcance.** Lo que no esté descrito en las secciones 5 y 6 se cotiza aparte.

---

## 12. Siguientes pasos

1. Revisar y aprobar esta propuesta.
2. Firmar el contrato y hacer el primer pago (40%).
3. Arrancar la semana 0: verificación en Meta y número.
4. Reunión de arranque para revisar diseño y una lista de ejemplo.
