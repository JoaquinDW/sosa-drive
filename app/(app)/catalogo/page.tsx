import { Bike, Gauge, ShieldCheck, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
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
import { obtenerMotos, obtenerUnidadesStock } from "@/lib/data";
import { formatearPesos } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Catálogo" };

const ESTADOS_UNIDAD: Record<string, { etiqueta: string; className: string }> = {
  disponible: {
    etiqueta: "Disponible",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  },
  reservada: {
    etiqueta: "Reservada",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  },
  vendida: {
    etiqueta: "Vendida",
    className:
      "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
  },
  en_transito: {
    etiqueta: "En tránsito",
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  },
};

export default async function CatalogoPage() {
  const [motos, unidades] = await Promise.all([
    obtenerMotos(),
    obtenerUnidadesStock(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Catálogo y stock
        </h2>
        <p className="text-sm text-muted-foreground">
          La misma información que usan los agentes de IA para responderle a
          tus clientes.
        </p>
      </div>

      <Tabs defaultValue="catalogo">
        <TabsList>
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
          <TabsTrigger value="stock">Stock por unidad</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {motos.map((moto) => (
              <Card key={moto.id} className="flex flex-col py-0">
                <div className="flex h-36 items-center justify-center rounded-t-lg bg-muted">
                  <Bike
                    className="size-14 text-muted-foreground/50"
                    aria-hidden="true"
                  />
                </div>
                <CardHeader className="pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {moto.marca} · {moto.anio}
                      </p>
                      <h3 className="font-heading text-lg font-semibold">
                        {moto.modelo}
                      </h3>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        moto.stock > 0
                          ? ESTADOS_UNIDAD.disponible.className
                          : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
                      )}
                    >
                      {moto.stock > 0 ? `${moto.stock} en stock` : "Sin stock"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {moto.descripcion}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Zap className="size-3.5" aria-hidden="true" />
                      {moto.cilindrada} cc
                    </span>
                    <span className="flex items-center gap-1">
                      <Gauge className="size-3.5" aria-hidden="true" />
                      {moto.velocidadMaxima} km/h
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
                      {moto.garantia.split(" o ")[0]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {moto.colores.map((color) => (
                      <Badge key={color} variant="secondary" className="font-normal">
                        {color}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex items-end justify-between border-t !py-3.5">
                  <div>
                    <p className="text-xs text-muted-foreground">Contado</p>
                    <p className="font-heading text-lg font-semibold tabular-nums">
                      {formatearPesos(moto.precio)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Financiada</p>
                    <p className="text-sm font-medium tabular-nums">
                      {formatearPesos(moto.precioFinanciado)}
                    </p>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="stock" className="mt-4">
          <Card className="py-0">
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Moto</TableHead>
                      <TableHead>N.º de motor</TableHead>
                      <TableHead>N.º de cuadro</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unidades.map((u) => {
                      const moto = motos.find((m) => m.id === u.motoId);
                      const estado = ESTADOS_UNIDAD[u.estado];
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            {moto ? `${moto.marca} ${moto.modelo}` : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {u.numeroMotor}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {u.numeroCuadro}
                          </TableCell>
                          <TableCell>{u.sucursal}</TableCell>
                          <TableCell>{u.color}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={estado.className}>
                              {estado.etiqueta}
                            </Badge>
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
