import { supabaseAdmin } from '../../lib/supabaseAdmin.js'

export const prerender = false

// Dominios de correo temporal/desechable (amplía la lista si ves alguno nuevo)
const DESECHABLES = [
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
  'temp-mail.org', 'yopmail.com', 'sharklasers.com', 'trashmail.com',
  'getnada.com', 'dispostable.com', 'maildrop.cc', 'fakeinbox.com',
]

// Respuesta silenciosa para bots: les decimos "ok" para que no reintenten
const okFalso = () => new Response(JSON.stringify({ ok: true }), { status: 200 })

function emailValido(email) {
  const e = String(email).trim().toLowerCase()
  if (e.length < 6 || e.length > 100) return false
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(e)) return false
  if (e.includes('..')) return false
  const [local, dominio] = e.split('@')
  if (local.startsWith('.') || local.endsWith('.')) return false
  if (DESECHABLES.includes(dominio)) return false
  return true
}

export async function POST({ request }) {
  try {
    const body = await request.json()
    const email = String(body.email ?? '').trim().toLowerCase()

    // 1) Honeypot: si viene relleno, es un bot
    if (String(body.empresa || '').trim() !== '') {
      console.warn('[suscribir] Bloqueado por honeypot')
      return okFalso()
    }

    // 2) Tiempo: envío instantáneo = bot
    const ts = Number(body.ts)
    if (ts) {
      const transcurrido = Date.now() - ts
      if (transcurrido >= 0 && transcurrido < 2000) {
        console.warn('[suscribir] Bloqueado: enviado en', transcurrido, 'ms')
        return okFalso()
      }
    }

    // 3) Email real y con formato correcto
    if (!emailValido(email)) {
      return new Response(
        JSON.stringify({ error: 'Escribe un email válido.' }),
        { status: 400 },
      )
    }

    // 4) Guardar (upsert: si ya estaba suscrito, no da error)
    const { error } = await supabaseAdmin
      .from('suscriptores')
      .upsert({ email }, { onConflict: 'email' })
    if (error) {
      console.error('[suscribir] Error Supabase:', error.message)
      return new Response(
        JSON.stringify({ error: 'No se pudo registrar.' }),
        { status: 500 },
      )
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (e) {
    console.error('[suscribir] Excepción:', e)
    return new Response(JSON.stringify({ error: 'Error inesperado.' }), {
      status: 500,
    })
  }
}