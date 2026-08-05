import { cn } from "@/lib/utils";
import { formatearNumero, formatearPorcentaje } from "@/lib/format";

interface ItemBarra {
  etiqueta: string;
  valor: number;
}

/**
 * Lista de barras horizontales (flat design, una sola serie).
 * Marcas finas con extremo redondeado; valores directos en tokens de texto.
 */
export function ListaBarras({
  datos,
  colorClase = "bg-chart-2",
  descripcion,
  formato = formatearNumero,
}: {
  datos: ItemBarra[];
  colorClase?: string;
  descripcion: string;
  /** Cómo mostrar cada valor (por defecto, número entero). */
  formato?: (valor: number) => string;
}) {
  const max = Math.max(...datos.map((d) => d.valor), 1);
  const total = datos.reduce((acc, d) => acc + d.valor, 0);
  const anchoValor = formato === formatearNumero ? "2.5rem" : "5rem";

  return (
    <div role="img" aria-label={descripcion} className="flex flex-col gap-3">
      {datos.map((d) => (
        <div
          key={d.etiqueta}
          className="grid grid-cols-[7rem_1fr_auto] items-center gap-3"
          style={{ gridTemplateColumns: `7rem 1fr ${anchoValor}` }}
          title={`${d.etiqueta}: ${formato(d.valor)} (${formatearPorcentaje(d.valor / total)})`}
        >
          <span className="truncate text-sm text-muted-foreground">
            {d.etiqueta}
          </span>
          <div className="h-4 rounded-r-[4px] bg-muted">
            <div
              className={cn("h-full rounded-r-[4px]", colorClase)}
              style={{ width: `${(d.valor / max) * 100}%` }}
            />
          </div>
          <span className="text-right text-sm font-medium tabular-nums">
            {formato(d.valor)}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Embudo de conversión: barras centradas con caída porcentual por etapa.
 */
export function Embudo({
  datos,
  descripcion,
}: {
  datos: ItemBarra[];
  descripcion: string;
}) {
  const max = Math.max(...datos.map((d) => d.valor), 1);

  return (
    <div role="img" aria-label={descripcion} className="flex flex-col gap-2">
      {datos.map((d, i) => {
        const anterior = i > 0 ? datos[i - 1].valor : d.valor;
        const retencion = anterior > 0 ? d.valor / anterior : 0;
        return (
          <div
            key={d.etiqueta}
            className="grid grid-cols-[8.5rem_1fr_3.5rem] items-center gap-3"
            title={`${d.etiqueta}: ${formatearNumero(d.valor)}${i > 0 ? ` · ${formatearPorcentaje(retencion)} de la etapa anterior` : ""}`}
          >
            <span className="truncate text-sm text-muted-foreground">
              {d.etiqueta}
            </span>
            <div className="flex h-6 justify-center">
              <div
                className={cn(
                  "h-full rounded-[4px] bg-chart-1 transition-[width] duration-300",
                  i === datos.length - 1 && "bg-chart-4",
                )}
                style={{ width: `${Math.max((d.valor / max) * 100, 4)}%` }}
              />
            </div>
            <span className="text-right text-sm font-medium tabular-nums">
              {formatearNumero(d.valor)}
            </span>
          </div>
        );
      })}
      <p className="mt-1 text-xs text-muted-foreground">
        Conversión total:{" "}
        <span className="font-medium text-foreground">
          {formatearPorcentaje(
            datos.length > 0 && datos[0].valor > 0
              ? datos[datos.length - 1].valor / datos[0].valor
              : 0,
          )}
        </span>{" "}
        de lead a venta
      </p>
    </div>
  );
}

/**
 * Barra de progreso simple (medidor) para rankings.
 */
export function Medidor({
  valor,
  max,
  colorClase = "bg-chart-1",
}: {
  valor: number;
  max: number;
  colorClase?: string;
}) {
  return (
    <div className="h-2 w-full rounded-[4px] bg-muted">
      <div
        className={cn("h-full rounded-[4px]", colorClase)}
        style={{ width: `${Math.min((valor / Math.max(max, 1)) * 100, 100)}%` }}
      />
    </div>
  );
}
