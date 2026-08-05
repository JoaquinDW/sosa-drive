import "server-only";

import { query } from "./db/pool";
import { alertasIA } from "./mock-data";
import type {
  Conversacion,
  EtapaEmbudo,
  EventoAgenda,
  EventoLead,
  KpisHoy,
  Lead,
  Mensaje,
  Moto,
  OrigenLeads,
  Tarea,
  UnidadStock,
  Vendedor,
} from "./types";

/**
 * Capa de datos de Sosa Drive.
 *
 * Consulta PostgreSQL directamente (paquete `pg`). Requiere la base levantada
 * (`npm run db:up`) y sembrada (`npm run db:seed`).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fila = Record<string, any>;

function mapearLead(f: Fila): Lead {
  return {
    id: f.id,
    nombre: f.nombre,
    dni: f.dni ?? undefined,
    telefono: f.telefono,
    email: f.email ?? undefined,
    ciudad: f.ciudad ?? "",
    fuente: f.fuente,
    motoInteresId: f.moto_interes_id ?? undefined,
    motoAlternativaId: f.moto_alternativa_id ?? undefined,
    presupuesto: f.presupuesto ? Number(f.presupuesto) : undefined,
    formaPago: f.forma_pago,
    financiacion: f.financiacion,
    permuta: f.permuta ?? undefined,
    estado: f.estado,
    score: f.score,
    scoreMotivo: f.score_motivo ?? undefined,
    vendedorId: f.vendedor_id ?? undefined,
    notas: f.notas ?? undefined,
    creadoEn: f.creado_en,
    ultimoContactoEn: f.ultimo_contacto_en ?? undefined,
  };
}

function mapearMoto(f: Fila, disponibles?: number): Moto {
  return {
    id: f.id,
    marca: f.marca,
    modelo: f.modelo,
    anio: f.anio,
    precio: Number(f.precio),
    precioFinanciado: Number(f.precio_financiado ?? f.precio),
    descripcion: f.descripcion ?? "",
    motor: f.motor ?? "",
    cilindrada: f.cilindrada ?? 0,
    consumo: f.consumo ?? "",
    velocidadMaxima: f.velocidad_maxima ?? 0,
    garantia: f.garantia ?? "",
    colores: f.colores ?? [],
    imagenUrl: f.imagen_url ?? undefined,
    stock: disponibles ?? 0,
  };
}

export async function obtenerLeads(): Promise<Lead[]> {
  const filas = await query("select * from leads order by creado_en desc");
  return filas.map(mapearLead);
}

export async function obtenerLead(id: string): Promise<Lead | undefined> {
  const filas = await query("select * from leads where id = $1", [id]);
  return filas[0] ? mapearLead(filas[0]) : undefined;
}

export async function obtenerEventosLead(leadId: string): Promise<EventoLead[]> {
  const filas = await query(
    "select * from eventos_lead where lead_id = $1 order by creado_en desc",
    [leadId],
  );
  return filas.map((f) => ({
    id: f.id,
    leadId: f.lead_id,
    tipo: f.tipo,
    descripcion: f.descripcion,
    actor: f.actor,
    creadoEn: f.creado_en,
  }));
}

export async function obtenerMotos(): Promise<Moto[]> {
  const [motos, stockPorMoto] = await Promise.all([
    query("select * from motos where activa = true order by marca"),
    query("select * from stock_por_moto"),
  ]);
  const stock = new Map(
    stockPorMoto.map((s: Fila) => [s.moto_id, Number(s.disponibles)]),
  );
  return motos.map((f) => mapearMoto(f, stock.get(f.id) ?? 0));
}

export async function obtenerUnidadesStock(): Promise<UnidadStock[]> {
  const filas = await query("select * from unidades_stock");
  return filas.map((f) => ({
    id: f.id,
    motoId: f.moto_id,
    numeroMotor: f.numero_motor,
    numeroCuadro: f.numero_cuadro,
    sucursal: f.sucursal,
    color: f.color,
    estado: f.estado,
  }));
}

export async function obtenerVendedores(): Promise<Vendedor[]> {
  const filas = await query("select * from perfiles where rol = 'vendedor'");
  return filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    rol: f.rol,
    avatarUrl: f.avatar_url ?? undefined,
    nivel: f.nivel,
    xp: f.xp,
    insignias: [],
    // Métricas comerciales: en Fase 2 se calculan desde ventas reales.
    ventasMes: 0,
    facturacionMes: 0,
    conversion: 0,
    tiempoRespuestaSeg: 0,
    leadsAbiertos: 0,
  }));
}

export async function obtenerConversaciones(): Promise<Conversacion[]> {
  const filas = await query(
    "select * from conversaciones order by ultimo_mensaje_en desc",
  );
  return filas.map((f) => ({
    id: f.id,
    leadId: f.lead_id,
    canal: f.canal,
    noLeidos: f.no_leidos,
    ultimoMensaje: f.ultimo_mensaje ?? "",
    ultimoMensajeEn: f.ultimo_mensaje_en ?? f.creado_en,
    asignadoA: f.asignado_a ?? undefined,
  }));
}

export async function obtenerMensajes(
  conversacionId: string,
): Promise<Mensaje[]> {
  const filas = await query(
    "select * from mensajes where conversacion_id = $1 order by creado_en",
    [conversacionId],
  );
  return filas.map((f) => ({
    id: f.id,
    conversacionId: f.conversacion_id,
    autor: f.autor,
    contenido: f.contenido,
    notaPrivada: f.nota_privada,
    creadoEn: f.creado_en,
  }));
}

export async function obtenerTareas(): Promise<Tarea[]> {
  const filas = await query("select * from tareas order by vence_en");
  return filas.map((f) => ({
    id: f.id,
    titulo: f.titulo,
    descripcion: f.descripcion ?? undefined,
    leadId: f.lead_id ?? undefined,
    vendedorId: f.vendedor_id,
    venceEn: f.vence_en,
    completadaEn: f.completada_en ?? undefined,
    prioridad: f.prioridad,
  }));
}

export async function obtenerAgenda(): Promise<EventoAgenda[]> {
  const filas = await query("select * from eventos_agenda order by inicio");
  return filas.map((f) => ({
    id: f.id,
    tipo: f.tipo,
    titulo: f.titulo,
    leadId: f.lead_id ?? undefined,
    vendedorId: f.vendedor_id,
    inicio: f.inicio,
    fin: f.fin,
    notas: f.notas ?? undefined,
    estado: f.estado,
  }));
}

export async function obtenerKpis(): Promise<KpisHoy> {
  // Agregados básicos sobre los leads de hoy.
  const leads = await obtenerLeads();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const deHoy = leads.filter((l) => new Date(l.creadoEn) >= hoy);
  const vendidos = deHoy.filter((l) => l.estado === "vendido");
  return {
    leads: deHoy.length,
    leadsDeltaPct: 0,
    sinResponder: deHoy.filter((l) => !l.ultimoContactoEn).length,
    calientes: deHoy.filter((l) => l.score >= 80).length,
    visitasAgendadas: deHoy.filter((l) => l.estado === "visita").length,
    ventas: vendidos.length,
    facturacion: vendidos.reduce((acc, l) => acc + (l.presupuesto ?? 0), 0),
    facturacionDeltaPct: 0,
    conversion: deHoy.length > 0 ? vendidos.length / deHoy.length : 0,
    tiempoRespuestaSeg: 0,
  };
}

export async function obtenerEmbudo(): Promise<EtapaEmbudo[]> {
  const leads = await obtenerLeads();
  const etapas: { etapa: string; filtro: (l: Lead) => boolean }[] = [
    { etapa: "Leads nuevos", filtro: () => true },
    { etapa: "Contactados", filtro: (l) => l.estado !== "nuevo" },
    {
      etapa: "Calificados",
      filtro: (l) =>
        ["calificado", "visita", "negociacion", "vendido"].includes(l.estado),
    },
    {
      etapa: "Visita agendada",
      filtro: (l) => ["visita", "negociacion", "vendido"].includes(l.estado),
    },
    {
      etapa: "Negociación",
      filtro: (l) => ["negociacion", "vendido"].includes(l.estado),
    },
    { etapa: "Vendidos", filtro: (l) => l.estado === "vendido" },
  ];
  return etapas.map(({ etapa, filtro }) => ({
    etapa,
    cantidad: leads.filter(filtro).length,
  }));
}

export async function obtenerOrigenLeads(): Promise<OrigenLeads[]> {
  const leads = await obtenerLeads();
  const conteo = new Map<string, number>();
  for (const l of leads) {
    conteo.set(l.fuente, (conteo.get(l.fuente) ?? 0) + 1);
  }
  return [...conteo.entries()]
    .map(([fuente, cantidad]) => ({
      fuente: fuente as OrigenLeads["fuente"],
      cantidad,
    }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

export async function obtenerAlertas() {
  // Placeholder de Fase 2: las alertas IA todavía no tienen tabla propia.
  return alertasIA;
}
