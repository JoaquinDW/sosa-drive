/**
 * Reglas del plan de cuotas de un crédito propio.
 *
 * El plan queda definido por tres datos: el primer vencimiento, el día de pago
 * acordado y la cantidad de cuotas. De ahí se derivan todos los vencimientos,
 * que son los que permiten saber si el cliente está al día o debe.
 *
 * Módulo puro (sin acceso a datos): lo usan las Server Actions, el seed y la UI.
 */

function dosDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

/** Cantidad de días del mes `mes` (1-12) de `anio`. */
function diasDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/**
 * Vencimiento de la cuota `numero` (empieza en 1): el mes del primer
 * vencimiento corrido `numero - 1` meses, el día de pago acordado.
 *
 * Si el mes no llega a ese día (el 31 en abril, el 30 en febrero) la cuota
 * vence el último día del mes. Nunca se pasa al mes siguiente: sumar meses con
 * `Date` haría que el 31 de enero cayera en marzo y correría todo el plan.
 */
export function vencimientoDeCuota(
  primerVencimiento: string,
  diaPago: number,
  numero: number,
): string {
  const [anio, mes] = primerVencimiento.split("-").map(Number);
  const corridos = mes - 1 + (numero - 1);
  const anioCuota = anio + Math.floor(corridos / 12);
  const mesCuota = (corridos % 12) + 1;
  const dia = Math.min(diaPago, diasDelMes(anioCuota, mesCuota));
  return `${anioCuota}-${dosDigitos(mesCuota)}-${dosDigitos(dia)}`;
}

/** Los vencimientos de todo el plan, en orden (cuota 1 primero). */
export function vencimientosDelPlan(
  primerVencimiento: string,
  diaPago: number,
  cantidadCuotas: number,
): string[] {
  return Array.from({ length: cantidadCuotas }, (_, i) =>
    vencimientoDeCuota(primerVencimiento, diaPago, i + 1),
  );
}

/**
 * Día de pago anotado a mano en la planilla del cliente: "todos los 16",
 * "paga los 15", "paga 20". Devuelve `undefined` si no hay ninguno anotado —
 * no se inventa un día que la fuente no registra.
 */
export function diaDePagoAnotado(observaciones?: string): number | undefined {
  const m = observaciones?.match(/(?:todos los|paga los|paga)\s+(\d{1,2})\b/i);
  const dia = m ? Number(m[1]) : undefined;
  return dia && dia >= 1 && dia <= 31 ? dia : undefined;
}
