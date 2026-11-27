import { format, isValid, parseISO } from "date-fns";
import type { Gender, ParentChildType, Person, UnionStatus } from "@/lib/family/types";

export function fullName(person: Pick<Person, "firstName" | "lastName">): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName.trim()[0] ?? ""}${lastName.trim()[0] ?? ""}`.toUpperCase();
}

export function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

export function formatFullDate(iso: string): string {
  const date = parseISO(iso);
  if (!isValid(date)) return iso;
  return format(date, "d MMM yyyy");
}

export function lifespan(person: Person): string {
  const birth = person.birthDate
    ? person.birthYearOnly
      ? person.birthDate.slice(0, 4)
      : formatFullDate(person.birthDate)
    : null;
  const death = person.deathDate ? formatFullDate(person.deathDate) : null;
  if (birth && death) return `${birth} – ${death}`;
  if (birth) return `Born ${birth}`;
  if (death) return `Died ${death}`;
  return "Dates not recorded";
}

export function cardYears(person: Person): string {
  const birth = person.birthDate?.slice(0, 4);
  const death = person.deathDate?.slice(0, 4);
  if (birth && death) return `${birth}–${death}`;
  if (birth) return `b. ${birth}`;
  if (death) return `d. ${death}`;
  return "Dates unknown";
}

export function genderLabel(gender: Gender): string {
  if (gender === "FEMALE") return "Female";
  if (gender === "MALE") return "Male";
  return "Other";
}

export function statusLabel(status: UnionStatus): string {
  if (status === "MARRIED") return "Married";
  if (status === "DIVORCED") return "Divorced";
  if (status === "WIDOWED") return "Widowed";
  return "Partner";
}

export function parentTypeLabel(type: ParentChildType): string {
  if (type === "ADOPTED") return "Adopted";
  if (type === "STEP") return "Step";
  return "Biological";
}

export function byName(a: Person, b: Person): number {
  return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
}

export function byBirth(a: Person, b: Person): number {
  const ay = a.birthDate ?? "9999";
  const by = b.birthDate ?? "9999";
  return ay.localeCompare(by) || byName(a, b);
}

export function telHref(value: string): string {
  return `tel:${value.replace(/[^\d+]/g, "")}`;
}

export function mailHref(value: string): string {
  return `mailto:${value.trim()}`;
}
