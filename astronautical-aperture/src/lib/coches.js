import { supabase } from './supabase.js'

const TAE = 7.99,
  MESES = 96
export function computeCuota(
  precio,
  { entrada = 0, meses = MESES, tae = TAE } = {},
) {
  const capital = Math.max(precio - entrada, 0)
  const r = tae / 100 / 12
  return Math.round((capital * r) / (1 - Math.pow(1 + r, -meses)))
}

export const fmt = (n) => Number(n).toLocaleString('es-ES')

export function badgeDe(v) {
  if (v.combustible === 'Eléctrico') return 'Eléctrico'
  if (v.combustible === 'Híbrido') return 'Híbrido'
  return (
    { ocasion: 'Ocasión', km0: 'Km 0', nuevo: 'Nuevo' }[v.estado] ?? 'Ocasión'
  )
}

function mapRow(r) {
  return {
    id: r.id,
    slug: r.slug,
    marca: r.marca,
    modelo: r.modelo,
    version: r.version,
    estado: r.estado,
    carroceria: r.carroceria,
    anio: r.anio,
    km: r.km,
    combustible: r.combustible,
    cambio: r.cambio,
    potencia: r.potencia_cv,
    precio: r.precio,
    precioAnterior: r.precio_anterior,
    certificado: r.certificado,
    destacado: r.destacado,
    ocasionSemana: r.ocasion_semana,
    fotos: r.fotos ?? [],
    equipamiento: r.equipamiento ?? [],
    matriculacion: r.matriculacion,
    traccion: r.traccion,
    puertas: r.puertas,
    plazas: r.plazas,
    consumo: r.consumo,
    emisionesCo2: r.emisiones_co2,
    velMaxima: r.vel_maxima,
    aceleracion: r.aceleracion,
    pesoKg: r.peso_kg,
    depositoL: r.deposito_l,
    maleteroL: r.maletero_l,
    largoM: r.largo_m,
    anchoM: r.ancho_m,
    altoM: r.alto_m,
    ivaDeducible: r.iva_deducible,
    descripcion: r.descripcion,
    cuota: computeCuota(r.precio),
  }
}

export async function getVehiculos() {
  const { data, error } = await supabase
    .from('vehiculos')
    .select('*')
    .eq('publicado', true)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('Error cargando vehículos:', error.message)
    return []
  }
  return data.map(mapRow)
}

export async function getVehiculo(slug) {
  const { data, error } = await supabase
    .from('vehiculos')
    .select('*')
    .eq('slug', slug)
    .eq('publicado', true)
    .maybeSingle()
  if (error || !data) return null
  return mapRow(data)
}

export async function getDestacados(n = 4) {
  const { data, error } = await supabase
    .from('vehiculos')
    .select('*')
    .eq('publicado', true)
    .eq('destacado', true)
    .limit(n)
  if (error) return []
  return data.map(mapRow)
}

export async function getOcasionSemana() {
  const { data, error } = await supabase
    .from('vehiculos')
    .select('*')
    .eq('publicado', true)
    .eq('ocasion_semana', true)
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return mapRow(data)
}
