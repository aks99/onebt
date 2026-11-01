"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@onebigtalk/ui";

const ITEMS = [["/admin", "Home"], ["/admin/members", "Access and members"], ["/admin/ai", "AI settings"], ["/admin/reports", "Reports"], ["/admin/billing", "Billing"], ["/admin/audit", "Audit"]] as const;
export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin sections" className="flex flex-wrap gap-1 border-b border-[var(--border-subtle)] pb-2">
      {ITEMS.map(([href, label]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined} className={cx("inline-flex min-h-11 items-center rounded-[var(--radius)] px-3 t-compact", path === href ? "bg-[var(--surface-2)] font-medium" : "hover:bg-[var(--surface-2)]")}>{label}</Link>)}
    </nav>
  );
}
