import { useEffect, useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import {
    Chart as ChartJS,
    BarElement,
    LinearScale,
    CategoryScale,
    Legend,
    Tooltip as ChartTooltip,
} from 'chart.js'
import { Checkbox, message, Select, Table, Tag } from 'antd'
import dayjs from 'dayjs'
import { fetchSubmittedFeedback } from './feedbackAdminApi'
import styles from './FeedbackAdminPage.module.css'

ChartJS.register(BarElement, LinearScale, CategoryScale, Legend, ChartTooltip)

const STAR_OPTIONS = [1, 2, 3, 4, 5].map(v => ({ value: v, label: `${v} ★` }))

const eventoLabel = (row) => {
    const inv = row.invitations
    return inv?.label || inv?.name || 'Evento'
}

export const FeedbackAdminPage = () => {
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [filterRatings, setFilterRatings] = useState([])
    const [onlyWithComment, setOnlyWithComment] = useState(false)

    const load = async () => {
        setLoading(true)
        try {
            const data = await fetchSubmittedFeedback()
            setRows(data)
        } catch (err) {
            console.error('Error al cargar feedback:', err)
            message.error('No se pudo cargar el feedback')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const kpis = useMemo(() => {
        const total = rows.length
        const avg = total ? rows.reduce((sum, r) => sum + (r.rating || 0), 0) / total : 0
        const withComment = rows.filter(r => r.comment && r.comment.trim().length > 0).length
        const pctWithComment = total ? (withComment / total) * 100 : 0
        return { total, avg, pctWithComment }
    }, [rows])

    const distribution = useMemo(() => {
        const counts = [0, 0, 0, 0, 0]
        rows.forEach(r => {
            if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1] += 1
        })
        return counts
    }, [rows])

    const filteredRows = useMemo(() => rows.filter(r => {
        if (filterRatings.length && !filterRatings.includes(r.rating)) return false
        if (onlyWithComment && !(r.comment && r.comment.trim().length > 0)) return false
        return true
    }), [rows, filterRatings, onlyWithComment])

    const columns = [
        { title: 'Evento', key: 'evento', render: (_, row) => eventoLabel(row) },
        {
            title: '★ Rating', dataIndex: 'rating', key: 'rating', align: 'center', width: 100,
            sorter: (a, b) => (a.rating || 0) - (b.rating || 0),
            render: (rating) => <Tag color="purple">{rating} ★</Tag>,
        },
        {
            title: 'Comentario', dataIndex: 'comment', key: 'comment',
            render: (comment) => comment ? <span>{comment}</span> : <span className={styles.noComment}>—</span>,
        },
        {
            title: 'Fecha', dataIndex: 'submitted_at', key: 'submitted_at', width: 140,
            sorter: (a, b) => new Date(a.submitted_at) - new Date(b.submitted_at),
            defaultSortOrder: 'descend',
            render: (date) => dayjs(date).format('DD MMM YYYY'),
        },
    ]

    return (
        <div className={styles.page}>
            <div className={styles.headerRow}>
                <div>
                    <div className={styles.title}>Feedback de eventos</div>
                    <div className={styles.subtitle}>Reviews dejadas por organizadores desde el dashboard</div>
                </div>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Promedio general</div>
                    <div className={styles.statValue}>{kpis.avg.toFixed(1)} ★</div>
                    <div className={styles.statSub}>sobre {kpis.total} respuestas</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total de respuestas</div>
                    <div className={styles.statValue}>{kpis.total}</div>
                    <div className={styles.statSub}>eventos que dejaron feedback</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Con comentario</div>
                    <div className={styles.statValue}>{kpis.pctWithComment.toFixed(0)}%</div>
                    <div className={styles.statSub}>feedback cualitativo real</div>
                </div>
            </div>

            <div className={styles.chartHeader}>
                <div className={styles.chartTitle}>Distribución de estrellas</div>
            </div>
            <div className={styles.chartWrapper}>
                <Bar
                    data={{
                        labels: ['1 ★', '2 ★', '3 ★', '4 ★', '5 ★'],
                        datasets: [{
                            label: 'Respuestas',
                            data: distribution,
                            backgroundColor: '#d2bfdd',
                            borderRadius: 6,
                        }],
                    }}
                    options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, ticks: { precision: 0 } },
                        },
                    }}
                />
            </div>

            <div className={styles.filtersRow}>
                <Select
                    mode="multiple"
                    allowClear
                    placeholder="Filtrar por estrellas"
                    value={filterRatings}
                    onChange={setFilterRatings}
                    options={STAR_OPTIONS}
                    style={{ minWidth: 220 }}
                />
                <Checkbox checked={onlyWithComment} onChange={e => setOnlyWithComment(e.target.checked)}>
                    Solo con comentario
                </Checkbox>
            </div>

            <Table
                rowKey="id"
                columns={columns}
                dataSource={filteredRows}
                loading={loading}
                pagination={{ pageSize: 10 }}
            />
        </div>
    )
}
