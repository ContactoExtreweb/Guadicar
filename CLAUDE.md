# GuadiCar Multimarcas — contexto del proyecto

Web **en producción** de un concesionario real. Cliente: **Jose Juan Carmona Ponce**
(GuadiCar Multimarcas, Villanueva de la Serena, Badajoz). Desarrollada por **Saúl
Correyero** (Extreweb).

> Documento de traspaso: recoge lo trabajado en dos conversaciones largas de
> Claude.ai. Si algo aquí contradice al código, **manda el código** — avísame y lo
> corrijo.

---

## 1. Lo primero que hay que entender

**Esto está en producción y lo usa un cliente a diario.** No es un proyecto de
prácticas. Hay clientes reales entrando en la web, un concesionario subiendo coches
desde el panel, y correos que salen a suscriptores de verdad. Cualquier cambio que
rompa el build deja al negocio sin poder publicar coches.

Implicaciones prácticas:

- **No actualizar dependencias mayores sin plan.** Hay un aviso de Astro 6→7 y
  `@astrojs/netlify` 7→8 con *breaking changes* que se decidió **no aplicar**. Si se
  hace algún día: rama aparte, `npm run build` limpio en local, probar panel + subida
  de fotos + los tres formularios + fichas, y solo entonces fusionar. Ojo con la
  versión mínima de Node: `package.json` ya exige Node ≥ 22.12 (Astro 6).
- **Probar antes de desplegar.** Los créditos de Netlify son limitados y cada build
  fallido los consume.
- **Nunca commitear `.env`** ni claves. Las claves viven solo en variables de entorno.

### Flujo de trabajo (desde septiembre 2026)

- `main` = producción. **Todo se hace en la rama `desarrollo`**, que Netlify
  despliega aparte en `https://desarrollo--eguadicar.netlify.app`.
- Orden: probar en local (`npm run dev`) → push a `desarrollo` → probar en la URL
  de la rama → pull request a `main` → fusionar (eso publica en producción).
- **La rama usa la misma base de datos que producción.** Lo que se crea o edita
  probando, se crea o edita de verdad: probar con coches ocultos de prueba.
- **Modo pruebas** (`src/lib/entorno.js`): fuera de producción (rama y local) los
  avisos a suscriptores y los avisos de leads van solo a `LEAD_EMAIL_TO`, con
  `[PRUEBA]` en el asunto. Se decide por la variable `CONTEXT` de Netlify, que se
  fija en el build. `MODO_PRUEBAS=1` en producción corta los envíos si hiciera falta.
- Los SQL que se ejecutan en Supabase se guardan en `sql/` con su estado.

---

## 2. Stack e infraestructura

| Pieza | Detalle |
|---|---|
| Framework | **Astro 6** (`output: 'static'` + adaptador `@astrojs/netlify` 7) |
| Base de datos | **Supabase** (Postgres + Auth + Storage), proyecto `ujmxhcxaputqzcvqwyjn` |
| Hosting | **Netlify**, cuenta `extrewebguadicar`, sitio `eguadicar.netlify.app` |
| Dominio | **guadicar.es** (DNS gestionado en **Plesk/Kinetica**) |
| Email | **Resend** (dominio `guadicar.es` verificado) |
| IA | **Gemini 2.5 Flash** (Google AI Studio) |
| Fuentes | **Fontsource** (self-host, no Google Fonts — RGPD) |

`astro.config.mjs` lleva `site: 'https://guadicar.es'` y el sitemap con
`filter: (page) => !page.includes('/admin')`. Verificar ese `site` si algo de SEO sale
raro: el fallback apuntaba a un dominio de Netlify.

### Páginas dinámicas

Las páginas que leen de Supabase llevan `export const prerender = false`
(`index.astro`, `vehiculos/[slug].astro`, endpoints `/api/*`, páginas de admin).

### Variables de entorno (Netlify)

```
PUBLIC_SUPABASE_URL          # NO marcar como secret
PUBLIC_SUPABASE_ANON_KEY     # NO marcar como secret
SUPABASE_SERVICE_KEY         # service_role, secreta
RESEND_API_KEY
LEAD_EMAIL_TO                # contactoextreweb@gmail.com — buzón de pruebas (modo pruebas)
GEMINI_API_KEY
NODE_VERSION                 # ≥ 22 (Astro 6 exige Node 22.12+)
MODO_PRUEBAS                 # opcional: =1 corta los envíos reales también en producción
```

