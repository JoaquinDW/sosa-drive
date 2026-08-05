"use client";

import { FormularioDialogo } from "@/components/app/formulario-dialogo";
import {
  CampoTexto,
  CampoTextarea,
  FilaCampos,
} from "@/components/app/campos-formulario";
import { crearCliente } from "./acciones";

export function NuevoCliente() {
  return (
    <FormularioDialogo
      titulo="Nuevo cliente"
      descripcion="Ficha única del cliente."
      textoDisparador="Nuevo cliente"
      textoGuardar="Agregar cliente"
      accion={crearCliente}
    >
      <CampoTexto nombre="nombre" etiqueta="Nombre" requerido />
      <FilaCampos>
        <CampoTexto nombre="telefono" etiqueta="Teléfono" type="tel" />
        <CampoTexto nombre="dni" etiqueta="DNI" />
      </FilaCampos>
      <CampoTextarea nombre="observaciones" etiqueta="Observaciones" />
    </FormularioDialogo>
  );
}
