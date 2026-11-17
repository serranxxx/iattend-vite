# 11. Lia, el asistente con IA

> Revisado contra el código el 16 de noviembre de 2026. Las notas marcadas **Nota interna** son para el equipo.

## Qué es

Lia es la asistente con inteligencia artificial de I attend. Tiene tres caras distintas:

| Cara | Para quién | Dónde | Qué hace |
|---|---|---|---|
| **Lia del organizador** (chat) | Dueño, planner o administrador de la invitación | Botón redondo en todas las pantallas del tablero; en el celular, "Pregúntale a Lia" | Responde preguntas sobre el evento con datos reales y **propone** cambios que el organizador aprueba |
| **Texto con Lia** | El mismo organizador | Editor de la invitación | Redacta o reescribe textos |
| **Lia para invitados** | Invitados de una invitación PRO | Pestaña "Lia" de la invitación | Responde dudas del evento (horarios, lugar, dress code, regalos…) |

Además, el importador de Excel usa IA para entender las columnas (ver [02-invitados.md](02-invitados.md)).

## Quién la puede usar

- **Solo planes que incluyen Lia: hoy, PRO.** Sin ella, el chat muestra "Lia viene incluida en el plan Pro".
- El chat del organizador está en las pantallas del tablero de una invitación (también en los side events de la boda). **No está en los Pops**, ni en el editor de la invitación desde el celular.
- Su personalidad: cálida, directa y breve (3 o 4 líneas).

## Paso a paso (organizador)

1. **Abrir:** el botón redondo animado (en computadora) o "Pregúntale a Lia" en el menú del celular.
2. **Saludo:** Lia saluda con los nombres de los anfitriones y un resumen (días que faltan, mensajes sin leer, confirmaciones y cancelaciones de las últimas 24 horas, quiénes vieron la invitación sin responder). El saludo no gasta saldo.
3. **Preguntar:** escribiendo o con los atajos:
   - ¿Cómo vamos?: Resumen del evento, Pases disponibles, Porcentaje de confirmados, Lado de A vs lado de B, Prioridad A sin respuesta.
   - Invitados: Vieron pero no respondieron, Invitaciones no entregadas, Confirmados sin mesa, Cuántos niños vienen.
   - Mensajes: Mensajes sin leer, Último mensaje recibido.
   - Side events: Mis side events, Quién confirmó, Quién falta por responder.
4. **Respuestas visuales:** listas de invitados, barras de mesas o confirmaciones, comparación por lado, botones que llevan a una pantalla y una tarjeta de soporte con WhatsApp y correo.
5. **Acciones con aprobación:** cuando Lia propone un cambio aparece **"✦ Lia necesita tu aprobación"** con **Aprobar** y **Cancelar**. Nada cambia hasta que se aprueba.
6. Calificar respuestas (pulgar arriba o abajo) y "Reiniciar chat".

Leyenda fija: "Lia puede cometer errores. Por favor verifica las respuestas."

## Qué puede hacer

**Consultar** (sin aprobación). Lia tiene acceso a toda la información de tus invitados y de tu evento: resumen del evento, confirmados sin mesa, detalles del evento (itinerario, dress code, avisos, hospedaje, regalos, personas importantes), invitados filtrados por estado, prioridad, etiqueta, lado o tipo, historial de WhatsApp de un invitado, ocupación de mesas, mensajes recibidos y sin leer, quién vio y no respondió, envíos que fallaron, side events y sus invitados, y novedades de las últimas 24 horas.

**Cambiar** (siempre con **Aprobar**, una acción a la vez):
- Estado de un invitado (por invitar, esperando, confirmado, no asistirá, llegó).
- Sentar a un invitado en una mesa.
- Crear una mesa (pregunta nombre, capacidad y forma) o la pista de baile.
- Eliminar una mesa (solo si está vacía).
- Cambiar la fecha (y hora) del evento.
- Estado de un invitado de un side event.

**Mover la pantalla:** filtrar la lista de Invitados, abrir una pestaña, abrir el perfil de un invitado o el formulario de nuevo invitado (vacío).

## Lo que NO hace

- **No manda WhatsApp**: ni invitaciones, ni recordatorios, ni respuestas. Solo los lee.
- **No cambia nada sin aprobación.**
- **No hace acciones en grupo.** "Las acciones en grupo llegan muy pronto a Lia. Por ahora puedo ayudarte de una en una." Por ejemplo, no sienta a una familia completa en un paso.
- **No edita el diseño** de la invitación ni la publica.
- **No cobra, no compra y no toca pagos.**
- **No agrega, edita ni borra invitados**; solo cambia su estado o su mesa.
- No renombra mesas ni cambia su capacidad o forma.
- No crea ni edita side events. No toca Pops, Photo Wall ni Save the Date.
- **No recuerda conversaciones anteriores.** Usa los últimos 6 mensajes de la conversación abierta; al recargar la página o salir del tablero empieza de cero. (Sí lee los datos actuales del evento en cada mensaje.)
- **No ve en qué pantalla estás.**
- **La tarjeta "Que Lia se encargue"** (en Invitados) **todavía no hace nada**: abre un aviso con el botón "Muy pronto en I attend". Lia no reenvía, no insiste ni actualiza nada por su cuenta.

