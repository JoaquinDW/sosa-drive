import { obtenerLeads, obtenerMotos, obtenerVendedores } from "@/lib/data";
import { TablaLeads } from "./tabla-leads";

export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  const [leads, motos, vendedores] = await Promise.all([
    obtenerLeads(),
    obtenerMotos(),
    obtenerVendedores(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Leads
          </h2>
          <p className="text-sm text-muted-foreground">
            Todos tus clientes potenciales, con score de la IA y seguimiento al
            día.
          </p>
        </div>
      </div>

      <TablaLeads leads={leads} motos={motos} vendedores={vendedores} />
    </div>
  );
}
