"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface StudioNavLinkProps {
  href: string;
  label: string;
}

export default function StudioNavLink({ href, label }: StudioNavLinkProps) {
  const pathname = usePathname();
  const isActive = href === "/studio" ? pathname === "/studio" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "bg-brand-50 dark:bg-violet-950 text-brand dark:text-violet-300"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
      }`}
    >
      {label}
    </Link>
  );
}
