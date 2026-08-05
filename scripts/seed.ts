/**
 * Seed de Sosa Drive para PostgreSQL.
 *
 * Reconstruye en la base los datos que antes vivían como mock: el CRM comercial
 * (lib/mock-data.ts) y el módulo de Operaciones (lib/mock-operaciones.ts, derivado
 * de los Excel reales del cliente en lib/datos-reales.ts).
 *
 * Uso: `npm run db:seed` (requiere la base levantada con `npm run db:up`).
 *
 * - Los ids de los mock son strings tipo "v1"/"m1"/"u001"; acá se mapean a UUID
 *   estables (uuidPara) preservando la integridad referencial.
 * - Se deshabilitan temporalmente los triggers que generan kardex/auditoría al
 *   insertar ventas y movimientos, para sembrar el historial del mock sin duplicar.
 * - Es idempotente: TRUNCATE ... CASCADE al inicio.
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import argon2 from "argon2";

import * as crm from "../lib/mock-data";
import * as ops from "../lib/mock-operaciones";

// --- Entorno -------------------------------------------------------------
// tsx no carga .env.local automáticamente; lo leemos a mano si existe.
function cargarEnvLocal() {
  try {
    const contenido = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const linea of contenido.split("\n")) {
      const limpia = linea.trim();
      if (!limpia || limpia.startsWith("#")) continue;
      const i = limpia.indexOf("=");
      if (i === -1) continue;
      const clave = limpia.slice(0, i).trim();
      const valor = limpia.slice(i + 1).trim();
      if (!(clave in process.env)) process.env[clave] = valor;
    }
  } catch {
    // Sin .env.local usamos los valores por defecto de docker-compose.
  }
}
cargarEnvLocal();

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://sosa:sosa@localhost:5432/sosa_drive";

const PASSWORD_DEMO = "sosadrive";

// --- Utilidades ----------------------------------------------------------
const cacheUuid = new Map<string, string>();
/** Devuelve un UUID estable para un id de mock (misma clave → mismo UUID). */
function uuidPara(clave: string): string {
  let uuid = cacheUuid.get(clave);
  if (!uuid) {
    uuid = randomUUID();
    cacheUuid.set(clave, uuid);
  }
  return uuid;
}
function uuidOpt(clave: string | undefined | null): string | null {
  return clave ? uuidPara(clave) : null;
}

