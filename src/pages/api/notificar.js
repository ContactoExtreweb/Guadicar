import { supabaseAdmin } from '../../lib/supabaseAdmin.js'
import { esAdmin, noAutorizado } from '../../lib/apiAdmin.js'
import { modoPruebas, CONTEXTO } from '../../lib/entorno.js'
import { Resend } from 'resend'

export const prerender = false
const resend = new Resend(import.meta.env.RESEND_API_KEY)

const fmt = (n) => Number(n).toLocaleString('es-ES')

// Pequeña pausa entre lotes para respetar el límite de Resend (evita errores 429)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const PAGINA = 1000 // Supabase nunca devuelve más de 1000 filas por consulta
const LOTE = 100 // máximo de correos por llamada al envío por lotes de Resend

const json = (datos, status = 200) =>
  new Response(JSON.stringify(datos), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

// Todos los suscriptores, en páginas de 1000
async function traerSuscriptores() {
  const emails = []
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabaseAdmin
      .from('suscriptores')
      .select('email')
      .order('email')
      .range(desde, desde + PAGINA - 1)
    if (error) throw new Error(error.message)
    emails.push(...(data ?? []).map((s) => s.email))
    if (!data || data.length < PAGINA) break
  }
  return emails
}

export async function POST({ request }) {
  try {
    // Solo desde el panel: esto manda correos a todos los suscriptores
    if (!(await esAdmin(request))) return noAutorizado()

    const { vehiculoId, tipo } = await request.json() // tipo: 'nuevo' | 'bajada'

    if (!vehiculoId) return json({ error: 'Falta el vehículo.' }, 400)

    // 1) Traer el coche
    const { data: v, error: ev } = await supabaseAdmin
      .from('vehiculos')
      .select('*')
      .eq('id', vehiculoId)
      .maybeSingle()
    if (ev || !v) return json({ error: 'Vehículo no encontrado.' }, 404)

    // 2) No avisar de coches que no se pueden ver o cuyo precio está oculto:
    //    el correo lleva el precio y el enlace a la ficha.
    if (!v.publicado) {
      return json(
        { error: 'Este coche está oculto. Publícalo antes de avisar.' },
        400,
      )
    }
    if (v.precio_oculto || v.reservado) {
      return json(
        {
          error: v.reservado
            ? 'Este coche está reservado, así que su precio no se muestra. Quita la reserva antes de avisar.'
            : 'Este coche tiene el precio oculto y el correo lo mostraría. Muestra el precio antes de avisar.',
        },
        400,
      )
    }

    // 3) Traer suscriptores (todos, no solo los 1000 primeros)
    let emails
    try {
      emails = await traerSuscriptores()
    } catch (e) {
      console.error('[notificar] Error leyendo suscriptores:', e.message)
      return json({ error: 'Error leyendo suscriptores.' }, 500)
    }

    // Validación básica de email + eliminar duplicados y vacíos
    const emailValido = (e) =>
      typeof e === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)
    let destinatarios = [
      ...new Set(emails.map((e) => (e || '').toLowerCase().trim())),
    ].filter(emailValido)

    const suscriptores = destinatarios.length

    // 4) Fuera de producción no se escribe a nadie de verdad
    let aviso
    if (modoPruebas) {
      const prueba = (import.meta.env.LEAD_EMAIL_TO || '').trim()
      if (!prueba) {
        return json({
          ok: true,
          enviados: 0,
          fallos: 0,
          suscriptores,
          aviso: `Entorno "${CONTEXTO}": no se envía nada. Falta LEAD_EMAIL_TO para poder probar.`,
        })
      }
      destinatarios = [prueba]
      aviso = `Entorno "${CONTEXTO}": prueba enviada solo a ${prueba}. En producción habría salido a ${suscriptores} suscriptor(es).`
    }

    if (!destinatarios.length) {
      return json({
        ok: true,
        enviados: 0,
        fallos: 0,
        suscriptores,
        aviso: 'No hay suscriptores.',
      })
    }

    // 5) Construir el email (es igual para todos)
    const url = `https://guadicar.es/vehiculos/${v.slug}`
    const titulo =
      tipo === 'bajada' ? '¡Bajada de precio!' : 'Nuevo vehículo disponible'
    const html = emailHTML(v, url, titulo)
    const asunto =
      tipo === 'bajada'
        ? `📉 Bajada de precio: ${v.marca} ${v.modelo} ahora ${fmt(v.precio)}€`
        : `🚗 Nuevo en GuadiCar: ${v.marca} ${v.modelo}`

    // 6) Envío por lotes: una llamada por cada 100 correos, para no agotar
    //    el tiempo de la función cuando la lista crece.
    const remitente = 'GuadiCar <ventas@guadicar.es>'
    let enviados = 0
    let fallos = 0

    for (let i = 0; i < destinatarios.length; i += LOTE) {
      const lote = destinatarios.slice(i, i + LOTE)
      try {
        const envio = await resend.batch.send(
          lote.map((email) => ({
            from: remitente,
            to: email,
            replyTo: 'ventas@guadicar.es',
            subject: asunto,
            html,
          })),
        )
        if (envio.error) {
          fallos += lote.length
          console.error('[notificar] Fallo en un lote:', envio.error.message)
        } else {
          enviados += envio.data?.data?.length ?? lote.length
        }
      } catch (err) {
        fallos += lote.length
        console.error('[notificar] Excepción en un lote:', err)
      }
      if (i + LOTE < destinatarios.length) await sleep(600)
    }

    console.log(
      `[notificar] Coche ${v.slug} (${tipo}) → enviados:${enviados} fallos:${fallos} entorno:${CONTEXTO}`,
    )
    return json({ ok: true, enviados, fallos, suscriptores, aviso })
  } catch (e) {
    console.error('Error en /api/notificar:', e)
    return json({ error: 'Error inesperado.' }, 500)
  }
}

