import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ESTADOS_LEAD, FUENTES_LEAD, nivelScore } from "@/lib/labels";
import type { EstadoLead, FuenteLead } from "@/lib/types";
import {
  Flame,
  Globe,
  MessageCircle,
  Phone,
  Search,
  ShoppingBag,
  UserPlus,
} from "lucide-react";
import { IconoFacebook, IconoInstagram } from "./brand-icons";

export function BadgeEstado({ estado }: { estado: EstadoLead }) {
  const { etiqueta, className } = ESTADOS_LEAD[estado];
  return (
    <Badge variant="outline" className={cn("font-medium", className)}>
      {etiqueta}
    </Badge>
  );
}

export function BadgeScore({ score }: { score: number }) {
  const { etiqueta, className } = nivelScore(score);
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium tabular-nums", className)}>
      {score >= 80 && <Flame className="size-3" aria-hidden="true" />}
      {score} · {etiqueta}
    </Badge>
  );
}

const ICONOS_FUENTE: Record<
  FuenteLead,
  React.ComponentType<{ className?: string }>
> = {
  whatsapp: MessageCircle,
  instagram: IconoInstagram,
  facebook: IconoFacebook,
  web: Globe,
  google: Search,
  mercadolibre: ShoppingBag,
  referido: UserPlus,
  llamada: Phone,
};

export function IconoFuente({
  fuente,
  className,
}: {
  fuente: FuenteLead;
  className?: string;
}) {
  const Icono = ICONOS_FUENTE[fuente];
  return (
    <span title={FUENTES_LEAD[fuente]} className="inline-flex items-center">
      <Icono className={cn("size-4", className)} aria-hidden="true" />
      <span className="sr-only">{FUENTES_LEAD[fuente]}</span>
    </span>
  );
}

export function BadgeFuente({ fuente }: { fuente: FuenteLead }) {
  return (
    <Badge variant="secondary" className="gap-1.5 font-normal">
      <IconoFuente fuente={fuente} className="size-3" />
      {FUENTES_LEAD[fuente]}
    </Badge>
  );
}
