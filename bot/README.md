# Bot de WhatsApp (Baileys + OpenAI)

Servicio Node que conecta un número real de WhatsApp vía [Baileys](https://github.com/WhiskeySockets/Baileys)
(WhatsApp Web por QR, sin Meta API ni Twilio) y responde los mensajes entrantes
con un LLM de OpenAI. El panel para verlo y manejarlo es la sección **/whatsapp**
de la app (misma auth que el resto del CRM).

## Cómo funciona

- Corre como servicio `bot` del `docker-compose.yml` de la raíz, junto a los
  Postgres y Redis existentes. No expone puertos.
- Escribe los mensajes y el estado de la conexión en las tablas `wa_*` de la
  base `sosa_drive` (crea el schema idempotente al arrancar).
- Redis se usa como cola: `wa:outbox` (mensajes que una persona manda desde el
  panel en modo humano) y `wa:control` (señal `restart` del botón Desconectar).
- Cada conversación tiene un modo: **ia** (responde el bot con OpenAI) o
  **humano** (el bot solo guarda; responde una persona desde el panel).
- Cada conversación tiene además su **lead en el CRM**: el bot lo crea al primer
  mensaje y lo va completando con lo que el cliente cuenta (ver más abajo).
- La sesión de Baileys persiste en `data/wa-auth/` (gitignored): entre
  reinicios no vuelve a pedir QR mientras la sesión siga viva.

## Levantarlo

1. Agregá a `.env.local` (ver `.env.example`):
   ```
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-4o-mini
   ```
   Necesitás facturación activa en tu cuenta de OpenAI. `gpt-4o-mini` alcanza
   de sobra (centavos por mes para uso normal).
2. `npm run db:up` (levanta postgres + redis si no están) y después:
   ```bash
   docker compose up -d --build bot
   docker compose logs -f bot
   ```
3. Abrí la app (`npm run dev` → http://localhost:3000), logueate y entrá a
   **WhatsApp** en el sidebar: escaneá el QR desde el teléfono (WhatsApp →
   Dispositivos vinculados). En los logs del bot aparece el mismo QR en ASCII
   como respaldo.

## Personalizar el prompt

El "cerebro" del bot son dos capas que [`src/system-prompt.ts`](src/system-prompt.ts)
junta en cada mensaje:

1. **[`project.md`](project.md)** — la info del negocio: tono, reglas, horarios,
   qué no decir, cuándo derivar. Está pensado para que lo edite el negocio sin
   tocar código. Se lee en cada mensaje: **guardás y aplica al toque**, sin
   reiniciar el contenedor (el bind mount del compose ya lo expone adentro). Si el
   archivo falta o falla, el bot cae a un prompt mínimo y conservador.
2. **El catálogo en vivo** ([`src/catalogo.ts`](src/catalogo.ts)) — las mismas
   `motos` activas que muestra `/catalogo` en el panel, con precio de contado y
   unidades disponibles de `unidades_stock`. Se inyecta como texto (no como tool)
   para que el LLM no pueda tirar un precio sin haberlo consultado. Cache de 60s;
   si la consulta falla, el bloque dice "no hay catálogo" y el bot deriva.

Consecuencia operativa: **un precio desactualizado en el panel es un precio
desactualizado por WhatsApp.** Para que el bot deje de ofrecer un modelo, marcalo
como inactivo (`motos.activa = false`).

## El bot como cualificador (leads)

Atender es la mitad del trabajo: la otra mitad es que la charla termine cargada
en el CRM. De eso se ocupa [`src/leads.ts`](src/leads.ts).

- **Un lead por teléfono.** Al primer mensaje el bot crea el lead (fuente
  `whatsapp`, estado `nuevo`) y lo vincula en `wa_conversaciones.lead_id`. Si ya
  había un lead con ese teléfono —un cliente que vuelve, o uno cargado a mano por
  un vendedor— se engancha a ese en vez de duplicar.
- **Los datos salen de una segunda pasada al LLM** ([`src/extraccion.ts`](src/extraccion.ts)),
  separada de la que conversa. Corre sobre toda la conversación reciente después
  de cada mensaje del cliente, con `json_schema` estricto. Va aparte del bot
  conversador por dos razones: no se puede "olvidar" de registrar un dato, y
  corre **también en modo humano** (si atiende una persona, la ficha se completa
  igual). Como relee toda la charla, es idempotente: lo que el cliente dijo hace
  cinco mensajes sigue apareciendo.
- **Solo se completa, nunca se pisa.** Un campo que ya tiene valor no se toca, y
  en cuanto el lead sale de `nuevo`/`contactado`/`calificado` el bot deja de
  escribirle: de ahí en adelante manda el equipo. Lo que el vendedor corrige en
  el panel queda.
- **El modelo se matchea contra el catálogo** (`motos` activas). Si no matchea
  con confianza, la moto de interés queda vacía: es mejor un campo en blanco que
  mandarle al vendedor el modelo equivocado.
- **El score (0-100) es determinístico**, no lo estima el LLM: sale de qué datos
  de la sección 4 de `project.md` ya están (nombre, modelo, forma de pago,
  ciudad) más si el cliente pidió avanzar con un asesor. Dos leads con los mismos
  datos puntúan igual.
- **Lo que el bot ya sabe vuelve al prompt**, para que no repregunte un dato que
  ya está cargado, y todo cambio queda en el timeline del lead (`eventos_lead`),
  visible en `/leads/[id]`.

En el panel, la ficha aparece al costado del hilo en **/whatsapp**, con link al
perfil completo.

## Troubleshooting

- **Loop de desconexiones con code 440** (connectionReplaced): hay otra sesión
  peleando por el número. En el teléfono, WhatsApp → Dispositivos vinculados →
  borrá dispositivos viejos de pruebas. El bot ya espera 15s antes de reintentar.
- **Code 405**: `fetchLatestBaileysVersion()` no pudo correr; revisá la salida a
  internet del contenedor.
- **No aparece QR / pairing roto**: borrá `data/wa-auth/` y reiniciá el bot
  (`docker compose restart bot`) para regenerar la sesión.
- **Error de OpenAI 401/429**: revisá `OPENAI_API_KEY` y que la cuenta tenga
  facturación activa.
- **Agregaste una dependencia a `bot/package.json`**: hay que reconstruir la
  imagen (`docker compose build bot`), el volumen anónimo de `node_modules` no
  se actualiza solo.
- **El panel encola pero el bot no envía**: panel y bot tienen que hablar con el
  MISMO Redis. El del compose se publica en `localhost:6380` justamente porque
  en 6379 suele haber un Redis local (Homebrew) que se roba las conexiones del
  host. Verificá que `REDIS_URL` de `.env.local` apunte a `localhost:6380`.

## Seguridad

- Ninguna credencial va en el código: todo por `.env.local` (gitignored).
- El panel `/whatsapp` está detrás del login del CRM (a diferencia de un panel
  standalone). Aun así, antes de exponer la app a internet aplican las mismas
  reglas del resto del repo: no publicar los puertos de Postgres/Redis y servir
  detrás de HTTPS.

## Mejoras pendientes (fuera de scope v1)

- Asignar el lead a un vendedor automáticamente (hoy queda "sin asignar").
- Media entrante (audio/imagen/sticker) — hoy se ignora.
- Marcar conversaciones como leídas / no leídos.
- Paginación del historial en el panel.
- Grupos de WhatsApp.
