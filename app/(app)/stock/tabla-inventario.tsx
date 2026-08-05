"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  BadgeEstadoUnidad,
  Precio,
} from "@/components/app/badges-operaciones";
import { UBICACIONES_UNIDAD } from "@/lib/labels";
import type { EstadoUnidad, UnidadInventario } from "@/lib/types";

const POR_PAGINA = 20;

const FILTROS_ESTADO: { valor: EstadoUnidad | "todas"; etiqueta: string }[] = [
  { valor: "todas", etiqueta: "Todos los estados" },
  { valor: "disponible", etiqueta: "Disponibles" },
  { valor: "reservada", etiqueta: "Reservadas" },
  { valor: "en_taller", etiqueta: "En taller" },
  { valor: "vendida", etiqueta: "Vendidas" },
];

export function TablaInventario({
  unidades,
}: {
  unidades: UnidadInventario[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<EstadoUnidad | "todas">("todas");
  const [pagina, setPagina] = useState(1);

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return unidades.filter((u) => {
      if (estado !== "todas" && u.estado !== estado) return false;
      if (!texto) return true;
      return [u.marca, u.modelo, u.dominio ?? "", u.color, String(u.anio ?? "")]
        .join(" ")
        .toLowerCase()
        .includes(texto);
    });
  }, [unidades, busqueda, estado]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * POR_PAGINA;
  const paginadas = filtradas.slice(desde, desde + POR_PAGINA);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscá por marca, modelo, dominio o color…"
            className="pl-9"
            aria-label="Buscar en el inventario"
          />
        </div>
        <Select
          value={estado}
          onValueChange={(v) => {
            setEstado(v as EstadoUnidad | "todas");
            setPagina(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-48" aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTROS_ESTADO.map((f) => (
              <SelectItem key={f.valor} value={f.valor}>
                {f.etiqueta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Moto</TableHead>
              <TableHead>Dominio</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Condición</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Precio de venta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginadas.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/stock/${u.id}`}
                    className="hover:underline"
                  >
                    {u.marca} {u.modelo}
                    {u.anio ? ` · ${u.anio}` : ""}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {u.dominio ?? (
                    <span className="text-destructive">verificar</span>
                  )}
                </TableCell>
                <TableCell>{u.color}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-normal">
                    {u.condicion === "0km" ? "0 km" : "Usada"}
                  </Badge>
                </TableCell>
                <TableCell>{UBICACIONES_UNIDAD[u.ubicacion]}</TableCell>
                <TableCell>
                  <BadgeEstadoUnidad estado={u.estado} />
                </TableCell>
                <TableCell className="text-right">
                  <Precio valor={u.precioVenta} />
                </TableCell>
              </TableRow>
            ))}
            {filtradas.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No hay unidades que coincidan con la búsqueda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filtradas.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Mostrando {desde + 1}–{desde + paginadas.length} de{" "}
            {filtradas.length}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Página {paginaActual} de {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={paginaActual <= 1}
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual >= totalPaginas}
              aria-label="Página siguiente"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
