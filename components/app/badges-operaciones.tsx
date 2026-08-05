import { Badge } from "@/components/ui/badge";
import {
  ESTADOS_CREDITO,
  ESTADOS_CUOTA,
  ESTADOS_ORDEN_TALLER,
  ESTADOS_UNIDAD,
} from "@/lib/labels";
import { formatearPesos } from "@/lib/format";
import type {
  EstadoCredito,
  EstadoCuota,
  EstadoOrdenTaller,
  EstadoUnidad,
} from "@/lib/types";

export function BadgeEstadoUnidad({ estado }: { estado: EstadoUnidad }) {
  const e = ESTADOS_UNIDAD[estado];
  return (
    <Badge variant="outline" className={e.className}>
      {e.etiqueta}
    </Badge>
  );
}

export function BadgeEstadoOrden({ estado }: { estado: EstadoOrdenTaller }) {
  const e = ESTADOS_ORDEN_TALLER[estado];
  return (
    <Badge variant="outline" className={e.className}>
      {e.etiqueta}
    </Badge>
  );
}

export function BadgeEstadoCredito({ estado }: { estado: EstadoCredito }) {
  const e = ESTADOS_CREDITO[estado];
  return (
    <Badge variant="outline" className={e.className}>
      {e.etiqueta}
    </Badge>
  );
}

export function BadgeEstadoCuota({ estado }: { estado: EstadoCuota }) {
  const e = ESTADOS_CUOTA[estado];
  return (
    <Badge variant="outline" className={e.className}>
      {e.etiqueta}
    </Badge>
  );
}

/** Muestra el precio, o el faltante como pendiente — el dolor del Excel. */
export function Precio({ valor }: { valor?: number }) {
  if (valor === undefined) {
    return (
      <Badge
        variant="outline"
        className="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
      >
        Sin precio
      </Badge>
    );
  }
  return <span className="tabular-nums">{formatearPesos(valor)}</span>;
}
