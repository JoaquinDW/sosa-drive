import type {
  ClienteOperaciones,
  Compra,
  Credito,
  Cuota,
  Gasto,
  GastoTaller,
  MovimientoCaja,
  MovimientoInventario,
  OrdenTaller,
  RegistroAuditoria,
  Repuesto,
  UnidadInventario,
  Venta,
  VentaImportadaBase,
} from "./types";
import { UNIDADES_JULIO, VENTAS_JUNIO, VENTAS_JULIO } from "./datos-reales";
import { CARTERA_AGOSTO } from "./datos-cartera";
import { diaDePagoAnotado, vencimientoDeCuota } from "./creditos";

/**
 * Datos demo del módulo de Operaciones.
 *
 * La base (unidades y ventas de junio) sale de los Excel reales del cliente
 * (lib/datos-reales.ts). Lo que el Excel no registra —números de motor y
 * cuadro, fechas de ingreso, kardex, clientes, planes de cuotas, órdenes de
 * taller, gastos, caja— se deriva acá en forma determinística para que el
 * demo sea recorrible y consistente entre recargas.
 */

// Hash determinístico simple para derivar valores estables por id.
function hash(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function fechaISO(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return fechaISO(d);
}

// ---------------------------------------------------------------------------
// Unidades del inventario (julio 2026)
// ---------------------------------------------------------------------------

const PREFIJO_MOTOR: Record<number, string> = {
  70: "147FMD",
  110: "152FMH",
  125: "156FMI",
  150: "162FMJ",
  160: "JF171",
  200: "PD195",
  250: "PD250",
  300: "PD300",
};

// Lotes de compra 0km: fecha de ingreso por marca (los dominios correlativos
// A296JM* y A300IC* del Excel delatan patentamientos en tandas).
const INGRESO_0KM: Record<string, string> = {
  Motomel: "2026-06-27",
  Keller: "2026-06-18",
  Ika: "2026-06-24",
  Gilera: "2026-06-18",
  Honda: "2026-06-11",
};

function numeroMotorDe(id: string, cilindrada?: number): string {
  const prefijo = PREFIJO_MOTOR[cilindrada ?? 110] ?? "152FMH";
  return `${prefijo}-${String(hash(`motor-${id}`) % 10_000_000).padStart(7, "0")}`;
}

function numeroCuadroDe(id: string): string {
  const letras = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
  let n = hash(`cuadro-${id}`);
  let sufijo = "";
  for (let i = 0; i < 11; i++) {
    sufijo += letras[n % letras.length];
    n = Math.floor(n / letras.length) + hash(`c${i}${id}`) % 7;
  }
  return `8CH${sufijo}`;
}

// Fecha real de venta: la trae la planilla de ventas de julio para las
// unidades matcheadas. La vendida que no figura ahí queda sin fecha.
function fechaVentaDe(id: string): string | undefined {
  return VENTAS_JULIO.find((v) => v.unidadId === id)?.fecha;
}

function fechaIngresoDe(u: (typeof UNIDADES_JULIO)[number]): string {
  if (u.condicion === "0km") return INGRESO_0KM[u.marca] ?? "2026-06-20";
  // Usadas: ingresos repartidos entre mayo y julio; si se vendió en julio,
  // el ingreso queda siempre antes de la venta.
  const dias = hash(`ingreso-${u.id}`) % (u.estado === "vendida" ? 55 : 85);
  return sumarDias("2026-05-01", dias);
}

export const unidadesInventario: UnidadInventario[] = UNIDADES_JULIO.map(
  (u) => ({
    id: u.id,
    marca: u.marca,
    modelo: u.modelo,
    cilindrada: u.cilindrada,
    anio: u.anio,
    dominio: u.dominio,
    numeroMotor: numeroMotorDe(u.id, u.cilindrada),
    numeroCuadro: numeroCuadroDe(u.id),
    color: u.color,
    condicion: u.condicion,
    estado: u.estado,
    ubicacion: u.ubicacion,
    precioCompra: u.precioCompra,
    precioVenta: u.precioVenta,
    fechaIngreso: fechaIngresoDe(u),
    fechaVenta: u.estado === "vendida" ? fechaVentaDe(u.id) : undefined,
    observaciones:
      u.dominio === undefined && u.condicion === "usada"
        ? "Dominio pendiente de verificar"
        : undefined,
  }),
);

export function buscarUnidad(id: string): UnidadInventario | undefined {
  return unidadesInventario.find((u) => u.id === id);
}

export function descripcionUnidad(u: UnidadInventario): string {
  return `${u.marca} ${u.modelo}${u.anio ? ` ${u.anio}` : ""}`;
}

// ---------------------------------------------------------------------------
// Compras a proveedores (lotes 0km)
// ---------------------------------------------------------------------------

const MARCAS_0KM = ["Motomel", "Keller", "Ika", "Gilera", "Honda"];

export const compras: Compra[] = MARCAS_0KM.map((marca, i) => {
  const unidades = unidadesInventario.filter(
    (u) => u.condicion === "0km" && u.marca === marca,
  );
  return {
    id: `co${i + 1}`,
    proveedor: `${marca} (mayorista)`,
    factura: `A-0001${230 + i}`,
    fecha: INGRESO_0KM[marca],
    costoTotal: unidades.reduce((acc, u) => acc + (u.precioCompra ?? 0), 0),
    formaPago: i % 2 === 0 ? "Transferencia" : "Cheque a 30 días",
    unidadIds: unidades.map((u) => u.id),
    observaciones:
      marca === "Keller"
        ? "Incluye patentamiento en tanda (dominios correlativos)"
        : undefined,
  };
}).filter((c) => c.unidadIds.length > 0);

// ---------------------------------------------------------------------------
// Clientes y ventas
// ---------------------------------------------------------------------------

// Los clientes vienen de la cartera real de créditos ("control de cuotas.xlsx"):
// nombre real, sin teléfono ni DNI porque la planilla no los registra.
// Las ventas de los Excel del dueño no identifican al comprador, así que
// quedan sin cliente asociado en lugar de inventarle uno.
export const clientes: ClienteOperaciones[] = CARTERA_AGOSTO.map((c, i) => ({
  id: `cl-cart-${c.numero ?? `s${i}`}`,
  nombre: c.nombre,
}));

function mapearVentaImportada(v: VentaImportadaBase): Venta {
  return {
    id: v.id,
    unidadId: v.unidadId,
    descripcion: v.descripcion,
    precio: v.precio,
    costo: v.costo,
    ganancia:
      v.gananciaContado ??
      (v.precio !== undefined && v.costo !== undefined
        ? v.precio - v.costo
        : undefined),
    metodo: v.metodo,
    montoFinanciera: v.montoFinanciera,
    vendedor: v.vendedor,
    canal: v.canal,
    fecha: v.fecha,
  };
}

const ventasJulio: Venta[] = VENTAS_JULIO.map(mapearVentaImportada);

export const ventas: Venta[] = [
  ...VENTAS_JUNIO.map(mapearVentaImportada),
  ...ventasJulio,
].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

export function buscarCliente(id: string): ClienteOperaciones | undefined {
  return clientes.find((c) => c.id === id);
}

// ---------------------------------------------------------------------------
// Créditos propios: la cartera real de agosto
// ---------------------------------------------------------------------------

// La planilla registra el estado presente de cada plan (cuota mensual y
// cantidad de cuotas), no el historial de pagos. Por eso se genera una sola
// cuota por crédito —la del mes en curso, pendiente— y ninguna pagada ni
// vencida: la mora se irá registrando al cargar los pagos en el sistema.
export const creditos: Credito[] = [];
export const cuotas: Cuota[] = [];

const FECHA_IMPORTACION = "2026-08-03";
const MES_IMPORTACION = "2026-08-01";

for (const [i, c] of CARTERA_AGOSTO.entries()) {
  const cliente = clientes[i];
  const creditoId = `cr-cart-${c.numero ?? `s${i}`}`;
  // El día de pago venía anotado en las observaciones de la planilla; el que
  // no lo tiene queda sin definir para que administración lo cargue.
  const diaPago = diaDePagoAnotado(c.observaciones);
  const primerVencimiento =
    c.cuotaMensual !== undefined
      ? // Sin día anotado, la cuota del mes vence a fin de mes (convención de
        // la importación, no dato del cliente).
        vencimientoDeCuota(MES_IMPORTACION, diaPago ?? 31, 1)
      : undefined;

  creditos.push({
    id: creditoId,
    numero: c.numero,
    clienteId: cliente.id,
    descripcionMoto: c.moto,
    cuotaMensual: c.cuotaMensual,
    cantidadCuotas: c.cantidadCuotas,
    totalAPagar:
      c.cuotaMensual !== undefined && c.cantidadCuotas !== undefined
        ? c.cuotaMensual * c.cantidadCuotas
        : undefined,
    diaPago,
    fechaInicio: primerVencimiento,
    estado: "al_dia",
    observaciones: c.observaciones,
    creadoEn: FECHA_IMPORTACION,
  });

  if (c.cuotaMensual !== undefined && primerVencimiento !== undefined) {
    cuotas.push({
      id: `${creditoId}-ago`,
      creditoId,
      numero: 1,
      vencimiento: primerVencimiento,
      monto: c.cuotaMensual,
      estado: "pendiente",
    });
  }
}

export function cuotasDeCredito(creditoId: string): Cuota[] {
  return cuotas.filter((c) => c.creditoId === creditoId);
}

// ---------------------------------------------------------------------------
// Taller: órdenes de trabajo y gastos asociados
// ---------------------------------------------------------------------------

const MOTIVOS_TALLER = [
  "Service completo + cambio de aceite",
  "Embrague patina, revisar disco y placa",
  "Tren delantero: horquilla golpeada",
  "Falla eléctrica, no carga la batería",
  "Frenos: cambio de pastillas y purga",
  "Kit de arrastre vencido (cadena y piñón)",
  "Carburación: ajuste y limpieza",
  "No arranca, revisar burro de arranque",
  "Cambio de cubiertas y cámaras",
  "Preparación para venta: revisión general",
  "Pérdida de aceite por tapa de válvulas",
] as const;

const MECANICOS = ["Raúl Medina", "Cristian Vega"] as const;

const unidadesEnTaller = unidadesInventario.filter(
  (u) => u.estado === "en_taller",
);

const ESTADOS_ORDEN_CICLO = [
  "en_reparacion",
  "esperando_repuestos",
  "pendiente",
  "en_reparacion",
  "finalizada",
] as const;

const ordenesInternas: OrdenTaller[] = unidadesEnTaller.map((u, i) => ({
  id: `ot${String(i + 1).padStart(2, "0")}`,
  numero: 1001 + i,
  clienteNombre: "Sosa Drive (stock propio)",
  unidadId: u.id,
  motoDescripcion: descripcionUnidad(u),
  motivo: MOTIVOS_TALLER[i % MOTIVOS_TALLER.length],
  mecanico: MECANICOS[i % MECANICOS.length],
  prioridad: (["alta", "media", "baja"] as const)[hash(`prio-${u.id}`) % 3],
  estado: ESTADOS_ORDEN_CICLO[i % ESTADOS_ORDEN_CICLO.length],
  fechaIngreso: sumarDias("2026-07-06", hash(`ot-${u.id}`) % 20),
  fechaEstimada: sumarDias("2026-08-04", hash(`est-${u.id}`) % 10),
  observaciones:
    u.observaciones !== undefined
      ? "Verificar dominio antes de publicar"
      : undefined,
}));

// Posventa: motos vendidas en junio que vuelven al primer service. La planilla
// de ventas no identifica al comprador, así que el cliente queda sin nombre.
const ordenesExternas: OrdenTaller[] = [0, 4, 9].map((ventaIdx, i) => {
  const venta = ventas.filter((v) => v.fecha.startsWith("2026-06"))[ventaIdx];
  return {
    id: `ot${String(ordenesInternas.length + i + 1).padStart(2, "0")}`,
    numero: 1001 + ordenesInternas.length + i,
    clienteNombre: "Sin nombre (comprador de junio)",
    motoDescripcion: venta.descripcion,
    motivo: "Primer service (posventa)",
    mecanico: MECANICOS[i % MECANICOS.length],
    prioridad: "media" as const,
    estado: (i === 0 ? "entregada" : i === 1 ? "finalizada" : "pendiente") as OrdenTaller["estado"],
    fechaIngreso: sumarDias("2026-07-15", i * 6),
    fechaEstimada: sumarDias("2026-07-17", i * 6),
    fechaEntrega: i === 0 ? "2026-07-18" : undefined,
  };
});

export const ordenesTaller: OrdenTaller[] = [
  ...ordenesInternas,
  ...ordenesExternas,
];

const GASTOS_TALLER_POSIBLES: [GastoTaller["tipo"], string, number][] = [
  ["repuestos", "Kit de arrastre 110cc", 45_000],
  ["repuestos", "Pastillas de freno delanteras", 18_000],
  ["repuestos", "Batería 12V 5Ah", 38_000],
  ["insumos", "Aceite 10W40 x1L + filtro", 16_000],
  ["horas", "Mano de obra (2 h)", 30_000],
  ["horas", "Mano de obra (4 h)", 60_000],
  ["servicio_externo", "Rectificación de cilindro (tercero)", 85_000],
  ["insumos", "Líquido de frenos y grasa", 8_000],
];

export const gastosTaller: GastoTaller[] = ordenesTaller.flatMap((orden) => {
  if (orden.estado === "pendiente") return [];
  const cantidad = 1 + (hash(`gt-${orden.id}`) % 3);
  return Array.from({ length: cantidad }, (_, j) => {
    const [tipo, descripcion, monto] =
      GASTOS_TALLER_POSIBLES[hash(`gt-${orden.id}-${j}`) % GASTOS_TALLER_POSIBLES.length];
    return {
      id: `${orden.id}-g${j + 1}`,
      ordenId: orden.id,
      tipo,
      descripcion,
      monto,
    };
  });
});

export function gastosDeOrden(ordenId: string): GastoTaller[] {
  return gastosTaller.filter((g) => g.ordenId === ordenId);
}

// ---------------------------------------------------------------------------
// Inventario de repuestos
// ---------------------------------------------------------------------------

export const repuestos: Repuesto[] = [
  { id: "r01", codigo: "REP-001", nombre: "Aceite 10W40 mineral x1L", categoria: "Lubricantes", marca: "YPF", proveedor: "Lubricentro ER", costo: 6_500, precio: 11_000, cantidad: 24, stockMinimo: 12, ubicacion: "Estantería A1" },
  { id: "r02", codigo: "REP-002", nombre: "Filtro de aire Wave/Smash 110", categoria: "Filtros", proveedor: "Repuestos del Este", costo: 4_200, precio: 8_500, cantidad: 6, stockMinimo: 8, ubicacion: "Estantería A2" },
  { id: "r03", codigo: "REP-003", nombre: "Kit de arrastre 110cc (cadena + piñón + corona)", categoria: "Transmisión", marca: "Choho", proveedor: "Repuestos del Este", costo: 28_000, precio: 45_000, cantidad: 9, stockMinimo: 5, ubicacion: "Estantería B1" },
  { id: "r04", codigo: "REP-004", nombre: "Pastillas de freno delanteras 110/150", categoria: "Frenos", marca: "Frasle", proveedor: "Frenos Litoral", costo: 9_500, precio: 18_000, cantidad: 3, stockMinimo: 6, ubicacion: "Estantería B2" },
  { id: "r05", codigo: "REP-005", nombre: "Batería 12V 5Ah gel", categoria: "Eléctrica", marca: "Moura", proveedor: "Baterías Uruguay", costo: 22_000, precio: 38_000, cantidad: 7, stockMinimo: 4, ubicacion: "Depósito" },
  { id: "r06", codigo: "REP-006", nombre: "Bujía NGK C7HSA", categoria: "Eléctrica", marca: "NGK", proveedor: "Repuestos del Este", costo: 3_800, precio: 7_000, cantidad: 30, stockMinimo: 15, ubicacion: "Cajonera C1" },
  { id: "r07", codigo: "REP-007", nombre: "Cámara 2.75-18", categoria: "Neumáticos", proveedor: "Gomería Central", costo: 5_500, precio: 10_000, cantidad: 12, stockMinimo: 6, ubicacion: "Depósito" },
  { id: "r08", codigo: "REP-008", nombre: "Cubierta 90/90-18 trasera", categoria: "Neumáticos", marca: "Pirelli", proveedor: "Gomería Central", costo: 42_000, precio: 68_000, cantidad: 2, stockMinimo: 4, ubicacion: "Depósito" },
  { id: "r09", codigo: "REP-009", nombre: "Lámpara 12V 35/35W", categoria: "Eléctrica", proveedor: "Repuestos del Este", costo: 2_200, precio: 4_500, cantidad: 18, stockMinimo: 10, ubicacion: "Cajonera C2" },
  { id: "r10", codigo: "REP-010", nombre: "Juego de juntas motor 110cc", categoria: "Motor", proveedor: "Repuestos del Este", costo: 7_800, precio: 14_000, cantidad: 5, stockMinimo: 3, ubicacion: "Estantería B3" },
  { id: "r11", codigo: "REP-011", nombre: "Cable de embrague universal", categoria: "Comandos", proveedor: "Repuestos del Este", costo: 3_000, precio: 6_500, cantidad: 1, stockMinimo: 5, ubicacion: "Cajonera C3" },
  { id: "r12", codigo: "REP-012", nombre: "Puños + espejos kit", categoria: "Accesorios", proveedor: "Moto Accesorios SR", costo: 8_500, precio: 16_000, cantidad: 11, stockMinimo: 4, ubicacion: "Estantería A3" },
];

// ---------------------------------------------------------------------------
// Gastos generales
// ---------------------------------------------------------------------------

export const gastos: Gasto[] = [
  { id: "g01", fecha: "2026-07-01", categoria: "alquiler", importe: 1_200_000, descripcion: "Alquiler salón + taller (julio)", metodoPago: "Transferencia", responsable: "Administración" },
  { id: "g02", fecha: "2026-07-05", categoria: "servicios", importe: 185_000, descripcion: "Energía eléctrica (bimestre)", metodoPago: "Débito automático", responsable: "Administración" },
  { id: "g03", fecha: "2026-07-05", categoria: "servicios", importe: 55_000, descripcion: "Internet + telefonía", metodoPago: "Débito automático", responsable: "Administración" },
  { id: "g04", fecha: "2026-07-08", categoria: "marketing", importe: 320_000, descripcion: "Pauta Meta Ads (publicidad julio)", metodoPago: "Tarjeta de crédito", responsable: "Gerencia" },
  { id: "g05", fecha: "2026-07-10", categoria: "combustible", importe: 90_000, descripcion: "Combustible trámites y pruebas", metodoPago: "Efectivo", responsable: "Gerencia" },
  { id: "g06", fecha: "2026-07-12", categoria: "repuestos", importe: 480_000, descripcion: "Reposición de repuestos (Repuestos del Este)", metodoPago: "Cuenta corriente", responsable: "Taller", proveedor: "Repuestos del Este" },
  { id: "g07", fecha: "2026-07-15", categoria: "impuestos", importe: 410_000, descripcion: "IIBB + monotributo empleados", metodoPago: "Transferencia", responsable: "Contador" },
  { id: "g08", fecha: "2026-07-18", categoria: "taller", importe: 65_000, descripcion: "Herramientas: torquímetro y extractores", metodoPago: "Efectivo", responsable: "Taller" },
  { id: "g09", fecha: "2026-07-21", categoria: "otros", importe: 48_000, descripcion: "Papelería y limpieza", metodoPago: "Efectivo", responsable: "Administración" },
  { id: "g10", fecha: "2026-07-24", categoria: "marketing", importe: 150_000, descripcion: "Cartelería promo 0km", metodoPago: "Transferencia", responsable: "Gerencia" },
  { id: "g11", fecha: "2026-07-31", categoria: "sueldos", importe: 2_850_000, descripcion: "Sueldos vendedores (Alexis, Ezequiel, Miguel)", metodoPago: "Transferencia", responsable: "Administración" },
  { id: "g12", fecha: "2026-07-31", categoria: "sueldos", importe: 1_750_000, descripcion: "Sueldos taller (2 mecánicos)", metodoPago: "Transferencia", responsable: "Administración" },
  { id: "g13", fecha: "2026-06-30", categoria: "sueldos", importe: 2_780_000, descripcion: "Sueldos vendedores (junio)", metodoPago: "Transferencia", responsable: "Administración" },
  { id: "g14", fecha: "2026-06-30", categoria: "sueldos", importe: 1_700_000, descripcion: "Sueldos taller (junio)", metodoPago: "Transferencia", responsable: "Administración" },
  { id: "g15", fecha: "2026-06-01", categoria: "alquiler", importe: 1_200_000, descripcion: "Alquiler salón + taller (junio)", metodoPago: "Transferencia", responsable: "Administración" },
  { id: "g16", fecha: "2026-06-09", categoria: "marketing", importe: 290_000, descripcion: "Pauta Meta Ads (publicidad junio)", metodoPago: "Tarjeta de crédito", responsable: "Gerencia" },
];

// ---------------------------------------------------------------------------
// Movimientos de inventario (kardex)
// ---------------------------------------------------------------------------

export const movimientosInventario: MovimientoInventario[] = [];

for (const u of unidadesInventario) {
  const compra = compras.find((c) => c.unidadIds.includes(u.id));
  if (compra) {
    movimientosInventario.push({
      id: `m-${u.id}-in`,
      unidadId: u.id,
      tipo: "compra",
      origen: compra.proveedor,
      destino: "Salón",
      motivo: `Compra 0km — factura ${compra.factura}`,
      usuario: "Gerencia",
      fecha: `${u.fechaIngreso}T09:00:00.000Z`,
    });
  } else {
    const esPermuta = hash(`origen-${u.id}`) % 3 === 0;
    movimientosInventario.push({
      id: `m-${u.id}-in`,
      unidadId: u.id,
      tipo: esPermuta ? "permuta" : "ingreso",
      origen: esPermuta ? "Cliente (permuta)" : "Compra directa a particular",
      destino: "Salón",
      motivo: esPermuta
        ? "Ingreso por permuta vinculada a una venta"
        : "Compra de usada a particular",
      usuario: "Gerencia",
      fecha: `${u.fechaIngreso}T09:00:00.000Z`,
    });
  }

  if (u.estado === "en_taller") {
    const orden = ordenesTaller.find((o) => o.unidadId === u.id);
    movimientosInventario.push({
      id: `m-${u.id}-taller`,
      unidadId: u.id,
      tipo: "salida_taller",
      origen: "Salón",
      destino: "Taller",
      motivo: orden ? `OT ${orden.numero}: ${orden.motivo}` : "Ingreso a taller",
      usuario: orden?.mecanico ?? "Taller",
      fecha: `${orden?.fechaIngreso ?? "2026-07-10"}T10:30:00.000Z`,
    });
  }

  if (u.estado === "vendida" && u.fechaVenta) {
    const venta = ventasJulio.find((v) => v.unidadId === u.id);
    movimientosInventario.push({
      id: `m-${u.id}-venta`,
      unidadId: u.id,
      tipo: "venta",
      origen: "Salón",
      destino: "Cliente",
      motivo: venta
        ? `Venta ${venta.id} (${venta.metodo === "contado" ? "contado" : "financiada"})`
        : "Venta",
      usuario: venta?.vendedor ?? "Ventas",
      fecha: `${u.fechaVenta}T17:00:00.000Z`,
    });
  }
}

// Corrección manual de ejemplo: la ZB sin dominio detectada en el conteo.
const sinDominio = unidadesInventario.find(
  (u) => u.observaciones !== undefined,
);
if (sinDominio) {
  movimientosInventario.push({
    id: `m-${sinDominio.id}-corr`,
    unidadId: sinDominio.id,
    tipo: "correccion",
    motivo: "Conteo físico: unidad sin dominio registrado, se marca para verificar",
    usuario: "Gerencia",
    observaciones: "Detectada en el inventario físico de julio",
    fecha: "2026-07-04T11:15:00.000Z",
  });
}

movimientosInventario.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

export function movimientosDeUnidad(unidadId: string): MovimientoInventario[] {
  return movimientosInventario.filter((m) => m.unidadId === unidadId);
}

// ---------------------------------------------------------------------------
// Caja
// ---------------------------------------------------------------------------

export const movimientosCaja: MovimientoCaja[] = [];

for (const venta of ventas) {
  if (venta.metodo === "contado") {
    if (venta.precio !== undefined) {
      movimientosCaja.push({
        id: `caja-${venta.id}`,
        fecha: venta.fecha,
        tipo: "ingreso",
        categoria: "venta",
        descripcion: `Venta contado — ${venta.descripcion}`,
        monto: venta.precio,
        referencia: venta.id,
      });
    }
  } else if (venta.metodo === "credito_casa") {
    // Crédito propio: se cobra por cuotas; la planilla no registra anticipos,
    // así que no se asienta ningún ingreso al momento de la venta.
  } else if (venta.montoFinanciera !== undefined) {
    movimientosCaja.push({
      id: `caja-${venta.id}`,
      fecha: sumarDias(venta.fecha, 5),
      tipo: "ingreso",
      categoria: "cobro_financiera",
      descripcion: `Liquidación financiera — ${venta.descripcion}`,
      monto: venta.montoFinanciera,
      referencia: venta.id,
    });
  }
}

for (const cuota of cuotas) {
  if (cuota.estado !== "pagada" || !cuota.pagadaEn) continue;
  const credito = creditos.find((c) => c.id === cuota.creditoId)!;
  movimientosCaja.push({
    id: `caja-${cuota.id}`,
    fecha: cuota.pagadaEn,
    tipo: "ingreso",
    categoria: "cobro_cuota",
    descripcion: `Cuota ${cuota.numero} — ${credito.descripcionMoto ?? credito.id}`,
    monto: cuota.monto,
    referencia: cuota.creditoId,
  });
}

for (const compra of compras) {
  movimientosCaja.push({
    id: `caja-${compra.id}`,
    fecha: compra.fecha,
    tipo: "egreso",
    categoria: "compra",
    descripcion: `Compra ${compra.proveedor} — factura ${compra.factura}`,
    monto: compra.costoTotal,
    referencia: compra.id,
  });
}

for (const gasto of gastos) {
  movimientosCaja.push({
    id: `caja-${gasto.id}`,
    fecha: gasto.fecha,
    tipo: "egreso",
    categoria: gasto.categoria === "sueldos" ? "sueldos" : "gasto",
    descripcion: gasto.descripcion,
    monto: gasto.importe,
    referencia: gasto.id,
  });
}

// Órdenes de taller externas facturadas.
for (const orden of ordenesTaller) {
  if (orden.unidadId || orden.estado !== "entregada") continue;
  movimientosCaja.push({
    id: `caja-${orden.id}`,
    fecha: orden.fechaEntrega ?? orden.fechaIngreso,
    tipo: "ingreso",
    categoria: "servicio_taller",
    descripcion: `Service — OT ${orden.numero} (${orden.clienteNombre})`,
    monto: 95_000,
    referencia: orden.id,
  });
}

movimientosCaja.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

// ---------------------------------------------------------------------------
// Auditoría
// ---------------------------------------------------------------------------

export const auditoria: RegistroAuditoria[] = [
  ...movimientosInventario.map((m) => {
    const u = buscarUnidad(m.unidadId)!;
    return {
      id: `aud-${m.id}`,
      fecha: m.fecha,
      usuario: m.usuario,
      accion: `Movimiento de inventario: ${m.tipo}`,
      entidad: `Unidad ${u.dominio ?? u.id.toUpperCase()}`,
      detalle: m.motivo,
    };
  }),
  ...ventas.map((v) => ({
    id: `aud-${v.id}`,
    fecha: `${v.fecha}T17:05:00.000Z`,
    usuario: v.vendedor,
    accion: "Registró una venta",
    entidad: `Venta ${v.id}`,
    detalle: v.descripcion,
  })),
  ...cuotas
    .filter((c) => c.estado === "pagada" && c.pagadaEn)
    .map((c) => ({
      id: `aud-${c.id}`,
      fecha: `${c.pagadaEn}T15:40:00.000Z`,
      usuario: "Administración",
      accion: "Registró un pago de cuota",
      entidad: `Crédito ${c.creditoId}`,
      detalle: `Cuota ${c.numero} cobrada`,
    })),
  ...gastos.map((g) => ({
    id: `aud-${g.id}`,
    fecha: `${g.fecha}T12:20:00.000Z`,
    usuario: g.responsable,
    accion: "Cargó un gasto",
    entidad: `Gasto ${g.id}`,
    detalle: `${g.descripcion} (${g.categoria})`,
  })),
].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
