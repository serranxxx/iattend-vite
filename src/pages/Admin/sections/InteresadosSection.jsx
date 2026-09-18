/*
  Interesados en colaborar, con el mismo formato de tabla que Eventos y Ventas:
  una rejilla CSS dentro de una tarjeta, no un `<Table>` de Ant Design. Las tres
  pantallas comparten el mismo lenguaje visual y el mismo comportamiento de
  scroll horizontal en pantallas chicas.
*/

import { useEffect, useState } from 'react'
import { message } from 'antd'
import { Check, MessageCircle, X } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { supabase } from '../../../lib/supabase'
import styles from './VentasSection.module.css'

dayjs.locale('es')

const numeroDeWhatsapp = (telefono) => {
    const digitos = String(telefono ?? '').replace(/\D/g, '')
    if (!digitos) return null
    return digitos.startsWith('52') ? digitos : `52${digitos}`
}

export const InteresadosSection = () => {
    // La tabla sigue siendo `colaboradores_interesados`; la pantalla se llama
    // Interesados, que es lo que son hasta que aceptan.
    const [colaboradores, setColaboradores] = useState(null)

    const cargar = async () => {
        const { data, error } = await supabase
            .from('colaboradores_interesados')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error al obtener colaboradores:', error)
            setColaboradores([])
            return
        }

        setColaboradores(data)
    }

    useEffect(() => { cargar() }, [])

    // `contactado` y `acepto` se alternan en la fila. El estado local se mueve
    // primero para que el clic responda sin esperar al viaje de red.
    const alternar = async (id, campo, valorActual) => {
        const cambio = { [campo]: !valorActual }
        if (campo === 'contactado' && !valorActual) cambio.fecha_contacto = new Date().toISOString()

        setColaboradores(previos => previos.map(c => (c.id === id ? { ...c, ...cambio } : c)))

        const { error } = await supabase
            .from('colaboradores_interesados')
            .update(cambio)
            .eq('id', id)

        if (error) {
            message.error('No se pudo actualizar')
            setColaboradores(previos => previos.map(c => (c.id === id ? { ...c, [campo]: valorActual } : c)))
        }
    }

    // `encendido` permite darle un color distinto a cada columna: contactado en
    // verde, aceptado en morado.
    const marca = (valor, onClick, etiqueta, encendido = styles.marcaBtnVerde) => (
        <button
            type='button'
            className={`${styles.marcaBtn} ${valor ? encendido : ''}`}
            onClick={onClick}
            aria-label={etiqueta}
        >
            {valor ? <Check size={13} /> : <X size={13} />}
            {valor ? 'sí' : 'no'}
        </button>
    )

    return (
        <div className={styles.tableCard}>
            <div className={styles.tableHead}>
                <span className={styles.tableTitle}>
                    Interesados {colaboradores ? `(${colaboradores.length})` : ''}
                </span>
            </div>

            {colaboradores === null ? (
                <div className={styles.empty}>Cargando colaboradores…</div>
            ) : colaboradores.length === 0 ? (
                <div className={styles.empty}>Todavía nadie ha dejado sus datos.</div>
            ) : (
                <div className={styles.scroller}>
                    <div className={`${styles.table} ${styles.tablaColaboradores}`}>
                        <div className={`${styles.row} ${styles.rowHead}`}>
                            <span className={styles.cell}>Nombre</span>
                            <span className={styles.cell}>WhatsApp</span>
                            <span className={styles.cell}>Correo</span>
                            <span className={styles.cell}>Ubicación</span>
                            <span className={styles.cell}>Cómo nos conoció</span>
                            <span className={styles.cell}>Fecha</span>
                            <span className={styles.cell}>Contactado</span>
                            <span className={styles.cell}>Aceptó</span>
                        </div>

                        {colaboradores.map(colaborador => {
                            const whatsapp = numeroDeWhatsapp(colaborador.telefono)

                            return (
                                <div className={styles.row} key={colaborador.id}>
                                    <span className={`${styles.cell} ${styles.evento}`}>{colaborador.nombre}</span>

                                    <span className={styles.cell}>
                                        {whatsapp ? (
                                            <a
                                                className={styles.enlaceWa}
                                                href={`https://wa.me/${whatsapp}`}
                                                target='_blank'
                                                rel='noopener noreferrer'
                                            >
                                                <MessageCircle size={13} />
                                                {colaborador.telefono}
                                            </a>
                                        ) : '—'}
                                    </span>

                                    <span className={`${styles.cell} ${styles.celdaTenue}`}>
                                        {colaborador.email || '—'}
                                    </span>

                                    <span className={styles.cell}>
                                        {[colaborador.estado, colaborador.pais].filter(Boolean).join(', ') || '—'}
                                    </span>

                                    <span className={`${styles.cell} ${styles.celdaTenue}`}>
                                        {colaborador.como_nos_conocio || '—'}
                                    </span>

                                    <span className={`${styles.cell} ${styles.celdaTenue}`}>
                                        {colaborador.created_at ? dayjs(colaborador.created_at).format('D MMM YY') : '—'}
                                    </span>

                                    <span className={styles.cell}>
                                        {marca(
                                            colaborador.contactado,
                                            () => alternar(colaborador.id, 'contactado', colaborador.contactado),
                                            `Marcar contactado a ${colaborador.nombre}`,
                                        )}
                                    </span>

                                    <span className={styles.cell}>
                                        {marca(
                                            colaborador.acepto,
                                            () => alternar(colaborador.id, 'acepto', colaborador.acepto),
                                            `Marcar aceptado a ${colaborador.nombre}`,
                                            styles.marcaBtnMorado,
                                        )}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
