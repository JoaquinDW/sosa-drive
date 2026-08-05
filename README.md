# Sosa Drive

**El sistema operativo inteligente de tu concesionaria de motos.** CRM, inbox omnicanal, catálogo, pipeline de ventas, tareas, agenda y métricas en tiempo real — todo en una sola plataforma.

Basado en el [PRD — Sosa Drive](./PRD%20—%20Sosa%20Drive.md). Este repo implementa la **Fase 1 (MVP Comercial)**.

## Stack

- **Next.js 16** (App Router, Turbopack, React 19)
- **PostgreSQL** (vía `pg`) + **Redis** (sesiones), self-hosted en **Docker**
- Autenticación propia: password con `argon2`, sesión en Redis + cookie httpOnly
- **Tailwind CSS v4** + **shadcn/ui** (estilo flat, paleta slate + rojo acción)
- Tipografías: Poppins (títulos) y Open Sans (texto)

## Cómo arrancar

Necesitás Docker corriendo.

```bash
npm install
cp .env.example .env.local   # los valores por defecto coinciden con docker-compose
npm run db:up                # levanta PostgreSQL + Redis
npm run db:seed              # siembra la base con datos de ejemplo
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). El seed imprime en la consola el usuario **gerente** y la contraseña de demo para iniciar sesión (todos los perfiles sembrados comparten esa contraseña).

Comandos útiles:

```bash
npm run db:down    # baja el stack (conserva los datos)
npm run db:reset   # recrea la base desde cero y re-siembra
```

El esquema vive en `db/migrations/` (Postgres puro; el contenedor lo corre al primer init). El explorador web de la base queda en [http://localhost:8080](http://localhost:8080) (Adminer).

## Estructura

```
app/
  login/            # Inicio de sesión (email + contraseña, Server Action)
  (app)/            # Shell con sidebar + topbar
    dashboard/      # Dashboard gerencial: KPIs, embudo, orígenes, ranking, alertas IA
    inbox/          # Inbox omnicanal con hilo, notas privadas y respuestas rápidas
    leads/          # CRM: listado con filtros + perfil con timeline y score IA
    pipeline/       # Kanban por etapa de venta
    catalogo/       # Catálogo de motos + stock por unidad
    tareas/         # Vencidas / para hoy / próximas / completadas
    agenda/         # Visitas, test drives, entregas y services
    equipo/         # Gamificación: niveles, XP, insignias, ranking
    configuracion/  # Distribución de leads y estado de conexión
components/
  app/              # Sidebar, topbar, badges, KPI cards, charts
  ui/               # shadcn/ui
lib/
  data.ts           # Capa de datos: consultas a Postgres (pg)
  db/               # Pool de pg + cliente de Redis
  auth/             # Password (argon2), sesión (Redis), Server Actions, middleware
  mock-data.ts      # Dataset de ejemplo (fuente del seed, no runtime)
db/
  migrations/       # Esquema completo (Postgres puro, sin RLS)
scripts/
  seed.ts           # Siembra la base desde los mock
docker-compose.yml  # PostgreSQL + Redis + Adminer
```

## Roadmap

- **Fase 1 (este repo):** CRM, inbox, catálogo, pipeline, dashboard, tareas. ✔
- **Fase 2:** agentes de IA (cualificador, técnico, financiero, seguimiento), scoring predictivo real, automatizaciones, comisiones.
- **Fase 3:** ERP completo (compras, caja, facturación, taller, repuestos).
