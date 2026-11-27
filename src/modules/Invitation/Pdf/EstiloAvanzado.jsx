import { useEffect, useRef, useState } from 'react'
import { Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link2, RotateCcw } from 'lucide-react'
import {
    aManoEn, asignado, colorDe, ESTILOS_BOTON, estiloBotonDe, FORMAS, formaDe, paletaDe, parcheEstiloBoton, parcheForma,
    parcheSlot, parcheSombra, parcheSombraSeccion, pintarBoton, rolPorDefecto, ROLES, SECCIONES, seguirPaleta, SOMBRAS, sombraDe, sombraSeccion,
    tieneAvanzado, tienePaletaPropia, volverAPaleta,
} from './estiloPdf'
import s from './EstiloAvanzado.module.css'

/*
  Diseño → "Edición avanzada" (solo invitación en PDF, escritorio), handoff
  "Editor de Diseño — paleta, forma, estilo de botón y secciones":
  1. Paleta de 4 roles (Base, Superficie, Claro, Acento). Cada color de cada
     sección está enlazado a un rol; cambiar un rol cambia todo lo que lo usa.
  2. Forma y sombra globales.
  3. Estilo de botón global (Sólido, Contorno, Frost, Liquid glass, Sticker,
     Relieve) para dock, confirmar y cerrar.
  4. Por sección (pestañas Dock · Pases · Lia · Editar): cada fila dice de qué
     rol toma el color (chip gris = el de siempre; morado = otro rol; HEX =
     libre) y al abrirla deja elegir un rol u "Otro" (ColoresIOS en el panel
     lateral, usePanelColor). Sombra propia de la sección al pie.
  Reglas y datos (`data.estiloPdf`) en estiloPdf.js. Mientras está abierto, el
  centro del editor enseña el dock para usarlo (MuestrarioCanvas); la pestaña y
  la fila abiertas las lleva EditorWorkspace (tocar la vista previa las cambia).
  Al abrir un color este panel se desmonta: el scroll se guarda y se repone.
*/

const CLAVE_VOLVER = 'iattend_pdf_estilo_volver'

const Segmentado = ({ opciones, valor, onElegir, chico = false, etiqueta }) => (
    <div className={s.segmentado} data-chico={chico || undefined} role="radiogroup" aria-label={etiqueta}>
        {opciones.map(([v, texto]) => (
            <button key={v ?? 'auto'} type="button" role="radio" aria-checked={valor === v} data-on={valor === v || undefined} onClick={() => onElegir(v)}>
                {texto}
            </button>
        ))}
    </div>
)

