"use client";
import { useState, useTransition } from "react";
import { Button } from "@onebigtalk/ui";
import { calendarUrl } from "@/app/(app)/find/events/actions";

// "Add to calendar" (S3.5): one subscription link carries every tracked deadline with 14/7/3/1-day alarms.
export function CalendarLink() {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (url) return <p className="t-compact">Calendar feed: <a className="underline break-all" href={url}>{url}</a> <Button size="sm" variant="ghost" onClick={() => navigator.clipboard?.writeText(url)}>Copy</Button><span className="block text-[var(--text-muted)]">Subscribe to it in Google Calendar, Apple Calendar or Outlook. Tracked deadlines appear with reminders at 14, 7, 3 and 1 days.</span></p>;
  return <div><Button size="sm" variant="secondary" loading={pending} onClick={() => start(async () => { const r = await calendarUrl(); if (r.ok && r.data) setUrl(r.data.url); else setErr(r.ok ? null : r.message); })}>Add deadlines to my calendar</Button>{err && <p role="alert" className="t-compact text-[var(--danger-text)]">{err}</p>}</div>;
}
