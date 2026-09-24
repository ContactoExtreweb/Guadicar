// Vacía la caché de las páginas de coches (ver src/lib/cache.js).
// La llama el panel después de cada cambio en un coche.
import { purgeCache } from '@netlify/functions'
import { esAdmin, noAutorizado } from '../../lib/apiAdmin.js'
import { ETIQUETA_COCHES } from '../../lib/cache.js'
import { CONTEXTO } from '../../lib/entorno.js'

export const prerender = false

const json = (datos, status = 200) =>
  new Response(JSON.stringify(datos), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export async function POST({ request }) {
  if (!(await esAdmin(request))) return noAutorizado()

  // En local no hay caché de Netlify que vaciar
  if (CONTEXTO === 'dev') return json({ ok: true, omitido: 'local' })

  try {
    await purgeCache({ tags: [ETIQUETA_COCHES] })
    return json({ ok: true })
  } catch (e) {
    // No es grave: la caché caduca sola en una hora
    console.error('[purgar] No se pudo vaciar la caché:', e)
    return json({ ok: false, error: 'No se pudo vaciar la caché.' }, 502)
  }
}
