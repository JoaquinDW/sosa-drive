"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormularioDialogo } from "@/components/app/formulario-dialogo";
import {
  CampoSelect,
  CampoTexto,
  CampoTextarea,
  FilaCampos,
} from "@/components/app/campos-formulario";
import type { Credito } from "@/lib/types";
import { actualizarCredito, crearCredito } from "./acciones";

const OPCIONES_ESTADO = [
  { valor: "al_dia", etiqueta: "Al día" },
  { valor: "en_mora", etiqueta: "En mora" },
  { valor: "cancelado", etiqueta: "Cancelado" },
  { valor: "refinanciado", etiqueta: "Refinanciado" },
];

export function NuevoCredito({
  clientes,
  unidades,
}: {
  clientes: { id: string; etiqueta: string }[];
  unidades: { id: string; etiqueta: string }[];
}) {
  const opcionesCliente = clientes.map((c) => ({
    valor: c.id,
    etiqueta: c.etiqueta,
  }));
  const opcionesUnidad = unidades.map((u) => ({
    valor: u.id,
    etiqueta: u.etiqueta,
  }));

  const sinUnidades = opcionesUnidad.length === 0;

  return (
    <FormularioDialogo
      titulo="Nuevo crédito"
      descripcion="Financiá la venta de una unidad disponible con cuotas propias."
      textoDisparador="Nuevo crédito"
      textoGuardar="Registrar crédito"
      accion={crearCredito}
    >
      <CampoSelect
        nombre="clienteId"
        etiqueta="Cliente"
        requerido
        opciones={opcionesCliente}
        placeholder="Elegí un cliente"
      />
      <CampoSelect
        nombre="unidadId"
        etiqueta="Unidad a vender"
        requerido
        opciones={opcionesUnidad}
        placeholder={sinUnidades ? "No hay unidades disponibles" : "Elegí una unidad"}
      />
      <FilaCampos>
        <CampoTexto nombre="capital" etiqueta="Capital" type="number" requerido placeholder="0" />
        <CampoTexto
          nombre="totalAPagar"
          etiqueta="Total a pagar"
          type="number"
          requerido
          placeholder="0"
        />
      </FilaCampos>
      <FilaCampos>
        <CampoTexto
          nombre="cantidadCuotas"
          etiqueta="Cantidad de cuotas"
          type="number"
          min={1}
          requerido
          placeholder="12"
        />
        <CampoTexto
          nombre="primerVencimiento"
          etiqueta="1er vencimiento"
          type="date"
          requerido
        />
      </FilaCampos>
      <CampoTexto
        nombre="diaPago"
        etiqueta="Día de pago"
        type="number"
        min={1}
        max={31}
        placeholder="El del primer vencimiento"
      />
    </FormularioDialogo>
  );
}

/**
 * Edición del plan. El día de pago y el primer vencimiento definen el
 * cronograma completo: al guardarlos se recalculan las cuotas y con eso el
 * sistema sabe si el cliente está al día o debe.
 */
export function EditarCredito({
  credito,
  clientes,
  cuotasPagadas,
}: {
  credito: Credito;
  clientes: { id: string; etiqueta: string }[];
  cuotasPagadas: number;
}) {
  const opcionesCliente = clientes.map((c) => ({
    valor: c.id,
    etiqueta: c.etiqueta,
  }));
  const etiqueta = credito.numero ? `el plan ${credito.numero}` : "el plan";

  return (
    <FormularioDialogo
      titulo="Editar plan"
      descripcion="El día de pago y el primer vencimiento recalculan las cuotas impagas del plan."
      textoGuardar="Guardar cambios"
      accion={actualizarCredito}
      disparador={
        <Button variant="ghost" size="icon-sm" aria-label={`Editar ${etiqueta}`}>
          <Pencil aria-hidden="true" />
        </Button>
      }
    >
      <input type="hidden" name="id" value={credito.id} />
      <CampoSelect
        nombre="clienteId"
        etiqueta="Cliente"
        requerido
        opciones={opcionesCliente}
        defaultValue={credito.clienteId}
        placeholder="Elegí un cliente"
      />
      <CampoTexto
        nombre="descripcionMoto"
        etiqueta="Moto"
        defaultValue={credito.descripcionMoto ?? ""}
        placeholder="Marca, modelo y dominio"
      />
      <FilaCampos>
        <CampoTexto
          nombre="cuotaMensual"
          etiqueta="Cuota mensual"
          type="number"
          min={1}
          step="0.01"
          defaultValue={credito.cuotaMensual ?? ""}
          placeholder="0"
        />
        <CampoTexto
          nombre="cantidadCuotas"
          etiqueta="Cantidad de cuotas"
          type="number"
          min={1}
          defaultValue={credito.cantidadCuotas ?? ""}
          placeholder="12"
        />
      </FilaCampos>
      <FilaCampos>
        <CampoTexto
          nombre="diaPago"
          etiqueta="Día de pago"
          type="number"
          min={1}
          max={31}
          defaultValue={credito.diaPago ?? ""}
          placeholder="Ej.: 16"
        />
        <CampoTexto
          nombre="primerVencimiento"
          etiqueta="1er vencimiento"
          type="date"
          defaultValue={credito.fechaInicio ?? ""}
        />
      </FilaCampos>
      <FilaCampos>
        <CampoTexto
          nombre="cuotasPagadas"
          etiqueta="Cuotas ya pagadas"
          type="number"
          min={0}
          defaultValue={cuotasPagadas}
        />
        <CampoSelect
          nombre="estado"
          etiqueta="Estado"
          requerido
          opciones={OPCIONES_ESTADO}
          defaultValue={credito.estado}
        />
      </FilaCampos>
      <p className="text-xs text-muted-foreground">
        Las primeras cuotas del plan quedan marcadas como pagadas según ese
        número; el resto, pendientes. El día de pago define cuándo vence cada
        una: si el mes no llega a ese día, vence el último.
      </p>
      <CampoTextarea
        nombre="observaciones"
        etiqueta="Observaciones"
        rows={2}
        defaultValue={credito.observaciones ?? ""}
      />
    </FormularioDialogo>
  );
}
