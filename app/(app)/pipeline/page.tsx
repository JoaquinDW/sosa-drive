import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { BadgeScore, IconoFuente } from "@/components/app/badges";
import { obtenerLeads, obtenerMotos, obtenerVendedores } from "@/lib/data";
import { formatearNumero, iniciales, tiempoRelativo } from "@/lib/format";
import { ESTADOS_LEAD, ORDEN_PIPELINE } from "@/lib/labels";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export const metadata = { title: "Pipeline" };

const COLOR_COLUMNA: Record<string, string> = {
  nuevo: "bg-blue-500",
  contactado: "bg-sky-500",
  calificado: "bg-violet-500",
  visita: "bg-amber-500",
  negociacion: "bg-orange-500",
  vendido: "bg-emerald-500",
};

export default async function PipelinePage() {
  const [leads, motos, vendedores] = await Promise.all([
    obtenerLeads(),
    obtenerMotos(),
    obtenerVendedores(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Pipeline de ventas
        </h2>
        <p className="text-sm text-muted-foreground">
          Mirá en qué etapa está cada cliente y que ninguno se quede sin
          seguimiento.
        </p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4">
          {ORDEN_PIPELINE.map((estado) => {
            const columna = leads
              .filter((l) => l.estado === estado)
              .sort((a, b) => b.score - a.score);
            return (
              <section
                key={estado}
                aria-label={ESTADOS_LEAD[estado].etiqueta}
                className="flex w-72 shrink-0 flex-col gap-3"
              >
                <header className="flex items-center gap-2 px-1">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      COLOR_COLUMNA[estado],
                    )}
                    aria-hidden="true"
                  />
                  <h3 className="font-heading text-sm font-semibold">
                    {ESTADOS_LEAD[estado].etiqueta}
                  </h3>
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
                    {formatearNumero(columna.length)}
                  </span>
                </header>

                <div className="flex flex-col gap-2.5">
                  {columna.length === 0 ? (
                    <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                      Sin leads en esta etapa
                    </p>
                  ) : (
                    columna.map((lead) => {
                      const moto = motos.find(
                        (m) => m.id === lead.motoInteresId,
                      );
                      const vend = vendedores.find(
                        (v) => v.id === lead.vendedorId,
                      );
                      return (
                        <Link key={lead.id} href={`/leads/${lead.id}`}>
                          <Card className="py-0 transition-colors duration-150 hover:border-ring">
                            <CardContent className="flex flex-col gap-2 p-3.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-medium">
                                  {lead.nombre}
                                </p>
                                <IconoFuente
                                  fuente={lead.fuente}
                                  className="size-3.5 shrink-0 text-muted-foreground"
                                />
                              </div>
                              {moto && (
                                <p className="truncate text-xs text-muted-foreground">
                                  {moto.marca} {moto.modelo}
                                </p>
                              )}
                              <div className="flex items-center justify-between gap-2">
                                <BadgeScore score={lead.score} />
                                {vend && (
                                  <Avatar className="size-6">
                                    <AvatarFallback className="bg-secondary text-[10px] font-semibold">
                                      {iniciales(vend.nombre)}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                {lead.ultimoContactoEn
                                  ? `Último contacto ${tiempoRelativo(lead.ultimoContactoEn)}`
                                  : `Ingresó ${tiempoRelativo(lead.creadoEn)} · sin contacto`}
                              </p>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
