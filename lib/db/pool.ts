import "server-only";

import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// La capa de datos trata date/timestamp como strings ISO (igual que devolvía
// Supabase): usa .slice()/.startsWith()/comparaciones directas sobre fechas.
// Por defecto pg las parsea a Date, así que las dejamos como texto crudo.
types.setTypeParser(1082, (v) => v); // date
types.setTypeParser(1114, (v) => v); // timestamp
types.setTypeParser(1184, (v) => v); // timestamptz
// numeric (1700) y bigint (20) ya vienen como string por defecto; los
// mapeadores los pasan por Number()/num().

/**
 * Pool de conexiones a PostgreSQL.
 *
 * Se cachea en globalThis para no abrir un pool nuevo en cada recarga del
 * HMR de desarrollo (agotaría las conexiones de Postgres).
 */
const globalParaPool = globalThis as unknown as {
  __sosaPgPool?: Pool;
};

function crearPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Falta DATABASE_URL. Copiá .env.example a .env.local y levantá la base con `npm run db:up`.",
    );
  }
  return new Pool({ connectionString });
}

export const pool = globalParaPool.__sosaPgPool ?? crearPool();

if (process.env.NODE_ENV !== "production") {
  globalParaPool.__sosaPgPool = pool;
}

/**
 * Ejecuta una consulta y devuelve las filas ya tipadas como `Fila`.
 * Reemplazo directo del `.from().select()` de Supabase en la capa de datos.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const resultado = await pool.query<T>(text, params as never[]);
  return resultado.rows;
}

/**
 * Ejecuta `fn` dentro de una transacción (BEGIN/COMMIT, ROLLBACK ante error).
 * Necesario cuando una operación toca varias tablas de forma atómica
 * (p. ej. crear un crédito: venta → credito → cuotas).
 */
export async function transaccion<T>(
  fn: (cliente: PoolClient) => Promise<T>,
): Promise<T> {
  const cliente = await pool.connect();
  try {
    await cliente.query("begin");
    const resultado = await fn(cliente);
    await cliente.query("commit");
    return resultado;
  } catch (error) {
    await cliente.query("rollback");
    throw error;
  } finally {
    cliente.release();
  }
}
