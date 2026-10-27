import { useEffect, useMemo, useRef, useState } from 'react'
import { Input, Select, Switch, Tooltip, message } from 'antd'
import { ArrowDown, ArrowUp, Eye, EyeOff, Info, Plus, Trash2, X } from 'lucide-react'
import {
    createReminderTemplate, deleteReminderTemplate, fetchReminderTemplates,
    reorderReminderTemplates, updateReminderTemplate,
} from '../reminderTemplatesAdminApi'
import {
    DEFAULT_BUTTON_URL, DEFAULT_BUTTON_VARIABLE, IMAGE_VARIABLE_KEYS, REMINDER_VARIABLES, RULE_FIELDS, SEGMENTS,
    TEXT_VARIABLE_KEYS, bodyParts,
} from '../../../modules/GuestManagement/Reminders/reminderVariables'
// Mismo layout que el editor de Onboarding (lista + editor + vista previa).
import styles from './OnboardingSection.module.css'
import { WhatsappBubble } from '../../../modules/GuestManagement/Reminders/WhatsappBubble'
import own from './RecordatoriosSection.module.css'

// Banco de recordatorios (`reminder_templates`): las plantillas de WhatsApp
// que el organizador puede mandar desde Guest management → Recordatorios.
// Cada {{n}} del texto se mapea a un dato de REMINDER_VARIABLES. Las
// solicitudes de recordatorios nuevos llegan a Buzón → Reportes. Ver
// docs/recordatorios.md.

const CAMPOS = [
    'slug', 'meta_name', 'language_code', 'name', 'description', 'body', 'footer', 'header_image_variable', 'body_variables',
    'button_label', 'button_url', 'button_variable', 'suggestion', 'is_active',
]

const vacioDe = (campo) => (
    campo === 'is_active' ? false
        : campo === 'body_variables' ? []
            : campo === 'suggestion' ? {}
                : null
)
const valorDe = (tpl, campo) => tpl[campo] ?? vacioDe(campo)
const borradorDe = (tpl) => Object.fromEntries(CAMPOS.map(c => [c, valorDe(tpl, c)]))

const contarVariables = (body = '') => {
    const numeros = [...String(body ?? '').matchAll(/\{\{(\d+)\}\}/g)].map(m => Number(m[1]))
    return numeros.length ? Math.max(...numeros) : 0
}

const VARIABLE_OPTIONS = TEXT_VARIABLE_KEYS.map(value => ({ value, label: REMINDER_VARIABLES[value].label }))
const IMAGEN_OPTIONS = [
    { value: '', label: 'Sin imagen' },
    ...IMAGE_VARIABLE_KEYS.map(value => ({ value, label: REMINDER_VARIABLES[value].label })),
]
const IDIOMAS = [
    { value: 'es_MX', label: 'Español (México) · es_MX' },
    { value: 'es', label: 'Español · es' },
    { value: 'en_US', label: 'Inglés (EE. UU.) · en_US' },
    { value: 'en', label: 'Inglés · en' },
]
const SEGMENTO_LABEL = {
    todos: 'Todos los invitados',
    esperando: 'Esperando respuesta',
    leyeron: 'Leyeron y no contestaron',
    confirmados: 'Confirmados',
    sinMesa: 'Confirmados sin mesa',
}
const CAMPO_REGLA_LABEL = { state: 'Estado', tag: 'Etiqueta', side: 'Lado', tier: 'Prioridad', table: 'Mesa', read: 'Invitación' }
// Valores fijos por campo; etiqueta y lado dependen de cada evento y se escriben.
const VALORES_REGLA = {
    state: [['esperando', 'Esperando respuesta'], ['confirmado', 'Confirmado'], ['rechazado', 'No asistirá']],
    tier: [['A', 'A'], ['B', 'B'], ['C', 'C'], ['D', 'D']],
    table: [['con', 'Con mesa'], ['sin', 'Sin mesa']],
    read: [['leyo', 'Leyó'], ['no_leyo', 'No leyó']],
}

const Campo = ({ label, ayuda, children }) => (
    <div className={styles.campo}>
        <span>
            {label}
            {ayuda && (
                <Tooltip title={ayuda}>
                    <Info size={12} className={styles.info} />
                </Tooltip>
            )}
        </span>
        {children}
    </div>
)

const VistaPrevia = ({ tpl }) => (
    <WhatsappBubble
        parts={bodyParts(tpl)}
        imageLabel={tpl.header_image_variable ? REMINDER_VARIABLES[tpl.header_image_variable]?.label : null}
        footer={tpl.footer}
        buttonLabel={tpl.button_label}
        emptyText="Escribe el texto del mensaje"
    />
)

