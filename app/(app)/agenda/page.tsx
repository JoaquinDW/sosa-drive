import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { obtenerAgenda, obtenerLeads, obtenerVendedores } from "@/lib/data";
import {
  formatearFechaCompleta,
  formatearHora,
  iniciales,
} from "@/lib/format";
import { TIPOS_AGENDA } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const metadata = { title: "Agenda" };

const ESTADOS_EVENTO: Record<string, string> = {
  pendiente: "text-muted-foreground",
  confirmado: "text-success",
  completado: "text-muted-foreground line-through",
  cancelado: "text-muted-foreground line-through",
};

export default async function AgendaPage() {
  const [agenda, leads, vendedores] = await Promise.all([
    obtenerAgenda(),
    obtenerLeads(),
    obtenerVendedores(),
  ]);

  const ordenada = [...agenda].sort((a, b) => a.inicio.localeCompare(b.inicio));

  const porDia = new Map<string, typeof ordenada>();
  for (const evento of ordenada) {
    const clave = new Date(evento.inicio).toDateString();
    porDia.set(clave, [...(porDia.get(clave) ?? []), evento]);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Agenda
        </h2>
        <p className="text-sm text-muted-foreground">
          Visitas, test drives, entregas y services, todo en un solo calendario.
        </p>
      </div>

      {porDia.size === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <CalendarDays className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">No hay eventos agendados</p>
            <p className="text-sm text-muted-foreground">
              Cuando un cliente confirme una visita o un test drive, va a
              aparecer acá.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {[...porDia.entries()].map(([dia, eventos]) => (
            <section key={dia} aria-label={formatearFechaCompleta(eventos[0].inicio)}>
              <h3 className="mb-3 font-heading text-sm font-semibold text-muted-foreground capitalize">
                {formatearFechaCompleta(eventos[0].inicio)}
              </h3>
              <div className="flex flex-col gap-2.5">
                {eventos.map((evento) => {
                  const lead = leads.find((l) => l.id === evento.leadId);
                  const vendedor = vendedores.find(
                    (v) => v.id === evento.vendedorId,
                  );
                  const tipo = TIPOS_AGENDA[evento.tipo];
                  return (
                    <Card key={evento.id} className="py-0">
                      <CardContent className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                        <div className="w-24 shrink-0">
                          <p className="text-sm font-medium tabular-nums">
                            {formatearHora(evento.inicio)} hs
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            hasta {formatearHora(evento.fin)}
                          </p>
                        </div>
                        <Badge variant="outline" className={tipo.className}>
                          {tipo.etiqueta}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "truncate text-sm font-medium",
                              ESTADOS_EVENTO[evento.estado],
                            )}
                          >
                            {evento.titulo}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {evento.estado === "confirmado" && "Confirmado"}
                            {evento.estado === "pendiente" && "A confirmar"}
                            {evento.estado === "completado" && "Completado"}
                            {evento.estado === "cancelado" && "Cancelado"}
                            {evento.notas && ` · ${evento.notas}`}
                            {lead && (
                              <>
                                {" · "}
                                <Link
                                  href={`/leads/${lead.id}`}
                                  className="underline-offset-2 hover:underline"
                                >
                                  Ver lead
                                </Link>
                              </>
                            )}
                          </p>
                        </div>
                        {vendedor && (
                          <Avatar className="size-7" title={vendedor.nombre}>
                            <AvatarFallback className="bg-secondary text-[10px] font-semibold">
                              {iniciales(vendedor.nombre)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
