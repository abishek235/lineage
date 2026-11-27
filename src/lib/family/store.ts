import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect } from "react";
import {
  orderIds,
  validateParentLink,
  validatePersonDates,
  validateUnion,
  validateUnionDates,
} from "@/lib/family/links";
import { forgetPhotos, compressImage, photoFileError, putPhotoBlob } from "@/lib/family/photos";
import { seedContacts, seedEvents, seedHonorees, seedLinks, seedPeople, seedUnions } from "@/lib/family/seed";
import type {
  ActionResult,
  ContactInfo,
  ContactInput,
  CulturalEvent,
  EventHonoree,
  EventInput,
  ParentChildType,
  Person,
  PersonInput,
  Photo,
  UnionStatus,
} from "@/lib/family/types";

interface FamilyState {
  people: Person[];
  contacts: ContactInfo[];
  links: import("@/lib/family/types").ParentChild[];
  unions: import("@/lib/family/types").Union[];
  photos: Photo[];
  events: CulturalEvent[];
  honorees: EventHonoree[];
  addPerson: (input: PersonInput) => ActionResult;
  updatePerson: (id: string, input: PersonInput) => ActionResult;
  deletePerson: (id: string) => void;
  saveContact: (input: ContactInput, contactId?: string) => ActionResult;
  deleteContact: (id: string) => void;
  addLink: (parentId: string, childId: string, type: ParentChildType) => ActionResult;
  deleteLink: (id: string) => void;
  addUnion: (
    a: string,
    b: string,
    status: UnionStatus,
    startDate?: string,
    endDate?: string,
  ) => ActionResult;
  updateUnion: (
    id: string,
    patch: { status: UnionStatus; startDate?: string; endDate?: string },
  ) => ActionResult;
  deleteUnion: (id: string) => void;
  addPhoto: (file: File, owner: { personId?: string; unionId?: string; eventId?: string }) => Promise<ActionResult>;
  setPhotoCaption: (id: string, caption: string) => void;
  setPrimaryPhoto: (id: string) => void;
  deletePhoto: (id: string) => void;
  saveEvent: (input: EventInput, eventId?: string) => ActionResult;
  deleteEvent: (id: string) => void;
  replaceRecord: (record: import("@/lib/family/backup").FamilyRecord) => void;
  restoreSample: () => void;
}

function uid(): string {
  return crypto.randomUUID();
}

function clean(value: string | undefined, max: number): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function normalizePerson(input: PersonInput): { value: Omit<Person, "id" | "createdAt" | "updatedAt"> } | { error: string } {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName) return { error: "Enter a first name." };
  if (!lastName) return { error: "Enter a last name." };
  if (input.gender !== "MALE" && input.gender !== "FEMALE" && input.gender !== "OTHER") {
    return { error: "Choose a gender." };
  }
  const birthDate = clean(input.birthDate, 10);
  const deathDate = clean(input.deathDate, 10);
  if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return { error: "Birth date is invalid." };
  if (deathDate && !/^\d{4}-\d{2}-\d{2}$/.test(deathDate)) return { error: "Death date is invalid." };
  const dateError = validatePersonDates(birthDate, deathDate, input.birthYearOnly);
  if (dateError) return { error: dateError };
  return {
    value: {
      firstName: firstName.slice(0, 60),
      lastName: lastName.slice(0, 60),
      maidenName: clean(input.maidenName, 60),
      gender: input.gender,
      birthDate,
      birthYearOnly: Boolean(birthDate && input.birthYearOnly),
      deathDate,
      bio: clean(input.bio, 2000),
    },
  };
}

function photoTarget(owner: { personId?: string; unionId?: string; eventId?: string }) {
  if (owner.personId) return { personId: owner.personId };
  if (owner.unionId) return { unionId: owner.unionId };
  if (owner.eventId) return { eventId: owner.eventId };
  return null;
}

function samePhotoTarget(photo: Photo, target: { personId?: string; unionId?: string; eventId?: string }) {
  if (target.personId) return photo.personId === target.personId;
  if (target.unionId) return photo.unionId === target.unionId;
  return photo.eventId === target.eventId;
}

