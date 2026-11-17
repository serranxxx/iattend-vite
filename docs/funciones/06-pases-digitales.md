# 6. Pases digitales (QR, Apple Wallet y lector de pases)

> Revisado contra el código el 16 de noviembre de 2026. Las notas marcadas **Nota interna** son para el equipo y no deben copiarse al material del cliente.

## Qué es

Tres piezas que trabajan juntas:

1. **El pase del invitado**: una tarjeta con su foto, su nombre, su QR y los datos del evento. Vive dentro de la invitación; no hace falta instalar nada.
2. **Apple Wallet** (opcional): el invitado puede guardar su pase en la app Cartera de su iPhone y recibir avisos.
3. **El lector de pases** (`iattend.site/scanner`): una página web para la entrada del evento que escanea los QR y registra quién llegó.

## Quién lo puede usar

| Pieza | Quién / plan | Dispositivo |
|---|---|---|
| Pase con QR en la **invitación** | Solo plan **PRO**. Lite y Paperless no tienen pase. | Cualquier navegador |
| Pase en un **side event o Pop** ("Ver mi pase") | Cualquier side event o Pop, solo al invitado que ya confirmó | Cualquier navegador |
| Botón **Agregar a Apple Wallet** | Si el organizador no lo apagó | **Solo iPhone, iPad y Mac**. En Android y Windows el botón no aparece. |
| Panel **Pase digital** del editor | El organizador | Computadora y celular |
| **Lector de pases** | Quien tenga el link y la clave de 4 caracteres; no pide cuenta. En la pantalla de Invitados el botón "Lector de pases" está marcado como PRO. | Celular o tablet con cámara |

**No existe Google Wallet.** En Android el invitado ve y muestra su QR desde la página de la invitación.

## El pase del invitado

**En la invitación (PRO):**
- Después de confirmar, en la barra aparece **Pases** con el número de pases.
- Hay **un pase por cada persona que asiste**: el titular y cada acompañante, cada uno con su propio QR. Se deslizan como carrusel ("PASE 1 DE 3").
- Texto: "Muestra el código QR en la entrada el día del evento."
- El pase muestra foto, título, fecha y hora, nombre y mesa.

**En un side event o Pop:**
- Al confirmar, el boleto se abre solo después del confeti. Después se vuelve a abrir con **Ver mi pase**.
- Muestra foto, título, fecha y hora, nombre, "Acceso" (número de personas) y, si el evento tiene formulario, el folio.

## Apple Wallet

**Cómo lo agrega el invitado:**
1. Toca "Agregar a Apple Wallet" en su pase.
2. Si está dentro de WhatsApp o Instagram, el pase no se puede abrir ahí: aparece una ayuda que le pide abrir la página en Safari ("···" → "Abrir en Safari") o copiar el link del pase.

**Qué muestra el pase de Wallet:**
- Al frente: foto grande, logo de I attend, QR, nombre del evento y, en la invitación, la mesa como "asiento" y el nombre del invitado.
- En "Información adicional": invitado, acompañantes confirmados, número de personas, mesa ("Por asignar" si no tiene) y código o folio.
- Al reverso: avisos del evento, cada dirección del itinerario con link a Mapas (hasta 10), itinerario y link a la invitación.
- Aparece en la pantalla bloqueada desde 3 horas antes del evento hasta 12 horas después, y cerca de los lugares del evento. Queda como vencido 2 días después.

**Avisos automáticos al iPhone** (solo a quien tiene el pase en Wallet):
- 7 días antes: "¡Faltan 7 días! Ya queremos celebrar contigo."
- 1 día antes: "¡Mañana es el gran día! Te esperamos."
- El día: "¡Hoy es el día! Nos vemos pronto."
- Al escanear su pase en la entrada: "¡Qué alegría recibirte, {nombre}! Disfruta la celebración." (una sola vez).

Los avisos de cuenta regresiva se mandan entre las 10:00 y las 20:00 (hora de Ciudad de México), una vez cada uno y solo en español. Si el invitado agrega el pase después de un aviso, ese aviso ya no le llega.

**Actualizaciones:** al **publicar** la invitación, los pases que ya están en los iPhone se actualizan solos y sin notificación (foto, título, direcciones, horario).

## Panel "Pase digital" (organizador)

En el editor de la invitación, de los side events y de los Pops:
- **"Ofrecer Apple Wallet"**: apagado, los invitados ven su pase solo en la página, sin botón de Wallet. En un side event o Pop apagarlo también quita "Ver mi pase".
- Simulador del pase con "Frente" y "Detalles".
- **Foto del pase**: cambiarla o usar la de la portada (en un Pop, la imagen del link).
- **Título** (hasta 40 caracteres): también es el título de las notificaciones.
- **Lugar principal** (solo con dos o más direcciones en el itinerario): cuál va como lugar del evento en el pase. Si no se elige, se usa la última dirección.

## Lector de pases (`/scanner`)

**Cómo se entra:**
1. El organizador va a Invitados → menú "⋯" → **Lector de pases** → "Compartir información". Ahí ve la contraseña (4 caracteres) y el link de acceso.
2. Quien esté en la entrada abre `iattend.site/scanner`, elige el evento y escribe la clave. **No necesita cuenta.**
3. Dentro del lector, "Compartir lector" manda el link y la clave a otra persona.

