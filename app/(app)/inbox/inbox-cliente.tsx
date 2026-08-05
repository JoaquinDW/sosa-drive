"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Lock,
  Paperclip,
  Send,
  User,
  Zap,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { BadgeScore, IconoFuente } from "@/components/app/badges";
import { formatearHora, iniciales, tiempoRelativo } from "@/lib/format";
import { FUENTES_LEAD } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Conversacion, Lead, Mensaje, Vendedor } from "@/lib/types";
import { toast } from "sonner";

const RESPUESTAS_RAPIDAS = [
  "¡Hola! 👋 ¿En qué te puedo ayudar?",
  "Sí, la tenemos disponible. ¿Querés pasar a verla?",
  "Te paso las opciones de financiación en un momento.",
  "¿Te queda bien mañana a la mañana para una visita?",
];

interface InboxClienteProps {
  conversaciones: Conversacion[];
  leads: Lead[];
  vendedores: Vendedor[];
  mensajesPorConversacion: Record<string, Mensaje[]>;
}

export function InboxCliente({
  conversaciones,
  leads,
  vendedores,
  mensajesPorConversacion,
}: InboxClienteProps) {
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(
    conversaciones[0]?.id ?? null,
  );
  const [borrador, setBorrador] = useState("");
  const [enviados, setEnviados] = useState<Record<string, Mensaje[]>>({});

  const seleccionada = conversaciones.find((c) => c.id === seleccionadaId);
  const lead = leads.find((l) => l.id === seleccionada?.leadId);
  const asignado = vendedores.find((v) => v.id === seleccionada?.asignadoA);

  const hilo = useMemo(() => {
    if (!seleccionada) return [];
    return [
      ...(mensajesPorConversacion[seleccionada.id] ?? []),
      ...(enviados[seleccionada.id] ?? []),
    ];
  }, [seleccionada, mensajesPorConversacion, enviados]);

  function enviarMensaje() {
    if (!borrador.trim() || !seleccionada) return;
    const nuevo: Mensaje = {
      id: `local-${Date.now()}`,
      conversacionId: seleccionada.id,
      autor: "vendedor",
      contenido: borrador.trim(),
      creadoEn: new Date().toISOString(),
    };
    setEnviados((prev) => ({
      ...prev,
      [seleccionada.id]: [...(prev[seleccionada.id] ?? []), nuevo],
    }));
    setBorrador("");
    toast.success("Mensaje enviado", {
      description: `Se envió por ${FUENTES_LEAD[seleccionada.canal]} a ${lead?.nombre ?? "el cliente"}.`,
    });
  }

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] min-h-[28rem] flex-col gap-0 lg:flex-row lg:gap-4">
      {/* Lista de conversaciones */}
      <Card
        className={cn(
          "flex w-full flex-col overflow-hidden py-0 lg:w-80 lg:shrink-0",
          seleccionadaId && "hidden lg:flex",
        )}
      >
        <div className="border-b px-4 py-3">
          <h2 className="font-heading text-base font-semibold">
            Conversaciones
          </h2>
          <p className="text-xs text-muted-foreground">
            Todos los canales en un solo lugar
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversaciones.map((c) => {
            const l = leads.find((x) => x.id === c.leadId);
            const activa = c.id === seleccionadaId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSeleccionadaId(c.id)}
                aria-current={activa ? "true" : undefined}
                className={cn(
                  "flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors duration-150 hover:bg-muted/60",
                  activa && "bg-muted",
                )}
              >
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback className="bg-secondary text-xs font-semibold">
                    {l ? iniciales(l.nombre) : "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <IconoFuente
                      fuente={c.canal}
                      className="size-3.5 shrink-0 text-muted-foreground"
                    />
                    <span className="truncate text-sm font-medium">
                      {l?.nombre ?? "Cliente"}
                    </span>
                    <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                      {tiempoRelativo(c.ultimoMensajeEn)}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className="truncate text-xs text-muted-foreground">
                      {c.ultimoMensaje}
                    </span>
                    {c.noLeidos > 0 && (
                      <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
                        {c.noLeidos}
                        <span className="sr-only">mensajes sin leer</span>
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Hilo */}
      <Card
        className={cn(
          "flex min-w-0 flex-1 flex-col overflow-hidden py-0",
          !seleccionadaId && "hidden lg:flex",
        )}
      >
        {seleccionada && lead ? (
          <>
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSeleccionadaId(null)}
                aria-label="Volver a la lista de conversaciones"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                  {iniciales(lead.nombre)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/leads/${lead.id}`}
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {lead.nombre}
                </Link>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <IconoFuente fuente={seleccionada.canal} className="size-3" />
                  {FUENTES_LEAD[seleccionada.canal]}
                  {asignado && <> · Atiende {asignado.nombre.split(" ")[0]}</>}
                </p>
              </div>
              <BadgeScore score={lead.score} />
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              {hilo.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex max-w-[85%] flex-col gap-1 sm:max-w-[70%]",
                    m.autor === "cliente"
                      ? "items-start self-start"
                      : "items-end self-end",
                  )}
                >
                  <div
                    className={cn(
                      "rounded-lg px-3.5 py-2.5 text-sm",
                      m.autor === "cliente" && "bg-muted",
                      m.autor === "vendedor" &&
                        !m.notaPrivada &&
                        "bg-primary text-primary-foreground",
                      m.autor === "ia" &&
                        "border border-red-200 bg-red-50 text-foreground dark:border-red-900 dark:bg-red-950",
                      m.notaPrivada &&
                        "border border-amber-200 bg-amber-50 text-foreground dark:border-amber-900 dark:bg-amber-950",
                    )}
                  >
                    {m.autor === "ia" && (
                      <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-red-700 dark:text-red-300">
                        <Bot className="size-3" aria-hidden="true" />
                        Agente IA
                      </p>
                    )}
                    {m.notaPrivada && (
                      <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                        <Lock className="size-3" aria-hidden="true" />
                        Nota privada — el cliente no la ve
                      </p>
                    )}
                    {m.contenido}
                  </div>
                  <p className="px-1 text-[11px] text-muted-foreground">
                    {formatearHora(m.creadoEn)} hs
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t p-3">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {RESPUESTAS_RAPIDAS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setBorrador(r)}
                    className="flex items-center gap-1 rounded-full border bg-secondary px-2.5 py-1 text-xs text-secondary-foreground transition-colors duration-150 hover:bg-muted"
                  >
                    <Zap className="size-3 text-muted-foreground" aria-hidden="true" />
                    {r.length > 38 ? `${r.slice(0, 38)}…` : r}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Adjuntar archivo"
                  className="shrink-0"
                >
                  <Paperclip className="size-4" />
                </Button>
                <Textarea
                  value={borrador}
                  onChange={(e) => setBorrador(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      enviarMensaje();
                    }
                  }}
                  placeholder={`Respondé a ${lead.nombre.split(" ")[0]}…`}
                  aria-label="Escribir mensaje"
                  rows={1}
                  className="max-h-32 min-h-10 flex-1 resize-none"
                />
                <Button
                  onClick={enviarMensaje}
                  disabled={!borrador.trim()}
                  size="icon"
                  aria-label="Enviar mensaje"
                  className="shrink-0"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <User className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">Elegí una conversación</p>
            <p className="text-sm text-muted-foreground">
              Acá vas a ver los mensajes de WhatsApp, Instagram, Facebook y
              Mercado Libre, todos juntos.
            </p>
          </div>
        )}
      </Card>

      {/* Panel lateral del lead (solo escritorio ancho) */}
      {lead && (
        <Card className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto p-4 xl:flex">
          <div>
            <h3 className="font-heading text-sm font-semibold">
              Datos del cliente
            </h3>
            <p className="mt-1 text-sm">{lead.nombre}</p>
            <p className="text-xs text-muted-foreground">{lead.ciudad}</p>
            <p className="text-xs text-muted-foreground">{lead.telefono}</p>
          </div>
          <div>
            <h4 className="text-xs font-medium text-muted-foreground">
              Score IA
            </h4>
            <div className="mt-1">
              <BadgeScore score={lead.score} />
            </div>
            {lead.scoreMotivo && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {lead.scoreMotivo}
              </p>
            )}
          </div>
          {lead.permuta && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground">
                Permuta
              </h4>
              <Badge variant="secondary" className="mt-1">
                {lead.permuta}
              </Badge>
            </div>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/leads/${lead.id}`}>Ver perfil completo</Link>
          </Button>
        </Card>
      )}
    </div>
  );
}