function normalizeEvent(input: EventInput, peopleIds: Set<string>, unionIds: Set<string>): { value: Omit<CulturalEvent, "id">; honoreeIds: string[] } | { error: string } {
  const title = input.title.trim();
  if (!title) return { error: "Enter a title." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.eventDate)) return { error: "Enter the date." };
  const honoreeIds = [...new Set(input.honoreeIds)].filter((id) => peopleIds.has(id));
  if (honoreeIds.length === 0) return { error: "Choose at least one person." };
  if (input.unionId && !unionIds.has(input.unionId)) return { error: "That partnership is no longer in the record." };
  const notify = Number(input.notifyDaysBefore);
  if (!Number.isInteger(notify) || notify < -1 || notify > 365) {
    return { error: "Reminder days must be from -1 to 365." };
  }
  return {
    value: {
      title: title.slice(0, 80),
      category: input.category,
      eventDate: input.eventDate,
      location: clean(input.location, 120),
      description: clean(input.description, 2000),
      isAnnualRecurring: input.isAnnualRecurring,
      notifyDaysBefore: notify,
      unionId: input.unionId || undefined,
    },
    honoreeIds,
  };
}

const sample = () => ({
  people: seedPeople,
  contacts: seedContacts,
  links: seedLinks,
  unions: seedUnions,
  photos: [] as Photo[],
  events: seedEvents,
  honorees: seedHonorees,
});

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
      ...sample(),
      addPerson: (input) => {
        const normalized = normalizePerson(input);
        if ("error" in normalized) return { ok: false, error: normalized.error };
        const now = new Date().toISOString();
        const person: Person = { id: uid(), ...normalized.value, createdAt: now, updatedAt: now };
        set((state) => ({ people: [...state.people, person] }));
        return { ok: true };
      },
      updatePerson: (id, input) => {
        if (!get().people.some((person) => person.id === id)) {
          return { ok: false, error: "That person is no longer in the record." };
        }
        const normalized = normalizePerson(input);
        if ("error" in normalized) return { ok: false, error: normalized.error };
        const now = new Date().toISOString();
        set((state) => ({
          people: state.people.map((person) =>
            person.id === id ? { ...person, ...normalized.value, updatedAt: now } : person,
          ),
        }));
        return { ok: true };
      },
      deletePerson: (id) => {
        const goneUnions = new Set(
          get()
            .unions.filter((union) => union.partner1Id === id || union.partner2Id === id)
            .map((union) => union.id),
        );
        const removedEvents = get()
          .honorees.filter((honoree) => honoree.personId === id)
          .map((honoree) => honoree.eventId);
        const honoreesLeft = get().honorees.filter((honoree) => honoree.personId !== id);
        const emptyEvents = new Set(
          removedEvents.filter((eventId) => !honoreesLeft.some((honoree) => honoree.eventId === eventId)),
        );
        const removed = get().photos.filter(
          (photo) =>
            photo.personId === id ||
            (photo.unionId ? goneUnions.has(photo.unionId) : false) ||
            (photo.eventId ? emptyEvents.has(photo.eventId) : false),
        );
        void forgetPhotos(removed.map((photo) => photo.id));
        const removedIds = new Set(removed.map((photo) => photo.id));
        set((state) => ({
          people: state.people.filter((person) => person.id !== id),
          contacts: state.contacts.filter((item) => item.personId !== id),
          links: state.links.filter((link) => link.parentId !== id && link.childId !== id),
          unions: state.unions.filter((union) => union.partner1Id !== id && union.partner2Id !== id),
          photos: state.photos.filter((photo) => !removedIds.has(photo.id)),
          events: state.events
            .filter((event) => !emptyEvents.has(event.id))
            .map((event) =>
              event.unionId && goneUnions.has(event.unionId) ? { ...event, unionId: undefined } : event,
            ),
          honorees: state.honorees.filter(
            (honoree) => honoree.personId !== id && !emptyEvents.has(honoree.eventId),
          ),
        }));
      },
      saveContact: (input, contactId) => {
        const label = input.label.trim();
        const value = input.value.trim();
        if (!get().people.some((person) => person.id === input.personId)) {
          return { ok: false, error: "That person is no longer in the record." };
        }
        if (!label) return { ok: false, error: "Add a label." };
        if (!value) return { ok: false, error: "Add the details." };
        const now = new Date().toISOString();
        set((state) => {
          const others = state.contacts.filter(
            (item) =>
              item.personId === input.personId &&
              item.type === input.type &&
              item.id !== contactId,
          );
          const isPrimary = input.isPrimary || others.length === 0;
          const next = state.contacts.map((item) => {
            if (item.id === contactId) {
              return {
                ...item,
                type: input.type,
                label: label.slice(0, 40),
                value: value.slice(0, 500),
                isPrimary,
              };
            }
            if (isPrimary && item.personId === input.personId && item.type === input.type) {
              return { ...item, isPrimary: false };
            }
            return item;
          });
          if (!contactId) {
            next.push({
              id: uid(),
              personId: input.personId,
              type: input.type,
              label: label.slice(0, 40),
              value: value.slice(0, 500),
              isPrimary,
              createdAt: now,
            });
          }
          return { contacts: next };
        });
        return { ok: true };
      },
      deleteContact: (id) =>
        set((state) => ({ contacts: state.contacts.filter((item) => item.id !== id) })),
      addLink: (parentId, childId, type) => {
        const error = validateParentLink(parentId, childId, get().links, get().unions);
        if (error) return { ok: false, error };
        set((state) => ({
          links: [...state.links, { id: uid(), parentId, childId, type }],
        }));
        return { ok: true };
      },
      deleteLink: (id) => set((state) => ({ links: state.links.filter((link) => link.id !== id) })),
      addUnion: (a, b, status, startDate, endDate) => {
        const start = clean(startDate, 10);
        const end = clean(endDate, 10);
        const error = validateUnion(a, b, get().unions, get().links) ?? validateUnionDates(start, end);
        if (error) return { ok: false, error };
        const [partner1Id, partner2Id] = orderIds(a, b);
        set((state) => ({
          unions: [
            ...state.unions,
            { id: uid(), partner1Id, partner2Id, status, startDate: start, endDate: end },
          ],
        }));
        return { ok: true };
      },
      updateUnion: (id, patch) => {
        if (!get().unions.some((union) => union.id === id)) {
          return { ok: false, error: "That partnership is no longer in the record." };
        }
        const start = clean(patch.startDate, 10);
        const end = clean(patch.endDate, 10);
        const error = validateUnionDates(start, end);
        if (error) return { ok: false, error };
        set((state) => ({
          unions: state.unions.map((union) =>
            union.id === id ? { ...union, status: patch.status, startDate: start, endDate: end } : union,
          ),
        }));
        return { ok: true };
      },
      deleteUnion: (id) => {
        const removed = get().photos.filter((photo) => photo.unionId === id);
        void forgetPhotos(removed.map((photo) => photo.id));
        const removedIds = new Set(removed.map((photo) => photo.id));
        set((state) => ({
          unions: state.unions.filter((union) => union.id !== id),
          photos: state.photos.filter((photo) => !removedIds.has(photo.id)),
          events: state.events.map((event) => (event.unionId === id ? { ...event, unionId: undefined } : event)),
        }));
      },
      addPhoto: async (file, owner) => {
        const target = photoTarget(owner);
        if (!target) return { ok: false, error: "Choose where this photo belongs." };
        const fileError = photoFileError(file);
        if (fileError) return { ok: false, error: fileError };
        if (target.personId && !get().people.some((person) => person.id === target.personId)) {
          return { ok: false, error: "That person is no longer in the record." };
        }
        if (target.unionId && !get().unions.some((union) => union.id === target.unionId)) {
          return { ok: false, error: "That partnership is no longer in the record." };
        }
        if (target.eventId && !get().events.some((event) => event.id === target.eventId)) {
          return { ok: false, error: "That occasion is no longer in the record." };
        }
        const owned = get().photos.filter((photo) => samePhotoTarget(photo, target));
        if (owned.length >= 5) return { ok: false, error: "Five photos is the limit." };
        let blob: Blob;
        try {
          blob = await compressImage(file);
        } catch {
          return { ok: false, error: "That photo could not be prepared." };
        }
        if (target.personId && !get().people.some((person) => person.id === target.personId)) {
          return { ok: false, error: "That person is no longer in the record." };
        }
        if (target.unionId && !get().unions.some((union) => union.id === target.unionId)) {
          return { ok: false, error: "That partnership is no longer in the record." };
        }
        if (target.eventId && !get().events.some((event) => event.id === target.eventId)) {
          return { ok: false, error: "That occasion is no longer in the record." };
        }
        const still = get().photos.filter((photo) => samePhotoTarget(photo, target));
        if (still.length >= 5) return { ok: false, error: "Five photos is the limit." };
        const id = uid();
        try {
          await putPhotoBlob(id, blob);
        } catch {
          return { ok: false, error: "That photo could not be saved on this device." };
        }
        const photo: Photo = {
          id,
          isPrimary: Boolean(target.personId) && still.every((item) => !item.isPrimary),
          ...target,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ photos: [...state.photos, photo] }));
        return { ok: true };
      },
      setPhotoCaption: (id, caption) =>
        set((state) => ({
          photos: state.photos.map((photo) =>
            photo.id === id ? { ...photo, caption: caption.trim().slice(0, 120) || undefined } : photo,
          ),
        })),
      setPrimaryPhoto: (id) =>
        set((state) => {
          const photo = state.photos.find((item) => item.id === id);
          if (!photo?.personId) return state;
          return {
            photos: state.photos.map((item) =>
              item.personId === photo.personId ? { ...item, isPrimary: item.id === id } : item,
            ),
          };
        }),
      deletePhoto: (id) => {
        const photo = get().photos.find((item) => item.id === id);
        if (!photo) return;
        void forgetPhotos([id]);
        set((state) => {
          const rest = state.photos.filter((item) => item.id !== id);
          if (!photo.isPrimary || !photo.personId) return { photos: rest };
          const replacement = rest.find((item) => item.personId === photo.personId);
          if (!replacement) return { photos: rest };
          return {
            photos: rest.map((item) =>
              item.id === replacement.id ? { ...item, isPrimary: true } : item,
            ),
          };
        });
      },
      deleteEvent: (id) => {
        const removed = get().photos.filter((photo) => photo.eventId === id);
        void forgetPhotos(removed.map((photo) => photo.id));
        const removedIds = new Set(removed.map((photo) => photo.id));
        set((state) => ({
          events: state.events.filter((event) => event.id !== id),
          honorees: state.honorees.filter((honoree) => honoree.eventId !== id),
          photos: state.photos.filter((photo) => !removedIds.has(photo.id)),
        }));
      },
      saveEvent: (input, eventId) => {
        const peopleIds = new Set(get().people.map((person) => person.id));
        const unionIds = new Set(get().unions.map((union) => union.id));
        const normalized = normalizeEvent(input, peopleIds, unionIds);
        if ("error" in normalized) return { ok: false, error: normalized.error };
        if (eventId && !get().events.some((event) => event.id === eventId)) {
          return { ok: false, error: "That occasion is no longer in the record." };
        }
        const id = eventId ?? uid();
        set((state) => ({
          events: eventId
            ? state.events.map((event) => (event.id === id ? { id, ...normalized.value } : event))
            : [...state.events, { id, ...normalized.value }],
          honorees: [
            ...state.honorees.filter((honoree) => honoree.eventId !== id),
            ...normalized.honoreeIds.map((personId) => ({ id: uid(), eventId: id, personId })),
          ],
        }));
        return { ok: true };
      },
      replaceRecord: (record) => {
        const nextIds = new Set(record.photos.map((photo) => photo.id));
        void forgetPhotos(get().photos.map((photo) => photo.id).filter((id) => !nextIds.has(id)));
        set({
          people: record.people,
          contacts: record.contacts,
          links: record.links,
          unions: record.unions,
          photos: record.photos,
          events: record.events,
          honorees: record.honorees,
        });
      },
      restoreSample: () => {
        void forgetPhotos(get().photos.map((photo) => photo.id));
        set(sample());
      },
    }),
    {
      name: "lineage-family-v1",
      skipHydration: true,
      partialize: (state) => ({
        people: state.people,
        contacts: state.contacts,
        links: state.links,
        unions: state.unions,
        photos: state.photos,
        events: state.events,
        honorees: state.honorees,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<FamilyState>;
        return {
          ...current,
          ...saved,
          photos: saved.photos ?? [],
          events: saved.events ?? [],
          honorees: saved.honorees ?? [],
        };
      },
    },
  ),
);

export function useFamilyHydrate() {
  useEffect(() => {
    void useFamilyStore.persist.rehydrate();
  }, []);
}
