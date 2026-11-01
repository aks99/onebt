"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@onebigtalk/ui";
import { ExistingApplicationForm } from "@/components/onboarding/Steps";

// "Log an application I already sent" from the board (F1.3.1 v1.5). Same quick form as onboarding and the Journey.
export function LogExisting({ talkId, open }: { talkId: string; open?: boolean }) {
  const [show, setShow] = useState(!!open);
  const router = useRouter();
  if (!show) return <div><Button size="sm" variant="secondary" onClick={() => setShow(true)}>Log an application I sent</Button></div>;
  return <ExistingApplicationForm talkId={talkId} onDone={() => { setShow(false); router.refresh(); }} />;
}