**Qué tiene:**
- Contador "N / total llegaron" con barra de avance.
- Buscador, filtros (Faltan · Llegaron · Todos) y filtro por mesa en tablet.
- Cada fila es un "pase": el titular con sus acompañantes.
- Tema claro u oscuro y sonido.

**Al escanear** (cámara trasera):

| Resultado | Qué significa |
|---|---|
| **Bienvenido** (verde) | Registra la llegada con la hora y muestra la mesa. Si el pase tiene acompañantes, ofrece registrarlos también ("En este pase · entran X de N"). |
| **Este pase ya se usó** (ámbar) | Muestra a qué hora entró: "Verifica su identidad antes de dejarlo pasar." "Permitir entrada" y "No permitir" **solo cierran el aviso**; no registran nada. |
| **Pase no válido** (rojo) | El código no es de este evento. |

**Registrar a mano:** se toca la fila, se marcan las personas y se toca "Registrar llegada". Durante 4.5 segundos aparece **Deshacer**.

**En un Pop**, por ahora la llegada se registra a mano desde la lista del lector; el escaneo del QR de un Pop está en desarrollo.

Varios lectores pueden trabajar a la vez: en una invitación la lista se sincroniza al instante; en un Pop se actualiza cada 5 segundos.

**Por dentro:** "llegó" significa que el invitado pasa al estado "asistente" y se guarda la hora de llegada.

## Límites y requisitos

- Pase con QR en la invitación: solo PRO.
- Apple Wallet: solo dispositivos Apple, abriendo en Safari.
- Lector: cámara, permiso de cámara y **conexión a internet**.

## Lo que NO hace / malentendidos comunes

- **No hay Google Wallet** ni pase para la cartera de Android.
- **El lector no funciona sin internet**: cada llegada se guarda al momento. Si falla, aparece "No se pudo guardar. Revisa tu conexión." y no hay cola para reintentar después.
- **"Permitir entrada" en un pase repetido no registra nada**; solo cierra el aviso.
- **En los Pops todavía no se escanea el QR** (está en desarrollo); la llegada se registra a mano.
- **No hay lector para los side events de una boda**: el lector de la invitación rechaza esos pases ("Este pase es de otro evento").
- **Cambiar la mesa de un invitado no actualiza su pase de Wallet** hasta que se publica la invitación.
- **En side events y Pops, los cambios del pase no llegan a los pases ya instalados.**
- **El organizador no puede mandar un aviso propio al pase**; solo existen los avisos automáticos.
- **En Lite y Paperless el invitado no tiene QR**; el lector solo serviría para registrar a mano.

## Preguntas frecuentes

**¿Mis invitados necesitan una app?** No. El pase está en la invitación. Wallet es opcional.

**¿Funciona en Android?** El QR sí, desde la página. Apple Wallet no, y no hay Google Wallet.

**Le di a "Agregar a Apple Wallet" y salió texto raro.** Se abrió dentro de WhatsApp u otra app. Hay que abrir en Safari.

**¿Cada acompañante tiene su QR?** Sí, en la invitación PRO cada persona que asiste tiene su pase.

**¿Qué pasa si escanean dos veces el mismo QR?** Sale "Este pase ya se usó" con la hora de entrada; no se registra de nuevo.

**¿Quién puede usar el lector?** Cualquiera con el link y la clave de 4 caracteres, sin cuenta.

**¿Puedo quitar el botón de Apple Wallet?** Sí, apagando "Ofrecer Apple Wallet".

## Pendiente de confirmar

1. Que el servicio de actualizaciones y avisos de Apple Wallet esté activo en producción (sin él, el pase funciona pero no recibe avisos ni actualizaciones).

> **Nota interna (en desarrollo):** escanear el QR de un Pop sin sesión falla ("Pase no válido") desde que la base de datos le quitó a los usuarios sin sesión el permiso sobre `side_events_guests`; el selector del lector probablemente ya no lista Pops. El registro a mano sí va por el backend y funciona.

> **Nota interna (posibles errores detectados al revisar el código, para el equipo técnico):**
> - El link `/scanner?id=<id>` de una invitación entra sin pedir la clave.
> - El lector de una invitación no revisa el estado al escanear: un QR de alguien pendiente o que no asistirá quedaría como "asistente".
> - La descarga del pase de Wallet de una invitación no pide el código del invitado (la de side events sí).
> - En "Compartir información", la etiqueta "Usuario" copia la clave en lugar del nombre.
> - La hoja de ayuda de Wallet muestra el "user agent" del navegador (marcado como temporal).

## Referencias técnicas (para soporte)

Pase: iattend-events `components/Invitation/Ticket/`, `components/Invitation/InvitationDock/`, `components/SideEvent/Layout/TicketPop.tsx`. Wallet: backend `services/wallet/`, `controllers/walletServicio.js`, `helpers/walletScheduler.js`. Panel: `src/modules/Editor/WalletPanel.jsx`. Lector: `src/pages/Scanner/`, backend `router/lectorPop.js`.
