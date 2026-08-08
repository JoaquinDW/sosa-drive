// Render dinámico: los datos dependen del usuario en sesión y cambian por request.
export const dynamic = "force-dynamic";

import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { usuarioActual } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await usuarioActual();

  return (
    <div className="flex min-h-dvh w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <Topbar nombreUsuario={usuario.nombre} rolUsuario={usuario.rol} />
        {/*
          Ancho acotado por defecto: tablas y dashboards se leen mejor sin
          líneas de 1900px. Una página que necesita todo el ancho (el chat de
          /whatsapp, con sus tres columnas) lo pide marcando cualquier nodo
          suyo con `data-ancho-completo`.
        */}
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 has-data-ancho-completo:max-w-none sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
