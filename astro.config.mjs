// @ts-check
import { defineConfig } from 'astro/config'

import netlify from '@astrojs/netlify'
import sitemap from '@astrojs/sitemap'

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: netlify(),
  site: 'https://guadicar.es',
  security: {
    // Astro rechaza por defecto los POST de formulario que llegan desde otro
    // dominio. Eso bloqueaba la baja en un clic de Gmail/Outlook (que envían
    // un formulario a /api/baja desde sus servidores). No hace falta aquí:
    // los endpoints reciben JSON, y los del panel exigen el token en una
    // cabecera, que un formulario de otra web no puede enviar.
    checkOrigin: false,
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin') && !page.includes('/baja'),
    }),
  ],
  vite: {
    define: {
      // Netlify pone CONTEXT en el build: 'production' en main, 'branch-deploy'
      // en las ramas. Lo dejamos fijado aquí para poder leerlo también en las
      // funciones (ver src/lib/entorno.js).
      __NETLIFY_CONTEXT__: JSON.stringify(process.env.CONTEXT ?? ''),
    },
  },
})