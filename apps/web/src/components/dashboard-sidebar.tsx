"use client";

import { Clock3, CreditCard, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "History", href: "/history", icon: Clock3 },
  { label: "Account", href: "/account", icon: CreditCard }
];

export function DashboardSidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto border-b bg-card/70 px-4 py-3 backdrop-blur md:min-h-[calc(100vh-73px)] md:flex-col md:overflow-visible md:border-b-0 md:border-r md:px-3 md:py-6">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-all duration-200",
              pathname === item.href
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
