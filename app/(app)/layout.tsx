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
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
