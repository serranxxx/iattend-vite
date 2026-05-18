import React from 'react'
import './legal-page.css'

import { LuArrowLeft } from "react-icons/lu";
import { Button } from 'antd'
import { useNavigate } from 'react-router-dom';

export const LegalPage = () => {
    const navigate = useNavigate();
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%'
        }}>
            <div className='legal-main-container'>

                <Button onClick={() => navigate(-1)} style={{
                    position: 'absolute', top: '36px',
                    left: '36px'
                }} icon={<LuArrowLeft size={18} />} className='primarybutton--active' />

                <h1>AVISO DE PRIVACIDAD</h1>

                <h3>Responsable del Tratamiento de los Datos Personales</h3>
                <h4>
                    <b>LUIS ALBERTO SERRANO GARCÍA</b>, titular de la plataforma digital <b>I attend</b>, disponible en <b>www.I attend.mx</b> e <b>I attend.events</b> (en lo sucesivo, "I attend"), con domicilio en Chihuahua, Chihuahua, C.P. 31130, en cumplimiento con la <b>Ley Federal de Protección de Datos Personales en Posesión de los Particulares</b> (en adelante la "Ley") y su Reglamento, se presenta como responsable del tratamiento de los datos personales que usted proporciona a través de nuestra plataforma.
                </h4>

                <h3>¿Qué es I attend?</h3>
                <h4>
                    I attend es una plataforma digital de gestión de eventos e invitaciones. A través de ella, los usuarios pueden crear y personalizar invitaciones digitales, administrar listas de invitados, gestionar confirmaciones de asistencia, generar pases digitales con código QR, organizar mesas y distribución de lugares, y coordinar múltiples eventos o sub-eventos. La plataforma está orientada principalmente a bodas y celebraciones sociales en México y Latinoamérica.
                </h4>

                <h3>1. ¿PARA QUÉ FINES UTILIZAREMOS SUS DATOS PERSONALES?</h3>
                <h4>Los datos personales que recabamos serán utilizados para las siguientes finalidades <b>necesarias</b> para la prestación del servicio:</h4>
                <ul>
                    <li>Crear y administrar su cuenta de usuario en la plataforma I attend.</li>
                    <li>Procesar la contratación de los planes disponibles (Paperless, Lite o Pro).</li>
                    <li>Proveer acceso a las funciones de la plataforma: creación de invitaciones digitales, gestión de invitados, distribución de lugares, pases digitales con QR, y sub-eventos.</li>
                    <li>Gestionar las confirmaciones de asistencia (RSVP) de sus invitados.</li>
                    <li>Enviar notificaciones y actualizaciones relacionadas con su evento y los servicios adquiridos.</li>
                    <li>Emitir comprobantes de pago o facturas cuando sean solicitados.</li>
                    <li>Atender solicitudes de soporte técnico y aclaraciones sobre su cuenta o pedido.</li>
                    <li>Agendar reuniones de seguimiento o asesoría relacionadas con su evento.</li>
                </ul>
                <h4>De manera <b>secundaria</b>, y solo con su consentimiento, podremos utilizar sus datos para:</h4>
                <ul>
                    <li>Enviarle información sobre nuevas funcionalidades, planes o promociones de I attend.</li>
                    <li>Realizar encuestas de satisfacción para mejorar nuestros servicios.</li>
                </ul>
                <h4>Si usted no desea que sus datos sean utilizados para las finalidades secundarias, puede indicarlo enviando un correo a <b>contacto.I attend@gmail.com</b>. La negativa no afectará la prestación del servicio contratado.</h4>

                <h3>2. ¿QUÉ DATOS PERSONALES UTILIZAREMOS PARA ESTOS FINES?</h3>
                <h4>Para llevar a cabo las finalidades descritas, recabaremos los siguientes datos personales:</h4>
                <h4><b>Del titular de la cuenta (organizador del evento):</b></h4>
                <ul>
                    <li>Nombre completo.</li>
                    <li>Correo electrónico.</li>
                    <li>Número de teléfono celular.</li>
                    <li>Contraseña (almacenada de forma cifrada).</li>
                    <li>Datos de facturación: RFC, razón social o nombre fiscal, dirección fiscal (cuando se requiera comprobante fiscal).</li>
                    <li>Información de transacciones: monto pagado, fecha y referencia del pago.</li>
                </ul>
                <h4><b>Relacionados con el evento y los invitados:</b></h4>
                <ul>
                    <li>Nombre del evento, fecha, lugar y detalles logísticos del mismo.</li>
                    <li>Nombre, teléfono y/o correo electrónico de los invitados (proporcionados por el organizador).</li>
                    <li>Confirmaciones de asistencia y preferencias de los invitados.</li>
                    <li>Distribución de asientos o mesas.</li>
                    <li>Información de sub-eventos y sus respectivos asistentes.</li>
                </ul>
                <h4><b>Datos de uso y técnicos:</b></h4>
                <ul>
                    <li>Dirección IP y datos del dispositivo o navegador utilizado.</li>
                    <li>Registro de actividad dentro de la plataforma (páginas visitadas, acciones realizadas).</li>
                    <li>Información recopilada a través de cookies y tecnologías similares (ver sección 7).</li>
                </ul>
                <h4>I attend <b>no recaba datos personales sensibles</b> (datos de salud, biométricos, ideología política, creencias religiosas, etc.).</h4>

                <h3>3. TRANSFERENCIA DE INFORMACIÓN PERSONAL CON TERCEROS</h3>
                <h4>Nos comprometemos a no transferir su información personal a terceros sin su consentimiento, salvo en los casos previstos en el Artículo 37 de la Ley. Para el funcionamiento técnico de la plataforma, sus datos podrán ser procesados por los siguientes proveedores tecnológicos bajo acuerdos de confidencialidad:</h4>
                <ul>
                    <li><b>Supabase Inc.</b> — Proveedor de base de datos, autenticación y almacenamiento en la nube donde se alojan los datos de la plataforma.</li>
                    <li><b>Stripe Inc.</b> — Procesador de pagos. Los datos de tarjetas bancarias son manejados directamente por Stripe y no son almacenados por I attend.</li>
                    <li><b>OpenAI LLC</b> — Proveedor de inteligencia artificial utilizado para funcionalidades de asistencia dentro de la plataforma.</li>
                    <li><b>Proveedores de servicios de correo electrónico y mensajería</b> — Utilizados para el envío de notificaciones y confirmaciones a invitados.</li>
                </ul>
                <h4>Asimismo, sus datos podrán ser compartidos con autoridades competentes cuando así lo exija la ley mexicana o un mandato judicial.</h4>
                <h4>Si usted no manifiesta su oposición a dichas transferencias, se entenderá que otorga su consentimiento conforme a lo establecido en la Ley.</h4>

                <h3>4. ¿CÓMO PUEDE ACCEDER, RECTIFICAR, CANCELAR SUS DATOS PERSONALES Y/U OPONERSE A SU USO? (Derechos ARCO)</h3>
                <h4>Usted tiene derecho a:</h4>
                <ul>
                    <li><b>Acceder</b> a sus datos personales y conocer el uso que les damos.</li>
                    <li><b>Rectificar</b> sus datos cuando sean inexactos, incompletos o estén desactualizados.</li>
                    <li><b>Cancelar</b> sus datos cuando no sean necesarios para las finalidades del servicio o haya concluido la relación contractual.</li>
                    <li><b>Oponerse</b> al tratamiento de sus datos para finalidades específicas.</li>
                </ul>
                <h4>Para ejercer cualquiera de estos derechos ARCO, envíe su solicitud al correo electrónico: <b>contacto.I attend@gmail.com</b> con el asunto "Solicitud ARCO". La solicitud deberá incluir:</h4>
                <ul>
                    <li>Su nombre completo y correo electrónico registrado en I attend.</li>
                    <li>Una descripción clara y precisa de los datos sobre los que desea ejercer su derecho.</li>
                    <li>Documento que acredite su identidad (INE, pasaporte u otro documento oficial).</li>
                    <li>Cualquier otro elemento que facilite la localización de sus datos.</li>
                </ul>
                <h4>Daremos respuesta a su solicitud en un plazo máximo de <b>20 días hábiles</b> a partir de su recepción.</h4>

                <h3>5. ¿CÓMO PUEDE LIMITAR EL USO O DIVULGACIÓN DE SU INFORMACIÓN PERSONAL?</h3>
                <h4>Para limitar el uso o divulgación de su información personal puede:</h4>
                <ul>
                    <li>Enviar un correo a <b>contacto.I attend@gmail.com</b> indicando de manera específica su solicitud.</li>
                    <li>Configurar las preferencias de notificaciones desde su cuenta dentro de la plataforma.</li>
                    <li>Solicitar la eliminación de su cuenta, lo que implicará la eliminación de sus datos personales, salvo aquellos que deban conservarse por obligaciones legales o fiscales.</li>
                </ul>

                <h3>6. RETENCIÓN Y ELIMINACIÓN DE DATOS</h3>
                <h4>Sus datos personales serán conservados durante el tiempo que su cuenta permanezca activa y mientras exista una relación contractual vigente con I attend. Una vez concluida dicha relación, los datos serán eliminados o anonimizados en un plazo no mayor a <b>90 días naturales</b>, salvo que exista una obligación legal que requiera su conservación por un período mayor (por ejemplo, datos de facturación conforme a la legislación fiscal mexicana).</h4>

                <h3>7. USO DE COOKIES Y TECNOLOGÍAS DE RASTREO</h3>
                <h4>I attend utiliza cookies y tecnologías similares para:</h4>
                <ul>
                    <li>Mantener su sesión activa dentro de la plataforma.</li>
                    <li>Recordar sus preferencias de uso.</li>
                    <li>Analizar el tráfico y el comportamiento de los usuarios con fines de mejora del servicio.</li>
                </ul>
                <h4>Usted puede configurar su navegador para rechazar o eliminar cookies. Sin embargo, deshabilitar las cookies esenciales puede afectar el funcionamiento correcto de la plataforma.</h4>

                <h3>8. MEDIDAS DE SEGURIDAD</h3>
                <h4>I attend implementa medidas técnicas, administrativas y físicas para proteger sus datos personales contra acceso no autorizado, pérdida, alteración o divulgación indebida. Entre estas medidas se incluyen: cifrado de contraseñas, conexiones seguras (HTTPS), autenticación de usuarios y control de acceso a los datos almacenados.</h4>

                <h3>9. ¿CÓMO PUEDE CONOCER LOS CAMBIOS EN ESTE AVISO DE PRIVACIDAD?</h3>
                <h4>Este aviso de privacidad puede ser modificado para cumplir con cambios en la legislación, en nuestras prácticas internas o en nuestro modelo de negocio. Le notificaremos sobre cualquier modificación relevante a través de:</h4>
                <ul>
                    <li>Nuestro sitio web: <b>www.I attend.mx</b></li>
                    <li>Un aviso dentro de la plataforma al iniciar sesión.</li>
                    <li>Correo electrónico a la dirección registrada en su cuenta.</li>
                </ul>
                <h4>Le recomendamos revisar periódicamente este aviso para mantenerse informado sobre cómo protegemos su información.</h4>

                <h4><b>Última actualización:</b> 18 de mayo de 2026.</h4>
            </div>
        </div>
    )
}
