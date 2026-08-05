import {
  AlertTriangle,
  Banknote,
  Bike,
  Warehouse,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  obtenerCompras,
  obtenerKpisFinancieros,
  obtenerMovimientosInventario,
  obtenerUnidadesInventario,
} from "@/lib/data-operaciones";
import { formatearFecha, formatearPesos, formatearPesosCompacto } from "@/lib/format";
import { TIPOS_MOVIMIENTO_INVENTARIO } from "@/lib/labels";
import { TablaInventario } from "./tabla-inventario";
import { NuevaCompra, NuevaUnidad } from "./formularios";

export const metadata = { title: "Stock" };

export default async function InventarioPage() {
  const [unidades, kpis, compras, movimientos] = await Promise.all([
    obtenerUnidadesInventario(),
    obtenerKpisFinancieros(),
    obtenerCompras(),
    obtenerMovimientosInventario(),
  ]);

  const unidadesPorId = new Map(unidades.map((u) => [u.id, u]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Stock
          </h2>
          <p className="text-sm text-muted-foreground">
            Cada moto es única y trazable: estado, ubicación y su historial de
            movimientos. Importado del conteo físico de julio.
          </p>
        </div>
        <NuevaUnidad />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          etiqueta="Stock total"
          valor={String(kpis.stockTotal)}
          icono={Warehouse}
        />
        <KpiCard
          etiqueta="Usadas / 0 km"
          valor={`${kpis.stockUsadas} / ${kpis.stock0km}`}
          icono={Bike}
        />
        <KpiCard
          etiqueta="En taller"
          valor={String(
            unidades.filter((u) => u.estado === "en_taller").length,
          )}
          icono={Wrench}
        />
        <KpiCard
          etiqueta="Valor del inventario"
          valor={formatearPesosCompacto(kpis.valorInventario)}
          icono={Banknote}
        />
        <KpiCard
          etiqueta="Sin precio cargado"
          valor={String(kpis.unidadesSinPrecio)}
          icono={AlertTriangle}
          destacado={kpis.unidadesSinPrecio > 0}
        />
      </div>

      <Tabs defaultValue="unidades">
        <TabsList>
          <TabsTrigger value="unidades">Unidades</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="compras">Compras</TabsTrigger>
        </TabsList>

        <TabsContent value="unidades" className="mt-4">
          <Card className="py-4">
            <CardContent>
              <TablaInventario unidades={unidades} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimientos" className="mt-4">
          <Card className="py-0">
            <CardHeader className="pt-5">
              <CardTitle className="text-base">Kardex</CardTitle>
              <CardDescription>
                Todo cambio del inventario queda registrado. El historial no se
                puede modificar ni borrar.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Origen → Destino</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Usuario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientos.slice(0, 40).map((m) => {
                      const u = unidadesPorId.get(m.unidadId);
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatearFecha(m.fecha)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {u ? (
                              <Link
                                href={`/stock/${u.id}`}
                                className="hover:underline"
                              >
                                {u.marca} {u.modelo}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-normal">
                              {TIPOS_MOVIMIENTO_INVENTARIO[m.tipo]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {m.origen ?? "—"} → {m.destino ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-64 truncate">
                            {m.motivo}
                          </TableCell>
                          <TableCell>{m.usuario}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compras" className="mt-4">
          <Card className="py-0">
            <CardHeader className="flex-row items-start justify-between gap-4 pt-5">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-base">Compras a proveedores</CardTitle>
                <CardDescription>
                  Al confirmar una compra, las unidades se crean y entran al
                  inventario automáticamente.
                </CardDescription>
              </div>
              <NuevaCompra />
            </CardHeader>
            <CardContent className="px-0 pb-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Factura</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Unidades</TableHead>
                      <TableHead className="text-right">Costo total</TableHead>
                      <TableHead>Forma de pago</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compras.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {c.proveedor}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {c.factura}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatearFecha(c.fecha)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.unidadIds.length}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatearPesos(c.costoTotal)}
                        </TableCell>
                        <TableCell>{c.formaPago}</TableCell>
                      </TableRow>
                    ))}
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
