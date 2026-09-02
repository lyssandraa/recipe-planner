"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBasket,
  IconBook2,
  IconCalendarWeek,
  IconChefHat,
  IconHome,
  IconScan,
  IconShoppingBag,
} from "@tabler/icons-react";

const links = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/recipes", label: "Recipes", icon: IconBook2 },
  { href: "/planner", label: "Planner", icon: IconCalendarWeek },
  { href: "/pantry", label: "Pantry", icon: IconBasket },
  { href: "/scan", label: "Scan", icon: IconScan },
  { href: "/what-can-i-make", label: "Cook", icon: IconChefHat },
  { href: "/shopping-list", label: "Shop", icon: IconShoppingBag },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-10 w-full max-w-[420px] -translate-x-1/2 border-t-[3px] border-green-deep bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {links.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 ${
                active ? "text-green-deep" : "text-nav-inactive"
              }`}
            >
              <Icon size={22} stroke={active ? 2 : 1.75} />
              <span className="text-[9px] font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
