// Utilidades comunes a los formularios que generan leads (contacto,
// "a la carta" y chatbot): antispam, validación y aviso por correo.
import { Resend } from 'resend'
import { modoPruebas, CONTEXTO } from './entorno.js'

const resend = new Resend(import.meta.env.RESEND_API_KEY)

// Escapa HTML: impide que se cuelen enlaces o etiquetas en el email
export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// Teléfono: español (9 dígitos empezando por 6/7/8/9) o internacional con +
export function telefonoValido(tel) {
  const limpio = String(tel).replace(/[\s.\-()]/g, '')
  if (/^\+\d{8,15}$/.test(limpio)) return true
  return /^[6789]\d{8}$/.test(limpio.replace(/^(0034|34)/, ''))
}

// Nombres aleatorios tipo "czQUDEldAeDbtCisHbxVjgV"
export function nombreSospechoso(nombre) {
  const n = String(nombre).trim()
  if (n.length < 2 || n.length > 60) return true
  if (/https?:|www\.|[<>]|\d/i.test(n)) return true
  // muchas alternancias minúscula→MAYÚSCULA dentro de una palabra = cadena aleatoria
  return (n.match(/[a-záéíóúüñ][A-ZÁÉÍÓÚÜÑ]/g) || []).length > 2
}

// Mensajes con varios enlaces o código = spam
export function mensajeSospechoso(msg) {
  const m = String(msg ?? '')
  if (m.length > 2000) return true
  if (/\[url=|<a\s|<script/i.test(m)) return true
  return (m.match(/https?:\/\/|www\./gi) || []).length >= 2
}

export const emailValido = (e) =>
  /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(String(e).trim())

// Respuesta silenciosa para bots: les decimos "ok" para que no reintenten
export const okFalso = () =>
  new Response(JSON.stringify({ ok: true }), { status: 200 })

// Honeypot + trampa de tiempo. Devuelve el motivo si parece un bot, o null.
export function trampaBot(body, msMinimo = 3000) {
  if (String(body?.empresa || '').trim() !== '') return 'honeypot'
  const ts = Number(body?.ts)
  if (ts) {
    const transcurrido = Date.now() - ts
    if (transcurrido >= 0 && transcurrido < msMinimo)
      return `enviado en ${transcurrido} ms`
  }
  return null
}

// Aviso por correo de un lead nuevo. En producción va a ventas@guadicar.es;
// en pruebas (ramas y local), a LEAD_EMAIL_TO, para no mandarle al cliente
// leads de prueba.
/** @param {{ asunto: string, html: string, replyTo?: string }} aviso */
export async function avisarLead({ asunto, html, replyTo }) {
  const destino = modoPruebas
    ? (import.meta.env.LEAD_EMAIL_TO || '').trim()
    : 'ventas@guadicar.es'
  if (!destino) {
    console.warn(`[lead] Entorno "${CONTEXTO}" sin LEAD_EMAIL_TO: no se envía aviso`)
    return
  }
  const { error } = await resend.emails.send({
    from: 'GuadiCar Web <ventas@guadicar.es>',
    to: destino,
    replyTo,
    subject: modoPruebas ? `[PRUEBA] ${asunto}` : asunto,
    html,
  })
  if (error) throw new Error(error.message)
}
