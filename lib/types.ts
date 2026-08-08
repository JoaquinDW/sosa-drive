export type Rol =
  | "gerente"
  | "vendedor"
  | "administracion"
  | "contabilidad"
  | "taller";

export type EstadoLead =
  | "nuevo"
  | "contactado"
  | "calificado"
  | "visita"
  | "negociacion"
  | "vendido"
  | "perdido";

export type FuenteLead =
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "web"
  | "google"
  | "mercadolibre"
  | "referido"
  | "llamada";

export type FormaPago = "contado" | "financiado" | "permuta" | "mixto";

export type Canal = Exclude<FuenteLead, "referido">;

export type TipoEventoLead =
  | "ingreso"
  | "asignacion"
  | "mensaje"
  | "llamada"
  | "ia"
  | "visita"
  | "nota"
  | "estado"
  | "cotizacion";

export type TipoEventoAgenda =
  | "visita"
  | "test_drive"
  | "llamada"
  | "entrega"
  | "service"
  | "recordatorio";

export type ModoDistribucion =
  | "round_robin"
  | "prioridad"
  | "especialista"
  | "compulsa";

export interface Vendedor {
  id: string;
  nombre: string;
  rol: Rol;
  avatarUrl?: string;
  nivel: number;
  xp: number;
  insignias: Insignia[];
  ventasMes: number;
  facturacionMes: number;
  conversion: number; // 0..1
  tiempoRespuestaSeg: number;
  leadsAbiertos: number;
}

export interface MiembroEquipo {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  avatarUrl?: string;
  activo: boolean;
  creadoEn: string;
}

export interface Insignia {
  id: string;
  nombre: string;
  descripcion: string;
  icono: "trofeo" | "rayo" | "fuego" | "dinero" | "estrella";
}

export interface Moto {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  precio: number;
  precioFinanciado: number;
  descripcion: string;
  motor: string;
  cilindrada: number;
  consumo: string;
  velocidadMaxima: number;
  garantia: string;
  colores: string[];
  stock: number;
  imagenUrl?: string;
}

export interface UnidadStock {
  id: string;
  motoId: string;
  numeroMotor: string;
  numeroCuadro: string;
  sucursal: string;
  color: string;
  estado: "disponible" | "reservada" | "vendida" | "en_transito";
}

export interface Lead {
  id: string;
  nombre: string;
  dni?: string;
  telefono: string;
  email?: string;
  ciudad: string;
  fuente: FuenteLead;
  motoInteresId?: string;
  motoAlternativaId?: string;
  presupuesto?: number;
  formaPago: FormaPago;
  financiacion: boolean;
  permuta?: string;
  estado: EstadoLead;
  score: number; // 0..100
  scoreMotivo?: string;
  vendedorId?: string;
  notas?: string;
  creadoEn: string; // ISO
  ultimoContactoEn?: string; // ISO
}

export interface EventoLead {
  id: string;
  leadId: string;
  tipo: TipoEventoLead;
  descripcion: string;
  actor: string; // "IA", nombre del vendedor, "Sistema", "Cliente"
  creadoEn: string; // ISO
}

export interface Conversacion {
  id: string;
  leadId: string;
  canal: Canal;
  noLeidos: number;
  ultimoMensaje: string;
  ultimoMensajeEn: string; // ISO
  asignadoA?: string; // vendedorId
}

export interface Mensaje {
  id: string;
  conversacionId: string;
  autor: "cliente" | "vendedor" | "ia";
  contenido: string;
  notaPrivada?: boolean;
  creadoEn: string; // ISO
}

// ---------------------------------------------------------------------------
// Módulo WhatsApp (bot de Baileys, tablas wa_* — independientes del CRM)
// ---------------------------------------------------------------------------

/** 'ia' = responde el bot con OpenAI; 'humano' = responde una persona desde el panel. */
export type ModoWa = "ia" | "humano";

export type RolWaMensaje = "cliente" | "ia" | "humano";

export type EstadoConexionWa = "desconectado" | "qr" | "conectando" | "conectado";

export interface WaConversacion {
  id: string; // bigint de Postgres, llega como string
  telefono: string;
  nombre: string | null;
  modo: ModoWa;
  /** Lead del CRM que el bot creó para este chat. Null hasta que escriban. */
  leadId: string | null;
  ultimoMensaje: string | null;
  ultimoMensajeEn: string | null; // ISO
}

