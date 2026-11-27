import { orderIds } from "@/lib/family/links";
import type {
  ContactInfo,
  ContactType,
  CulturalEvent,
  EventHonoree,
  ParentChild,
  Person,
  Union,
  UnionStatus,
} from "@/lib/family/types";

const stamp = "2024-01-01T00:00:00.000Z";

function person(
  id: string,
  firstName: string,
  lastName: string,
  gender: Person["gender"],
  extra: Partial<Person> = {},
): Person {
  return {
    id,
    firstName,
    lastName,
    gender,
    birthYearOnly: false,
    createdAt: stamp,
    updatedAt: stamp,
    ...extra,
  };
}

function contact(
  id: string,
  personId: string,
  type: ContactType,
  label: string,
  value: string,
  isPrimary = false,
): ContactInfo {
  return { id, personId, type, label, value, isPrimary, createdAt: stamp };
}

function link(parentId: string, childId: string): ParentChild {
  return { id: `l-${parentId}-${childId}`, parentId, childId, type: "BIOLOGICAL" };
}

function union(
  a: string,
  b: string,
  status: UnionStatus,
  startDate?: string,
  endDate?: string,
): Union {
  const [partner1Id, partner2Id] = orderIds(a, b);
  return {
    id: `u-${partner1Id}-${partner2Id}`,
    partner1Id,
    partner2Id,
    status,
    startDate,
    endDate,
  };
}

export const seedPeople: Person[] = [
  person("venkatesh", "Venkatesh", "Iyer", "MALE", {
    birthDate: "1916-01-01",
    birthYearOnly: true,
    deathDate: "1998-03-12",
    bio: "Railway clerk in Tiruchirappalli. The eldest generation in this record.",
  }),
  person("janaki", "Janaki", "Iyer", "FEMALE", {
    maidenName: "Padmanabhan",
    birthDate: "1920-01-01",
    birthYearOnly: true,
    deathDate: "2004-11-02",
    bio: "Remembered for her dawn kolam and a strict four o’clock tiffin.",
  }),
  person("krishnan", "Krishnan", "Iyer", "MALE", {
    birthDate: "1942-08-19",
    deathDate: "2019-01-30",
    bio: "Taught mathematics in Chennai and kept every grandchild’s birthday on a wall calendar.",
  }),
  person("kamala", "Kamala", "Iyer", "FEMALE", {
    maidenName: "Subramanian",
    birthDate: "1946-02-11",
    bio: "Keeps the family kitchen, the address book, and jasmine by the door.",
  }),
  person("lalitha", "Lalitha", "Menon", "FEMALE", {
    maidenName: "Iyer",
    birthDate: "1944-11-03",
    bio: "Moved to Bengaluru after marriage and still writes the new-year letter.",
  }),
  person("arun", "Arun", "Menon", "MALE", {
    birthDate: "1941-07-19",
    bio: "Retired postal supervisor. Tells the train stories Venkatesh started.",
  }),
  person("suresh", "Suresh", "Iyer", "MALE", {
    birthDate: "1970-05-14",
    bio: "Civil engineer. Calls his mother every Friday evening.",
  }),
  person("deepa", "Deepa", "Iyer", "FEMALE", {
    maidenName: "Nair",
    birthDate: "1973-09-08",
    bio: "Pediatric nurse. Keeps the wedding album in the hall cupboard.",
  }),
  person("anitha", "Anitha", "Rao", "FEMALE", {
    maidenName: "Iyer",
    birthDate: "1974-12-01",
    bio: "High-school history teacher in Coimbatore.",
  }),
  person("ravi", "Ravi", "Rao", "MALE", {
    birthDate: "1972-04-22",
    bio: "Architect. Met Anitha at a cousin’s housewarming.",
  }),
  person("nila", "Nila", "Menon", "FEMALE", {
    birthDate: "1976-08-08",
    bio: "Lives in Bengaluru and keeps Lalitha’s recipes in a ruled notebook.",
  }),
  person("rohan", "Rohan", "Iyer", "MALE", {
    birthDate: "2001-07-19",
    bio: "Studies architecture and asks for the old family stories.",
  }),
  person("maya", "Maya", "Iyer", "FEMALE", {
    birthDate: "2004-03-03",
    bio: "In secondary school. Plays violin on Sunday mornings.",
  }),
  person("leela", "Leela", "Rao", "FEMALE", {
    birthDate: "2003-10-11",
    bio: "In secondary school. Writes to her cousins every summer.",
  }),
];

