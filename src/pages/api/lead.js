import { supabaseAdmin } from '../../lib/supabaseAdmin.js'
import {
  esc,
  telefonoValido,
  nombreSospechoso,
  mensajeSospechoso,
  emailValido,
  okFalso,
  trampaBot,
  avisarLead,
} from '../../lib/leads.js'

export const prerender = false

/* ── Endpoint ─────────────────────────────────────────────── */

export async function POST({ request }) {
  try {
    const body = await request.json()
    const { nombre, telefono, email, mensaje, vehiculo_nombre, tipo } = body

    // 1) y 2) Honeypot y tiempo: si parece un bot, "ok" falso
    const bot = trampaBot(body, 3000)
    if (bot) {
      console.warn('[lead] Bloqueado:', bot)
      return okFalso()
    }

    // 3) Contenido
    if (!nombre || !telefono) {
      return new Response(
        JSON.stringify({ error: 'Faltan nombre y teléfono.' }),
        { status: 400 },
      )
    }
    if (!telefonoValido(telefono)) {
      return new Response(
        JSON.stringify({
          error: 'El teléfono no parece válido. Escribe 9 dígitos.',
        }),
        { status: 400 },
      )
    }
    if (email && !emailValido(email)) {
      return new Response(JSON.stringify({ error: 'El email no es válido.' }), {
        status: 400,
      })
    }
    if (nombreSospechoso(nombre)) {
      console.warn('[lead] Bloqueado por nombre sospechoso:', nombre)
      return okFalso()
    }
    if (mensajeSospechoso(mensaje)) {
      console.warn('[lead] Bloqueado por mensaje sospechoso')
      return okFalso()
    }

    // 4) Guardar el lead en Supabase
    const { error: dbError } = await supabaseAdmin.from('leads').insert({
      nombre: String(nombre).trim().slice(0, 60),
      telefono: String(telefono).trim().slice(0, 20),
      email: email ? String(email).trim().toLowerCase().slice(0, 100) : null,
      mensaje: mensaje ? String(mensaje).trim().slice(0, 2000) : null,
      vehiculo_nombre: vehiculo_nombre || null,
      tipo: tipo || 'contacto',
      estado: 'nuevo',
      carta_tipo: body.carta_tipo || null,
      carta_combustible: body.carta_combustible || null,
      carta_cambio: body.carta_cambio || null,
      carta_marca: body.carta_marca || null,
      carta_modelo: body.carta_modelo || null,
      carta_presupuesto: body.carta_presupuesto || null,
      carta_anio_min: body.carta_anio_min || null,
      carta_km_max: body.carta_km_max || null,
      carta_equipamiento: body.carta_equipamiento || null,
      carta_color: body.carta_color || null,
    })
    if (dbError) {
      console.error('Error guardando lead:', dbError.message)
      return new Response(JSON.stringify({ error: 'No se pudo guardar.' }), {
        status: 500,
      })
    }

    // 5) Aviso por email (si falla, el lead ya está guardado igualmente)
    try {
      const esCarta = tipo === 'carta'
      const quien = String(nombre).trim().slice(0, 60)
      await avisarLead({
        replyTo: email && emailValido(email) ? String(email).trim() : undefined,
        asunto: esCarta
          ? `🔍 Nueva búsqueda "a la carta" de ${quien}`
          : `📩 Nuevo contacto web de ${quien}`,
        html: `
          <h2>${esCarta ? 'Solicitud de coche a la carta' : 'Nuevo mensaje de contacto'}</h2>
          <p><b>Nombre:</b> ${esc(nombre)}</p>
          <p><b>Teléfono:</b> ${esc(telefono)}</p>
          ${email ? `<p><b>Email:</b> ${esc(email)}</p>` : ''}
          ${vehiculo_nombre ? `<p><b>Vehículo de interés:</b> ${esc(vehiculo_nombre)}</p>` : ''}
          ${mensaje ? `<p><b>Mensaje:</b><br>${esc(mensaje).replace(/\n/g, '<br>')}</p>` : ''}
          <hr><p style="color:#888;font-size:12px;">Enviado desde guadicar.es</p>`,
      })
    } catch (mailErr) {
      console.error('Lead guardado, pero el email falló:', mailErr)
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (e) {
    console.error('Error en /api/lead:', e)
    return new Response(JSON.stringify({ error: 'Error inesperado.' }), {
      status: 500,
    })
  }
}
