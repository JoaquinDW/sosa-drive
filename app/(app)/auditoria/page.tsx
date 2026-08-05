import { Lock } from "lucide-react";
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
import { obtenerAuditoria } from "@/lib/data-operaciones";
import { formatearFecha, formatearHora } from "@/lib/format";

export const metadata = { title: "Auditoría" };

export default async function AuditoriaPage() {
  const registros = await obtenerAuditoria();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Auditoría
        </h2>
        <p className="text-sm text-muted-foreground">
          Quién hizo qué y cuándo. Este registro no se puede editar ni borrar
          — ni siquiera el gerente.
        </p>
      </div>

      <Card className="py-0">
        <CardHeader className="pt-5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="size-4 text-muted-foreground" aria-hidden="true" />
            Registro de actividad
          </CardTitle>
          <CardDescription>
            Últimos {Math.min(registros.length, 100)} eventos, generados
            automáticamente por cada operación del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registros.slice(0, 100).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatearFecha(r.fecha)} · {formatearHora(r.fecha)}
                    </TableCell>
                    <TableCell className="font-medium">{r.usuario}</TableCell>
                    <TableCell>{r.accion}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {r.entidad}
                    </TableCell>
                    <TableCell className="max-w-96 truncate text-muted-foreground">
                      {r.detalle}
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
