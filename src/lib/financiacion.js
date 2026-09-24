// Financiación orientativa. La TAE es el dato comercial; el interés que se
// aplica cada mes sale de ella: (1 + TAE)^(1/12) - 1. Antes se usaba TAE/12,
// que es tratar la TAE como si fuera el TIN y daba cuotas algo más altas.
export const TAE = 7.99
export const MESES = 96
const interesMensual = (tae) => Math.pow(1 + tae / 100, 1 / 12) - 1
export const TIN = Math.round(interesMensual(TAE) * 12 * 10000) / 100 // 7,71 %

export function computeCuota(
  precio,
  { entrada = 0, meses = MESES, tae = TAE } = {},
) {
  const capital = Math.max(precio - entrada, 0)
  const r = interesMensual(tae)
  return Math.round((capital * r) / (1 - Math.pow(1 + r, -meses)))
}

// Ejemplo representativo para acompañar a "desde X €/mes" (Ley 16/2011 de
// crédito al consumo, art. 9). Sin comisiones ni entrada.
export function ejemploFinanciacion(precio) {
  const cuota = computeCuota(precio)
  return {
    importe: precio,
    meses: MESES,
    cuota,
    tin: TIN,
    tae: TAE,
    totalAdeudado: cuota * MESES,
  }
}
