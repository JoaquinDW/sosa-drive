import {
  obtenerConversaciones,
  obtenerLeads,
  obtenerMensajes,
  obtenerVendedores,
} from "@/lib/data";
import { InboxCliente } from "./inbox-cliente";
import type { Mensaje } from "@/lib/types";

export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  const [conversaciones, leads, vendedores] = await Promise.all([
    obtenerConversaciones(),
    obtenerLeads(),
    obtenerVendedores(),
  ]);

  const listasMensajes = await Promise.all(
    conversaciones.map((c) => obtenerMensajes(c.id)),
  );
  const mensajesPorConversacion: Record<string, Mensaje[]> = {};
  conversaciones.forEach((c, i) => {
    mensajesPorConversacion[c.id] = listasMensajes[i];
  });

  return (
    <InboxCliente
      conversaciones={conversaciones}
      leads={leads}
      vendedores={vendedores}
      mensajesPorConversacion={mensajesPorConversacion}
    />
  );
}
