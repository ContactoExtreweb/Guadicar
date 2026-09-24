export const prerender = false
import type { APIRoute } from 'astro'
import { supabaseAdmin } from '../../lib/supabaseAdmin.js'
import {
  esc,
  telefonoValido,
  nombreSospechoso,
  mensajeSospechoso,
  okFalso,
  trampaBot,
  avisarLead,
} from '../../lib/leads.js'

const PETICIONES = new Map<string, number[]>()
function limitado(ip: string, limite = 5, ventana = 60_000) {
  const ahora = Date.now()
  const t = (PETICIONES.get(ip) || []).filter((x) => ahora - x < ventana)
  t.push(ahora)
  PETICIONES.set(ip, t)
  return t.length > limite
}

const json = (datos: object, status = 200) =>
  new Response(JSON.stringify(datos), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (limitado(clientAddress || 'anon'))
    return json({ error: 'Demasiados envíos seguidos. Espera un momento.' }, 429)

  let datos: any
  try {
    datos = await request.json()
  } catch {
    return json({ error: 'JSON inválido' }, 400)
  }

  // Mismas trampas que el formulario de contacto
  const bot = trampaBot(datos, 3000)
  if (bot) {
    console.warn('[lead-chatbot] Bloqueado:', bot)
    return okFalso()
  }

  const nombre = String(datos?.nombre || '').trim().slice(0, 60)
  const telefono = String(datos?.telefono || '').trim().slice(0, 20)
  const mensaje = String(datos?.mensaje || '').trim().slice(0, 300)

  if (nombre.length < 2 || !telefono)
    return json({ error: 'Pon tu nombre y un teléfono.' }, 400)
  if (!telefonoValido(telefono))
    return json(
      { error: 'El teléfono no parece válido. Escribe 9 dígitos.' },
      400,
    )
  if (nombreSospechoso(nombre)) {
    console.warn('[lead-chatbot] Bloqueado por nombre sospechoso:', nombre)
    return okFalso()
  }
  if (mensajeSospechoso(mensaje)) {
    console.warn('[lead-chatbot] Bloqueado por mensaje sospechoso')
    return okFalso()
  }

  // Con la clave de servicio: así la tabla leads ya no necesita permitir
  // inserciones públicas (que dejaban a los bots saltarse todo esto).
  const { error } = await supabaseAdmin.from('leads').insert({
    nombre,
    telefono,
    mensaje: mensaje || null,
    tipo: 'chatbot',
    estado: 'nuevo',
  })

  if (error) {
    console.error('[lead-chatbot] Error guardando:', error.message)
    return json({ error: 'No se pudo guardar, inténtalo de nuevo.' }, 500)
  }

  // Aviso por correo (si falla, el lead ya está guardado igualmente)
  try {
    await avisarLead({
      asunto: `💬 Quiere que le llamen (chatbot): ${nombre}`,
      html: `
        <h2>Petición de llamada desde el chatbot</h2>
        <p><b>Nombre:</b> ${esc(nombre)}</p>
        <p><b>Teléfono:</b> <a href="tel:${esc(telefono.replace(/\s/g, ''))}">${esc(telefono)}</a></p>
        ${mensaje ? `<p><b>Le interesa:</b><br>${esc(mensaje).replace(/\n/g, '<br>')}</p>` : ''}
        <hr><p style="color:#888;font-size:12px;">Enviado desde el asistente de guadicar.es</p>`,
    })
  } catch (mailErr) {
    console.error('[lead-chatbot] Lead guardado, pero el email falló:', mailErr)
  }

  return json({ ok: true })
}
