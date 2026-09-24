// Desde el panel: pide que se vacíe la caché de las páginas de coches para
// que un cambio se vea en la web al momento (ver src/lib/cache.js).
// Si falla no pasa nada grave: la caché caduca sola en una hora.
import { supabase } from './supabaseBrowser.js'

export async function refrescarWeb() {
  try {
    const { data } = await supabase.auth.getSession()
    const res = await fetch('/api/purgar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` },
    })
    if (!res.ok) console.warn('No se pudo refrescar la web:', res.status)
  } catch (e) {
    console.warn('No se pudo refrescar la web:', e)
  }
}
