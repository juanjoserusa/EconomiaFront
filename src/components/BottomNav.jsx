import { NavLink } from "react-router-dom";
import {
  Home,
  PlusCircle,
  List,
  PiggyBank,
  AlertTriangle,
  Wallet,
  CalendarDays,
} from "lucide-react";

const items = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/add", label: "Añadir", Icon: PlusCircle },
  { to: "/movements", label: "Mov.", Icon: List },
  { to: "/huchas", label: "Huchas", Icon: PiggyBank },
  { to: "/imprevisto", label: "Imprev.", Icon: AlertTriangle },
  { to: "/ahorro", label: "Ahorro", Icon: Wallet },
  { to: "/meses", label: "Meses", Icon: CalendarDays },
];

export default function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-50 border-t border-white/10 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto max-w-3xl px-2">
        <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
          {items.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  "flex items-center gap-2 whitespace-nowrap rounded-2xl px-3 py-2 text-sm font-semibold",
                  "border transition",
                  isActive
                    ? "bg-white text-black border-white"
                    : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white",
                ].join(" ")
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
