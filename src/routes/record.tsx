import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Pane } from "@/components/shell";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, controlClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { LineageBackup } from "@/lib/family/backup";
import { TIME_ZONES, browserTimeZone, dueReminders, reminderText } from "@/lib/family/mail";
import { getMyReminder, saveMyReminder, sendFamilyMail, type ReminderPrefs } from "@/lib/family/mail.functions";
import { useFamilyStore } from "@/lib/family/store";
import { applyBackup, buildBackup, downloadBackup, readBackupFile } from "@/lib/family/transfer";

export const Route = createFileRoute("/record")({
  head: () => ({ meta: [{ title: "Record · Lineage" }] }),
  component: RecordPage,
});

function RecordPage() {
  const people = useFamilyStore((state) => state.people);
  const unions = useFamilyStore((state) => state.unions);
  const events = useFamilyStore((state) => state.events);
  const honorees = useFamilyStore((state) => state.honorees);
  const photos = useFamilyStore((state) => state.photos);
  const { user } = useCurrentUserState();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<LineageBackup | null>(null);
  const [prefs, setPrefs] = useState<ReminderPrefs | null>(null);

  useEffect(() => {
    if (!user) {
      setPrefs(null);
      return;
    }
    let cancelled = false;
    void getMyReminder()
      .then((next) => {
        if (!cancelled) setPrefs(next.timezone ? next : { ...next, timezone: browserTimeZone() });
      })
      .catch(() => {
        if (!cancelled) setPrefs(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function onExport() {
    setBusy(true);
    setMessage("");
    try {
      downloadBackup(await buildBackup(false));
      setMessage("Backup downloaded.");
    } catch {
      setMessage("The backup could not be prepared.");
    }
    setBusy(false);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setMessage("");
    const result = await readBackupFile(file);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setPending(result.backup);
  }

  async function confirmImport() {
    if (!pending) return;
    setBusy(true);
    const result = await applyBackup(pending, false);
    setBusy(false);
    setPending(null);
    setMessage(result.ok ? "Backup restored on this device." : result.error);
  }

  function update<K extends keyof ReminderPrefs>(key: K, value: ReminderPrefs[K]) {
    setPrefs((current) => (current ? { ...current, [key]: value } : current));
  }

  async function saveSettings() {
    if (!prefs) return;
    setBusy(true);
    setMessage("");
    const result = await saveMyReminder({
      data: {
        enabled: prefs.enabled,
        email: prefs.email,
        leadDays: Number(prefs.leadDays),
        sendTime: prefs.sendTime,
        timezone: prefs.timezone,
      },
    });
    setBusy(false);
    setMessage(result.ok ? "Your reminder settings are saved." : result.error);
  }

  async function send(kind: "test" | "now") {
    if (!prefs) return;
    setBusy(true);
    setMessage("");
    const saved = await saveMyReminder({
      data: {
        enabled: prefs.enabled,
        email: prefs.email,
        leadDays: Number(prefs.leadDays),
        sendTime: prefs.sendTime,
        timezone: prefs.timezone,
      },
    });
    if (!saved.ok) {
      setBusy(false);
      setMessage(saved.error);
      return;
    }
    const items = dueReminders({ people, unions, events, honorees, leadDays: Number(prefs.leadDays) });
    if (kind === "now" && items.length === 0) {
      setBusy(false);
      setMessage("Nothing is due to send.");
      return;
    }
    const body = kind === "test" ? { subject: "Lineage test", text: "This is a test from your family record." } : reminderText(items);
    const result = await sendFamilyMail({ data: { kind, subject: body.subject, text: body.text } });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(kind === "test" ? "Test message sent." : items.length === 1 ? "Sent 1 reminder." : `Sent ${items.length} reminders.`);
  }

  const zones = prefs && !TIME_ZONES.includes(prefs.timezone) ? [prefs.timezone, ...TIME_ZONES] : TIME_ZONES;

  return (
    <Pane>
      <div className="mx-auto grid max-w-3xl gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Record</h1>
          <p className="mt-2 max-w-xl text-pretty text-muted">
            Keep a copy of the family. Each signed-in person chooses when their reminder email arrives.
          </p>
        </div>

        <section className="silk-card rounded-xl border border-line bg-surface p-4 md:p-5">
          <h2 className="font-display text-xl">Backup</h2>
          <p className="mt-2 text-sm text-pretty text-muted">
            {people.length} people · {photos.length} photos. The file includes names, dates, contacts, and photos. It does not include the mail server password.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void onExport()}>
              Download backup
            </Button>
            <label className="inline-flex h-11 cursor-pointer items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium">
              Restore a backup
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  void onFile(file);
                }}
              />
            </label>
          </div>
        </section>

        <section className="silk-card rounded-xl border border-line bg-surface p-4 md:p-5">
          <h2 className="font-display text-xl">Your reminders</h2>
          <SignedOut>
            <p className="mt-2 text-sm text-pretty text-muted">Sign in to choose the address, time, and time zone for your emails.</p>
            <Link to="/login" className={buttonClass("secondary", "mt-4")}>
              Sign in
            </Link>
          </SignedOut>
          {prefs ? (
            <form
              className="mt-4 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void saveSettings();
              }}
            >
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" checked={prefs.enabled} onChange={(event) => update("enabled", event.target.checked)} />
                Email me once a day
              </label>
              <Field label="Send to">
                <input className={controlClass} type="email" value={prefs.email} onChange={(event) => update("email", event.target.value)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Time" hint="In the time zone below.">
                  <input className={controlClass} type="time" value={prefs.sendTime} onChange={(event) => update("sendTime", event.target.value)} />
                </Field>
                <Field label="Time zone">
                  <input className={controlClass} list="lineage-zones" value={prefs.timezone} onChange={(event) => update("timezone", event.target.value)} />
                  <datalist id="lineage-zones">
                    {zones.map((zone) => (
                      <option key={zone} value={zone} />
                    ))}
                  </datalist>
                </Field>
              </div>
              <Field label="Days ahead" hint="Birthdays and anniversaries. Occasions use their own reminder.">
                <input
                  className={controlClass}
                  inputMode="numeric"
                  value={String(prefs.leadDays)}
                  onChange={(event) => update("leadDays", Number(event.target.value))}
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy}>Save</Button>
                <Button type="button" variant="secondary" disabled={busy} onClick={() => void send("test")}>Send test</Button>
                <Button type="button" variant="secondary" disabled={busy} onClick={() => void send("now")}>Send what’s due</Button>
              </div>
              {prefs.isAdmin ? (
                <Link to="/admin" className="text-sm text-accent-strong">
                  Set up the shared mail server
                </Link>
              ) : (
                <p className="text-sm text-muted">An admin sets up the mailbox that these reminders are sent from.</p>
              )}
            </form>
          ) : null}
        </section>

        {message ? <p className="text-sm text-ink">{message}</p> : null}
      </div>

      <Modal
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title="Replace this record?"
        description={
          pending
            ? `This backup has ${pending.people.length === 1 ? "1 person" : `${pending.people.length} people`} and ${pending.photos.length === 1 ? "1 photo" : `${pending.photos.length} photos`}. Everyone currently on this device will be replaced.`
            : "Replace the record on this device."
        }
      >
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setPending(null)}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={() => void confirmImport()}>
            Restore backup
          </Button>
        </div>
      </Modal>
    </Pane>
  );
}