export const seedUnions: Union[] = [
  union("venkatesh", "janaki", "WIDOWED", "1938-05-20", "1998-03-12"),
  union("krishnan", "kamala", "WIDOWED", "1968-06-12", "2019-01-30"),
  union("lalitha", "arun", "MARRIED", "1966-12-02"),
  union("suresh", "deepa", "MARRIED", "1998-01-18"),
  union("anitha", "ravi", "MARRIED", "1999-08-21"),
];

export const seedEvents: CulturalEvent[] = [
  {
    id: "e-upana-suresh",
    title: "Upanayanam",
    category: "TAMIL_RITUAL",
    eventDate: "1982-05-14",
    location: "Tiruchirappalli",
    isAnnualRecurring: false,
    notifyDaysBefore: -1,
  },
  {
    id: "e-ayushya-kamala",
    title: "Ayushya Homam",
    category: "RELIGIOUS",
    eventDate: "2026-12-18",
    location: "Chennai",
    description: "A homam for Kamala’s health, shared with the family.",
    isAnnualRecurring: false,
    notifyDaysBefore: 30,
  },
];

export const seedHonorees: EventHonoree[] = [
  { id: "h-upana-suresh", eventId: "e-upana-suresh", personId: "suresh" },
  { id: "h-ayushya-kamala", eventId: "e-ayushya-kamala", personId: "kamala" },
];

export const seedLinks: ParentChild[] = [
  link("venkatesh", "krishnan"),
  link("janaki", "krishnan"),
  link("venkatesh", "lalitha"),
  link("janaki", "lalitha"),
  link("krishnan", "suresh"),
  link("kamala", "suresh"),
  link("krishnan", "anitha"),
  link("kamala", "anitha"),
  link("suresh", "rohan"),
  link("deepa", "rohan"),
  link("suresh", "maya"),
  link("deepa", "maya"),
  link("anitha", "leela"),
  link("ravi", "leela"),
  link("lalitha", "nila"),
  link("arun", "nila"),
];

export const seedContacts: ContactInfo[] = [
  contact("c-kamala-phone", "kamala", "PHONE", "Mobile", "+91 44 5550 0142", true),
  contact("c-kamala-email", "kamala", "EMAIL", "Home", "kamala.iyer@example.com", true),
  contact(
    "c-kamala-addr",
    "kamala",
    "ADDRESS",
    "India residence",
    "14 Palm Grove\nBesant Nagar\nChennai 600090\nIndia",
    true,
  ),
  contact("c-suresh-phone", "suresh", "PHONE", "Mobile", "+1 415 555 0148", true),
  contact("c-suresh-email", "suresh", "EMAIL", "Work", "suresh.iyer@example.com", true),
  contact("c-deepa-phone", "deepa", "PHONE", "Mobile", "+1 415 555 0166", true),
  contact("c-deepa-email", "deepa", "EMAIL", "Home", "deepa.iyer@example.com", true),
  contact("c-anitha-email", "anitha", "EMAIL", "Home", "anitha.rao@example.com", true),
  contact("c-anitha-phone", "anitha", "PHONE", "Mobile", "+91 422 555 0174", true),
  contact("c-ravi-email", "ravi", "EMAIL", "Work", "ravi.rao@example.com", true),
  contact("c-lalitha-email", "lalitha", "EMAIL", "Home", "lalitha.menon@example.com", true),
  contact("c-nila-phone", "nila", "PHONE", "Mobile", "+91 80 5550 0190", true),
  contact("c-rohan-email", "rohan", "EMAIL", "School", "rohan.iyer@example.com", true),
  contact("c-leela-email", "leela", "EMAIL", "Home", "leela.rao@example.com", true),
];
