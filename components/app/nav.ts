import {
  ChartLine,
  Columns3,
  Contact,
  HandCoins,
  LayoutDashboard,
  MessageCircle,
  Receipt,
  ScrollText,
  Settings,
  Trophy,
  Users,
  Wallet,
  Warehouse,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface ItemNav {
  titulo: string;
  href: string;
  icono: LucideIcon;
}

export interface SeccionNav {
  titulo?: string;
  items: ItemNav[];
}

export const SECCIONES_NAV: SeccionNav[] = [
  {
    items: [
      { titulo: "Dashboard", href: "/dashboard", icono: LayoutDashboard },
      { titulo: "Equipo", href: "/equipo", icono: Trophy },
    ],
  },
  {
    titulo: "Comercial",
    items: [
      { titulo: "WhatsApp", href: "/whatsapp", icono: MessageCircle },
      { titulo: "Leads", href: "/leads", icono: Users },
      { titulo: "Pipeline", href: "/pipeline", icono: Columns3 },
    ],
  },
  {
    titulo: "Operaciones",
    items: [
      { titulo: "Stock", href: "/stock", icono: Warehouse },
      { titulo: "Taller", href: "/taller", icono: Wrench },
      { titulo: "Créditos", href: "/creditos", icono: HandCoins },
      { titulo: "Caja", href: "/caja", icono: Wallet },
      { titulo: "Gastos", href: "/gastos", icono: Receipt },
      { titulo: "Clientes", href: "/clientes", icono: Contact },
      { titulo: "Finanzas", href: "/finanzas", icono: ChartLine },
      { titulo: "Auditoría", href: "/auditoria", icono: ScrollText },
    ],
  },
];

export const NAV_SECUNDARIA: ItemNav[] = [
  { titulo: "Configuración", href: "/configuracion", icono: Settings },
];

const TODOS_LOS_ITEMS: ItemNav[] = [
  ...SECCIONES_NAV.flatMap((s) => s.items),
  ...NAV_SECUNDARIA,
];

export function tituloDeRuta(pathname: string): string {
  const item = TODOS_LOS_ITEMS.find(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  return item?.titulo ?? "Sosa Drive";
}
