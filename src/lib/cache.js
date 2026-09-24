// Caché en el CDN de Netlify para las páginas públicas que leen de Supabase
// (home, catálogo, fichas y sitemap de coches).
//
// Sin esto, cada visita ejecutaba una función de Netlify (créditos) y varias
// consultas a Supabase. Con esto, la página se genera una vez y Netlify la
// sirve desde su caché a todo el mundo durante una hora.
//
// Para que los cambios del panel se vean al momento, todas estas páginas
// llevan la etiqueta "coches" y el panel la purga al guardar, ocultar, borrar
// o cambiar el precio de un coche (ver /api/purgar). Un despliegue nuevo
// también vacía la caché.

export const ETIQUETA_COCHES = 'coches'

/** @param {Headers} headers */
export function cachearEnCDN(headers) {
  // Navegador: que pregunte siempre (así nunca se queda con una versión vieja)
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
  // CDN de Netlify: 1 hora, compartida entre servidores (durable). Pasada la
  // hora, sirve la copia anterior mientras genera la nueva (hasta 10 min).
  headers.set(
    'Netlify-CDN-Cache-Control',
    'public, durable, s-maxage=3600, stale-while-revalidate=600',
  )
  headers.set('Netlify-Cache-Tag', ETIQUETA_COCHES)
}
