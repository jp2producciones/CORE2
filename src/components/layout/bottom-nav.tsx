"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ClipboardList, Bell, BarChart3 } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/buscar", label: "Buscar", icon: Search },
  { href: "/pendientes", label: "Pendientes", icon: ClipboardList },
  { href: "/alertas", label: "Alertas", icon: Bell },
  { href: "/dashboard", label: "KPIs", icon: BarChart3 },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [badge, setBadge] = useState(0);

  // Polling de notificaciones cada 60s para badge
  useEffect(() => {
    const fetchBadge = async () => {
      try {
        const res = await fetch("/api/notificaciones?limit=1");
        if (res.ok) {
          const data = await res.json();
          setBadge(data.noLeidas || 0);
        }
      } catch {
        // silencioso
      }
    };

    fetchBadge();
    const interval = setInterval(fetchBadge, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 flex h-16 w-full max-w-md -translate-x-1/2 items-center justify-around border-t border-gray-200 bg-white">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex flex-col items-center gap-0.5"
          >
            <div className="relative">
              <item.icon
                size={22}
                strokeWidth={isActive ? 2.25 : 1.75}
                className={isActive ? "text-[#111]" : "text-gray-400"}
              />
              {/* Badge en Alertas */}
              {item.href === "/alertas" && badge > 0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </div>
            {isActive && (
              <span className="text-[10px] font-semibold text-[#111]">
                {item.label}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
