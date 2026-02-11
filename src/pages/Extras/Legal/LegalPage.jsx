import React from 'react'
import './legal-page.css'

import { LuArrowLeft } from "react-icons/lu";
import { Button } from 'antd'
import { useNavigate } from 'react-router-dom';

export const LegalPage = () => {
    const navigate = useNavigate();
    return (
        <div style={{
            display:'flex', alignItems:'center', justifyContent:'center', width:'100%'
        }}>
            <div className='legal-main-container'>

                {/* <div className='legal-logo-cont'>
                    <img src={logo} alt='' />
                </div> */}

                <Button onClick={() => navigate(-1)} style={{
                    position: 'absolute', top: '36px',
                    left: '36px'
                }} icon={<LuArrowLeft size={18} />} className='primarybutton--active' />

                <h1>AVISO DE PRIVACIDAD</h1>
                <h3>Responsable del Tratamiento de los Datos Personales</h3>
                <h4>LUIS ALBERTO SERRANO GARCÍA, titular del sitio web www.iattend.mx (en lo sucesivo, “IATTEND”), con domicilio en Chihuahua, Chih C.P. 31130, en cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (en adelante la “Ley”), se presenta como responsable del tratamiento de los datos personales que usted proporciona.</h4>
                <h3>1. ¿PARA QUÉ FINES UTILIZAREMOS SUS DATOS PERSONALES?</h3>
                <h4> Los datos personales que recabamos de usted serán utilizados para las siguientes finalidades necesarias para el servicio que solicita:</h4>
                <ul>
                    <li>Procesar y gestionar pedidos de invitaciones digitales personalizadas.</li>
                    <li>Proveer acceso y administrar usuarios en nuestra plataforma de organización de eventos.</li>
                    <li>Facilitar la gestión de confirmaciones de asistencia y datos relacionados con sus invitados.</li>
                    <li>Dar seguimiento a solicitudes de diseño y aclaraciones relacionadas con su pedido.</li>
                    <li>Emitir comprobantes de pago o facturación.</li>
                    <li>Notificarle sobre cambios en las condiciones del servicio y/o actualizaciones en la plataforma y servicios adquiridos.</li>
                    <li>Informarle sobre el estado que guarda su orden de compra. </li>
                    <li>Agendar reuniones.</li>
                    <li>Para efectuar seguimientos puntuales.</li>
                </ul>
                <h3>2. ¿QUÉ DATOS PERSONALES UTILIZAREMOS PARA ESTOS FINES?</h3>
                <h4>Para llevar a cabo las finalidades descritas, utilizaremos los siguientes datos personales:</h4>
                <ul>
                    <li>Nombre completo.</li>
                    <li>Teléfono celular.</li>
                    <li>Correo electrónico.</li>
                    <li>Datos de identificación (como CURP o RFC, si es necesario para facturación).</li>
                    <li>Datos de contacto.</li>
                    <li>Información sobre transacciones (monto, fecha y comprobante de transferencia).</li>
                    <li>Información de eventos, como listas de invitados, fechas y detalles logísticos proporcionados por el usuario.</li>
                </ul>
                <h3>3. TRANSFERENCIA DE INFORMACIÓN PERSONAL CON TERCEROS</h3>
                <h4> Nos comprometemos a no transferir su información personal a terceros sin su consentimiento, salvo en los casos previstos en el Artículo 37 de la Ley y para las siguientes finalidades:</h4>
                <ul>
                    <li>Con proveedores tecnológicos que apoyen el funcionamiento de la plataforma de invitaciones.</li>
                    <li>Para cumplir obligaciones legales o a solicitud de autoridades competentes.</li>
                </ul>
                <h4>Si usted no manifiesta su oposición para que sus datos personales sean transferidos, se entenderá que existe su consentimiento para ello.</h4>
                <h3>4. ¿CÓMO PUEDE ACCEDER, RECTIFICAR, CANCELAR SUS DATOS PERSONALES Y/U OPONERSE A SU USO?</h3>
                <h4>Usted tiene derecho a:</h4>
                <ul>
                    <li>Acceder a sus datos personales y conocer el uso que les damos (ACCESO).</li>
                    <li>Rectificar sus datos cuando sean inexactos o incompletos (RECTIFICACIÓN).</li>
                    <li>Cancelar sus datos cuando no sean necesarios para las finalidades indicadas (CANCELACIÓN).</li>
                    <li>Oponerse al uso de sus datos para finalidades específicas (OPOSICIÓN).</li>
                </ul>
                <h4>Para ejercer cualquiera de estos derechos ARCO, envíe su solicitud al correo electrónico: contacto.iattend@gmail.com. La solicitud deberá incluir:</h4>
                <ul>
                    <li>Su nombre completo y datos de contacto.</li>
                    <li>Una descripción clara de los datos que desea rectificar, cancelar u oponerse a su uso.</li>
                    <li>Documentación que acredite su identidad.</li>
                </ul>
                <h3>5. ¿CÓMO PUEDE LIMITAR EL USO O DIVULGACIÓN DE SU INFORMACIÓN PERSONAL?</h3>
                <h4> Para limitar el uso o divulgación de su información personal, puede enviar un correo a contacto.iattend@gmail.com, indicando de manera específica su solicitud.</h4>
                <h3>6. ¿CÓMO PUEDE CONOCER LOS CAMBIOS EN ESTE AVISO DE PRIVACIDAD?</h3>
                <h4> Este aviso de privacidad puede ser modificado para cumplir con cambios legales, prácticas internas o por ajustes en nuestro modelo de negocio.
                    Le notificaremos sobre cambios del presente aviso de privacidad, a través de: nuestro sitio web www.iattend.mx, por medio de nuestras redes sociales o por correo electrónico.</h4>
                <h4><b>Última actualización: </b>04 de junio de 2025.</h4>
            </div>
        </div>

    )
}
