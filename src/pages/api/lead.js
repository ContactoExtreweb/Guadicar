import { supabaseAdmin } from '../../lib/supabaseAdmin.js'
import { Resend } from 'resend'

export const prerender = false

const resend = new Resend(import.meta.env.RESEND_API_KEY)

export async function POST({ request }) {
  try {
    const body = await request.json()
    const { nombre, telefono, email, mensaje, vehiculo_nombre, tipo } = body

    // Validación mínima
    if (!nombre || !telefono) {
      return new Response(
        JSON.stringify({ error: 'Faltan nombre y teléfono.' }),
        { status: 400 },
      )
    }

    // 1) Guardar el lead en Supabase
    const { error: dbError } = await supabaseAdmin.from('leads').insert({
      nombre,
      telefono,
      email: email || null,
      mensaje: mensaje || null,
      vehiculo_nombre: vehiculo_nombre || null,
      tipo: tipo || 'contacto',
      estado: 'nuevo',
      // Campos de "a la carta" (solo se rellenan si vienen)
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

    // 2) Enviar aviso por email (si falla, el lead ya está guardado igualmente)
    try {
      const esCarta = tipo === 'carta'
      await resend.emails.send({
        from: 'GuadiCar Web <ventas@guadicar.es>',
        to: 'ventas@guadicar.es',
        replyTo: email || undefined,
        subject: esCarta
          ? `🔍 Nueva búsqueda "a la carta" de ${nombre}`
          : `📩 Nuevo contacto web de ${nombre}`,
        html: `
          <h2>${esCarta ? 'Solicitud de coche a la carta' : 'Nuevo mensaje de contacto'}</h2>
          <p><b>Nombre:</b> ${nombre}</p>
          <p><b>Teléfono:</b> ${telefono}</p>
          ${email ? `<p><b>Email:</b> ${email}</p>` : ''}
          ${vehiculo_nombre ? `<p><b>Vehículo de interés:</b> ${vehiculo_nombre}</p>` : ''}
          ${mensaje ? `<p><b>Mensaje:</b><br>${mensaje.replace(/\n/g, '<br>')}</p>` : ''}
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
