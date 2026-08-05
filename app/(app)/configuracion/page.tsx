"use client";

import { useState } from "react";
import { Database, GitBranch, Shuffle, Star, Timer, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MODOS_DISTRIBUCION } from "@/lib/labels";
import type { ModoDistribucion } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONOS_MODO: Record<ModoDistribucion, React.ElementType> = {
  round_robin: Shuffle,
  prioridad: Star,
  especialista: Wrench,
  compulsa: Timer,
};

export default function ConfiguracionPage() {
  const [modo, setModo] = useState<ModoDistribucion>("round_robin");

  function guardar() {
    toast.success("Configuración guardada", {
      description: `Los próximos leads se van a repartir en modo ${MODOS_DISTRIBUCION[modo].etiqueta}.`,
    });
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Configuración
        </h2>
        <p className="text-sm text-muted-foreground">
          Definí cómo trabaja el sistema para tu concesionaria.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <GitBranch className="size-4 text-muted-foreground" aria-hidden="true" />
            Distribución de leads
          </CardTitle>
          <CardDescription>
            Elegí cómo se reparten los leads nuevos entre tus vendedores.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Modo de distribución</legend>
            {(
              Object.entries(MODOS_DISTRIBUCION) as [
                ModoDistribucion,
                (typeof MODOS_DISTRIBUCION)[ModoDistribucion],
              ][]
            ).map(([clave, info]) => {
              const Icono = ICONOS_MODO[clave];
              const activo = modo === clave;
              return (
                <label
                  key={clave}
                  className={cn(
                    "flex cursor-pointer flex-col gap-1.5 rounded-md border p-4 transition-colors duration-150",
                    activo
                      ? "border-primary bg-secondary"
                      : "hover:border-ring",
                  )}
                >
                  <input
                    type="radio"
                    name="modo-distribucion"
                    value={clave}
                    checked={activo}
                    onChange={() => setModo(clave)}
                    className="sr-only"
                  />
                  <span className="flex items-center gap-2">
                    <Icono
                      className={cn(
                        "size-4",
                        activo ? "text-primary" : "text-muted-foreground",
                      )}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium">{info.etiqueta}</span>
                    {activo && (
                      <span className="ml-auto size-2 rounded-full bg-primary" aria-hidden="true" />
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {info.descripcion}
                  </span>
                </label>
              );
            })}
          </fieldset>

          <div className="flex justify-end">
            <Button onClick={guardar}>Guardar cambios</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <Database className="size-4 text-muted-foreground" aria-hidden="true" />
            Base de datos
          </CardTitle>
          <CardDescription>
            Infraestructura que alimenta el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-success" aria-hidden="true" />
            <p>
              PostgreSQL para los datos y Redis para las sesiones, en Docker
              (<code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">docker-compose.yml</code>).
            </p>
          </div>
          <p className="text-muted-foreground">
            Levantá el stack con{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">npm run db:up</code>{" "}
            y cargá los datos con{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">npm run db:seed</code>.
            El esquema vive en{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">db/migrations</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
