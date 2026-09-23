// Comprobación de que quien llama a un endpoint tiene sesión en el panel.
//
// El panel manda su token de Supabase en la cabecera Authorization. Aquí se
// valida contra Supabase con la clave de servicio: si el token es falso,
// caducado o no viene, la petición se rechaza.
import { supabaseAdmin } from './supabaseAdmin.js'

export async function esAdmin(request) {
  const cabecera = request.headers.get('authorization') || ''
  if (!cabecera.startsWith('Bearer ')) return false

  const token = cabecera.slice(7).trim()
  if (!token) return false

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  return !error && !!data?.user
}

export const noAutorizado = () =>
  new Response(
    JSON.stringify({ error: 'Necesitas iniciar sesión en el panel.' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } },
  )
