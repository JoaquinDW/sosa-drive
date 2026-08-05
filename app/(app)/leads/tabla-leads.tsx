"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserX } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
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
import { BadgeEstado, BadgeScore, IconoFuente } from "@/components/app/badges";
import { iniciales, tiempoRelativo } from "@/lib/format";
import { ESTADOS_LEAD } from "@/lib/labels";
import type { EstadoLead, Lead, Moto, Vendedor } from "@/lib/types";

interface TablaLeadsProps {
  leads: Lead[];
  motos: Moto[];
  vendedores: Vendedor[];
}

export function TablaLeads({ leads, motos, vendedores }: TablaLeadsProps) {
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<string>("todos");
  const [vendedor, setVendedor] = useState<string>("todos");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return leads.filter((l) => {
      if (estado !== "todos" && l.estado !== estado) return false;
      if (vendedor === "sin_asignar" && l.vendedorId) return false;
      if (
        vendedor !== "todos" &&
        vendedor !== "sin_asignar" &&
        l.vendedorId !== vendedor
      )
        return false;
      if (q) {
        const moto = motos.find((m) => m.id === l.motoInteresId);
        const texto =
          `${l.nombre} ${l.ciudad} ${l.telefono} ${moto?.marca ?? ""} ${moto?.modelo ?? ""}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [leads, motos, busqueda, estado, vendedor]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, ciudad o moto…"
            aria-label="Buscar leads"
            className="pl-9"
          />
        </div>
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="w-44" aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {(Object.keys(ESTADOS_LEAD) as EstadoLead[]).map((e) => (
              <SelectItem key={e} value={e}>
                {ESTADOS_LEAD[e].etiqueta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={vendedor} onValueChange={setVendedor}>
          <SelectTrigger className="w-44" aria-label="Filtrar por vendedor">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo el equipo</SelectItem>
            <SelectItem value="sin_asignar">Sin asignar</SelectItem>
            {vendedores.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="py-0">
        <CardContent className="px-0">
          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
              <UserX className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="font-medium">No encontramos leads con esos filtros</p>
              <p className="text-sm text-muted-foreground">
                Probá con otra búsqueda o limpiá los filtros.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Moto de interés</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Score IA</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Último contacto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((lead) => {
                    const moto = motos.find((m) => m.id === lead.motoInteresId);
                    const vend = vendedores.find(
                      (v) => v.id === lead.vendedorId,
                    );
                    return (
                      <TableRow key={lead.id} className="relative">
                        <TableCell>
                          <Link
                            href={`/leads/${lead.id}`}
                            className="flex items-center gap-3 after:absolute after:inset-0"
                          >
                            <span className="flex items-center justify-center">
                              <IconoFuente
                                fuente={lead.fuente}
                                className="size-4 text-muted-foreground"
                              />
                            </span>
                            <span>
                              <span className="block font-medium">
                                {lead.nombre}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {lead.ciudad}
                              </span>
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          {moto ? (
                            <span className="text-sm">
                              {moto.marca} {moto.modelo}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <BadgeEstado estado={lead.estado} />
                        </TableCell>
                        <TableCell>
                          <BadgeScore score={lead.score} />
                        </TableCell>
                        <TableCell>
                          {vend ? (
                            <span className="flex items-center gap-2">
                              <Avatar className="size-6">
                                <AvatarFallback className="bg-secondary text-[10px] font-semibold">
                                  {iniciales(vend.nombre)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {vend.nombre.split(" ")[0]}
                              </span>
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Sin asignar
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {lead.ultimoContactoEn
                            ? tiempoRelativo(lead.ultimoContactoEn)
                            : "Nunca"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {filtrados.length} de {leads.length} leads
      </p>
    </div>
  );
}
