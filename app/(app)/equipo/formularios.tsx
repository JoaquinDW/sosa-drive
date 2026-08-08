"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FormularioDialogo } from "@/components/app/formulario-dialogo";
import {
  CampoSelect,
  CampoTexto,
  FilaCampos,
} from "@/components/app/campos-formulario";
import { ESTADO_INICIAL } from "@/lib/acciones/estado";
import type { MiembroEquipo } from "@/lib/types";
import {
  actualizarMiembroEquipo,
  crearMiembroEquipo,
  eliminarMiembroEquipo,
  reactivarMiembroEquipo,
} from "./acciones";

const OPCIONES_ROL = [
  { valor: "vendedor", etiqueta: "Ventas" },
  { valor: "administracion", etiqueta: "Administración" },
  { valor: "contabilidad", etiqueta: "Contabilidad" },
  { valor: "taller", etiqueta: "Taller" },
  { valor: "gerente", etiqueta: "Gerencia" },
];

export function NuevoMiembroEquipo() {
  return (
    <FormularioDialogo
      titulo="Nueva persona"
      descripcion="Sumala al equipo y creale su acceso al sistema."
      textoDisparador="Agregar persona"
      textoGuardar="Crear acceso"
      accion={crearMiembroEquipo}
    >
      <CampoTexto nombre="nombre" etiqueta="Nombre y apellido" requerido />
      <CampoTexto nombre="email" etiqueta="Email" type="email" requerido />
      <FilaCampos>
        <CampoSelect nombre="rol" etiqueta="Área" opciones={OPCIONES_ROL} requerido />
        <CampoTexto
          nombre="password"
          etiqueta="Contraseña provisoria"
          type="password"
          minLength={8}
          requerido
        />
      </FilaCampos>
    </FormularioDialogo>
  );
}

export function EditarMiembroEquipo({ miembro }: { miembro: MiembroEquipo }) {
  return (
    <FormularioDialogo
      titulo="Editar persona"
      descripcion="Actualizá sus datos o su acceso al sistema."
      textoGuardar="Guardar cambios"
      accion={actualizarMiembroEquipo}
      disparador={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Editar a ${miembro.nombre}`}
        >
          <Pencil aria-hidden="true" />
        </Button>
      }
    >
      <input type="hidden" name="id" value={miembro.id} />
      <CampoTexto
        nombre="nombre"
        etiqueta="Nombre y apellido"
        defaultValue={miembro.nombre}
        requerido
      />
      <CampoTexto
        nombre="email"
        etiqueta="Email"
        type="email"
        defaultValue={miembro.email}
        requerido
      />
      <FilaCampos>
        <CampoSelect
          nombre="rol"
          etiqueta="Área"
          opciones={OPCIONES_ROL}
          defaultValue={miembro.rol}
          requerido
        />
        <CampoTexto
          nombre="password"
          etiqueta="Nueva contraseña"
          type="password"
          minLength={8}
          placeholder="Dejar en blanco para no cambiarla"
        />
      </FilaCampos>
    </FormularioDialogo>
  );
}

export function EliminarMiembroEquipo({ miembro }: { miembro: MiembroEquipo }) {
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string>();
  const [pendiente, iniciarTransicion] = useTransition();

  function confirmar() {
    iniciarTransicion(async () => {
      const formData = new FormData();
      formData.set("id", miembro.id);
      const resultado = await eliminarMiembroEquipo(ESTADO_INICIAL, formData);
      if (resultado.ok) {
        setError(undefined);
        setAbierto(false);
      } else {
        setError(resultado.error);
      }
    });
  }

  function cambiarApertura(nuevo: boolean) {
    setAbierto(nuevo);
    if (!nuevo) setError(undefined);
  }

  return (
    <AlertDialog open={abierto} onOpenChange={cambiarApertura}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Eliminar acceso de ${miembro.nombre}`}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Eliminar el acceso de {miembro.nombre}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            No va a poder iniciar sesión, pero su historial de leads y
            tareas se conserva. Podés reactivarla cuando quieras.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button variant="destructive" onClick={confirmar} disabled={pendiente}>
            {pendiente ? "Eliminando…" : "Eliminar acceso"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ReactivarMiembroEquipo({ miembro }: { miembro: MiembroEquipo }) {
  const [pendiente, iniciarTransicion] = useTransition();

  function reactivar() {
    iniciarTransicion(async () => {
      const formData = new FormData();
      formData.set("id", miembro.id);
      await reactivarMiembroEquipo(ESTADO_INICIAL, formData);
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Reactivar a ${miembro.nombre}`}
      onClick={reactivar}
      disabled={pendiente}
    >
      <Undo2 aria-hidden="true" />
    </Button>
  );
}
