import { upcomingItems, type UpcomingItem } from "@/lib/family/occasions";
import { todayIso } from "@/lib/family/occasions";
import type { CulturalEvent, EventHonoree, Person, Union } from "@/lib/family/types";

export interface MailSettings {
  enabled: boolean;
  to: string;
  leadDays: number;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  lastSentOn?: string;
  lastDigest?: string;
}

export const defaultMail: MailSettings = {
  enabled: false,
  to: "",
  leadDays: 7,
  host: "",
  port: 587,
  secure: false,
  user: "",
  password: "",
  from: "",
};

const KEY = "lineage-mail-v1";

export function loadMail(): MailSettings {
  if (typeof localStorage === "undefined") return defaultMail;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultMail;
    const parsed = JSON.parse(raw) as Partial<MailSettings>;
    const lead = Number(parsed.leadDays);
    const port = Number(parsed.port);
    return {
      ...defaultMail,
      ...parsed,
      leadDays: Number.isInteger(lead) && lead >= 0 && lead <= 60 ? lead : defaultMail.leadDays,
      port: Number.isInteger(port) && port >= 1 && port <= 65535 ? port : defaultMail.port,
    };
  } catch {
    return defaultMail;
  }
}

export function saveMail(settings: MailSettings): void {
  localStorage.setItem(KEY, JSON.stringify(settings));
}

export function zonedNow(timeZone: string, now = new Date()): { date: string; minutes: number } | null {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(now)
        .map((part) => [part.type, part.value]),
    );
    let hour = Number(parts.hour);
    if (hour === 24) hour = 0;
    const minute = Number(parts.minute);
    if (!parts.year || !parts.month || !parts.day || Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: hour * 60 + minute };
  } catch {
    return null;
  }
}

export function isValidTimeZone(timeZone: string): boolean {
  return zonedNow(timeZone) !== null;
}

export function isSendTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function minutesOf(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export const TIME_ZONES = [
  "Asia/Kolkata",
  "Asia/Colombo",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Pacific/Auckland",
  "UTC",
];

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  } catch {
    return "Asia/Kolkata";
  }
}

export function dueReminders(input: {
  people: Person[];
  unions: Union[];
  events: CulturalEvent[];
  honorees: EventHonoree[];
  leadDays: number;
  today?: string;
}): UpcomingItem[] {
  const today = input.today ?? todayIso();
  const items = upcomingItems({ ...input, today, withinDays: 366 });
  const events = new Map(input.events.map((event) => [event.id, event]));
  return items.filter((item) => {
    if (item.kind !== "event") return item.days <= input.leadDays;
    const event = item.eventId ? events.get(item.eventId) : undefined;
    if (!event || event.notifyDaysBefore < 0) return false;
    return item.days <= event.notifyDaysBefore;
  });
}

export function reminderText(items: UpcomingItem[]): { subject: string; text: string } {
  const lines = items.map((item) => {
    const when = item.days === 0 ? "Today" : item.days === 1 ? "Tomorrow" : `In ${item.days} days`;
    return `${when} · ${item.date}\n${item.title}\n${item.detail}`;
  });
  const count = items.length;
  return {
    subject: count === 1 ? "Lineage · 1 reminder" : `Lineage · ${count} reminders`,
    text: `Coming up in the family record.\n\n${lines.join("\n\n")}`,
  };
}

export interface MailStatus {
  tone: "idle" | "sent" | "error";
  text: string;
}

let status: MailStatus = { tone: "idle", text: "" };
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function setMailStatus(next: MailStatus): void {
  status = next;
  emit();
}

export function getMailStatus(): MailStatus {
  return status;
}

export function subscribeMail(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
