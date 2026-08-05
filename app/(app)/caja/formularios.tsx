"use client";

import { FormularioDialogo } from "@/components/app/formulario-dialogo";
import {
  CampoSelect,
  CampoTexto,
  CampoTextarea,
  FilaCampos,
} from "@/components/app/campos-formulario";
import { CATEGORIAS_CAJA } from "@/lib/labels";
import { crearMovimientoCaja } from "./acciones";

const OPCIONES_CATEGORIA = Object.entries(CATEGORIAS_CAJA).map(
  ([valor, etiqueta]) => ({ valor, etiqueta }),
);

const OPCIONES_TIPO = [
  { valor: "ingreso", etiqueta: "Ingreso" },
  { valor: "egreso", etiqueta: "Egreso" },
];

const HOY = new Date().toISOString().slice(0, 10);

export function NuevoMovimientoCaja() {
  return (
    <FormularioDialogo
      titulo="Nuevo movimiento de caja"
      descripcion="Registrá un ingreso o egreso de caja."
      textoDisparador="Nuevo movimiento"
      textoGuardar="Registrar movimiento"
      accion={crearMovimientoCaja}
    >
      <FilaCampos>
        <CampoTexto nombre="fecha" etiqueta="Fecha" type="date" requerido defaultValue={HOY} />
        <CampoSelect
          nombre="tipo"
          etiqueta="Tipo"
          requerido
          opciones={OPCIONES_TIPO}
          defaultValue="ingreso"
        />
      </FilaCampos>
      <CampoSelect
        nombre="categoria"
        etiqueta="Categoría"
        requerido
        opciones={OPCIONES_CATEGORIA}
      />
      <CampoTextarea nombre="descripcion" etiqueta="Descripción" requerido />
      <FilaCampos>
        <CampoTexto nombre="monto" etiqueta="Monto" type="number" requerido placeholder="0" />
        <CampoTexto nombre="referencia" etiqueta="Referencia" />
      </FilaCampos>
    </FormularioDialogo>
  );
}