function emailHTML(v, url, titulo) {
  const fmtn = (n) => Number(n).toLocaleString('es-ES')
  const foto = v.fotos?.[0] || ''
  const precioAnt =
    v.precio_anterior && v.precio_anterior > v.precio
      ? `<span style="color:#888;text-decoration:line-through;font-size:16px;margin-left:8px;">${fmtn(v.precio_anterior)}€</span>`
      : ''
  return `
  <div style="background:#f5f5f7;padding:24px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e0e0e3;">
      <div style="background:#0d0d0d;padding:20px;text-align:center;">
        <span style="color:#fff;font-size:20px;font-weight:800;">GUADI<span style="color:#cc1c1c;">CAR</span></span>
      </div>
      <div style="background:#cc1c1c;color:#fff;text-align:center;padding:10px;font-weight:700;font-size:14px;">${titulo}</div>
      ${foto ? `<img src="${foto}" alt="${v.marca} ${v.modelo}" style="width:100%;height:260px;object-fit:cover;display:block;">` : ''}
      <div style="padding:24px;">
        <p style="color:#cc1c1c;font-size:12px;font-weight:800;letter-spacing:.1em;margin:0;text-transform:uppercase;">${v.marca}</p>
        <h1 style="font-size:22px;margin:4px 0 12px;color:#1a1a1a;">${v.modelo} ${v.version || ''}</h1>
        <p style="color:#555;font-size:14px;margin:0 0 16px;">${v.anio || ''} · ${fmtn(v.km || 0)} km · ${v.combustible || ''} · ${v.cambio || ''}</p>
        <div style="font-size:30px;font-weight:800;color:#1a1a1a;">${fmtn(v.precio)}€ ${precioAnt}</div>
        <a href="${url}" style="display:block;background:#cc1c1c;color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:10px;font-weight:700;margin-top:20px;">Ver este vehículo</a>
      </div>
      <div style="background:#0d0d0d;padding:16px;text-align:center;color:#888;font-size:12px;">
        GuadiCar Multimarcas · Villanueva de la Serena (Badajoz) · 722 496 124
      </div>
    </div>
  </div>`
}
