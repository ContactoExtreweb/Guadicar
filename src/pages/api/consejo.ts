export const prerender = false
import type { APIRoute } from 'astro'

const MODELO = 'gemini-2.5-flash'

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

  const sistema = `Eres el asesor comercial de GuadiCar, un concesionario de coches de ocasión en Villanueva de la Serena (Badajoz). Hablas con el dueño/vendedor, en español de España, de tú, cercano y directo. Lees las estadísticas de visitas de su web y das un consejo accionable. Reglas: máximo 4 frases, texto plano (sin markdown ni listas), no inventes datos que no aparezcan, prioriza lo más urgente, y si un coche lleva mucho sin visitas sugiere revisar foto/título/precio.`

  const prompt = `Datos de hoy:
Visitas totales: ${total}. Últimos 7 días: ${u7}. Últimos 30 días: ${u30}.
Coches publicados:
${lineas || '(sin coches)'}

Escribe el consejo del día para el vendedor.`

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sistema }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
        }),
      },
    )

    if (!r.ok) {
      const detalle = await r.text()
      return new Response(
        JSON.stringify({ error: 'Gemini respondió ' + r.status, detalle }),
        { status: 502 },
      )
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
