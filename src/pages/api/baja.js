// Baja de la newsletter.
//
// Cada suscriptor tiene un token_baja aleatorio (columna de `suscriptores`):
// el enlace de los correos lleva ese token, no el email, y con él se borra al
// suscriptor. Lo usan dos caminos:
//   - la página /baja, al pulsar "Confirmar la baja";
//   - el botón "Cancelar suscripción" de Gmail/Outlook (cabecera
//     List-Unsubscribe-Post), que hace un POST directo a esta URL.
// Solo POST: si la baja se hiciera al abrir el enlace (GET), los antivirus de
// correo que abren los enlaces para revisarlos darían de baja a la gente.
import { supabaseAdmin } from '../../lib/supabaseAdmin.js'

export const prerender = false

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Si un programa de correo abre el enlace de la cabecera con GET, se le manda
// a la página de confirmación en vez de dar la baja directamente.
export function GET({ url }) {
  const t = url.searchParams.get('t') || ''
  return Response.redirect(new URL(`/baja?t=${encodeURIComponent(t)}`, url), 303)
}

const json = (datos, status = 200) =>
  new Response(JSON.stringify(datos), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export async function POST({ request, url }) {
  // El token viene en la URL (enlace del correo) o en el cuerpo (página /baja)
  let t = url.searchParams.get('t') || ''
  if (!t) {
    try {
      t = String((await request.json())?.t || '')
    } catch {
      /* el POST de Gmail/Outlook no es JSON: ahí el token va en la URL */
    }
  }

  // Los correos de prueba (ramas y local) llevan este token ficticio
  if (t === 'prueba') return json({ ok: true, prueba: true })

  if (!UUID.test(t)) return json({ error: 'El enlace de baja no es válido.' }, 400)

  const { data, error } = await supabaseAdmin
    .from('suscriptores')
    .delete()
    .eq('token_baja', t)
    .select('email')

  if (error) {
    console.error('[baja] Error:', error.message)
    return json({ error: 'No se pudo completar la baja. Inténtalo más tarde.' }, 500)
  }

  // Si no había nadie con ese token, ya estaba dado de baja: para la persona
  // el resultado es el mismo.
  console.log(`[baja] ${data?.length ? 'Baja realizada' : 'Token sin suscriptor (ya de baja)'}`)
  return json({ ok: true })
}