const ReglasSugerencia = ({ reglas, onChange }) => {
    const set = (i, cambio) => onChange(reglas.map((r, idx) => {
        if (idx !== i) return r
        const nueva = { ...r, ...cambio }
        if (cambio.field) nueva.value = VALORES_REGLA[cambio.field]?.[0]?.[0] ?? ''
        return nueva
    }))
    return (
        <div className={own.reglas}>
            {reglas.map((r, i) => (
                <div key={i} className={own.regla}>
                    <Select
                        value={r.field}
                        onChange={v => set(i, { field: v })}
                        options={RULE_FIELDS.map(f => ({ value: f, label: CAMPO_REGLA_LABEL[f] }))}
                    />
                    <Select
                        value={r.op}
                        onChange={v => set(i, { op: v })}
                        options={[{ value: 'es', label: 'es' }, { value: 'no', label: 'no es' }]}
                    />
                    {VALORES_REGLA[r.field] ? (
                        <Select
                            value={r.value}
                            onChange={v => set(i, { value: v })}
                            options={VALORES_REGLA[r.field].map(([value, label]) => ({ value, label }))}
                        />
                    ) : (
                        <Input value={r.value} placeholder="Valor exacto" onChange={e => set(i, { value: e.target.value })} />
                    )}
                    <button type="button" className={own.quitar} aria-label="Quitar regla" onClick={() => onChange(reglas.filter((_, idx) => idx !== i))}>
                        <X size={14} />
                    </button>
                </div>
            ))}
            <button type="button" className={styles.agregar} onClick={() => onChange([...reglas, { field: 'state', op: 'no', value: 'rechazado' }])}>
                <Plus size={14} /> Agregar regla
            </button>
        </div>
    )
}

