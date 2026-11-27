import { useState, type ReactNode } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { LifeTimeline } from "@/components/life-timeline";
import { PhotoGallery, Portrait } from "@/components/photos";
import { PersonPicker } from "@/components/person-picker";
import { Pane } from "@/components/shell";
import { Button, buttonClass } from "@/components/ui/button";
import { controlClass, Field, Segmented } from "@/components/ui/field";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useEditor } from "@/lib/family/editor";
import {
  formatFullDate,
  fullName,
  genderLabel,
  initials,
  lifespan,
  mailHref,
  parentTypeLabel,
  statusLabel,
  telHref,
} from "@/lib/family/format";
import {
  ancestorIds,
  childrenOf,
  descendantIds,
  otherPartner,
  parentsOf,
  partnersOf,
} from "@/lib/family/links";
import { useFamilyStore } from "@/lib/family/store";
import type { ContactInfo, ContactType, ParentChildType, UnionStatus } from "@/lib/family/types";

export const Route = createFileRoute("/people/$personId")({
  head: () => ({ meta: [{ title: "Profile · Lineage" }] }),
  component: PersonPage,
});

const contactLabels: Record<ContactType, string> = {
  EMAIL: "Email",
  PHONE: "Phone",
  ADDRESS: "Address",
};

function PersonPage() {
  const { personId } = Route.useParams();
  const navigate = useNavigate();
  const people = useFamilyStore((state) => state.people);
  const contacts = useFamilyStore((state) => state.contacts);
  const links = useFamilyStore((state) => state.links);
  const unions = useFamilyStore((state) => state.unions);
  const photos = useFamilyStore((state) => state.photos);
  const deletePerson = useFamilyStore((state) => state.deletePerson);
  const openEdit = useEditor((state) => state.openEdit);
  const person = people.find((item) => item.id === personId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copied, setCopied] = useState("");

  if (!person) {
    return (
      <Pane>
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-3xl">Person not found</h1>
          <Link to="/directory" className={`${buttonClass("secondary")} mt-4`}>
            Back to directory
          </Link>
        </div>
      </Pane>
    );
  }

  const personContacts = contacts.filter((item) => item.personId === person.id);
  const parentLinks = parentsOf(links, person.id);
  const childLinks = childrenOf(links, person.id);
  const unionsHere = partnersOf(unions, person.id);
  const portrait = photos.find((photo) => photo.personId === person.id && photo.isPrimary)
    ?? photos.find((photo) => photo.personId === person.id);
  const byId = new Map(people.map((item) => [item.id, item]));

  async function copyValue(id: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      window.setTimeout(() => setCopied((current) => (current === id ? "" : current)), 1500);
    } catch {
      setCopied("");
    }
  }

  return (
    <Pane>
      <div className="mx-auto grid max-w-3xl gap-4">
        <Link to="/directory" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted">
          <ArrowLeft className="size-4" />
          Directory
        </Link>
        <header className="silk-card rounded-xl border border-line bg-surface p-4 md:p-5">
          <div className="flex flex-wrap items-start gap-4">
            <Portrait
              photoId={portrait?.id}
              initials={initials(person.firstName, person.lastName)}
              className="size-14 text-base"
            />
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl tracking-tight">{fullName(person)}</h1>
              <p className="mt-1 text-sm text-muted">
                {genderLabel(person.gender)} · {lifespan(person)}
              </p>
              {person.maidenName ? (
                <p className="mt-1 text-sm text-muted">Maiden name {person.maidenName}</p>
              ) : null}
              {person.bio ? <p className="mt-3 max-w-prose text-pretty text-sm text-ink">{person.bio}</p> : null}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => openEdit(person.id)}>
              Edit
            </Button>
            <Button variant="secondary" onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
            <Link to="/kinship" search={{ a: person.id }} className={buttonClass("ghost")}>
              Find a relationship
            </Link>
          </div>
        </header>

        <Section
          title="Life"
          action={
            <Link to="/occasions" search={{ honoree: person.id }} className={buttonClass("secondary")}>
              Add occasion
            </Link>
          }
        >
          <LifeTimeline personId={person.id} />
        </Section>

        <Section title="Photos">
          <PhotoGallery personId={person.id} />
        </Section>

        <Section
          title="Contact"
          action={<ContactButton personId={person.id} />}
        >
          {personContacts.length === 0 ? (
            <p className="text-sm text-muted">No email, phone, or address yet.</p>
          ) : (
            <ul>
              {personContacts.map((item) => (
                <li key={item.id} className="border-b border-line py-3 last:border-b-0">
                  <div className="flex items-start gap-3">
                    <ContactIcon type={item.type} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{item.label}</p>
                        <span className="text-xs text-muted">{contactLabels[item.type]}</span>
                        {item.isPrimary ? (
                          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-strong">
                            Primary
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm break-words whitespace-pre-line">{item.value}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.type === "PHONE" ? (
                          <a className={buttonClass("secondary")} href={telHref(item.value)}>
                            Call
                          </a>
                        ) : null}
                        {item.type === "EMAIL" ? (
                          <a className={buttonClass("secondary")} href={mailHref(item.value)}>
                            Email
                          </a>
                        ) : null}
                        <button
                          type="button"
                          className={buttonClass("secondary")}
                          onClick={() => void copyValue(item.id, item.value)}
                        >
                          {copied === item.id ? "Copied" : "Copy"}
                        </button>
                        <ContactButton personId={person.id} contact={item} label="Edit" />
                        <DeleteContact id={item.id} />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Parents" action={<ParentButton personId={person.id} />}>
          {parentLinks.length === 0 ? (
            <p className="text-sm text-muted">No parents recorded.</p>
          ) : (
            <ul className="grid gap-2">
              {parentLinks.map((link) => {
                const parent = byId.get(link.parentId);
                if (!parent) return null;
                return (
                  <FamilyRow
                    key={link.id}
                    personId={parent.id}
                    name={fullName(parent)}
                    meta={link.type === "BIOLOGICAL" ? lifespan(parent) : `${parentTypeLabel(link.type)} · ${lifespan(parent)}`}
                    onRemove={() => useFamilyStore.getState().deleteLink(link.id)}
                    removeLabel={`Remove parent link to ${fullName(parent)}`}
                  />
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Children" action={<ChildButton personId={person.id} />}>
          {childLinks.length === 0 ? (
            <p className="text-sm text-muted">No children recorded.</p>
          ) : (
            <ul className="grid gap-2">
              {childLinks.map((link) => {
                const child = byId.get(link.childId);
                if (!child) return null;
                return (
                  <FamilyRow
                    key={link.id}
                    personId={child.id}
                    name={fullName(child)}
                    meta={link.type === "BIOLOGICAL" ? lifespan(child) : `${parentTypeLabel(link.type)} · ${lifespan(child)}`}
                    onRemove={() => useFamilyStore.getState().deleteLink(link.id)}
                    removeLabel={`Remove child link to ${fullName(child)}`}
                  />
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Partnerships" action={<UnionButton personId={person.id} />}>
          {unionsHere.length === 0 ? (
            <p className="text-sm text-muted">No partnership recorded.</p>
          ) : (
            <ul className="grid gap-2">
              {unionsHere.map((union) => {
                const partner = byId.get(otherPartner(union, person.id));
                if (!partner) return null;
                const dates = [union.startDate ? formatFullDate(union.startDate) : "", union.endDate ? formatFullDate(union.endDate) : ""]
                  .filter(Boolean)
                  .join(" – ");
                return (
                  <li key={union.id} className="rounded-lg border border-line px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/people/$personId"
                        params={{ personId: partner.id }}
                        className="font-medium"
                      >
                        {fullName(partner)}
                      </Link>
                      <span className="text-sm text-muted">{statusLabel(union.status)}</span>
                    </div>
                    {dates ? <p className="mt-1 text-sm text-muted">{dates}</p> : null}
                    <div className="mt-3">
                      <p className="text-sm font-medium">Wedding photos</p>
                      <div className="mt-2">
                        <PhotoGallery unionId={union.id} />
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <UnionButton personId={person.id} unionId={union.id} label="Edit" />
                      <RemoveButton
                        label={`Remove partnership with ${fullName(partner)}`}
                        title="Remove this partnership?"
                        body={`${fullName(person)} and ${fullName(partner)} will stay in the record. Only the partnership is removed.`}
                        onRemove={() => useFamilyStore.getState().deleteUnion(union.id)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Remove ${fullName(person)}?`}
        body="Their photos, contacts, parent links, and partnerships are removed with them."
        confirmLabel="Delete person"
        onConfirm={() => {
          deletePerson(person.id);
          void navigate({ to: "/directory" });
        }}
      />
    </Pane>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="silk-card rounded-xl border border-line bg-surface p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ContactIcon({ type }: { type: ContactType }) {
  const Icon = type === "EMAIL" ? Mail : type === "PHONE" ? Phone : MapPin;
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-strong">
      <Icon className="size-4" />
    </span>
  );
}

function FamilyRow({
  personId,
  name,
  meta,
  onRemove,
  removeLabel,
}: {
  personId: string;
  name: string;
  meta: string;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
      <div className="min-w-0">
        <Link to="/people/$personId" params={{ personId }} className="font-medium">
          {name}
        </Link>
        <p className="text-sm text-muted">{meta}</p>
      </div>
      <RemoveButton label={removeLabel} title="Remove this link?" body={removeLabel} onRemove={onRemove} />
    </li>
  );
}

function RemoveButton({
  label,
  title,
  body,
  onRemove,
}: {
  label: string;
  title: string;
  body: string;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Remove
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        body={body}
        confirmLabel="Remove"
        onConfirm={() => {
          onRemove();
          setOpen(false);
        }}
      />
      <span className="sr-only">{label}</span>
    </>
  );
}

function DeleteContact({ id }: { id: string }) {
  const deleteContact = useFamilyStore((state) => state.deleteContact);
  return (
    <Button variant="ghost" onClick={() => deleteContact(id)}>
      Delete
    </Button>
  );
}

function ContactButton({
  personId,
  contact,
  label = "Add",
}: {
  personId: string;
  contact?: ContactInfo;
  label?: string;
}) {
  const saveContact = useFamilyStore((state) => state.saveContact);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ContactType>(contact?.type ?? "PHONE");
  const [name, setName] = useState(contact?.label ?? "");
  const [value, setValue] = useState(contact?.value ?? "");
  const [isPrimary, setIsPrimary] = useState(contact?.isPrimary ?? true);
  const [error, setError] = useState("");

  function openFresh() {
    setType(contact?.type ?? "PHONE");
    setName(contact?.label ?? "");
    setValue(contact?.value ?? "");
    setIsPrimary(contact?.isPrimary ?? true);
    setError("");
    setOpen(true);
  }

  function save() {
    const result = saveContact(
      { personId, type, label: name, value, isPrimary },
      contact?.id,
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
  }

  return (
    <>
      <Button variant="secondary" onClick={openFresh}>
        {label}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={contact ? "Edit contact" : "Add contact"}
        description="A label such as Mobile, Home, or Work, plus the email, phone, or address."
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <Field label="Type">
            <Segmented<ContactType>
              label="Contact type"
              value={type}
              onChange={setType}
              options={[
                { value: "PHONE", label: "Phone" },
                { value: "EMAIL", label: "Email" },
                { value: "ADDRESS", label: "Address" },
              ]}
            />
          </Field>
          <Field label="Label">
            <input className={controlClass} value={name} maxLength={40} onChange={(event) => setName(event.target.value)} placeholder="Mobile" />
          </Field>
          <Field label="Details">
            {type === "ADDRESS" ? (
              <textarea className={`${controlClass} min-h-28 py-2`} maxLength={500} value={value} onChange={(event) => setValue(event.target.value)} />
            ) : (
              <input
                className={controlClass}
                maxLength={500}
                value={value}
                inputMode={type === "EMAIL" ? "email" : "tel"}
                onChange={(event) => setValue(event.target.value)}
              />
            )}
          </Field>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} />
            Primary {contactLabels[type].toLowerCase()}
          </label>
          {error ? <p className="text-sm text-accent-strong">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function ParentButton({ personId }: { personId: string }) {
  const people = useFamilyStore((state) => state.people);
  const links = useFamilyStore((state) => state.links);
  const unions = useFamilyStore((state) => state.unions);
  const addLink = useFamilyStore((state) => state.addLink);
  const [open, setOpen] = useState(false);
  const [parentId, setParentId] = useState("");
  const [type, setType] = useState<ParentChildType>("BIOLOGICAL");
  const [error, setError] = useState("");
  const partnerIds = partnersOf(unions, personId).map((union) => otherPartner(union, personId));
  const exclude = [
    personId,
    ...parentsOf(links, personId).map((link) => link.parentId),
    ...descendantIds(links, personId),
    ...partnerIds,
  ];

  return (
    <>
      <Button variant="secondary" onClick={() => { setParentId(""); setType("BIOLOGICAL"); setError(""); setOpen(true); }}>
        Add
      </Button>
      <Modal open={open} onOpenChange={setOpen} title="Add a parent" description="Biological, adopted, or step.">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const result = addLink(parentId, personId, type);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setOpen(false);
          }}
        >
          <PersonPicker label="Parent" value={parentId} onChange={setParentId} excludeIds={exclude} />
          <Field label="Link">
            <Segmented<ParentChildType>
              label="Parent link type"
              value={type}
              onChange={setType}
              options={[
                { value: "BIOLOGICAL", label: "Biological" },
                { value: "ADOPTED", label: "Adopted" },
                { value: "STEP", label: "Step" },
              ]}
            />
          </Field>
          {people.filter((person) => !exclude.includes(person.id)).length === 0 ? (
            <p className="text-sm text-muted">Add another person before linking a parent.</p>
          ) : null}
          {error ? <p className="text-sm text-accent-strong">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function ChildButton({ personId }: { personId: string }) {
  const links = useFamilyStore((state) => state.links);
  const unions = useFamilyStore((state) => state.unions);
  const addLink = useFamilyStore((state) => state.addLink);
  const [open, setOpen] = useState(false);
  const [childId, setChildId] = useState("");
  const [type, setType] = useState<ParentChildType>("BIOLOGICAL");
  const [error, setError] = useState("");
  const partnerIds = partnersOf(unions, personId).map((union) => otherPartner(union, personId));
  const exclude = [
    personId,
    ...childrenOf(links, personId).map((link) => link.childId),
    ...ancestorIds(links, personId),
    ...partnerIds,
  ];

  return (
    <>
      <Button variant="secondary" onClick={() => { setChildId(""); setType("BIOLOGICAL"); setError(""); setOpen(true); }}>
        Add
      </Button>
      <Modal open={open} onOpenChange={setOpen} title="Add a child" description="Biological, adopted, or step.">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const result = addLink(personId, childId, type);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setOpen(false);
          }}
        >
          <PersonPicker label="Child" value={childId} onChange={setChildId} excludeIds={exclude} />
          <Field label="Link">
            <Segmented<ParentChildType>
              label="Child link type"
              value={type}
              onChange={setType}
              options={[
                { value: "BIOLOGICAL", label: "Biological" },
                { value: "ADOPTED", label: "Adopted" },
                { value: "STEP", label: "Step" },
              ]}
            />
          </Field>
          {error ? <p className="text-sm text-accent-strong">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function UnionButton({
  personId,
  unionId,
  label = "Add",
}: {
  personId: string;
  unionId?: string;
  label?: string;
}) {
  const unions = useFamilyStore((state) => state.unions);
  const links = useFamilyStore((state) => state.links);
  const addUnion = useFamilyStore((state) => state.addUnion);
  const updateUnion = useFamilyStore((state) => state.updateUnion);
  const existing = unions.find((union) => union.id === unionId);
  const [open, setOpen] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [status, setStatus] = useState<UnionStatus>(existing?.status ?? "MARRIED");
  const [startDate, setStartDate] = useState(existing?.startDate ?? "");
  const [endDate, setEndDate] = useState(existing?.endDate ?? "");
  const [error, setError] = useState("");
  const exclude = [
    personId,
    ...partnersOf(unions, personId).map((union) => otherPartner(union, personId)),
    ...parentsOf(links, personId).map((link) => link.parentId),
    ...childrenOf(links, personId).map((link) => link.childId),
  ];

  function openFresh() {
    const current = useFamilyStore.getState().unions.find((union) => union.id === unionId);
    setPartnerId("");
    setStatus(current?.status ?? "MARRIED");
    setStartDate(current?.startDate ?? "");
    setEndDate(current?.endDate ?? "");
    setError("");
    setOpen(true);
  }

  function save() {
    const result = existing
      ? updateUnion(existing.id, { status, startDate, endDate })
      : addUnion(personId, partnerId, status, startDate, endDate);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
  }

  return (
    <>
      <Button variant="secondary" onClick={openFresh}>
        {label}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={existing ? "Edit partnership" : "Add a partnership"}
        description="Marriage, a partnership, or a union that has ended."
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          {existing ? null : (
            <PersonPicker label="Partner" value={partnerId} onChange={setPartnerId} excludeIds={exclude} />
          )}
          <Field label="Status">
            <div className="grid grid-cols-2 gap-2">
              {(["MARRIED", "PARTNER", "DIVORCED", "WIDOWED"] as UnionStatus[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={status === option}
                  onClick={() => setStatus(option)}
                  className={`h-11 rounded-lg border text-sm transition-colors duration-200 ${
                    status === option
                      ? "border-accent-strong bg-accent-strong text-on-accent"
                      : "border-line bg-canvas text-ink"
                  }`}
                >
                  {statusLabel(option)}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start" hint="Anniversary">
              <input className={controlClass} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </Field>
            <Field label="End">
              <input className={controlClass} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </Field>
          </div>
          {error ? <p className="text-sm text-accent-strong">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
