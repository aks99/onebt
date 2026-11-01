import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { currentUser } from "@/lib/supabase/server";
import { currentTalk } from "@/lib/talks";
import { currentRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

// Every member screen sits inside the shell (rail on desktop, tabs on phones). A member with no Talk Record
// yet is sent to onboarding, which creates one. Curators and admins may have no talk; they still get the shell.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const talk = await currentTalk(user.id);
  const r = await currentRole();
  const staff = !!r && (r.role === "curator" || r.role === "admin");
  if (!talk && !staff) redirect("/onboarding");
  return <AppShell talkTitle={talk?.title ?? null} staff={staff || undefined} admin={r?.role === "admin" || undefined}>{children}</AppShell>;
}
