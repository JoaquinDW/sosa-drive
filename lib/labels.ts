import type {
  CanalVenta,
  CategoriaCaja,
  CategoriaGasto,
  EstadoCredito,
  EstadoCuota,
  EstadoLead,
  EstadoOrdenTaller,
  EstadoUnidad,
  FormaPago,
  FuenteLead,
  MetodoVenta,
  ModoDistribucion,
  TipoEventoAgenda,
  TipoGastoTaller,
  TipoMovimientoInventario,
  UbicacionUnidad,
} from "./types";

export const ESTADOS_LEAD: Record<
  EstadoLead,
  { etiqueta: string; className: string }
> = {
  nuevo: {
    etiqueta: "Nuevo",
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  },
  contactado: {
    etiqueta: "Contactado",
    className:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900",
  },
  calificado: {
    etiqueta: "Calificado",
    className:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900",
  },
  visita: {
    etiqueta: "Visita agendada",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  },
  negociacion: {
    etiqueta: "Negociación",
    className:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900",
  },
  vendido: {
    etiqueta: "Vendido",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  },
  perdido: {
    etiqueta: "Perdido",
    className:
      "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
  },
};

export const ORDEN_PIPELINE: EstadoLead[] = [
  "nuevo",
  "contactado",
  "calificado",
  "visita",
  "negociacion",
  "vendido",
];

export const FUENTES_LEAD: Record<FuenteLead, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  web: "Web",
  google: "Google Ads",
  mercadolibre: "Mercado Libre",
  referido: "Referido",
  llamada: "Llamada",
};

export const FORMAS_PAGO: Record<FormaPago, string> = {
  contado: "Contado",
  financiado: "Financiado",
  permuta: "Permuta",
  mixto: "Contado + permuta",
};

export const TIPOS_AGENDA: Record<
  TipoEventoAgenda,
  { etiqueta: string; className: string }
> = {
  visita: {
    etiqueta: "Visita",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  },
  test_drive: {
    etiqueta: "Test drive",
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
  },
  llamada: {
    etiqueta: "Llamada",
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  },
  entrega: {
    etiqueta: "Entrega",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  },
  service: {
    etiqueta: "Service",
    className:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900",
  },
  recordatorio: {
    etiqueta: "Recordatorio",
    className:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
  },
};

export const MODOS_DISTRIBUCION: Record<
  ModoDistribucion,
  { etiqueta: string; descripcion: string }
> = {
  round_robin: {
    etiqueta: "Round Robin",
    descripcion:
      "Los leads se reparten en orden, uno para cada vendedor. Parejo y simple.",
  },
  prioridad: {
    etiqueta: "Prioridad",
    descripcion:
      "Los leads con mejor score van al vendedor con mejor conversión.",
  },
  especialista: {
    etiqueta: "Especialista",
    descripcion:
      "Cada marca tiene su especialista: Honda, Motomel y CFMoto van a quien más las conoce.",
  },
  compulsa: {
    etiqueta: "Compulsa",
    descripcion:
      "Entra un lead y todos reciben la notificación. El primero en aceptar en 30 segundos se lo queda. Si nadie acepta, se asigna por Round Robin.",
  },
};

export function nivelScore(score: number): {
  etiqueta: string;
  className: string;
} {
  if (score >= 80)
    return {
      etiqueta: "Muy caliente",
      className:
        "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
    };
  if (score >= 60)
    return {
      etiqueta: "Caliente",
      className:
        "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900",
    };
  if (score >= 40)
    return {
      etiqueta: "Tibio",
      className:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
    };
  return {
    etiqueta: "Frío",
    className:
      "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
  };
}

// ---------------------------------------------------------------------------
// Módulo de Operaciones
// ---------------------------------------------------------------------------

const BADGE_VERDE =
  "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900";
const BADGE_AMBAR =
  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900";
const BADGE_AZUL =
  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900";
const BADGE_VIOLETA =
  "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900";
const BADGE_ROJO =
  "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900";
const BADGE_NARANJA =
  "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900";
const BADGE_GRIS =
  "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800";

export const ESTADOS_UNIDAD: Record<
  EstadoUnidad,
  { etiqueta: string; className: string }
