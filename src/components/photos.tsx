import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { Monogram } from "@/components/monogram";
import { Button, buttonClass } from "@/components/ui/button";
import { controlClass } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/modal";
import { cachedPhotoUrl, photoUrl } from "@/lib/family/photos";
import { useFamilyStore } from "@/lib/family/store";
import { cn } from "@/lib/utils";

export function usePhotoSrc(id: string | undefined): string | undefined {
  const [src, setSrc] = useState<string | undefined>(() => (id ? cachedPhotoUrl(id) : undefined));

  useEffect(() => {
    if (!id) {
      setSrc(undefined);
      return;
    }
    const cached = cachedPhotoUrl(id);
    if (cached) {
      setSrc(cached);
      return;
    }
    let cancelled = false;
    void photoUrl(id)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id]);

  return src;
}

export function Portrait({
  photoId,
  initials,
  className,
}: {
  photoId?: string;
  initials: string;
  className?: string;
}) {
  const src = usePhotoSrc(photoId);
  if (!src) return <Monogram initials={initials} className={className} />;
  return (
    <img
      src={src}
      alt=""
      className={cn("size-11 shrink-0 rounded-full object-cover", className)}
    />
  );
}

export function PhotoGallery({
  personId,
  unionId,
  eventId,
}: {
  personId?: string;
  unionId?: string;
  eventId?: string;
}) {
  const photos = useFamilyStore((state) => state.photos);
  const addPhoto = useFamilyStore((state) => state.addPhoto);
  const setCaption = useFamilyStore((state) => state.setPhotoCaption);
  const setPrimary = useFamilyStore((state) => state.setPrimaryPhoto);
  const deletePhoto = useFamilyStore((state) => state.deletePhoto);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const owned = photos
    .filter((photo) => {
      if (personId) return photo.personId === personId;
      if (unionId) return photo.unionId === unionId;
      if (eventId) return photo.eventId === eventId;
      return false;
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const open = owned.find((photo) => photo.id === openId);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    const result = await addPhoto(file, { personId, unionId, eventId });
    setBusy(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void onFile(file);
          }}
        />
        <Button
          variant="secondary"
          disabled={busy || owned.length >= 5}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Adding…" : "Add photo"}
        </Button>
        <p className="text-sm text-muted">
          {owned.length} of 5 · JPEG, PNG, or WebP, up to 5 MB
        </p>
      </div>
      {error ? <p className="mt-2 text-sm text-accent-strong">{error}</p> : null}
      {owned.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No photos yet.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {owned.map((photo) => (
            <li key={photo.id} className="min-w-0">
              <PhotoTile photoId={photo.id} caption={photo.caption} onOpen={() => setOpenId(photo.id)} />
              <label className="mt-2 block">
                <span className="sr-only">Caption</span>
                <input
                  defaultValue={photo.caption ?? ""}
                  key={`${photo.id}-${photo.caption ?? ""}`}
                  placeholder="Caption"
                  className={controlClass}
                  maxLength={120}
                  onBlur={(event) => {
                    if ((photo.caption ?? "") !== event.target.value.trim()) {
                      setCaption(photo.id, event.target.value);
                    }
                  }}
                />
              </label>
              <div className="mt-2 flex flex-wrap gap-1">
                {personId ? (
                  photo.isPrimary ? (
                    <span className="inline-flex h-11 items-center rounded-full bg-accent-soft px-3 text-sm text-accent-strong">
                      Primary
                    </span>
                  ) : (
                    <button type="button" className={buttonClass("ghost")} onClick={() => setPrimary(photo.id)}>
                      Set as primary
                    </button>
                  )
                ) : null}
                <button type="button" className={buttonClass("ghost")} onClick={() => setPendingDelete(photo.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {open ? <Lightbox photoId={open.id} caption={open.caption} onClose={() => setOpenId(null)} /> : null}
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        title="Delete this photo?"
        body="It is removed from this device. The person and the rest of the record stay."
        confirmLabel="Delete photo"
        onConfirm={() => {
          if (pendingDelete) deletePhoto(pendingDelete);
          setPendingDelete(null);
          if (pendingDelete === openId) setOpenId(null);
        }}
      />
    </div>
  );
}

function PhotoTile({
  photoId,
  caption,
  onOpen,
}: {
  photoId: string;
  caption?: string;
  onOpen: () => void;
}) {
  const src = usePhotoSrc(photoId);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="silk-card block aspect-square w-full overflow-hidden rounded-xl border border-line bg-accent-soft"
    >
      {src ? (
        <img src={src} alt={caption || "Family photo"} className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full place-items-center px-3 text-center text-sm text-muted">
          Photo unavailable on this device
        </span>
      )}
    </button>
  );
}

function Lightbox({
  photoId,
  caption,
  onClose,
}: {
  photoId: string;
  caption?: string;
  onClose: () => void;
}) {
  const src = usePhotoSrc(photoId);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={caption || "Photo"}>
      <button type="button" className="absolute inset-0" aria-label="Close photo" onClick={onClose} />
      <div className="relative z-10 max-w-full">
        {src ? (
          <img src={src} alt={caption || "Family photo"} />
        ) : (
          <p className="rounded-xl bg-surface px-6 py-8 text-sm text-muted">Photo unavailable on this device</p>
        )}
        {caption ? (
          <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-center text-sm text-ink">{caption}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-3 right-3 z-10 grid size-11 place-items-center rounded-full bg-surface text-ink"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}
