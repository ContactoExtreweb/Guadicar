// Marcas de coche escritas siempre igual. El cliente escribe la marca a mano y
// entraban variantes (VOLKSWAGEN / Volkswagen / Wolkvagen) que duplicaban las
// opciones del filtro del catálogo.

export const MARCAS = [
  'Abarth', 'Alfa Romeo', 'Aston Martin', 'Audi', 'Bentley', 'BMW', 'BYD',
  'Chevrolet', 'Chrysler', 'Citroën', 'Cupra', 'Dacia', 'Dodge', 'DS',
  'Ferrari', 'Fiat', 'Ford', 'Honda', 'Hyundai', 'Infiniti', 'Isuzu', 'Iveco',
  'Jaguar', 'Jeep', 'Kia', 'Lamborghini', 'Lancia', 'Land Rover', 'Lexus',
  'Lynk & Co', 'Maserati', 'Mazda', 'Mercedes-Benz', 'MG', 'Mini',
  'Mitsubishi', 'Nissan', 'Omoda', 'Opel', 'Peugeot', 'Polestar', 'Porsche',
  'Renault', 'SEAT', 'Skoda', 'Smart', 'SsangYong', 'Subaru', 'Suzuki',
  'Tesla', 'Toyota', 'Volkswagen', 'Volvo',
]

// Formas cortas o habituales que no se parecen lo bastante al nombre oficial
const ALIAS = {
  vw: 'Volkswagen',
  mercedes: 'Mercedes-Benz',
  alfa: 'Alfa Romeo',
  landrover: 'Land Rover',
  lynk: 'Lynk & Co',
}

// Para comparar: sin mayúsculas, tildes, espacios ni guiones
export const clave = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

const POR_CLAVE = new Map([
  ...MARCAS.map((m) => [clave(m), m]),
  ...Object.entries(ALIAS),
])

// Distancia de Levenshtein: cuántas letras hay que cambiar para ir de a a b
function distancia(a, b) {
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let diagonal = fila[0]
    fila[0] = i
    for (let j = 1; j <= b.length; j++) {
      const arriba = fila[j]
      fila[j] = Math.min(
        fila[j] + 1,
        fila[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
      diagonal = arriba
    }
  }
  return fila[b.length]
}

// Devuelve { marca } con la forma oficial si la reconoce, o { marca,
// sugerencia } si parece una errata de una marca conocida. Si no se parece a
// ninguna, la deja con la primera letra de cada palabra en mayúscula.
export function normalizarMarca(texto) {
  const t = String(texto ?? '').trim().replace(/\s+/g, ' ')
  const k = clave(t)
  if (!k) return { marca: t }

  const exacta = POR_CLAVE.get(k)
  if (exacta) return { marca: exacta }

  // Errata: solo en nombres de 4 letras o más, y con 1 fallo por cada 3 letras
  if (k.length >= 4) {
    const tolerancia = Math.max(1, Math.floor(k.length / 3))
    let mejor = null
    let menor = Infinity
    for (const m of MARCAS) {
      const d = distancia(k, clave(m))
      if (d < menor) {
        menor = d
        mejor = m
      }
    }
    if (mejor && menor <= tolerancia) return { marca: t, sugerencia: mejor }
  }

  const bonita = t
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep, letra) => sep + letra.toUpperCase())
  return { marca: bonita }
}