> = {
  disponible: { etiqueta: "Disponible", className: BADGE_VERDE },
  reservada: { etiqueta: "Reservada", className: BADGE_AMBAR },
  vendida: { etiqueta: "Vendida", className: BADGE_GRIS },
  en_taller: { etiqueta: "En taller", className: BADGE_VIOLETA },
  en_reparacion: { etiqueta: "En reparación", className: BADGE_NARANJA },
  en_transito: { etiqueta: "En tránsito", className: BADGE_AZUL },
  en_garantia: { etiqueta: "En garantía", className: BADGE_AMBAR },
  baja: { etiqueta: "Baja", className: BADGE_ROJO },
};

export const UBICACIONES_UNIDAD: Record<UbicacionUnidad, string> = {
  salon: "Salón",
  deposito: "Depósito",
  taller: "Taller",
  sucursal: "Sucursal",
  proveedor: "Proveedor",
  cliente: "Cliente",
};

export const METODOS_VENTA: Record<MetodoVenta, string> = {
  contado: "Contado",
  credito_casa: "Crédito propio",
  credito_directo: "Crédito Directo",
  credito_argentino: "Crédito Argentino",
  santander: "Santander",
};

export const CANALES_VENTA: Record<CanalVenta, string> = {
  publicidad: "Publicidad",
  marketplace: "Marketplace",
  cliente_propio: "Cliente propio",
  instagram: "Instagram",
};

export const TIPOS_MOVIMIENTO_INVENTARIO: Record<
  TipoMovimientoInventario,
  string
> = {
  compra: "Compra",
  ingreso: "Ingreso",
  transferencia: "Transferencia",
  venta: "Venta",
  reserva: "Reserva",
  ingreso_taller: "Vuelve de taller",
  salida_taller: "Sale a taller",
  permuta: "Permuta",
  baja: "Baja",
  correccion: "Corrección manual",
};

export const ESTADOS_ORDEN_TALLER: Record<
  EstadoOrdenTaller,
  { etiqueta: string; className: string }
> = {
  pendiente: { etiqueta: "Pendiente", className: BADGE_GRIS },
  en_reparacion: { etiqueta: "En reparación", className: BADGE_AZUL },
  esperando_repuestos: { etiqueta: "Esperando repuestos", className: BADGE_AMBAR },
  finalizada: { etiqueta: "Finalizada", className: BADGE_VERDE },
  entregada: { etiqueta: "Entregada", className: BADGE_VERDE },
  cancelada: { etiqueta: "Cancelada", className: BADGE_ROJO },
};

export const TIPOS_GASTO_TALLER: Record<TipoGastoTaller, string> = {
  repuestos: "Repuestos",
  insumos: "Insumos",
  horas: "Horas de trabajo",
  servicio_externo: "Servicio externo",
};

export const ESTADOS_CREDITO: Record<
  EstadoCredito,
  { etiqueta: string; className: string }
> = {
  al_dia: { etiqueta: "Al día", className: BADGE_VERDE },
  en_mora: { etiqueta: "En mora", className: BADGE_ROJO },
  cancelado: { etiqueta: "Cancelado", className: BADGE_GRIS },
  refinanciado: { etiqueta: "Refinanciado", className: BADGE_AMBAR },
};

export const ESTADOS_CUOTA: Record<
  EstadoCuota,
  { etiqueta: string; className: string }
> = {
  pendiente: { etiqueta: "Pendiente", className: BADGE_GRIS },
  pagada: { etiqueta: "Pagada", className: BADGE_VERDE },
  vencida: { etiqueta: "Vencida", className: BADGE_ROJO },
  refinanciada: { etiqueta: "Refinanciada", className: BADGE_AMBAR },
  cancelada: { etiqueta: "Cancelada", className: BADGE_GRIS },
};

export const CATEGORIAS_GASTO: Record<CategoriaGasto, string> = {
  sueldos: "Sueldos",
  combustible: "Combustible",
  servicios: "Servicios",
  alquiler: "Alquiler",
  impuestos: "Impuestos",
  taller: "Taller",
  repuestos: "Repuestos",
  marketing: "Marketing",
  otros: "Otros",
};

export const CATEGORIAS_CAJA: Record<CategoriaCaja, string> = {
  venta: "Venta",
  cobro_cuota: "Cobro de cuota",
  cobro_financiera: "Liquidación financiera",
  servicio_taller: "Servicio de taller",
  compra: "Compra",
  gasto: "Gasto",
  sueldos: "Sueldos",
  otro: "Otro",
};
