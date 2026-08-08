# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> **Léelo en serio:** esta versión de Next.js (16) tiene cambios de ruptura respecto a lo que conocés. Antes de escribir código, consultá la guía relevante en `node_modules/next/dist/docs/` (`01-app`, `03-architecture`, etc.). Ejemplo concreto ya presente: el middleware vive en `proxy.ts` (no `middleware.ts`) y exporta una función `proxy`.

## Comandos

```bash
npm install       # instalar dependencias
npm run db:up     # levantar PostgreSQL + Redis en Docker (docker-compose.yml)
npm run db:seed   # sembrar la base con los datos de ejemplo (scripts/seed.ts)
npm run dev       # servidor de desarrollo (Turbopack) en http://localhost:3000
npm run build     # build de producción
npm run start     # servir el build
npm run lint      # ESLint (eslint-config-next)
npm run db:down   # bajar el stack; db:reset lo recrea desde cero y re-siembra
```

Para desarrollar necesitás la base levantada: `npm run db:up && npm run db:seed`. El seed imprime el usuario gerente y la contraseña de demo para loguearte.

No hay suite de tests configurada. `packageManager` declara pnpm, pero el flujo documentado usa `npm`.

## Idioma y convenciones

- **Todo el texto de UI va en español rioplatense: vos, no tú** (elegí, mirá, probá). Es un requisito explícito.
- **El dominio se nombra en español**: tablas y columnas en `snake_case` (`leads`, `motos`, `perfiles`, `moto_interes_id`); funciones y tipos en camelCase español (`obtenerLeads`, `EtapaEmbudo`, `mapearLead`). Los mapeadores en `lib/data.ts` traducen las filas `snake_case` de Postgres a camelCase de los tipos.
- **Design system** (flat design): primario slate `#1E293B`, acento rojo acción `#DC2626`, fondo `#F8FAFC`. Sidebar slate-900. Poppins (títulos) / Open Sans (cuerpo). Tailwind CSS v4 + shadcn/ui.

## Arquitectura

CRM/plataforma comercial para una concesionaria de motos (Fase 1 del `PRD — Sosa Drive.md`) más el **módulo de Operaciones** (`PRD-modelo-base.md`: inventario por unidad, kardex, compras, taller, créditos propios, gastos, caja, clientes y auditoría). Next.js 16 App Router + React 19 + PostgreSQL + Redis (self-hosted en Docker).

### Módulo de Operaciones — datos

- `lib/datos-reales.ts` está **generado** desde los Excel del cliente (`archivos/Inventario 2026.xlsx`, `archivos/ventas junio 2026.xlsx` y `archivos/CONTROL STOCK Y VENTAS.xlsx`): inventario físico de julio fusionado con los precios/costos del dueño, más las ventas reales de junio y julio (las de julio matcheadas a unidades por modelo + método + vendedor). `lib/datos-cartera.ts` es la cartera real de créditos importada de `archivos/control de cuotas.xlsx` (115 planes: cliente real, moto, cuota mensual, cuotas del plan; **sin** teléfono/DNI/capital/historial porque la planilla no los registra — no se inventa lo que falta, se muestra vacío o "Sin nombre"). No los edites a mano salvo correcciones puntuales comentadas; el script de fusión vive fuera del repo (scratchpad de la sesión que lo generó).
- El plan de cuotas de un crédito **se deriva**, no se carga a mano: `creditos.dia_pago` + `creditos.fecha_inicio` + `cantidad_cuotas` generan los vencimientos (`lib/creditos.ts`, módulo puro; si el mes no llega al día acordado la cuota vence el último día). De ahí sale si el cliente está al día o en mora (`resumirPlan`/`estadoEfectivoCredito` en `lib/data-operaciones.ts`). La planilla original anotaba el día de pago como texto libre en las observaciones: la migración `20260808000001` lo extrae, y los planes que no lo tenían quedan en "Sin definir" para que administración lo cargue.
- `lib/mock-operaciones.ts` deriva de esos datos todo lo que el Excel no registra (kardex, clientes, cuotas, caja, auditoría) en forma determinística (sin `Math.random`).
- `lib/data-operaciones.ts` (`server-only`) es la capa de datos del módulo; las vistas derivadas (`obtenerDeudores`, `obtenerKpisFinancieros`) se calculan en JS sobre los getters.
- Migración: `db/migrations/20260801000001_operaciones.sql`. Reglas del PRD en la base: kardex y auditoría inmutables (triggers), dominio/número de cuadro únicos, la venta descuenta stock por trigger. El seed (`scripts/seed.ts`) los apaga temporalmente para sembrar el historial verbatim sin duplicar.

