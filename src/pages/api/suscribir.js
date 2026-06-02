import { supabaseAdmin } from '../../lib/supabaseAdmin.js'

export const prerender = false

export async function POST({ request }) {
  try {
    const { email } = await request.json()
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Email no válido.' }), {
        status: 400,
      })
    }
    // upsert: si ya estaba suscrito, no da error (idempotente)
    const { error } = await supabaseAdmin
      .from('suscriptores')
      .upsert({ email: email.toLowerCase().trim() }, { onConflict: 'email' })
    if (error)
      return new Response(JSON.stringify({ error: 'No se pudo registrar.' }), {
        status: 500,
      })
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch {
    return new Response(JSON.stringify({ error: 'Error inesperado.' }), {
      status: 500,
    })
  }
}
