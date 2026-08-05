"use client";

import { FormularioDialogo } from "@/components/app/formulario-dialogo";
import {
  CampoSelect,
  CampoTexto,
  CampoTextarea,
  FilaCampos,
} from "@/components/app/campos-formulario";
import { CATEGORIAS_GASTO } from "@/lib/labels";
import { crearGasto } from "./acciones";

const OPCIONES_CATEGORIA = Object.entries(CATEGORIAS_GASTO).map(
  ([valor, etiqueta]) => ({ valor, etiqueta }),
);

const HOY = new Date().toISOString().slice(0, 10);

export function NuevoGasto() {
  return (
    <FormularioDialogo
      titulo="Nuevo gasto"
      descripcion="Cada gasto impacta directo en el dashboard financiero."
      textoDisparador="Nuevo gasto"
      textoGuardar="Registrar gasto"
      accion={crearGasto}
    >
      <FilaCampos>
        <CampoTexto nombre="fecha" etiqueta="Fecha" type="date" requerido defaultValue={HOY} />
        <CampoSelect
          nombre="categoria"
          etiqueta="Categoría"
          requerido
          opciones={OPCIONES_CATEGORIA}
        />
      </FilaCampos>
      <CampoTextarea nombre="descripcion" etiqueta="Descripción" requerido />
      <FilaCampos>
        <CampoTexto nombre="importe" etiqueta="Importe" type="number" requerido placeholder="0" />
        <CampoTexto nombre="metodoPago" etiqueta="Método de pago" requerido placeholder="Efectivo" />
      </FilaCampos>
      <CampoTexto nombre="proveedor" etiqueta="Proveedor" />
    </FormularioDialogo>
  );
}
