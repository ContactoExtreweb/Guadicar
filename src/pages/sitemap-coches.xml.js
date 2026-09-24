export const prerender = false;

import { getVehiculos } from '../lib/coches.js';
import { cachearEnCDN } from '../lib/cache.js';

export async function GET() {
  const SITE = 'https://guadicar.es';

  let coches = [];
  try {
    coches = await getVehiculos();
  } catch (e) {
    coches = [];
  }

  const urls = coches
    .filter((c) => c.slug)
    .map((c) => {
      // Fecha real del coche. Antes salía siempre "ahora" (mapRow no traía
      // las fechas) y Google aprende a ignorar un lastmod que no es fiable.
      const lastmod = c.updatedAt
        ? `\n    <lastmod>${new Date(c.updatedAt).toISOString()}</lastmod>`
        : '';
      return `  <url>
    <loc>${SITE}/vehiculos/${c.slug}</loc>${lastmod}
    <changefreq>weekly</changefreq>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  const headers = new Headers({ 'Content-Type': 'application/xml; charset=utf-8' });
  cachearEnCDN(headers);
  return new Response(xml, { headers });
}