import { Contact, HandCoins, ShoppingBag } from "lucide-react";
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
import { KpiCard } from "@/components/app/kpi-card";
import { BadgeEstadoCredito } from "@/components/app/badges-operaciones";
import {
  obtenerClientesOperaciones,
  obtenerCreditos,
  obtenerOrdenesTaller,
  obtenerVentas,
} from "@/lib/data-operaciones";
import { formatearFecha, formatearPesos } from "@/lib/format";
import { METODOS_VENTA } from "@/lib/labels";
import { NuevoCliente } from "./formularios";

export const metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const [clientes, ventas, creditos, ordenes] = await Promise.all([
    obtenerClientesOperaciones(),
    obtenerVentas(),
    obtenerCreditos(),
    obtenerOrdenesTaller(),
  ]);

  const ventasPorCliente = new Map<string, typeof ventas>();
  for (const v of ventas) {
    if (!v.clienteId) continue;
    ventasPorCliente.set(v.clienteId, [
      ...(ventasPorCliente.get(v.clienteId) ?? []),
      v,
    ]);
  }
  const creditosPorCliente = new Map(creditos.map((c) => [c.clienteId, c]));
  const conCredito = creditos.filter(
    (c) => c.estado === "al_dia" || c.estado === "en_mora",
  ).length;
  const servicios = new Set(ordenes.map((o) => o.clienteNombre));

  // Ficha única: se listan por su última compra, los más recientes primero.
  const ordenados = [...clientes].sort((a, b) => {
    const fa = ventasPorCliente.get(a.id)?.[0]?.fecha ?? "";
    const fb = ventasPorCliente.get(b.id)?.[0]?.fecha ?? "";
    return fa < fb ? 1 : -1;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Clientes
          </h2>
          <p className="text-sm text-muted-foreground">
            Ficha única por cliente: compras, créditos y servicios en un solo
            lugar.
          </p>
        </div>
        <NuevoCliente />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          etiqueta="Clientes"
          valor={String(clientes.length)}
          icono={Contact}
        />
        <KpiCard
          etiqueta="Con crédito activo"
          valor={String(conCredito)}
          icono={HandCoins}
        />
        <KpiCard
          etiqueta="Pasaron por el taller"
          valor={String(
            [...servicios].filter((s) => s !== "Sosa Drive (stock propio)")
              .length,
          )}
          icono={ShoppingBag}
        />
      </div>

      <Card className="py-0">
        <CardHeader className="pt-5">
          <CardTitle className="text-base">Todos los clientes</CardTitle>
          <CardDescription>
            Importados de la cartera de créditos (control de cuotas). La
            planilla no registra teléfono ni DNI: se completan al actualizar
            cada ficha.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Última compra</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Total comprado</TableHead>
                  <TableHead>Crédito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordenados.map((c) => {
                  const compras = ventasPorCliente.get(c.id) ?? [];
                  const ultima = compras[0];
                  const credito = creditosPorCliente.get(c.id);
                  const total = compras.reduce(
                    (acc, v) => acc + (v.precio ?? 0),
                    0,
                  );
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.telefono ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {c.dni ?? "—"}
                      </TableCell>
                      <TableCell>
                        {ultima ? (
                          <>
                            <p className="max-w-52 truncate">
                              {ultima.descripcion}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatearFecha(ultima.fecha)}
                            </p>
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ultima ? METODOS_VENTA[ultima.metodo] : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {total > 0 ? formatearPesos(total) : "—"}
                      </TableCell>
                      <TableCell>
                        {credito ? (
                          <BadgeEstadoCredito estado={credito.estado} />
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
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
    </div>
  );
}
