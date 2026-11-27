import { validateBackup, type BackupPhoto, type FamilyRecord, type LineageBackup } from "@/lib/family/backup";
import { loadMail, saveMail } from "@/lib/family/mail";
import { getPhotoBlob, putPhotoBlob } from "@/lib/family/photos";
import { useFamilyStore } from "@/lib/family/store";

function blobToBase64(blob: Blob): Promise<string> {
  return blob.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const size = 0x8000;
    for (let index = 0; index < bytes.length; index += size) {
      binary += String.fromCharCode(...bytes.subarray(index, index + size));
    }
    return btoa(binary);
  });
}

function base64ToBlob(data: string): Blob {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: "image/jpeg" });
}

export async function buildBackup(includeMail: boolean): Promise<LineageBackup> {
  const state = useFamilyStore.getState();
  const photos: BackupPhoto[] = [];
  for (const photo of state.photos) {
    const blob = await getPhotoBlob(photo.id);
    photos.push({ ...photo, data: blob ? await blobToBase64(blob) : undefined });
  }
  const mail = includeMail ? loadMail() : undefined;
  return {
    kind: "lineage-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    people: state.people,
    contacts: state.contacts,
    links: state.links,
    unions: state.unions,
    events: state.events,
    honorees: state.honorees,
    photos,
    mail: mail
      ? {
          enabled: mail.enabled,
          to: mail.to,
          leadDays: mail.leadDays,
          host: mail.host,
          port: mail.port,
          secure: mail.secure,
          user: mail.user,
          password: mail.password,
          from: mail.from,
        }
      : undefined,
  };
}

export function downloadBackup(backup: LineageBackup): void {
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lineage-${backup.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function readBackupFile(file: File): Promise<{ ok: true; backup: LineageBackup } | { ok: false; error: string }> {
  if (file.size > 32 * 1024 * 1024) return { ok: false, error: "That backup is larger than 32 MB." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return { ok: false, error: "That file is not a Lineage backup." };
  }
  return validateBackup(parsed);
}

export async function applyBackup(backup: LineageBackup, restoreMail: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    for (const photo of backup.photos) {
      if (!photo.data) continue;
      await putPhotoBlob(photo.id, base64ToBlob(photo.data));
    }
  } catch {
    return { ok: false, error: "A photo in this backup could not be saved on this device." };
  }
  const record: FamilyRecord = {
    people: backup.people,
    contacts: backup.contacts,
    links: backup.links,
    unions: backup.unions,
    events: backup.events,
    honorees: backup.honorees,
    photos: backup.photos.map(({ data: _data, ...photo }) => photo),
  };
  useFamilyStore.getState().replaceRecord(record);
  if (restoreMail && backup.mail) saveMail(backup.mail);
  return { ok: true };
}
