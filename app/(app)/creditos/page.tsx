import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  HandCoins,
  MessageCircle,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/app/kpi-card";
import {
  BadgeEstadoCredito,
  BadgeEstadoCuota,
} from "@/components/app/badges-operaciones";
import {
  conVencimientos,
  obtenerClientesOperaciones,
  obtenerCreditos,
  obtenerCuotas,
  obtenerDeudores,
  obtenerKpisFinancieros,
  obtenerUnidadesInventario,
  obtenerVentas,
  resumirPlan,
} from "@/lib/data-operaciones";
import { formatearFecha, formatearPesos, formatearPesosCompacto } from "@/lib/format";
import { EditarCredito, NuevoCredito } from "./formularios";

export const metadata = { title: "Créditos" };

export default async function CreditosPage() {
  const [kpis, deudores, creditos, cuotas, clientes, ventas, unidades] =
    await Promise.all([
      obtenerKpisFinancieros(),
      obtenerDeudores(),
      obtenerCreditos(),
      obtenerCuotas(),
      obtenerClientesOperaciones(),
      obtenerVentas(),
      obtenerUnidadesInventario(),
    ]);

  const opcionesCliente = clientes.map((c) => ({ id: c.id, etiqueta: c.nombre }));
  const opcionesUnidad = unidades
    .filter((u) => u.estado === "disponible")
    .map((u) => ({
      id: u.id,
      etiqueta: `${u.marca} ${u.modelo}${u.dominio ? ` · ${u.dominio}` : ""}`,
    }));

  const clientesPorId = new Map(clientes.map((c) => [c.id, c]));
  const ventasPorId = new Map(ventas.map((v) => [v.id, v]));
  const efectivas = conVencimientos(cuotas);

  const hoy = new Date().toISOString().slice(0, 10);
  const enSieteDias = new Date();
  enSieteDias.setDate(enSieteDias.getDate() + 7);
  const limite = enSieteDias.toISOString().slice(0, 10);
  const proximas = efectivas
    .filter(
      (c) => c.estado === "pendiente" && c.vencimiento >= hoy && c.vencimiento <= limite,
    )
    .sort((a, b) => (a.vencimiento < b.vencimiento ? -1 : 1));

  const cuotasPorCredito = new Map<string, typeof cuotas>();
  for (const cuota of cuotas) {
    const propias = cuotasPorCredito.get(cuota.creditoId) ?? [];
    propias.push(cuota);
    cuotasPorCredito.set(cuota.creditoId, propias);
  }
  // El estado y el saldo salen de las cuotas, no del enum guardado.
  const resumenes = new Map(
    creditos.map((c) => [c.id, resumirPlan(c, cuotasPorCredito.get(c.id) ?? [])]),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Créditos propios
          </h2>
          <p className="text-sm text-muted-foreground">
            La cartera real de agosto: planes de financiación de la casa,
            cuotas y seguimiento de deudores.
          </p>
        </div>
        <NuevoCredito clientes={opcionesCliente} unidades={opcionesUnidad} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          etiqueta="Monto financiado"
          valor={formatearPesosCompacto(kpis.montoFinanciado)}
          icono={HandCoins}
        />
        <KpiCard
          etiqueta="Cobrado"
          valor={formatearPesosCompacto(kpis.cobrado)}
          icono={Wallet}
        />
        <KpiCard
          etiqueta="Pendiente de cobro"
          valor={formatearPesosCompacto(kpis.pendienteCobro)}
          icono={CalendarClock}
        />
        <KpiCard
          etiqueta="Clientes en mora"
          valor={String(deudores.length)}
          icono={AlertTriangle}
          destacado={deudores.length > 0}
        />
      </div>

      <Tabs defaultValue="deudores">
        <TabsList>
          <TabsTrigger value="deudores">Deudores</TabsTrigger>
          <TabsTrigger value="planes">Planes</TabsTrigger>
          <TabsTrigger value="proximas">Próximos vencimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="deudores" className="mt-4">
          <Card className="py-0">
            <CardHeader className="pt-5">
              <CardTitle className="text-base">Clientes con cuotas vencidas</CardTitle>
              <CardDescription>
                Ordenados por monto vencido. Contactalos por WhatsApp con un
                clic.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Moto</TableHead>
                      <TableHead className="text-right">Cuotas vencidas</TableHead>
                      <TableHead className="text-right">Monto vencido</TableHead>
                      <TableHead className="text-right">Días de atraso</TableHead>
                      <TableHead>Próximo venc.</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deudores.map((d) => (
                      <TableRow key={d.credito.id}>
                        <TableCell>
                          <Link
                            href={`/creditos/${d.credito.id}`}
                            className="font-medium hover:underline"
                          >
                            {d.cliente.nombre}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {d.cliente.telefono}
                          </p>
                        </TableCell>
                        <TableCell className="max-w-52 truncate">
                          {d.ventaDescripcion}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {d.cuotasVencidas}
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive tabular-nums">
                          {formatearPesos(d.montoVencido)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {d.diasAtraso}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {d.proximoVencimiento
                            ? formatearFecha(d.proximoVencimiento)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={`https://wa.me/54${(d.cliente.telefono ?? "").replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle
                                className="size-3.5"
                                aria-hidden="true"
                              />
                              WhatsApp
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {deudores.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          Sin cuotas vencidas registradas. La cartera se
                          importó sin historial de pagos: la mora va a aparecer
                          acá a medida que se registren pagos y vencimientos.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planes" className="mt-4">
          <Card className="py-0">
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N°</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Moto</TableHead>
                      <TableHead className="text-right">Cuota mensual</TableHead>
                      <TableHead>Día de pago</TableHead>
                      <TableHead className="text-right">Cuotas</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditos.map((c) => {
                      const cliente = clientesPorId.get(c.clienteId);
                      const venta = c.ventaId
                        ? ventasPorId.get(c.ventaId)
                        : undefined;
                      const resumen = resumenes.get(c.id)!;
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {c.numero ?? "—"}
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link
                              href={`/creditos/${c.id}`}
                              className="hover:underline"
                            >
                              {cliente?.nombre ?? "Sin nombre"}
                            </Link>
                          </TableCell>
                          <TableCell className="max-w-52 truncate">
                            {c.descripcionMoto ?? venta?.descripcion ?? "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {c.cuotaMensual !== undefined
                              ? formatearPesos(c.cuotaMensual)
                              : "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap tabular-nums">
                            {c.diaPago ? (
                              `Todos los ${c.diaPago}`
                            ) : (
                              <span className="text-xs text-destructive">
                                Sin definir
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {resumen.cuotasPagadas}/{c.cantidadCuotas ?? "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatearPesos(resumen.saldo)}
                          </TableCell>
                          <TableCell>
                            <BadgeEstadoCredito estado={resumen.estado} />
                          </TableCell>
                          <TableCell className="text-right">
                            <EditarCredito
                              credito={c}
                              clientes={opcionesCliente}
                              cuotasPagadas={resumen.cuotasPagadas}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proximas" className="mt-4">
          <Card className="py-0">
            <CardHeader className="pt-5">
              <CardTitle className="text-base">
                Cuotas que vencen en los próximos 7 días
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Moto</TableHead>
                      <TableHead className="text-right">Cuota</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proximas.map((cuota) => {
                      const credito = creditos.find(
                        (c) => c.id === cuota.creditoId,
                      );
                      const cliente = credito
                        ? clientesPorId.get(credito.clienteId)
                        : undefined;
                      const venta = credito?.ventaId
                        ? ventasPorId.get(credito.ventaId)
                        : undefined;
                      return (
                        <TableRow key={cuota.id}>
                          <TableCell className="whitespace-nowrap font-medium">
                            {formatearFecha(cuota.vencimiento)}
                          </TableCell>
                          <TableCell>{cliente?.nombre ?? "Sin nombre"}</TableCell>
                          <TableCell className="max-w-52 truncate text-muted-foreground">
                            {credito?.descripcionMoto ?? venta?.descripcion ?? "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {cuota.numero}/{credito?.cantidadCuotas ?? "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatearPesos(cuota.monto)}
                          </TableCell>
                          <TableCell>
                            <BadgeEstadoCuota estado={cuota.estado} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {proximas.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          Sin vencimientos en la próxima semana.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