const Editor = ({ tpl, onGuardado, onEliminado }) => {
    const [messageApi, contextHolder] = message.useMessage()
    const [borrador, setBorrador] = useState(() => borradorDe(tpl))
    const [guardando, setGuardando] = useState(false)
    const [confirmarBorrar, setConfirmarBorrar] = useState(false)

    // Si la plantilla cambia desde la lista (prender/apagar), el borrador toma
    // el valor nuevo solo en los campos que no se habían tocado.
    const anteriorRef = useRef(tpl)
    useEffect(() => {
        const anterior = anteriorRef.current
        anteriorRef.current = tpl
        if (anterior === tpl) return
        setBorrador(prev => Object.fromEntries(CAMPOS.map(c => [
            c,
            JSON.stringify(prev[c] ?? vacioDe(c)) === JSON.stringify(valorDe(anterior, c)) ? valorDe(tpl, c) : prev[c],
        ])))
        setConfirmarBorrar(false)
    }, [tpl])

    const cambios = useMemo(() => Object.fromEntries(
        CAMPOS
            .filter(c => JSON.stringify(borrador[c] ?? vacioDe(c)) !== JSON.stringify(valorDe(tpl, c)))
            .map(c => [c, borrador[c]])
    ), [borrador, tpl])
    const sucio = Object.keys(cambios).length > 0
    const set = (campo, valor) => setBorrador(prev => ({ ...prev, [campo]: valor }))

    // Una variable por cada {{n}} del texto: al cambiar el texto la lista se ajusta.
    const totalVariables = contarVariables(borrador.body)
    const variables = Array.from({ length: totalVariables }, (_, i) => borrador.body_variables?.[i] ?? null)
    const setVariable = (i, valor) => {
        const lista = [...variables]
        lista[i] = valor
        set('body_variables', lista)
    }
    useEffect(() => {
        if ((borrador.body_variables ?? []).length !== totalVariables) set('body_variables', variables)
    }, [totalVariables])

    const urlConVariable = /\{\{1\}\}/.test(borrador.button_url ?? '')
    const sugerencia = borrador.suggestion ?? {}
    const setSugerencia = (cambio) => set('suggestion', { ...sugerencia, ...cambio })

    const guardar = async () => {
        if (variables.some(v => !v)) return messageApi.warning('Asigna un dato a cada {{n}} del texto')
        if (urlConVariable && !borrador.button_variable) return messageApi.warning('La URL del botón tiene {{1}}: asígnale un dato')

        setGuardando(true)
        try {
            const { data } = await updateReminderTemplate(tpl.id, { ...cambios, body_variables: variables })
            onGuardado(data.template)
            messageApi.success('Recordatorio guardado')
        } catch (error) {
            messageApi.error(error?.response?.data?.msg || 'No se pudo guardar el recordatorio')
        } finally {
            setGuardando(false)
        }
    }

    const borrar = async () => {
        try {
            await deleteReminderTemplate(tpl.id)
            onEliminado(tpl.id)
        } catch (error) {
            messageApi.error(error?.response?.data?.msg || 'No se pudo borrar el recordatorio')
        }
    }

    return (
        <div className={styles.editorShell}>
            {contextHolder}

            <div className={styles.editor}>
                <section className={styles.bloque}>
                    <div className={styles.bloqueHead}>
                        <span className={styles.bloqueTitulo}>Recordatorio</span>
                        <label className={styles.switchInline}>
                            <span>{borrador.is_active ? 'Disponible en el banco' : 'Apagado'}</span>
                            <Switch checked={!!borrador.is_active} onChange={v => set('is_active', v)} />
                        </label>
                    </div>

                    <Campo label="Nombre" ayuda="Lo que ve el organizador en el banco de recordatorios.">
                        <Input value={borrador.name ?? ''} onChange={e => set('name', e.target.value)} />
                    </Campo>
                    <Campo label="Descripción" ayuda="Para quién o para qué sirve. Va debajo del nombre.">
                        <Input value={borrador.description ?? ''} onChange={e => set('description', e.target.value)} />
                    </Campo>

                    <div className={styles.dosColumnas}>
                        <Campo label="Nombre de la plantilla en Meta" ayuda="Exactamente como aparece en WhatsApp Manager.">
                            <Input className={styles.mono} value={borrador.meta_name ?? ''} onChange={e => set('meta_name', e.target.value)} />
                        </Campo>
                        <Campo label="Idioma">
                            <Select value={borrador.language_code ?? 'es_MX'} onChange={v => set('language_code', v)} options={IDIOMAS} />
                        </Campo>
                    </div>

                    <Campo label="Llave" ayuda="Identificador interno (minúsculas, números, - y _). Los atajos de la app lo usan: el botón de Seguimiento abre 'confirma-asistencia'.">
                        <Input className={styles.mono} value={borrador.slug ?? ''} onChange={e => set('slug', e.target.value)} />
                    </Campo>
                </section>

                <section className={styles.bloque}>
                    <span className={styles.bloqueTitulo}>Mensaje</span>

                    <Campo label="Texto" ayuda="Pega el cuerpo tal como se aprobó en Meta, con sus {{1}}, {{2}}… y sus *negritas*. Solo se usa para la vista previa: lo que sale es la plantilla de Meta.">
                        <Input.TextArea value={borrador.body ?? ''} autoSize={{ minRows: 4, maxRows: 10 }} onChange={e => set('body', e.target.value)} />
                    </Campo>

                    <Campo label="Imagen de encabezado" ayuda="Si la plantilla de Meta tiene encabezado de imagen. Cada evento manda la suya.">
                        <Select
                            value={borrador.header_image_variable ?? ''}
                            onChange={v => set('header_image_variable', v || null)}
                            options={IMAGEN_OPTIONS}
                        />
                    </Campo>

                    <Campo label="Pie" ayuda="El texto gris debajo del mensaje en la plantilla de Meta. Vacío = sin pie.">
                        <Input value={borrador.footer ?? ''} placeholder="I attend - Your event, handled." onChange={e => set('footer', e.target.value)} />
                    </Campo>

                    {variables.length > 0 && (
                        <div className={own.variables}>
                            {variables.map((v, i) => (
                                <div key={i} className={own.variable}>
                                    <code>{`{{${i + 1}}}`}</code>
                                    <Select
                                        value={v}
                                        placeholder="¿Qué dato va aquí?"
                                        status={v ? undefined : 'warning'}
                                        onChange={valor => setVariable(i, valor)}
                                        options={VARIABLE_OPTIONS}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className={styles.bloque}>
                    <span className={styles.bloqueTitulo}>Botón (URL)</span>
                    <div className={styles.dosColumnas}>
                        <Campo label="Texto del botón" ayuda="Vacío = la plantilla no tiene botón.">
                            <Input value={borrador.button_label ?? ''} placeholder="Ver invitación" onChange={e => set('button_label', e.target.value)} />
                        </Campo>
                        <Campo label="URL en Meta" ayuda="Tal como está en la plantilla, con su {{1}}. Todos los botones llevan al magic link del invitado: https://www.iattend.events/{{1}} con el dato «Magic link del invitado».">
                            <Input className={styles.mono} value={borrador.button_url ?? ''} placeholder={DEFAULT_BUTTON_URL} onChange={e => set('button_url', e.target.value)} />
                        </Campo>
                    </div>
                    {urlConVariable && (
                        <div className={own.variable}>
                            <code>{'{{1}}'}</code>
                            <Select
                                value={borrador.button_variable}
                                placeholder="¿Qué dato va en la URL?"
                                status={borrador.button_variable ? undefined : 'warning'}
                                onChange={v => set('button_variable', v)}
                                options={VARIABLE_OPTIONS}
                                allowClear
                            />
                        </div>
                    )}
                </section>

                <section className={styles.bloque}>
                    <span className={styles.bloqueTitulo}>Sugerencia de Lia</span>
                    <Campo label="Segmento sugerido" ayuda="Se aplica solo al elegir el recordatorio.">
                        <Select
                            value={sugerencia.segment ?? 'todos'}
                            onChange={v => setSugerencia({ segment: v })}
                            options={SEGMENTS.map(s => ({ value: s, label: SEGMENTO_LABEL[s] }))}
                        />
                    </Campo>
                    <Campo label="Reglas" ayuda="Se combinan con el segmento. Etiqueta y lado dependen de cada evento: escribe el valor exacto.">
                        <ReglasSugerencia reglas={sugerencia.rules ?? []} onChange={rules => setSugerencia({ rules })} />
                    </Campo>
                    {(sugerencia.rules ?? []).length >= 2 && (
                        <Campo label="Combinar reglas">
                            <Select
                                value={sugerencia.comb ?? 'and'}
                                onChange={v => setSugerencia({ comb: v })}
                                options={[{ value: 'and', label: 'Cumplen todas (Y)' }, { value: 'or', label: 'Cumplen alguna (O)' }]}
                            />
                        </Campo>
                    )}
                    <Campo label="Título" ayuda="Vacío = no se muestra la tarjeta de Lia.">
                        <Input value={sugerencia.title ?? ''} placeholder="Leyeron y no contestaron" onChange={e => setSugerencia({ title: e.target.value })} />
                    </Campo>
                    <Campo label="Por qué">
                        <Input value={sugerencia.reason ?? ''} placeholder="Son los más fáciles de convertir: ya vieron la invitación." onChange={e => setSugerencia({ reason: e.target.value })} />
                    </Campo>
                </section>

                <footer className={styles.pie} data-dirty={sucio || undefined}>
                    {confirmarBorrar ? (
                        <span className={styles.confirmar}>
                            ¿Borrar este recordatorio?
                            <button type="button" className={styles.peligro} onClick={borrar}>Sí, borrar</button>
                            <button type="button" className={styles.descartar} onClick={() => setConfirmarBorrar(false)}>No</button>
                        </span>
                    ) : (
                        <button type="button" className={styles.borrar} onClick={() => setConfirmarBorrar(true)}>
                            <Trash2 size={14} /> Borrar
                        </button>
                    )}
                    <span className={styles.pieEstado}>{sucio ? 'Cambios sin guardar' : 'Todo guardado'}</span>
                    <button type="button" className={styles.descartar} disabled={!sucio || guardando} onClick={() => setBorrador(borradorDe(tpl))}>
                        Descartar
                    </button>
                    <button type="button" className={styles.guardar} disabled={!sucio || guardando} onClick={guardar}>
                        {guardando ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                </footer>
            </div>

            <aside className={styles.previewCol}>
                <span className={styles.previewTitulo}>Vista previa</span>
                <VistaPrevia tpl={{ ...borrador, body_variables: variables }} />
                <p className={own.notaPreview}>Con datos de ejemplo. Cada invitado recibe los suyos.</p>
            </aside>
        </div>
    )
}

export const RecordatoriosSection = () => {
    const [messageApi, contextHolder] = message.useMessage()
    const [plantillas, setPlantillas] = useState(null)
    const [error, setError] = useState(null)
    const [activoId, setActivoId] = useState(null)

    useEffect(() => {
        fetchReminderTemplates()
            .then(({ data }) => {
                setPlantillas(data.templates ?? [])
                setActivoId(data.templates?.[0]?.id ?? null)
            })
            .catch(err => setError(err?.response?.data?.msg || 'No se pudieron cargar los recordatorios'))
    }, [])

    if (error) return <div className={styles.vacio}>{error}</div>
    if (!plantillas) return <div className={styles.vacio}>Cargando recordatorios…</div>

    const activo = plantillas.find(p => p.id === activoId) ?? plantillas[0]
    const reemplazar = (actualizada) => setPlantillas(prev => prev.map(p => (p.id === actualizada.id ? actualizada : p)))

    const eliminar = (id) => {
        const resto = plantillas.filter(p => p.id !== id)
        setPlantillas(resto)
        setActivoId(resto[0]?.id ?? null)
    }

    // El orden se guarda al momento: es una sola acción, no un borrador.
    const mover = async (index, delta) => {
        const destino = index + delta
        if (destino < 0 || destino >= plantillas.length) return
        const lista = [...plantillas]
        ;[lista[index], lista[destino]] = [lista[destino], lista[index]]
        setPlantillas(lista)
        try {
            await reorderReminderTemplates(lista.map(p => p.id))
        } catch (err) {
            messageApi.error(err?.response?.data?.msg || 'No se pudo guardar el orden')
        }
    }

    const alternarActivo = async (tpl) => {
        try {
            const { data } = await updateReminderTemplate(tpl.id, { is_active: !tpl.is_active })
            reemplazar(data.template)
        } catch (err) {
            messageApi.error(err?.response?.data?.msg || 'No se pudo cambiar la disponibilidad')
        }
    }

    const crear = async () => {
        try {
            const { data } = await createReminderTemplate({
                slug: `nuevo-${Date.now().toString(36)}`,
                meta_name: 'nombre_en_meta',
                language_code: 'es_MX',
                name: 'Nuevo recordatorio',
                body: 'Hola {{1}}, …',
                body_variables: ['guest_name'],
                footer: 'I attend - Your event, handled.',
                button_label: 'Ver invitación',
                button_url: DEFAULT_BUTTON_URL,
                button_variable: DEFAULT_BUTTON_VARIABLE,
                is_active: false,
            })
            setPlantillas(prev => [...prev, data.template])
            setActivoId(data.template.id)
            messageApi.success('Recordatorio creado apagado: complétalo y préndelo cuando Meta lo apruebe')
        } catch (err) {
            messageApi.error(err?.response?.data?.msg || 'No se pudo crear el recordatorio')
        }
    }

    const disponibles = plantillas.filter(p => p.is_active)

    return (
        <div className={styles.onboarding}>
            {contextHolder}

            <div className={styles.barra}>
                <p>
                    {disponibles.length} de {plantillas.length} recordatorios disponibles en
                    <b> Gestión de invitados → Recordatorios</b>. Las solicitudes de recordatorios nuevos llegan a
                    <b> Buzón → Reportes</b>.
                </p>
            </div>

            <div className={styles.layout}>
                <nav className={styles.lista}>
                    {plantillas.map((tpl, index) => (
                        <div
                            key={tpl.id}
                            className={`${styles.item} ${tpl.id === activo?.id ? styles.itemActivo : ''} ${tpl.is_active ? '' : styles.itemOculto}`}
                        >
                            <button type="button" className={styles.itemCuerpo} onClick={() => setActivoId(tpl.id)}>
                                <span className={styles.itemNumero}>{index + 1}</span>
                                <span className={styles.itemTexto}>
                                    <b>{tpl.name}</b>
                                    <small>{tpl.meta_name}</small>
                                </span>
                            </button>
                            <span className={styles.itemAcciones}>
                                <Tooltip title={tpl.is_active ? 'Apagar' : 'Prender'}>
                                    <button type="button" aria-label={tpl.is_active ? 'Apagar' : 'Prender'} onClick={() => alternarActivo(tpl)}>
                                        {tpl.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                                    </button>
                                </Tooltip>
                                <button type="button" aria-label="Subir" onClick={() => mover(index, -1)}><ArrowUp size={14} /></button>
                                <button type="button" aria-label="Bajar" onClick={() => mover(index, 1)}><ArrowDown size={14} /></button>
                            </span>
                        </div>
                    ))}

                    <button type="button" className={styles.agregar} onClick={crear}>
                        <Plus size={14} /> Nuevo recordatorio
                    </button>
                </nav>

                {activo
                    ? <Editor key={activo.id} tpl={activo} onGuardado={reemplazar} onEliminado={eliminar} />
                    : <div className={styles.vacio}>No hay recordatorios. Crea uno para empezar.</div>}
            </div>
        </div>
    )
}
