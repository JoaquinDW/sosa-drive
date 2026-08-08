-- "Eliminar" a alguien del equipo no borra el perfil: leads.vendedor_id y
-- eventos_agenda.vendedor_id ponen null al borrar, pero tareas.vendedor_id
-- es "on delete cascade" (ver esquema inicial), así que un borrado físico
-- se llevaría puesto su historial de tareas. En cambio se desactiva el
-- acceso (login) y se conserva el perfil; se puede reactivar.

alter table public.perfiles
  add column activo boolean not null default true;
