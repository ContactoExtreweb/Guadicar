// @ts-check
import { defineConfig } from 'astro/config'

import netlify from '@astrojs/netlify'
import sitemap from '@astrojs/sitemap'

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: netlify(),
  site: 'https://guadicar.es',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin'),
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