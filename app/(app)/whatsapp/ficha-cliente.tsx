"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  Bike,
  Bot,
  ExternalLink,
  MapPin,
  Phone,
  Repeat,
  UserCheck,
  UserPlus,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { BadgeEstado, BadgeScore } from "@/components/app/badges";
import { formatearPesos, iniciales, tiempoRelativo } from "@/lib/format";
import { FORMAS_PAGO } from "@/lib/labels";
import type { FichaLeadWa } from "@/lib/types";

/**
 * Ficha del cliente al costado del hilo de WhatsApp: lo que el bot cualificador
 * viene juntando de la charla, sin salir del chat. El perfil completo (timeline,
 * notas, historial) vive en /leads/[id].
 */

interface FichaClienteProps {
  lead: FichaLeadWa | null;
  /** Nombre del contacto en WhatsApp, para el encabezado si todavía no hay lead. */
  nombreWa: string;
  telefono: string;
  /** Cierra la ficha en pantallas donde comparte lugar con el hilo. */
  onCerrar: () => void;
}

export function FichaCliente({
  lead,
  nombreWa,
  telefono,
  onCerrar,
}: FichaClienteProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="xl:hidden"
          onClick={onCerrar}
          aria-label="Volver a la conversación"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h2 className="font-heading text-base font-semibold">Cliente</h2>
      </div>

      {lead ? (
        <FichaCargada lead={lead} />
      ) : (
        <SinLead nombreWa={nombreWa} telefono={telefono} />
      )}
    </div>
  );
}

function FichaCargada({ lead }: { lead: FichaLeadWa }) {
  const sinNombre = lead.nombre === "Sin nombre";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <Avatar className="size-14">
          <AvatarFallback className="bg-primary text-base font-semibold text-primary-foreground">
            {iniciales(sinNombre ? lead.telefono : lead.nombre)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-heading font-semibold">
            {sinNombre ? "Sin nombre todavía" : lead.nombre}
          </p>
          <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Phone className="size-3" aria-hidden="true" />+{lead.telefono}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          <BadgeEstado estado={lead.estado} />
          <BadgeScore score={lead.score} />
        </div>
      </div>

      <Button asChild size="sm" className="gap-2">
        <Link href={`/leads/${lead.id}`}>
          <ExternalLink className="size-4" aria-hidden="true" />
          Ver perfil completo
        </Link>
      </Button>

      <Separator />

      <div className="flex flex-col gap-3">
        <Dato
          icono={Bike}
          etiqueta="Moto de interés"
          valor={lead.motoInteres}
          pendiente="El bot todavía no la detectó"
        />
        <Dato
          icono={Wallet}
          etiqueta="Forma de pago"
          valor={FORMAS_PAGO[lead.formaPago]}
        />
        {lead.presupuesto !== undefined && (
          <Dato
            icono={Banknote}
            etiqueta="Presupuesto"
            valor={formatearPesos(lead.presupuesto)}
          />
        )}
        {lead.permuta && (
          <Dato icono={Repeat} etiqueta="Entrega en permuta" valor={lead.permuta} />
        )}
        <Dato
          icono={MapPin}
          etiqueta="Ciudad / zona"
          valor={lead.ciudad || undefined}
          pendiente="Sin definir"
        />
        <Dato
          icono={UserCheck}
          etiqueta="Vendedor"
          valor={lead.vendedor}
          pendiente="Sin asignar"
        />
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
          <Bot className="size-3.5" aria-hidden="true" />
          Score de la IA
        </p>
        <Progress value={lead.score} aria-label={`Score ${lead.score} de 100`} />
        {lead.scoreMotivo && (
          <p className="text-xs text-muted-foreground">{lead.scoreMotivo}</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Ingresó {tiempoRelativo(lead.creadoEn)}
        {lead.ultimoContactoEn
          ? ` · último contacto ${tiempoRelativo(lead.ultimoContactoEn)}`
          : ""}
      </p>
    </div>
  );
}

/**
 * Chat sin lead: pasa con las conversaciones que quedaron de antes del bot
 * cualificador y que nadie volvió a tocar. Se resuelve solo con el próximo
 * mensaje, así que no hay nada que hacer más que explicarlo.
 */
function SinLead({ nombreWa, telefono }: { nombreWa: string; telefono: string }) {
  return (
    <div className="flex flex-col items-center gap-3 p-6 text-center">
      <Avatar className="size-14">
        <AvatarFallback className="bg-secondary text-base font-semibold">
          {iniciales(nombreWa)}
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="font-heading font-semibold">{nombreWa}</p>
        <p className="text-xs text-muted-foreground">+{telefono}</p>
      </div>
      <UserPlus className="size-6 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">
        Todavía no hay ficha para este chat. Se crea sola con el próximo mensaje
        que mande el cliente.
      </p>
    </div>
  );
}

function Dato({
  icono: Icono,
  etiqueta,
  valor,
  pendiente,
}: {
  icono: LucideIcon;
  etiqueta: string;
  valor?: string;
  pendiente?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icono className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
          {etiqueta}
        </p>
        <p className={valor ? "text-sm" : "text-sm text-muted-foreground italic"}>
          {valor ?? pendiente ?? "Sin definir"}
        </p>
      </div>
    </div>
  );
}