function slug(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

type Fila = Record<string, unknown>;

async function insertar(client: Client, tabla: string, filas: Fila[]) {
  for (const fila of filas) {
    const cols = Object.keys(fila);
    const valores = cols.map((c) => {
      const v = fila[c];
      return v === undefined ? null : v;
    });
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    await client.query(
      `insert into ${tabla} (${cols.join(", ")}) values (${placeholders})`,
      valores,
    );
  }
  return filas.length;
}

// --- Seed ----------------------------------------------------------------
async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log(`→ Conectado a ${DATABASE_URL.replace(/:\/\/[^@]+@/, "://***@")}`);

  try {
    await client.query("begin");

    // Todas las tablas menos configuracion (la siembra la migración).
    await client.query(`
      truncate table
        perfiles, motos, unidades_stock, leads, eventos_lead, conversaciones,
        mensajes, tareas, eventos_agenda,
        compras, unidades_inventario, movimientos_inventario, clientes_operaciones,
        ventas, creditos, cuotas, ordenes_taller, gastos_taller, repuestos,
        gastos, movimientos_caja, auditoria
      restart identity cascade
    `);

    // El historial (kardex + auditoría) se siembra tal cual del mock, así que
    // apagamos los triggers que lo generarían al insertar ventas/movimientos.
    await client.query(
      "alter table ventas disable trigger ventas_descuentan_stock",
    );
    await client.query(
      "alter table movimientos_inventario disable trigger movimientos_inventario_auditados",
    );

    const hash = await argon2.hash(PASSWORD_DEMO);

    // --- CRM comercial ---
    const perfiles = [...crm.vendedores, crm.gerente];
    await insertar(
      client,
      "perfiles",
      perfiles.map((p) => ({
        id: uuidPara(p.id),
        email: `${slug(p.nombre)}@sosamotos.com.ar`,
        password_hash: hash,
        nombre: p.nombre,
        rol: p.rol,
        avatar_url: p.avatarUrl ?? null,
        nivel: p.nivel,
        xp: p.xp,
      })),
    );

    await insertar(
      client,
      "motos",
      crm.motos.map((m) => ({
        id: uuidPara(m.id),
        marca: m.marca,
        modelo: m.modelo,
        anio: m.anio,
        precio: m.precio,
        precio_financiado: m.precioFinanciado,
        descripcion: m.descripcion,
        motor: m.motor,
        cilindrada: m.cilindrada,
        consumo: m.consumo,
        velocidad_maxima: m.velocidadMaxima,
        garantia: m.garantia,
        colores: m.colores,
        imagen_url: m.imagenUrl ?? null,
      })),
    );

    await insertar(
      client,
      "unidades_stock",
      crm.unidadesStock.map((u) => ({
        id: uuidPara(u.id),
        moto_id: uuidPara(u.motoId),
        numero_motor: u.numeroMotor,
        numero_cuadro: u.numeroCuadro,
        sucursal: u.sucursal,
        color: u.color,
        estado: u.estado,
      })),
    );

    await insertar(
      client,
      "leads",
      crm.leads.map((l) => ({
        id: uuidPara(l.id),
        nombre: l.nombre,
        dni: l.dni ?? null,
        telefono: l.telefono,
        email: l.email ?? null,
        ciudad: l.ciudad ?? null,
        fuente: l.fuente,
        moto_interes_id: uuidOpt(l.motoInteresId),
        moto_alternativa_id: uuidOpt(l.motoAlternativaId),
        presupuesto: l.presupuesto ?? null,
        forma_pago: l.formaPago,
        financiacion: l.financiacion,
        permuta: l.permuta ?? null,
        estado: l.estado,
        score: l.score,
        score_motivo: l.scoreMotivo ?? null,
        vendedor_id: uuidOpt(l.vendedorId),
        notas: l.notas ?? null,
        creado_en: l.creadoEn,
        ultimo_contacto_en: l.ultimoContactoEn ?? null,
      })),
    );

    await insertar(
      client,
      "eventos_lead",
      crm.eventosLead.map((e) => ({
        id: uuidPara(e.id),
        lead_id: uuidPara(e.leadId),
        tipo: e.tipo,
        descripcion: e.descripcion,
        actor: e.actor,
        creado_en: e.creadoEn,
      })),
    );

    await insertar(
      client,
      "conversaciones",
      crm.conversaciones.map((c) => ({
        id: uuidPara(c.id),
        lead_id: uuidPara(c.leadId),
        canal: c.canal,
        no_leidos: c.noLeidos,
        ultimo_mensaje: c.ultimoMensaje ?? null,
        ultimo_mensaje_en: c.ultimoMensajeEn ?? null,
        asignado_a: uuidOpt(c.asignadoA),
      })),
    );

    await insertar(
      client,
      "mensajes",
      crm.mensajes.map((m) => ({
        id: uuidPara(m.id),
        conversacion_id: uuidPara(m.conversacionId),
        autor: m.autor,
        contenido: m.contenido,
        nota_privada: m.notaPrivada ?? false,
        creado_en: m.creadoEn,
      })),
    );

    await insertar(
      client,
      "tareas",
      crm.tareas.map((t) => ({
        id: uuidPara(t.id),
        titulo: t.titulo,
        descripcion: t.descripcion ?? null,
        lead_id: uuidOpt(t.leadId),
        vendedor_id: uuidPara(t.vendedorId),
        vence_en: t.venceEn,
        completada_en: t.completadaEn ?? null,
        prioridad: t.prioridad,
      })),
    );

    await insertar(
      client,
      "eventos_agenda",
      crm.agenda.map((a) => ({
        id: uuidPara(a.id),
        tipo: a.tipo,
        titulo: a.titulo,
        lead_id: uuidOpt(a.leadId),
        vendedor_id: uuidPara(a.vendedorId),
        inicio: a.inicio,
        fin: a.fin,
        notas: a.notas ?? null,
        estado: a.estado,
      })),
    );

    // --- Operaciones ---
    await insertar(
      client,
      "compras",
      ops.compras.map((c) => ({
        id: uuidPara(c.id),
        proveedor: c.proveedor,
        factura: c.factura,
        fecha: c.fecha,
        costo_total: c.costoTotal,
        forma_pago: c.formaPago,
        observaciones: c.observaciones ?? null,
      })),
    );

    const compraDeUnidad = new Map<string, string>();
    for (const c of ops.compras) {
      for (const uid of c.unidadIds) compraDeUnidad.set(uid, c.id);
    }

    await insertar(
      client,
      "unidades_inventario",
      ops.unidadesInventario.map((u) => ({
        id: uuidPara(u.id),
        marca: u.marca,
        modelo: u.modelo,
        cilindrada: u.cilindrada ?? null,
        anio: u.anio ?? null,
        dominio: u.dominio ?? null,
        numero_motor: u.numeroMotor ?? null,
        numero_cuadro: u.numeroCuadro ?? null,
        color: u.color ?? "",
        condicion: u.condicion,
        estado: u.estado,
        ubicacion: u.ubicacion,
        precio_compra: u.precioCompra ?? null,
        precio_venta: u.precioVenta ?? null,
        fecha_ingreso: u.fechaIngreso,
        fecha_venta: u.fechaVenta ?? null,
        observaciones: u.observaciones ?? null,
        compra_id: uuidOpt(compraDeUnidad.get(u.id)),
      })),
    );

    await insertar(
      client,
      "clientes_operaciones",
      ops.clientes.map((c) => ({
        id: uuidPara(c.id),
        nombre: c.nombre,
        telefono: c.telefono ?? null,
        dni: c.dni ?? null,
        observaciones: c.observaciones ?? null,
      })),
    );

    await insertar(
      client,
      "ventas",
      ops.ventas.map((v) => ({
        id: uuidPara(v.id),
        unidad_id: uuidOpt(v.unidadId),
        descripcion: v.descripcion,
        cliente_id: uuidOpt(v.clienteId),
        precio: v.precio ?? null,
        costo: v.costo ?? null,
        ganancia: v.ganancia ?? null,
        metodo: v.metodo,
        monto_financiera: v.montoFinanciera ?? null,
        vendedor: v.vendedor,
        canal: v.canal ?? null,
        fecha: v.fecha,
        credito_id: uuidOpt(v.creditoId),
      })),
    );

    await insertar(
      client,
      "creditos",
      ops.creditos.map((c) => ({
        id: uuidPara(c.id),
        numero: c.numero ?? null,
        venta_id: uuidOpt(c.ventaId),
        cliente_id: uuidPara(c.clienteId),
        descripcion_moto: c.descripcionMoto ?? null,
        capital: c.capital ?? null,
        cuota_mensual: c.cuotaMensual ?? null,
        total_a_pagar: c.totalAPagar ?? null,
        cantidad_cuotas: c.cantidadCuotas ?? null,
        estado: c.estado,
        observaciones: c.observaciones ?? null,
        creado_en: c.creadoEn,
      })),
    );

    await insertar(
      client,
      "cuotas",
      ops.cuotas.map((c) => ({
        id: uuidPara(c.id),
        credito_id: uuidPara(c.creditoId),
        numero: c.numero,
        vencimiento: c.vencimiento,
        monto: c.monto,
        estado: c.estado,
        pagada_en: c.pagadaEn ?? null,
      })),
    );

    await insertar(
      client,
      "ordenes_taller",
      ops.ordenesTaller.map((o) => ({
        id: uuidPara(o.id),
        numero: o.numero,
        cliente_nombre: o.clienteNombre,
        unidad_id: uuidOpt(o.unidadId),
        moto_descripcion: o.motoDescripcion,
        motivo: o.motivo,
        mecanico: o.mecanico,
        prioridad: o.prioridad,
        estado: o.estado,
        fecha_ingreso: o.fechaIngreso,
        fecha_estimada: o.fechaEstimada ?? null,
        fecha_entrega: o.fechaEntrega ?? null,
        observaciones: o.observaciones ?? null,
      })),
    );

    await insertar(
      client,
      "gastos_taller",
      ops.gastosTaller.map((g) => ({
        id: uuidPara(g.id),
        orden_id: uuidPara(g.ordenId),
        tipo: g.tipo,
        descripcion: g.descripcion,
        monto: g.monto,
      })),
    );

    await insertar(
      client,
      "repuestos",
      ops.repuestos.map((r) => ({
        id: uuidPara(r.id),
        codigo: r.codigo,
        nombre: r.nombre,
        categoria: r.categoria,
        marca: r.marca ?? null,
        proveedor: r.proveedor ?? null,
        costo: r.costo,
        precio: r.precio,
        cantidad: r.cantidad,
        stock_minimo: r.stockMinimo,
        ubicacion: r.ubicacion ?? "",
      })),
    );

    await insertar(
      client,
      "gastos",
      ops.gastos.map((g) => ({
        id: uuidPara(g.id),
        fecha: g.fecha,
        categoria: g.categoria,
        importe: g.importe,
        descripcion: g.descripcion,
        metodo_pago: g.metodoPago,
        responsable: g.responsable,
        proveedor: g.proveedor ?? null,
      })),
    );

    await insertar(
      client,
      "movimientos_inventario",
      ops.movimientosInventario.map((m) => ({
        id: uuidPara(m.id),
        unidad_id: uuidPara(m.unidadId),
        tipo: m.tipo,
        origen: m.origen ?? null,
        destino: m.destino ?? null,
        motivo: m.motivo,
        usuario: m.usuario,
        observaciones: m.observaciones ?? null,
        fecha: m.fecha,
      })),
    );

    await insertar(
      client,
      "movimientos_caja",
      ops.movimientosCaja.map((m) => ({
        id: uuidPara(m.id),
        fecha: m.fecha,
        tipo: m.tipo,
        categoria: m.categoria,
        descripcion: m.descripcion,
        monto: m.monto,
        referencia: m.referencia ?? null,
      })),
    );

    await insertar(
      client,
      "auditoria",
      ops.auditoria.map((a) => ({
        id: uuidPara(a.id),
        fecha: a.fecha,
        usuario: a.usuario,
        accion: a.accion,
        entidad: a.entidad,
        detalle: a.detalle,
      })),
    );

    await client.query(
      "alter table ventas enable trigger ventas_descuentan_stock",
    );
    await client.query(
      "alter table movimientos_inventario enable trigger movimientos_inventario_auditados",
    );

    await client.query("commit");

    const emailGerente = `${slug(crm.gerente.nombre)}@sosamotos.com.ar`;
    console.log("✓ Seed completo.");
    console.log(
      `  Ingresá como gerente: ${emailGerente} / ${PASSWORD_DEMO}`,
    );
    console.log(
      `  (Todos los perfiles usan la misma contraseña de demo: ${PASSWORD_DEMO})`,
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("✗ Falló el seed:", error);
  process.exit(1);
});
