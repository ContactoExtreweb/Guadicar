import { supabaseAdmin } from '../../lib/supabaseAdmin.js'
import { Resend } from 'resend'

export const prerender = false
const resend = new Resend(import.meta.env.RESEND_API_KEY)

const fmt = (n) => Number(n).toLocaleString('es-ES')

export async function POST({ request }) {
  try {
    const { vehiculoId, tipo } = await request.json() // tipo: 'nuevo' | 'bajada'

    // 1) Traer el coche
    const { data: v, error: ev } = await supabaseAdmin
      .from('vehiculos')
      .select('*')
      .eq('id', vehiculoId)
      .maybeSingle()
    if (ev || !v)
      return new Response(
        JSON.stringify({ error: 'Vehículo no encontrado.' }),
        { status: 404 },
      )

    // 2) Traer suscriptores
    const { data: subs, error: es } = await supabaseAdmin
      .from('suscriptores')
      .select('email')
    if (es)
      return new Response(
        JSON.stringify({ error: 'Error leyendo suscriptores.' }),
        { status: 500 },
      )
    if (!subs.length)
      return new Response(
        JSON.stringify({
          ok: true,
          enviados: 0,
          aviso: 'No hay suscriptores.',
        }),
        { status: 200 },
      )

    // 3) Construir el email
    const url = `https://guadicar.es/vehiculos/${v.slug}`
    const titulo =
      tipo === 'bajada' ? '¡Bajada de precio!' : 'Nuevo vehículo disponible'
    const html = emailHTML(v, tipo, url, titulo)
    const asunto =
      tipo === 'bajada'
        ? `📉 Bajada de precio: ${v.marca} ${v.modelo} ahora ${fmt(v.precio)}€`
        : `🚗 Nuevo en GuadiCar: ${v.marca} ${v.modelo}`

    // 4) Enviar (en lotes para no saturar). Mientras no haya dominio verificado,
    //    Resend solo entrega al email registrado; el resto se ignora silenciosamente.
    // MODO PRUEBAS: sin dominio verificado, Resend solo entrega a tu propia dirección.
    // Cuando se verifique guadicar.es, cambia MODO_PRUEBAS a false.
    const MODO_PRUEBAS = true

    let envio
    if (MODO_PRUEBAS) {
      envio = await resend.emails.send({
        from: 'GuadiCar <onboarding@resend.dev>',
        to: import.meta.env.LEAD_EMAIL_TO,
        subject: '[PRUEBA] ' + asunto,
        html,
      })
    } else {
      envio = await resend.emails.send({
        from: 'GuadiCar <ofertas@guadicar.es>',
        to: 'ofertas@guadicar.es',
        bcc: subs.map((s) => s.email),
        subject: asunto,
        html,
      })
    }
    console.log('[notificar] Respuesta Resend:', JSON.stringify(envio))
    if (envio.error) {
      return new Response(
        JSON.stringify({ error: 'Resend: ' + envio.error.message }),
        { status: 500 },
      )
    }

    return new Response(
      JSON.stringify({ ok: true, enviados: subs.length }),
      { status: 200 },
    )
  } catch (e) {
    console.error('Error en /api/notificar:', e)
    return new Response(JSON.stringify({ error: 'Error inesperado.' }), {
      status: 500,
    })
  }
}

function emailHTML(v, tipo, url, titulo) {
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
        GuadiCar Multimarcas · Villanueva de la Serena (Badajoz) · 722 49 61 24
      </div>
    </div>
  </div>`
}
