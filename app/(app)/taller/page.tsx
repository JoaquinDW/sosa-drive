import { AlertTriangle, PackageSearch, Receipt, Wrench } from "lucide-react";
import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/app/kpi-card";
import { BadgeEstadoOrden } from "@/components/app/badges-operaciones";
import {
  obtenerGastosTaller,
  obtenerOrdenesTaller,
  obtenerRepuestos,
  obtenerUnidadesInventario,
} from "@/lib/data-operaciones";
import { formatearFecha, formatearPesos } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NuevaOrdenTaller, NuevoRepuesto } from "./formularios";

export const metadata = { title: "Taller" };

const PRIORIDADES: Record<string, string> = {
  alta: "text-destructive",
  media: "text-amber-600 dark:text-amber-400",
  baja: "text-muted-foreground",
};

export default async function TallerPage() {
  const [ordenes, gastos, repuestos, unidades] = await Promise.all([
    obtenerOrdenesTaller(),
    obtenerGastosTaller(),
    obtenerRepuestos(),
    obtenerUnidadesInventario(),
  ]);

  const opcionesUnidad = unidades.map((u) => ({
    id: u.id,
    etiqueta: `${u.marca} ${u.modelo}${u.dominio ? ` · ${u.dominio}` : ""}`,
  }));

  const costoPorOrden = new Map<string, number>();
  for (const g of gastos) {
    costoPorOrden.set(g.ordenId, (costoPorOrden.get(g.ordenId) ?? 0) + g.monto);
  }

  const abiertas = ordenes.filter(
    (o) =>
      o.estado === "pendiente" ||
      o.estado === "en_reparacion" ||
      o.estado === "esperando_repuestos",
  );
  const esperandoRepuestos = ordenes.filter(
    (o) => o.estado === "esperando_repuestos",
  );
  const costoTotal = [...costoPorOrden.values()].reduce((a, b) => a + b, 0);
  const bajoMinimo = repuestos.filter((r) => r.cantidad < r.stockMinimo);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Taller
          </h2>
          <p className="text-sm text-muted-foreground">
            Órdenes de trabajo con sus gastos asociados: cada peso que entra al
            taller afecta la rentabilidad.
          </p>
        </div>
        <NuevaOrdenTaller unidades={opcionesUnidad} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          etiqueta="Órdenes abiertas"
          valor={String(abiertas.length)}
          icono={Wrench}
        />
        <KpiCard
          etiqueta="Esperando repuestos"
          valor={String(esperandoRepuestos.length)}
          icono={PackageSearch}
          destacado={esperandoRepuestos.length > 0}
        />
        <KpiCard
          etiqueta="Gastos de taller acumulados"
          valor={formatearPesos(costoTotal)}
          icono={Receipt}
        />
        <KpiCard
          etiqueta="Repuestos bajo mínimo"
          valor={String(bajoMinimo.length)}
          icono={AlertTriangle}
          destacado={bajoMinimo.length > 0}
        />
      </div>

      <Tabs defaultValue="ordenes">
        <TabsList>
          <TabsTrigger value="ordenes">Órdenes de trabajo</TabsTrigger>
          <TabsTrigger value="repuestos">Repuestos</TabsTrigger>
        </TabsList>

        <TabsContent value="ordenes" className="mt-4">
          <Card className="py-0">
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OT</TableHead>
                      <TableHead>Moto</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Mecánico</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Ingreso</TableHead>
                      <TableHead>Estimada</TableHead>
                      <TableHead className="text-right">Gastos</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordenes.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">
                          {o.numero}
                        </TableCell>
                        <TableCell className="font-medium">
                          {o.unidadId ? (
                            <Link
                              href={`/stock/${o.unidadId}`}
                              className="hover:underline"
                            >
                              {o.motoDescripcion}
                            </Link>
                          ) : (
                            o.motoDescripcion
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {o.clienteNombre}
                        </TableCell>
                        <TableCell className="max-w-56 truncate">
                          {o.motivo}
                        </TableCell>
                        <TableCell>{o.mecanico}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "text-sm font-medium capitalize",
                              PRIORIDADES[o.prioridad],
                            )}
                          >
                            {o.prioridad}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatearFecha(o.fechaIngreso)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {o.fechaEstimada ? formatearFecha(o.fechaEstimada) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {costoPorOrden.has(o.id)
                            ? formatearPesos(costoPorOrden.get(o.id)!)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <BadgeEstadoOrden estado={o.estado} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repuestos" className="mt-4">
          <Card className="py-0">
            <CardHeader className="flex-row items-start justify-between gap-4 pt-5">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-base">
                  Inventario de repuestos
                </CardTitle>
                <CardDescription>
                  Cuando la cantidad baja del mínimo, el repuesto queda marcado
                  para reponer.
                </CardDescription>
              </div>
              <NuevoRepuesto />
            </CardHeader>
            <CardContent className="px-0 pb-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Repuesto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Mínimo</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repuestos.map((r) => {
                      const reponer = r.cantidad < r.stockMinimo;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">
                            {r.codigo}
                          </TableCell>
                          <TableCell className="font-medium">
                            {r.nombre}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {r.categoria}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {r.proveedor ?? "—"}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-medium tabular-nums",
                              reponer && "text-destructive",
                            )}
                          >
                            {r.cantidad}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground tabular-nums">
                            {r.stockMinimo}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatearPesos(r.costo)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatearPesos(r.precio)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {r.ubicacion}
                          </TableCell>
                          <TableCell>
                            {reponer && (
                              <Badge
                                variant="outline"
                                className="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                              >
                                Reponer
                              </Badge>
                            )}
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
      </Tabs>
    </div>
  );
}
