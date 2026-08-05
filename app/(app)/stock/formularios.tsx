"use client";

import { FormularioDialogo } from "@/components/app/formulario-dialogo";
import {
  CampoSelect,
  CampoTexto,
  CampoTextarea,
  FilaCampos,
} from "@/components/app/campos-formulario";
import { UBICACIONES_UNIDAD } from "@/lib/labels";
import { crearCompra, crearUnidad } from "./acciones";

const OPCIONES_UBICACION = Object.entries(UBICACIONES_UNIDAD).map(
  ([valor, etiqueta]) => ({ valor, etiqueta }),
);

const OPCIONES_CONDICION = [
  { valor: "usada", etiqueta: "Usada" },
  { valor: "0km", etiqueta: "0 km" },
];

export function NuevaUnidad() {
  return (
    <FormularioDialogo
      titulo="Nueva unidad"
      descripcion="Ingresá una moto al stock. Queda registrada en el kardex."
      textoDisparador="Nueva unidad"
      textoGuardar="Agregar al stock"
      accion={crearUnidad}
    >
      <FilaCampos>
        <CampoTexto nombre="marca" etiqueta="Marca" requerido placeholder="Honda" />
        <CampoTexto nombre="modelo" etiqueta="Modelo" requerido placeholder="Wave 110" />
      </FilaCampos>
      <FilaCampos>
        <CampoTexto nombre="anio" etiqueta="Año" type="number" placeholder="2026" />
        <CampoTexto nombre="color" etiqueta="Color" placeholder="Rojo" />
      </FilaCampos>
      <FilaCampos>
        <CampoTexto nombre="dominio" etiqueta="Dominio" placeholder="A123BCD" />
        <CampoTexto nombre="numeroCuadro" etiqueta="Nº de cuadro" />
      </FilaCampos>
      <FilaCampos>
        <CampoSelect
          nombre="condicion"
          etiqueta="Condición"
          opciones={OPCIONES_CONDICION}
          defaultValue="usada"
        />
        <CampoSelect
          nombre="ubicacion"
          etiqueta="Ubicación"
          opciones={OPCIONES_UBICACION}
          defaultValue="salon"
        />
      </FilaCampos>
      <FilaCampos>
        <CampoTexto
          nombre="precioCompra"
          etiqueta="Precio de compra"
          type="number"
          placeholder="0"
        />
        <CampoTexto
          nombre="precioVenta"
          etiqueta="Precio de venta"
          type="number"
          placeholder="0"
        />
      </FilaCampos>
      <CampoTextarea nombre="observaciones" etiqueta="Observaciones" />
    </FormularioDialogo>
  );
}

export function NuevaCompra() {
  return (
    <FormularioDialogo
      titulo="Nueva compra"
      descripcion="Registrá una compra a proveedor."
      textoDisparador="Nueva compra"
      textoGuardar="Registrar compra"
      accion={crearCompra}
    >
      <CampoTexto nombre="proveedor" etiqueta="Proveedor" requerido />
      <FilaCampos>
        <CampoTexto nombre="factura" etiqueta="Factura" requerido />
        <CampoTexto nombre="fecha" etiqueta="Fecha" type="date" requerido />
      </FilaCampos>
      <FilaCampos>
        <CampoTexto
          nombre="costoTotal"
          etiqueta="Costo total"
          type="number"
          requerido
          placeholder="0"
        />
        <CampoTexto nombre="formaPago" etiqueta="Forma de pago" requerido placeholder="Transferencia" />
      </FilaCampos>
      <CampoTextarea nombre="observaciones" etiqueta="Observaciones" />
    </FormularioDialogo>
  );
}
