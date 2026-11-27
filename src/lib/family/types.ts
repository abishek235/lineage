export type Gender = "MALE" | "FEMALE" | "OTHER";

export type ContactType = "EMAIL" | "PHONE" | "ADDRESS";

export type ParentChildType = "BIOLOGICAL" | "ADOPTED" | "STEP";

export type UnionStatus = "MARRIED" | "DIVORCED" | "WIDOWED" | "PARTNER";

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  maidenName?: string;
  gender: Gender;
  birthDate?: string;
  birthYearOnly: boolean;
  deathDate?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactInfo {
  id: string;
  personId: string;
  type: ContactType;
  label: string;
  value: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface ParentChild {
  id: string;
  parentId: string;
  childId: string;
  type: ParentChildType;
}

export interface Union {
  id: string;
  partner1Id: string;
  partner2Id: string;
  status: UnionStatus;
  startDate?: string;
  endDate?: string;
}

export type EventCategory = "TAMIL_RITUAL" | "MILESTONE" | "RELIGIOUS" | "ACADEMIC" | "CUSTOM";

export interface CulturalEvent {
  id: string;
  title: string;
  category: EventCategory;
  eventDate: string;
  location?: string;
  description?: string;
  isAnnualRecurring: boolean;
  notifyDaysBefore: number;
  unionId?: string;
}

export interface EventHonoree {
  id: string;
  eventId: string;
  personId: string;
}

export interface EventInput {
  title: string;
  category: EventCategory;
  eventDate: string;
  location?: string;
  description?: string;
  isAnnualRecurring: boolean;
  notifyDaysBefore: number;
  unionId?: string;
  honoreeIds: string[];
}

export interface Photo {
  id: string;
  caption?: string;
  isPrimary: boolean;
  personId?: string;
  unionId?: string;
  eventId?: string;
  createdAt: string;
}

export interface PersonInput {
  firstName: string;
  lastName: string;
  maidenName?: string;
  gender: Gender | "";
  birthDate?: string;
  birthYearOnly: boolean;
  deathDate?: string;
  bio?: string;
}

export interface ContactInput {
  personId: string;
  type: ContactType;
  label: string;
  value: string;
  isPrimary: boolean;
}

export type ActionResult = { ok: true } | { ok: false; error: string };