/**
 * Ficha del cliente que se muestra al costado del hilo de WhatsApp: lo que el
 * bot cualificador viene juntando, sin tener que salir del chat. El perfil
 * completo (timeline, notas) vive en /leads/[id].
 */
export interface FichaLeadWa {
  id: string;
  nombre: string;
  telefono: string;
  ciudad: string;
  estado: EstadoLead;
  score: number;
  scoreMotivo?: string;
  formaPago: FormaPago;
  presupuesto?: number;
  permuta?: string;
  /** "Honda Wave 110 S", ya resuelto contra el catálogo. */
  motoInteres?: string;
  vendedor?: string;
  creadoEn: string; // ISO
  ultimoContactoEn?: string; // ISO
}

export interface WaMensaje {
  id: string;
  rol: RolWaMensaje;
  contenido: string;
  creadoEn: string; // ISO
}

export interface WaEstadoConexion {
  estado: EstadoConexionWa;
  telefono: string | null;
  /** QR como PNG data-url, solo cuando hay un código vigente para escanear. */
  qr: string | null;
  actualizadoEn: string; // ISO
}

export interface Tarea {
  id: string;
  titulo: string;
  descripcion?: string;
  leadId?: string;
  vendedorId: string;
  venceEn: string; // ISO
  completadaEn?: string; // ISO
  prioridad: "alta" | "media" | "baja";
}

export interface EventoAgenda {
  id: string;
  tipo: TipoEventoAgenda;
  titulo: string;
  leadId?: string;
  vendedorId: string;
  inicio: string; // ISO
  fin: string; // ISO
  notas?: string;
  estado: "pendiente" | "confirmado" | "completado" | "cancelado";
}

export interface AlertaIA {
  id: string;
  severidad: "alta" | "media" | "baja";
  mensaje: string;
  accion?: string;
}

export interface KpisHoy {
  leads: number;
  leadsDeltaPct: number;
  sinResponder: number;
  calientes: number;
  visitasAgendadas: number;
  ventas: number;
  facturacion: number;
  facturacionDeltaPct: number;
  conversion: number; // 0..1
  tiempoRespuestaSeg: number;
}

export interface EtapaEmbudo {
  etapa: string;
  cantidad: number;
}

export interface OrigenLeads {
  fuente: FuenteLead;
  cantidad: number;
}

// ---------------------------------------------------------------------------
// Módulo de Operaciones (PRD-modelo-base.md)
// ---------------------------------------------------------------------------

export type CondicionUnidad = "0km" | "usada";

export type EstadoUnidad =
  | "disponible"
  | "reservada"
  | "vendida"
  | "en_taller"
  | "en_reparacion"
  | "en_transito"
  | "en_garantia"
  | "baja";

export type UbicacionUnidad =
  | "salon"
  | "deposito"
  | "taller"
  | "sucursal"
  | "proveedor"
  | "cliente";

export type MetodoVenta =
  | "contado"
  | "credito_casa"
  | "credito_directo"
  | "credito_argentino"
  | "santander";

export type CanalVenta =
  | "publicidad"
  | "marketplace"
  | "cliente_propio"
  | "instagram";

export type TipoMovimientoInventario =
  | "compra"
  | "ingreso"
  | "transferencia"
  | "venta"
  | "reserva"
  | "ingreso_taller"
  | "salida_taller"
  | "permuta"
  | "baja"
  | "correccion";

/** Fila cruda importada del Excel del cliente (lib/datos-reales.ts). */
export interface UnidadInventarioBase {
  id: string;
  marca: string;
  modelo: string;
  cilindrada?: number;
  anio?: number;
  dominio?: string;
  color: string;
  condicion: CondicionUnidad;
  estado: EstadoUnidad;
  ubicacion: UbicacionUnidad;
  precioCompra?: number;
  precioVenta?: number;
  metodoVenta?: MetodoVenta;
  vendedor?: string;
}

