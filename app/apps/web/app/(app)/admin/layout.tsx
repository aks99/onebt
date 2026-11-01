import Link from "next/link";
import { requireAdmin } from "@/lib/roles";
import { AdminNav } from "@/components/admin/AdminNav";

// Admin area (9.5): seven screens behind the admin role. Desktop-first; every table scrolls inside its own
// container on a phone so the page never scrolls sideways. No member content is shown here, only counts and dates.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="t-page-title">Admin</h1>
        <Link href="/curate" className="t-compact underline">Curator Console</Link>
      </div>
      <AdminNav />
      {children}
    </div>
  );
}