Las variables **solo se aplican al re-desplegar** (Deploys → *Clear cache and deploy
site*): Astro las **incrusta en el build** (`import.meta.env.X` acaba como texto en la
función). Las `PUBLIC_` marcadas como *secret* rompen el build de Astro.

---

## 3. Estructura del proyecto

```
src/
├── layouts/
│   ├── Base.astro          # layout público: navbar píldora, footer, schema AutoDealer, ChatBot, CookieBanner
│   └── Admin.astro         # layout del panel
├── components/
│   ├── FormVehiculo.astro  # alta Y edición de coches (compartido) — compresión de fotos aquí
│   ├── FichaVehiculo.astro # la ficha completa (la usa vehiculos/[slug].astro)
│   ├── NoEncontrado.astro  # contenido del 404 (lo usan 404.astro y la ficha)
│   ├── ChatBot.astro       # chat con Gemini (avisa de que es IA)
│   ├── Newsletter.astro    # 3 variantes: section / footer / popup
│   ├── Resenas.astro       # reseñas de Google (estáticas)
│   ├── CookieBanner.astro
│   ├── Calculadora.astro   # simulador de cuota en la ficha
│   └── AdminNav.astro
├── lib/
│   ├── supabase.js         # cliente anon, servidor
│   ├── supabaseBrowser.js  # cliente navegador
│   ├── supabaseAdmin.js    # service_role — SOLO en /api
│   ├── coches.js           # getVehiculos, getVehiculo, getUltimos, getDestacados, getOcasionSemana, mapRow, fmt, badgeDe
│   ├── financiacion.js     # TAE, TIN, computeCuota, ejemploFinanciacion (Ley 16/2011)
│   ├── entorno.js          # producción o pruebas (modo pruebas)
│   ├── apiAdmin.js         # esAdmin(request): valida el token del panel en /api
│   ├── leads.js            # antispam, validación y aviso por correo de leads
│   ├── cache.js            # cabeceras de caché del CDN (etiqueta "coches")
│   ├── refrescarWeb.js     # desde el panel: purga la caché tras un cambio
│   └── marcas.js           # lista oficial de marcas + normalización
├── pages/
│   ├── index.astro         # home
│   ├── vehiculos/index.astro    # catálogo con filtros
│   ├── vehiculos/[slug].astro   # carga el coche: ficha, o 404 real si no existe
│   ├── carta.astro contacto.astro servicios.astro nosotros.astro
│   ├── aviso-legal.astro privacidad.astro cookies.astro
│   ├── baja.astro          # confirmación de baja de la newsletter
│   ├── sitemap-coches.xml.js    # sitemap dinámico de fichas
│   ├── api/
│   │   ├── lead.js         # contacto + "a la carta"
│   │   ├── lead-chatbot.ts # leads del chatbot (nombre distinto: /api/lead ya estaba ocupado)
│   │   ├── suscribir.js    # newsletter
│   │   ├── baja.js         # baja de la newsletter (POST; también el "un clic" de Gmail)
│   │   ├── notificar.js    # avisos a suscriptores — SOLO panel (token)
│   │   ├── purgar.js       # vacía la caché del CDN — SOLO panel (token)
│   │   ├── chat.ts         # chatbot Gemini
│   │   └── consejo.ts      # "Consejo de hoy" del panel — SOLO panel (token)
│   └── admin/
│       ├── index.astro     # dashboard (Chart.js, tareas, notas, contactos)
│       ├── vehiculos.astro # listado con acciones
│       ├── nuevo.astro  editar/[slug].astro
│       ├── estadisticas.astro   # visitas, ranking, sugerencias, consejo IA
│       ├── leads.astro     # bandeja de leads
│       └── login.astro
└── styles/styles.css       # ~2700 líneas, CSS global
```

Fuera de `src/`: `public/_headers` (cabeceras de seguridad de Netlify) y `sql/`
(SQL ejecutados y pendientes, con su estado).

**`FormVehiculo.astro` lo usan `nuevo.astro` y `editar/[slug].astro`.** Todo lo de
subida y compresión de fotos vive ahí: se arregla una vez y vale para los dos. En
edición **los datos los carga el navegador** con la sesión del panel (el servidor
no la tiene y, por RLS, no vería los coches ocultos ni `vehiculos_privado`).

**Endpoints del panel** (`notificar`, `consejo`, `purgar`): el panel manda
`Authorization: Bearer <access_token>` de la sesión de Supabase y el endpoint lo
valida con `esAdmin()`. Cualquier endpoint nuevo que haga algo privado, igual.

