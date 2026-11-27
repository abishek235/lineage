import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { dueReminders, minutesOf, reminderText, zonedNow } from "@/lib/family/mail";
import { getMyReminder, sendFamilyMail } from "@/lib/family/mail.functions";
import { useFamilyStore } from "@/lib/family/store";

export function ReminderRunner() {
  const { user } = useCurrentUserState();
  const people = useFamilyStore((state) => state.people);
  const unions = useFamilyStore((state) => state.unions);
  const events = useFamilyStore((state) => state.events);
  const honorees = useFamilyStore((state) => state.honorees);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (useFamilyStore.persist.hasHydrated()) setReady(true);
    return useFamilyStore.persist.onFinishHydration(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    let timer = 0;
    void getMyReminder()
      .then((prefs) => {
        if (cancelled || !prefs.enabled) return;
        const zone = zonedNow(prefs.timezone);
        if (!zone) return;
        const items = dueReminders({ people, unions, events, honorees, leadDays: prefs.leadDays, today: zone.date });
        if (items.length === 0 || prefs.lastSentOn === zone.date) return;
        const message = reminderText(items);
        const wait = Math.max(0, minutesOf(prefs.sendTime) - zone.minutes) * 60_000;
        timer = window.setTimeout(() => {
          if (cancelled) return;
          void sendFamilyMail({ data: { kind: "due", subject: message.subject, text: message.text } });
        }, wait);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [ready, user?.id, people, unions, events, honorees]);

  return null;
}
