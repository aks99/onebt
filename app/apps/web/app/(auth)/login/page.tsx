import { PRODUCT_NAME } from "@/lib/product";
import { sendMagicLink } from "./actions";
import { Button } from "@onebigtalk/ui";

// S0.4 Log in or start free. Passwordless. Same message whether or not the address exists.
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sent?: string; next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="t-page-title mb-2">Log in or start free</h1>
      <p className="t-compact text-[var(--text-secondary)] mb-6">No password. The link lasts 15 minutes. Three days of {PRODUCT_NAME} on us, no card, one idea and three events.</p>
      {sp.sent ? (
        <div role="status" className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
          <p className="t-body">Check {sp.sent}. If the address is right, a link is on its way.</p>
          <form action={sendMagicLink} className="mt-3"><input type="hidden" name="email" value={sp.sent} /><input type="hidden" name="next" value={sp.next ?? ""} /><Button variant="ghost" size="sm" type="submit">Resend</Button></form>
        </div>
      ) : (
        <form action={sendMagicLink} className="flex flex-col gap-3">
          <label className="t-label" htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 py-2 t-body" />
          <input type="hidden" name="next" value={sp.next ?? ""} />
          <Button type="submit">Send me a link</Button>
          {sp.error && <p role="alert" className="t-compact text-[var(--danger-text)]">That did not work. Try again in a minute.</p>}
        </form>
      )}
    </main>
  );
}