/** Venta importada de los Excel del dueño (lib/datos-reales.ts). */
export interface VentaImportadaBase {
  id: string;
  /** Unidad del inventario matcheada (solo ventas de julio). */
  unidadId?: string;
  descripcion: string;
  precio?: number;
  costo?: number;
  gananciaContado?: number;
  gananciaFinanciado?: number;
  metodo: MetodoVenta;
  montoFinanciera?: number;
  vendedor: string;
  canal?: CanalVenta;
  fecha: string; // YYYY-MM-DD
}

/**
 * Crédito importado de la cartera real del cliente
 * ("control de cuotas.xlsx", lib/datos-cartera.ts). La planilla no registra
 * teléfono, capital ni historial de pagos: esos campos quedan vacíos.
 */
export interface CreditoCarteraBase {
  numero?: number;
  nombre: string;
  moto: string;
  cantidadCuotas?: number;
  cuotaMensual?: number;
  observaciones?: string;
}

/**
 * Unidad física del inventario. Cada moto es única (el activo principal hoy;
 * el modelo admite otros activos a futuro según el PRD).
 */
export interface UnidadInventario {
  id: string;
  marca: string;
  modelo: string;
  cilindrada?: number;
  anio?: number;
  dominio?: string;
  numeroMotor?: string;
  numeroCuadro?: string;
  color: string;
  condicion: CondicionUnidad;
  estado: EstadoUnidad;
  ubicacion: UbicacionUnidad;
  precioCompra?: number;
  precioVenta?: number;
  fechaIngreso: string; // YYYY-MM-DD
  fechaVenta?: string; // YYYY-MM-DD
  observaciones?: string;
}

/** Kardex: todo cambio del inventario queda registrado y nunca se modifica. */
export interface MovimientoInventario {
  id: string;
  unidadId: string;
  tipo: TipoMovimientoInventario;
  origen?: string;
  destino?: string;
  motivo: string;
  usuario: string;
  observaciones?: string;
  fecha: string; // ISO
}

export interface Compra {
  id: string;
  proveedor: string;
  factura: string;
  fecha: string; // YYYY-MM-DD
  costoTotal: number;
  formaPago: string;
  observaciones?: string;
  unidadIds: string[];
}

export interface Venta {
  id: string;
  /** Unidad del inventario de julio; las ventas de junio no tienen unidad. */
  unidadId?: string;
  descripcion: string;
  clienteId?: string;
  precio?: number;
  costo?: number;
  ganancia?: number;
  metodo: MetodoVenta;
  /** Lo que liquida la financiera (Santander, Crédito Directo, etc.). */
  montoFinanciera?: number;
  vendedor: string;
  canal?: CanalVenta;
  fecha: string; // YYYY-MM-DD
  creditoId?: string;
}

export interface ClienteOperaciones {
  id: string;
  nombre: string;
  telefono?: string;
  dni?: string;
  observaciones?: string;
}

export type EstadoCredito = "al_dia" | "en_mora" | "cancelado" | "refinanciado";

export type EstadoCuota =
  | "pendiente"
  | "pagada"
  | "vencida"
  | "refinanciada"
  | "cancelada";

/**
 * Plan de crédito propio ("de la casa"). Los importados de la cartera del
 * cliente no tienen venta asociada ni capital conocido: la planilla original
 * solo registra cliente, moto, cuota mensual y cantidad de cuotas.
 */
export interface Credito {
  id: string;
  /** Número de plan en la planilla del cliente. */
  numero?: number;
  ventaId?: string;
  clienteId: string;
  descripcionMoto?: string;
  capital?: number;
  cuotaMensual?: number;
  totalAPagar?: number;
  cantidadCuotas?: number;
  /** Día del mes en que vence cada cuota; el plan se deriva de acá. */
  diaPago?: number;
  /** Vencimiento de la cuota 1: ancla del plan. */
  fechaInicio?: string; // YYYY-MM-DD
  estado: EstadoCredito;
  observaciones?: string;
  creadoEn: string; // YYYY-MM-DD
}

export interface Cuota {
  id: string;
  creditoId: string;
  numero: number;
  vencimiento: string; // YYYY-MM-DD
  monto: number;
  estado: EstadoCuota;
  pagadaEn?: string; // YYYY-MM-DD
}

