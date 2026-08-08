import { pool } from "./db.js";

/**
 * Catálogo comercial en vivo para el prompt del bot: las mismas `motos` activas
 * que muestra /catalogo en el panel (lib/data.ts → obtenerMotos), con el conteo
 * de unidades disponibles de `unidades_stock`.
 *
 * Se inyecta como texto en el system prompt en vez de exponerse como tool: el
 * catálogo es chico (decenas de modelos) y así el LLM no puede "olvidarse" de
 * consultarlo antes de tirar un precio.
 */

interface FilaCatalogo {
  marca: string;
  modelo: string;
  anio: number;
  precio: string; // numeric → string en pg
  cilindrada: number | null;
  colores: string[];
  disponibles: string; // count() → string en pg
}

const SQL = `
  select m.marca,
         m.modelo,
         m.anio,
         m.precio,
         m.cilindrada,
         m.colores,
         count(u.id) filter (where u.estado = 'disponible') as disponibles
  from public.motos m
  left join public.unidades_stock u on u.moto_id = m.id
  where m.activa = true
  group by m.id
  order by m.marca, m.modelo
`;

const TTL_MS = 60_000;

let cache: { texto: string; expira: number } | null = null;

const formatoPrecio = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function formatearFila(f: FilaCatalogo): string {
  const partes = [`${f.marca} ${f.modelo} ${f.anio}`];
  if (f.cilindrada) partes.push(`${f.cilindrada}cc`);
  partes.push(`${formatoPrecio.format(Number(f.precio))} contado`);

  const disponibles = Number(f.disponibles);
  partes.push(
    disponibles > 0
      ? `${disponibles} ${disponibles === 1 ? "unidad disponible" : "unidades disponibles"}`
      : "sin unidades disponibles",
  );

  if (f.colores.length > 0) partes.push(`colores: ${f.colores.join(", ")}`);
  return `- ${partes.join(" | ")}`;
}

/**
 * Bloque de catálogo listo para el prompt. Devuelve `null` si la consulta falla
 * o no hay modelos activos: el prompt lo trata como "no tengo precios" y el bot
 * deriva, que es el comportamiento seguro.
 */
export async function obtenerCatalogoTexto(): Promise<string | null> {
  if (cache && cache.expira > Date.now()) return cache.texto;

  let filas: FilaCatalogo[];
  try {
    const res = await pool.query<FilaCatalogo>(SQL);
    filas = res.rows;
  } catch (err) {
    console.error("[bot] no se pudo leer el catálogo (el bot va a derivar precios):", err);
    return null;
  }

  if (filas.length === 0) {
    console.warn("[bot] catálogo vacío: no hay motos activas");
    return null;
  }

  const texto = filas.map(formatearFila).join("\n");
  cache = { texto, expira: Date.now() + TTL_MS };
  console.log(`[bot] catálogo actualizado: ${filas.length} modelos activos`);
  return texto;
}
