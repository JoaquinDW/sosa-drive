import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bike,
  Bot,
  CalendarCheck,
  ClipboardList,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCcw,
  Sparkles,
  UserCheck,
  Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { BadgeEstado, BadgeFuente, BadgeScore } from "@/components/app/badges";
import {
  obtenerEventosLead,
  obtenerLead,
  obtenerMotos,
  obtenerVendedores,
} from "@/lib/data";
import {
  formatearFecha,
  formatearHora,
  formatearPesos,
  iniciales,
  tiempoRelativo,
} from "@/lib/format";
import { FORMAS_PAGO } from "@/lib/labels";
import type { TipoEventoLead } from "@/lib/types";
import type { LucideIcon } from "lucide-react";

const ICONOS_EVENTO: Record<TipoEventoLead, LucideIcon> = {
  ingreso: Sparkles,
  asignacion: UserCheck,
  mensaje: MessageSquare,
  llamada: Phone,
  ia: Bot,
  visita: CalendarCheck,
  nota: ClipboardList,
  estado: RefreshCcw,
  cotizacion: FileText,
};

export const metadata = { title: "Detalle del lead" };

export default async function LeadDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [lead, eventos, motos, vendedores] = await Promise.all([
    obtenerLead(id),
    obtenerEventosLead(id),
    obtenerMotos(),
    obtenerVendedores(),
  ]);

  if (!lead) notFound();

  const moto = motos.find((m) => m.id === lead.motoInteresId);
  const motoAlternativa = motos.find((m) => m.id === lead.motoAlternativaId);
  const vendedor = vendedores.find((v) => v.id === lead.vendedorId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-1.5">
          <Link href="/leads">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver a leads
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
              {iniciales(lead.nombre)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-heading text-2xl font-semibold tracking-tight">
              {lead.nombre}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <BadgeEstado estado={lead.estado} />
              <BadgeScore score={lead.score} />
              <BadgeFuente fuente={lead.fuente} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Phone className="size-4" aria-hidden="true" />
            Llamar
          </Button>
          <Button className="gap-2">
            <MessageSquare className="size-4" aria-hidden="true" />
            Abrir conversación
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Columna de datos */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Contacto</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p className="flex items-center gap-2.5">
                <Phone className="size-4 text-muted-foreground" aria-hidden="true" />
                {lead.telefono}
              </p>
              {lead.email && (
                <p className="flex items-center gap-2.5">
                  <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
                  {lead.email}
                </p>
              )}
              <p className="flex items-center gap-2.5">
                <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
                {lead.ciudad}
              </p>
              {lead.dni && (
                <p className="flex items-center gap-2.5">
                  <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
                  DNI {lead.dni}
                </p>
              )}
              <Separator />
              <p className="text-xs text-muted-foreground">
                Ingresó {tiempoRelativo(lead.creadoEn)} · Último contacto:{" "}
                {lead.ultimoContactoEn
                  ? tiempoRelativo(lead.ultimoContactoEn)
                  : "sin contacto"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">
                Interés y presupuesto
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-start gap-2.5">
                <Bike className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">
                    {moto ? `${moto.marca} ${moto.modelo}` : "Sin definir"}
                  </p>
                  {motoAlternativa && (
                    <p className="text-xs text-muted-foreground">
                      Alternativa: {motoAlternativa.marca}{" "}
                      {motoAlternativa.modelo}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Wallet className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">
                    {lead.presupuesto
                      ? formatearPesos(lead.presupuesto)
                      : "Presupuesto sin definir"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {FORMAS_PAGO[lead.formaPago]}
                    {lead.permuta ? ` · Permuta: ${lead.permuta}` : ""}
                  </p>
                </div>
              </div>
              {vendedor && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-7">
                      <AvatarFallback className="bg-secondary text-[10px] font-semibold">
                        {iniciales(vendedor.nombre)}
                      </AvatarFallback>
                    </Avatar>
                    <p>
                      Atiende{" "}
                      <span className="font-medium">{vendedor.nombre}</span>
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <Bot className="size-4 text-destructive" aria-hidden="true" />
                Score de la IA
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-baseline gap-1">
                <p className="font-heading text-3xl font-semibold">
                  {lead.score}
                </p>
                <p className="text-sm text-muted-foreground">/ 100</p>
              </div>
              <Progress
                value={lead.score}
                aria-label={`Score ${lead.score} de 100`}
              />
              {lead.scoreMotivo && (
                <p className="text-sm text-muted-foreground">
                  {lead.scoreMotivo}
                </p>
              )}
            </CardContent>
          </Card>

          {lead.notas && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-base">Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{lead.notas}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading text-base">Timeline</CardTitle>
            <CardDescription>
              Toda la historia del cliente queda registrada, nada se pierde.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {eventos.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Todavía no hay eventos registrados para este lead.
              </p>
            ) : (
              <ol className="relative flex flex-col gap-6 border-l pl-6">
                {eventos.map((evento) => {
                  const Icono = ICONOS_EVENTO[evento.tipo];
                  return (
                    <li key={evento.id} className="relative">
                      <span
                        className="absolute top-0.5 -left-[31px] flex size-5 items-center justify-center rounded-full border bg-card"
                        aria-hidden="true"
                      >
                        <Icono className="size-3 text-muted-foreground" />
                      </span>
                      <p className="text-sm">{evento.descripcion}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {evento.actor === "IA" ? (
                          <Badge
                            variant="outline"
                            className="mr-1.5 gap-1 border-red-200 bg-red-50 px-1.5 py-0 text-[10px] text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                          >
                            <Bot className="size-2.5" aria-hidden="true" />
                            IA
                          </Badge>
                        ) : (
                          `${evento.actor} · `
                        )}
                        {formatearFecha(evento.creadoEn)} ·{" "}
                        {formatearHora(evento.creadoEn)} hs
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