/** Vista derivada de un plan: cómo viene pagando el cliente. */
export interface ResumenPlan {
  estado: EstadoCredito;
  cuotas: number;
  cuotasPagadas: number;
  cuotasVencidas: number;
  cobrado: number;
  montoVencido: number;
  /** Lo que falta cobrar: vencido + por vencer. */
  saldo: number;
  proximoVencimiento?: string; // YYYY-MM-DD
}

/** Vista derivada para administración: clientes con cuotas vencidas. */
export interface Deudor {
  cliente: ClienteOperaciones;
  credito: Credito;
  ventaDescripcion: string;
  cuotasVencidas: number;
  montoVencido: number;
  diasAtraso: number;
  proximoVencimiento?: string; // YYYY-MM-DD
}

export type EstadoOrdenTaller =
  | "pendiente"
  | "en_reparacion"
  | "esperando_repuestos"
  | "finalizada"
  | "entregada"
  | "cancelada";

export type TipoGastoTaller =
  | "repuestos"
  | "insumos"
  | "horas"
  | "servicio_externo";

export interface OrdenTaller {
  id: string;
  numero: number;
  clienteNombre: string;
  unidadId?: string;
  motoDescripcion: string;
  motivo: string;
  mecanico: string;
  prioridad: "alta" | "media" | "baja";
  estado: EstadoOrdenTaller;
  fechaIngreso: string; // YYYY-MM-DD
  fechaEstimada?: string; // YYYY-MM-DD
  fechaEntrega?: string; // YYYY-MM-DD
  observaciones?: string;
}

export interface GastoTaller {
  id: string;
  ordenId: string;
  tipo: TipoGastoTaller;
  descripcion: string;
  monto: number;
}

export interface Repuesto {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  marca?: string;
  proveedor?: string;
  costo: number;
  precio: number;
  cantidad: number;
  stockMinimo: number;
  ubicacion: string;
}

export type CategoriaGasto =
  | "sueldos"
  | "combustible"
  | "servicios"
  | "alquiler"
  | "impuestos"
  | "taller"
  | "repuestos"
  | "marketing"
  | "otros";

export interface Gasto {
  id: string;
  fecha: string; // YYYY-MM-DD
  categoria: CategoriaGasto;
  importe: number;
  descripcion: string;
  metodoPago: string;
  responsable: string;
  proveedor?: string;
}

export type CategoriaCaja =
  | "venta"
  | "cobro_cuota"
  | "cobro_financiera"
  | "servicio_taller"
  | "compra"
  | "gasto"
  | "sueldos"
  | "otro";

export interface MovimientoCaja {
  id: string;
  fecha: string; // YYYY-MM-DD
  tipo: "ingreso" | "egreso";
  categoria: CategoriaCaja;
  descripcion: string;
  monto: number;
  referencia?: string;
}

export interface RegistroAuditoria {
  id: string;
  fecha: string; // ISO
  usuario: string;
  accion: string;
  entidad: string;
  detalle: string;
}

/**
 * Alerta derivada de los datos de operaciones (stock sin precio, mora, taller
 * demorado…). No es la "alerta IA" de la Fase 2: acá no hay modelo, son reglas
 * calculadas sobre lo que ya está registrado.
 */
export interface AlertaOperativa {
  id: string;
  severidad: "alta" | "media" | "baja";
  mensaje: string;
  accion?: { etiqueta: string; href: string };
}

/** Ranking de vendedores del mes, calculado desde las ventas registradas. */
export interface RankingVendedor {
  nombre: string;
  ventas: number;
  facturacion: number;
  ganancia: number;
}

/** Cuota por vencer en los próximos días, con el cliente y la moto del plan. */
export interface VencimientoProximo {
  cuota: Cuota;
  clienteNombre: string;
  descripcionMoto: string;
}

export interface KpisFinancieros {
  stockTotal: number;
  stockUsadas: number;
  stock0km: number;
  unidadesSinPrecio: number;
  valorInventario: number;
  costoInventario: number;
  ventasMes: number;
  facturacionMes: number;
  gananciaBrutaMes: number;
  comprasMes: number;
  gastosMes: number;
  gananciaNetaMes: number;
  montoFinanciado: number;
  cobrado: number;
  pendienteCobro: number;
  deudores: number;
  saldoCaja: number;
}
