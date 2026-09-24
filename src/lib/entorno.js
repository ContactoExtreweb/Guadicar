// En qué entorno se está ejecutando esto: producción (main), una rama de
// pruebas, o el ordenador de casa. Sirve para no mandar correos de verdad
// mientras se prueba.
//
// __NETLIFY_CONTEXT__ lo fija el build (ver astro.config.mjs). Si además
// existiera la variable en tiempo de ejecución, esa manda.

/* global __NETLIFY_CONTEXT__ */
const contextoBuild =
  typeof __NETLIFY_CONTEXT__ === 'string' ? __NETLIFY_CONTEXT__ : ''
const entornoNode = globalThis.process?.env ?? {}

export const CONTEXTO = (
  entornoNode.CONTEXT ||
  contextoBuild ||
  'dev'
).toLowerCase()

export const esProduccion = CONTEXTO === 'production'

// Fuera de producción no se envía a los suscriptores. MODO_PRUEBAS=1 permite
// forzarlo también en producción si hiciera falta cortar los envíos.
export const modoPruebas = !esProduccion || entornoNode.MODO_PRUEBAS === '1'