---

## 4. Base de datos (Supabase)

| Tabla | Para qué |
|---|---|
| `vehiculos` | catálogo público (`id` es **uuid**) |
| `vehiculos_privado` | precio de compra, gastos, notas internas (solo admin) |
| `leads` | contacto, "a la carta" y chatbot (columna `tipo`) |
| `suscriptores` | newsletter (email único, `token_baja` uuid para el enlace de baja) |
| `vistas` | contador de visitas por ficha |
| `tareas` / `notas` / `contactos` | centro de trabajo del dashboard |

Bucket de Storage: **`coches`** (público).

### Columnas de `vehiculos` que conviene conocer

`slug` (único), `marca`, `modelo`, `version`, `estado` (`ocasion|km0|nuevo`),
`carroceria`, `anio`, `km`, `combustible`, `cambio`, `potencia_cv`, `precio`,
`precio_anterior`, `descripcion`, `equipamiento` (array), `fotos` (array de URLs),
`certificado`, `destacado`, `ocasion_semana`, `publicado`, `reservado`,
`precio_oculto`, ficha técnica (`matriculacion`, `traccion`, `puertas`, `plazas`,
`consumo`, `emisiones_co2`, `vel_maxima`, `aceleracion`, `peso_kg`, `deposito_l`,
`maletero_l`, `largo_m`, `ancho_m`, `alto_m`), `created_at`, `updated_at`.

`mapRow(r)` en `coches.js` traduce snake_case → camelCase. **Si se añade una columna
nueva hay que añadirla también a `mapRow`**, o llegará `undefined` a las páginas.
Comprobar de entrada que `mapRow` devuelve `reservado` y `precioOculto`: se añadieron
tarde y es el primer sitio donde se nota si falta algo.

Regla del precio oculto: `precioOculto: r.precio_oculto || r.reservado`. Un coche
reservado oculta el precio automáticamente sin tocar datos.

### RLS — estado actual (septiembre 2026)

