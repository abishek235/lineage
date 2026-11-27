import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Pane } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Field, controlClass } from "@/components/ui/field";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMyReminder, getSmtpSettings, saveSmtpSettings, sendFamilyMail } from "@/lib/family/mail.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · Lineage" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user, isPending } = useCurrentUserState();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [secure, setSecure] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [from, setFrom] = useState("");
  const [passwordSet, setPasswordSet] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void getMyReminder()
      .then(async (prefs) => {
        if (cancelled) return;
        setAllowed(prefs.isAdmin);
        if (!prefs.isAdmin) return;
        const smtp = await getSmtpSettings();
        if (cancelled || !smtp.ok) return;
        setHost(smtp.smtp.host);
        setPort(String(smtp.smtp.port));
        setSecure(smtp.smtp.secure);
        setUsername(smtp.smtp.username);
        setFrom(smtp.smtp.from);
        setPasswordSet(smtp.smtp.passwordSet);
      })
      .catch(() => {
        if (!cancelled) setAllowed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (isPending || (user && allowed === null)) return null;
  if (!user) return <RedirectToSignIn />;
  if (!allowed) {
    return (
      <Pane>
        <div className="mx-auto max-w-xl">
          <h1 className="font-display text-3xl tracking-tight">Admin</h1>
          <p className="mt-2 text-sm text-muted">Only an admin can change the mail server.</p>
          <Link to="/record" className="mt-4 inline-flex text-sm text-accent-strong">
            Back to your reminders
          </Link>
        </div>
      </Pane>
    );
  }

  async function save() {
    setBusy(true);
    setMessage("");
    const result = await saveSmtpSettings({
      data: { host, port: Number(port), secure, username, password, from },
    });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    if (password) setPasswordSet(true);
    setPassword("");
    setMessage("Mail server saved.");
  }

  async function test() {
    setBusy(true);
    setMessage("");
    const result = await sendFamilyMail({
      data: { kind: "test", subject: "Lineage test", text: "This is a test from the Lineage admin." },
    });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage("Test message sent to your reminder address.");
  }

  return (
    <Pane>
      <div className="mx-auto grid max-w-xl gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Mail server</h1>
          <p className="mt-2 text-sm text-pretty text-muted">
            This mailbox sends every person’s reminders. The password is kept on the server and is not shown again.
          </p>
        </div>
        <form
          className="silk-card grid gap-4 rounded-xl border border-line bg-surface p-4 md:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mail server">
              <input className={controlClass} value={host} onChange={(event) => setHost(event.target.value)} placeholder="smtp.example.com" />
            </Field>
            <Field label="Port">
              <input className={controlClass} inputMode="numeric" value={port} onChange={(event) => setPort(event.target.value)} />
            </Field>
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" checked={secure} onChange={(event) => setSecure(event.target.checked)} />
            Use a secure connection (usually port 465)
          </label>
          <Field label="Username">
            <input className={controlClass} autoComplete="off" value={username} onChange={(event) => setUsername(event.target.value)} />
          </Field>
          <Field label="Password" hint={passwordSet ? "A password is saved. Leave this blank to keep it." : "Required the first time."}>
            <input className={controlClass} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          <Field label="From" hint="Optional. Defaults to the username.">
            <input className={controlClass} value={from} onChange={(event) => setFrom(event.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>Save</Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void test()}>Send test</Button>
          </div>
          {message ? <p className="text-sm text-ink">{message}</p> : null}
        </form>
        <Link to="/record" className="text-sm text-muted">
          Back to your reminders
        </Link>
      </div>
    </Pane>
  );
}
