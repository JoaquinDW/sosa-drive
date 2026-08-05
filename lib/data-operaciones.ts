import "server-only";

import { query } from "./db/pool";
import type {
  ClienteOperaciones,
  Compra,
  Credito,
  Cuota,
  Deudor,
  Gasto,
  GastoTaller,
  KpisFinancieros,
  MovimientoCaja,
  MovimientoInventario,
  OrdenTaller,
  RegistroAuditoria,
  Repuesto,
  UnidadInventario,
  Venta,
} from "./types";

/**
 * Capa de datos del módulo de Operaciones (PRD-modelo-base.md).
 *
 * Consulta PostgreSQL directamente (paquete `pg`). Las vistas derivadas
 * (deudores, KPIs financieros) se calculan en JS sobre los getters.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fila = Record<string, any>;

function num(v: unknown): number | undefined {
  return v === null || v === undefined ? undefined : Number(v);
}

function mapearUnidad(f: Fila): UnidadInventario {
  return {
    id: f.id,
    marca: f.marca,
    modelo: f.modelo,
    cilindrada: f.cilindrada ?? undefined,
    anio: f.anio ?? undefined,
    dominio: f.dominio ?? undefined,
    numeroMotor: f.numero_motor ?? undefined,
    numeroCuadro: f.numero_cuadro ?? undefined,
    color: f.color ?? "",
    condicion: f.condicion,
    estado: f.estado,
    ubicacion: f.ubicacion,
    precioCompra: num(f.precio_compra),
    precioVenta: num(f.precio_venta),
    fechaIngreso: f.fecha_ingreso,
    fechaVenta: f.fecha_venta ?? undefined,
    observaciones: f.observaciones ?? undefined,
  };
}

export async function obtenerUnidadesInventario(): Promise<UnidadInventario[]> {
  const filas = await query(
    "select * from unidades_inventario order by marca, modelo",
  );
  return filas.map(mapearUnidad);
}

export async function obtenerUnidadInventario(
  id: string,
): Promise<UnidadInventario | undefined> {
  const filas = await query(
    "select * from unidades_inventario where id = $1",
    [id],
  );
  return filas[0] ? mapearUnidad(filas[0]) : undefined;
}

export async function obtenerMovimientosInventario(
  unidadId?: string,
): Promise<MovimientoInventario[]> {
  const filas = unidadId
    ? await query(
        "select * from movimientos_inventario where unidad_id = $1 order by fecha desc",
        [unidadId],
      )
    : await query(
        "select * from movimientos_inventario order by fecha desc",
      );
  return filas.map((f) => ({
    id: f.id,
    unidadId: f.unidad_id,
    tipo: f.tipo,
    origen: f.origen ?? undefined,
    destino: f.destino ?? undefined,
    motivo: f.motivo,
    usuario: f.usuario,
    observaciones: f.observaciones ?? undefined,
    fecha: f.fecha,
  }));
}

export async function obtenerCompras(): Promise<Compra[]> {
  const [compras, unidades] = await Promise.all([
    query("select * from compras order by fecha desc"),
    query("select id, compra_id from unidades_inventario"),
  ]);
  const porCompra = new Map<string, string[]>();
  for (const u of unidades) {
    if (!u.compra_id) continue;
    porCompra.set(u.compra_id, [...(porCompra.get(u.compra_id) ?? []), u.id]);
  }
  return compras.map((f) => ({
    id: f.id,
    proveedor: f.proveedor,
    factura: f.factura,
    fecha: f.fecha,
    costoTotal: Number(f.costo_total),
    formaPago: f.forma_pago,
    observaciones: f.observaciones ?? undefined,
    unidadIds: porCompra.get(f.id) ?? [],
  }));
}

export async function obtenerVentas(): Promise<Venta[]> {
  const filas = await query("select * from ventas order by fecha desc");
  return filas.map((f) => ({
    id: f.id,
    unidadId: f.unidad_id ?? undefined,
    descripcion: f.descripcion,
    clienteId: f.cliente_id ?? undefined,
    precio: num(f.precio),
    costo: num(f.costo),
    ganancia: num(f.ganancia),
    metodo: f.metodo,
    montoFinanciera: num(f.monto_financiera),
    vendedor: f.vendedor,
    canal: f.canal ?? undefined,
    fecha: f.fecha,
    creditoId: f.credito_id ?? undefined,
  }));
}

export async function obtenerClientesOperaciones(): Promise<
  ClienteOperaciones[]
> {
  const filas = await query(
    "select * from clientes_operaciones order by nombre",
  );
  return filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    telefono: f.telefono ?? undefined,
    dni: f.dni ?? undefined,
    observaciones: f.observaciones ?? undefined,
  }));
}

export async function obtenerCreditos(): Promise<Credito[]> {
  const filas = await query(
    "select * from creditos order by numero nulls last, creado_en desc",
  );
  return filas.map((f) => ({
    id: f.id,
    numero: f.numero ?? undefined,
    ventaId: f.venta_id ?? undefined,
    clienteId: f.cliente_id,
    descripcionMoto: f.descripcion_moto ?? undefined,
    capital: num(f.capital),
    cuotaMensual: num(f.cuota_mensual),
    totalAPagar: num(f.total_a_pagar),
    cantidadCuotas: f.cantidad_cuotas ?? undefined,
    estado: f.estado,
    observaciones: f.observaciones ?? undefined,
    creadoEn: f.creado_en,
  }));
}

export async function obtenerCuotas(): Promise<Cuota[]> {
  const filas = await query("select * from cuotas order by vencimiento");
  return filas.map((f) => ({
    id: f.id,
    creditoId: f.credito_id,
    numero: f.numero,
    vencimiento: f.vencimiento,
    monto: Number(f.monto),
    estado: f.estado,
    pagadaEn: f.pagada_en ?? undefined,
  }));
}

export async function obtenerOrdenesTaller(): Promise<OrdenTaller[]> {
  const filas = await query(
    "select * from ordenes_taller order by numero desc",
  );
  return filas.map((f) => ({
    id: f.id,
    numero: f.numero,
    clienteNombre: f.cliente_nombre,
    unidadId: f.unidad_id ?? undefined,
    motoDescripcion: f.moto_descripcion,
    motivo: f.motivo,
    mecanico: f.mecanico,
    prioridad: f.prioridad,
    estado: f.estado,
    fechaIngreso: f.fecha_ingreso,
    fechaEstimada: f.fecha_estimada ?? undefined,
    fechaEntrega: f.fecha_entrega ?? undefined,
    observaciones: f.observaciones ?? undefined,
  }));
}

export async function obtenerGastosTaller(): Promise<GastoTaller[]> {
  const filas = await query("select * from gastos_taller");
  return filas.map((f) => ({
    id: f.id,
    ordenId: f.orden_id,
    tipo: f.tipo,
    descripcion: f.descripcion,
    monto: Number(f.monto),
  }));
}

export async function obtenerRepuestos(): Promise<Repuesto[]> {
  const filas = await query("select * from repuestos order by codigo");
  return filas.map((f) => ({
    id: f.id,
    codigo: f.codigo,
    nombre: f.nombre,
    categoria: f.categoria,
    marca: f.marca ?? undefined,
    proveedor: f.proveedor ?? undefined,
    costo: Number(f.costo),
    precio: Number(f.precio),
    cantidad: f.cantidad,
    stockMinimo: f.stock_minimo,
    ubicacion: f.ubicacion ?? "",
  }));
}

export async function obtenerGastos(): Promise<Gasto[]> {
  const filas = await query("select * from gastos order by fecha desc");
  return filas.map((f) => ({
    id: f.id,
    fecha: f.fecha,
    categoria: f.categoria,
    importe: Number(f.importe),
    descripcion: f.descripcion,
    metodoPago: f.metodo_pago,
    responsable: f.responsable,
    proveedor: f.proveedor ?? undefined,
  }));
}

export async function obtenerMovimientosCaja(): Promise<MovimientoCaja[]> {
  const filas = await query(
    "select * from movimientos_caja order by fecha desc",
  );
  return filas.map((f) => ({
    id: f.id,
    fecha: f.fecha,
    tipo: f.tipo,
    categoria: f.categoria,
    descripcion: f.descripcion,
    monto: Number(f.monto),
    referencia: f.referencia ?? undefined,
  }));
}

export async function obtenerAuditoria(): Promise<RegistroAuditoria[]> {
  const filas = await query(
    "select * from auditoria order by fecha desc limit 300",
  );
  return filas.map((f) => ({
    id: f.id,
    fecha: f.fecha,
    usuario: f.usuario,
    accion: f.accion,
    entidad: f.entidad,
    detalle: f.detalle,
  }));
}

// ---------------------------------------------------------------------------
// Vistas derivadas
// ---------------------------------------------------------------------------

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Marca como vencidas las cuotas pendientes cuyo vencimiento ya pasó. */
export function conVencimientos(cuotas: Cuota[]): Cuota[] {
  const hoy = hoyISO();
  return cuotas.map((c) =>
    c.estado === "pendiente" && c.vencimiento < hoy
      ? { ...c, estado: "vencida" as const }
      : c,
  );
}