- Las políticas de admin comprueban solo `auth.role() = 'authenticated'`, no qué
  usuario es. Por eso **el registro de usuarios en Supabase debe seguir
  DESACTIVADO** (Authentication → Sign In / Providers → "Allow new users to sign
  up"). Estaba activado y cualquiera podía crearse una cuenta y leer leads,
  suscriptores y precios de compra. Mejora pendiente: atar las políticas al UID
  del cliente.
- Lectura pública: solo `vehiculos` con `publicado = true` y el bucket `coches`.
- Inserción pública: solo `vistas` (contador). Los leads se guardan desde los
  endpoints con la clave de servicio; la política pública de `leads` se quitó el
  24/09/2026 (`sql/2026-09-quitar-insert-publico-leads.sql`).
- `suscriptores` no tiene política DELETE: la baja la hace `/api/baja` con la
  clave de servicio.
- `vehiculos_privado`: clave primaria `vehiculo_id`, con `ON DELETE CASCADE`.

### RLS — la trampa que más tiempo costó

**Si una política RLS bloquea un DELETE o UPDATE, Supabase NO devuelve error:** borra
0 filas y dice que todo fue bien. El código creía que había funcionado y al recargar
seguía todo ahí.

Por eso, **encadenar `.select()` a todo delete/update** y comprobar que volvió algo:

```js
const { data, error } = await supabase.from('leads').delete().eq('id', id).select()
if (error) return alert('Error: ' + error.message)
if (!data?.length) return alert('No se borró nada: falta la política DELETE (RLS).')
```

### Límite de 1000 filas — la otra trampa

**Supabase devuelve como máximo 1000 filas por consulta**, sin avisar. El gráfico de
visitas del panel se congeló un día exacto porque `vistas` pasó de 1000 filas y el
`select` solo traía las más antiguas.

Solución aplicada: **agregar en la base de datos**, no en el navegador. Funciones RPC
creadas: `vistas_por_dia(dias int)`, `vistas_por_coche()`, `vistas_totales()`.

`notificar.js` ya lee los suscriptores en páginas de 1000 con `.range()`. Queda
latente en la bandeja de leads del panel (`select('*')` sin paginar).

---

## 5. Funcionalidades montadas

### Web pública
Home con destacados + ocasión de la semana + últimas incorporaciones; catálogo con
filtros (barra lateral sticky en PC, panel deslizante en móvil, nueve dimensiones de
filtro, orden por precio/año/km, contador en vivo en el botón); ficha con galería
(swipe, miniaturas en carrusel, lightbox), calculadora de cuota, ficha técnica visual
con siluetas SVG acotadas; "a la carta"; servicios; nosotros; contacto con mapa;
newsletter; chatbot; banner de cookies; tres páginas legales.

### Panel de admin
Login (Supabase Auth); dashboard con métricas y gráficos Chart.js + tareas/notas/
clientes; gestión de vehículos (listado con filtros y acciones Editar / Ocultar /
Ocultar precio / Borrar / Avisar); alta y edición; estadísticas (visitas, ranking con
medallas, coche más y menos visto, motor de sugerencias por reglas, "Consejo de hoy"
generado con Gemini y cacheado por día en localStorage); bandeja de leads.

### Correos (Resend)
- `lead.js` y `lead-chatbot.ts` → avisos de contacto, "a la carta" y chatbot a
  **ventas@guadicar.es** (en pruebas, a `LEAD_EMAIL_TO`), con `replyTo` al cliente.
  Comparten validaciones y envío en `src/lib/leads.js`.
- `notificar.js` → avisos a suscriptores, **por lotes de 100** (`resend.batch.send`)
  para no agotar el tiempo de la función. Cada correo lleva su enlace de baja
  personal y las cabeceras `List-Unsubscribe`. El tipo (novedad / bajada) se elige
  en el panel, y "bajada" solo se permite si `precio_anterior > precio`. No deja
  avisar de coches ocultos, reservados o con precio oculto.
- `suscribir.js` → alta en la newsletter. `baja.js` + `/baja` → baja.

### Chatbot
Anclado al stock real (responde con enlace a la ficha del coche), resuelve dudas
generales, deriva a "Quiero que me llamen" y guarda el lead (con antispam y aviso
por correo). Avisa de que es una IA (Reglamento Europeo de IA, art. 50). No recibe
el precio de coches con precio oculto o reservados. Límite por IP best-effort.

### Caché en el CDN de Netlify
Home, catálogo, fichas y sitemap de coches se cachean 1 hora en Netlify (etiqueta
`coches`, ver `src/lib/cache.js`). El panel la purga (`/api/purgar`) al guardar,
ocultar, borrar o cambiar el precio de un coche. **Si se cambia algo de un coche
directamente en Supabase, tarda hasta una hora en verse** (o guardar cualquier
coche desde el panel, o redesplegar).

---

## 6. Lecciones aprendidas — leer antes de tocar estas zonas

### Imágenes: la batalla larga

El cliente sube fotos **HEIC desde dispositivos Apple** (iPhone y Mac). Recorrido:

1. Se montó compresión en canvas → WebP. Funcionaba en Windows/Chrome (~290 KB) pero
   desde iPhone subía archivos de 3 MB.
2. Se intentó `heic2any` por CDN → **el navegador lo bloqueaba** ("Tracking Prevention
   blocked access"). Se pasó a `npm install heic2any` + import dinámico.
3. Seguía fallando en iPhone. Causa real, confirmada con `alert()` paso a paso:
   **Safari iOS no sabe generar WebP con `canvas.toBlob`** — ignora el formato y
   devuelve un PNG sin comprimir, pero el código le ponía extensión `.webp`. Un PNG
   gigante disfrazado de WebP.

**Solución actual: salida en JPEG**, que Safari sí genera. Parámetros: **máx 1400px,
calidad 0.75**. Resultado: ~290 KB desde Windows, ~540 KB desde iPhone. Se decidió
**no** perseguir el WebP con librerías WebAssembly: el ahorro (~100 KB) no compensa la
fragilidad.

Reglas que quedan de aquí:
- **No volver a poner `toBlob(..., 'image/webp')`** sin probarlo en Safari iOS real.
- Nunca poner una extensión que no corresponde al contenido real del blob.
- En iPhone **todos los navegadores usan el motor de Safari** (Apple lo obliga):
  probar en "Chrome iOS" es probar Safari.
- El `accept` del input está en `image/jpeg,image/png,image/webp` **a propósito**: al
  no aceptar HEIC, iOS/macOS convierten la foto a JPEG al elegirla desde Fototeca. Si
  se añade `.heic` al accept, se rompe esa conversión automática.
- Las fotos ya subidas no se reprocesan solas: hay que resubirlas.
- Al quitar una foto con la ✕ **no se borra del Storage**, queda huérfana. Orden
  seguro: primero guardar el coche, después borrar del Storage. Nunca al revés.

### Anti-spam en formularios

Llegaban ~20 leads basura al día de bots (nombres aleatorios, teléfonos de 10 dígitos
formato USA, emails con el truco de los puntos de Gmail). Blindaje en tres capas,
aplicado en contacto, "a la carta" y newsletter:

1. **Honeypot**: campo oculto `empresa`. Oculto con `position:absolute; left:-9999px`
   — **no con `display:none`**, que muchos bots detectan.
2. **Trampa de tiempo**: `ts` con el momento de carga; envíos en <3s (leads) o <2s
   (newsletter) se descartan.
3. **Validación en servidor**: teléfono español o internacional con `+`, nombres
   sospechosos (alternancias raras de mayúsculas), mensajes con 2+ URLs, emails
   desechables.

Los bloqueos **devuelven `{ok:true}` falso** para que el bot no aprenda. Quedan
registrados en los logs de Netlify como `[lead] Bloqueado por...` — mirar ahí si
alguien dice que escribió y no llegó nada.

También se escapan las variables del usuario en el HTML del email (`esc()`), para que
nadie cuele enlaces de phishing en el correo que recibe el cliente.

### Astro / CSS

- Los `<style>` con scope de Astro **no llegan al DOM inyectado por JS** → usar
  `<style is:global>` para elementos creados con `innerHTML`.
- `// @ts-nocheck` al principio de los `<script>` del navegador: los errores TS ahí son
  falsas alarmas. **Pero un error TS real rompe el script entero en silencio.**
- `overflow-x: hidden` en `body` **rompe `position: sticky`**. Usar `overflow-x: clip`,
  que recorta igual pero no crea contenedor de scroll. Así se arregló la barra de
  filtros del catálogo. **Sin paréntesis**: estuvo meses como `clip()`, que es CSS
  inválido y el navegador ignoraba.
- `Astro.rewrite('/404')` **no funciona** desde una página dinámica hacia una
  estática (error ForbiddenRewrite), y pedir `/404` con `fetch` al propio servidor
  se queda colgado en local. El 404 de las fichas se resuelve renderizando
  `NoEncontrado.astro` con `Astro.response.status = 404`.
- Astro rechaza por defecto los POST de formulario que vienen de otro dominio
  (`security.checkOrigin`). Está desactivado en `astro.config.mjs` porque bloqueaba
  la baja en un clic de Gmail/Outlook; los endpoints solo aceptan JSON y los del
  panel exigen el token en cabecera.
- Netlify sirve las páginas estáticas **con barra final** (`/contacto` → 301 →
  `/contacto/`) y no se puede cambiar con redirecciones. Enlaces internos y
  canonical van con barra; las fichas de coche, sin barra.
- En local, si `npm run dev` dice "Port 4321 is in use", hay un servidor viejo
  colgado: cerrarlo antes de probar o las pruebas irán contra él.
- Listeners que se reañaden en cada repintado se acumulan y duplican acciones. En el
  reordenado de fotos se usa asignación directa (`item.ondrop = ...`) en vez de
  `addEventListener`.
- La clase `.reveal` (animación de entrada) **entra en conflicto con reordenar nodos
  por `appendChild`**: hizo desaparecer tarjetas al filtrar el catálogo. No usarla en
  listas que se reordenan.

### Gemini

Endpoint `generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
cabecera `x-goog-api-key`. **Requiere `generationConfig.thinkingConfig.thinkingBudget = 0`**
o devuelve respuestas truncadas o vacías. Reintentos con backoff ante 429/503. La key
solo en el servidor, nunca en el navegador.

---

## 7. Cómo trabaja Saúl

- Español, tuteo, directo.
- Trabaja **desde iPhone** buena parte del tiempo → código **en bloques para pegar**,
  nunca archivos descargables.
- Avanza pieza a pieza: pega, prueba, describe el resultado.
- Cuando algo se enreda con parches sucesivos, prefiere **el archivo completo** a
  ediciones quirúrgicas.
- Coordina el proyecto entre dos conversaciones de Claude en paralelo, así que algo
  puede estar ya hecho "en la otra" — preguntar antes de rehacer.

---

## 8. Estado actual y pendientes

### Cerrado
Web en producción con HTTPS · `.com` redirige al `.es` vía `public/_redirects` con
301 · correos reales funcionando · imágenes optimizadas · panel responsive · legales
con datos fiscales reales · SEO técnico (sitemaps enviados a Search Console,
robots.txt, canonical, schema AutoDealer + Car + BreadcrumbList) · anti-spam ·
precio oculto · sello RESERVADO · imágenes huérfanas limpiadas · web antigua
deshabilitada.

Revisión de septiembre 2026 (rama `desarrollo`): endpoints del panel cerrados con
token · avisos por lotes con enlace de baja · edición de coches ocultos y datos
privados arreglada · leads del chatbot con antispam y aviso por correo · aviso de IA
en el chat · 404 real para coches retirados · precio oculto fuera de los datos para
Google y del chatbot · sitemap con fechas reales · caché en el CDN con purga ·
canonical unificado · marcas normalizadas en el formulario · ejemplo representativo
de financiación · cabeceras de seguridad · registro de Supabase desactivado.

### Fusión a `main` del 24/09/2026 — comprobado en producción

- "Avisar" real enviado a 10 suscriptores (sin modo pruebas). ✅
- Lead del chatbot llega al panel. ✅
- `sql/2026-09-normalizar-marcas.sql` ejecutado (15 coches corregidos). ✅
- `sql/2026-09-quitar-insert-publico-leads.sql` ejecutado. ✅
- Quitados los avisos de "datos pendientes" de aviso legal y privacidad. ✅

### Pendiente — técnico

1. **Atar las políticas RLS al UID del cliente** en vez de a "cualquier usuario
   autenticado" (hoy depende de que el registro siga desactivado).
2. **Analítica real** (Plausible o Umami). El contador propio solo cuenta fichas de
   coche, no home ni catálogo, y se rompió una vez sin que nadie se enterara hasta que
   el cliente se quejó.
3. **Astro 6→7** cuando haya tiempo y con el procedimiento de la sección 1. Además
   corrige un aviso de seguridad de Astro que `npm audit` marca como crítico.
4. Miniaturas de fotos (hoy la galería usa la foto de 1400 px también como miniatura).

### Pendiente — SEO

Datos reales de Search Console (28 días, septiembre 2026):

| Consulta | Posición media |
|---|---|
| guadicar / guadicar multimarcas | 1,0–1,1 |
| concesionario segunda mano | 1,5 |
| concesionarios villanueva de la serena | 3,5 |
| coches villanueva de la serena | 6,1 |
| **coches segunda mano villanueva de la serena** | **17,1** |

Patrón claro: posiciona bien con **"concesionario"** y mal con **"segunda mano"** —
porque la web dice "ocasión" y "Km0" en todas partes, y "segunda mano" casi no
aparece. Acciones acordadas, **sin aplicar todavía**:

- Meter "segunda mano" de forma natural en title, H1 y meta description de home y
  catálogo.
- Crear una página específica `/coches-segunda-mano-villanueva-de-la-serena`.

Matiz importante para no malinterpretar los datos: el 3,5 de "concesionarios
villanueva de la serena" viene casi todo del **bloque de mapas**, donde la ficha de
Google sale tercera. En resultados orgánicos la web está en la página 8. Escalar ahí
es cuestión de meses (dominio nuevo compitiendo contra Flexicar y portales).

### Pendiente — depende del cliente

- **Reseñas de Google**: tienen 5,0 con solo **11 reseñas**; la competencia del mismo
  polígono tiene 54, 62 y 107. Es lo que más impacto tendría en el mapa local, y no
  depende de código: que pidan la reseña en la entrega del coche, con QR o enlace.
- Responder a todas las reseñas.
- Vídeo de instalaciones y frase de empresa para la home.

---

## 9. Datos del negocio (para copys y schema)

```
GuadiCar Multimarcas
Polígono Cagancha, 39 · 06700 Villanueva de la Serena (BADAJOZ)
Coordenadas: 38.9678152, -5.8003009
Horario: L-V 10:00–14:00 y 17:00–21:00 · Sáb 10:00–13:00 · Dom cerrado
Email: ventas@guadicar.es
Instagram: @guadicar_multimarcas
Titular (autónomo): Jose Juan Carmona Ponce · NIF 52963849R
```

**Los dos teléfonos, que han causado confusión:**

- **722 49 61 24** → atención al cliente del negocio. Es el que va en la **web**
  (navbar, footer, contacto, chatbot, fichas).
- **696 352 820** → solo para **información legal** (aviso legal, privacidad) y es el
  que aparece en la ficha de Google.

**Badajoz, no Guadalajara.** El nombre despista y es crítico para el SEO local.

Paleta y tipografía: `--red: #cc1c1c`, negro, blanco. **Inter** (`--font`) para texto
y **Montserrat** (`--font-h`) para titulares. Estética limpia estilo HR Motor.
