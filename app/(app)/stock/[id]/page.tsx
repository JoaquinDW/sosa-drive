import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bike } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  BadgeEstadoUnidad,
  Precio,
} from "@/components/app/badges-operaciones";
import {
  obtenerMovimientosInventario,
  obtenerOrdenesTaller,
  obtenerUnidadInventario,
  obtenerVentas,
} from "@/lib/data-operaciones";
import {
  formatearFecha,
  formatearHora,
  formatearPesos,
} from "@/lib/format";
import {
  METODOS_VENTA,
  TIPOS_MOVIMIENTO_INVENTARIO,
  UBICACIONES_UNIDAD,
} from "@/lib/labels";

export const metadata = { title: "Unidad" };

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{etiqueta}</span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}

export default async function UnidadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [unidad, movimientos, ventas, ordenes] = await Promise.all([
    obtenerUnidadInventario(id),
    obtenerMovimientosInventario(id),
    obtenerVentas(),
    obtenerOrdenesTaller(),
  ]);
  if (!unidad) notFound();

  const venta = ventas.find((v) => v.unidadId === unidad.id);
  const orden = ordenes.find((o) => o.unidadId === unidad.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/stock" aria-label="Volver al stock">
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <h2 className="font-heading text-2xl font-semibold tracking-tight">
              {unidad.marca} {unidad.modelo}
              {unidad.anio ? ` · ${unidad.anio}` : ""}
            </h2>
            <p className="text-sm text-muted-foreground">
              {unidad.condicion === "0km" ? "0 km" : "Usada"} ·{" "}
              {unidad.cilindrada ? `${unidad.cilindrada} cc · ` : ""}
              {unidad.color}
            </p>
          </div>
        </div>
        <BadgeEstadoUnidad estado={unidad.estado} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bike className="size-4 text-muted-foreground" aria-hidden="true" />
                Ficha de la unidad
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Dato etiqueta="Dominio">
                  {unidad.dominio ?? (
                    <Badge
                      variant="outline"
                      className="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                    >
                      Verificar
                    </Badge>
                  )}
                </Dato>
                <Dato etiqueta="Ubicación">
                  {UBICACIONES_UNIDAD[unidad.ubicacion]}
                </Dato>
                <Dato etiqueta="N.º de motor">
                  <span className="font-mono text-xs">{unidad.numeroMotor ?? "—"}</span>
                </Dato>
                <Dato etiqueta="N.º de cuadro">
                  <span className="font-mono text-xs">{unidad.numeroCuadro ?? "—"}</span>
                </Dato>
                <Dato etiqueta="Ingreso">
                  {formatearFecha(unidad.fechaIngreso)}
                </Dato>
                <Dato etiqueta="Venta">
                  {unidad.fechaVenta ? formatearFecha(unidad.fechaVenta) : "—"}
                </Dato>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <Dato etiqueta="Precio de compra">
                  <Precio valor={unidad.precioCompra} />
                </Dato>
                <Dato etiqueta="Precio de venta">
                  <Precio valor={unidad.precioVenta} />
                </Dato>
                {unidad.precioCompra !== undefined &&
                  unidad.precioVenta !== undefined && (
                    <Dato etiqueta="Margen estimado">
                      <span className="text-success">
                        {formatearPesos(unidad.precioVenta - unidad.precioCompra)}
                      </span>
                    </Dato>
                  )}
              </div>
              {unidad.observaciones && (
                <>
                  <Separator />
                  <Dato etiqueta="Observaciones">{unidad.observaciones}</Dato>
                </>
              )}
            </CardContent>
          </Card>

          {venta && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Venta</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Dato etiqueta="Fecha">{formatearFecha(venta.fecha)}</Dato>
                <Dato etiqueta="Método">{METODOS_VENTA[venta.metodo]}</Dato>
                <Dato etiqueta="Vendedor">{venta.vendedor}</Dato>
                <Dato etiqueta="Precio">
                  <Precio valor={venta.precio} />
                </Dato>
              </CardContent>
            </Card>
          )}

          {orden && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Orden de taller</CardTitle>
                <CardDescription>OT {orden.numero}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Dato etiqueta="Motivo">{orden.motivo}</Dato>
                <Dato etiqueta="Mecánico">{orden.mecanico}</Dato>
                <Dato etiqueta="Ingreso">
                  {formatearFecha(orden.fechaIngreso)}
                </Dato>
                <Dato etiqueta="Estimada">
                  {orden.fechaEstimada
                    ? formatearFecha(orden.fechaEstimada)
                    : "—"}
                </Dato>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="self-start">
          <CardHeader>
            <CardTitle className="text-base">Historial (kardex)</CardTitle>
            <CardDescription>
              Cada movimiento queda registrado con fecha, usuario y motivo. No
              se puede editar ni borrar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col">
              {movimientos.map((m, i) => (
                <li key={m.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < movimientos.length - 1 && (
                    <span
                      className="absolute top-3 left-[5px] h-full w-px bg-border"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  <div className="flex flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="font-normal">
                        {TIPOS_MOVIMIENTO_INVENTARIO[m.tipo]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatearFecha(m.fecha)} · {formatearHora(m.fecha)} ·{" "}
                        {m.usuario}
                      </span>
                    </div>
                    <p className="text-sm">{m.motivo}</p>
                    {(m.origen || m.destino) && (
                      <p className="text-xs text-muted-foreground">
                        {m.origen ?? "—"} → {m.destino ?? "—"}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