export async function obtenerDeudores(): Promise<Deudor[]> {
  const [creditos, cuotas, clientes, ventas] = await Promise.all([
    obtenerCreditos(),
    obtenerCuotas(),
    obtenerClientesOperaciones(),
    obtenerVentas(),
  ]);
  const hoy = new Date(`${hoyISO()}T00:00:00Z`);
  const efectivas = conVencimientos(cuotas);
  const deudores: Deudor[] = [];

  for (const credito of creditos) {
    const propias = efectivas.filter((c) => c.creditoId === credito.id);
    const vencidas = propias.filter((c) => c.estado === "vencida");
    if (vencidas.length === 0) continue;
    const cliente = clientes.find((c) => c.id === credito.clienteId);
    const venta = ventas.find((v) => v.id === credito.ventaId);
    if (!cliente) continue;
    const masVieja = vencidas.reduce((a, b) =>
      a.vencimiento < b.vencimiento ? a : b,
    );
    const diasAtraso = Math.floor(
      (hoy.getTime() - new Date(`${masVieja.vencimiento}T00:00:00Z`).getTime()) /
        86_400_000,
    );
    const proxima = propias.find((c) => c.estado === "pendiente");
    deudores.push({
      cliente,
      credito,
      ventaDescripcion: credito.descripcionMoto ?? venta?.descripcion ?? "—",
      cuotasVencidas: vencidas.length,
      montoVencido: vencidas.reduce((acc, c) => acc + c.monto, 0),
      diasAtraso,
      proximoVencimiento: proxima?.vencimiento,
    });
  }

  return deudores.sort((a, b) => b.montoVencido - a.montoVencido);
}

