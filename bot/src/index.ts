import { cerrarPool, ensureSchema } from "./db.js";
import { crearRedis } from "./redis.js";
import { enviarTexto, iniciarBaileys, reinicioLimpio } from "./baileys/client.js";

const dormir = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

interface JobOutbox {
  telefono: string;
  contenido: string;
}

/**
 * Cola de salientes: el panel encola (LPUSH wa:outbox) los mensajes que manda
 * una persona en modo humano; acá se drenan y se envían por Baileys. El panel
 * ya insertó el mensaje en la DB: el bot solo transporta.
 */
async function loopOutbox(): Promise<void> {
  const redis = crearRedis();
  for (;;) {
    try {
      const res = await redis.brpop("wa:outbox", 5);
      if (!res) continue;
      const job = JSON.parse(res[1]) as JobOutbox;
      try {
        await enviarTexto(job.telefono, job.contenido);
        console.log(`[bot] → outbox enviado a ${job.telefono}`);
      } catch (err) {
        // Conexión caída: re-encolar y esperar; se reintenta cuando vuelva.
        console.warn(`[bot] falló el envío a ${job.telefono}, se re-encola:`, err);
        await redis.lpush("wa:outbox", res[1]);
        await dormir(2000);
      }
    } catch (err) {
      console.error("[bot] error en el loop outbox:", err);
      await dormir(2000);
    }
  }
}

/** Señales de control desde el panel (hoy solo 'restart' = desconectar). */
async function loopControl(): Promise<void> {
  const redis = crearRedis();
  for (;;) {
    try {
      const res = await redis.brpop("wa:control", 5);
      if (!res) continue;
      if (res[1] === "restart") {
        console.log("[bot] señal de restart: cerrando sesión y regenerando QR");
        await reinicioLimpio();
      }
    } catch (err) {
      console.error("[bot] error en el loop de control:", err);
      await dormir(2000);
    }
  }
}

async function main(): Promise<void> {
  console.log("[bot] arrancando…");
  await ensureSchema();
  await iniciarBaileys();
  void loopOutbox();
  void loopControl();
}

for (const senal of ["SIGINT", "SIGTERM"] as const) {
  process.on(senal, () => {
    console.log(`[bot] ${senal}: cerrando`);
    void cerrarPool().finally(() => process.exit(0));
  });
}

main().catch((err) => {
  console.error("[bot] error fatal al arrancar:", err);
  process.exit(1);
});
