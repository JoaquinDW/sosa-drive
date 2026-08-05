import Link from "next/link";
import { AlertCircle, CheckCircle2, Circle, Clock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { obtenerLeads, obtenerTareas, obtenerVendedores } from "@/lib/data";
import { iniciales, tiempoRelativo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Lead, Tarea, Vendedor } from "@/lib/types";

export const metadata = { title: "Tareas" };

const PRIORIDADES: Record<string, string> = {
  alta: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
  media:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  baja: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
};

function FilaTarea({
  tarea,
  leads,
  vendedores,
}: {
  tarea: Tarea;
  leads: Lead[];
  vendedores: Vendedor[];
}) {
  const lead = leads.find((l) => l.id === tarea.leadId);
  const vendedor = vendedores.find((v) => v.id === tarea.vendedorId);
  const completada = Boolean(tarea.completadaEn);
  const vencida = !completada && new Date(tarea.venceEn) < new Date();

  return (
    <div className="flex items-start gap-3 rounded-md border px-3.5 py-3">
      {completada ? (
        <CheckCircle2
          className="mt-0.5 size-4.5 shrink-0 text-success"
          aria-hidden="true"
        />
      ) : (
        <Circle
          className="mt-0.5 size-4.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      )}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium",
            completada && "text-muted-foreground line-through",
          )}
        >
          {tarea.titulo}
        </p>
        {tarea.descripcion && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {tarea.descripcion}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("capitalize", PRIORIDADES[tarea.prioridad])}>
            {tarea.prioridad}
          </Badge>
          {lead && (
            <Link
              href={`/leads/${lead.id}`}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              {lead.nombre}
            </Link>
          )}
          <span
            className={cn(
              "flex items-center gap-1 text-xs",
              vencida ? "font-medium text-destructive" : "text-muted-foreground",
            )}
          >
            <Clock className="size-3" aria-hidden="true" />
            {completada
              ? `Completada ${tiempoRelativo(tarea.completadaEn!)}`
              : vencida
                ? `Venció ${tiempoRelativo(tarea.venceEn)}`
                : `Vence ${tiempoRelativo(tarea.venceEn)}`}
          </span>
        </div>
      </div>
      {vendedor && (
        <Avatar className="size-7 shrink-0" title={vendedor.nombre}>
          <AvatarFallback className="bg-secondary text-[10px] font-semibold">
            {iniciales(vendedor.nombre)}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

export default async function TareasPage() {
  const [tareas, leads, vendedores] = await Promise.all([
    obtenerTareas(),
    obtenerLeads(),
    obtenerVendedores(),
  ]);

  const ahora = new Date();
  const finDeHoy = new Date();
  finDeHoy.setHours(23, 59, 59, 999);

  const pendientes = tareas.filter((t) => !t.completadaEn);
  const vencidas = pendientes
    .filter((t) => new Date(t.venceEn) < ahora)
    .sort((a, b) => a.venceEn.localeCompare(b.venceEn));
  const deHoy = pendientes
    .filter(
      (t) => new Date(t.venceEn) >= ahora && new Date(t.venceEn) <= finDeHoy,
    )
    .sort((a, b) => a.venceEn.localeCompare(b.venceEn));
  const proximas = pendientes
    .filter((t) => new Date(t.venceEn) > finDeHoy)
    .sort((a, b) => a.venceEn.localeCompare(b.venceEn));
  const completadas = tareas
    .filter((t) => t.completadaEn)
    .sort((a, b) => b.completadaEn!.localeCompare(a.completadaEn!));

  const secciones = [
    {
      titulo: "Vencidas",
      descripcion: "Atendelas primero: cada hora que pasa enfría al cliente.",
      icono: AlertCircle,
      tareas: vencidas,
      destacada: true,
    },
    {
      titulo: "Para hoy",
      descripcion: "Lo que tenés que resolver antes de cerrar el día.",
      icono: Clock,
      tareas: deHoy,
      destacada: false,
    },
    {
      titulo: "Próximas",
      descripcion: "Ya agendadas para los próximos días.",
      icono: Circle,
      tareas: proximas,
      destacada: false,
    },
    {
      titulo: "Completadas",
      descripcion: "Lo que ya quedó resuelto.",
      icono: CheckCircle2,
      tareas: completadas,
      destacada: false,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Tareas
        </h2>
        <p className="text-sm text-muted-foreground">
          El sistema crea tareas automáticamente cuando un cliente pide algo:
          acá no se pierde nada.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {secciones.map((seccion) => (
          <Card
            key={seccion.titulo}
            className={cn(seccion.destacada && seccion.tareas.length > 0 && "border-destructive/40")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <seccion.icono
                  className={cn(
                    "size-4",
                    seccion.destacada && seccion.tareas.length > 0
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                  aria-hidden="true"
                />
                {seccion.titulo}
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
                  {seccion.tareas.length}
                </span>
              </CardTitle>
              <CardDescription>{seccion.descripcion}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {seccion.tareas.length === 0 ? (
                <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                  No hay tareas acá. ¡Bien!
                </p>
              ) : (
                seccion.tareas.map((t) => (
                  <FilaTarea
                    key={t.id}
                    tarea={t}
                    leads={leads}
                    vendedores={vendedores}
                  />
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
