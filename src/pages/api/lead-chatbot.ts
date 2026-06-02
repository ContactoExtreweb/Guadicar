export const prerender = false
import type { APIRoute } from 'astro'
import { supabase } from '../../lib/supabase.js'

const PETICIONES = new Map<string, number[]>()
function limitado(ip: string, limite = 5, ventana = 60_000) {
  const ahora = Date.now()
  const t = (PETICIONES.get(ip) || []).filter((x) => ahora - x < ventana)
  t.push(ahora)
  PETICIONES.set(ip, t)
  return t.length > limite
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (limitado(clientAddress || 'anon'))
    return new Response(
      JSON.stringify({
        error: 'Demasiados envíos seguidos. Espera un momento.',
      }),
      { status: 429 },
    )

  let datos
  try {
    datos = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
    })
  }

  const nombre = String(datos?.nombre || '')
    .trim()
    .slice(0, 80)
  const telefono = String(datos?.telefono || '')
    .trim()
    .slice(0, 20)
  const mensaje = String(datos?.mensaje || '')
    .trim()
    .slice(0, 300)

  if (nombre.length < 2 || telefono.length < 6)
    return new Response(
      JSON.stringify({ error: 'Pon tu nombre y un teléfono válido.' }),
      { status: 400 },
    )

  const { error } = await supabase.from('leads').insert({
    nombre,
    telefono,
    mensaje: mensaje || null,
    tipo: 'chatbot',
    estado: 'nuevo',
  })

  if (error)
    return new Response(
      JSON.stringify({
        error: 'No se pudo guardar, inténtalo de nuevo.',
        detalle: error.message,
      }),
      { status: 500 },
    )

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