## Saldo de Lia ("tokens")

- Es un **saldo aparte** de los créditos de I attend. En pantalla se llama "tokens".
- **50 gratis al día por evento**, que se reinician a la medianoche (hora de Ciudad de México).
- **Cada mensaje cuesta según lo que cueste responderlo**: una pregunta simple gasta poco y una que consulta mucho gasta más. No es "un mensaje = un token".
- No gastan saldo: el saludo, aprobar o cancelar una acción.
- Sin saldo: "Has llegado a tu límite gratis del día · Regresa mañana para seguir usando a Lia, o adquiere más tokens para continuar hoy."
- **Paquetes** (se canjean con créditos de I attend, no con tarjeta):

| Tokens de Lia | Créditos de I attend |
|---|---|
| 50 | 50 |
| 100 | 80 |
| 150 | 120 |

- Lo canjeado **no caduca**. Primero se gastan los gratis del día.
- "Texto con Lia" gasta este mismo saldo.

## Texto con Lia (editor de la invitación)

- **"Escribir con Lia"** (en Elementos): genera hasta 3 opciones para la bienvenida (texto o título), una frase o un aviso, con tono romántico, formal o divertido.
- **"Reescribir con Lia"** (en la barra de texto): reescribe el texto elegido (también con tono "breve").
- Solo propone: el organizador elige si usa el texto.
- Solo en el editor de la invitación (no en side events ni Pops). Requiere un plan con Lia.

## Lia para invitados

- En la pestaña **Lia** de la invitación PRO: "Resuelve tus dudas del evento", con preguntas rápidas ("¿A qué hora y dónde empieza la ceremonia?", "¿Cuál es el dresscode?", "¿Hay mesa de regalos?", etc.).
- Responde **solo con los datos públicos del evento**: fecha, horarios, itinerario, lugares y cómo llegar, dress code, regalos, avisos, hospedaje y anfitriones. Si un dato no está, sugiere preguntarlo a los anfitriones.
- **Nunca comparte** la lista de invitados, quién confirmó, el acomodo de mesas, mensajes privados ni contactos.
- Límites: 500 caracteres por pregunta, 20 preguntas cada 10 minutos por conexión y 300 preguntas al día por invitación.
- **No gasta el saldo del organizador.**

## Cómo funciona por dentro

Cada mensaje del organizador se clasifica (consulta, ayuda, acción o seguimiento) y lo responde un modelo de IA según el tipo (de Google, OpenAI o Anthropic). Las respuestas usan datos que el servidor lee de la base en ese momento. Los cambios se guardan como "pendientes" y solo se ejecutan al aprobarlos; al aprobar se vuelve a revisar que el invitado y la mesa sean de ese evento.

## Preguntas frecuentes

**¿Cuántas preguntas puedo hacer gratis?** 50 tokens al día por evento; una pregunta gasta 1 o más según su complejidad.

**Se me acabaron los tokens.** Espera a la medianoche o canjea un paquete desde el chat con créditos de I attend.

**¿Lia puede confirmar a un invitado?** Sí: lo propone y tú apruebas. Uno a la vez.

**¿Puede mandar las invitaciones por mí?** No.

**¿Puede borrar una mesa?** Sí, con aprobación y solo si está vacía.

**¿Los invitados pueden hablar con Lia?** Sí, en invitaciones PRO, y solo responde datos públicos del evento.

**¿Lia está en mi Pop?** No.

> **Nota interna:** la guía de ayuda que Lia usa para responder "¿cómo hago…?" (`models/lia.ayuda.js`) está parcialmente desactualizada: dice que el Excel solo acepta .xlsx y .xls (hoy también .csv, .ods, .numbers) y, para side events, habla de un botón "Guardar" y de la pestaña "Envío" (hoy se guarda solo y la pestaña se llama "Invitados"). Lo que dice de que no se puede enviar en lote sí es correcto hoy. En la página del invitado, el límite de 300 preguntas al día se cuenta desde la medianoche UTC.

## Referencias técnicas (para soporte)

Chat: `src/pages/Lia/Lia.jsx`, `liaApi.js`, `src/components/ChatContainer/`. Backend: `router/ai.chat.route.js` (herramientas `LIA_TOOLS`, aprobación `/chat/approve`, `/guest-chat`), `router/ai.credits.route.js` (`LIA_PACKAGES`), `router/ai.write.route.js`, `models/lia.prompt.js`, `models/ai.orchestrator.js`. Ver la sección "Lia AI" del `CLAUDE.md` del backend.
