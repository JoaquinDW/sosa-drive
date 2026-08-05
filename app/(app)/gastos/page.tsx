import { Receipt, ChartPie, CalendarDays } from "lucide-react";
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
import { ListaBarras } from "@/components/app/charts";
import { obtenerGastos } from "@/lib/data-operaciones";
import { formatearFecha, formatearPesos, formatearPesosCompacto } from "@/lib/format";
import { CATEGORIAS_GASTO } from "@/lib/labels";
import { NuevoGasto } from "./formularios";

export const metadata = { title: "Gastos" };

export default async function GastosPage() {
  const gastos = await obtenerGastos();

  const mesActivo = gastos[0]?.fecha.slice(0, 7) ?? "";
  const delMes = gastos.filter((g) => g.fecha.startsWith(mesActivo));
  const totalMes = delMes.reduce((acc, g) => acc + g.importe, 0);

  const porCategoria = new Map<string, number>();
  for (const g of delMes) {
    const etiqueta = CATEGORIAS_GASTO[g.categoria];
    porCategoria.set(etiqueta, (porCategoria.get(etiqueta) ?? 0) + g.importe);
  }
  const mayor = [...porCategoria.entries()].sort(([, a], [, b]) => b - a)[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Gastos
          </h2>
          <p className="text-sm text-muted-foreground">
            Cada gasto registrado impacta directo en el dashboard financiero.
          </p>
        </div>
        <NuevoGasto />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          etiqueta="Total del mes"
          valor={formatearPesosCompacto(totalMes)}
          icono={Receipt}
        />
        <KpiCard
          etiqueta="Mayor categoría"
          valor={mayor ? mayor[0] : "—"}
          icono={ChartPie}
        />
        <KpiCard
          etiqueta="Registros del mes"
          valor={String(delMes.length)}
          icono={CalendarDays}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle className="text-base">Por categoría</CardTitle>
            <CardDescription>Mes en curso.</CardDescription>
          </CardHeader>
          <CardContent>
            <ListaBarras
              descripcion="Gastos por categoría"
              colorClase="bg-chart-5"
              formato={formatearPesosCompacto}
              datos={[...porCategoria.entries()]
                .sort(([, a], [, b]) => b - a)
                .map(([etiqueta, valor]) => ({ etiqueta, valor }))}
            />
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Método de pago</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gastos.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatearFecha(g.fecha)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {CATEGORIAS_GASTO[g.categoria]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-72 truncate font-medium">
                        {g.descripcion}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {g.metodoPago}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {g.responsable}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatearPesos(g.importe)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
