import {
  Award,
  Banknote,
  Flame,
  Star,
  Timer,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Medidor } from "@/components/app/charts";
import { usuarioActual } from "@/lib/auth";
import { obtenerMiembrosEquipo, obtenerVendedores } from "@/lib/data";
import {
  formatearDuracion,
  formatearFecha,
  formatearNumero,
  formatearPesosCompacto,
  formatearPorcentaje,
  iniciales,
} from "@/lib/format";
import { ROLES_USUARIO } from "@/lib/labels";
import {
  EditarMiembroEquipo,
  EliminarMiembroEquipo,
  NuevoMiembroEquipo,
  ReactivarMiembroEquipo,
} from "./formularios";

export const metadata = { title: "Equipo" };

const ICONOS_INSIGNIA: Record<string, LucideIcon> = {
  trofeo: Trophy,
  rayo: Zap,
  fuego: Flame,
  dinero: Banknote,
  estrella: Star,
};

const XP_POR_NIVEL = 700;

export default async function EquipoPage() {
  const [vendedores, miembros, usuario] = await Promise.all([
    obtenerVendedores(),
    obtenerMiembrosEquipo(),
    usuarioActual(),
  ]);
  const ranking = [...vendedores].sort((a, b) => b.xp - a.xp);
  const maxVentas = Math.max(...ranking.map((v) => v.ventasMes), 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Equipo
          </h2>
          <p className="text-sm text-muted-foreground">
            Ventas, administración, contabilidad y taller: todo el equipo y
            su acceso al sistema.
          </p>
        </div>
        {usuario.rol === "gerente" && <NuevoMiembroEquipo />}
      </div>

      <Card className="py-0">
        <CardHeader className="pt-5">
          <CardTitle className="text-base">Todo el equipo</CardTitle>
          <CardDescription>
            Cada persona accede con su email y contraseña propios.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Alta</TableHead>
                  {usuario.rol === "gerente" && (
                    <TableHead className="text-right">Acciones</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {miembros.map((m) => {
                  const rol = ROLES_USUARIO[m.rol];
                  return (
                    <TableRow
                      key={m.id}
                      className={!m.activo ? "opacity-60" : undefined}
                    >
                      <TableCell className="font-medium">{m.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={rol.className}>
                          {rol.etiqueta}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {m.activo ? (
                          <span className="text-sm text-muted-foreground">
                            Activo
                          </span>
                        ) : (
                          <Badge variant="outline">Inactivo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatearFecha(m.creadoEn)}
                      </TableCell>
                      {usuario.rol === "gerente" && (
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <EditarMiembroEquipo miembro={m} />
                            {m.activo ? (
                              m.id !== usuario.id && (
                                <EliminarMiembroEquipo miembro={m} />
                              )
                            ) : (
                              <ReactivarMiembroEquipo miembro={m} />
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-heading text-xl font-semibold tracking-tight">
          Ranking de ventas
        </h3>
        <p className="text-sm text-muted-foreground">
          Niveles, experiencia e insignias: la competencia sana también vende.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ranking.map((v, i) => {
          const xpEnNivel = v.xp % XP_POR_NIVEL;
          return (
            <Card key={v.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="size-12">
                      <AvatarFallback className="bg-primary font-semibold text-primary-foreground">
                        {iniciales(v.nombre)}
                      </AvatarFallback>
                    </Avatar>
                    {i === 0 && (
                      <span
                        className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-warning"
                        title="Primer puesto del mes"
                      >
                        <Trophy className="size-3 text-white" aria-hidden="true" />
                        <span className="sr-only">Primer puesto del mes</span>
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="font-heading text-base">
                      {v.nombre}
                    </CardTitle>
                    <CardDescription>
                      Nivel {v.nivel} · {formatearNumero(v.xp)} XP
                    </CardDescription>
                  </div>
                  <span className="font-heading text-2xl font-semibold text-muted-foreground">
                    #{i + 1}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progreso al nivel {v.nivel + 1}</span>
                    <span className="tabular-nums">
                      {formatearNumero(xpEnNivel)} / {formatearNumero(XP_POR_NIVEL)} XP
                    </span>
                  </div>
                  <Progress
                    value={(xpEnNivel / XP_POR_NIVEL) * 100}
                    aria-label={`Progreso al nivel ${v.nivel + 1}`}
                  />
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Ventas del mes</dt>
                    <dd className="font-medium tabular-nums">
                      {formatearNumero(v.ventasMes)}
                    </dd>
                    <Medidor valor={v.ventasMes} max={maxVentas} colorClase="bg-chart-2" />
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Facturación</dt>
                    <dd className="font-medium tabular-nums">
                      {formatearPesosCompacto(v.facturacionMes)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Conversión</dt>
                    <dd className="font-medium tabular-nums">
                      {formatearPorcentaje(v.conversion)}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Timer className="size-3" aria-hidden="true" />
                      Respuesta promedio
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {formatearDuracion(v.tiempoRespuestaSeg)}
                    </dd>
                  </div>
                </dl>

                {v.insignias.length > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Award className="size-3.5" aria-hidden="true" />
                      Insignias
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {v.insignias.map((insignia) => {
                        const Icono = ICONOS_INSIGNIA[insignia.icono] ?? Award;
                        return (
                          <Badge
                            key={insignia.id}
                            variant="secondary"
                            className="gap-1.5 font-normal"
                            title={insignia.descripcion}
                          >
                            <Icono className="size-3 text-warning" aria-hidden="true" />
                            {insignia.nombre}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
