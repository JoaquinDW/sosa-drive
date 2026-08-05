"use client";

import { FormularioDialogo } from "@/components/app/formulario-dialogo";
import {
  CampoSelect,
  CampoTexto,
  CampoTextarea,
  FilaCampos,
} from "@/components/app/campos-formulario";
import { crearOrdenTaller, crearRepuesto } from "./acciones";

const OPCIONES_PRIORIDAD = [
  { valor: "alta", etiqueta: "Alta" },
  { valor: "media", etiqueta: "Media" },
  { valor: "baja", etiqueta: "Baja" },
];

export function NuevaOrdenTaller({
  unidades,
}: {
  unidades: { id: string; etiqueta: string }[];
}) {
  const opcionesUnidad = [
    { valor: "__ninguna__", etiqueta: "Sin unidad asociada" },
    ...unidades.map((u) => ({ valor: u.id, etiqueta: u.etiqueta })),
  ];

  return (
    <FormularioDialogo
      titulo="Nueva orden de trabajo"
      descripcion="Abrí una OT para una moto que entra al taller."
      textoDisparador="Nueva orden"
      textoGuardar="Abrir orden"
      accion={crearOrdenTaller}
    >
      <FilaCampos>
        <CampoTexto nombre="clienteNombre" etiqueta="Cliente" requerido />
        <CampoTexto nombre="mecanico" etiqueta="Mecánico" requerido />
      </FilaCampos>
      <CampoTexto
        nombre="motoDescripcion"
        etiqueta="Moto"
        requerido
        placeholder="Honda Wave 110 · 2022"
      />
      <CampoTextarea nombre="motivo" etiqueta="Motivo" requerido />
      <FilaCampos>
        <CampoSelect
          nombre="prioridad"
          etiqueta="Prioridad"
          opciones={OPCIONES_PRIORIDAD}
          defaultValue="media"
        />
        <CampoTexto nombre="fechaEstimada" etiqueta="Fecha estimada" type="date" />
      </FilaCampos>
      <CampoSelect
        nombre="unidadId"
        etiqueta="Unidad del stock"
        opciones={opcionesUnidad}
        defaultValue="__ninguna__"
      />
    </FormularioDialogo>
  );
}

export function NuevoRepuesto() {
  return (
    <FormularioDialogo
      titulo="Nuevo repuesto"
      descripcion="Sumá un repuesto al inventario del taller."
      textoDisparador="Nuevo repuesto"
      textoGuardar="Agregar repuesto"
      accion={crearRepuesto}
    >
      <FilaCampos>
        <CampoTexto nombre="codigo" etiqueta="Código" requerido />
        <CampoTexto nombre="categoria" etiqueta="Categoría" requerido placeholder="Filtros" />
      </FilaCampos>
      <CampoTexto nombre="nombre" etiqueta="Nombre" requerido />
      <FilaCampos>
        <CampoTexto nombre="marca" etiqueta="Marca" />
        <CampoTexto nombre="proveedor" etiqueta="Proveedor" />
      </FilaCampos>
      <FilaCampos>
        <CampoTexto nombre="costo" etiqueta="Costo" type="number" placeholder="0" />
        <CampoTexto nombre="precio" etiqueta="Precio" type="number" placeholder="0" />
      </FilaCampos>
      <FilaCampos>
        <CampoTexto nombre="cantidad" etiqueta="Cantidad" type="number" placeholder="0" />
        <CampoTexto nombre="stockMinimo" etiqueta="Stock mínimo" type="number" placeholder="0" />
      </FilaCampos>
      <CampoTexto nombre="ubicacion" etiqueta="Ubicación" placeholder="Estante A" />
    </FormularioDialogo>
  );
}
