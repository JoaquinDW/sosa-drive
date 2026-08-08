import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, MessageCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard } from "@/components/app/kpi-card";
import {
  BadgeEstadoCredito,
  BadgeEstadoCuota,
} from "@/components/app/badges-operaciones";
import {
  conVencimientos,
  obtenerClientesOperaciones,
  obtenerCredito,
  obtenerCuotasDeCredito,
  obtenerVentas,
  resumirPlan,
} from "@/lib/data-operaciones";
import { formatearFecha, formatearPesos } from "@/lib/format";
import { EditarCredito } from "../formularios";
import { CobrarCuota, EditarCuota, RevertirCobro } from "./formularios";

export const metadata = { title: "Plan de crédito" };

function Dato({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{etiqueta}</span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}

export default async function CreditoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [credito, cuotas, clientes, ventas] = await Promise.all([
    obtenerCredito(id),
    obtenerCuotasDeCredito(id),
    obtenerClientesOperaciones(),
    obtenerVentas(),
  ]);
  if (!credito) notFound();

  const cliente = clientes.find((c) => c.id === credito.clienteId);
  const venta = credito.ventaId
    ? ventas.find((v) => v.id === credito.ventaId)
    : undefined;
  const moto = credito.descripcionMoto ?? venta?.descripcion ?? "Sin moto asociada";
  const resumen = resumirPlan(credito, cuotas);
  const efectivas = conVencimientos(cuotas);
  const opcionesCliente = clientes.map((c) => ({ id: c.id, etiqueta: c.nombre }));

  // Sin día de pago no hay cronograma: es lo primero que hay que completar.
  const sinPlan = credito.diaPago === undefined || credito.fechaInicio === undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/creditos" aria-label="Volver a créditos">
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <h2 className="font-heading text-2xl font-semibold tracking-tight">
              {cliente?.nombre ?? "Sin nombre"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {credito.numero ? `Plan ${credito.numero} · ` : ""}
              {moto}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cliente?.telefono && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://wa.me/54${cliente.telefono.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="size-3.5" aria-hidden="true" />
                WhatsApp
              </a>
            </Button>
          )}
          <EditarCredito
            credito={credito}
            clientes={opcionesCliente}
            cuotasPagadas={resumen.cuotasPagadas}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          etiqueta="Cobrado"
          valor={formatearPesos(resumen.cobrado)}
          icono={Wallet}
        />
        <KpiCard
          etiqueta="Saldo"
          valor={formatearPesos(resumen.saldo)}
          icono={CalendarClock}
        />
        <KpiCard
          etiqueta="Vencido"
          valor={formatearPesos(resumen.montoVencido)}
          icono={CalendarClock}
          destacado={resumen.montoVencido > 0}
        />
        <KpiCard
          etiqueta="Cuotas pagadas"
          valor={`${resumen.cuotasPagadas}/${credito.cantidadCuotas ?? resumen.cuotas}`}
          icono={Wallet}
        />
      </div>

      <Card>
        <CardContent className="grid gap-5 sm:grid-cols-3 lg:grid-cols-5">
          <Dato etiqueta="Estado">
            <BadgeEstadoCredito estado={resumen.estado} />
          </Dato>
          <Dato etiqueta="Día de pago">
            {credito.diaPago ? (
              `Todos los ${credito.diaPago}`
            ) : (
              <span className="text-destructive">Sin definir</span>
            )}
          </Dato>
          <Dato etiqueta="Cuota mensual">
            {credito.cuotaMensual !== undefined
              ? formatearPesos(credito.cuotaMensual)
              : "—"}
          </Dato>
          <Dato etiqueta="1er vencimiento">
            {credito.fechaInicio ? formatearFecha(credito.fechaInicio) : "—"}
          </Dato>
          <Dato etiqueta="Próximo vencimiento">
            {resumen.proximoVencimiento
              ? formatearFecha(resumen.proximoVencimiento)
              : "—"}
          </Dato>
        </CardContent>
      </Card>

      {sinPlan && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Falta el día de pago</CardTitle>
            <CardDescription>
              Cargá el día de pago y el primer vencimiento en &ldquo;Editar
              plan&rdquo;: con eso el sistema arma el cronograma y calcula solo
              si el cliente está al día o debe.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className="py-0">
        <CardHeader className="pt-5">
          <CardTitle className="text-base">Cuotas del plan</CardTitle>
          <CardDescription>
            Registrá los cobros acá: cada cuota cobrada deja su ingreso en caja.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Pagada el</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {efectivas.map((cuota) => (
                  <TableRow key={cuota.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {cuota.numero}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium">
                      {formatearFecha(cuota.vencimiento)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatearPesos(cuota.monto)}
                    </TableCell>
                    <TableCell>
                      <BadgeEstadoCuota estado={cuota.estado} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {cuota.pagadaEn ? formatearFecha(cuota.pagadaEn) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {cuota.estado === "pagada" ? (
                          <RevertirCobro cuota={cuota} />
                        ) : (
                          <CobrarCuota cuota={cuota} />
                        )}
                        <EditarCuota cuota={cuota} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {efectivas.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      Este plan todavía no tiene cuotas. Completá el día de pago,
                      el primer vencimiento, la cuota mensual y la cantidad de
                      cuotas para que se generen.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {credito.observaciones && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observaciones</CardTitle>
            <CardDescription>{credito.observaciones}</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
