"use client";

import { FormularioDialogo } from "@/components/app/formulario-dialogo";
import {
  CampoSelect,
  CampoTexto,
  FilaCampos,
} from "@/components/app/campos-formulario";
import { crearCredito } from "./acciones";

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
    </FormularioDialogo>
  );
}
