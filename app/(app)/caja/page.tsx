import {
  ArrowDownRight,
  ArrowUpRight,
  Scale,
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
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/app/kpi-card";
import { obtenerMovimientosCaja } from "@/lib/data-operaciones";
import { formatearFecha, formatearPesos, formatearPesosCompacto } from "@/lib/format";
import { CATEGORIAS_CAJA } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { NuevoMovimientoCaja } from "./formularios";

export const metadata = { title: "Caja" };

export default async function CajaPage() {
  const movimientos = await obtenerMovimientosCaja();

  const saldo = movimientos.reduce(
    (acc, m) => acc + (m.tipo === "ingreso" ? m.monto : -m.monto),
    0,
  );

  // Ventana móvil de 30 días: a principio de mes, el mes calendario solo
  // tendría un puñado de movimientos y los KPIs quedarían vacíos.
  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);
  const desde = hace30.toISOString().slice(0, 10);
  const recientes = movimientos.filter((m) => m.fecha >= desde);
  const ingresosMes = recientes
    .filter((m) => m.tipo === "ingreso")
    .reduce((acc, m) => acc + m.monto, 0);
  const egresosMes = recientes
    .filter((m) => m.tipo === "egreso")
    .reduce((acc, m) => acc + m.monto, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Caja
          </h2>
          <p className="text-sm text-muted-foreground">
            Todos los movimientos financieros: ventas, cobros, compras, gastos y
            sueldos.
          </p>
        </div>
        <NuevoMovimientoCaja />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          etiqueta="Saldo actual"
          valor={formatearPesosCompacto(saldo)}
          icono={Wallet}
          destacado={saldo < 0}
        />
        <KpiCard
          etiqueta="Ingresos (30 días)"
          valor={formatearPesosCompacto(ingresosMes)}
          icono={ArrowUpRight}
        />
        <KpiCard
          etiqueta="Egresos (30 días)"
          valor={formatearPesosCompacto(egresosMes)}
          icono={ArrowDownRight}
        />
        <KpiCard
          etiqueta="Resultado (30 días)"
          valor={formatearPesosCompacto(ingresosMes - egresosMes)}
          icono={Scale}
          destacado={ingresosMes - egresosMes < 0}
        />
      </div>

      <Card className="py-0">
        <CardHeader className="pt-5">
          <CardTitle className="text-base">Movimientos</CardTitle>
          <CardDescription>
            Generados automáticamente desde ventas, cuotas, compras y gastos
            registrados.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.slice(0, 60).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatearFecha(m.fecha)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {CATEGORIAS_CAJA[m.categoria]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-96 truncate">
                      {m.descripcion}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium tabular-nums",
                        m.tipo === "ingreso"
                          ? "text-success"
                          : "text-destructive",
                      )}
                    >
                      {m.tipo === "ingreso" ? "+" : "−"}
                      {formatearPesos(m.monto)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
