import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { controlClass, Field, Segmented } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useEditor } from "@/lib/family/editor";
import { useFamilyStore } from "@/lib/family/store";
import type { Gender, PersonInput } from "@/lib/family/types";

const empty = (): PersonInput & { birthYear: string } => ({
  firstName: "",
  lastName: "",
  maidenName: "",
  gender: "",
  birthDate: "",
  birthYear: "",
  birthYearOnly: false,
  deathDate: "",
  bio: "",
});

export function PersonDialog() {
  const open = useEditor((state) => state.personOpen);
  const personId = useEditor((state) => state.personId);
  const close = useEditor((state) => state.closePerson);
  const addPerson = useFamilyStore((state) => state.addPerson);
  const updatePerson = useFamilyStore((state) => state.updatePerson);
  const [draft, setDraft] = useState(empty);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const person = personId
      ? useFamilyStore.getState().people.find((item) => item.id === personId)
      : undefined;
    if (!person) {
      setDraft(empty());
    } else {
      setDraft({
        firstName: person.firstName,
        lastName: person.lastName,
        maidenName: person.maidenName ?? "",
        gender: person.gender,
        birthYearOnly: person.birthYearOnly,
        birthDate: person.birthYearOnly ? "" : (person.birthDate ?? ""),
        birthYear: person.birthDate?.slice(0, 4) ?? "",
        deathDate: person.deathDate ?? "",
        bio: person.bio ?? "",
      });
    }
    setError("");
  }, [open, personId]);

  function save() {
    const birthDate = draft.birthYearOnly
      ? draft.birthYear
        ? `${draft.birthYear}-01-01`
        : undefined
      : draft.birthDate || undefined;
    const result = personId
      ? updatePerson(personId, { ...draft, birthDate, maidenName: draft.maidenName, bio: draft.bio })
      : addPerson({ ...draft, birthDate, maidenName: draft.maidenName, bio: draft.bio });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    close();
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={personId ? "Edit person" : "Add person"}
      description="Names, dates, and a short note. You can add contact details on their profile."
    >
      <form
        className="grid gap-4"
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <input
              className={controlClass}
              value={draft.firstName}
              maxLength={60}
              onChange={(event) => setDraft({ ...draft, firstName: event.target.value })}
              required
            />
          </Field>
          <Field label="Last name">
            <input
              className={controlClass}
              value={draft.lastName}
              maxLength={60}
              onChange={(event) => setDraft({ ...draft, lastName: event.target.value })}
              required
            />
          </Field>
        </div>
        <Field label="Maiden name" hint="Optional">
          <input
            className={controlClass}
            value={draft.maidenName}
            maxLength={60}
            onChange={(event) => setDraft({ ...draft, maidenName: event.target.value })}
          />
        </Field>
        <Field label="Gender">
          <Segmented<Gender>
            label="Gender"
            value={draft.gender}
            onChange={(gender) => setDraft({ ...draft, gender })}
            options={[
              { value: "FEMALE", label: "Female" },
              { value: "MALE", label: "Male" },
              { value: "OTHER", label: "Other" },
            ]}
          />
        </Field>
        <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={draft.birthYearOnly}
            onChange={(event) => {
              const birthYearOnly = event.target.checked;
              if (!birthYearOnly && draft.birthYear && !draft.birthDate) {
                setDraft({ ...draft, birthYearOnly, birthDate: `${draft.birthYear}-01-01` });
                return;
              }
              setDraft({ ...draft, birthYearOnly });
            }}
          />
          Only the birth year is known
        </label>
        {draft.birthYearOnly ? (
          <Field label="Birth year">
            <input
              className={controlClass}
              inputMode="numeric"
              min={1000}
              max={2100}
              value={draft.birthYear}
              onChange={(event) => setDraft({ ...draft, birthYear: event.target.value.replace(/\D/g, "").slice(0, 4) })}
              placeholder="1942"
            />
          </Field>
        ) : (
          <Field label="Birth date">
            <input
              className={controlClass}
              type="date"
              value={draft.birthDate}
              onChange={(event) => setDraft({ ...draft, birthDate: event.target.value })}
            />
          </Field>
        )}
        <Field label="Death date" hint="Leave blank if living">
          <input
            className={controlClass}
            type="date"
            value={draft.deathDate}
            onChange={(event) => setDraft({ ...draft, deathDate: event.target.value })}
          />
        </Field>
        <Field label="Bio" hint="Optional">
          <textarea
            className={`${controlClass} min-h-28 py-2`}
            maxLength={2000}
            value={draft.bio}
            onChange={(event) => setDraft({ ...draft, bio: event.target.value })}
          />
        </Field>
        {error ? <p className="text-sm text-accent-strong">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit">{personId ? "Save changes" : "Add to family"}</Button>
        </div>
      </form>
    </Modal>
  );
}
