import { useEffect, useMemo, useState } from 'react'
import { Button, Table, message } from 'antd'
import { MessageCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import styles from '../SalesAdminPage.module.css'

export const ColaboradoresLeads = () => {
    const [colaboradores, setColaboradores] = useState(null)

    const getColaboradores = async () => {
        const { data, error } = await supabase
            .from('colaboradores_interesados')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) console.error('Error al obtener colaboradores:', error);
        else setColaboradores(data);
    };

    const toggleColaboradorField = async (id, field, currentValue) => {
        const update = { [field]: !currentValue };
        if (field === 'contactado' && !currentValue) update.fecha_contacto = new Date().toISOString();
        const { error } = await supabase
            .from('colaboradores_interesados')
            .update(update)
            .eq('id', id);
        if (error) { message.error('Error al actualizar'); return; }
        setColaboradores(prev => prev.map(c => c.id === id ? { ...c, ...update } : c));
    };

    useEffect(() => {
        getColaboradores()
    }, [])

    const colaboradoresCols = useMemo(() => [
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            fixed: 'left',
        },
        {
            title: 'WhatsApp',
            dataIndex: 'telefono',
            key: 'telefono',
            render: (text) => {
                const digits = text.replace(/\D/g, '');
                const wa = digits.startsWith('52') ? digits : `52${digits}`;
                return (
                    <a href={`https://wa.me/${wa}`} target='_blank' rel='noopener noreferrer'>
                        <Button icon={<MessageCircle size={13} />} size='small'>{text}</Button>
                    </a>
                );
            },
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Ubicación',
            key: 'ubicacion',
            render: (_, r) => <span>{r.estado}, {r.pais}</span>,
        },
        {
            title: 'Cómo nos conoció',
            dataIndex: 'como_nos_conocio',
            key: 'como_nos_conocio',
            render: text => text || '—',
        },
        {
            title: 'Fecha',
            dataIndex: 'created_at',
            key: 'created_at',
            render: text => text?.slice(0, 10),
        },
        {
            title: 'Contactado',
            dataIndex: 'contactado',
            key: 'contactado',
            render: (val, record) => (
                <Button
                    size='small'
                    type={val ? 'primary' : 'default'}
                    onClick={() => toggleColaboradorField(record.id, 'contactado', val)}
                    style={val ? { backgroundColor: '#52c41a', borderColor: '#52c41a' } : {}}
                >
                    {val ? '✓ Sí' : 'No'}
                </Button>
            ),
        },
        {
            title: 'Aceptó',
            dataIndex: 'acepto',
            key: 'acepto',
            render: (val, record) => (
                <Button
                    size='small'
                    type={val ? 'primary' : 'default'}
                    onClick={() => toggleColaboradorField(record.id, 'acepto', val)}
                    style={val ? { backgroundColor: '#722ed1', borderColor: '#722ed1' } : {}}
                >
                    {val ? '✓ Sí' : 'No'}
                </Button>
            ),
        },
    ], [colaboradores]);

    return (
        <div>
            <div className={styles.tableLabel}>Colaboradores ({colaboradores?.length ?? 0})</div>
            <Table
                rowKey="id"
                columns={colaboradoresCols}
                dataSource={colaboradores}
                pagination={false}
                scroll={{ x: true }}
            />
        </div>
    )
}