export async function obtenerKpisFinancieros(): Promise<KpisFinancieros> {
  const [unidades, ventas, gastos, compras, cuotas, creditos, caja] =
    await Promise.all([
      obtenerUnidadesInventario(),
      obtenerVentas(),
      obtenerGastos(),
      obtenerCompras(),
      obtenerCuotas(),
      obtenerCreditos(),
      obtenerMovimientosCaja(),
    ]);

  const mes = hoyISO().slice(0, 7);
  // Si el mes en curso todavía no registró ventas (p. ej. recién arranca),
  // se muestra el último mes con actividad.
  const mesesConVentas = [...new Set(ventas.map((v) => v.fecha.slice(0, 7)))]
    .sort()
    .reverse();
  const mesActivo = ventas.some((v) => v.fecha.startsWith(mes))
    ? mes
    : (mesesConVentas[0] ?? mes);

  const enStock = unidades.filter(
    (u) => u.estado !== "vendida" && u.estado !== "baja",
  );
  const ventasMes = ventas.filter((v) => v.fecha.startsWith(mesActivo));
  const gastosMes = gastos.filter((g) => g.fecha.startsWith(mesActivo));
  const comprasMes = compras.filter((c) => c.fecha.startsWith(mesActivo));

  const efectivas = conVencimientos(cuotas);
  const activas = new Set(
    creditos
      .filter((c) => c.estado === "al_dia" || c.estado === "en_mora")
      .map((c) => c.id),
  );
  const cuotasActivas = efectivas.filter((c) => activas.has(c.creditoId));
  const cobrado = cuotasActivas
    .filter((c) => c.estado === "pagada")
    .reduce((acc, c) => acc + c.monto, 0);
  const pendiente = cuotasActivas
    .filter((c) => c.estado === "pendiente" || c.estado === "vencida")
    .reduce((acc, c) => acc + c.monto, 0);
  const morosos = new Set(
    cuotasActivas
      .filter((c) => c.estado === "vencida")
      .map((c) => c.creditoId),
  );

  const gananciaBruta = ventasMes.reduce((acc, v) => acc + (v.ganancia ?? 0), 0);
  const totalGastosMes = gastosMes.reduce((acc, g) => acc + g.importe, 0);

  return {
    stockTotal: enStock.length,
    stockUsadas: enStock.filter((u) => u.condicion === "usada").length,
    stock0km: enStock.filter((u) => u.condicion === "0km").length,
    unidadesSinPrecio: enStock.filter((u) => u.precioVenta === undefined)
      .length,
    valorInventario: enStock.reduce((acc, u) => acc + (u.precioVenta ?? 0), 0),
    costoInventario: enStock.reduce((acc, u) => acc + (u.precioCompra ?? 0), 0),
    ventasMes: ventasMes.length,
    facturacionMes: ventasMes.reduce((acc, v) => acc + (v.precio ?? 0), 0),
    gananciaBrutaMes: gananciaBruta,
    comprasMes: comprasMes.reduce((acc, c) => acc + c.costoTotal, 0),
    gastosMes: totalGastosMes,
    gananciaNetaMes: gananciaBruta - totalGastosMes,
    montoFinanciado: creditos
      .filter((c) => activas.has(c.id))
      .reduce((acc, c) => acc + (c.totalAPagar ?? 0), 0),
    cobrado,
    pendienteCobro: pendiente,
    deudores: morosos.size,
    saldoCaja: caja.reduce(
      (acc, m) => acc + (m.tipo === "ingreso" ? m.monto : -m.monto),
      0,
    ),
  };
}
