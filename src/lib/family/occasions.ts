import { fullName, formatFullDate } from "@/lib/family/format";
import type {
  CulturalEvent,
  EventCategory,
  EventHonoree,
  Person,
  Union,
} from "@/lib/family/types";

export const MILESTONE_AGES = [1, 16, 18, 25, 50, 60, 70, 80];

export const EVENT_PRESETS: Array<{ title: string; category: EventCategory }> = [
  { title: "Sashtiabdapoorthi", category: "TAMIL_RITUAL" },
  { title: "Bhimaratha Shanthi", category: "TAMIL_RITUAL" },
  { title: "Sathabhishekam", category: "TAMIL_RITUAL" },
  { title: "Ayushya Homam", category: "RELIGIOUS" },
  { title: "Upanayanam", category: "TAMIL_RITUAL" },
  { title: "Baptism", category: "RELIGIOUS" },
  { title: "Graduation", category: "ACADEMIC" },
  { title: "Housewarming", category: "MILESTONE" },
  { title: "Shraddha / Memorial", category: "RELIGIOUS" },
  { title: "Custom", category: "CUSTOM" },
];

export function categoryLabel(category: EventCategory): string {
  if (category === "TAMIL_RITUAL") return "Tamil ritual";
  if (category === "MILESTONE") return "Milestone";
  if (category === "RELIGIOUS") return "Religious";
  if (category === "ACADEMIC") return "Academic";
  return "Custom";
}

export function todayIso(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function daysUntil(fromIso: string, toIso: string): number {
  const from = Date.UTC(Number(fromIso.slice(0, 4)), Number(fromIso.slice(5, 7)) - 1, Number(fromIso.slice(8, 10)));
  const to = Date.UTC(Number(toIso.slice(0, 4)), Number(toIso.slice(5, 7)) - 1, Number(toIso.slice(8, 10)));
  return Math.round((to - from) / 86400000);
}

export function nextOnCalendar(monthDay: string, today: string): string | null {
  if (!/^\d{2}-\d{2}$/.test(monthDay)) return null;
  const year = Number(today.slice(0, 4));
  const thisYear = `${year}-${monthDay}`;
  if (thisYear >= today) return thisYear;
  return `${year + 1}-${monthDay}`;
}

export type UpcomingKind = "birthday" | "anniversary" | "event";

export interface UpcomingItem {
  id: string;
  kind: UpcomingKind;
  date: string;
  days: number;
  title: string;
  detail: string;
  personId?: string;
  eventId?: string;
  milestone?: string;
}

export function upcomingItems(input: {
  people: Person[];
  unions: Union[];
  events: CulturalEvent[];
  honorees: EventHonoree[];
  today?: string;
  withinDays?: number;
}): UpcomingItem[] {
  const today = input.today ?? todayIso();
  const within = input.withinDays ?? 60;
  const byId = new Map(input.people.map((person) => [person.id, person]));
  const items: UpcomingItem[] = [];

  for (const person of input.people) {
    if (!person.birthDate || person.deathDate) continue;
    const next = nextOnCalendar(person.birthDate.slice(5), today);
    if (!next) continue;
    const days = daysUntil(today, next);
    if (days < 0 || days > within) continue;
    const age = Number(next.slice(0, 4)) - Number(person.birthDate.slice(0, 4));
    const milestone = MILESTONE_AGES.includes(age) ? `Turns ${age}` : undefined;
    items.push({
      id: `bday-${person.id}-${next}`,
      kind: "birthday",
      date: next,
      days,
      title: fullName(person),
      detail: `Birthday · turns ${age}`,
      personId: person.id,
      milestone,
    });
  }

  for (const union of input.unions) {
    if (!union.startDate || (union.status !== "MARRIED" && union.status !== "PARTNER")) continue;
    const next = nextOnCalendar(union.startDate.slice(5), today);
    if (!next) continue;
    const days = daysUntil(today, next);
    if (days < 0 || days > within) continue;
    const left = byId.get(union.partner1Id);
    const right = byId.get(union.partner2Id);
    if (!left || !right) continue;
    const years = Number(next.slice(0, 4)) - Number(union.startDate.slice(0, 4));
    items.push({
      id: `ann-${union.id}-${next}`,
      kind: "anniversary",
      date: next,
      days,
      title: `${fullName(left)} & ${fullName(right)}`,
      detail: years > 0 ? `Anniversary · ${years} years` : "Anniversary",
    });
  }

  for (const event of input.events) {
    const next = event.isAnnualRecurring ? nextOnCalendar(event.eventDate.slice(5), today) : event.eventDate;
    if (!next || next < today) continue;
    const days = daysUntil(today, next);
    if (days < 0 || days > within) continue;
    const names = input.honorees
      .filter((honoree) => honoree.eventId === event.id)
      .map((honoree) => byId.get(honoree.personId))
      .filter((person): person is Person => Boolean(person))
      .map((person) => fullName(person));
    items.push({
      id: `event-${event.id}-${next}`,
      kind: "event",
      date: next,
      days,
      title: event.title,
      detail: names.length > 0 ? names.join(", ") : categoryLabel(event.category),
      eventId: event.id,
    });
  }

  return items.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export interface TimelineEntry {
  id: string;
  date?: string;
  label: string;
  title: string;
  detail?: string;
}

export function lifeTimeline(input: {
  person: Person;
  people: Person[];
  unions: Union[];
  events: CulturalEvent[];
  honorees: EventHonoree[];
}): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  if (input.person.birthDate) {
    entries.push({
      id: `birth-${input.person.id}`,
      date: input.person.birthDate,
      label: input.person.birthYearOnly ? input.person.birthDate.slice(0, 4) : formatFullDate(input.person.birthDate),
      title: "Born",
    });
  }
  const byId = new Map(input.people.map((person) => [person.id, person]));
  for (const union of input.unions) {
    if (union.partner1Id !== input.person.id && union.partner2Id !== input.person.id) continue;
    const otherId = union.partner1Id === input.person.id ? union.partner2Id : union.partner1Id;
    const other = byId.get(otherId);
    const status =
      union.status === "MARRIED"
        ? "Married"
        : union.status === "PARTNER"
          ? "Partnership with"
          : union.status === "DIVORCED"
            ? "Marriage ended with"
            : "Widowed, with";
    entries.push({
      id: `union-${union.id}`,
      date: union.startDate,
      label: union.startDate ? formatFullDate(union.startDate) : "Date not recorded",
      title: other ? `${status} ${fullName(other)}` : status,
    });
  }
  for (const honoree of input.honorees) {
    if (honoree.personId !== input.person.id) continue;
    const event = input.events.find((item) => item.id === honoree.eventId);
    if (!event) continue;
    const others = input.honorees
      .filter((item) => item.eventId === event.id && item.personId !== input.person.id)
      .map((item) => byId.get(item.personId))
      .filter((person): person is Person => Boolean(person))
      .map((person) => fullName(person));
    entries.push({
      id: `event-${event.id}`,
      date: event.eventDate,
      label: formatFullDate(event.eventDate),
      title: event.title,
      detail: [event.location, others.length > 0 ? `With ${others.join(", ")}` : ""]
        .filter(Boolean)
        .join(" · "),
    });
  }
  if (input.person.deathDate) {
    entries.push({
      id: `death-${input.person.id}`,
      date: input.person.deathDate,
      label: formatFullDate(input.person.deathDate),
      title: "Died",
    });
  }
  return entries.sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));
}
