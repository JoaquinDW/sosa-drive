import {
  AlertTriangle,
  Banknote,
  HandCoins,
  Receipt,
  TrendingUp,
  Wallet,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KpiCard } from "@/components/app/kpi-card";
import { ListaBarras } from "@/components/app/charts";
import {
  obtenerGastos,
  obtenerKpisFinancieros,
  obtenerUnidadesInventario,
  obtenerVentas,
} from "@/lib/data-operaciones";
import {
  formatearNumero,
  formatearPesos,
  formatearPesosCompacto,
} from "@/lib/format";
import { CATEGORIAS_GASTO, METODOS_VENTA } from "@/lib/labels";
import type { MetodoVenta } from "@/lib/types";

export const metadata = { title: "Finanzas" };

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function nombreMes(anioMes: string): string {
  const [anio, mes] = anioMes.split("-").map(Number);
  return `${MESES[mes - 1]} ${anio}`;
}

export default async function FinanzasPage() {
  const [kpis, ventas, gastos, unidades] = await Promise.all([
    obtenerKpisFinancieros(),
    obtenerVentas(),
    obtenerGastos(),
    obtenerUnidadesInventario(),
  ]);

  // Series para los gráficos
  const porMes = new Map<string, { cantidad: number; facturacion: number }>();
  for (const v of ventas) {
    const mes = v.fecha.slice(0, 7);
    const acc = porMes.get(mes) ?? { cantidad: 0, facturacion: 0 };
    acc.cantidad += 1;
    acc.facturacion += v.precio ?? 0;
    porMes.set(mes, acc);
  }
  const meses = [...porMes.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  const mesActivo = meses.at(-1)?.[0] ?? "";
  const ventasMes = ventas.filter((v) => v.fecha.startsWith(mesActivo));

  const porVendedor = new Map<string, number>();
  const porMetodo = new Map<MetodoVenta, number>();
  for (const v of ventasMes) {
    porVendedor.set(v.vendedor, (porVendedor.get(v.vendedor) ?? 0) + 1);
    porMetodo.set(v.metodo, (porMetodo.get(v.metodo) ?? 0) + 1);
  }

  const enStock = unidades.filter(
    (u) => u.estado !== "vendida" && u.estado !== "baja",
  );
  const porMarca = new Map<string, number>();
  for (const u of enStock) {
    porMarca.set(u.marca, (porMarca.get(u.marca) ?? 0) + 1);
  }

  const gastosMes = gastos.filter((g) => g.fecha.startsWith(mesActivo));
  const gastosPorCategoria = new Map<string, number>();
  for (const g of gastosMes) {
    gastosPorCategoria.set(
      CATEGORIAS_GASTO[g.categoria],
      (gastosPorCategoria.get(CATEGORIAS_GASTO[g.categoria]) ?? 0) + g.importe,
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Dashboard financiero
        </h2>
        <p className="text-sm text-muted-foreground">
          La rentabilidad real del negocio, calculada desde las operaciones
          registradas — {nombreMes(mesActivo)}.
        </p>
      </div>

      {kpis.unidadesSinPrecio > 0 && (
        <Card className="border-destructive/40 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="flex items-center gap-3 py-1">
            <AlertTriangle
              className="size-4 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <p className="text-sm">
              <span className="font-medium">
                {kpis.unidadesSinPrecio} unidades del stock no tienen precio
                cargado
              </span>{" "}
              y no suman al valor del inventario.{" "}
              <Link href="/stock" className="underline underline-offset-2">
                Completalas en el stock
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          etiqueta="Valor del inventario"
          valor={formatearPesosCompacto(kpis.valorInventario)}
          icono={Warehouse}
        />
        <KpiCard
          etiqueta={`Ventas de ${nombreMes(mesActivo).split(" ")[0]}`}
          valor={`${kpis.ventasMes} · ${formatearPesosCompacto(kpis.facturacionMes)}`}
          icono={TrendingUp}
        />
        <KpiCard
          etiqueta="Ganancia bruta"
          valor={formatearPesosCompacto(kpis.gananciaBrutaMes)}
          icono={Banknote}
        />
        <KpiCard
          etiqueta="Gastos del mes"
          valor={formatearPesosCompacto(kpis.gastosMes)}
          icono={Receipt}
        />
        <KpiCard
          etiqueta="Ganancia neta"
          valor={formatearPesosCompacto(kpis.gananciaNetaMes)}
          icono={TrendingUp}
          destacado={kpis.gananciaNetaMes < 0}
        />
        <KpiCard
          etiqueta="Saldo de caja"
          valor={formatearPesosCompacto(kpis.saldoCaja)}
          icono={Wallet}
        />
        <KpiCard
          etiqueta="Financiado (créditos propios)"
          valor={formatearPesosCompacto(kpis.montoFinanciado)}
          icono={HandCoins}
        />
        <KpiCard
          etiqueta="Clientes en mora"
          valor={String(kpis.deudores)}
          icono={AlertTriangle}
          destacado={kpis.deudores > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ventas por mes</CardTitle>
            <CardDescription>
              Cantidad de unidades vendidas por mes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ListaBarras
              descripcion="Ventas por mes"
              datos={meses.map(([mes, d]) => ({
                etiqueta: nombreMes(mes),
                valor: d.cantidad,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Facturación por mes</CardTitle>
            <CardDescription>
              Suma de precios de venta registrados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ListaBarras
              descripcion="Facturación por mes"
              colorClase="bg-chart-1"
              formato={formatearPesosCompacto}
              datos={meses.map(([mes, d]) => ({
                etiqueta: nombreMes(mes),
                valor: d.facturacion,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Ventas por vendedor ({nombreMes(mesActivo).split(" ")[0]})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ListaBarras
              descripcion="Ventas por vendedor"
              datos={[...porVendedor.entries()]
                .sort(([, a], [, b]) => b - a)
                .map(([vendedor, cantidad]) => ({
                  etiqueta: vendedor,
                  valor: cantidad,
                }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Ventas por financiación ({nombreMes(mesActivo).split(" ")[0]})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ListaBarras
              descripcion="Ventas por método de pago"
              colorClase="bg-chart-4"
              datos={[...porMetodo.entries()]
                .sort(([, a], [, b]) => b - a)
                .map(([metodo, cantidad]) => ({
                  etiqueta: METODOS_VENTA[metodo],
                  valor: cantidad,
                }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock por marca</CardTitle>
            <CardDescription>
              {formatearNumero(enStock.length)} unidades en stock (incluye
              taller).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ListaBarras
              descripcion="Stock por marca"
              colorClase="bg-chart-2"
              datos={[...porMarca.entries()]
                .sort(([, a], [, b]) => b - a)
                .map(([marca, cantidad]) => ({
                  etiqueta: marca,
                  valor: cantidad,
                }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Gastos por categoría ({nombreMes(mesActivo).split(" ")[0]})
            </CardTitle>
            <CardDescription>
              Total del mes: {formatearPesos(kpis.gastosMes)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ListaBarras
              descripcion="Gastos por categoría"
              colorClase="bg-chart-5"
              formato={formatearPesosCompacto}
              datos={[...gastosPorCategoria.entries()]
                .sort(([, a], [, b]) => b - a)
                .map(([categoria, importe]) => ({
                  etiqueta: categoria,
                  valor: importe,
                }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cobranza de créditos propios</CardTitle>
          <CardDescription>
            Sobre {formatearPesos(kpis.montoFinanciado)} financiados en planes
            activos.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Cobrado</p>
            <p className="font-heading text-xl font-semibold text-success tabular-nums">
              {formatearPesos(kpis.cobrado)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pendiente</p>
            <p className="font-heading text-xl font-semibold tabular-nums">
              {formatearPesos(kpis.pendienteCobro)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Clientes en mora</p>
            <p className="font-heading text-xl font-semibold text-destructive tabular-nums">
              {kpis.deudores}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
