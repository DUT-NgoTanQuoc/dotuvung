"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpenText, History, Paintbrush, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/vocabulary-sets", label: "Bộ từ vựng", icon: BookOpenText, exact: false },
  { href: "/admin/exam-schedules", label: "Lịch thi", icon: CalendarClock, exact: false },
  { href: "/admin/attempts", label: "Lịch sử", icon: History, exact: false },
  { href: "/admin/settings/theme", label: "Giao diện", icon: Paintbrush, exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 text-sm font-medium">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-text-secondary hover:bg-surface hover:text-text"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