export const EstiloAvanzado = ({
    invitation, setInvitation, setSaved, plan, onPickColor, colorAbierto,
    abierto,
    // Pestaña (sección) y fila abiertas: las lleva EditorWorkspace.
    tab = 'dock', onTab, fila = null, onFila,
}) => {
    const { t } = useTranslation()
    const ref = useRef(null)
    const pro = plan === 'pro'
    const pal = paletaDe(invitation)
    const secciones = SECCIONES.filter((x) => pro || !x.soloPro)
    const actual = secciones.find((x) => x.id === tab) ?? secciones[0]
    const nombreSec = (id) => t(`pdf_estilo.sec_${id}${id === 'dock' && !pro ? '_lite' : ''}`)

    // El panel que hace scroll (el cuerpo del panel lateral).
    const conScroll = () => {
        let el = ref.current?.parentElement
        while (el && el !== document.body) {
            const { overflowY } = getComputedStyle(el)
            if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) return el
            el = el.parentElement
        }
        return null
    }

    // De regreso del selector de color: el panel en el mismo scroll de antes.
    useEffect(() => {
        const guardado = sessionStorage.getItem(CLAVE_VOLVER)
        if (guardado == null) return undefined
        sessionStorage.removeItem(CLAVE_VOLVER)
        const top = Number(guardado)
        if (!guardado || !Number.isFinite(top)) return undefined
        let cuadros = 0
        let id = 0
        const poner = () => {
            const el = conScroll()
            if (el) el.scrollTop = top
            cuadros += 1
            if (cuadros < 40 && (!el || Math.abs(el.scrollTop - top) > 1 || cuadros < 12)) id = requestAnimationFrame(poner)
        }
        id = requestAnimationFrame(poner)
        const soltar = () => { cuadros = 99 }
        window.addEventListener('wheel', soltar, { once: true, passive: true })
        return () => { cancelAnimationFrame(id); window.removeEventListener('wheel', soltar) }
    }, [])

    const cambiar = (fn) => {
        setInvitation(fn)
        setSaved(false)
    }
    const abrirColor = (ruta) => {
        sessionStorage.setItem(CLAVE_VOLVER, String(conScroll()?.scrollTop ?? ''))
        onPickColor?.(`pdf:${ruta}`)
    }

    const sombras = SOMBRAS.map((v) => [v, t(`pdf_estilo.sombra_${v}`)])

    // Automático (como siempre, de entrada) o Avanzado (todas las opciones).
    // Con algo configurado siempre es Avanzado. Elegir Avanzado sin cambiar
    // nada se recuerda en la sesión (el panel se desmonta al abrir un color).
    const CLAVE_MODO = 'iattend_pdf_estilo_avanzado'
    const [verAvanzado, setVerAvanzado] = useState(() => sessionStorage.getItem(CLAVE_MODO) === '1')
    const avanzado = tieneAvanzado(invitation) || verAvanzado
    const elegirModo = (modo) => {
        if (modo === 'avanzado') {
            sessionStorage.setItem(CLAVE_MODO, '1')
            setVerAvanzado(true)
            return
        }
        const aAutomatico = () => {
            sessionStorage.removeItem(CLAVE_MODO)
            setVerAvanzado(false)
            onFila?.(null)
            if (tieneAvanzado(invitation)) cambiar(volverAPaleta)
        }
        // Con cambios, Automático los quita: se confirma.
        if (!tieneAvanzado(invitation)) { aAutomatico(); return }
        Modal.confirm({
            title: t('pdf_estilo.automatico_titulo'),
            content: t('pdf_estilo.automatico_texto'),
            okText: t('pdf_estilo.automatico_si'),
            cancelText: t('pdf_estilo.automatico_no'),
            centered: true,
            onOk: aAutomatico,
        })
    }

    return (
        <div ref={ref} className={s.bloque}>
            {/* El título ("Controles del invitado") va en el encabezado del panel
                lateral (EditorWorkspace); para salir, Salir de la barra de arriba. */}
            {abierto && (
                <div className={s.cuerpo}>
                    <Segmentado
                        etiqueta={t('pdf_estilo.titulo')}
                        opciones={[['automatico', t('pdf_estilo.modo_automatico')], ['avanzado', t('pdf_estilo.modo_avanzado')]]}
                        valor={avanzado ? 'avanzado' : 'automatico'}
                        onElegir={elegirModo}
                    />
                    {!avanzado && <p className={s.nota}>{t('pdf_estilo.automatico_nota')}</p>}
                    {avanzado && <>
                    {/* 1 · Paleta de 4 roles */}
                    <section className={s.seccionPanel}>
                        <span className={s.h}>{t('pdf_estilo.paleta')}</span>
                        {/* Propia (cambiaste uno de sus colores: los 4 se quedan)
                            o la de Diseño (se mueve con ella). */}
                        <span className={s.hSub}>
                            {tienePaletaPropia(invitation) ? t('pdf_estilo.paleta_propia') : t('pdf_estilo.paleta_sigue')}
                        </span>
                        {tienePaletaPropia(invitation) && (
                            <button type="button" className={s.usarDiseno} onClick={() => cambiar(seguirPaleta)}>
                                <RotateCcw size={13} /> {t('pdf_estilo.paleta_usar_diseno')}
                            </button>
                        )}
                        <div className={s.paleta}>
                            {ROLES.map((r) => (
                                <button key={r} type="button" className={s.rol} data-on={colorAbierto === `pdf:palette.${r}` || undefined} onClick={() => abrirColor(`palette.${r}`)}>
                                    <span className={s.rolMuestra} style={{ background: pal[r] }} />
                                    <span className={s.rolNombre}>{t(`pdf_estilo.rol_${r}`)}</span>
                                    <span className={s.rolSub}>{t(`pdf_estilo.rol_${r}_sub`)}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* 2 · Forma y sombra (globales) */}
                    <section className={s.seccionPanel}>
                        <span className={s.h}>{t('pdf_estilo.forma_titulo')}</span>
                        <span className={s.etiqueta}>{t('pdf_estilo.forma_label')}</span>
                        <div className={s.formas} role="radiogroup" aria-label={t('pdf_estilo.forma_label')}>
                            {['auto', ...FORMAS].map((f) => (
                                <button
                                    key={f}
                                    type="button"
                                    role="radio"
                                    aria-checked={formaDe(invitation) === f}
                                    className={s.forma}
                                    data-on={formaDe(invitation) === f || undefined}
                                    onClick={() => cambiar((prev) => parcheForma(prev, f))}
                                >
                                    <span className={s.formaMuestra} data-forma={f} />
                                    {t(`pdf_estilo.forma_${f}`)}
                                </button>
                            ))}
                        </div>
                        <span className={s.etiqueta}>{t('pdf_estilo.sombra')}</span>
                        <Segmentado
                            etiqueta={t('pdf_estilo.sombra')}
                            opciones={[['auto', t('pdf_estilo.sombra_auto')], ...sombras]}
                            valor={sombraDe(invitation)}
                            onElegir={(v) => cambiar((prev) => parcheSombra(prev, v))}
                        />
                    </section>

                    {/* 3 · Estilo de botón */}
                    <section className={s.seccionPanel}>
                        <span className={s.h}>{t('pdf_estilo.boton_titulo')}</span>
                        <span className={s.hSub}>{t('pdf_estilo.boton_sub')}</span>
                        <div className={s.estilos} role="radiogroup" aria-label={t('pdf_estilo.boton_titulo')}>
                            {ESTILOS_BOTON.map((b) => (
                                <button
                                    key={b}
                                    type="button"
                                    role="radio"
                                    aria-checked={estiloBotonDe(invitation) === b}
                                    className={s.estilo}
                                    data-on={estiloBotonDe(invitation) === b || undefined}
                                    onClick={() => cambiar((prev) => parcheEstiloBoton(prev, b))}
                                >
                                    <span className={s.estiloFondo}>
                                        <span className={s.estiloPildora} style={pintarBoton(b, pal.acento, pal.claro, '0 4px 10px rgba(0,0,0,.25)')} />
                                    </span>
                                    {t(`pdf_estilo.boton_${b}`)}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* 4 · Por sección */}
                    <section className={s.seccionPanel}>
                        <span className={s.h}>{t('pdf_estilo.secciones_titulo')}</span>
                        <span className={s.hSub}>{t('pdf_estilo.secciones_sub')}</span>
                        <div className={s.pestanas} role="tablist">
                            {secciones.map((x) => {
                                const n = aManoEn(invitation, x.id)
                                return (
                                    <button key={x.id} type="button" role="tab" aria-selected={actual.id === x.id} data-on={actual.id === x.id || undefined} onClick={() => onTab?.(x.id)}>
                                        <span>{nombreSec(x.id)}</span>
                                        {n > 0 && <span className={s.pestanaCuenta}>{t('pdf_estilo.a_mano', { n })}</span>}
                                    </button>
                                )
                            })}
                        </div>
                        <span className={s.hSub}>{t(`pdf_estilo.desc_${actual.id}${actual.id === 'dock' && !pro ? '_lite' : ''}`)}</span>

                        <div className={s.filas}>
                            {actual.slots.filter(([k]) => pro || !actual.slotsLite || actual.slotsLite.includes(k)).map(([slot]) => {
                                const a = asignado(invitation, actual.id, slot)
                                const def = rolPorDefecto(actual.id, slot, pro)
                                const valor = a ?? def
                                const esRol = ROLES.includes(valor)
                                const color = colorDe(invitation, actual.id, slot, pro)
                                const abierta = fila === slot
                                const etiquetaSlot = t(`pdf_estilo.slot_${actual.id}_${slot}${actual.id === 'dock' && !pro ? '_lite' : ''}`)
                                return (
                                    <div key={slot} className={s.fila} data-abierta={abierta || undefined}>
                                        <div className={s.filaCabeza}>
                                            <button type="button" className={s.filaBoton} onClick={() => onFila?.(abierta ? null : slot)} aria-expanded={abierta}>
                                                <span className={s.cuadro} style={{ background: color }} />
                                                <span className={s.filaNombre}>{etiquetaSlot}</span>
                                                {!valor
                                                    ? <span className={s.chip}>{t('pdf_estilo.auto')}</span>
                                                    : esRol
                                                        ? <span className={s.chip} data-otro={a ? true : undefined}><Link2 size={12} />{t(`pdf_estilo.rol_${valor}`)}</span>
                                                        : <span className={s.hex}>{String(valor).toUpperCase()}</span>}
                                            </button>
                                            {a && (
                                                <button type="button" className={s.quitar} title={t('pdf_estilo.restablecer')} aria-label={t('pdf_estilo.restablecer')}
                                                    onClick={() => cambiar((prev) => parcheSlot(prev, actual.id, slot, null, pro))}>
                                                    <RotateCcw size={16} />
                                                </button>
                                            )}
                                        </div>
                                        {abierta && (
                                            <div className={s.selector}>
                                                <span className={s.nota}>{t('pdf_estilo.por_defecto', { rol: def ? t(`pdf_estilo.rol_${def}`) : t('pdf_estilo.auto') })}</span>
                                                <div className={s.circulos}>
                                                    {ROLES.map((r) => (
                                                        <button key={r} type="button" className={s.circulo} data-on={valor === r || undefined}
                                                            onClick={() => cambiar((prev) => parcheSlot(prev, actual.id, slot, r, pro))}>
                                                            <span style={{ background: pal[r] }} />
                                                            {t(`pdf_estilo.rol_${r}`)}
                                                        </button>
                                                    ))}
                                                    <button type="button" className={s.circulo} data-on={(valor && !esRol) || undefined} data-otro onClick={() => abrirColor(`${actual.id}.${slot}`)}>
                                                        <span />
                                                        {t('pdf_estilo.otro')}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                            <div className={s.pieFilas}>
                                <span className={s.etiqueta}>{t('pdf_estilo.sombra_seccion')}</span>
                                <Segmentado
                                    chico
                                    etiqueta={t('pdf_estilo.sombra_seccion')}
                                    opciones={[[null, t('pdf_estilo.sombra_igual')], ...sombras]}
                                    valor={sombraSeccion(invitation, actual.id)}
                                    onElegir={(v) => cambiar((prev) => parcheSombraSeccion(prev, actual.id, v))}
                                />
                            </div>
                        </div>
                    </section>

                    </>}
                </div>
            )}
        </div>
    )
}
