import "server-only";

import QRCode from "qrcode";
import { query } from "@/lib/db/pool";
import type {
  EstadoConexionWa,
  EstadoLead,
  FichaLeadWa,
  FormaPago,
  ModoWa,
  RolWaMensaje,
  WaConversacion,
  WaEstadoConexion,
  WaMensaje,
} from "@/lib/types";

/**
 * Capa de datos del módulo WhatsApp (tablas wa_*). El schema lo crea el
 * servicio `bot` al arrancar (bot/src/db.ts); si el bot nunca corrió, las
 * tablas pueden no existir todavía y estos getters devuelven vacío en vez de
 * romper el panel.
 */

/**
 * True si el error de Postgres es "no existe la tabla" (42P01) o "no existe la
 * columna" (42703): las dos formas de "el bot todavía no creó su schema", ya
 * que `ensureSchema` va agregando columnas (p. ej. `lead_id`) con el tiempo.
 */
function esquemaIncompleto(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  const codigo = (error as { code?: string }).code;
  return codigo === "42P01" || codigo === "42703";
}

interface FilaEstadoConexion {
  estado: EstadoConexionWa;
  qr_string: string | null;
  telefono: string | null;
  actualizado_en: string;
}

export async function obtenerEstadoConexionWa(): Promise<WaEstadoConexion> {
  let fila: FilaEstadoConexion | undefined;
  try {
    const filas = await query<FilaEstadoConexion>(
      "select estado, qr_string, telefono, actualizado_en from wa_estado_conexion where id = 1",
    );
    fila = filas[0];
  } catch (error) {
    if (!esquemaIncompleto(error)) throw error;
  }
  if (!fila) {
    return {
      estado: "desconectado",
      telefono: null,
      qr: null,
      actualizadoEn: new Date().toISOString(),
    };
  }

  // Defensivo: mostrar el QR aunque el estado haya quedado en 'conectando'
  // (race entre el evento `qr` y el `connecting` de Baileys).
  const mostrarQr =
    !!fila.qr_string && (fila.estado === "qr" || fila.estado === "conectando");
  const qr = mostrarQr
    ? await QRCode.toDataURL(fila.qr_string as string, { width: 320, margin: 2 })
    : null;

  return {
    estado: fila.estado,
    telefono: fila.telefono,
    qr,
    actualizadoEn: fila.actualizado_en,
  };
}

interface FilaConversacionWa {
  id: string;
  telefono: string;
  nombre: string | null;
  modo: ModoWa;
  lead_id: string | null;
  ultimo_mensaje: string | null;
  ultimo_mensaje_en: string | null;
}

function mapearConversacionWa(fila: FilaConversacionWa): WaConversacion {
  return {
    id: fila.id,
    telefono: fila.telefono,
    nombre: fila.nombre,
    modo: fila.modo,
    leadId: fila.lead_id,
    ultimoMensaje: fila.ultimo_mensaje,
    ultimoMensajeEn: fila.ultimo_mensaje_en,
  };
}

export async function obtenerConversacionesWa(): Promise<WaConversacion[]> {
  try {
    const filas = await query<FilaConversacionWa>(
      `select c.id, c.telefono, c.nombre, c.modo, c.lead_id, c.ultimo_mensaje_en,
              (select m.contenido from wa_mensajes m
               where m.conversacion_id = c.id
               order by m.creado_en desc, m.id desc
               limit 1) as ultimo_mensaje
       from wa_conversaciones c
       order by c.ultimo_mensaje_en desc nulls last, c.creado_en desc`,
    );
    return filas.map(mapearConversacionWa);
  } catch (error) {
    if (esquemaIncompleto(error)) return [];
    throw error;
  }
}

interface FilaFichaLead {
  id: string;
  nombre: string;
  telefono: string;
  ciudad: string | null;
  estado: EstadoLead;
  score: number;
  score_motivo: string | null;
  forma_pago: FormaPago;
  presupuesto: string | null;
  permuta: string | null;
  moto_interes: string | null;
  vendedor: string | null;
  creado_en: string;
  ultimo_contacto_en: string | null;
}

/**
 * Ficha del lead que atiende una conversación de WhatsApp. Null si el chat
 * todavía no tiene lead (conversación anterior al bot cualificador que nunca
 * volvió a recibir un mensaje).
 */
export async function obtenerFichaLeadWa(
  conversacionId: string,
): Promise<FichaLeadWa | null> {
  let filas: FilaFichaLead[];
  try {
    filas = await query<FilaFichaLead>(
      `select l.id, l.nombre, l.telefono, l.ciudad, l.estado, l.score, l.score_motivo,
              l.forma_pago, l.presupuesto, l.permuta, l.creado_en, l.ultimo_contacto_en,
              (select m.marca || ' ' || m.modelo from motos m where m.id = l.moto_interes_id)
                as moto_interes,
              (select p.nombre from perfiles p where p.id = l.vendedor_id) as vendedor
       from leads l
       join wa_conversaciones c on c.lead_id = l.id
       where c.id = $1`,
      [conversacionId],
    );
  } catch (error) {
    if (esquemaIncompleto(error)) return null;
    throw error;
  }

  const f = filas[0];
  if (!f) return null;

  return {
    id: f.id,
    nombre: f.nombre,
    telefono: f.telefono,
    ciudad: f.ciudad ?? "",
    estado: f.estado,
    score: f.score,
    scoreMotivo: f.score_motivo ?? undefined,
    formaPago: f.forma_pago,
    presupuesto: f.presupuesto ? Number(f.presupuesto) : undefined,
    permuta: f.permuta ?? undefined,
    motoInteres: f.moto_interes ?? undefined,
    vendedor: f.vendedor ?? undefined,
    creadoEn: f.creado_en,
    ultimoContactoEn: f.ultimo_contacto_en ?? undefined,
  };
}

interface FilaMensajeWa {
  id: string;
  rol: RolWaMensaje;
  contenido: string;
  creado_en: string;
}

/**
 * Conversación + mensajes + ficha del lead. Es lo que pollea el panel cada 2s
 * mientras hay un hilo abierto, por eso viene todo junto en un request.
 */
export async function obtenerConversacionWa(id: string): Promise<{
  conversacion: WaConversacion;
  mensajes: WaMensaje[];
  lead: FichaLeadWa | null;
} | null> {
  try {
    const conversaciones = await query<FilaConversacionWa>(
      `select c.id, c.telefono, c.nombre, c.modo, c.lead_id, c.ultimo_mensaje_en,
              null as ultimo_mensaje
       from wa_conversaciones c
       where c.id = $1`,
      [id],
    );
    const conversacion = conversaciones[0];
    if (!conversacion) return null;

    const [mensajes, lead] = await Promise.all([
      query<FilaMensajeWa>(
        `select id, rol, contenido, creado_en from wa_mensajes
         where conversacion_id = $1
         order by creado_en asc, id asc`,
        [id],
      ),
      obtenerFichaLeadWa(id),
    ]);

    return {
      conversacion: mapearConversacionWa(conversacion),
      mensajes: mensajes.map((m) => ({
        id: m.id,
        rol: m.rol,
        contenido: m.contenido,
        creadoEn: m.creado_en,
      })),
      lead,
    };
  } catch (error) {
    if (esquemaIncompleto(error)) return null;
    throw error;
  }
}