### Capa de datos y Postgres — el eje central

La app consulta **PostgreSQL directamente** con `pg`. No hay modo demo: necesitás la base levantada (`npm run db:up`) y sembrada (`npm run db:seed`).

- `lib/db/pool.ts` (`server-only`) exporta el `Pool` de `pg` y el helper `query(sql, params)`. Configura los type parsers para que `date`/`timestamp` vuelvan como strings (la capa de datos las trata como ISO). `lib/db/redis.ts` exporta el cliente de Redis (sesiones); **no importar en el middleware** (corre en Edge).
- `lib/data.ts` y `lib/data-operaciones.ts` (`import "server-only"`) son la **capa de datos**: cada función hace `query(...)` y mapea las filas `snake_case` de Postgres a los tipos. Al agregar una consulta, seguí ese patrón y su mapeador. La autorización por vendedor todavía no está en las queries (deuda: agregar `where vendedor_id = ...` cuando haga falta; antes la imponía RLS).
- **Auth propia** (`lib/auth/`): password con `argon2` (`password.ts`), sesión en Redis + cookie httpOnly `sid` (`session.ts`, constante en `constants.ts`), Server Actions de login/logout (`acciones.ts`). `usuarioActual()` en `lib/auth.ts` lee la sesión y consulta `perfiles`.
- `proxy.ts` → `lib/auth/middleware.ts`: en el Edge solo chequea **presencia** de la cookie `sid` (no toca Redis) y redirige a `/login` salvo rutas públicas (`/login`, `/api/auth`). La validación real de la sesión ocurre en `usuarioActual()`/los Server Components (runtime Node).

### Estructura de rutas

- `app/(app)/` es el shell autenticado (sidebar + topbar, `components/app/`). Cada sección es una ruta: `dashboard`, `inbox`, `leads`, `pipeline`, `catalogo`, `tareas`, `agenda`, `equipo`, `configuracion`. La navegación se define en `components/app/nav.ts`.
- `app/login/` es la entrada (login por email + contraseña vía Server Action).
- **Server Components por defecto.** Solo son `"use client"` los archivos que lo necesitan (ej. `leads/tabla-leads.tsx`, `inbox/inbox-cliente.tsx`). Las páginas server obtienen datos vía `lib/data.ts` y pasan props a los componentes cliente.

### Base de datos

- `db/migrations/` — esquema completo, Postgres puro (sin RLS ni schema `auth`); enums de dominio en español (`estado_lead`, `fuente_lead`, `forma_pago`, etc.). El `postgres` de Docker corre estos `.sql` en orden alfabético al primer init.
- `scripts/seed.ts` — siembra la base reusando los datos de `lib/mock-data.ts` y `lib/mock-operaciones.ts`. Los mock ya **no se usan en runtime**: son solo la fuente del seed. Mapea sus ids string a UUID estables preservando las FKs.

### Gotchas conocidos

- `lucide-react` v1 ya no trae íconos de marcas: hay SVG propios en `components/app/brand-icons.tsx`.
- `radix-ui`/`react-slot` usa `createContext` a nivel de módulo, por eso `components/ui/button.tsx` y `badge.tsx` llevan `"use client"`.
- El Redis del compose se publica en el **puerto 6380** del host (no 6379): en 6379 suele haber un Redis local de Homebrew que se roba las conexiones de la app y parte en dos las colas del bot de WhatsApp. `REDIS_URL` va a `localhost:6380`.
