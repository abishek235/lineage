import type {
  ContactInfo,
  CulturalEvent,
  EventHonoree,
  ParentChild,
  Person,
  Photo,
  Union,
} from "@/lib/family/types";
import type { MailSettings } from "@/lib/family/mail";

export interface FamilyRecord {
  people: Person[];
  contacts: ContactInfo[];
  links: ParentChild[];
  unions: Union[];
  photos: Photo[];
  events: CulturalEvent[];
  honorees: EventHonoree[];
}

export interface BackupPhoto extends Photo {
  data?: string;
}

export interface LineageBackup extends FamilyRecord {
  kind: "lineage-backup";
  version: 1;
  exportedAt: string;
  photos: BackupPhoto[];
  mail?: MailSettings;
}

const genders = new Set(["MALE", "FEMALE", "OTHER"]);
const contactTypes = new Set(["EMAIL", "PHONE", "ADDRESS"]);
const linkTypes = new Set(["BIOLOGICAL", "ADOPTED", "STEP"]);
const unionStatuses = new Set(["MARRIED", "DIVORCED", "WIDOWED", "PARTNER"]);
const categories = new Set(["TAMIL_RITUAL", "MILESTONE", "RELIGIOUS", "ACADEMIC", "CUSTOM"]);

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function id(value: unknown): string | undefined {
  const next = text(value, 80);
  if (!next || /\s/.test(next)) return undefined;
  return next;
}

