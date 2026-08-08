-- El equipo no es solo ventas: suma administración, contabilidad y taller.
-- Cada persona nueva se crea con su propio acceso (perfiles.email +
-- password_hash), así que estos roles habilitan altas reales desde /equipo
-- en lugar de solo "gerente"/"vendedor".
--
-- `alter type ... add value` no puede ejecutarse junto con el uso del valor
-- nuevo dentro de la misma transacción; por eso va en su propia migración,
-- sin nada más en el archivo.

alter type rol_usuario add value 'administracion';
alter type rol_usuario add value 'contabilidad';
alter type rol_usuario add value 'taller';
