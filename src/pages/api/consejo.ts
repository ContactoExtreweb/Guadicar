export const prerender = false
import type { APIRoute } from 'astro'

const MODELO = 'gemini-2.5-flash'

async function pedirAGemini(
  key: string,
  body: string,
  intentos = 3,
): Promise<Response> {
  let ultima: Response | null = null
  for (let i = 0; i < intentos; i++) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body,
      },
    )
    if (r.ok) return r
    ultima = r
    if (r.status === 429 || r.status === 503) {
      // temporales: esperar y reintentar
      await new Promise((res) => setTimeout(res, 600 * (i + 1)))
      continue
    }
    return r // otros errores: no reintentar
  }
  return ultima!
}

export const POST: APIRoute = async ({ request }) => {
  const key = import.meta.env.GEMINI_API_KEY
  if (!key)
    return new Response(JSON.stringify({ error: 'Falta GEMINI_API_KEY' }), {
      status: 500,
    })

  let datos
  try {
    datos = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
    })
  }

  const { total = 0, u7 = 0, u30 = 0, coches = [] } = datos ?? {}
  const lineas = (coches as any[])
    .slice(0, 30)
    .map(
      (c) =>
        `- ${c.marca} ${c.modelo}: ${c.precio} €, ${c.visitas} visitas, ${c.dias} días publicado`,
    )
    .join('\n')

  const sistema = `Eres el asesor comercial de GuadiCar, un concesionario de coches de ocasión en Villanueva de la Serena (Badajoz). Hablas con el dueño/vendedor, en español de España, de tú, en tono cercano, positivo y resolutivo. NO te inventes su nombre ni le llames por ningún nombre. Lees las estadísticas de visitas y das un consejo accionable CENTRADO EN LOS COCHES. Reglas estrictas:
- Máximo 4 frases, texto plano, sin markdown ni listas.
- Habla solo de acciones concretas sobre coches concretos: revisar la foto principal, el título o el precio de un coche, destacar el que más interés despierta, contactar a posibles interesados, etc.
- NO valores el rendimiento global de la web ni des a entender que va mal. Prohibido decir cosas como "la web tiene pocas visitas", "hay que dar un empujón a la web" o cualquier frase que suene a crítica del sitio o del vendedor.
- No inventes datos que no aparezcan y prioriza lo más urgente.`

  const prompt = `Datos de hoy:
Visitas totales: ${total}. Últimos 7 días: ${u7}. Últimos 30 días: ${u30}.
Coches publicados:
${lineas || '(sin coches)'}

Escribe el consejo del día para el vendedor.`

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: sistema }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 400,
      thinkingConfig: { thinkingBudget: 0 },
    },
  })

  try {
    const r = await pedirAGemini(key, body)
    if (!r.ok) {
      const detalle = await r.text()
      const msg =
        r.status === 429
          ? 'Límite del plan gratis por ahora. Espera un minuto y recarga.'
          : r.status === 503
            ? 'Gemini está saturado un momento. Prueba de nuevo en unos segundos.'
            : 'Gemini respondió ' + r.status
      return new Response(JSON.stringify({ error: msg, detalle }), {
        status: 502,
      })
    }
    const data = await r.json()
    const texto =
      (data?.candidates?.[0]?.content?.parts ?? [])
        .map((p: any) => p.text)
        .join('')
        .trim() || 'No he podido generar el consejo esta vez.'
    return new Response(JSON.stringify({ consejo: texto }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        error: 'Error llamando a Gemini',
        detalle: String(e?.message || e),
      }),
      { status: 502 },
    )
  }
}
