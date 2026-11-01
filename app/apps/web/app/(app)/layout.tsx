import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { currentUser } from "@/lib/supabase/server";
import { currentTalk } from "@/lib/talks";

export const dynamic = "force-dynamic";

// Every member screen sits inside the shell (rail on desktop, tabs on phones). A member with no Talk Record
// yet is sent to onboarding, which creates one.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const talk = await currentTalk(user.id);
  if (!talk) redirect("/onboarding");
  return <AppShell talkTitle={talk.title}>{children}</AppShell>;
}