function day(value: unknown): string | undefined {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export function validateBackup(value: unknown): { ok: true; backup: LineageBackup } | { ok: false; error: string } {
  const body = record(value);
  if (!body || body.kind !== "lineage-backup" || body.version !== 1) {
    return { ok: false, error: "This is not a Lineage backup." };
  }
  if (!Array.isArray(body.people)) return { ok: false, error: "This backup has no people." };

  const people: Person[] = [];
  for (const item of body.people) {
    const row = record(item);
    const personId = id(row?.id);
    const firstName = text(row?.firstName, 80);
    const lastName = text(row?.lastName, 80);
    const gender = row?.gender;
    if (!row || !personId || !firstName || !lastName || typeof gender !== "string" || !genders.has(gender)) {
      return { ok: false, error: "A person in this backup is incomplete." };
    }
    people.push({
      id: personId,
      firstName,
      lastName,
      maidenName: text(row.maidenName, 80),
      gender: gender as Person["gender"],
      birthDate: day(row.birthDate),
      birthYearOnly: row.birthYearOnly === true,
      deathDate: day(row.deathDate),
      bio: text(row.bio, 2000),
      createdAt: text(row.createdAt, 40) ?? new Date().toISOString(),
      updatedAt: text(row.updatedAt, 40) ?? new Date().toISOString(),
    });
  }
  const peopleIds = new Set(people.map((person) => person.id));
  if (peopleIds.size !== people.length) return { ok: false, error: "This backup repeats a person." };

  const contacts: ContactInfo[] = [];
  for (const item of Array.isArray(body.contacts) ? body.contacts : []) {
    const row = record(item);
    const contactId = id(row?.id);
    const personId = id(row?.personId);
    const type = row?.type;
    const label = text(row?.label, 80);
    const contactValue = text(row?.value, 500);
    if (!contactId || !personId || !peopleIds.has(personId) || typeof type !== "string" || !contactTypes.has(type) || !label || !contactValue) {
      continue;
    }
    contacts.push({
      id: contactId,
      personId,
      type: type as ContactInfo["type"],
      label,
      value: contactValue,
      isPrimary: row?.isPrimary === true,
      createdAt: text(row?.createdAt, 40) ?? new Date().toISOString(),
    });
  }

  const links: ParentChild[] = [];
  for (const item of Array.isArray(body.links) ? body.links : []) {
    const row = record(item);
    const linkId = id(row?.id);
    const parentId = id(row?.parentId);
    const childId = id(row?.childId);
    const type = row?.type;
    if (!linkId || !parentId || !childId || parentId === childId || !peopleIds.has(parentId) || !peopleIds.has(childId)) continue;
    if (typeof type !== "string" || !linkTypes.has(type)) continue;
    links.push({ id: linkId, parentId, childId, type: type as ParentChild["type"] });
  }

  const unions: Union[] = [];
  for (const item of Array.isArray(body.unions) ? body.unions : []) {
    const row = record(item);
    const unionId = id(row?.id);
    const partner1Id = id(row?.partner1Id);
    const partner2Id = id(row?.partner2Id);
    const status = row?.status;
    if (!unionId || !partner1Id || !partner2Id || partner1Id === partner2Id) continue;
    if (!peopleIds.has(partner1Id) || !peopleIds.has(partner2Id)) continue;
    if (typeof status !== "string" || !unionStatuses.has(status)) continue;
    unions.push({
      id: unionId,
      partner1Id,
      partner2Id,
      status: status as Union["status"],
      startDate: day(row?.startDate),
      endDate: day(row?.endDate),
    });
  }
  const unionIds = new Set(unions.map((union) => union.id));

  const events: CulturalEvent[] = [];
  for (const item of Array.isArray(body.events) ? body.events : []) {
    const row = record(item);
    const eventId = id(row?.id);
    const title = text(row?.title, 80);
    const category = row?.category;
    const eventDate = day(row?.eventDate);
    if (!eventId || !title || !eventDate || typeof category !== "string" || !categories.has(category)) continue;
    const notify = Number(row?.notifyDaysBefore);
    const unionId = id(row?.unionId);
    events.push({
      id: eventId,
      title,
      category: category as CulturalEvent["category"],
      eventDate,
      location: text(row?.location, 120),
      description: text(row?.description, 2000),
      isAnnualRecurring: row?.isAnnualRecurring === true,
      notifyDaysBefore: Number.isInteger(notify) && notify >= -1 && notify <= 365 ? notify : 30,
      unionId: unionId && unionIds.has(unionId) ? unionId : undefined,
    });
  }
  const eventIds = new Set(events.map((event) => event.id));

  const honorees: EventHonoree[] = [];
  for (const item of Array.isArray(body.honorees) ? body.honorees : []) {
    const row = record(item);
    const honoreeId = id(row?.id);
    const eventId = id(row?.eventId);
    const personId = id(row?.personId);
    if (!honoreeId || !eventId || !personId || !eventIds.has(eventId) || !peopleIds.has(personId)) continue;
    honorees.push({ id: honoreeId, eventId, personId });
  }

  const photos: BackupPhoto[] = [];
  for (const item of Array.isArray(body.photos) ? body.photos : []) {
    const row = record(item);
    const photoId = id(row?.id);
    if (!photoId) continue;
    const personId = id(row?.personId);
    const unionId = id(row?.unionId);
    const eventId = id(row?.eventId);
    const owner = personId && peopleIds.has(personId)
      ? { personId }
      : unionId && unionIds.has(unionId)
        ? { unionId }
        : eventId && eventIds.has(eventId)
          ? { eventId }
          : null;
    if (!owner) continue;
    const data = typeof row?.data === "string" && row.data.length > 0 && row.data.length < 2_000_000 ? row.data : undefined;
    photos.push({
      id: photoId,
      caption: text(row?.caption, 120),
      isPrimary: row?.isPrimary === true && "personId" in owner,
      ...owner,
      createdAt: text(row?.createdAt, 40) ?? new Date().toISOString(),
      data,
    });
    if (photos.length > 80) return { ok: false, error: "This backup has too many photos." };
  }

  let mail: MailSettings | undefined;
  const mailRow = record(body.mail);
  if (mailRow && text(mailRow.to, 120) && text(mailRow.host, 200)) {
    mail = {
      enabled: mailRow.enabled === true,
      to: text(mailRow.to, 120) ?? "",
      leadDays: clampLead(mailRow.leadDays),
      host: text(mailRow.host, 200) ?? "",
      port: clampPort(mailRow.port),
      secure: mailRow.secure === true,
      user: text(mailRow.user, 200) ?? "",
      password: text(mailRow.password, 200) ?? "",
      from: text(mailRow.from, 200) ?? "",
    };
  }

  return {
    ok: true,
    backup: {
      kind: "lineage-backup",
      version: 1,
      exportedAt: text(body.exportedAt, 40) ?? new Date().toISOString(),
      people,
      contacts,
      links,
      unions,
      events,
      honorees,
      photos,
      mail,
    },
  };
}

function clampLead(value: unknown): number {
  const lead = Number(value);
  if (!Number.isInteger(lead) || lead < 0 || lead > 60) return 7;
  return lead;
}

function clampPort(value: unknown): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return 587;
  return port;
}
