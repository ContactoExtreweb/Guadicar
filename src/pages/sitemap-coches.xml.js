export const prerender = false;

import { getVehiculos } from '../lib/coches.js';

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
      const fecha = c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString();
      return `  <url>
    <loc>${SITE}/vehiculos/${c.slug}</loc>
    <lastmod>${fecha}</lastmod>
    <changefreq>weekly</changefreq>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}