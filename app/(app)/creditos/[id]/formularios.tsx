"use client";

import { useTransition } from "react";
import { Check, Pencil, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormularioDialogo } from "@/components/app/formulario-dialogo";
import { CampoTexto, FilaCampos } from "@/components/app/campos-formulario";
import { ESTADO_INICIAL } from "@/lib/acciones/estado";
import type { Cuota } from "@/lib/types";
import {
  actualizarCuota,
  registrarPagoCuota,
  revertirPagoCuota,
} from "../acciones";

/** Cobra la cuota con fecha y monto: por defecto, hoy y lo que dice el plan. */
export function CobrarCuota({ cuota }: { cuota: Cuota }) {
  return (
    <FormularioDialogo
      titulo={`Cobrar la cuota ${cuota.numero}`}
      descripcion="Queda pagada y el ingreso se registra en caja."
      textoGuardar="Registrar cobro"
      accion={registrarPagoCuota}
      disparador={
        <Button variant="outline" size="sm">
          <Check className="size-3.5" aria-hidden="true" />
          Cobrar
        </Button>
      }
    >
      <input type="hidden" name="id" value={cuota.id} />
      <FilaCampos>
        <CampoTexto
          nombre="fechaPago"
          etiqueta="Fecha del pago"
          type="date"
          requerido
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
        <CampoTexto
          nombre="monto"
          etiqueta="Monto cobrado"
          type="number"
          min={1}
          step="0.01"
          requerido
          defaultValue={cuota.monto}
        />
      </FilaCampos>
    </FormularioDialogo>
  );
}

/** Corrige una cuota puntual: una prórroga acordada o un monto distinto. */
export function EditarCuota({ cuota }: { cuota: Cuota }) {
  return (
    <FormularioDialogo
      titulo={`Editar la cuota ${cuota.numero}`}
      descripcion="Sirve para una prórroga o un monto acordado aparte. Si volvés a guardar el plan, se recalcula."
      textoGuardar="Guardar cuota"
      accion={actualizarCuota}
      disparador={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Editar la cuota ${cuota.numero}`}
        >
          <Pencil aria-hidden="true" />
        </Button>
      }
    >
      <input type="hidden" name="id" value={cuota.id} />
      <FilaCampos>
        <CampoTexto
          nombre="vencimiento"
          etiqueta="Vencimiento"
          type="date"
          requerido
          defaultValue={cuota.vencimiento}
        />
        <CampoTexto
          nombre="monto"
          etiqueta="Monto"
          type="number"
          min={1}
          step="0.01"
          requerido
          defaultValue={cuota.monto}
        />
      </FilaCampos>
    </FormularioDialogo>
  );
}

/** Deshace un cobro mal cargado: la cuota vuelve a pendiente y sale de caja. */
export function RevertirCobro({ cuota }: { cuota: Cuota }) {
  const [pendiente, iniciarTransicion] = useTransition();

  function revertir() {
    iniciarTransicion(async () => {
      const formData = new FormData();
      formData.set("id", cuota.id);
      await revertirPagoCuota(ESTADO_INICIAL, formData);
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Deshacer el cobro de la cuota ${cuota.numero}`}
      onClick={revertir}
      disabled={pendiente}
    >
      <Undo2 aria-hidden="true" />
    </Button>
  );
}
