import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarClock,
  HandCoins,
  Receipt,
  TrendingUp,
  Wallet,
  Warehouse,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListaBarras, Medidor } from "@/components/app/charts";
import { BadgeEstadoOrden } from "@/components/app/badges-operaciones";
import { KpiCard } from "@/components/app/kpi-card";
import {
  calcularMesActivo,
  obtenerAlertasOperativas,
  obtenerKpisFinancieros,
  obtenerMovimientosCaja,
  obtenerOrdenesTaller,
  obtenerProximosVencimientos,
  obtenerRankingVendedores,
  obtenerVentas,
} from "@/lib/data-operaciones";
import {
  formatearFecha,
  formatearMes,
  formatearNumero,
  formatearPesos,
  formatearPesosCompacto,
  nombreMes,
  pluralizar,
} from "@/lib/format";
import { CATEGORIAS_CAJA } from "@/lib/labels";
import type { EstadoOrdenTaller } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

const ESTADOS_TALLER_ABIERTOS: EstadoOrdenTaller[] = [
  "pendiente",
  "en_reparacion",
  "esperando_repuestos",
];

export default async function DashboardPage() {
  const [kpis, alertas, ranking, vencimientos, ventas, ordenes, caja] =
    await Promise.all([
      obtenerKpisFinancieros(),
      obtenerAlertasOperativas(),
      obtenerRankingVendedores(),
      // Las cuotas de la cartera son mensuales: con 7 días la lista queda vacía
      // casi siempre.
      obtenerProximosVencimientos(30),
      obtenerVentas(),
      obtenerOrdenesTaller(),
      obtenerMovimientosCaja(),
    ]);

  const mesActivo = calcularMesActivo(ventas);
  const mes = nombreMes(mesActivo);

  // Serie de ventas: últimos seis meses con actividad.
  const porMes = new Map<string, number>();
  for (const v of ventas) {
    const m = v.fecha.slice(0, 7);
    porMes.set(m, (porMes.get(m) ?? 0) + 1);
  }
  const serieVentas = [...porMes.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-6);

  const maxFacturacion = Math.max(...ranking.map((v) => v.facturacion), 1);

  const enTaller = ordenes.filter((o) =>
    ESTADOS_TALLER_ABIERTOS.includes(o.estado),
  );
  const totalPorCobrar = vencimientos.reduce((acc, v) => acc + v.cuota.monto, 0);
  const ultimosMovimientos = caja.slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Hoy en Sosa Drive
        </h2>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}{" "}
          · los indicadores del mes son de {formatearMes(mesActivo)}.
        </p>
      </div>

      {alertas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base">
              <AlertTriangle
                className="size-4 text-warning"
                aria-hidden="true"
              />
              Lo que hay que mirar
            </CardTitle>
            <CardDescription>
              Calculado sobre lo que ya está registrado en operaciones.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {alertas.map((alerta) => (
              <div
                key={alerta.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      alerta.severidad === "alta" && "bg-destructive",
                      alerta.severidad === "media" && "bg-warning",
                      alerta.severidad === "baja" && "bg-muted-foreground",
                    )}
                    aria-hidden="true"
                  />
                  <Badge
                    variant="outline"
                    className="hidden capitalize sm:inline-flex"
                  >
                    {alerta.severidad}
                  </Badge>
                  <p className="text-sm">{alerta.mensaje}</p>
                </div>
                {alerta.accion && (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs"
                  >
                    <Link href={alerta.accion.href}>
                      {alerta.accion.etiqueta}
                      <ArrowRight className="size-3" aria-hidden="true" />
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <section
        aria-label={`Indicadores de ${formatearMes(mesActivo)}`}
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      >
        <KpiCard
          etiqueta={`Ventas de ${mes}`}
          valor={formatearNumero(kpis.ventasMes)}
          icono={TrendingUp}
        />
        <KpiCard
          etiqueta="Facturación"
          valor={formatearPesosCompacto(kpis.facturacionMes)}
          icono={Banknote}
        />
        <KpiCard
          etiqueta="Ganancia neta"
          valor={formatearPesosCompacto(kpis.gananciaNetaMes)}
          icono={TrendingUp}
          destacado={kpis.gananciaNetaMes < 0}
        />
        <KpiCard
          etiqueta="Gastos del mes"
          valor={formatearPesosCompacto(kpis.gastosMes)}
          icono={Receipt}
        />
        <KpiCard
          etiqueta="Unidades en stock"
          valor={formatearNumero(kpis.stockTotal)}
          icono={Warehouse}
        />
        <KpiCard
          etiqueta="Saldo de caja"
          valor={formatearPesosCompacto(kpis.saldoCaja)}
          icono={Wallet}
          destacado={kpis.saldoCaja < 0}
        />
        <KpiCard
          etiqueta="Pendiente de cobro"
          valor={formatearPesosCompacto(kpis.pendienteCobro)}
          icono={HandCoins}
        />
        <KpiCard
          etiqueta="Clientes en mora"
          valor={formatearNumero(kpis.deudores)}
          icono={AlertTriangle}
          destacado={kpis.deudores > 0}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">
              Ventas por mes
            </CardTitle>
            <CardDescription>
              Unidades vendidas en los últimos meses con actividad.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {serieVentas.length > 0 ? (
              <ListaBarras
                descripcion={`Ventas por mes: ${serieVentas
                  .map(([m, c]) => `${formatearMes(m)} ${c}`)
                  .join(", ")}`}
                datos={serieVentas.map(([m, cantidad]) => ({
                  etiqueta: formatearMes(m),
                  valor: cantidad,
                }))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Todavía no hay ventas registradas.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">
              Ranking de vendedores
            </CardTitle>
            <CardDescription>
              Facturación y ganancia de {mes}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {ranking.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ninguna venta registrada en {mes}.
              </p>
            )}
            {ranking.map((v, i) => (
              <div key={v.nombre} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium">
                    <span className="mr-2 text-muted-foreground">{i + 1}</span>
                    {v.nombre}
                  </p>
                  <p className="shrink-0 text-sm font-medium tabular-nums">
                    {formatearPesosCompacto(v.facturacion)}
                  </p>
                </div>
                <Medidor valor={v.facturacion} max={maxFacturacion} />
                <p className="text-xs text-muted-foreground">
                  {pluralizar(v.ventas, "venta", "ventas")} ·{" "}
                  {formatearPesosCompacto(v.ganancia)} de ganancia
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base">
              <CalendarClock className="size-4" aria-hidden="true" />
              Cobranzas de los próximos 30 días
            </CardTitle>
            <CardDescription>
              {vencimientos.length > 0
                ? `${pluralizar(vencimientos.length, "cuota", "cuotas")} por ${formatearPesos(totalPorCobrar)}.`
                : "Sin cuotas por vencer en el próximo mes."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {vencimientos.slice(0, 6).map((v) => (
              <div
                key={v.cuota.id}
                className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {v.clienteNombre}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Cuota {v.cuota.numero} · {v.descripcionMoto}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium tabular-nums">
                    {formatearPesos(v.cuota.monto)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    vence {formatearFecha(v.cuota.vencimiento)}
                  </p>
                </div>
              </div>
            ))}
            <Button asChild variant="ghost" size="sm" className="self-start gap-1 text-xs">
              <Link href="/creditos">
                {vencimientos.length > 6
                  ? `Ver las ${formatearNumero(vencimientos.length)} cuotas`
                  : "Ver créditos"}
                <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base">
              <Wrench className="size-4" aria-hidden="true" />
              Taller en curso
            </CardTitle>
            <CardDescription>
              {enTaller.length > 0
                ? `${pluralizar(enTaller.length, "orden abierta", "órdenes abiertas")}.`
                : "No hay órdenes abiertas."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {enTaller.slice(0, 6).map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    #{o.numero} · {o.motoDescripcion}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {o.clienteNombre} · {o.motivo}
                  </p>
                </div>
                <BadgeEstadoOrden estado={o.estado} />
              </div>
            ))}
            <Button asChild variant="ghost" size="sm" className="self-start gap-1 text-xs">
              <Link href="/taller">
                {enTaller.length > 6
                  ? `Ver las ${formatearNumero(enTaller.length)} órdenes`
                  : "Ver taller"}
                <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <Wallet className="size-4" aria-hidden="true" />
            Últimos movimientos de caja
          </CardTitle>
          <CardDescription>
            Saldo actual: {formatearPesos(kpis.saldoCaja)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5">
          {ultimosMovimientos.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">{m.descripcion}</p>
                <p className="text-xs text-muted-foreground">
                  {formatearFecha(m.fecha)} · {CATEGORIAS_CAJA[m.categoria]}
                </p>
              </div>
              <p
                className={cn(
                  "shrink-0 text-sm font-medium tabular-nums",
                  m.tipo === "ingreso" ? "text-success" : "text-destructive",
                )}
              >
                {m.tipo === "ingreso" ? "+" : "−"}
                {formatearPesos(m.monto)}
              </p>
            </div>
          ))}
          <Button asChild variant="ghost" size="sm" className="self-start gap-1 text-xs">
            <Link href="/caja">
              Ver caja
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
