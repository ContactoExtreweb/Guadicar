import { supabaseAdmin } from '../../lib/supabaseAdmin.js'
import { Resend } from 'resend'

export const prerender = false

const resend = new Resend(import.meta.env.RESEND_API_KEY)

/* ── Utilidades ───────────────────────────────────────────── */

// Escapa HTML: impide que se cuelen enlaces o etiquetas en el email
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// Teléfono: español (9 dígitos empezando por 6/7/8/9) o internacional con +
function telefonoValido(tel) {
  const limpio = String(tel).replace(/[\s.\-()]/g, '')
  if (/^\+\d{8,15}$/.test(limpio)) return true
  return /^[6789]\d{8}$/.test(limpio.replace(/^(0034|34)/, ''))
}

// Nombres aleatorios tipo "czQUDEldAeDbtCisHbxVjgV"
function nombreSospechoso(nombre) {
  const n = String(nombre).trim()
  if (n.length < 2 || n.length > 60) return true
  if (/https?:|www\.|[<>]|\d/i.test(n)) return true
  // muchas alternancias minúscula→MAYÚSCULA dentro de una palabra = cadena aleatoria
  return (n.match(/[a-záéíóúüñ][A-ZÁÉÍÓÚÜÑ]/g) || []).length > 2
}

// Mensajes con varios enlaces o código = spam
function mensajeSospechoso(msg) {
  const m = String(msg ?? '')
  if (m.length > 2000) return true
  if (/\[url=|<a\s|<script/i.test(m)) return true
  return (m.match(/https?:\/\/|www\./gi) || []).length >= 2
}

const emailValido = (e) =>
  /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(String(e).trim())

// Respuesta silenciosa para bots: les decimos "ok" para que no reintenten
const okFalso = () =>
  new Response(JSON.stringify({ ok: true }), { status: 200 })

/* ── Endpoint ─────────────────────────────────────────────── */

export async function POST({ request }) {
  try {
    const body = await request.json()
    const { nombre, telefono, email, mensaje, vehiculo_nombre, tipo } = body

    // 1) Honeypot: si viene relleno, es un bot
    if (String(body.empresa || '').trim() !== '') {
      console.warn('[lead] Bloqueado por honeypot')
      return okFalso()
    }

    // 2) Tiempo: envío instantáneo = bot
    const ts = Number(body.ts)
    if (ts) {
      const transcurrido = Date.now() - ts
      if (transcurrido >= 0 && transcurrido < 3000) {
        console.warn('[lead] Bloqueado: enviado en', transcurrido, 'ms')
        return okFalso()
      }
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
      await resend.emails.send({
        from: 'GuadiCar Web <ventas@guadicar.es>',
        to: 'ventas@guadicar.es',
        replyTo: email && emailValido(email) ? String(email).trim() : undefined,
        subject: esCarta
          ? `🔍 Nueva búsqueda "a la carta" de ${esc(nombre)}`
          : `📩 Nuevo contacto web de ${esc(nombre)}`,
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