import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarCheck,
  Flame,
  MessageSquareWarning,
  Percent,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Embudo, ListaBarras, Medidor } from "@/components/app/charts";
import { KpiCard } from "@/components/app/kpi-card";
import {
  obtenerAlertas,
  obtenerEmbudo,
  obtenerKpis,
  obtenerOrigenLeads,
  obtenerVendedores,
} from "@/lib/data";
import {
  formatearDuracion,
  formatearNumero,
  formatearPesosCompacto,
  formatearPorcentaje,
  iniciales,
} from "@/lib/format";
import { FUENTES_LEAD } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [kpis, embudo, origen, vendedores, alertas] = await Promise.all([
    obtenerKpis(),
    obtenerEmbudo(),
    obtenerOrigenLeads(),
    obtenerVendedores(),
    obtenerAlertas(),
  ]);

  const ranking = [...vendedores].sort(
    (a, b) => b.facturacionMes - a.facturacionMes,
  );
  const maxFacturacion = Math.max(...ranking.map((v) => v.facturacionMes), 1);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Hoy en Sosa Motos
        </h2>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* KPIs del día */}
      <section
        aria-label="Indicadores del día"
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      >
        <KpiCard
          etiqueta="Leads de hoy"
          valor={formatearNumero(kpis.leads)}
          icono={Users}
          deltaPct={kpis.leadsDeltaPct || undefined}
        />
        <KpiCard
          etiqueta="Sin responder"
          valor={formatearNumero(kpis.sinResponder)}
          icono={MessageSquareWarning}
          destacado={kpis.sinResponder > 0}
        />
        <KpiCard
          etiqueta="Leads calientes"
          valor={formatearNumero(kpis.calientes)}
          icono={Flame}
        />
        <KpiCard
          etiqueta="Visitas agendadas"
          valor={formatearNumero(kpis.visitasAgendadas)}
          icono={CalendarCheck}
        />
        <KpiCard
          etiqueta="Ventas"
          valor={formatearNumero(kpis.ventas)}
          icono={TrendingUp}
        />
        <KpiCard
          etiqueta="Facturación"
          valor={formatearPesosCompacto(kpis.facturacion)}
          icono={Banknote}
          deltaPct={kpis.facturacionDeltaPct || undefined}
        />
        <KpiCard
          etiqueta="Conversión"
          valor={formatearPorcentaje(kpis.conversion)}
          icono={Percent}
        />
        <KpiCard
          etiqueta="Respuesta promedio"
          valor={formatearDuracion(kpis.tiempoRespuestaSeg)}
          icono={Timer}
        />
      </section>

      {/* Alertas IA */}
      {alertas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base">
              <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
              Alertas de la IA
            </CardTitle>
            <CardDescription>
              La IA analiza la operación y te avisa antes de que un problema
              crezca.
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
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
                    {alerta.accion}
                    <ArrowRight className="size-3" aria-hidden="true" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Embudo */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">
              Embudo de ventas
            </CardTitle>
            <CardDescription>Del lead a la venta, este mes</CardDescription>
          </CardHeader>
          <CardContent>
            <Embudo
              datos={embudo.map((e) => ({
                etiqueta: e.etapa,
                valor: e.cantidad,
              }))}
              descripcion={`Embudo de ventas: ${embudo
                .map((e) => `${e.etapa} ${e.cantidad}`)
                .join(", ")}`}
            />
          </CardContent>
        </Card>

        {/* Origen de leads */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">
              Origen de los leads
            </CardTitle>
            <CardDescription>De dónde llegan tus clientes hoy</CardDescription>
          </CardHeader>
          <CardContent>
            <ListaBarras
              datos={origen.map((o) => ({
                etiqueta: FUENTES_LEAD[o.fuente],
                valor: o.cantidad,
              }))}
              descripcion={`Origen de leads: ${origen
                .map((o) => `${FUENTES_LEAD[o.fuente]} ${o.cantidad}`)
                .join(", ")}`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Ranking de vendedores */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">
            Ranking de vendedores
          </CardTitle>
          <CardDescription>Facturación y conversión del mes</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {ranking.map((v, i) => (
            <div
              key={v.id}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:grid-cols-[auto_12rem_1fr_auto] sm:gap-4"
            >
              <div className="flex items-center gap-3">
                <span className="w-5 text-center font-heading text-sm font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <Avatar className="size-9">
                  <AvatarFallback className="bg-secondary text-xs font-semibold">
                    {iniciales(v.nombre)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{v.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {formatearNumero(v.ventasMes)} ventas ·{" "}
                  {formatearPorcentaje(v.conversion)} conversión ·{" "}
                  {formatearDuracion(v.tiempoRespuestaSeg)} respuesta
                </p>
              </div>
              <div className="col-span-3 sm:col-span-1">
                <Medidor valor={v.facturacionMes} max={maxFacturacion} />
              </div>
              <p className="hidden text-right text-sm font-medium tabular-nums sm:block">
                {formatearPesosCompacto(v.facturacionMes)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
